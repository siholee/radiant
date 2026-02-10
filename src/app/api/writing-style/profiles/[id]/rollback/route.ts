/**
 * Profile Rollback Endpoint
 * 
 * Rolls back a profile to a previous version.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

interface VersionHistoryEntry {
  version: number
  snapshot: {
    name: string
    description: string | null
    preferredAiModel: 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
    styleMetadata: Record<string, unknown> | null
    isActive: boolean
  }
  changes: string[]
  timestamp: string
  userId: string
}

const rollbackSchema = z.object({
  targetVersion: z.number().int().positive(),
})

/**
 * POST /api/writing-style/profiles/[id]/rollback
 * Rollback a profile to a specific version
 */
export async function POST(
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
    const body = await request.json()
    const parsed = rollbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { targetVersion } = parsed.data

    // Get current profile with version history
    const profile = await prisma.writingStyleProfile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const history = (profile.versionHistory as VersionHistoryEntry[] | null) || []

    // Find the target version in history
    const targetEntry = history.find(entry => entry.version === targetVersion)

    if (!targetEntry) {
      return NextResponse.json(
        { error: `버전 ${targetVersion}을 찾을 수 없습니다` },
        { status: 404 }
      )
    }

    // Create snapshot of current state before rollback
    const currentSnapshot: VersionHistoryEntry = {
      version: profile.version,
      snapshot: {
        name: profile.name,
        description: profile.description,
        preferredAiModel: profile.preferredAiModel as 'OPENAI' | 'GEMINI' | 'ANTHROPIC',
        styleMetadata: profile.styleMetadata as Record<string, unknown> | null,
        isActive: profile.isActive,
      },
      changes: [`버전 ${targetVersion}에서 롤백됨`],
      timestamp: new Date().toISOString(),
      userId,
    }

    // Update history with current state
    const updatedHistory = [currentSnapshot, ...history].slice(0, 10)

    // Apply the rollback
    const updatedProfile = await prisma.writingStyleProfile.update({
      where: { id: profileId },
      data: {
        name: targetEntry.snapshot.name,
        description: targetEntry.snapshot.description,
        preferredAiModel: targetEntry.snapshot.preferredAiModel as 'OPENAI' | 'GEMINI' | 'ANTHROPIC',
        styleMetadata: (targetEntry.snapshot.styleMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: targetEntry.snapshot.isActive,
        version: { increment: 1 },
        versionHistory: updatedHistory as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      message: `버전 ${targetVersion}으로 롤백되었습니다`,
      profile: {
        id: updatedProfile.id,
        name: updatedProfile.name,
        description: updatedProfile.description,
        preferredAiModel: updatedProfile.preferredAiModel,
        version: updatedProfile.version,
        isActive: updatedProfile.isActive,
      },
      rolledBackFrom: profile.version,
      rolledBackTo: targetVersion,
    })
  } catch (error) {
    console.error('Failed to rollback profile:', error)
    return NextResponse.json({ error: 'Failed to rollback profile' }, { status: 500 })
  }
}
