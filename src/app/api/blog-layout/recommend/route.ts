/**
 * AI Layout Recommendation (BETA)
 * 
 * Uses OpenAI to recommend the best layout template for a given topic.
 * Consumes additional API tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto/encryption'

/**
 * POST /api/blog-layout/recommend
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { topic, keywords, tone } = await request.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: '주제를 입력하세요' }, { status: 400 })
    }

    // Get user's OpenAI API key
    const apiKeyRecord = await prisma.userApiKey.findFirst({
      where: { userId, provider: 'OPENAI', status: 'ACTIVE' },
    })

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 필요합니다. 설정에서 추가하세요.' },
        { status: 400 },
      )
    }

    const apiKey = decryptApiKey(apiKeyRecord.encryptedKey)

    // Get all available templates for this user
    const templates = await prisma.blogLayoutTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { userId },
          { isSystem: true },
          { isPublic: true },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        promptInstruction: true,
        usageCount: true,
      },
      orderBy: { usageCount: 'desc' },
    })

    if (templates.length === 0) {
      return NextResponse.json({ error: '사용 가능한 레이아웃이 없습니다.' }, { status: 400 })
    }

    // Build template descriptions for the AI
    const templateDescriptions = templates.map((t, i) =>
      `${i + 1}. "${t.name}" - ${t.description || '설명 없음'} (사용 ${t.usageCount}회)\n   구조: ${t.promptInstruction.substring(0, 150)}...`
    ).join('\n\n')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 블로그 작성 전문가입니다. 주어진 주제, 키워드, 톤에 가장 적합한 블로그 레이아웃을 추천하세요.
반드시 다음 JSON 형식으로만 응답하세요:
{"index": 번호, "reason": "추천 이유 (한국어, 1-2문장)"}`,
          },
          {
            role: 'user',
            content: `주제: ${topic}
키워드: ${keywords || '없음'}
톤: ${tone || 'professional'}

사용 가능한 레이아웃:
${templateDescriptions}

위 레이아웃 중 가장 적합한 것의 번호와 이유를 JSON으로 반환하세요.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error('OpenAI API call failed')
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim() || ''

    try {
      // Parse JSON from AI response (handle markdown code block wrapping)
      const jsonStr = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const recommendation = JSON.parse(jsonStr)
      const idx = (recommendation.index || 1) - 1
      const clampedIdx = Math.max(0, Math.min(idx, templates.length - 1))
      const recommended = templates[clampedIdx]

      return NextResponse.json({
        recommended: {
          id: recommended.id,
          name: recommended.name,
          description: recommended.description,
          reason: recommendation.reason || `"${topic}" 주제에 적합한 레이아웃입니다.`,
        },
      })
    } catch {
      // Fallback: recommend first template
      return NextResponse.json({
        recommended: {
          id: templates[0].id,
          name: templates[0].name,
          description: templates[0].description,
          reason: '기본 레이아웃을 추천합니다.',
        },
      })
    }
  } catch (error: any) {
    console.error('Failed to recommend layout:', error)
    return NextResponse.json(
      { error: error.message || 'AI 추천에 실패했습니다.' },
      { status: 500 },
    )
  }
}
