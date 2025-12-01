'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { defaultLocale, isValidLocale } from '@/lib/i18n'

const LOCALE_STORAGE_KEY = 'preferred-locale'

function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return defaultLocale
  
  const browserLang = navigator.language.split('-')[0]
  return isValidLocale(browserLang) ? browserLang : defaultLocale
}

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Check localStorage first
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
    
    if (storedLocale && isValidLocale(storedLocale)) {
      router.replace(`/${storedLocale}`)
      return
    }

    // Check browser language
    const browserLocale = getBrowserLocale()
    router.replace(`/${browserLocale}`)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block size-12 animate-spin rounded-full border-4 border-solid border-gray-950 border-r-transparent" />
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
