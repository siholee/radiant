/**
 * Writing Samples Management Endpoint
 * 
 * Handles adding and managing writing samples for style profiles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeUrl, isScrapableUrl } from '@/lib/scraper'
import {
  storeWritingSampleWithEmbedding,
  getUserOpenAIKey,
  deleteWritingSample,
  updateProfileEmbedding,
} from '@/lib/vector/embedding-service'
import { z } from 'zod'

// Request validation schemas
const addSampleFromUrlSchema = z.object({
  profileId: z.string().min(1),
  url: z.string().url(),
})

const addSampleFromTextSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().optional(),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  language: z.enum(['ko', 'en']).default('ko'),
  platform: z.string().optional(),
})

/**
 * GET /api/writing-style/samples?profileId=xxx
 * List samples for a specific profile
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can view samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  try {
    const samples = await prisma.writingSample.findMany({
      where: { profileId },
      select: {
        id: true,
        title: true,
        content: true,
        sourceUrl: true,
        wordCount: true,
        language: true,
        platform: true,
        isApproved: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      samples: samples.map((s: any) => ({
        ...s,
        contentPreview: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch samples:', error)
    return NextResponse.json({ error: 'Failed to fetch samples' }, { status: 500 })
  }
}

/**
 * POST /api/writing-style/samples
 * Add a new sample (from URL or text)
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can add samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Determine if this is URL-based or text-based sample
    const isUrlBased = 'url' in body

    if (isUrlBased) {
      // URL-based sample
      const parsed = addSampleFromUrlSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { profileId, url } = parsed.data

      // Validate URL
      const validation = isScrapableUrl(url)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 400 })
      }

      // Get user's OpenAI API key for embeddings
      const apiKey = await getUserOpenAIKey(userId)
      if (!apiKey) {
        return NextResponse.json(
          { error: 'No OpenAI API key found. Please add one to generate embeddings.' },
          { status: 400 }
        )
      }

      // Scrape the URL
      const scrapeResult = await scrapeUrl(url)
      if (!scrapeResult.success) {
        return NextResponse.json(
          { error: `Failed to scrape URL: ${scrapeResult.error}` },
          { status: 400 }
        )
      }

      if (!scrapeResult.content || scrapeResult.content.length < 50) {
        return NextResponse.json(
          { error: 'Scraped content is too short or empty' },
          { status: 400 }
        )
      }

      // Store sample with embedding
      const sampleId = await storeWritingSampleWithEmbedding(profileId, scrapeResult.content, apiKey, {
        title: scrapeResult.title,
        sourceUrl: url,
        language: 'ko', // Default to Korean
        platform: scrapeResult.platform,
      })

      // Update profile embedding
      await updateProfileEmbedding(profileId)

      return NextResponse.json({
        sample: {
          id: sampleId,
          title: scrapeResult.title,
          wordCount: scrapeResult.wordCount,
          platform: scrapeResult.platform,
          sourceUrl: url,
        },
        message: 'Sample added successfully from URL',
      })
    } else {
      // Text-based sample
      const parsed = addSampleFromTextSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { profileId, title, content, language, platform } = parsed.data

      // Get user's OpenAI API key for embeddings
      const apiKey = await getUserOpenAIKey(userId)
      if (!apiKey) {
        return NextResponse.json(
          { error: 'No OpenAI API key found. Please add one to generate embeddings.' },
          { status: 400 }
        )
      }

      // Store sample with embedding
      const sampleId = await storeWritingSampleWithEmbedding(profileId, content, apiKey, {
        title,
        language,
        platform,
      })

      // Update profile embedding
      await updateProfileEmbedding(profileId)

      return NextResponse.json({
        sample: {
          id: sampleId,
          title,
          wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
        },
        message: 'Sample added successfully',
      })
    }
  } catch (error) {
    console.error('Failed to add sample:', error)
    return NextResponse.json({ error: 'Failed to add sample' }, { status: 500 })
  }
}

/**
 * DELETE /api/writing-style/samples?id=xxx
 * Delete a sample
 */
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only ADMIN can delete samples
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sampleId = searchParams.get('id')

  if (!sampleId) {
    return NextResponse.json({ error: 'Sample ID is required' }, { status: 400 })
  }

  try {
    await deleteWritingSample(sampleId)

    return NextResponse.json({
      message: 'Sample deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete sample:', error)
    return NextResponse.json({ error: 'Failed to delete sample' }, { status: 500 })
  }
}
