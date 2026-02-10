/**
 * Sample Retry Endpoint
 * 
 * Allows manual retry of failed embedding generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  generateEmbedding,
  getUserOpenAIKey,
  updateProfileEmbedding,
} from '@/lib/vector/embedding-service'

const MAX_RETRIES = 3

/**
 * POST /api/writing-style/samples/[id]/retry
 * Retry embedding generation for a failed sample
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can retry
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: sampleId } = await params

  try {
    // Get the sample
    const sample = await prisma.writingSample.findUnique({
      where: { id: sampleId },
      select: {
        id: true,
        profileId: true,
        content: true,
        status: true,
        retryCount: true,
      },
    })

    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    // Check if sample is in FAILED status
    if (sample.status !== 'FAILED') {
      return NextResponse.json(
        { error: '실패한 샘플만 재시도할 수 있습니다', currentStatus: sample.status },
        { status: 400 }
      )
    }

    // Check retry count
    if (sample.retryCount >= MAX_RETRIES) {
      return NextResponse.json(
        { error: `최대 재시도 횟수(${MAX_RETRIES}회)를 초과했습니다` },
        { status: 400 }
      )
    }

    // Get user's OpenAI API key
    const apiKey = await getUserOpenAIKey(userId)
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No OpenAI API key found. Please add one to generate embeddings.' },
        { status: 400 }
      )
    }

    // Update status to PROCESSING and increment retry count
    await prisma.writingSample.update({
      where: { id: sampleId },
      data: {
        status: 'PROCESSING',
        progress: 10,
        processingStep: '재시도 중...',
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    })

    // Process embedding in background
    processRetryEmbedding(sampleId, sample.content, apiKey, sample.profileId)

    return NextResponse.json({
      message: '임베딩 재생성을 시작했습니다',
      retryCount: sample.retryCount + 1,
      maxRetries: MAX_RETRIES,
    })
  } catch (error) {
    console.error('Failed to retry sample:', error)
    return NextResponse.json({ error: 'Failed to retry sample' }, { status: 500 })
  }
}

/**
 * Process embedding generation retry
 */
async function processRetryEmbedding(
  sampleId: string,
  content: string,
  apiKey: string,
  profileId: string
): Promise<void> {
  try {
    // Update progress
    await prisma.writingSample.update({
      where: { id: sampleId },
      data: {
        progress: 50,
        processingStep: '텍스트 임베딩 재생성 중...',
      },
    })

    // Generate embedding
    const { embedding } = await generateEmbedding(content, apiKey)
    const embeddingVector = `[${embedding.join(',')}]`

    // Store embedding and mark as completed
    await prisma.$executeRaw`
      UPDATE writing_samples
      SET 
        embedding = ${embeddingVector}::vector,
        status = 'COMPLETED',
        progress = 100,
        "processingStep" = NULL,
        "errorMessage" = NULL,
        "processedAt" = NOW()
      WHERE id = ${sampleId}
    `

    // Update profile embedding
    await updateProfileEmbedding(profileId)
  } catch (error) {
    console.error(`Retry embedding generation failed for sample ${sampleId}:`, error)

    // Mark as failed again
    await prisma.writingSample.update({
      where: { id: sampleId },
      data: {
        status: 'FAILED',
        progress: 0,
        processingStep: null,
        errorMessage: error instanceof Error ? error.message : '임베딩 재생성 실패',
      },
    })
  }
}
