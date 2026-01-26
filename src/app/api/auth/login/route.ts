import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth/session'
import { createToken } from '@/lib/auth/jwt'
import { loginSchema } from '@/lib/auth/validation'
import {
  rateLimit,
  rateLimitConfigs,
  handleFailedLogin,
  resetFailedLoginAttempts,
  isAccountLocked,
  getClientIp,
  getUserAgent,
} from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import { updateLastLogin } from '@/lib/auth/tokens'
import { sendAccountLockedEmail } from '@/lib/email/send'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    // Rate limiting by IP
    const rateLimitResult = await rateLimit(
      `login:${ipAddress}`,
      rateLimitConfigs.login
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.',
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
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '입력값이 올바르지 않습니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email, password, returnToken } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Log failed attempt (user not found)
      await createAuditLog({
        action: 'FAILED_LOGIN',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'user_not_found' },
      })

      // Use generic error message to prevent email enumeration
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // Check if account is locked
    const locked = await isAccountLocked(user.id)
    if (locked) {
      await createAuditLog({
        userId: user.id,
        action: 'FAILED_LOGIN',
        ipAddress,
        userAgent,
        metadata: { reason: 'account_locked' },
      })

      return NextResponse.json(
        {
          error: '계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도하거나 비밀번호를 재설정해주세요.',
        },
        { status: 423 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      // Handle failed login attempt
      const wasLocked = await handleFailedLogin(user.id)

      await createAuditLog({
        userId: user.id,
        action: 'FAILED_LOGIN',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_password' },
      })

      if (wasLocked) {
        await createAuditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          ipAddress,
          userAgent,
        })

        // Send notification email
        await sendAccountLockedEmail(user.email)

        return NextResponse.json(
          {
            error: '로그인 시도 횟수를 초과하여 계정이 잠겼습니다. 이메일을 확인해주세요.',
          },
          { status: 423 }
        )
      }

      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // Check if email is verified (only in production)
    if (process.env.NODE_ENV === 'production' && !user.emailVerified) {
      await createAuditLog({
        userId: user.id,
        action: 'FAILED_LOGIN',
        ipAddress,
        userAgent,
        metadata: { reason: 'email_not_verified' },
      })

      return NextResponse.json(
        { 
          error: '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      )
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(user.id)

    // Update last login info
    await updateLastLogin(user.id, ipAddress)

    // Log successful login
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      ipAddress,
      userAgent,
    })

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    }

    // If client requests token (for API usage), return JWT
    if (returnToken) {
      const token = await createToken(sessionUser)
      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      })
    }

    // Otherwise, create cookie-based session (for web)
    await createSession(sessionUser)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    await createAuditLog({
      action: 'FAILED_LOGIN',
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
