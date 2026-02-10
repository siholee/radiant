-- Add marketplace fields to WritingStyleProfile
ALTER TABLE "writing_style_profiles" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "writing_style_profiles" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "writing_style_profiles" ADD COLUMN "previewSample" TEXT;
ALTER TABLE "writing_style_profiles" ADD COLUMN "previewGeneratedAt" TIMESTAMP(3);

-- Add index for public profiles
CREATE INDEX "writing_style_profiles_isPublic_isActive_idx" ON "writing_style_profiles"("isPublic", "isActive");
