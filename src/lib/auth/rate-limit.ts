import { prisma } from '@/lib/prisma'

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: Date
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Max attempts in the window
}

// In-memory store for rate limiting (for serverless, consider using Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis-based rate limiting
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 15 * 60 * 1000, maxAttempts: 5 }
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `ratelimit:${identifier}`
  
  const existing = rateLimitStore.get(key)
  
  if (!existing || existing.resetAt < now) {
    // Create new window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      reset: new Date(now + config.windowMs),
    }
  }
  
  // Increment counter
  existing.count++
  
  if (existing.count > config.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      reset: new Date(existing.resetAt),
    }
  }
  
  return {
    success: true,
    remaining: config.maxAttempts - existing.count,
    reset: new Date(existing.resetAt),
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 attempts per window
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3, // 3 registrations per hour
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3, // 3 reset requests per hour
  },
  verifyEmail: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 verification attempts
  },
  'profile-update': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10, // 10 updates per 15 minutes
  },
  'password-change': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3, // 3 password changes per hour
  },
}

/**
 * Account lockout management
 */
export async function handleFailedLogin(userId: string): Promise<boolean> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: { increment: 1 },
    },
    select: { failedLoginAttempts: true },
  })
  
  // Lock account after 5 failed attempts
  if (user.failedLoginAttempts >= 5) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Lock for 30 minutes
      },
    })
    return true // Account is now locked
  }
  
  return false
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  })
  
  if (!user?.lockedUntil) return false
  
  // Check if lock has expired
  if (user.lockedUntil < new Date()) {
    // Reset the lock
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    })
    return false
  }
  
  return true
}

/**
 * Get IP address from request headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
