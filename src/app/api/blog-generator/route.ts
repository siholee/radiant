/**
 * Blog Generation Endpoint
 * 
 * Creates a blog generation job and starts generation immediately.
 * Returns job ID for status polling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBlogContent } from '@/lib/blog-generator/generate-blog'
import { createAuditLog } from '@/lib/auth/audit'
import { z } from 'zod'

// Request validation schema
const createJobSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  title: z.string().optional(),
  locale: z.enum(['ko', 'en']).default('ko'),
  tags: z.array(z.string()).default([]),
  styleProfileId: z.string().optional(),
  aiProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI']).default('OPENAI'),
  aiModel: z.string().optional(),
  aiAgents: z.object({
    opener: z.string().default('openai'),
    researcher: z.string().default('perplexity'),
    writer: z.string().default('gemini'),
    editor: z.string().default('openai'),
  }).optional(),
  layoutId: z.string().optional(),
})

/**
 * GET /api/blog-generator
 * List user's blog generation jobs
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    const whereClause: Record<string, unknown> = { userId }
    if (status) {
      whereClause.status = status
    }

    const [jobs, total] = await Promise.all([
      prisma.blogGenerationJob.findMany({
        where: whereClause,
        include: {
          blogPost: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.blogGenerationJob.count({ where: whereClause }),
    ])

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + jobs.length < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

/**
 * POST /api/blog-generator
 * Create a new blog generation job
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createJobSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { prompt, title, locale, tags, styleProfileId, aiProvider, aiModel, aiAgents, layoutId } = parsed.data

    // Verify user has an API key for the selected provider
    const apiKey = await prisma.userApiKey.findFirst({
      where: {
        userId,
        provider: aiProvider,
        status: 'ACTIVE',
      },
    })

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `No active ${aiProvider} API key found. Please add one in your settings.`,
          code: 'NO_API_KEY',
        },
        { status: 400 }
      )
    }

    // Validate style profile if provided
    if (styleProfileId) {
      const profile = await prisma.writingStyleProfile.findFirst({
        where: {
          id: styleProfileId,
          isActive: true,
        },
      })

      if (!profile) {
        return NextResponse.json(
          { error: 'Writing style profile not found or inactive' },
          { status: 400 }
        )
      }
    }

    // Validate layout template if provided
    let layoutData: { id: string; name: string; instruction: string } | null = null
    if (layoutId) {
      const layout = await prisma.blogLayoutTemplate.findFirst({
        where: {
          id: layoutId,
          isActive: true,
          OR: [
            { userId },
            { isSystem: true },
            { isPublic: true },
          ],
        },
      })

      if (!layout) {
        return NextResponse.json(
          { error: 'Layout template not found or inactive' },
          { status: 400 },
        )
      }

      layoutData = {
        id: layout.id,
        name: layout.name,
        instruction: layout.promptInstruction,
      }

      // Increment usage count
      await prisma.blogLayoutTemplate.update({
        where: { id: layoutId },
        data: { usageCount: { increment: 1 } },
      })
    }

    // Create the job record
    const job = await prisma.blogGenerationJob.create({
      data: {
        userId,
        prompt,
        title,
        locale,
        tags,
        styleProfileId,
        status: 'PENDING',
        progress: 0,
        currentStep: '대기 중...',
        steps: {
          aiAgents: aiAgents || {
            opener: 'openai',
            researcher: 'perplexity',
            writer: 'gemini',
            editor: 'openai',
          },
          ...(layoutData && { layout: layoutData }),
        },
        aiProvider,
        aiModel: aiModel || 'gpt-4o-mini',
      },
    })

    // Start generation in background (non-blocking)
    generateBlogContent(job.id).catch(err => {
      console.error('Blog generation failed:', err)
    })

    // Audit log
    await createAuditLog({
      userId,
      action: 'BLOG_GENERATION_STARTED',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      metadata: {
        jobId: job.id,
        aiProvider,
        aiModel,
        locale,
      },
    })

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        createdAt: job.createdAt,
      },
      message: 'Blog generation started. Poll the status endpoint for updates.',
    })
  } catch (error) {
    console.error('Failed to create job:', error)
    return NextResponse.json({ error: 'Failed to create blog generation job' }, { status: 500 })
  }
}
