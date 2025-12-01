'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { defaultLocale, isValidLocale, type Locale } from '@/lib/i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

const LOCALE_STORAGE_KEY = 'preferred-locale'

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Sync with localStorage on mount
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isValidLocale(stored) && stored !== initialLocale) {
      // If stored locale differs from URL, update URL
      const newPath = pathname.replace(`/${initialLocale}`, `/${stored}`)
      router.replace(newPath)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    // Save to localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)

    // Update state
    setLocaleState(newLocale)

    // Navigate to new locale path
    const segments = pathname.split('/')
    segments[1] = newLocale // Replace the locale segment
    const newPath = segments.join('/')
    router.push(newPath)
  }

  useEffect(() => {
    // Update HTML lang attribute
    document.documentElement.lang = locale
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
