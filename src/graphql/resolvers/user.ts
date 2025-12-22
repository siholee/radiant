import { prisma } from '@/lib/prisma'
import type { GraphQLContext } from '../context'
import { UserRole } from '@prisma/client'

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      return await prisma.user.findUnique({
        where: { id: context.user.id },
      })
    },

    user: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      return await prisma.user.findUnique({
        where: { id },
      })
    },

    users: async (
      _: unknown,
      { role }: { role?: string },
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      return await prisma.user.findMany({
        where: role ? { role: role as UserRole } : undefined,
        orderBy: { createdAt: 'desc' },
      })
    },
  },

  User: {
    blogPosts: async (parent: { id: string }) => {
      return await prisma.blogPost.findMany({
        where: { authorId: parent.id },
        orderBy: { createdAt: 'desc' },
      })
    },

    employeeTasks: async (parent: { id: string }) => {
      return await prisma.employeeTask.findMany({
        where: { assigneeId: parent.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  },
}
