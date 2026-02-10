/**
 * Blog Generation Service
 * 
 * Calls CrewAI Python script with 4-stage AI agent system for blog content generation.
 * Process: Opener AI → Researcher AI → Writer AI → Editor AI
 */

import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'

export interface GenerationStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  output?: string
}

const GENERATION_STEPS: Omit<GenerationStep, 'status' | 'startedAt' | 'completedAt' | 'output'>[] = [
  { id: 'opener', name: '오프너 AI', description: '주제 분석 및 SEO 키워드 생성' },
  { id: 'researcher', name: '리서치 AI', description: '자료 조사 및 정보 수집' },
  { id: 'writer', name: '라이터 AI', description: '콘텐츠 작성 및 키워드 배치' },
  { id: 'editor', name: '편집자 AI', description: '품질 검토 및 SEO 최적화' },
]

async function updateJobProgress(
  jobId: string,
  progress: number,
  currentStep: string,
  steps: GenerationStep[],
  existingSteps?: any
) {
  const job = await prisma.blogGenerationJob.findUnique({
    where: { id: jobId },
    select: { steps: true }
  })
  
  const currentSteps = job?.steps || {}
  
  await prisma.blogGenerationJob.update({
    where: { id: jobId },
    data: {
      progress,
      currentStep,
      steps: {
        ...(currentSteps as any),
        ...existingSteps,
        stages: steps,
      } as unknown as any,
    },
  })
}

export async function generateBlogContent(jobId: string): Promise<void> {
  const startTime = Date.now()
  
  // Get job data
  const job = await prisma.blogGenerationJob.findUnique({
    where: { id: jobId },
    include: { user: true },
  })

  if (!job) {
    throw new Error('Job not found')
  }

  // Initialize steps
  const steps: GenerationStep[] = GENERATION_STEPS.map(s => ({
    ...s,
    status: 'pending' as const,
    startedAt: undefined,
    completedAt: undefined,
    output: undefined,
  }))

  try {
    // Get user's API key
    // Get all user's API keys for different providers
    const apiKeyRecords = await prisma.userApiKey.findMany({
      where: {
        userId: job.userId,
        status: 'ACTIVE',
      },
    })

    if (apiKeyRecords.length === 0) {
      throw new Error('No active API key found')
    }

    // Decrypt all API keys and organize by provider
    const apiKeys: Record<string, string> = {}
    for (const record of apiKeyRecords) {
      const decryptedKey = decryptApiKey(record.encryptedKey)
      apiKeys[record.provider.toLowerCase()] = decryptedKey
    }
    
    // Get AI agents configuration from job steps
    const jobSteps = job.steps as any
    const aiAgents = jobSteps?.aiAgents || {
      opener: 'openai',
      researcher: 'perplexity',
      writer: 'gemini',
      editor: 'openai',
    }

    // Get layout template from job steps (if set)
    const layoutData = jobSteps?.layout || null

    // Update to PROCESSING
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    // Call CrewAI Python script with 4-stage process
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execPromise = promisify(exec)
    const path = await import('path')
    
    const pythonScriptPath = path.join(process.cwd(), 'python', 'crewai', 'blog_generator.py')
    
    const inputData = JSON.stringify({
      prompt: job.prompt,
      title: job.title,
      locale: job.locale,
      tags: job.tags,
      aiAgents,
      apiKeys, // Pass all decrypted API keys
      ...(layoutData && { layout: layoutData }),
    })

    // Step 1: Opener AI
    steps[0].status = 'in_progress'
    steps[0].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 10, '오프너 AI: 주제 분석 중...', steps)
    
    // Execute Python script
    let result: any
    try {
      const { stdout, stderr } = await execPromise(
        `python3 "${pythonScriptPath}" '${inputData.replace(/'/g, "\\'")}'`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      )
      
      if (stderr) {
        console.error('Python stderr:', stderr)
      }
      
      result = JSON.parse(stdout)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Update progress for each stage
      steps[0].status = 'completed'
      steps[0].completedAt = new Date().toISOString()
      steps[0].output = `SEO 키워드 ${result.metadata.seoKeywords.length}개 생성`
      await updateJobProgress(jobId, 30, '리서치 AI: 자료 조사 중...', steps)
      
      // Simulate delay between stages
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 2: Researcher AI
      steps[1].status = 'in_progress'
      steps[1].startedAt = new Date().toISOString()
      await updateJobProgress(jobId, 35, '리서치 AI: 자료 조사 중...', steps)
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      steps[1].status = 'completed'
      steps[1].completedAt = new Date().toISOString()
      steps[1].output = '자료 조사 완료'
      await updateJobProgress(jobId, 60, '라이터 AI: 글 작성 중...', steps)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 3: Writer AI
      steps[2].status = 'in_progress'
      steps[2].startedAt = new Date().toISOString()
      await updateJobProgress(jobId, 65, '라이터 AI: 글 작성 중...', steps)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      steps[2].status = 'completed'
      steps[2].completedAt = new Date().toISOString()
      steps[2].output = `콘텐츠 작성 완료 (${result.content.length}자)`
      await updateJobProgress(jobId, 85, '편집자 AI: 품질 검토 중...', steps)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Step 4: Editor AI
      steps[3].status = 'in_progress'
      steps[3].startedAt = new Date().toISOString()
      await updateJobProgress(jobId, 90, '편집자 AI: 품질 검토 및 SEO 최적화...', steps)
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      steps[3].status = 'completed'
      steps[3].completedAt = new Date().toISOString()
      steps[3].output = `SEO 제목 & 해시태그 ${result.hashtags.length}개 생성`
      await updateJobProgress(jobId, 95, '저장 중...', steps)
      
    } catch (error) {
      console.error('CrewAI execution error:', error)
      throw new Error(`블로그 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Extract results from CrewAI output
    const title = result.title || job.title || 'Untitled'
    const content = result.content
    const excerpt = result.excerpt
    const hashtags = result.hashtags || []
    const metadata = result.metadata || {}

    // Generate slug (use AI-generated slug if available)
    const slug = metadata.slug || title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now()}`

    // Merge tags with hashtags (remove # from hashtags)
    const allTags = [
      ...job.tags,
      ...hashtags.map((h: string) => h.replace(/^#/, ''))
    ].filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates

    // Create blog post with enhanced SEO and quality fields
    const blogPost = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status: 'DRAFT',
        locale: job.locale,
        tags: allTags,
        generatedBy: 'crewai-4stage-enhanced',
        promptUsed: job.prompt,
        authorId: job.userId,
        
        // SEO Optimization Fields
        metaDescription: metadata.metaDescription || null,
        faqSchema: metadata.faqSchema || null,
        readingTime: metadata.readingTime || null,
        
        // AI Quality Management Fields
        seoScore: metadata.seoScore || 0,
        aiDetectionScore: metadata.aiDetectionScore || 0,
        qualityWarning: metadata.qualityWarning || false,
      },
    })

    const processingTime = Math.round((Date.now() - startTime) / 1000)

    // Update job as completed
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        currentStep: '완료',
        steps: {
          ...jobSteps,
          stages: steps,
          hashtags,
          seoKeywords: result.metadata?.seoKeywords || [],
          iterationsUsed: result.metadata?.iterationsUsed || 1,
          qualityWarning: result.metadata?.qualityWarning || false,
        },
        blogPostId: blogPost.id,
        processingTime,
        completedAt: new Date(),
      },
    })

    // Update API keys last used
    for (const record of apiKeyRecords) {
      await prisma.userApiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Mark current step as failed
    const inProgressIndex = steps.findIndex(s => s.status === 'in_progress')
    if (inProgressIndex >= 0) {
      steps[inProgressIndex].status = 'failed'
      steps[inProgressIndex].output = errorMessage
    }

    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
        currentStep: '오류 발생',
        steps: steps as unknown as any,
        completedAt: new Date(),
      },
    })

    throw error
  }
}
