/**
 * File Upload Endpoint for Writing Samples
 * 
 * Handles multiple TXT file uploads with quality validation,
 * duplicate detection, and background embedding generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateWritingSample } from '@/lib/validation/text-quality'
import { checkDuplicateSample, checkDuplicateByText } from '@/lib/vector/similarity'
import {
  generateEmbedding,
  getUserOpenAIKey,
  updateProfileEmbedding,
} from '@/lib/vector/embedding-service'

// Constants
const MAX_FILES = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file
const ALLOWED_EXTENSIONS = ['.txt', '.md']
const ALLOWED_MIME_TYPES = ['text/plain', 'text/markdown', 'application/octet-stream']

interface UploadResult {
  fileName: string
  success: boolean
  sampleId?: string
  error?: string
  qualityScore?: number
  warnings?: string[]
  isDuplicate?: boolean
  duplicateOf?: string
}

/**
 * POST /api/writing-style/samples/upload
 * Upload multiple TXT files for a writing style profile
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can upload samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const profileId = formData.get('profileId') as string
    const files = formData.getAll('files') as File[]

    // Validate profile ID
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Verify profile exists and belongs to user (or admin has access)
    const profile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per upload` },
        { status: 400 }
      )
    }

    // Get user's OpenAI API key for embeddings
    const apiKey = await getUserOpenAIKey(userId)

    const results: UploadResult[] = []

    // Process files sequentially to avoid overwhelming the API
    for (const file of files) {
      const result = await processFile(file, profileId, apiKey)
      results.push(result)
    }

    // Update profile embedding if any samples were added
    const successCount = results.filter(r => r.success).length
    if (successCount > 0 && apiKey) {
      await updateProfileEmbedding(profileId)
    }

    // Update sample count
    await prisma.writingStyleProfile.update({
      where: { id: profileId },
      data: { sampleCount: { increment: successCount } },
    })

    return NextResponse.json({
      results,
      summary: {
        total: files.length,
        success: successCount,
        failed: files.length - successCount,
      },
    })
  } catch (error) {
    console.error('File upload failed:', error)
    return NextResponse.json(
      { error: 'Failed to process file uploads' },
      { status: 500 }
    )
  }
}

/**
 * Process a single file upload
 */
async function processFile(
  file: File,
  profileId: string,
  apiKey: string | null
): Promise<UploadResult> {
  const fileName = file.name

  try {
    // 1. Validate file extension
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        fileName,
        success: false,
        error: `지원하지 않는 파일 형식입니다 (${ALLOWED_EXTENSIONS.join(', ')} 만 허용)`,
      }
    }

    // 2. Validate MIME type (with fallback for unknown types)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        fileName,
        success: false,
        error: `지원하지 않는 MIME 타입입니다: ${file.type}`,
      }
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        fileName,
        success: false,
        error: `파일 크기가 제한을 초과합니다 (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      }
    }

    // 4. Read file content
    const content = await file.text()

    // 5. Validate content quality
    const validation = validateWritingSample({
      content,
      title: fileName.replace(/\.(txt|md)$/i, ''),
    })

    if (!validation.success) {
      return {
        fileName,
        success: false,
        error: validation.error,
      }
    }

    const { data } = validation

    // 6. Check for duplicates
    if (apiKey) {
      const duplicateCheck = await checkDuplicateSample(profileId, content, apiKey)
      if (duplicateCheck.isDuplicate) {
        return {
          fileName,
          success: false,
          error: `중복된 샘플입니다 (유사도: ${((duplicateCheck.similarity || 0) * 100).toFixed(1)}%)`,
          isDuplicate: true,
          duplicateOf: duplicateCheck.similarSampleTitle,
        }
      }
    } else {
      // Fallback to text-based duplicate check
      const duplicateCheck = await checkDuplicateByText(profileId, content)
      if (duplicateCheck.isDuplicate) {
        return {
          fileName,
          success: false,
          error: '중복된 샘플입니다',
          isDuplicate: true,
          duplicateOf: duplicateCheck.similarSampleTitle,
        }
      }
    }

    // 7. Create sample in database with PENDING status
    const sample = await prisma.writingSample.create({
      data: {
        profileId,
        title: data!.title || fileName.replace(/\.(txt|md)$/i, ''),
        content: data!.content,
        wordCount: data!.wordCount,
        language: data!.language,
        platform: 'upload',
        status: apiKey ? 'PROCESSING' : 'COMPLETED',
        progress: apiKey ? 10 : 100,
        processingStep: apiKey ? '임베딩 생성 중...' : null,
        qualityScore: data!.qualityScore,
        validationIssues: data!.validationIssues,
        isApproved: true,
      },
    })

    // 8. Generate embedding in background (non-blocking)
    if (apiKey) {
      processEmbeddingInBackground(sample.id, content, apiKey)
    }

    return {
      fileName,
      success: true,
      sampleId: sample.id,
      qualityScore: data!.qualityScore,
      warnings: data!.validationIssues.warnings,
    }
  } catch (error) {
    console.error(`Failed to process file ${fileName}:`, error)
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다',
    }
  }
}

/**
 * Process embedding generation in background
 * Updates sample status as it progresses
 */
async function processEmbeddingInBackground(
  sampleId: string,
  content: string,
  apiKey: string
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
