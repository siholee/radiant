/**
 * Fork a public Blog Layout Template
 * 
 * Creates a copy of a public template in the user's account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/blog-layout/[id]/fork
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const source = await prisma.blogLayoutTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { isPublic: true },
          { isSystem: true },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        promptInstruction: true,
        isPublic: true,
        isSystem: true,
        version: true,
      },
    })

    if (!source) {
      return NextResponse.json({ error: 'Public template not found' }, { status: 404 })
    }

    // Check if user already forked this template (by name match)
    const existing = await prisma.blogLayoutTemplate.findFirst({
      where: {
        userId,
        name: { startsWith: source.name },
        isActive: true,
      },
    })

    const forkName = existing
      ? `${source.name} (복사본 ${Date.now().toString().slice(-4)})`
      : `${source.name} (복사본)`

    const forked = await prisma.blogLayoutTemplate.create({
      data: {
        userId,
        name: forkName,
        description: source.description,
        promptInstruction: source.promptInstruction,
        isPublic: false,
        versionHistory: [
          {
            version: 1,
            snapshot: source.promptInstruction,
            changes: `${source.name}에서 복제`,
            timestamp: new Date().toISOString(),
            userId,
          },
        ],
      },
    })

    return NextResponse.json({ template: forked }, { status: 201 })
  } catch (error) {
    console.error('Failed to fork template:', error)
    return NextResponse.json({ error: 'Failed to fork template' }, { status: 500 })
  }
}
