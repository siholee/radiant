/**
 * Blog Generation Service
 * 
 * Directly calls OpenAI API to generate blog content with step-by-step progress tracking.
 * This runs synchronously (not via BullMQ) for development simplicity.
 */

import OpenAI from 'openai'
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
  { id: 'research', name: '주제 조사', description: '주제에 대한 배경 정보를 조사합니다' },
  { id: 'outline', name: '개요 작성', description: '블로그 글의 구조를 설계합니다' },
  { id: 'content', name: '본문 작성', description: '각 섹션별 상세 내용을 작성합니다' },
  { id: 'polish', name: '다듬기', description: '문체와 흐름을 다듬습니다' },
  { id: 'finalize', name: '완료', description: '최종 검토 및 저장' },
]

async function updateJobProgress(
  jobId: string,
  progress: number,
  currentStep: string,
  steps: GenerationStep[]
) {
  await prisma.blogGenerationJob.update({
    where: { id: jobId },
    data: {
      progress,
      currentStep,
      steps: steps as unknown as any,
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
  }))

  try {
    // Get user's API key
    const apiKeyRecord = await prisma.userApiKey.findFirst({
      where: {
        userId: job.userId,
        provider: job.aiProvider || 'OPENAI',
        status: 'ACTIVE',
      },
    })

    if (!apiKeyRecord) {
      throw new Error('No active API key found')
    }

    const apiKey = decryptApiKey(apiKeyRecord.encryptedKey)
    
    const openai = new OpenAI({ apiKey })
    const model = job.aiModel || 'gpt-4o-mini'

    // Update to PROCESSING
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    // Step 1: Research
    steps[0].status = 'in_progress'
    steps[0].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 10, '주제 조사 중...', steps)

    const researchResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '당신은 블로그 콘텐츠 전문가입니다. 주어진 주제에 대해 핵심 포인트, 관련 사실, 독자에게 유용한 정보를 간략히 정리해주세요.',
        },
        {
          role: 'user',
          content: `다음 주제에 대한 블로그 글을 위한 조사를 해주세요:\n\n${job.prompt}`,
        },
      ],
      max_tokens: 1000,
    })

    const research = researchResponse.choices[0]?.message?.content || ''
    steps[0].status = 'completed'
    steps[0].completedAt = new Date().toISOString()
    steps[0].output = research.substring(0, 200) + '...'
    await updateJobProgress(jobId, 25, '개요 작성 중...', steps)

    // Step 2: Outline
    steps[1].status = 'in_progress'
    steps[1].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 30, '개요 작성 중...', steps)

    const outlineResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '당신은 블로그 구조 전문가입니다. 조사 내용을 바탕으로 논리적인 블로그 글 개요를 작성해주세요. 제목과 각 섹션의 소제목을 포함해주세요.',
        },
        {
          role: 'user',
          content: `조사 내용:\n${research}\n\n원래 주제:\n${job.prompt}\n\n블로그 개요를 작성해주세요.`,
        },
      ],
      max_tokens: 800,
    })

    const outline = outlineResponse.choices[0]?.message?.content || ''
    steps[1].status = 'completed'
    steps[1].completedAt = new Date().toISOString()
    steps[1].output = outline.substring(0, 200) + '...'
    await updateJobProgress(jobId, 45, '본문 작성 중...', steps)

    // Step 3: Content Generation
    steps[2].status = 'in_progress'
    steps[2].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 50, '본문 작성 중...', steps)

    const contentResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `당신은 전문 블로그 작가입니다. 주어진 개요를 바탕으로 완성된 블로그 글을 작성해주세요.
          
요구사항:
- 자연스럽고 읽기 쉬운 문체
- 각 섹션은 충분한 내용을 담을 것
- 실용적인 정보와 인사이트 포함
- 마크다운 형식으로 작성`,
        },
        {
          role: 'user',
          content: `개요:\n${outline}\n\n조사 내용:\n${research}\n\n위 개요와 조사를 바탕으로 전체 블로그 글을 작성해주세요.`,
        },
      ],
      max_tokens: 3000,
    })

    let content = contentResponse.choices[0]?.message?.content || ''
    steps[2].status = 'completed'
    steps[2].completedAt = new Date().toISOString()
    steps[2].output = '본문 작성 완료'
    await updateJobProgress(jobId, 70, '다듬기 중...', steps)

    // Step 4: Polish
    steps[3].status = 'in_progress'
    steps[3].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 75, '다듬기 중...', steps)

    const polishResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '당신은 편집자입니다. 블로그 글을 검토하고 문법, 흐름, 가독성을 개선해주세요. 개선된 전체 글을 반환해주세요.',
        },
        {
          role: 'user',
          content: content,
        },
      ],
      max_tokens: 3500,
    })

    content = polishResponse.choices[0]?.message?.content || content
    steps[3].status = 'completed'
    steps[3].completedAt = new Date().toISOString()
    steps[3].output = '문체 및 흐름 개선 완료'
    await updateJobProgress(jobId, 90, '저장 중...', steps)

    // Step 5: Finalize - Extract title and create blog post
    steps[4].status = 'in_progress'
    steps[4].startedAt = new Date().toISOString()
    await updateJobProgress(jobId, 95, '저장 중...', steps)

    // Extract title from content (first # heading) or generate one
    let title = job.title
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1]
    }
    if (!title) {
      title = job.prompt.substring(0, 50)
    }

    // Generate excerpt
    const excerptMatch = content.match(/^(?!#)(.{100,300})/m)
    const excerpt = excerptMatch ? excerptMatch[1].trim() : content.substring(0, 200)

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now()}`

    // Create blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status: 'DRAFT',
        locale: job.locale,
        tags: job.tags,
        generatedBy: 'openai',
        promptUsed: job.prompt,
        authorId: job.userId,
      },
    })

    const processingTime = Math.round((Date.now() - startTime) / 1000)

    steps[4].status = 'completed'
    steps[4].completedAt = new Date().toISOString()
    steps[4].output = `블로그 포스트 생성 완료: ${title}`

    // Update job as completed
    await prisma.blogGenerationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        currentStep: '완료',
        steps: steps as unknown as any,
        blogPostId: blogPost.id,
        processingTime,
        completedAt: new Date(),
      },
    })

    // Update API key last used
    await prisma.userApiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })

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
