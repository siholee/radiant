import { locales } from '@/lib/i18n'
import type { MetadataRoute } from 'next'

export const dynamic = 'error'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://radiant.com' // 실제 도메인으로 변경 필요

  const routes = [
    '',
    '/company',
    '/marketing',
    '/blog',
    '/login',
  ]

  const sitemap: MetadataRoute.Sitemap = []

  locales.forEach((locale) => {
    routes.forEach((route) => {
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/blog' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      })
    })
  })

  return sitemap
}
