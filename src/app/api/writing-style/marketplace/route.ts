/**
 * Writing Style Marketplace API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    console.error('[Marketplace API] No user ID in headers')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'usage' // usage | recent

  try {
    console.log('[Marketplace API] Fetching profiles, sort:', sort, 'userId:', userId)
    
    const orderBy = sort === 'recent' 
      ? { createdAt: 'desc' as const }
      : { usageCount: 'desc' as const }

    const profiles = await prisma.writingStyleProfile.findMany({
      where: {
        isPublic: true,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy,
      take: 50,
    })

    console.log('[Marketplace API] Found profiles:', profiles.length)
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('[Marketplace API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to load marketplace',
      details: errorMessage 
    }, { status: 500 })
  }
}
