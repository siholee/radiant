/**
 * Text Quality Validation Library
 * 
 * Validates writing samples for language detection, quality scoring,
 * and AI API compatibility.
 */

import { franc } from 'franc'
import { z } from 'zod'

// ==========================================
// Types
// ==========================================

export type SupportedLanguage = 'ko' | 'en' | 'unknown'

export interface QualityCheckResult {
  isValid: boolean
  score: number // 0-100
  issues: string[] // Critical issues (blocks processing)
  warnings: string[] // Non-critical warnings
  detectedLanguage: SupportedLanguage
}

export interface EmbeddingCompatibilityResult {
  isCompatible: boolean
  reason?: string
  estimatedTokens: number
}

export interface ValidationResult {
  success: boolean
  data?: {
    content: string
    title?: string
    language: SupportedLanguage
    wordCount: number
    qualityScore: number
    validationIssues: {
      issues: string[]
      warnings: string[]
    }
  }
  error?: string
}

// ==========================================
// Constants
// ==========================================

const MIN_CONTENT_LENGTH = 100
const MAX_CONTENT_LENGTH = 500000 // 500KB of text (~50MB file with encoding)
const MAX_TOKENS_FOR_EMBEDDING = 8191 // OpenAI text-embedding-ada-002 limit
const MIN_SENTENCES = 3
const MAX_SPECIAL_CHAR_RATIO = 0.2
const MAX_WHITESPACE_RATIO = 0.4
const MAX_CODE_BLOCKS = 5
const MAX_EMOJIS = 20
const SIMILARITY_THRESHOLD = 0.95 // For duplicate detection

// ==========================================
// Language Detection
// ==========================================

/**
 * Detect the language of the text using franc
 * Returns 'ko', 'en', or 'unknown'
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (text.length < 50) {
    // Too short for accurate detection, use character analysis
    return detectLanguageByCharacters(text)
  }

  const detected = franc(text, { minLength: 50 })

  // franc returns ISO 639-3 codes
  if (detected === 'kor') return 'ko'
  if (detected === 'eng') return 'en'

  // Fallback to character-based detection
  return detectLanguageByCharacters(text)
}

/**
 * Detect language by analyzing character composition
 * Used as fallback for short texts
 */
function detectLanguageByCharacters(text: string): SupportedLanguage {
  // Korean character ranges: Hangul Syllables, Hangul Jamo, Hangul Compatibility Jamo
  const koreanChars = text.match(/[\u3131-\u3163\uAC00-\uD7A3\u1100-\u11FF]/g) || []
  const koreanRatio = koreanChars.length / Math.max(text.length, 1)

  // English/Latin characters
  const englishChars = text.match(/[a-zA-Z]/g) || []
  const englishRatio = englishChars.length / Math.max(text.length, 1)

  if (koreanRatio > 0.2) return 'ko'
  if (englishRatio > 0.3) return 'en'

  return 'unknown'
}

// ==========================================
// Quality Validation
// ==========================================

/**
 * Validate sample quality and return detailed results
 */
export function validateSampleQuality(content: string): QualityCheckResult {
  const issues: string[] = []
  const warnings: string[] = []
  let score = 100

  // 1. Length validation
  if (content.length < MIN_CONTENT_LENGTH) {
    issues.push(`텍스트가 너무 짧습니다 (최소 ${MIN_CONTENT_LENGTH}자, 현재 ${content.length}자)`)
    score -= 50
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    issues.push(`텍스트가 너무 깁니다 (최대 ${MAX_CONTENT_LENGTH.toLocaleString()}자)`)
    score -= 30
  }

  // 2. Language detection
  const detectedLanguage = detectLanguage(content)
  if (detectedLanguage === 'unknown') {
    issues.push('지원하지 않는 언어입니다 (한국어 또는 영어만 지원)')
    score -= 40
  }

  // 3. Sentence count (minimum substantive content)
  const sentences = content.split(/[.!?。？！]+/).filter(s => s.trim().length > 10)
  if (sentences.length < MIN_SENTENCES) {
    warnings.push(`문장이 너무 적습니다 (권장: ${MIN_SENTENCES}문장 이상, 현재 ${sentences.length}문장)`)
    score -= 10
  }

  // 4. Special character ratio
  const specialChars = content.match(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/g) || []
  const specialRatio = specialChars.length / Math.max(content.length, 1)
  if (specialRatio > MAX_SPECIAL_CHAR_RATIO) {
    warnings.push(`특수문자 비율이 높습니다 (${(specialRatio * 100).toFixed(1)}%, 권장: ${MAX_SPECIAL_CHAR_RATIO * 100}% 이하)`)
    score -= 15
  }

  // 5. Whitespace ratio
  const whitespaceChars = content.match(/\s/g) || []
  const whitespaceRatio = whitespaceChars.length / Math.max(content.length, 1)
  if (whitespaceRatio > MAX_WHITESPACE_RATIO) {
    warnings.push(`공백이 너무 많습니다 (${(whitespaceRatio * 100).toFixed(1)}%)`)
    score -= 10
  }

  // 6. Code blocks detection (may affect embedding quality)
  const codeBlocks = content.match(/```[\s\S]*?```/g) || []
  if (codeBlocks.length > MAX_CODE_BLOCKS) {
    warnings.push(`코드 블록이 많습니다 (${codeBlocks.length}개). 문체 학습 품질이 낮아질 수 있습니다.`)
    score -= 10
  }

  // 7. Emoji detection
  const emojis = content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []
  if (emojis.length > MAX_EMOJIS) {
    warnings.push(`이모지가 많습니다 (${emojis.length}개)`)
    score -= 5
  }

  // 8. Repeated pattern detection (spam/template content)
  const repeatedPattern = /(.{15,})\1{2,}/
  if (repeatedPattern.test(content)) {
    warnings.push('반복되는 패턴이 감지되었습니다')
    score -= 15
  }

  // 9. URL density (too many links may indicate non-prose content)
  const urls = content.match(/https?:\/\/[^\s]+/g) || []
  const urlRatio = urls.length / Math.max(sentences.length, 1)
  if (urlRatio > 0.5) {
    warnings.push('URL이 많습니다. 본문 중심의 콘텐츠를 권장합니다.')
    score -= 5
  }

  return {
    isValid: issues.length === 0 && score >= 50,
    score: Math.max(0, Math.min(100, score)),
    issues,
    warnings,
    detectedLanguage,
  }
}

// ==========================================
// AI API Compatibility
// ==========================================

/**
 * Estimate token count for OpenAI embedding API
 * Korean: ~1.5 tokens per character
 * English: ~1.3 tokens per word (or ~0.25 tokens per character)
 */
function estimateTokenCount(content: string, language: SupportedLanguage): number {
  if (language === 'ko') {
    // Korean text: approximately 1.5 tokens per character
    return Math.ceil(content.length * 1.5)
  } else {
    // English text: approximately 1.3 tokens per word
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
    return Math.ceil(wordCount * 1.3)
  }
}

/**
 * Validate content compatibility with embedding API
 */
export function validateForEmbedding(
  content: string,
  language: SupportedLanguage = 'ko'
): EmbeddingCompatibilityResult {
  const estimatedTokens = estimateTokenCount(content, language)

  // Token limit check
  if (estimatedTokens > MAX_TOKENS_FOR_EMBEDDING) {
    return {
      isCompatible: false,
      reason: `텍스트가 임베딩 API 제한을 초과합니다 (예상: ${estimatedTokens.toLocaleString()} 토큰, 최대: ${MAX_TOKENS_FOR_EMBEDDING.toLocaleString()})`,
      estimatedTokens,
    }
  }

  // NULL byte check (causes API errors)
  if (content.includes('\0')) {
    return {
      isCompatible: false,
      reason: 'NULL 바이트가 포함되어 있습니다. 파일을 다시 확인해주세요.',
      estimatedTokens,
    }
  }

  // Control characters check (except common ones like newline, tab)
  const controlCharsPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
  const controlChars = content.match(controlCharsPattern) || []
  if (controlChars.length > 0) {
    return {
      isCompatible: false,
      reason: '유효하지 않은 제어 문자가 포함되어 있습니다.',
      estimatedTokens,
    }
  }

  return {
    isCompatible: true,
    estimatedTokens,
  }
}

// ==========================================
// Zod Schema
// ==========================================

/**
 * Zod schema for writing sample validation
 */
export const writingSampleSchema = z.object({
  content: z
    .string()
    .min(MIN_CONTENT_LENGTH, `최소 ${MIN_CONTENT_LENGTH}자 이상 필요합니다`)
    .max(MAX_CONTENT_LENGTH, `최대 ${MAX_CONTENT_LENGTH.toLocaleString()}자까지 가능합니다`),
  title: z.string().max(200, '제목은 최대 200자까지 가능합니다').optional(),
  sourceUrl: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  language: z.enum(['ko', 'en']).optional(),
})

export type WritingSampleInput = z.infer<typeof writingSampleSchema>

// ==========================================
// Comprehensive Validation
// ==========================================

/**
 * Perform comprehensive validation on a writing sample
 * Returns validation result with all checks combined
 */
export function validateWritingSample(input: {
  content: string
  title?: string
  sourceUrl?: string
}): ValidationResult {
  // 1. Schema validation
  const schemaResult = writingSampleSchema.safeParse(input)
  if (!schemaResult.success) {
    const firstError = schemaResult.error.issues[0]
    return {
      success: false,
      error: firstError?.message || '입력값이 올바르지 않습니다',
    }
  }

  const { content, title } = schemaResult.data

  // 2. Quality validation
  const qualityResult = validateSampleQuality(content)
  if (!qualityResult.isValid) {
    return {
      success: false,
      error: qualityResult.issues[0] || '품질 검증에 실패했습니다',
    }
  }

  // 3. Embedding compatibility
  const embeddingResult = validateForEmbedding(content, qualityResult.detectedLanguage)
  if (!embeddingResult.isCompatible) {
    return {
      success: false,
      error: embeddingResult.reason,
    }
  }

  // 4. Calculate word count
  const wordCount =
    qualityResult.detectedLanguage === 'ko'
      ? content.replace(/\s+/g, '').length // Korean: character count
      : content.split(/\s+/).filter(w => w.length > 0).length // English: word count

  return {
    success: true,
    data: {
      content,
      title,
      language: qualityResult.detectedLanguage,
      wordCount,
      qualityScore: qualityResult.score,
      validationIssues: {
        issues: qualityResult.issues,
        warnings: qualityResult.warnings,
      },
    },
  }
}

// ==========================================
// Exports
// ==========================================

export {
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS_FOR_EMBEDDING,
  SIMILARITY_THRESHOLD,
}
