/**
 * Individual Blog Layout Template API
 * 
 * GET    - Get template detail
 * PUT    - Update template (owner only, system templates immutable)
 * DELETE - Soft-delete template (owner only, system templates immutable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateLayoutSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  promptInstruction: z.string().min(50).max(2000).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/blog-layout/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const template = await prisma.blogLayoutTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { userId },
          { isSystem: true },
          { isPublic: true },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

/**
 * PUT /api/blog-layout/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.blogLayoutTemplate.findFirst({
      where: { id, userId, isActive: true },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        version: true,
        isSystem: true,
        isActive: true,
        isPublic: true,
        usageCount: true,
        previewSample: true,
        promptInstruction: true,
        versionHistory: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found or not owned by you' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Cannot edit system templates' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateLayoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Version management: bump version if promptInstruction changed
    let versionHistory = (existing.versionHistory as any[]) || []
    let newVersion = existing.version

    if (parsed.data.promptInstruction && parsed.data.promptInstruction !== existing.promptInstruction) {
      newVersion++
      versionHistory.push({
        version: newVersion,
        snapshot: parsed.data.promptInstruction,
        changes: '레이아웃 지시문 수정',
        timestamp: new Date().toISOString(),
        userId,
      })

      // Keep only last 10 versions
      if (versionHistory.length > 10) {
        versionHistory = versionHistory.slice(-10)
      }
    }

    const template = await prisma.blogLayoutTemplate.update({
      where: { id },
      data: {
        ...parsed.data,
        version: newVersion,
        versionHistory,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

/**
 * DELETE /api/blog-layout/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.blogLayoutTemplate.findFirst({
      where: { id, userId, isActive: true },
      select: {
        id: true,
        isSystem: true,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 })
    }

    await prisma.blogLayoutTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
