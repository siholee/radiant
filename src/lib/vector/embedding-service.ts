/**
 * Embedding Service
 * 
 * Generates text embeddings using OpenAI's embedding API.
 * Supports pgvector for storage and similarity search.
 */

import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'

// Embedding configuration
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536 // text-embedding-3-small default

export interface EmbeddingResult {
  embedding: number[]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

export interface SimilaritySearchResult {
  id: string
  content: string
  title?: string
  similarity: number
  metadata?: Record<string, unknown>
}

/**
 * Generate embedding for text using OpenAI API
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`
    )
  }

  const data = await response.json()

  return {
    embedding: data.data[0].embedding,
    model: EMBEDDING_MODEL,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      totalTokens: data.usage.total_tokens,
    },
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
  apiKey: string
): Promise<EmbeddingResult[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`
    )
  }

  const data = await response.json()

  return data.data.map((item: { embedding: number[]; index: number }) => ({
    embedding: item.embedding,
    model: EMBEDDING_MODEL,
    usage: {
      promptTokens: Math.floor(data.usage.prompt_tokens / texts.length),
      totalTokens: Math.floor(data.usage.total_tokens / texts.length),
    },
  }))
}

/**
 * Store a writing sample with its embedding
 */
export async function storeWritingSampleWithEmbedding(
  profileId: string,
  content: string,
  apiKey: string,
  metadata?: {
    title?: string
    sourceUrl?: string
    language?: string
    platform?: string
  }
): Promise<string> {
  // Generate embedding
  const { embedding } = await generateEmbedding(content, apiKey)

  // Convert embedding to pgvector format
  const embeddingVector = `[${embedding.join(',')}]`

  // Count words
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length

  // Store in database using raw SQL for vector support
  const result = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO writing_samples (
      id, 
      "profileId", 
      title, 
      content, 
      "sourceUrl", 
      "wordCount", 
      language, 
      platform, 
      embedding, 
      "isApproved", 
      "createdAt"
    )
    VALUES (
      gen_random_uuid()::text,
      ${profileId},
      ${metadata?.title || null},
      ${content},
      ${metadata?.sourceUrl || null},
      ${wordCount},
      ${metadata?.language || 'ko'},
      ${metadata?.platform || null},
      ${embeddingVector}::vector,
      true,
      NOW()
    )
    RETURNING id
  `

  // Update sample count on profile
  await prisma.writingStyleProfile.update({
    where: { id: profileId },
    data: { sampleCount: { increment: 1 } },
  })

  return result[0].id
}

/**
 * Search for similar writing samples using cosine similarity
 */
export async function searchSimilarSamples(
  profileId: string,
  queryEmbedding: number[],
  limit: number = 5,
  minSimilarity: number = 0.7
): Promise<SimilaritySearchResult[]> {
  const embeddingVector = `[${queryEmbedding.join(',')}]`

  const results = await prisma.$queryRaw<
    Array<{
      id: string
      title: string | null
      content: string
      similarity: number
      platform: string | null
    }>
  >`
    SELECT 
      id,
      title,
      content,
      platform,
      1 - (embedding <=> ${embeddingVector}::vector) as similarity
    FROM writing_samples
    WHERE "profileId" = ${profileId}
      AND "isApproved" = true
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingVector}::vector) >= ${minSimilarity}
    ORDER BY embedding <=> ${embeddingVector}::vector
    LIMIT ${limit}
  `

  return results.map((row) => ({
    id: row.id,
    content: row.content,
    title: row.title || undefined,
    similarity: row.similarity,
    metadata: {
      platform: row.platform,
    },
  }))
}

/**
 * Search for similar samples by text query
 */
export async function searchSamplesByText(
  profileId: string,
  queryText: string,
  apiKey: string,
  limit: number = 5
): Promise<SimilaritySearchResult[]> {
  const { embedding } = await generateEmbedding(queryText, apiKey)
  return searchSimilarSamples(profileId, embedding, limit)
}

/**
 * Get user's OpenAI API key for embeddings
 */
export async function getUserOpenAIKey(userId: string): Promise<string | null> {
  const apiKeyRecord = await prisma.userApiKey.findFirst({
    where: {
      userId,
      provider: 'OPENAI',
      status: 'ACTIVE',
    },
  })

  if (!apiKeyRecord) {
    return null
  }

  try {
    return decryptApiKey(apiKeyRecord.encryptedKey)
  } catch {
    return null
  }
}

/**
 * Calculate aggregate embedding for a profile (average of all sample embeddings)
 */
export async function updateProfileEmbedding(profileId: string): Promise<void> {
  // Calculate average embedding from all samples
  await prisma.$executeRaw`
    UPDATE writing_style_profiles
    SET embedding = (
      SELECT AVG(embedding)::vector
      FROM writing_samples
      WHERE "profileId" = ${profileId}
        AND embedding IS NOT NULL
        AND "isApproved" = true
    )
    WHERE id = ${profileId}
  `
}

/**
 * Delete a writing sample and update profile
 */
export async function deleteWritingSample(sampleId: string): Promise<void> {
  // Get the profile ID before deleting
  const sample = await prisma.writingSample.findUnique({
    where: { id: sampleId },
    select: { profileId: true },
  })

  if (!sample) {
    throw new Error('Sample not found')
  }

  // Delete the sample
  await prisma.writingSample.delete({
    where: { id: sampleId },
  })

  // Update profile sample count
  await prisma.writingStyleProfile.update({
    where: { id: sample.profileId },
    data: { sampleCount: { decrement: 1 } },
  })

  // Recalculate profile embedding
  await updateProfileEmbedding(sample.profileId)
}

/**
 * Get embedding statistics for a profile
 */
export async function getProfileEmbeddingStats(profileId: string): Promise<{
  totalSamples: number
  approvedSamples: number
  embeddedSamples: number
  totalWords: number
}> {
  const stats = await prisma.$queryRaw<
    Array<{
      total: bigint
      approved: bigint
      embedded: bigint
      words: bigint
    }>
  >`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "isApproved" = true) as approved,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded,
      COALESCE(SUM("wordCount"), 0) as words
    FROM writing_samples
    WHERE "profileId" = ${profileId}
  `

  const row = stats[0]
  return {
    totalSamples: Number(row.total),
    approvedSamples: Number(row.approved),
    embeddedSamples: Number(row.embedded),
    totalWords: Number(row.words),
  }
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSION }
