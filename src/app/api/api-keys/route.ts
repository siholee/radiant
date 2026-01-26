/**
 * API Keys Management Endpoint
 * 
 * Handles CRUD operations for user API keys.
 * All keys are encrypted before storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptApiKey, maskApiKey, validateApiKeyFormat } from '@/lib/crypto/encryption'
import { createAuditLog } from '@/lib/auth/audit'
import { z } from 'zod'

// Request validation schema
const createApiKeySchema = z.object({
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI']),
  apiKey: z.string().min(1, 'API key is required'),
  label: z.string().optional(),
})

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiKeys = await prisma.userApiKey.findMany({
      where: {
        userId,
        status: { not: 'REVOKED' },
      },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        // Get usage stats
        usageLogs: {
          select: {
            estimatedCost: true,
            inputTokens: true,
            outputTokens: true,
          },
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include aggregated stats
    const transformedKeys = apiKeys.map((key: any) => {
      const totalCost = key.usageLogs.reduce((sum: number, log: any) => sum + log.estimatedCost, 0)
      const totalInputTokens = key.usageLogs.reduce((sum: number, log: any) => sum + log.inputTokens, 0)
      const totalOutputTokens = key.usageLogs.reduce((sum: number, log: any) => sum + log.outputTokens, 0)
      const requestCount = key.usageLogs.length

      return {
        id: key.id,
        provider: key.provider,
        label: key.label,
        status: key.status,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        usage: {
          requestCount,
          totalCost: Math.round(totalCost * 1000) / 1000,
          totalInputTokens,
          totalOutputTokens,
        },
      }
    })

    return NextResponse.json({ apiKeys: transformedKeys })
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createApiKeySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { provider, apiKey, label } = parsed.data

    // Validate API key format
    if (!validateApiKeyFormat(apiKey, provider)) {
      return NextResponse.json(
        { error: `Invalid ${provider} API key format` },
        { status: 400 }
      )
    }

    // Check if user already has a key for this provider
    const existingKey = await prisma.userApiKey.findFirst({
      where: {
        userId,
        provider,
        status: 'ACTIVE',
      },
    })

    if (existingKey) {
      return NextResponse.json(
        {
          error: `You already have an active ${provider} API key. Please revoke it first.`,
        },
        { status: 409 }
      )
    }

    // Encrypt the API key
    const { encryptedKey, keyVersion } = encryptApiKey(apiKey, {
      provider,
      userId,
    })

    // Create the API key record
    const newKey = await prisma.userApiKey.create({
      data: {
        userId,
        provider,
        encryptedKey,
        keyVersion,
        label,
      },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        createdAt: true,
      },
    })

    // Audit log
    await createAuditLog({
      userId,
      action: 'API_KEY_CREATED',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        keyId: newKey.id,
        provider,
      },
    })

    // Return the new key with masked value (shown only once)
    return NextResponse.json({
      apiKey: {
        ...newKey,
        maskedKey: maskApiKey(apiKey),
      },
      message: 'API key created successfully. This is the only time you will see the masked key.',
    })
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
