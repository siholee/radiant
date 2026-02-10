/**
 * Admin Password Reset API
 * 
 * POST: Generate password reset token and send email to user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auth/audit'
import { generateSecureToken } from '@/lib/auth/tokens'
import { sendAdminPasswordResetEmail } from '@/lib/email/send'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Send password reset email to user (admin-initiated)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate reset token (24 hours validity)
    const resetToken = generateSecureToken()
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Update user with reset token
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        resetToken: resetToken,
        resetTokenExpiry: resetExpiry,
      },
    })

    // Send password reset email
    await sendAdminPasswordResetEmail(
      targetUser.email,
      resetToken,
      targetUser.name || targetUser.email
    )

    // Audit log
    await createAuditLog({
      userId: adminUserId,
      action: 'PASSWORD_RESET_REQUEST',
      metadata: {
        action: 'ADMIN_PASSWORD_RESET',
        targetUserId,
        targetUserEmail: targetUser.email,
        initiatedBy: adminEmail,
      },
    })

    return NextResponse.json({
      message: 'Password reset email sent successfully',
      email: targetUser.email,
    })
  } catch (error) {
    console.error('Failed to reset password:', error)
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 })
  }
}
