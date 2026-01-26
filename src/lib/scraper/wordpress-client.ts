/**
 * WordPress REST API Client
 * 
 * Fetches content from WordPress sites using the built-in REST API.
 * Works with self-hosted WordPress and WordPress.com sites.
 */

export interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  date: string
  modified: string
  link: string
  slug: string
  author: number
  categories: number[]
  tags: number[]
}

export interface WordPressScrapResult {
  success: boolean
  title?: string
  content?: string
  excerpt?: string
  wordCount?: number
  url: string
  platform: 'wordpress'
  publishedAt?: string
  error?: string
}

/**
 * Extract the base URL and post identifier from a WordPress URL
 */
export function parseWordPressUrl(url: string): {
  baseUrl: string
  slug?: string
  postId?: number
} | null {
  try {
    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`

    // Format 1: /yyyy/mm/dd/slug or /slug
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    const slug = pathParts[pathParts.length - 1]

    // Format 2: ?p=123
    const postIdMatch = urlObj.search.match(/[?&]p=(\d+)/)
    if (postIdMatch) {
      return { baseUrl, postId: parseInt(postIdMatch[1], 10) }
    }

    if (slug && slug !== 'page' && !/^\d+$/.test(slug)) {
      return { baseUrl, slug }
    }

    return { baseUrl }
  } catch {
    return null
  }
}

/**
 * Check if a site has WordPress REST API enabled
 */
export async function isWordPressSite(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Fetch a single post by slug or ID
 */
async function fetchPost(baseUrl: string, identifier: { slug?: string; postId?: number }): Promise<WordPressPost | null> {
  let endpoint: string

  if (identifier.postId) {
    endpoint = `${baseUrl}/wp-json/wp/v2/posts/${identifier.postId}`
  } else if (identifier.slug) {
    endpoint = `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(identifier.slug)}`
  } else {
    return null
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    // If fetching by slug, the result is an array
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : null
    }

    return data
  } catch {
    return null
  }
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
  }

  for (const [entity, char] of Object.entries(entities)) {
    text = text.replaceAll(entity, char)
  }

  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Scrape a WordPress blog post
 */
export async function scrapeWordPress(url: string): Promise<WordPressScrapResult> {
  const parsed = parseWordPressUrl(url)

  if (!parsed) {
    return {
      success: false,
      url,
      platform: 'wordpress',
      error: 'Invalid WordPress URL format',
    }
  }

  // Check if REST API is available
  const hasApi = await isWordPressSite(parsed.baseUrl)
  if (!hasApi) {
    return {
      success: false,
      url,
      platform: 'wordpress',
      error: 'WordPress REST API not available on this site',
    }
  }

  // Fetch the post
  const post = await fetchPost(parsed.baseUrl, {
    slug: parsed.slug,
    postId: parsed.postId,
  })

  if (!post) {
    return {
      success: false,
      url,
      platform: 'wordpress',
      error: 'Post not found',
    }
  }

  const title = stripHtml(post.title.rendered)
  const content = stripHtml(post.content.rendered)
  const excerpt = stripHtml(post.excerpt.rendered)
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length

  return {
    success: true,
    title,
    content,
    excerpt,
    wordCount,
    url,
    platform: 'wordpress',
    publishedAt: post.date,
  }
}

/**
 * Fetch multiple posts from a WordPress site
 */
export async function fetchWordPressPosts(
  baseUrl: string,
  options?: {
    perPage?: number
    page?: number
    author?: number
    categories?: number[]
  }
): Promise<WordPressPost[]> {
  const params = new URLSearchParams()
  params.set('per_page', String(options?.perPage || 10))
  params.set('page', String(options?.page || 1))

  if (options?.author) {
    params.set('author', String(options.author))
  }

  if (options?.categories?.length) {
    params.set('categories', options.categories.join(','))
  }

  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return []
    }

    return await response.json()
  } catch {
    return []
  }
}

/**
 * Check if a URL is likely a WordPress site
 */
export function isLikelyWordPress(url: string): boolean {
  // Common WordPress indicators in URL
  const wpIndicators = [
    '/wp-content/',
    '/wp-includes/',
    '/wp-admin/',
    'wordpress.com',
    '/wp/',
  ]

  return wpIndicators.some((indicator) => url.includes(indicator))
}
