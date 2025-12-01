export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) || 'ko'

export const fallbackLocale: Locale =
  (process.env.NEXT_PUBLIC_FALLBACK_LOCALE as Locale) || 'ko'

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
