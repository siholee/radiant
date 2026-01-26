import { userResolvers } from './user'
import { blogResolvers } from './blog'
import { taskResolvers } from './task'
import { blogCreatorResolvers } from './blog-creator'

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...blogResolvers.Query,
    ...taskResolvers.Query,
    ...blogCreatorResolvers.Query,
  },
  Mutation: {
    ...blogResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...blogCreatorResolvers.Mutation,
  },
  User: userResolvers.User,
  BlogPost: blogResolvers.BlogPost,
  EmployeeTask: taskResolvers.EmployeeTask,
}
