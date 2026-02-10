/**
 * Naver Blog Scraper
 * 
 * Handles Naver blog's iframe-based structure using Puppeteer.
 * Falls back to Jina Reader if Puppeteer is not available.
 */

import { fetchWithJinaReader, type JinaReaderResult } from './jina-reader'
import { cleanBlogContent, extractMainContent } from './text-cleaner'

export interface NaverBlogScrapResult {
  success: boolean
  title?: string
  content?: string
  wordCount?: number
  url: string
  platform: 'naver'
  error?: string
  method: 'puppeteer' | 'jina' | 'api'
}

/**
 * Extract blog ID and log number from Naver blog URL
 */
export function parseNaverBlogUrl(url: string): { blogId: string; logNo: string } | null {
  // Format 1: https://blog.naver.com/blogId/logNo
  const format1 = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/)
  if (format1) {
    return { blogId: format1[1], logNo: format1[2] }
  }

  // Format 2: https://blog.naver.com/PostView.naver?blogId=xxx&logNo=xxx
  const blogIdMatch = url.match(/blogId=([^&]+)/)
  const logNoMatch = url.match(/logNo=(\d+)/)
  if (blogIdMatch && logNoMatch) {
    return { blogId: blogIdMatch[1], logNo: logNoMatch[1] }
  }

  // Format 3: Mobile - https://m.blog.naver.com/blogId/logNo
  const mobileFormat = url.match(/m\.blog\.naver\.com\/([^/]+)\/(\d+)/)
  if (mobileFormat) {
    return { blogId: mobileFormat[1], logNo: mobileFormat[2] }
  }

  return null
}

/**
 * Construct the PostView iframe URL for direct content access
 */
export function getNaverPostViewUrl(blogId: string, logNo: string): string {
  return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=true`
}

/**
 * Scrape Naver blog using Puppeteer
 * This handles the iframe structure properly
 */
async function scrapeWithPuppeteer(url: string): Promise<NaverBlogScrapResult> {
  try {
    // Dynamic import to avoid bundling Puppeteer when not needed
    const puppeteer = await import('puppeteer')

    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    })

    try {
      const page = await browser.newPage()

      // Set user agent to avoid bot detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // Navigate to the blog post
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait for content to load
      await page.waitForSelector('iframe#mainFrame', { timeout: 10000 }).catch(() => null)

      // Get all frames
      const frames = page.frames()

      // Find the content frame (usually mainFrame or postViewIframe)
      let contentFrame = frames.find(
        (f) =>
          f.url().includes('PostView') ||
          f.url().includes('postview') ||
          f.name() === 'mainFrame'
      )

      if (!contentFrame) {
        contentFrame = page.mainFrame()
      }

      // Extract title
      const title = await contentFrame
        .$eval('.se-title-text, .pcol1', (el: Element) => el.textContent?.trim())
        .catch(() => null)

      // Extract content from SE3 (Smart Editor 3) or SE2
      const content = await contentFrame
        .$eval('.se-main-container, .post-view, #postViewArea', (el: Element) => {
          // Remove unnecessary elements
          const clone = el.cloneNode(true) as HTMLElement
          clone.querySelectorAll('script, style, .btn_layer, .comment').forEach((e) => e.remove())
          return clone.textContent?.trim() || ''
        })
        .catch(() => null)

      if (!content) {
        throw new Error('Could not extract content from Naver blog')
      }

      // Clean and extract main content
      let cleanedContent = cleanBlogContent(content, 'naver')
      cleanedContent = extractMainContent(cleanedContent)

      if (!cleanedContent || cleanedContent.length < 100) {
        throw new Error('Insufficient content after cleaning')
      }

      const wordCount = cleanedContent.split(/\s+/).filter((w: string) => w.length > 0).length

      return {
        success: true,
        title: title || undefined,
        content: cleanedContent,
        wordCount,
        url,
        platform: 'naver',
        method: 'puppeteer',
      }
    } finally {
      await browser.close()
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        url,
        platform: 'naver',
        method: 'puppeteer',
        error: error.message,
      }
    }
    return {
      success: false,
      url,
      platform: 'naver',
      method: 'puppeteer',
      error: 'Unknown error during Puppeteer scraping',
    }
  }
}

/**
 * Main function to scrape Naver blog
 * Tries Puppeteer first, falls back to Jina Reader
 */
export async function scrapeNaverBlog(url: string): Promise<NaverBlogScrapResult> {
  // Validate it's a Naver blog URL
  const parsed = parseNaverBlogUrl(url)
  if (!parsed) {
    return {
      success: false,
      url,
      platform: 'naver',
      method: 'jina',
      error: 'Invalid Naver blog URL format',
    }
  }

  // Try Puppeteer first (better for iframe handling)
  const puppeteerResult = await scrapeWithPuppeteer(url)
  if (puppeteerResult.success) {
    return puppeteerResult
  }

  console.warn(`Puppeteer failed for ${url}: ${puppeteerResult.error}. Falling back to Jina Reader.`)

  // Fallback to Jina Reader
  const jinaResult: JinaReaderResult = await fetchWithJinaReader({ url })

  if (jinaResult.success && jinaResult.content) {
    // Clean Jina Reader content as well
    let cleanedContent = cleanBlogContent(jinaResult.content, 'naver')
    cleanedContent = extractMainContent(cleanedContent)

    const wordCount = cleanedContent.split(/\s+/).filter(w => w.length > 0).length

    return {
      success: true,
      title: jinaResult.title,
      content: cleanedContent,
      wordCount,
      url: jinaResult.url,
      platform: 'naver',
      method: 'jina',
    }
  }

  return {
    success: jinaResult.success,
    title: jinaResult.title,
    content: jinaResult.content,
    wordCount: jinaResult.wordCount,
    url: jinaResult.url,
    platform: 'naver',
    method: 'jina',
    error: jinaResult.error,
  }
}

/**
 * Check if a URL is a Naver blog URL
 */
export function isNaverBlogUrl(url: string): boolean {
  return /blog\.naver\.com|m\.blog\.naver\.com/.test(url)
}
