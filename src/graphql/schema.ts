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

  # Blog Creator Enums
  enum ApiKeyProvider {
    OPENAI
    ANTHROPIC
    GOOGLE
    AZURE_OPENAI
  }

  enum ApiKeyStatus {
    ACTIVE
    DEPRECATED
    REVOKED
  }

  enum JobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
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

  # Blog Creator Types
  type UserApiKey {
    id: ID!
    provider: ApiKeyProvider!
    label: String
    status: ApiKeyStatus!
    lastUsedAt: String
    createdAt: String!
    updatedAt: String!
    usage: ApiKeyUsageStats
  }

  type ApiKeyUsageStats {
    requestCount: Int!
    totalCost: Float!
    totalInputTokens: Int!
    totalOutputTokens: Int!
  }

  type WritingStyleProfile {
    id: ID!
    name: String!
    description: String
    styleMetadata: String # JSON string
    isActive: Boolean!
    sampleCount: Int!
    createdAt: String!
    updatedAt: String!
    createdBy: User
  }

  type WritingSample {
    id: ID!
    title: String
    contentPreview: String!
    sourceUrl: String
    wordCount: Int!
    language: String!
    platform: String
    isApproved: Boolean!
    createdAt: String!
  }

  type BlogGenerationJob {
    id: ID!
    status: JobStatus!
    progress: Int!
    prompt: String!
    title: String
    locale: String!
    tags: [String!]!
    styleProfileId: String
    aiProvider: ApiKeyProvider
    aiModel: String
    errorMessage: String
    processingTime: Int
    createdAt: String!
    completedAt: String
    blogPost: BlogPost
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

  # Blog Creator Inputs
  input CreateApiKeyInput {
    provider: ApiKeyProvider!
    apiKey: String!
    label: String
  }

  input CreateWritingProfileInput {
    name: String!
    description: String
    styleMetadata: String
  }

  input UpdateWritingProfileInput {
    name: String
    description: String
    isActive: Boolean
    styleMetadata: String
  }

  input StartBlogGenerationInput {
    prompt: String!
    title: String
    locale: String
    tags: [String!]
    styleProfileId: String
    aiProvider: ApiKeyProvider
    aiModel: String
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

    # Blog Creator Queries
    myApiKeys: [UserApiKey!]!
    writingProfiles(activeOnly: Boolean): [WritingStyleProfile!]!
    writingProfile(id: ID!): WritingStyleProfile
    writingSamples(profileId: ID!): [WritingSample!]!
    blogGenerationJob(id: ID!): BlogGenerationJob
    myBlogJobs(status: JobStatus, limit: Int, offset: Int): [BlogGenerationJob!]!
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

    # Blog Creator Mutations
    createApiKey(input: CreateApiKeyInput!): UserApiKey!
    deleteApiKey(id: ID!): Boolean!
    
    createWritingProfile(input: CreateWritingProfileInput!): WritingStyleProfile!
    updateWritingProfile(id: ID!, input: UpdateWritingProfileInput!): WritingStyleProfile!
    deleteWritingProfile(id: ID!): Boolean!
    
    startBlogGeneration(input: StartBlogGenerationInput!): BlogGenerationJob!
    cancelBlogGeneration(id: ID!): Boolean!
  }
`
