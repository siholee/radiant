/**
 * Test Generation Endpoint
 * 
 * Generates a short sample text (200-300 chars) to preview
 * the writing style profile's effect on generated content.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'
import { spawn } from 'child_process'
import path from 'path'
import { z } from 'zod'

const testGenerateSchema = z.object({
  profileId: z.string().min(1),
  prompt: z.string().min(10, '테스트 주제는 최소 10자 이상이어야 합니다').max(500),
  locale: z.enum(['ko', 'en']).default('ko'),
})

interface TestResult {
  success: boolean
  content?: string
  wordCount?: number
  characterCount?: number
  aiModel?: string
  locale?: string
  aiDetectionScore?: number
  aiDetectionPassed?: boolean
  aiDetectionIssues?: string[]
  error?: string
}

/**
 * POST /api/writing-style/test-generate
 * Generate a short test sample using a writing style profile
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can test generate
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

    const { profileId, prompt, locale } = parsed.data

    // Get profile with samples
    const profile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
      include: {
        samples: {
          where: {
            isApproved: true,
            status: 'COMPLETED',
          },
          select: {
            content: true,
            title: true,
          },
          take: 3, // Get up to 3 samples for style reference
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's API keys
    const apiKeys = await prisma.userApiKey.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    })

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'No API keys found. Please add API keys to generate content.' },
        { status: 400 }
      )
    }

    // Decrypt API keys
    const decryptedKeys: Record<string, string> = {}
    for (const key of apiKeys) {
      const provider = key.provider.toLowerCase()
      try {
        decryptedKeys[provider === 'google' ? 'google' : provider] = decryptApiKey(key.encryptedKey)
      } catch {
        console.error(`Failed to decrypt ${provider} key`)
      }
    }

    // Map preferred AI model to provider
    const preferredModel = profile.preferredAiModel.toLowerCase()
    const aiAgents = {
      writer: preferredModel === 'anthropic' ? 'claude' : preferredModel,
    }

    // Prepare input for Python script
    const inputData = {
      testMode: true,
      prompt,
      locale,
      aiAgents,
      apiKeys: decryptedKeys,
      writingSamples: profile.samples.map(s => ({
        content: s.content,
        title: s.title,
      })),
    }

    // Run Python script
    const result = await runPythonScript(inputData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Test generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      content: result.content,
      wordCount: result.wordCount,
      characterCount: result.characterCount,
      aiModel: result.aiModel,
      locale: result.locale,
      qualityMetrics: {
        aiDetectionScore: result.aiDetectionScore,
        aiDetectionPassed: result.aiDetectionPassed,
        issues: result.aiDetectionIssues,
      },
      profile: {
        id: profile.id,
        name: profile.name,
        preferredAiModel: profile.preferredAiModel,
        sampleCount: profile.samples.length,
      },
    })
  } catch (error) {
    console.error('Test generation failed:', error)
    return NextResponse.json(
      { error: 'Test generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Run the Python blog generator script in test mode
 */
function runPythonScript(inputData: Record<string, unknown>): Promise<TestResult> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), 'python', 'crewai', 'blog_generator.py')
    const inputJson = JSON.stringify(inputData)

    const pythonProcess = spawn('python3', [pythonScript, inputJson], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr)
        resolve({
          success: false,
          error: stderr || 'Python script execution failed',
        })
        return
      }

      try {
        const result = JSON.parse(stdout)
        resolve(result)
      } catch {
        resolve({
          success: false,
          error: 'Failed to parse Python script output',
        })
      }
    })

    pythonProcess.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`,
      })
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      pythonProcess.kill()
      resolve({
        success: false,
        error: 'Test generation timed out',
      })
    }, 60000)
  })
}
