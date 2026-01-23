import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import { passwordSchema } from '@/lib/auth/validation'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

export async function POST(request: NextRequest) {
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
      `password-change:${sessionUser.id}`,
      { windowMs: 60 * 60 * 1000, maxAttempts: 3 }
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = changePasswordSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validation.data

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      // Audit failed attempt
      await createAuditLog({
        userId: sessionUser.id,
        action: 'PASSWORD_CHANGE_FAILED',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || 'Unknown',
        metadata: { reason: 'Invalid current password' },
      })

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        password: hashedPassword,
      },
    })

    // Audit log
    await createAuditLog({
      userId: sessionUser.id,
      action: 'PASSWORD_CHANGED',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || 'Unknown',
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
