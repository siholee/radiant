-- Add model management fields to WritingStyleProfile
ALTER TABLE "writing_style_profiles" ADD COLUMN IF NOT EXISTS "preferredAiModel" TEXT NOT NULL DEFAULT 'OPENAI';
ALTER TABLE "writing_style_profiles" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "writing_style_profiles" ADD COLUMN IF NOT EXISTS "versionHistory" JSONB;

-- Add processing status fields to WritingSample
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "processingStep" TEXT;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "validationIssues" JSONB;
ALTER TABLE "writing_samples" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

-- Create enums if they don't exist (PostgreSQL 9.1+)
DO $$ BEGIN
    CREATE TYPE "SampleStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AiModelProvider" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for status-based queries
CREATE INDEX IF NOT EXISTS "writing_samples_profileId_status_idx" ON "writing_samples"("profileId", "status");
