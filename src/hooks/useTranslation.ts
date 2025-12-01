'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import {
  loadPageTranslations,
  getNestedTranslation,
  getFallbackTranslation,
  fallbackLocale,
  type TranslationPage,
  type Translations,
} from '@/lib/i18n'

export function useTranslation(page: TranslationPage) {
  const { locale } = useLocale()
  const [translations, setTranslations] = useState<Translations>({})
  const [fallbackTranslations, setFallbackTranslations] = useState<Translations>({})

  useEffect(() => {
    const loadTranslationsAsync = async () => {
      const [pageTranslations, fallback] = await Promise.all([
        loadPageTranslations(locale, page),
        locale !== fallbackLocale
          ? loadPageTranslations(fallbackLocale, page)
          : Promise.resolve({}),
      ])

      setTranslations(pageTranslations)
      setFallbackTranslations(fallback)
    }

    loadTranslationsAsync()
  }, [locale, page])

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const translation = getNestedTranslation(translations, key, variables)

    // If translation is the key itself (not found) and we have fallback
    if (translation === key && Object.keys(fallbackTranslations).length > 0) {
      return getFallbackTranslation(fallbackTranslations, key, variables)
    }

    return translation
  }

  return { t, locale }
}
