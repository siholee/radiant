/**
 * Blog Creator GraphQL Resolvers
 * 
 * Handles API keys, writing profiles, and blog generation jobs.
 */

import { prisma } from '@/lib/prisma'
import { encryptApiKey, maskApiKey, validateApiKeyFormat } from '@/lib/crypto/encryption'
import { addBlogGenerationJob, cancelJob } from '@/lib/queue/blog-generation-queue'
import type { GraphQLContext } from '@/graphql/context'

// Helper to get 30-day usage stats
async function getApiKeyUsageStats(keyId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const usageLogs = await prisma.apiKeyUsage.findMany({
    where: {
      keyId,
      timestamp: { gte: thirtyDaysAgo },
    },
    select: {
      estimatedCost: true,
      inputTokens: true,
      outputTokens: true,
    },
  })

  return {
    requestCount: usageLogs.length,
    totalCost: Math.round(usageLogs.reduce((sum: number, log: any) => sum + log.estimatedCost, 0) * 1000) / 1000,
    totalInputTokens: usageLogs.reduce((sum: number, log: any) => sum + log.inputTokens, 0),
    totalOutputTokens: usageLogs.reduce((sum: number, log: any) => sum + log.outputTokens, 0),
  }
}

export const blogCreatorResolvers = {
  Query: {
    // Get user's API keys
    myApiKeys: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const keys = await prisma.userApiKey.findMany({
        where: {
          userId: context.user.id,
          status: { not: 'REVOKED' },
        },
        orderBy: { createdAt: 'desc' },
      })

      return Promise.all(
        keys.map(async (key: any) => ({
          ...key,
          usage: await getApiKeyUsageStats(key.id),
        }))
      )
    },

    // Get writing profiles
    writingProfiles: async (
      _: unknown,
      args: { activeOnly?: boolean },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const whereClause: Record<string, unknown> = {}
      if (context.user.role !== 'ADMIN') {
        whereClause.isActive = true
      } else if (args.activeOnly) {
        whereClause.isActive = true
      }

      const profiles = await prisma.writingStyleProfile.findMany({
        where: whereClause,
        include: {
          user: true,
          _count: { select: { samples: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return profiles.map((p: any) => ({
        ...p,
        sampleCount: p._count.samples,
        styleMetadata: p.styleMetadata ? JSON.stringify(p.styleMetadata) : null,
        createdBy: p.user,
      }))
    },

    // Get single writing profile
    writingProfile: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const profile = await prisma.writingStyleProfile.findUnique({
        where: { id: args.id },
        include: {
          user: true,
          _count: { select: { samples: true } },
        },
      })

      if (!profile) return null

      return {
        ...profile,
        sampleCount: profile._count.samples,
        styleMetadata: profile.styleMetadata ? JSON.stringify(profile.styleMetadata) : null,
        createdBy: profile.user,
      }
    },

    // Get writing samples for a profile
    writingSamples: async (_: unknown, args: { profileId: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      if (context.user.role !== 'ADMIN') {
        throw new Error('Admin access required')
      }

      const samples = await prisma.writingSample.findMany({
        where: { profileId: args.profileId },
        orderBy: { createdAt: 'desc' },
      })

      return samples.map((s: any) => ({
        ...s,
        contentPreview: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : ''),
      }))
    },

    // Get blog generation job
    blogGenerationJob: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const job = await prisma.blogGenerationJob.findFirst({
        where: {
          id: args.id,
          userId: context.user.id,
        },
        include: {
          blogPost: true,
        },
      })

      return job
    },

    // Get user's blog generation jobs
    myBlogJobs: async (
      _: unknown,
      args: { status?: string; limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const whereClause: Record<string, unknown> = {
        userId: context.user.id,
      }

      if (args.status) {
        whereClause.status = args.status
      }

      const jobs = await prisma.blogGenerationJob.findMany({
        where: whereClause,
        include: {
          blogPost: true,
        },
        orderBy: { createdAt: 'desc' },
        take: args.limit || 20,
        skip: args.offset || 0,
      })

      return jobs
    },
  },

  Mutation: {
    // Create API key
    createApiKey: async (
      _: unknown,
      args: { input: { provider: string; apiKey: string; label?: string } },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const { provider, apiKey, label } = args.input

      // Validate format
      if (!validateApiKeyFormat(apiKey, provider)) {
        throw new Error(`Invalid ${provider} API key format`)
      }

      // Check for existing key
      const existing = await prisma.userApiKey.findFirst({
        where: {
          userId: context.user.id,
          provider: provider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
          status: 'ACTIVE',
        },
      })

      if (existing) {
        throw new Error(`You already have an active ${provider} API key`)
      }

      // Encrypt and store
      const { encryptedKey, keyVersion } = encryptApiKey(apiKey, {
        provider,
        userId: context.user.id,
      })

      const newKey = await prisma.userApiKey.create({
        data: {
          userId: context.user.id,
          provider: provider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
          encryptedKey,
          keyVersion,
          label,
        },
      })

      return {
        ...newKey,
        usage: { requestCount: 0, totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0 },
      }
    },

    // Delete (revoke) API key
    deleteApiKey: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const key = await prisma.userApiKey.findFirst({
        where: {
          id: args.id,
          userId: context.user.id,
        },
      })

      if (!key) {
        throw new Error('API key not found')
      }

      await prisma.userApiKey.update({
        where: { id: args.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      })

      return true
    },

    // Create writing profile
    createWritingProfile: async (
      _: unknown,
      args: { input: { name: string; description?: string; styleMetadata?: string } },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      if (context.user.role !== 'ADMIN') {
        throw new Error('Admin access required')
      }

      const profile = await prisma.writingStyleProfile.create({
        data: {
          userId: context.user.id,
          name: args.input.name,
          description: args.input.description,
          styleMetadata: args.input.styleMetadata ? JSON.parse(args.input.styleMetadata) : null,
        },
        include: {
          user: true,
        },
      })

      return {
        ...profile,
        sampleCount: 0,
        styleMetadata: profile.styleMetadata ? JSON.stringify(profile.styleMetadata) : null,
        createdBy: profile.user,
      }
    },

    // Update writing profile
    updateWritingProfile: async (
      _: unknown,
      args: {
        id: string
        input: { name?: string; description?: string; isActive?: boolean; styleMetadata?: string }
      },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      if (context.user.role !== 'ADMIN') {
        throw new Error('Admin access required')
      }

      const updateData: Record<string, unknown> = {}
      if (args.input.name !== undefined) updateData.name = args.input.name
      if (args.input.description !== undefined) updateData.description = args.input.description
      if (args.input.isActive !== undefined) updateData.isActive = args.input.isActive
      if (args.input.styleMetadata !== undefined) {
        updateData.styleMetadata = JSON.parse(args.input.styleMetadata)
      }

      const profile = await prisma.writingStyleProfile.update({
        where: { id: args.id },
        data: updateData,
        include: {
          user: true,
          _count: { select: { samples: true } },
        },
      })

      return {
        ...profile,
        sampleCount: profile._count.samples,
        styleMetadata: profile.styleMetadata ? JSON.stringify(profile.styleMetadata) : null,
        createdBy: profile.user,
      }
    },

    // Delete writing profile
    deleteWritingProfile: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      if (context.user.role !== 'ADMIN') {
        throw new Error('Admin access required')
      }

      await prisma.writingStyleProfile.delete({
        where: { id: args.id },
      })

      return true
    },

    // Start blog generation
    startBlogGeneration: async (
      _: unknown,
      args: {
        input: {
          prompt: string
          title?: string
          locale?: string
          tags?: string[]
          styleProfileId?: string
          aiProvider?: string
          aiModel?: string
        }
      },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      if (context.user.role !== 'ADMIN' && context.user.role !== 'EMPLOYEE') {
        throw new Error('Insufficient permissions')
      }

      const { prompt, title, locale = 'ko', tags = [], styleProfileId, aiProvider = 'OPENAI', aiModel } =
        args.input

      // Verify API key exists
      const apiKey = await prisma.userApiKey.findFirst({
        where: {
          userId: context.user.id,
          provider: aiProvider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
          status: 'ACTIVE',
        },
      })

      if (!apiKey) {
        throw new Error(`No active ${aiProvider} API key found`)
      }

      // Create job
      const job = await prisma.blogGenerationJob.create({
        data: {
          userId: context.user.id,
          prompt,
          title,
          locale,
          tags,
          styleProfileId,
          aiProvider: aiProvider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
          aiModel,
          status: 'PENDING',
          progress: 0,
        },
      })

      // Add to queue
      await addBlogGenerationJob({
        jobId: job.id,
        userId: context.user.id,
        prompt,
        title,
        locale,
        tags,
        styleProfileId,
        aiProvider: aiProvider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
        aiModel,
      })

      return job
    },

    // Cancel blog generation
    cancelBlogGeneration: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const job = await prisma.blogGenerationJob.findFirst({
        where: {
          id: args.id,
          userId: context.user.id,
        },
      })

      if (!job) {
        throw new Error('Job not found')
      }

      if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
        throw new Error(`Cannot cancel job with status: ${job.status}`)
      }

      await cancelJob(args.id)
      return true
    },
  },
}
