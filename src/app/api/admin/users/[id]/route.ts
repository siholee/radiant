/**
 * Admin User Management API - Single User Operations
 * 
 * GET: Get user details
 * PUT: Update user (name, role, isActive)
 * DELETE: Delete user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auth/audit'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['USER', 'EMPLOYEE', 'ADMIN']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/users/[id]
 * Get single user details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        _count: {
          select: {
            blogPosts: true,
            blogGenerationJobs: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        lockedUntil: user.lockedUntil?.toISOString() || null,
        blogCount: user._count.blogPosts,
        jobCount: user._count.blogGenerationJobs,
      },
    })
  } catch (error) {
    console.error('Failed to get user:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update user details (name, role, isActive)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const adminUserId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')
  const adminEmail = request.headers.get('x-user-email')

  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id: targetUserId } = await params

  try {
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from demoting themselves
    if (targetUserId === adminUserId && parsed.data.role && parsed.data.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: { name?: string; role?: 'USER' | 'EMPLOYEE' | 'ADMIN' } = {}
    
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name
    }
    if (parsed.data.role !== undefined) {
      updateData.role = parsed.data.role
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    // Audit log
    await createAuditLog({
      userId: adminUserId,
      action: 'PROFILE_UPDATE',
      metadata: {
        action: 'ADMIN_USER_UPDATE',
        targetUserId,
        targetUserEmail: existingUser.email,
        changes: updateData,
        updatedBy: adminEmail,
      },
    })

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
