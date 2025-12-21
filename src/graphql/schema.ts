export const typeDefs = `#graphql
  # Enums
  enum UserRole {
    ADMIN
    EMPLOYEE
    USER
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
    BLOCKED
  }

  enum BlogStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  # Types
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    createdAt: String!
    updatedAt: String!
    blogPosts: [BlogPost!]!
    employeeTasks: [EmployeeTask!]!
  }

  type BlogPost {
    id: ID!
    title: String!
    slug: String!
    content: String!
    excerpt: String
    coverImage: String
    status: BlogStatus!
    publishedAt: String
    createdAt: String!
    updatedAt: String!
    locale: String!
    tags: [String!]!
    generatedBy: String
    promptUsed: String
    author: User!
    authorId: String!
  }

  type EmployeeTask {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: Int!
    dueDate: String
    completedAt: String
    createdAt: String!
    updatedAt: String!
    assignee: User!
    assigneeId: String!
  }

  # Inputs
  input CreateBlogPostInput {
    title: String!
    slug: String!
    content: String!
    excerpt: String
    coverImage: String
    status: BlogStatus
    locale: String
    tags: [String!]
    generatedBy: String
    promptUsed: String
  }

  input UpdateBlogPostInput {
    title: String
    slug: String
    content: String
    excerpt: String
    coverImage: String
    status: BlogStatus
    publishedAt: String
    locale: String
    tags: [String!]
  }

  input CreateEmployeeTaskInput {
    title: String!
    description: String
    status: TaskStatus
    priority: Int
    dueDate: String
    assigneeId: String!
  }

  input UpdateEmployeeTaskInput {
    title: String
    description: String
    status: TaskStatus
    priority: Int
    dueDate: String
    completedAt: String
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(role: UserRole): [User!]!

    # Blog queries
    blogPost(id: ID, slug: String): BlogPost
    blogPosts(
      status: BlogStatus
      locale: String
      authorId: String
      limit: Int
      offset: Int
    ): [BlogPost!]!
    
    # Task queries
    employeeTask(id: ID!): EmployeeTask
    employeeTasks(
      assigneeId: String
      status: TaskStatus
      limit: Int
      offset: Int
    ): [EmployeeTask!]!
  }

  # Mutations
  type Mutation {
    # Blog mutations
    createBlogPost(input: CreateBlogPostInput!): BlogPost!
    updateBlogPost(id: ID!, input: UpdateBlogPostInput!): BlogPost!
    deleteBlogPost(id: ID!): Boolean!
    publishBlogPost(id: ID!): BlogPost!

    # Task mutations
    createEmployeeTask(input: CreateEmployeeTaskInput!): EmployeeTask!
    updateEmployeeTask(id: ID!, input: UpdateEmployeeTaskInput!): EmployeeTask!
    deleteEmployeeTask(id: ID!): Boolean!
  }
`
