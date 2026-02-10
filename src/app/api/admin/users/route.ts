/**
 * Admin Users Management API
 * 
 * GET: List all users with search and pagination
 * POST: Invite new user (creates user with invite token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auth/audit'
import { generateSecureToken } from '@/lib/auth/tokens'
import { sendUserInviteEmail } from '@/lib/email/send'
import { z } from 'zod'

const inviteUserSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['USER', 'EMPLOYEE', 'ADMIN']).default('USER'),
})

/**
 * GET /api/admin/users
 * List all users with search, pagination, and counts
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  try {
    // Build where clause for search
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Get users with counts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              blogPosts: true,
              blogGenerationJobs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      blogCount: user._count.blogPosts,
      jobCount: user._count.blogGenerationJobs,
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list users:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}

/**
 * POST /api/admin/users
 * Invite a new user (creates user with empty password, sends invite email)
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')
  const userEmail = request.headers.get('x-user-email')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = inviteUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, name, role } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Generate invite token (7 days validity)
    const inviteToken = generateSecureToken()
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Create user with empty password (will be set when they accept invite)
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: '', // Empty password - user must set via invite link
        emailVerified: false,
        resetToken: inviteToken,
        resetTokenExpiry: inviteExpiry,
      },
    })

    // Send invite email
    await sendUserInviteEmail(email, inviteToken, name)

    // Audit log
    await createAuditLog({
      userId,
      action: 'PROFILE_UPDATE',
      metadata: {
        action: 'USER_INVITED',
        invitedUserId: newUser.id,
        invitedUserEmail: email,
        invitedUserRole: role,
        invitedBy: userEmail,
      },
    })

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error('Failed to invite user:', error)
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
  }
}
