/**
 * Fork (copy) a public writing style profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sourceProfile = await prisma.writingStyleProfile.findUnique({
      where: { id: params.id },
      include: {
        samples: true,
      },
    })

    if (!sourceProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!sourceProfile.isPublic && sourceProfile.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create a copy for the user
    const newProfile = await prisma.writingStyleProfile.create({
      data: {
        userId,
        name: `${sourceProfile.name} (복사본)`,
        description: sourceProfile.description,
        styleMetadata: sourceProfile.styleMetadata as any,
        preferredAiModel: sourceProfile.preferredAiModel,
        version: 1,
        isPublic: false,
        sampleCount: 0,
      },
    })

    // Optionally copy samples (up to 5)
    if (sourceProfile.samples.length > 0) {
      const samplesToCopy = sourceProfile.samples.slice(0, 5)
      await prisma.writingSample.createMany({
        data: samplesToCopy.map((sample) => ({
          profileId: newProfile.id,
          content: sample.content,
          title: sample.title || null,
          wordCount: sample.wordCount,
          language: sample.language,
          sourceUrl: sample.sourceUrl || null,
        })),
      })

      await prisma.writingStyleProfile.update({
        where: { id: newProfile.id },
        data: { sampleCount: samplesToCopy.length },
      })
    }

    // Increment usage count
    await prisma.writingStyleProfile.update({
      where: { id: params.id },
      data: { usageCount: { increment: 1 } },
    })

    return NextResponse.json({ profile: newProfile })
  } catch (error) {
    console.error('Failed to fork profile:', error)
    return NextResponse.json({ error: 'Failed to fork profile' }, { status: 500 })
  }
}
