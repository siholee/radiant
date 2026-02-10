/**
 * Blog Layout Template Marketplace
 * 
 * Lists public layout templates with pagination and sorting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/blog-layout/marketplace?page=1&limit=20&sort=usage|recent
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    console.error('[Layout Marketplace API] No user ID in headers')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const sort = searchParams.get('sort') || 'usage'

  const skip = (page - 1) * limit

  try {
    console.log('[Layout Marketplace API] Fetching templates, sort:', sort, 'page:', page, 'userId:', userId)
    
    const orderBy = sort === 'recent'
      ? [{ createdAt: 'desc' as const }]
      : [{ usageCount: 'desc' as const }, { createdAt: 'desc' as const }]

    const where = {
      isPublic: true,
      isActive: true,
    }

    const [templates, total] = await Promise.all([
      prisma.blogLayoutTemplate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.blogLayoutTemplate.count({ where }),
    ])

    console.log('[Layout Marketplace API] Found templates:', templates.length, 'total:', total)
    
    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[Layout Marketplace API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to fetch marketplace',
      details: errorMessage 
    }, { status: 500 })
  }
}
