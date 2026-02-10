/**
 * Blog Layout Template Test Generation
 * 
 * Generates a short sample blog post using the layout template.
 * Uses Python blog_generator.py in test mode.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/blog-layout/[id]/test-generate
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const template = await prisma.blogLayoutTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { userId },
          { isSystem: true },
          { isPublic: true },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        promptInstruction: true,
        isPublic: true,
        isSystem: true,
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get user's API keys
    const apiKeyRecords = await prisma.userApiKey.findMany({
      where: { userId, status: 'ACTIVE' },
    })

    if (apiKeyRecords.length === 0) {
      return NextResponse.json(
        { error: 'API 키가 없습니다. 설정에서 API 키를 추가하세요.' },
        { status: 400 },
      )
    }

    const apiKeys: Record<string, string> = {}
    for (const record of apiKeyRecords) {
      const decryptedKey = decryptApiKey(record.encryptedKey)
      apiKeys[record.provider.toLowerCase()] = decryptedKey
    }

    // Call Python script in test mode with layout
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFilePromise = promisify(execFile)
    const path = await import('path')

    const pythonScriptPath = path.join(process.cwd(), 'python', 'crewai', 'blog_generator.py')

    const inputData = JSON.stringify({
      prompt: '블로그 레이아웃 테스트: 건강한 아침 루틴의 중요성',
      title: '건강한 아침 루틴 테스트',
      locale: 'ko',
      tags: ['건강', '루틴', '생활습관'],
      layout: {
        id: template.id,
        name: template.name,
        instruction: template.promptInstruction,
      },
      testMode: true,
      apiKeys,
    })

    const { stdout, stderr } = await execFilePromise(
      'python3',
      [pythonScriptPath, inputData],
      { maxBuffer: 5 * 1024 * 1024 },
    )

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    const result = JSON.parse(stdout)

    if (result.error) {
      throw new Error(result.error)
    }

    // Save preview to template
    await prisma.blogLayoutTemplate.update({
      where: { id },
      data: {
        previewSample: result.content,
        previewGeneratedAt: new Date(),
      },
    })

    return NextResponse.json({
      content: result.content,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Failed to test generate:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate test sample' },
      { status: 500 },
    )
  }
}
