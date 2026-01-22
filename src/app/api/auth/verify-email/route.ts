import { NextResponse } from 'next/server'
import {
  rateLimit,
  rateLimitConfigs,
  getClientIp,
  getUserAgent,
} from '@/lib/auth/rate-limit'
import { createAuditLog } from '@/lib/auth/audit'
import { verifyEmailToken } from '@/lib/auth/tokens'

export async function GET(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    // Rate limiting by IP
    const rateLimitResult = await rateLimit(
      `verify-email:${ipAddress}`,
      rateLimitConfigs.verifyEmail
    )

    if (!rateLimitResult.success) {
      return NextResponse.redirect(
        new URL('/ko/login?error=too_many_attempts', request.url)
      )
    }

    // Get token from query string
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/ko/login?error=invalid_token', request.url)
      )
    }

    // Verify the token
    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.redirect(
        new URL('/ko/login?error=invalid_token', request.url)
      )
    }

    // Log email verification
    await createAuditLog({
      action: 'EMAIL_VERIFICATION',
      ipAddress,
      userAgent,
      metadata: { token: token.substring(0, 8) + '...' },
    })

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL('/ko/login?verified=true', request.url)
    )
  } catch (error) {
    console.error('Verify email error:', error)

    return NextResponse.redirect(
      new URL('/ko/login?error=server_error', request.url)
    )
  }
}
