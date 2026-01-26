/**
 * Individual API Key Management Endpoint
 * 
 * Handles GET, PUT, DELETE for specific API keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auth/audit'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Update schema
const updateApiKeySchema = z.object({
  label: z.string().optional(),
  status: z.enum(['ACTIVE', 'DEPRECATED']).optional(),
})

/**
 * GET /api/api-keys/[id]
 * Get details of a specific API key
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiKey = await prisma.userApiKey.findFirst({
      where: {
        id,
        userId, // Ensure user owns this key
      },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        usageLogs: {
          select: {
            id: true,
            inputTokens: true,
            outputTokens: true,
            estimatedCost: true,
            model: true,
            purpose: true,
            success: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ apiKey })
  } catch (error) {
    console.error('Failed to fetch API key:', error)
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 })
  }
}

/**
 * PUT /api/api-keys/[id]
 * Update an API key (label, status)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = updateApiKeySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingKey = await prisma.userApiKey.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Cannot update a revoked API key' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Record<string, string | Date | undefined> = {}

    if (parsed.data.label !== undefined) {
      updateData.label = parsed.data.label
    }

    if (parsed.data.status) {
      updateData.status = parsed.data.status
      if (parsed.data.status === 'DEPRECATED') {
        updateData.deprecatedAt = new Date()
      }
    }

    const updatedKey = await prisma.userApiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        deprecatedAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ apiKey: updatedKey })
  } catch (error) {
    console.error('Failed to update API key:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

/**
 * DELETE /api/api-keys/[id]
 * Revoke an API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify ownership
    const existingKey = await prisma.userApiKey.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'API key is already revoked' },
        { status: 400 }
      )
    }

    // Revoke the key (soft delete)
    await prisma.userApiKey.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    })

    // Audit log
    await createAuditLog({
      userId,
      action: 'API_KEY_REVOKED',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        keyId: id,
        provider: existingKey.provider,
      },
    })

    return NextResponse.json({
      message: 'API key revoked successfully',
    })
  } catch (error) {
    console.error('Failed to revoke API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
