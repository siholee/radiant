/**
 * Blog Layout Template API
 * 
 * GET  - List layout templates (scope: mine|public|all)
 * POST - Create a new custom layout template
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLayoutSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(50, '이름은 50자 이하'),
  description: z.string().max(200, '설명은 200자 이하').optional(),
  promptInstruction: z.string().min(50, '레이아웃 지시문은 최소 50자').max(2000, '레이아웃 지시문은 최대 2000자'),
  isPublic: z.boolean().default(false),
})

/**
 * GET /api/blog-layout?scope=mine|public|all
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') || 'all'

  try {
    let where: any = { isActive: true }

    if (scope === 'mine') {
      where.OR = [
        { userId },
        { isSystem: true },
      ]
    } else if (scope === 'public') {
      where.isPublic = true
    } else {
      // all: mine + system + public (deduplicated)
      where.OR = [
        { userId },
        { isSystem: true },
        { isPublic: true },
      ]
    }

    const templates = await prisma.blogLayoutTemplate.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { sortOrder: 'asc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Failed to fetch layout templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

/**
 * POST /api/blog-layout
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createLayoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const template = await prisma.blogLayoutTemplate.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description,
        promptInstruction: parsed.data.promptInstruction,
        isPublic: parsed.data.isPublic,
        versionHistory: [
          {
            version: 1,
            snapshot: parsed.data.promptInstruction,
            changes: '최초 생성',
            timestamp: new Date().toISOString(),
            userId,
          },
        ],
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create layout template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
