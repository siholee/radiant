import type { MetadataRoute } from 'next'

export const dynamic = 'error'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [],
    },
    sitemap: 'https://radiant.com/sitemap.xml', // 실제 도메인으로 변경 필요
  }
}
