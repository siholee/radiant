-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifyExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ApiKeyProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "deprecatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_usage" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTime" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "model" TEXT,
    "purpose" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writing_style_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "styleMetadata" JSONB,
    "embedding" vector(1536),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_style_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writing_samples" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "wordCount" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "platform" TEXT,
    "embedding" vector(1536),
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "writing_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_generation_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "tags" TEXT[],
    "styleProfileId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "blogPostId" TEXT,
    "errorMessage" TEXT,
    "processingTime" INTEGER,
    "aiModel" TEXT,
    "aiProvider" "ApiKeyProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "blog_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blog_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blog_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_api_keys_userId_status_idx" ON "user_api_keys"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_api_keys_userId_provider_key" ON "user_api_keys"("userId", "provider");

-- CreateIndex
CREATE INDEX "api_key_usage_keyId_timestamp_idx" ON "api_key_usage"("keyId", "timestamp");

-- CreateIndex
CREATE INDEX "api_key_usage_timestamp_idx" ON "api_key_usage"("timestamp");

-- CreateIndex
CREATE INDEX "writing_style_profiles_userId_isActive_idx" ON "writing_style_profiles"("userId", "isActive");

-- CreateIndex
CREATE INDEX "writing_samples_profileId_isApproved_idx" ON "writing_samples"("profileId", "isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "blog_generation_jobs_blogPostId_key" ON "blog_generation_jobs"("blogPostId");

-- CreateIndex
CREATE INDEX "blog_generation_jobs_userId_status_idx" ON "blog_generation_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "blog_generation_jobs_status_createdAt_idx" ON "blog_generation_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "user_blog_links_userId_platform_idx" ON "user_blog_links"("userId", "platform");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_usage" ADD CONSTRAINT "api_key_usage_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "user_api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writing_style_profiles" ADD CONSTRAINT "writing_style_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writing_samples" ADD CONSTRAINT "writing_samples_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "writing_style_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_generation_jobs" ADD CONSTRAINT "blog_generation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_generation_jobs" ADD CONSTRAINT "blog_generation_jobs_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
