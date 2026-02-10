/**
 * Writing Style Profile Management Endpoint
 * 
 * Handles CRUD for writing style profiles with version management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

// Maximum versions to keep in history
const MAX_VERSION_HISTORY = 10

// Request validation schemas
const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  preferredAiModel: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC']).default('OPENAI'),
  openerAi: z.string().default('openai'),
  researchAi: z.string().default('perplexity'),
  editorAi: z.string().default('openai'),
  styleMetadata: z
    .object({
      tone: z.string().optional(),
      vocabulary: z.string().optional(),
      structure: z.string().optional(),
    })
    .optional(),
})

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  preferredAiModel: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC']).optional(),
  openerAi: z.string().optional(),
  researchAi: z.string().optional(),
  editorAi: z.string().optional(),
  styleMetadata: z
    .object({
      tone: z.string().optional(),
      vocabulary: z.string().optional(),
      structure: z.string().optional(),
    })
    .optional(),
})

interface VersionHistoryEntry {
  version: number
  snapshot: {
    name: string
    description: string | null
    preferredAiModel: string
    styleMetadata: Record<string, unknown> | null
    isActive: boolean
  }
  changes: string[]
  timestamp: string
  userId: string
}

/**
 * GET /api/writing-style/profiles
 * List all writing style profiles (optionally filtered by user)
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'
  const scope = searchParams.get('scope') || 'all' // mine | all

  try {
    const whereClause: Record<string, unknown> = {}
    
    if (scope === 'mine') {
      whereClause.userId = userId
    } else {
      // Show all active profiles
      if (activeOnly) {
        whereClause.isActive = true
      }
    }

    const profiles = await prisma.writingStyleProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            samples: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        styleMetadata: p.styleMetadata,
        preferredAiModel: p.preferredAiModel,
        openerAi: p.openerAi,
        researchAi: p.researchAi,
        editorAi: p.editorAi,
        version: p.version,
        isActive: p.isActive,
        isPublic: p.isPublic,
        usageCount: p.usageCount,
        previewSample: p.previewSample,
        sampleCount: p._count.samples,
        createdBy: p.user,
        userId: p.userId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }
}

/**
 * POST /api/writing-style/profiles
 * Create a new writing style profile (ADMIN only)
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, styleMetadata, preferredAiModel, openerAi, researchAi, editorAi } = parsed.data

    const profile = await prisma.writingStyleProfile.create({
      data: {
        userId,
        name,
        description,
        styleMetadata,
        preferredAiModel,
        openerAi,
        researchAi,
        editorAi,
      },
    })

    return NextResponse.json({
      profile,
      message: 'Writing style profile created successfully',
    })
  } catch (error) {
    console.error('Failed to create profile:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}

/**
 * PUT /api/writing-style/profiles?id=xxx
 * Update a writing style profile with version management (ADMIN only)
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('id')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get current profile for version snapshot
    const currentProfile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        preferredAiModel: true,
        styleMetadata: true,
        isActive: true,
        isPublic: true,
        usageCount: true,
        previewSample: true,
        version: true,
        versionHistory: true,
      },
    })

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only owner can update
    if (currentProfile.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create snapshot of current state
    const snapshot = {
      name: currentProfile.name,
      description: currentProfile.description,
      preferredAiModel: currentProfile.preferredAiModel,
      styleMetadata: currentProfile.styleMetadata as Record<string, unknown> | null,
      isActive: currentProfile.isActive,
      isPublic: currentProfile.isPublic,
    }

    // Determine what changed
    const changes: string[] = []
    const updateData = parsed.data
    if (updateData.name && updateData.name !== currentProfile.name) {
      changes.push(`이름: "${currentProfile.name}" → "${updateData.name}"`)
    }
    if (updateData.description !== undefined && updateData.description !== currentProfile.description) {
      changes.push('설명 변경')
    }
    if (updateData.preferredAiModel && updateData.preferredAiModel !== currentProfile.preferredAiModel) {
      changes.push(`AI 모델: ${currentProfile.preferredAiModel} → ${updateData.preferredAiModel}`)
    }
    if (updateData.styleMetadata) {
      changes.push('스타일 메타데이터 변경')
    }
    if (updateData.isActive !== undefined && updateData.isActive !== currentProfile.isActive) {
      changes.push(`상태: ${currentProfile.isActive ? '활성' : '비활성'} → ${updateData.isActive ? '활성' : '비활성'}`)
    }
    if (updateData.isPublic !== undefined && updateData.isPublic !== currentProfile.isPublic) {
      changes.push(`공개: ${currentProfile.isPublic ? '공개' : '비공개'} → ${updateData.isPublic ? '공개' : '비공개'}`)
    }

    // Build new version history entry
    const newHistoryEntry: VersionHistoryEntry = {
      version: currentProfile.version,
      snapshot,
      changes,
      timestamp: new Date().toISOString(),
      userId,
    }

    // Get existing version history and add new entry
    const existingHistory = (currentProfile.versionHistory as VersionHistoryEntry[] | null) || []
    const updatedHistory = [newHistoryEntry, ...existingHistory].slice(0, MAX_VERSION_HISTORY)

    // Update profile with new version
    const profile = await prisma.writingStyleProfile.update({
      where: { id: profileId },
      data: {
        ...parsed.data,
        version: { increment: 1 },
        versionHistory: updatedHistory as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      profile: {
        ...profile,
        versionHistory: undefined, // Don't send full history in response
      },
      version: profile.version,
      changes,
    })
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

/**
 * DELETE /api/writing-style/profiles?id=xxx
 * Delete a writing style profile (ADMIN only)
 */
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('id')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  try {
    const profile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.writingStyleProfile.delete({
      where: { id: profileId },
    })

    return NextResponse.json({
      message: 'Profile deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete profile:', error)
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
  }
}
