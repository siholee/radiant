/**
 * Generate test sample with the profile's style
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execPromise = promisify(exec)

const testGenerateSchema = z.object({
  topic: z.string(),
  locale: z.enum(['ko', 'en']).default('ko'),
})

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = testGenerateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { topic, locale } = parsed.data

    const profile = await prisma.writingStyleProfile.findFirst({
      where: {
        id: params.id,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        samples: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's API keys
    const apiKeys = await prisma.userApiKey.findMany({
      where: { userId, status: 'ACTIVE' },
    })

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'No active API keys found' }, { status: 400 })
    }

    // Prepare API keys
    const decryptedKeys: Record<string, string> = {}
    for (const key of apiKeys) {
      const { decryptApiKey } = await import('@/lib/crypto/encryption')
      const decrypted = decryptApiKey(key.encryptedKey)
      decryptedKeys[key.provider.toLowerCase()] = decrypted
    }

    const pythonScriptPath = path.join(process.cwd(), 'python', 'crewai', 'blog_generator.py')

    const inputData = JSON.stringify({
      prompt: topic,
      locale,
      testMode: true,
      aiAgents: { writer: profile.preferredAiModel.toLowerCase() },
      apiKeys: decryptedKeys,
      writingSamples: profile.samples.map((s) => ({ content: s.content })),
    })

    const { stdout, stderr } = await execPromise(
      `python3 "${pythonScriptPath}" '${inputData.replace(/'/g, "'\\''")}'`,
      { timeout: 30000 }
    )

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    const result = JSON.parse(stdout)

    if (!result.success) {
      throw new Error(result.error || 'Test generation failed')
    }

    // Save preview sample
    await prisma.writingStyleProfile.update({
      where: { id: params.id },
      data: {
        previewSample: result.content,
        previewGeneratedAt: new Date(),
      },
    })

    return NextResponse.json({ previewSample: result.content, result })
  } catch (error: any) {
    console.error('Failed to generate test:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate test' },
      { status: 500 }
    )
  }
}
