import { getMockImageUrl, getPostsForFeed } from '@/lib/mock-blog-data'
import { locales } from '@/lib/i18n'
import { Feed } from 'feed'
import assert from 'node:assert'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function GET() {
  // Use environment variable or default to localhost for static export
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siholee.github.io/radient'

  let feed = new Feed({
    title: 'The Radiant Blog',
    description:
      'Stay informed with product updates, company news, and insights on how to sell smarter at your company.',
    author: {
      name: 'Michael Foster',
      email: 'michael.foster@example.com',
    },
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/favicon.ico`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    feedLinks: {
      rss2: `${siteUrl}/feed.xml`,
    },
  })

  let { data: posts } = await getPostsForFeed()

  posts.forEach((post) => {
    try {
      assert(typeof post.title === 'string')
      assert(typeof post.slug === 'string')
      assert(typeof post.excerpt === 'string')
      assert(typeof post.publishedAt === 'string')
    } catch (error) {
      console.log('Post is missing required fields for RSS feed:', post, error)
      return
    }

    feed.addItem({
      title: post.title,
      id: post.slug,
      link: `${siteUrl}/blog/${post.slug}`,
      content: post.excerpt,
      image: post.mainImage
        ? getMockImageUrl(post.mainImage, 1200, 800).replaceAll('&', '&amp;')
        : undefined,
      author: post.author?.name ? [{ name: post.author.name }] : [],
      contributor: post.author?.name ? [{ name: post.author.name }] : [],
      date: new Date(post.publishedAt),
    })
  })

  return new Response(feed.rss2(), {
    status: 200,
    headers: {
      'content-type': 'application/xml',
      'cache-control': 's-maxage=31556952',
    },
  })
}
