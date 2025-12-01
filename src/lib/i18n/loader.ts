import type { Locale } from './config'

export type TranslationPage = 'common' | 'home' | 'marketing' | 'company' | 'blog' | 'login'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Translations = Record<string, any>

const translationCache = new Map<string, Translations>()

export async function loadTranslations(
  locale: Locale,
  page: TranslationPage
): Promise<Translations> {
  const cacheKey = `${locale}-${page}`
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!
  }

  try {
    const translations = await import(`../../locales/${locale}/${page}.json`)
    const data = translations.default || translations
    translationCache.set(cacheKey, data)
    return data
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to load translations for ${locale}/${page}:`, error)
    }
    return {}
  }
}

export async function loadPageTranslations(
  locale: Locale,
  page: TranslationPage
): Promise<Translations> {
  // Load common translations + page-specific translations
  const [common, pageTranslations] = await Promise.all([
    loadTranslations(locale, 'common'),
    page !== 'common' ? loadTranslations(locale, page) : Promise.resolve({}),
  ])

  return {
    ...common,
    ...pageTranslations,
  }
}

export function clearTranslationCache() {
  translationCache.clear()
}
