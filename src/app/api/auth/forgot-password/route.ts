import { NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/auth/validation'
import {
  rateLimit,
  rateLimitConfigs,
  getClientIp,
  getUserAgent,
} from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import { createPasswordResetToken } from '@/lib/auth/tokens'
import { sendPasswordResetEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    // Rate limiting by IP
    const rateLimitResult = await rateLimit(
      `forgot-password:${ipAddress}`,
      rateLimitConfigs.forgotPassword
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
          retryAfter: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.reset.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = forgotPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효한 이메일 주소를 입력해주세요',
        },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Create password reset token (returns success even if user doesn't exist)
    const result = await createPasswordResetToken(email)

    if (result.token) {
      // Send reset email
      await sendPasswordResetEmail(email, result.token)

      // Log the request
      await createAuditLog({
        action: 'PASSWORD_RESET_REQUEST',
        ipAddress,
        userAgent,
        metadata: { email },
      })
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: '해당 이메일로 가입된 계정이 있다면, 비밀번호 재설정 링크가 발송됩니다.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
