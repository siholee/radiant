/**
 * Writing Style Profile Management Endpoint
 * 
 * Handles CRUD for writing style profiles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Request validation schemas
const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
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
  styleMetadata: z
    .object({
      tone: z.string().optional(),
      vocabulary: z.string().optional(),
      structure: z.string().optional(),
    })
    .optional(),
})

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

  try {
    // ADMIN can see all profiles, others only see active profiles
    const whereClause: Record<string, unknown> = {}
    
    if (userRole !== 'ADMIN') {
      whereClause.isActive = true
    } else if (activeOnly) {
      whereClause.isActive = true
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
      profiles: profiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        styleMetadata: p.styleMetadata,
        isActive: p.isActive,
        sampleCount: p._count.samples,
        createdBy: p.user,
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
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can create profiles
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can create writing style profiles' },
      { status: 403 }
    )
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

    const { name, description, styleMetadata } = parsed.data

    const profile = await prisma.writingStyleProfile.create({
      data: {
        userId,
        name,
        description,
        styleMetadata,
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
 * Update a writing style profile (ADMIN only)
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can update writing style profiles' },
      { status: 403 }
    )
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

    const profile = await prisma.writingStyleProfile.update({
      where: { id: profileId },
      data: parsed.data,
    })

    return NextResponse.json({ profile })
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
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can delete writing style profiles' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('id')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  try {
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
