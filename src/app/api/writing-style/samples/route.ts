/**
 * Writing Samples Management Endpoint
 * 
 * Handles adding and managing writing samples for style profiles.
 * Includes quality validation, duplicate detection, and status tracking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeUrl, isScrapableUrl } from '@/lib/scraper'
import {
  generateEmbedding,
  getUserOpenAIKey,
  deleteWritingSample,
  updateProfileEmbedding,
} from '@/lib/vector/embedding-service'
import { validateWritingSample } from '@/lib/validation/text-quality'
import { checkDuplicateSample, checkDuplicateUrl } from '@/lib/vector/similarity'
import { chunkText, estimateTokenCount } from '@/lib/scraper/text-cleaner'
import { z } from 'zod'

// Request validation schemas
const addSampleFromUrlSchema = z.object({
  profileId: z.string().min(1),
  url: z.string().url(),
})

const addSampleFromTextSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  language: z.enum(['ko', 'en']).default('ko'),
  platform: z.string().optional(),
})

const updateSampleSchema = z.object({
  title: z.string().max(200).optional(),
  isApproved: z.boolean().optional(),
})

/**
 * GET /api/writing-style/samples?profileId=xxx
 * List samples for a specific profile
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can view samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  try {
    const samples = await prisma.writingSample.findMany({
      where: { profileId },
      select: {
        id: true,
        title: true,
        content: true,
        sourceUrl: true,
        wordCount: true,
        language: true,
        platform: true,
        isApproved: true,
        status: true,
        progress: true,
        processingStep: true,
        qualityScore: true,
        validationIssues: true,
        errorMessage: true,
        retryCount: true,
        createdAt: true,
        processedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      samples: samples.map((s) => ({
        ...s,
        contentPreview: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch samples:', error)
    return NextResponse.json({ error: 'Failed to fetch samples' }, { status: 500 })
  }
}

/**
 * POST /api/writing-style/samples
 * Add a new sample (from URL or text)
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can add samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Determine if this is URL-based or text-based sample
    const isUrlBased = 'url' in body

    if (isUrlBased) {
      // URL-based sample
      const parsed = addSampleFromUrlSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { profileId, url } = parsed.data

      // Check for duplicate URL
      const urlDuplicateCheck = await checkDuplicateUrl(profileId, url)
      if (urlDuplicateCheck.isDuplicate) {
        return NextResponse.json(
          { error: '이미 등록된 URL입니다', duplicateId: urlDuplicateCheck.existingSampleId },
          { status: 400 }
        )
      }

      // Validate URL
      const validation = isScrapableUrl(url)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 400 })
      }

      // Get user's OpenAI API key for embeddings
      const apiKey = await getUserOpenAIKey(userId)
      if (!apiKey) {
        return NextResponse.json(
          { error: 'No OpenAI API key found. Please add one to generate embeddings.' },
          { status: 400 }
        )
      }

      // Scrape the URL
      const scrapeResult = await scrapeUrl(url)
      if (!scrapeResult.success) {
        return NextResponse.json(
          { error: `Failed to scrape URL: ${scrapeResult.error}` },
          { status: 400 }
        )
      }

      if (!scrapeResult.content || scrapeResult.content.length < 50) {
        return NextResponse.json(
          { error: 'Scraped content is too short or empty' },
          { status: 400 }
        )
      }

      // Validate content quality
      const qualityValidation = validateWritingSample({
        content: scrapeResult.content,
        title: scrapeResult.title,
      })

      if (!qualityValidation.success) {
        return NextResponse.json(
          { error: qualityValidation.error },
          { status: 400 }
        )
      }

      // Check token count and chunk if necessary
      const estimatedTokens = estimateTokenCount(scrapeResult.content)
      console.log(`[DEBUG] Content length: ${scrapeResult.content.length} chars, Estimated tokens: ${estimatedTokens}`)

      let contentToUse = scrapeResult.content
      let chunkInfo: { isChunked: boolean; chunkCount?: number; selectedChunk?: number } = { isChunked: false }

      if (estimatedTokens > 8000) {
        // Content exceeds limit, need to chunk
        const chunks = chunkText(scrapeResult.content, 7500) // Leave some buffer
        console.log(`[DEBUG] Content split into ${chunks.length} chunks`)

        if (chunks.length === 0) {
          return NextResponse.json(
            { error: '콘텐츠를 처리할 수 없습니다. 텍스트가 너무 짧습니다.' },
            { status: 400 }
          )
        }

        // Use the largest chunk (likely the main content)
        const largestChunk = chunks.reduce((a, b) => a.length > b.length ? a : b)
        contentToUse = largestChunk
        chunkInfo = {
          isChunked: true,
          chunkCount: chunks.length,
          selectedChunk: chunks.indexOf(largestChunk) + 1,
        }

        console.log(`[DEBUG] Using chunk ${chunkInfo.selectedChunk}/${chunks.length}, length: ${contentToUse.length} chars`)
      }

      // Check for duplicate content
      const duplicateCheck = await checkDuplicateSample(profileId, contentToUse, apiKey)
      if (duplicateCheck.isDuplicate) {
        return NextResponse.json(
          {
            error: `중복된 콘텐츠입니다 (유사도: ${((duplicateCheck.similarity || 0) * 100).toFixed(1)}%)`,
            duplicateOf: duplicateCheck.similarSampleTitle,
          },
          { status: 400 }
        )
      }

      // Update word count for chunked content
      const finalWordCount = contentToUse.split(/\s+/).filter(w => w.length > 0).length

      // Create sample with PROCESSING status
      const sample = await prisma.writingSample.create({
        data: {
          profileId,
          title: scrapeResult.title,
          content: contentToUse,
          sourceUrl: url,
          wordCount: finalWordCount,
          language: qualityValidation.data!.language,
          platform: scrapeResult.platform,
          status: 'PROCESSING',
          progress: 10,
          processingStep: '임베딩 생성 중...',
          qualityScore: qualityValidation.data!.qualityScore,
          validationIssues: qualityValidation.data!.validationIssues,
          isApproved: true,
        },
      })

      // Generate embedding in background using the chunked content
      processEmbeddingInBackground(sample.id, contentToUse, apiKey, profileId)

      const message = chunkInfo.isChunked
        ? `샘플이 추가되었습니다. 콘텐츠가 너무 길어서 ${chunkInfo.chunkCount}개 청크 중 ${chunkInfo.selectedChunk}번째를 사용했습니다.`
        : 'Sample added successfully from URL'

      return NextResponse.json({
        sample: {
          id: sample.id,
          title: scrapeResult.title,
          wordCount: finalWordCount,
          platform: scrapeResult.platform,
          sourceUrl: url,
          qualityScore: qualityValidation.data!.qualityScore,
          warnings: qualityValidation.data!.validationIssues.warnings,
          ...(chunkInfo.isChunked && {
            chunkInfo: {
              totalChunks: chunkInfo.chunkCount,
              usedChunk: chunkInfo.selectedChunk,
            },
          }),
        },
        message,
      })
    } else {
      // Text-based sample
      const parsed = addSampleFromTextSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { profileId, title, content, language, platform } = parsed.data

      // Validate content quality
      const qualityValidation = validateWritingSample({
        content,
        title,
      })

      if (!qualityValidation.success) {
        return NextResponse.json(
          { error: qualityValidation.error },
          { status: 400 }
        )
      }

      // Get user's OpenAI API key for embeddings
      const apiKey = await getUserOpenAIKey(userId)
      if (!apiKey) {
        return NextResponse.json(
          { error: 'No OpenAI API key found. Please add one to generate embeddings.' },
          { status: 400 }
        )
      }

      // Check for duplicate content
      const duplicateCheck = await checkDuplicateSample(profileId, content, apiKey)
      if (duplicateCheck.isDuplicate) {
        return NextResponse.json(
          {
            error: `중복된 콘텐츠입니다 (유사도: ${((duplicateCheck.similarity || 0) * 100).toFixed(1)}%)`,
            duplicateOf: duplicateCheck.similarSampleTitle,
          },
          { status: 400 }
        )
      }

      // Create sample with PROCESSING status
      const sample = await prisma.writingSample.create({
        data: {
          profileId,
          title: title || '제목 없음',
          content,
          wordCount: qualityValidation.data!.wordCount,
          language: language || qualityValidation.data!.language,
          platform: platform || 'manual',
          status: 'PROCESSING',
          progress: 10,
          processingStep: '임베딩 생성 중...',
          qualityScore: qualityValidation.data!.qualityScore,
          validationIssues: qualityValidation.data!.validationIssues,
          isApproved: true,
        },
      })

      // Generate embedding in background
      processEmbeddingInBackground(sample.id, content, apiKey, profileId)

      return NextResponse.json({
        sample: {
          id: sample.id,
          title: title || '제목 없음',
          wordCount: qualityValidation.data!.wordCount,
          qualityScore: qualityValidation.data!.qualityScore,
          warnings: qualityValidation.data!.validationIssues.warnings,
        },
        message: 'Sample added successfully',
      })
    }
  } catch (error) {
    console.error('Failed to add sample:', error)
    return NextResponse.json({ error: 'Failed to add sample' }, { status: 500 })
  }
}

/**
 * DELETE /api/writing-style/samples?id=xxx
 * Delete a sample
 */
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can delete samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sampleId = searchParams.get('id')

  if (!sampleId) {
    return NextResponse.json({ error: 'Sample ID is required' }, { status: 400 })
  }

  try {
    await deleteWritingSample(sampleId)

    return NextResponse.json({
      message: 'Sample deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete sample:', error)
    return NextResponse.json({ error: 'Failed to delete sample' }, { status: 500 })
  }
}

/**
 * PATCH /api/writing-style/samples?id=xxx
 * Update a sample's metadata
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can update samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sampleId = searchParams.get('id')

  if (!sampleId) {
    return NextResponse.json({ error: 'Sample ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = updateSampleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const sample = await prisma.writingSample.update({
      where: { id: sampleId },
      data: parsed.data,
    })

    // If approval status changed, update profile embedding
    if ('isApproved' in parsed.data) {
      await updateProfileEmbedding(sample.profileId)
    }

    return NextResponse.json({
      sample,
      message: 'Sample updated successfully',
    })
  } catch (error) {
    console.error('Failed to update sample:', error)
    return NextResponse.json({ error: 'Failed to update sample' }, { status: 500 })
  }
}

/**
 * Process embedding generation in background
 */
async function processEmbeddingInBackground(
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
        processingStep: '텍스트 임베딩 생성 중...',
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
        "processedAt" = NOW()
      WHERE id = ${sampleId}
    `

    // Update profile embedding and sample count
    await updateProfileEmbedding(profileId)
    await prisma.writingStyleProfile.update({
      where: { id: profileId },
      data: { sampleCount: { increment: 1 } },
    })
  } catch (error) {
    console.error(`Embedding generation failed for sample ${sampleId}:`, error)

    // Mark as failed
    await prisma.writingSample.update({
      where: { id: sampleId },
      data: {
        status: 'FAILED',
        progress: 0,
        processingStep: null,
        errorMessage: error instanceof Error ? error.message : '임베딩 생성 실패',
      },
    })
  }
}
