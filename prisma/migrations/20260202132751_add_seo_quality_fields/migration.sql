-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "aiDetectionScore" INTEGER DEFAULT 0,
ADD COLUMN     "faqSchema" JSONB,
ADD COLUMN     "metaDescription" VARCHAR(160),
ADD COLUMN     "qualityWarning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingTime" INTEGER,
ADD COLUMN     "seoScore" INTEGER DEFAULT 0;
