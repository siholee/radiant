import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, createSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/auth/rate-limit'
import { getClientIp } from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z.string().email('Invalid email').optional(),
})

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Rate limiting
    const clientIp = getClientIp(request)
    const rateLimitResult = await rateLimit(
      `profile-update:${clientIp}`,
      { windowMs: 15 * 60 * 1000, maxAttempts: 10 }
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email } = validation.data

    // If email is being changed, check if it's already in use
    if (email && email !== sessionUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }

      // If email changed, require re-verification
      const updateData: any = { email, emailVerified: false }
      if (name) updateData.name = name

      const updatedUser = await prisma.user.update({
        where: { id: sessionUser.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      })

      // Update session
      await createSession({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
      })

      // Audit log
      await createAuditLog({
        userId: sessionUser.id,
        action: 'PROFILE_UPDATE',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || 'Unknown',
        metadata: { emailChanged: true },
      })

      return NextResponse.json({
        success: true,
        message: 'Profile updated. Please verify your new email address.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified,
        },
      })
    }

    // Update only name
    const updateData: any = {}
    if (name) updateData.name = name

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    })

    // Update session
    await createSession({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
    })

    // Audit log
    await createAuditLog({
      userId: sessionUser.id,
      action: 'PROFILE_UPDATE',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: { fieldsUpdated: Object.keys(updateData) },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
