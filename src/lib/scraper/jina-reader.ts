/**
 * Jina Reader API Client
 * 
 * Free web scraping service that converts any URL to clean markdown.
 * Rate limit: 200 requests/minute on free tier
 * 
 * @see https://r.jina.ai
 */

export interface JinaReaderOptions {
  /** Target URL to scrape */
  url: string
  /** Optional API key for higher rate limits */
  apiKey?: string
  /** Request timeout in milliseconds */
  timeout?: number
}

export interface JinaReaderResult {
  success: boolean
  title?: string
  content?: string
  wordCount?: number
  url: string
  error?: string
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const JINA_BASE_URL = process.env.JINA_READER_BASE_URL || 'https://r.jina.ai'

/**
 * Fetch clean content from a URL using Jina Reader API
 */
export async function fetchWithJinaReader(options: JinaReaderOptions): Promise<JinaReaderResult> {
  const { url, apiKey, timeout = DEFAULT_TIMEOUT } = options

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const headers: Record<string, string> = {
      Accept: 'text/plain',
    }

    // Add API key if provided (for higher rate limits)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(`${JINA_BASE_URL}/${url}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        success: false,
        url,
        error: `Jina Reader returned status ${response.status}: ${response.statusText}`,
      }
    }

    const content = await response.text()

    // Extract title from markdown (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : undefined

    // Count words
    const wordCount = content
      .replace(/[#*_`\[\]()]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0).length

    return {
      success: true,
      title,
      content,
      wordCount,
      url,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          url,
          error: 'Request timeout',
        }
      }
      return {
        success: false,
        url,
        error: error.message,
      }
    }
    return {
      success: false,
      url,
      error: 'Unknown error occurred',
    }
  }
}

/**
 * Batch fetch multiple URLs
 */
export async function batchFetchWithJinaReader(
  urls: string[],
  options?: { apiKey?: string; concurrency?: number }
): Promise<JinaReaderResult[]> {
  const { apiKey, concurrency = 5 } = options || {}

  const results: JinaReaderResult[] = []

  // Process in batches to respect rate limits
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((url) => fetchWithJinaReader({ url, apiKey }))
    )
    results.push(...batchResults)

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}
