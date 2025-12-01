'use client'

import { Button } from '@/components/button'
import { Container } from '@/components/container'
import { GradientBackground } from '@/components/gradient'
import { Navbar } from '@/components/navbar'
import { useTranslation } from '@/hooks/useTranslation'
import { useLocale } from '@/contexts/LocaleContext'

export default function NotFound() {
  const { locale } = useLocale()

  return (
    <>
      <GradientBackground />
      <Navbar />
      <main className="flex min-h-screen items-center justify-center px-6 py-24">
        <Container>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-950">404</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
              Page not found
            </h1>
            <p className="mt-6 text-base text-gray-600">
              Sorry, we couldn&apos;t find the page you&apos;re looking for.
            </p>
            <div className="mt-10">
              <Button href={`/${locale}`}>
                Go back home
              </Button>
            </div>
          </div>
        </Container>
      </main>
    </>
  )
}
