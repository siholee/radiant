import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/lib/auth/validation'
import { getClientIp, getUserAgent } from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import {
  verifyPasswordResetToken,
  clearPasswordResetToken,
} from '@/lib/auth/tokens'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = resetPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '입력값이 올바르지 않습니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Verify reset token
    const tokenResult = await verifyPasswordResetToken(token)

    if (!tokenResult.success || !tokenResult.userId) {
      return NextResponse.json(
        { error: tokenResult.error || '유효하지 않은 토큰입니다' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: tokenResult.userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    await clearPasswordResetToken(tokenResult.userId)

    // Log password reset
    await createAuditLog({
      userId: tokenResult.userId,
      action: 'PASSWORD_RESET',
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.',
    })
  } catch (error) {
    console.error('Reset password error:', error)

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
