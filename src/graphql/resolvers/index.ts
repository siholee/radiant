import { userResolvers } from './user'
import { blogResolvers } from './blog'
import { taskResolvers } from './task'

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...blogResolvers.Query,
    ...taskResolvers.Query,
  },
  Mutation: {
    ...blogResolvers.Mutation,
    ...taskResolvers.Mutation,
  },
  User: userResolvers.User,
  BlogPost: blogResolvers.BlogPost,
  EmployeeTask: taskResolvers.EmployeeTask,
}
