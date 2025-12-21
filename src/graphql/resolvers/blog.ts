import { prisma } from '@/lib/prisma'
import type { GraphQLContext } from '../context'

interface CreateBlogPostInput {
  title: string
  slug: string
  content: string
  excerpt?: string
  coverImage?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  locale?: string
  tags?: string[]
  generatedBy?: string
  promptUsed?: string
}

interface UpdateBlogPostInput {
  title?: string
  slug?: string
  content?: string
  excerpt?: string
  coverImage?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt?: string
  locale?: string
  tags?: string[]
}

interface BlogPostsArgs {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  locale?: string
  authorId?: string
  limit?: number
  offset?: number
}

export const blogResolvers = {
  Query: {
    blogPost: async (
      _: unknown,
      { id, slug }: { id?: string; slug?: string }
    ) => {
      if (!id && !slug) {
        throw new Error('Either id or slug must be provided')
      }

      return await prisma.blogPost.findUnique({
        where: id ? { id } : { slug },
      })
    },

    blogPosts: async (_: unknown, args: BlogPostsArgs) => {
      const { status, locale, authorId, limit = 50, offset = 0 } = args

      return await prisma.blogPost.findMany({
        where: {
          ...(status && { status }),
          ...(locale && { locale }),
          ...(authorId && { authorId }),
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      })
    },
  },

  Mutation: {
    createBlogPost: async (
      _: unknown,
      { input }: { input: CreateBlogPostInput },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      // Check for duplicate slug
      const existing = await prisma.blogPost.findUnique({
        where: { slug: input.slug },
      })

      if (existing) {
        throw new Error('Blog post with this slug already exists')
      }

      return await prisma.blogPost.create({
        data: {
          ...input,
          authorId: context.user.id,
          locale: input.locale || 'ko',
          tags: input.tags || [],
          status: input.status || 'DRAFT',
        },
      })
    },

    updateBlogPost: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateBlogPostInput },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const blogPost = await prisma.blogPost.findUnique({
        where: { id },
      })

      if (!blogPost) {
        throw new Error('Blog post not found')
      }

      // Only author or admin can update
      if (blogPost.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      return await prisma.blogPost.update({
        where: { id },
        data: input,
      })
    },

    deleteBlogPost: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const blogPost = await prisma.blogPost.findUnique({
        where: { id },
      })

      if (!blogPost) {
        throw new Error('Blog post not found')
      }

      // Only author or admin can delete
      if (blogPost.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      await prisma.blogPost.delete({
        where: { id },
      })

      return true
    },

    publishBlogPost: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const blogPost = await prisma.blogPost.findUnique({
        where: { id },
      })

      if (!blogPost) {
        throw new Error('Blog post not found')
      }

      // Only author or admin can publish
      if (blogPost.authorId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      return await prisma.blogPost.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      })
    },
  },

  BlogPost: {
    author: async (parent: { authorId: string }) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId },
      })
    },
  },
}
