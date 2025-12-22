import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)

interface GenerateRequest {
  prompt: string
  title?: string
  locale?: string
  tags?: string[]
}

export async function POST(request: Request) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { prompt, title, locale = 'ko', tags = [] } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Python script path from environment variable
    const pythonScriptPath =
      process.env.PYTHON_CREWAI_SCRIPT_PATH || '/app/python/crewai/blog_generator.py'

    // Prepare input for Python script
    const input = JSON.stringify({
      prompt,
      title,
      locale,
      tags,
    })

    // Execute Python script
    // Expected format: python3 script.py '{"prompt": "..."}'
    const command = `python3 ${pythonScriptPath} '${input.replace(/'/g, "\\'")}'`

    console.log('Executing CrewAI script:', command)

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
      timeout: 300000, // 5 minutes timeout
    })

    if (stderr) {
      console.error('Python script stderr:', stderr)
    }

    // Parse Python script output (expected to be JSON)
    let result
    try {
      result = JSON.parse(stdout)
    } catch {
      console.error('Failed to parse Python output:', stdout)
      return NextResponse.json(
        { error: 'Invalid response from AI generator', details: stdout },
        { status: 500 }
      )
    }

    // Create blog post from AI-generated content
    const slug = result.title
      ? result.title
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-|-$/g, '')
      : `ai-generated-${Date.now()}`

    const blogPost = await prisma.blogPost.create({
      data: {
        title: result.title || title || 'AI Generated Post',
        slug,
        content: result.content || '',
        excerpt: result.excerpt || null,
        locale,
        tags,
        status: 'DRAFT',
        generatedBy: 'crewai',
        promptUsed: prompt,
        authorId: userId,
      },
    })

    return NextResponse.json({
      success: true,
      blogPost: {
        id: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        content: blogPost.content,
        excerpt: blogPost.excerpt,
        status: blogPost.status,
      },
      aiOutput: result,
    })
  } catch (err) {
    const error = err as Error
    console.error('CrewAI generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate blog post',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
