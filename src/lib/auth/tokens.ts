import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Generate a secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = generateSecureToken()
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyToken: token,
      emailVerifyExpiry: expiry,
    },
  })
  
  return token
}

/**
 * Verify email token and mark email as verified
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpiry: { gte: new Date() },
    },
  })
  
  if (!user) {
    return { success: false, error: '유효하지 않거나 만료된 인증 토큰입니다' }
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  })
  
  return { success: true }
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
  })
  
  if (!user) {
    // Don't reveal whether user exists
    return { success: true }
  }
  
  const token = generateSecureToken()
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  })
  
  return { success: true, token }
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
    },
  })
  
  if (!user) {
    return { success: false, error: '유효하지 않거나 만료된 재설정 토큰입니다' }
  }
  
  return { success: true, userId: user.id }
}

/**
 * Clear password reset token after use
 */
export async function clearPasswordResetToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: null,
      resetTokenExpiry: null,
    },
  })
}

/**
 * Update user's last login information
 */
export async function updateLastLogin(userId: string, ipAddress: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  })
}
