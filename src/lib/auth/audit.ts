import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'REGISTER'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILED'
  | 'EMAIL_VERIFICATION'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PROFILE_UPDATE'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'BLOG_GENERATION_STARTED'

interface AuditLogData {
  userId?: string
  action: AuditAction
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options
  
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Get recent failed login attempts for security monitoring
 */
export async function getRecentFailedLogins(options: {
  since?: Date
  limit?: number
} = {}) {
  const { since = new Date(Date.now() - 24 * 60 * 60 * 1000), limit = 100 } = options
  
  return prisma.auditLog.findMany({
    where: {
      action: 'FAILED_LOGIN',
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
