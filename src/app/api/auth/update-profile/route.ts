/**
 * User Profile Update API
 * 
 * PUT: Update own profile (name, email)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auth/audit'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Valid email required').optional(),
})

/**
 * PUT /api/auth/update-profile
 * Update current user's profile (name, email)
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { name, email } = parsed.data

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is already taken (if changing email)
    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: { name?: string; email?: string; emailVerified?: boolean } = {}
    const changes: { name?: { from: string | null; to: string }; email?: { from: string; to: string } } = {}

    if (name !== undefined && name !== currentUser.name) {
      updateData.name = name
      changes.name = { from: currentUser.name, to: name }
    }

    if (email !== undefined && email !== currentUser.email) {
      updateData.email = email
      updateData.emailVerified = false // Reset email verification when email changes
      changes.email = { from: currentUser.email, to: email }
    }

    // If no changes, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        message: 'No changes to save',
        user: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
        },
      })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    })

    // Audit log
    await createAuditLog({
      userId,
      action: 'PROFILE_UPDATE',
      metadata: {
        action: 'SELF_PROFILE_UPDATE',
        changes,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      emailChanged: !!changes.email,
    })
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
