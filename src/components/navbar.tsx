'use client'

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { Bars2Icon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'
import { useLocale } from '@/contexts/LocaleContext'
import { LanguageSwitcher, LanguageSwitcherMobile } from './LanguageSwitcher'
import { Link } from './link'
import { Logo } from './logo'

function DesktopNav() {
  const { t, locale } = useTranslation('common')
  
  const links = [
    { href: `/${locale}/company`, label: t('nav.company') },
    { href: `/${locale}/marketing`, label: t('nav.pricing') },
    { href: `/${locale}/blog`, label: t('nav.blog') },
    { href: `/${locale}/login`, label: t('nav.login') },
  ]

  return (
    <nav className="relative hidden lg:flex items-center gap-2">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="relative flex items-center px-4 py-2 text-base font-medium text-gray-950 bg-blend-multiply transition-colors before:absolute before:inset-0 before:rounded-lg before:bg-black/0 before:transition-colors data-hover:before:bg-black/[0.025]"
        >
          {label}
        </Link>
      ))}
      <LanguageSwitcher />
    </nav>
  )
}

function MobileNavButton() {
  return (
    <DisclosureButton
      className="flex size-12 items-center justify-center self-center rounded-lg data-hover:bg-black/5 lg:hidden"
      aria-label="Open main menu"
    >
      <Bars2Icon className="size-6" />
    </DisclosureButton>
  )
}

function MobileNav() {
  const { t, locale } = useTranslation('common')
  
  const links = [
    { href: `/${locale}/company`, label: t('nav.company') },
    { href: `/${locale}/marketing`, label: t('nav.pricing') },
    { href: `/${locale}/blog`, label: t('nav.blog') },
    { href: `/${locale}/login`, label: t('nav.login') },
  ]

  return (
    <DisclosurePanel className="lg:hidden mt-2">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 ring-1 ring-black/5 px-4 sm:px-6">
        <div className="flex flex-col gap-4 py-4">
          {links.map(({ href, label }, linkIndex) => (
            <motion.div
              initial={{ opacity: 0, rotateX: -90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              transition={{
                duration: 0.15,
                ease: 'easeInOut',
                rotateX: { duration: 0.3, delay: linkIndex * 0.1 },
              }}
              key={href}
            >
              <Link href={href} className="text-base font-medium text-gray-950 block py-2">
                {label}
              </Link>
            </motion.div>
          ))}
          <LanguageSwitcherMobile />
        </div>
      </div>
    </DisclosurePanel>
  )
}

export function Navbar({ banner }: { banner?: React.ReactNode }) {
  const { locale } = useLocale()
  
  return (
    <Disclosure as="header" className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 ring-1 ring-black/5 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/${locale}`} title="Home" className="flex items-center">
              <Logo className="h-9" />
            </Link>
            {banner && (
              <div className="hidden lg:flex">
                {banner}
              </div>
            )}
          </div>
          <DesktopNav />
          <MobileNavButton />
        </div>
      </div>
      <MobileNav />
    </Disclosure>
  )
}
