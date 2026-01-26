/**
 * Unified Scraper Service
 * 
 * Automatically detects the platform and uses the appropriate scraper.
 * Supports: Naver Blog, WordPress, and generic websites (via Jina Reader)
 */

import { fetchWithJinaReader, type JinaReaderResult } from './jina-reader'
import { isNaverBlogUrl, scrapeNaverBlog, type NaverBlogScrapResult } from './naver-scraper'
import { isLikelyWordPress, scrapeWordPress, type WordPressScrapResult } from './wordpress-client'

export type ScrapePlatform = 'naver' | 'wordpress' | 'generic'

export interface UnifiedScrapeResult {
  success: boolean
  title?: string
  content?: string
  excerpt?: string
  wordCount?: number
  url: string
  platform: ScrapePlatform
  publishedAt?: string
  error?: string
  scrapedAt: string
}

/**
 * Detect the platform from a URL
 */
export function detectPlatform(url: string): ScrapePlatform {
  if (isNaverBlogUrl(url)) {
    return 'naver'
  }

  if (isLikelyWordPress(url)) {
    return 'wordpress'
  }

  return 'generic'
}

/**
 * Scrape content from any supported URL
 */
export async function scrapeUrl(url: string): Promise<UnifiedScrapeResult> {
  const platform = detectPlatform(url)
  const scrapedAt = new Date().toISOString()

  try {
    switch (platform) {
      case 'naver': {
        const result: NaverBlogScrapResult = await scrapeNaverBlog(url)
        return {
          success: result.success,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          url: result.url,
          platform: 'naver',
          error: result.error,
          scrapedAt,
        }
      }

      case 'wordpress': {
        const result: WordPressScrapResult = await scrapeWordPress(url)
        
        // If WordPress API fails, try Jina Reader as fallback
        if (!result.success) {
          const jinaResult = await fetchWithJinaReader({ url })
          return {
            success: jinaResult.success,
            title: jinaResult.title,
            content: jinaResult.content,
            wordCount: jinaResult.wordCount,
            url: jinaResult.url,
            platform: 'wordpress',
            error: jinaResult.error,
            scrapedAt,
          }
        }
        
        return {
          success: result.success,
          title: result.title,
          content: result.content,
          excerpt: result.excerpt,
          wordCount: result.wordCount,
          url: result.url,
          platform: 'wordpress',
          publishedAt: result.publishedAt,
          error: result.error,
          scrapedAt,
        }
      }

      case 'generic':
      default: {
        const result: JinaReaderResult = await fetchWithJinaReader({ url })
        return {
          success: result.success,
          title: result.title,
          content: result.content,
          wordCount: result.wordCount,
          url: result.url,
          platform: 'generic',
          error: result.error,
          scrapedAt,
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      url,
      platform,
      error: error instanceof Error ? error.message : 'Unknown scraping error',
      scrapedAt,
    }
  }
}

/**
 * Batch scrape multiple URLs
 */
export async function batchScrapeUrls(
  urls: string[],
  options?: { concurrency?: number }
): Promise<UnifiedScrapeResult[]> {
  const { concurrency = 3 } = options || {}
  const results: UnifiedScrapeResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((url) => scrapeUrl(url)))
    results.push(...batchResults)

    // Rate limiting delay between batches
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Validate if a URL is scrapeable
 */
export function isScrapableUrl(url: string): { valid: boolean; platform: ScrapePlatform; reason?: string } {
  try {
    const urlObj = new URL(url)

    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, platform: 'generic', reason: 'Only HTTP and HTTPS URLs are supported' }
    }

    // Block known problematic domains
    const blockedDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
    ]

    if (blockedDomains.some((domain) => urlObj.hostname.includes(domain))) {
      return { valid: false, platform: 'generic', reason: 'Local URLs are not allowed' }
    }

    const platform = detectPlatform(url)
    return { valid: true, platform }
  } catch {
    return { valid: false, platform: 'generic', reason: 'Invalid URL format' }
  }
}

// Re-export types and utilities
export type { JinaReaderResult } from './jina-reader'
export type { NaverBlogScrapResult } from './naver-scraper'
export type { WordPressScrapResult, WordPressPost } from './wordpress-client'
export { parseNaverBlogUrl } from './naver-scraper'
export { parseWordPressUrl, fetchWordPressPosts } from './wordpress-client'
