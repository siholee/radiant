/**
 * Blog Generation Queue
 * 
 * BullMQ-based job queue for handling long-running blog generation tasks.
 * Supports progress tracking, retries, and timeout handling.
 */

import { Queue, Worker, Job, QueueEvents, type JobProgress } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Redis connection configuration
const REDIS_URL = process.env.REDIS_QUEUE_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6379'

function getRedisConnection() {
  const url = new URL(REDIS_URL)
  return {
    host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: parseInt(url.pathname.slice(1) || '0', 10),
    family: 4, // Force IPv4
  }
}

// Queue name
const QUEUE_NAME = 'blog-generation'

// Job data interface
export interface BlogGenerationJobData {
  jobId: string
  userId: string
  prompt: string
  title?: string
  locale: string
  tags: string[]
  styleProfileId?: string
  aiProvider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI'
  aiModel?: string
}

// Job result interface
export interface BlogGenerationJobResult {
  blogPostId: string
  title: string
  content: string
  excerpt?: string
  processingTime: number
}

// Queue instance (singleton)
let queueInstance: Queue<BlogGenerationJobData, BlogGenerationJobResult> | null = null

/**
 * Get or create the blog generation queue
 */
export function getBlogGenerationQueue(): Queue<BlogGenerationJobData, BlogGenerationJobResult> {
  if (!queueInstance) {
    queueInstance = new Queue<BlogGenerationJobData, BlogGenerationJobResult>(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    })
  }
  return queueInstance
}

/**
 * Add a blog generation job to the queue
 */
export async function addBlogGenerationJob(
  data: BlogGenerationJobData
): Promise<Job<BlogGenerationJobData, BlogGenerationJobResult>> {
  const queue = getBlogGenerationQueue()

  const job = await queue.add('generate-blog', data, {
    jobId: data.jobId, // Use our job ID as BullMQ job ID
    priority: 1,
  })

  // Update database status to PROCESSING
  await prisma.blogGenerationJob.update({
    where: { id: data.jobId },
    data: { status: 'PROCESSING' },
  })

  return job
}

/**
 * Update job progress in database
 */
async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  await prisma.blogGenerationJob.update({
    where: { id: jobId },
    data: { progress },
  })
}

/**
 * Get user's API key for the specified provider
 */
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const apiKeyRecord = await prisma.userApiKey.findFirst({
    where: {
      userId,
      provider: provider as 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI',
      status: 'ACTIVE',
    },
  })

  if (!apiKeyRecord) {
    return null
  }

  try {
    return decryptApiKey(apiKeyRecord.encryptedKey)
  } catch {
    return null
  }
}

/**
 * Execute the Python blog generator script
 */
async function executePythonGenerator(
  jobData: BlogGenerationJobData,
  apiKey: string,
  onProgress: (progress: number) => void
): Promise<{ title: string; content: string; excerpt?: string }> {
  const pythonScriptPath =
    process.env.PYTHON_CREWAI_SCRIPT_PATH || '/app/python/crewai/blog_generator.py'

  // Prepare input for Python script
  const input = JSON.stringify({
    prompt: jobData.prompt,
    title: jobData.title,
    locale: jobData.locale,
    tags: jobData.tags,
    styleProfileId: jobData.styleProfileId,
    aiProvider: jobData.aiProvider,
    aiModel: jobData.aiModel,
  })

  // Execute Python script with API key in environment
  const env = {
    ...process.env,
    OPENAI_API_KEY: jobData.aiProvider === 'OPENAI' ? apiKey : undefined,
    ANTHROPIC_API_KEY: jobData.aiProvider === 'ANTHROPIC' ? apiKey : undefined,
    GOOGLE_API_KEY: jobData.aiProvider === 'GOOGLE' ? apiKey : undefined,
    AZURE_OPENAI_API_KEY: jobData.aiProvider === 'AZURE_OPENAI' ? apiKey : undefined,
  }

  // Report initial progress
  onProgress(10)

  try {
    const { stdout, stderr } = await execAsync(
      `python3 "${pythonScriptPath}" '${input.replace(/'/g, "'\"'\"'")}'`,
      {
        env,
        timeout: 4 * 60 * 1000, // 4 minutes (leave buffer before job timeout)
        maxBuffer: 10 * 1024 * 1024, // 10MB
      }
    )

    if (stderr) {
      console.warn('Python script stderr:', stderr)
    }

    onProgress(90)

    // Parse output
    const result = JSON.parse(stdout)
    return {
      title: result.title,
      content: result.content,
      excerpt: result.excerpt,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Python execution failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Create the blog generation worker
 */
export function createBlogGenerationWorker(): Worker<BlogGenerationJobData, BlogGenerationJobResult> {
  const worker = new Worker<BlogGenerationJobData, BlogGenerationJobResult>(
    QUEUE_NAME,
    async (job: Job<BlogGenerationJobData, BlogGenerationJobResult>) => {
      const startTime = Date.now()
      const { jobId, userId, aiProvider } = job.data

      try {
        // Get API key
        const apiKey = await getUserApiKey(userId, aiProvider)
        if (!apiKey) {
          throw new Error(`No valid ${aiProvider} API key found for user`)
        }

        // Update job last used timestamp
        await prisma.userApiKey.updateMany({
          where: {
            userId,
            provider: aiProvider,
            status: 'ACTIVE',
          },
          data: { lastUsedAt: new Date() },
        })

        // Execute generation
        const result = await executePythonGenerator(job.data, apiKey, async (progress) => {
          await job.updateProgress(progress)
          await updateJobProgress(jobId, progress)
        })

        // Generate slug from title
        const slug =
          result.title
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '-')
            .replace(/^-|-$/g, '') + `-${Date.now()}`

        // Create blog post
        const blogPost = await prisma.blogPost.create({
          data: {
            title: result.title,
            slug,
            content: result.content,
            excerpt: result.excerpt,
            status: 'DRAFT',
            locale: job.data.locale,
            tags: job.data.tags,
            generatedBy: 'crewai',
            promptUsed: job.data.prompt,
            authorId: userId,
          },
        })

        const processingTime = Math.round((Date.now() - startTime) / 1000)

        // Update job with result
        await prisma.blogGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            blogPostId: blogPost.id,
            processingTime,
            aiModel: job.data.aiModel,
            aiProvider: aiProvider,
            completedAt: new Date(),
          },
        })

        return {
          blogPostId: blogPost.id,
          title: result.title,
          content: result.content,
          excerpt: result.excerpt,
          processingTime,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Update job with error
        await prisma.blogGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage,
            completedAt: new Date(),
          },
        })

        throw error
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2, // Process 2 jobs at a time
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  )

  // Event handlers
  worker.on('completed', (job: Job) => {
    console.log(`Blog generation job ${job.id} completed`)
  })

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Blog generation job ${job?.id} failed:`, err.message)
  })

  worker.on('progress', (job: Job, progress: JobProgress) => {
    console.log(`Blog generation job ${job.id} progress:`, progress)
  })

  return worker
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(): QueueEvents {
  return new QueueEvents(QUEUE_NAME, {
    connection: getRedisConnection(),
  })
}

/**
 * Get job status from the queue
 */
export async function getJobStatus(jobId: string): Promise<{
  state: string
  progress: number
  result?: BlogGenerationJobResult
  failedReason?: string
} | null> {
  const queue = getBlogGenerationQueue()
  const job = await queue.getJob(jobId)

  if (!job) {
    return null
  }

  const state = await job.getState()
  const progress = typeof job.progress === 'number' ? job.progress : 0

  return {
    state,
    progress,
    result: job.returnvalue || undefined,
    failedReason: job.failedReason || undefined,
  }
}

/**
 * Cancel a pending or active job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const queue = getBlogGenerationQueue()
  const job = await queue.getJob(jobId)

  if (!job) {
    return false
  }

  const state = await job.getState()

  if (state === 'waiting' || state === 'delayed') {
    await job.remove()
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    })
    return true
  }

  if (state === 'active') {
    // Can't cancel active jobs, but we can mark them for cancellation
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    })
    return true
  }

  return false
}

/**
 * Clean up old jobs
 */
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  const queue = getBlogGenerationQueue()
  const cleaned = await queue.clean(olderThanDays * 24 * 3600 * 1000, 1000, 'completed')
  return cleaned.length
}
