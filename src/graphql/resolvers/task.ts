import { prisma } from '@/lib/prisma'
import type { GraphQLContext } from '../context'

interface CreateEmployeeTaskInput {
  title: string
  description?: string
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
  priority?: number
  dueDate?: string
  assigneeId: string
}

interface UpdateEmployeeTaskInput {
  title?: string
  description?: string
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
  priority?: number
  dueDate?: string
  completedAt?: string
}

interface EmployeeTasksArgs {
  assigneeId?: string
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
  limit?: number
  offset?: number
}

export const taskResolvers = {
  Query: {
    employeeTask: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const task = await prisma.employeeTask.findUnique({
        where: { id },
      })

      if (!task) {
        throw new Error('Task not found')
      }

      // Only assignee or admin can view
      if (task.assigneeId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      return task
    },

    employeeTasks: async (
      _: unknown,
      args: EmployeeTasksArgs,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const { assigneeId, status, limit = 50, offset = 0 } = args

      // Non-admin users can only see their own tasks
      const targetAssigneeId =
        context.user.role === 'ADMIN' && assigneeId
          ? assigneeId
          : context.user.id

      return await prisma.employeeTask.findMany({
        where: {
          assigneeId: targetAssigneeId,
          ...(status && { status }),
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: limit,
        skip: offset,
      })
    },
  },

  Mutation: {
    createEmployeeTask: async (
      _: unknown,
      { input }: { input: CreateEmployeeTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized: Only admins can create tasks')
      }

      return await prisma.employeeTask.create({
        data: {
          ...input,
          status: input.status || 'TODO',
          priority: input.priority || 0,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      })
    },

    updateEmployeeTask: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateEmployeeTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Not authenticated')
      }

      const task = await prisma.employeeTask.findUnique({
        where: { id },
      })

      if (!task) {
        throw new Error('Task not found')
      }

      // Only assignee or admin can update
      if (task.assigneeId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized')
      }

      // Auto-set completedAt when status changes to DONE
      const updateData: Record<string, string | Date | number | boolean | null | undefined> = { ...input }
      if (input.status === 'DONE' && !input.completedAt) {
        updateData.completedAt = new Date()
      }

      // Convert dueDate string to Date if provided
      if (input.dueDate) {
        updateData.dueDate = new Date(input.dueDate)
      }

      return await prisma.employeeTask.update({
        where: { id },
        data: updateData,
      })
    },

    deleteEmployeeTask: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new Error('Unauthorized: Only admins can delete tasks')
      }

      await prisma.employeeTask.delete({
        where: { id },
      })

      return true
    },
  },

  EmployeeTask: {
    assignee: async (parent: { assigneeId: string }) => {
      return await prisma.user.findUnique({
        where: { id: parent.assigneeId },
      })
    },
  },
}
