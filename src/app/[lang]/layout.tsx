import '@/styles/tailwind.css'
import type { Metadata } from 'next'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { locales, isValidLocale, type Locale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale = lang as Locale

  return {
    title: {
      template: '%s - Yurasis',
      default: 'Yurasis - Close every deal',
    },
    alternates: {
      languages: {
        ko: '/ko',
        en: '/en',
      },
    },
    other: {
      'google-fonts': 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap',
    },
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = lang

  // Validate locale
  if (!isValidLocale(locale)) {
    notFound()
  }

  return (
    <LocaleProvider initialLocale={locale as Locale}>
      <div className="text-gray-950 antialiased">
        {children}
      </div>
    </LocaleProvider>
  )
}
