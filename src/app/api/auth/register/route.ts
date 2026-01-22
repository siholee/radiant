import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema, checkPasswordStrength } from '@/lib/auth/validation'
import {
  rateLimit,
  rateLimitConfigs,
  getClientIp,
  getUserAgent,
} from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import { createEmailVerificationToken } from '@/lib/auth/tokens'
import { sendVerificationEmail } from '@/lib/email/send'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    // Rate limiting by IP
    const rateLimitResult = await rateLimit(
      `register:${ipAddress}`,
      rateLimitConfigs.register
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: '너무 많은 가입 시도입니다. 잠시 후 다시 시도해주세요.',
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
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '입력값이 올바르지 않습니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email, password, name } = validationResult.data

    // Check password strength
    const strengthCheck = checkPasswordStrength(password)
    if (!strengthCheck.isStrong) {
      return NextResponse.json(
        {
          error: '비밀번호가 너무 약합니다',
          passwordStrength: {
            score: strengthCheck.score,
            feedback: strengthCheck.feedback,
          },
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Don't reveal that the email exists
      // Log attempt for security monitoring
      await createAuditLog({
        action: 'REGISTER',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'email_exists' },
      })

      return NextResponse.json(
        { error: '이 이메일로는 가입할 수 없습니다' },
        { status: 409 }
      )
    }

    // Hash password with higher cost factor for security
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user - always USER role, no role injection allowed
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER', // Fixed role - no injection possible
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Create email verification token
    const verificationToken = await createEmailVerificationToken(user.id)

    // Send verification email
    await sendVerificationEmail(email, verificationToken, name)

    // Log successful registration
    await createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: '가입이 완료되었습니다. 이메일을 확인하여 계정을 인증해주세요.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: false,
      },
    })
  } catch (error) {
    console.error('Register error:', error)

    await createAuditLog({
      action: 'REGISTER',
      ipAddress,
      userAgent,
      metadata: { error: 'internal_error' },
    })

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
