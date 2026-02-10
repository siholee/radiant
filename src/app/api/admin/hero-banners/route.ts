import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth/session'

// GET: Admin 배너 목록 조회 (전체 - 비활성 포함)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const banners = await prisma.heroBanner.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error('[Admin HeroBanner] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    )
  }
}

// POST: 새 배너 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageUrl, linkUrl, title, description } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // 현재 최대 sortOrder 조회
    const maxOrder = await prisma.heroBanner.aggregate({
      _max: { sortOrder: true },
    })
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

    const banner = await prisma.heroBanner.create({
      data: {
        imageUrl,
        linkUrl: linkUrl || null,
        title: title || null,
        description: description || null,
        sortOrder: nextOrder,
        createdBy: session.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ banner }, { status: 201 })
  } catch (error) {
    console.error('[Admin HeroBanner] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    )
  }
}

// PUT: 배너 순서 일괄 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orders } = body as { orders: { id: string; sortOrder: number }[] }

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'orders array is required' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      orders.map((item) =>
        prisma.heroBanner.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin HeroBanner] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update banner order' },
      { status: 500 }
    )
  }
}
