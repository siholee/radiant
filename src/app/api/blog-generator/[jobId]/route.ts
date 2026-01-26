/**
 * Individual Blog Generation Job Endpoint
 * 
 * Get status of a specific job, or cancel it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

/**
 * GET /api/blog-generator/[jobId]
 * Get the status of a blog generation job with detailed step information
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const { jobId } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get job from database
    const job = await prisma.blogGenerationJob.findFirst({
      where: {
        id: jobId,
        userId, // Ensure user owns this job
      },
      include: {
        blogPost: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        steps: job.steps,
        prompt: job.prompt,
        title: job.title,
        locale: job.locale,
        tags: job.tags,
        styleProfileId: job.styleProfileId,
        aiProvider: job.aiProvider,
        aiModel: job.aiModel,
        errorMessage: job.errorMessage,
        processingTime: job.processingTime,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        blogPost: job.blogPost,
      },
    })
  } catch (error) {
    console.error('Failed to fetch job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

/**
 * DELETE /api/blog-generator/[jobId]
 * Cancel a pending or active job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const { jobId } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify ownership
    const job = await prisma.blogGenerationJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if job can be cancelled
    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Cannot cancel a job with status: ${job.status}` },
        { status: 400 }
      )
    }

    // Cancel the job by updating status
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Job cancelled successfully',
    })
  } catch (error) {
    console.error('Failed to cancel job:', error)
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
  }
}
