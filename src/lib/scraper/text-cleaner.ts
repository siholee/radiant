/**
 * Text Cleaner for Blog Content
 * 
 * Removes noise, ads, and irrelevant content from scraped blog posts.
 */

/**
 * Clean scraped blog content
 * Removes common noise patterns from Korean blog platforms
 */
export function cleanBlogContent(text: string, platform?: string): string {
  let cleaned = text

  // Remove multiple consecutive newlines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Remove excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ')

  // Platform-specific cleaning
  if (platform === 'naver') {
    cleaned = cleanNaverBlogContent(cleaned)
  }

  // Remove common ad patterns
  cleaned = removeAdPatterns(cleaned)

  // Remove social media sharing text
  cleaned = removeSocialMediaText(cleaned)

  // Remove navigation/menu text
  cleaned = removeNavigationText(cleaned)

  // Trim each line
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')

  // Final cleanup
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Naver blog-specific cleaning
 */
function cleanNaverBlogContent(text: string): string {
  let cleaned = text

  // Remove "이웃추가", "공감", "댓글" buttons
  cleaned = cleaned.replace(/이웃\s*추가/gi, '')
  cleaned = cleaned.replace(/공감\s*\d*/gi, '')
  cleaned = cleaned.replace(/댓글\s*\d*/gi, '')
  cleaned = cleaned.replace(/스크랩/gi, '')

  // Remove date patterns like "2024.01.01", "2024-01-01"
  // But keep them if they're part of meaningful content
  cleaned = cleaned.replace(/^[\d\.\-\/\s:]+$/gm, '')

  // Remove "전체보기", "목록", "이전글", "다음글"
  cleaned = cleaned.replace(/^(전체보기|목록|이전글|다음글|글쓰기|수정|삭제)$/gim, '')

  // Remove category breadcrumbs like "홈 > 카테고리 > 글"
  cleaned = cleaned.replace(/^(홈|Home)\s*[>›]\s*.+$/gim, '')

  // Remove "본문 바로가기", "메뉴 바로가기"
  cleaned = cleaned.replace(/^.*(바로가기|skip navigation).*$/gim, '')

  // Remove blog profile sections
  cleaned = cleaned.replace(/^닉네임.*$/gim, '')
  cleaned = cleaned.replace(/^블로그.*방문.*$/gim, '')

  // Remove "더보기", "펼치기"
  cleaned = cleaned.replace(/^(더보기|펼치기|접기)$/gim, '')

  // Remove copyright notices
  cleaned = cleaned.replace(/^©.*$/gim, '')
  cleaned = cleaned.replace(/^Copyright.*$/gim, '')

  return cleaned
}

/**
 * Remove common ad patterns
 */
function removeAdPatterns(text: string): string {
  let cleaned = text

  // Remove "광고", "AD", "Sponsored"
  cleaned = cleaned.replace(/^.*\[광고\].*$/gim, '')
  cleaned = cleaned.replace(/^.*\(광고\).*$/gim, '')
  cleaned = cleaned.replace(/^.*\[AD\].*$/gim, '')
  cleaned = cleaned.replace(/^.*Sponsored.*$/gim, '')

  // Remove affiliate disclaimers
  cleaned = cleaned.replace(/^.*제휴.*마케팅.*수수료.*$/gim, '')
  cleaned = cleaned.replace(/^.*파트너스.*활동.*일환.*$/gim, '')
  cleaned = cleaned.replace(/^.*쿠팡파트너스.*$/gim, '')

  return cleaned
}

/**
 * Remove social media sharing text
 */
function removeSocialMediaText(text: string): string {
  let cleaned = text

  // Remove "공유하기", "Share"
  cleaned = cleaned.replace(/^(공유하기|Share|공유|SNS 공유)$/gim, '')

  // Remove social media button text
  cleaned = cleaned.replace(/^(페이스북|트위터|카카오톡|카카오스토리|밴드|라인)$/gim, '')
  cleaned = cleaned.replace(/^(Facebook|Twitter|KakaoTalk|Line|Instagram)$/gim, '')

  // Remove "좋아요", "Like"
  cleaned = cleaned.replace(/^좋아요\s*\d*$/gim, '')
  cleaned = cleaned.replace(/^Like\s*\d*$/gim, '')

  return cleaned
}

/**
 * Remove navigation/menu text
 */
function removeNavigationText(text: string): string {
  let cleaned = text

  // Remove common navigation terms
  const navTerms = [
    '메뉴',
    '검색',
    '로그인',
    '로그아웃',
    '회원가입',
    '마이페이지',
    'Menu',
    'Search',
    'Login',
    'Logout',
    'Sign up',
    'My page',
  ]

  navTerms.forEach(term => {
    const regex = new RegExp(`^${term}$`, 'gim')
    cleaned = cleaned.replace(regex, '')
  })

  return cleaned
}

/**
 * Extract main content from text
 * Uses heuristics to identify and extract the main article content
 */
export function extractMainContent(text: string): string {
  const lines = text.split('\n').filter(line => line.trim().length > 0)

  if (lines.length === 0) return ''

  // Find the longest continuous block of text
  // This is likely the main content
  const blocks: string[][] = []
  let currentBlock: string[] = []

  for (const line of lines) {
    const wordCount = line.split(/\s+/).length

    // Lines with substantial content (more than 5 words) are likely main content
    if (wordCount > 5) {
      currentBlock.push(line)
    } else {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock)
        currentBlock = []
      }
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock)
  }

  // Find the block with the most total words
  let maxBlock = blocks[0] || []
  let maxWords = maxBlock.reduce((sum, line) => sum + line.split(/\s+/).length, 0)

  for (const block of blocks) {
    const wordCount = block.reduce((sum, line) => sum + line.split(/\s+/).length, 0)
    if (wordCount > maxWords) {
      maxWords = wordCount
      maxBlock = block
    }
  }

  return maxBlock.join('\n\n')
}

/**
 * Estimate token count (rough approximation)
 * For Korean text: ~1.5 characters per token
 * For English text: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  // Check if text is predominantly Korean
  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length
  const totalChars = text.length

  const isKorean = koreanChars / totalChars > 0.3

  if (isKorean) {
    return Math.ceil(totalChars / 1.5)
  } else {
    return Math.ceil(totalChars / 4)
  }
}

/**
 * Split text into chunks that fit within token limit
 * Tries to split at paragraph boundaries
 */
export function chunkText(text: string, maxTokens: number = 8000): string[] {
  const estimatedTokens = estimateTokenCount(text)

  // If text is within limit, return as single chunk
  if (estimatedTokens <= maxTokens) {
    return [text]
  }

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph)

    // If single paragraph exceeds limit, split by sentences
    if (paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
        currentTokens = 0
      }

      // Split large paragraph by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence)

        if (currentTokens + sentenceTokens > maxTokens) {
          if (currentChunk) {
            chunks.push(currentChunk.trim())
          }
          currentChunk = sentence
          currentTokens = sentenceTokens
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence
          currentTokens += sentenceTokens
        }
      }
    } else {
      // Check if adding this paragraph would exceed limit
      if (currentTokens + paragraphTokens > maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = paragraph
        currentTokens = paragraphTokens
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
        currentTokens += paragraphTokens
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 0)
}
