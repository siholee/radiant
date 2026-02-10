/**
 * Profile Version History and Rollback Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface VersionHistoryEntry {
  version: number
  snapshot: {
    name: string
    description: string | null
    preferredAiModel: string
    styleMetadata: Record<string, unknown> | null
    isActive: boolean
  }
  changes: string[]
  timestamp: string
  userId: string
}

/**
 * GET /api/writing-style/profiles/[id]/versions
 * Get version history for a profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: profileId } = await params

  try {
    const profile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        version: true,
        versionHistory: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const history = (profile.versionHistory as VersionHistoryEntry[] | null) || []

    return NextResponse.json({
      profileId: profile.id,
      profileName: profile.name,
      currentVersion: profile.version,
      history: history.map(entry => ({
        version: entry.version,
        changes: entry.changes,
        timestamp: entry.timestamp,
        snapshot: entry.snapshot,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch version history:', error)
    return NextResponse.json({ error: 'Failed to fetch version history' }, { status: 500 })
  }
}
