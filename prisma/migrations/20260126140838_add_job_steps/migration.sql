-- AlterTable
ALTER TABLE "blog_generation_jobs" ADD COLUMN     "currentStep" TEXT,
ADD COLUMN     "steps" JSONB;
