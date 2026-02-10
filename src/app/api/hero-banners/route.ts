import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 활성 배너 목록 (공개 - 인증 불필요)
export async function GET() {
  try {
    const banners = await prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        imageUrl: true,
        linkUrl: true,
        title: true,
        description: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error('[Public HeroBanner] GET error:', error)
    return NextResponse.json({ banners: [] })
  }
}
