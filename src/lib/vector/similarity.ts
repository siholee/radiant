/**
 * Similarity Detection Service
 * 
 * Detects duplicate or highly similar writing samples
 * using pgvector cosine similarity.
 */

import { prisma } from '@/lib/prisma'
import { generateEmbedding } from './embedding-service'

// Similarity threshold for duplicate detection
const SIMILARITY_THRESHOLD = 0.95

export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarSampleId?: string
  similarSampleTitle?: string
  similarity?: number
}

export interface SimilarSample {
  id: string
  title: string | null
  content: string
  similarity: number
  sourceUrl: string | null
}

/**
 * Check if a text is similar to existing samples in a profile
 * Uses cosine similarity via pgvector
 */
export async function checkDuplicateSample(
  profileId: string,
  content: string,
  apiKey: string,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<DuplicateCheckResult> {
  try {
    // Generate embedding for the new content
    const { embedding } = await generateEmbedding(content, apiKey)
    const embeddingVector = `[${embedding.join(',')}]`

    // Find most similar sample using cosine similarity
    const results = await prisma.$queryRaw<SimilarSample[]>`
      SELECT 
        id,
        title,
        content,
        "sourceUrl",
        1 - (embedding <=> ${embeddingVector}::vector) as similarity
      FROM writing_samples
      WHERE "profileId" = ${profileId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingVector}::vector
      LIMIT 1
    `

    if (results.length === 0) {
      return { isDuplicate: false }
    }

    const mostSimilar = results[0]

    if (mostSimilar.similarity >= threshold) {
      return {
        isDuplicate: true,
        similarSampleId: mostSimilar.id,
        similarSampleTitle: mostSimilar.title || '제목 없음',
        similarity: mostSimilar.similarity,
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('Duplicate check failed:', error)
    // If duplicate check fails, allow the sample (don't block on this)
    return { isDuplicate: false }
  }
}

/**
 * Find all similar samples above a given threshold
 * Useful for viewing potential duplicates
 */
export async function findSimilarSamples(
  profileId: string,
  content: string,
  apiKey: string,
  threshold: number = 0.8,
  limit: number = 5
): Promise<SimilarSample[]> {
  try {
    const { embedding } = await generateEmbedding(content, apiKey)
    const embeddingVector = `[${embedding.join(',')}]`

    const results = await prisma.$queryRaw<SimilarSample[]>`
      SELECT 
        id,
        title,
        SUBSTRING(content, 1, 200) as content,
        "sourceUrl",
        1 - (embedding <=> ${embeddingVector}::vector) as similarity
      FROM writing_samples
      WHERE "profileId" = ${profileId}
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingVector}::vector) >= ${threshold}
      ORDER BY embedding <=> ${embeddingVector}::vector
      LIMIT ${limit}
    `

    return results
  } catch (error) {
    console.error('Similar samples search failed:', error)
    return []
  }
}

/**
 * Check for duplicate by comparing text directly (fallback without embedding)
 * Uses text similarity heuristics
 */
export async function checkDuplicateByText(
  profileId: string,
  content: string
): Promise<DuplicateCheckResult> {
  // Normalize content for comparison
  const normalizedContent = normalizeText(content)
  
  // Get first 500 characters as a fingerprint
  const contentFingerprint = normalizedContent.slice(0, 500)
  
  // Search for samples with similar content start
  const existingSamples = await prisma.writingSample.findMany({
    where: {
      profileId,
      isApproved: true,
    },
    select: {
      id: true,
      title: true,
      content: true,
    },
  })

  for (const sample of existingSamples) {
    const sampleFingerprint = normalizeText(sample.content).slice(0, 500)
    const similarity = calculateTextSimilarity(contentFingerprint, sampleFingerprint)
    
    if (similarity >= SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        similarSampleId: sample.id,
        similarSampleTitle: sample.title || '제목 없음',
        similarity,
      }
    }
  }

  return { isDuplicate: false }
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s가-힣]/g, '')
    .trim()
}

/**
 * Calculate simple text similarity using Jaccard index
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(' ').filter(w => w.length > 1))
  const words2 = new Set(text2.split(' ').filter(w => w.length > 1))
  
  if (words1.size === 0 || words2.size === 0) return 0
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

/**
 * Check if a URL has already been scraped for this profile
 */
export async function checkDuplicateUrl(
  profileId: string,
  sourceUrl: string
): Promise<{ isDuplicate: boolean; existingSampleId?: string }> {
  const existing = await prisma.writingSample.findFirst({
    where: {
      profileId,
      sourceUrl,
    },
    select: { id: true },
  })

  return {
    isDuplicate: !!existing,
    existingSampleId: existing?.id,
  }
}

export { SIMILARITY_THRESHOLD }
