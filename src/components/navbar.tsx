'use client'

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react'
import { Bars2Icon, ChevronDownIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'
import { useLocale } from '@/contexts/LocaleContext'
import { LanguageSwitcher, LanguageSwitcherMobile } from './LanguageSwitcher'
import { Link } from './link'
import { Logo } from './logo'
import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

function DesktopNav() {
  const { t, locale } = useTranslation('common')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data?.user || null)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = `/${locale}`
  }

  const publicLinks = [
    { href: `/${locale}/build`, label: t('nav.company') },
    { href: `/${locale}/marketing`, label: t('nav.pricing') },
  ]

  return (
    <nav className="relative hidden lg:flex items-center gap-2">
      {publicLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="relative flex items-center px-4 py-2 text-base font-medium text-gray-950 bg-blend-multiply transition-colors before:absolute before:inset-0 before:rounded-lg before:bg-black/0 before:transition-colors data-hover:before:bg-black/[0.025]"
        >
          {label}
        </Link>
      ))}
      {!loading && (
        user ? (
          <Menu as="div" className="relative">
            <MenuButton className="relative flex items-center gap-2 px-4 py-2 text-base font-medium text-gray-950 bg-blend-multiply transition-colors before:absolute before:inset-0 before:rounded-lg before:bg-black/0 before:transition-colors hover:before:bg-black/[0.025]">
              <span>{user.name}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </MenuButton>
            <MenuItems className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <MenuItem>
                  {({ focus }) => (
                    <Link
                      href={`/${locale}/mypage`}
                      className={`${
                        focus ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700`}
                    >
                      {t('nav.mypage')}
                    </Link>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        focus ? 'bg-gray-100' : ''
                      } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    >
                      {t('nav.logout') || '로그아웃'}
                    </button>
                  )}
                </MenuItem>
              </div>
            </MenuItems>
          </Menu>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="relative flex items-center px-4 py-2 text-base font-medium text-gray-950 bg-blend-multiply transition-colors before:absolute before:inset-0 before:rounded-lg before:bg-black/0 before:transition-colors data-hover:before:bg-black/[0.025]"
          >
            {t('nav.login')}
          </Link>
        )
      )}
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data?.user || null)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = `/${locale}`
  }

  const publicLinks = [
    { href: `/${locale}/build`, label: t('nav.company') },
    { href: `/${locale}/marketing`, label: t('nav.pricing') },
  ]

  const authLinks = user ? [
    { href: `/${locale}/mypage`, label: t('nav.mypage') },
  ] : []

  const allLinks = [...publicLinks, ...authLinks]

  return (
    <DisclosurePanel className="lg:hidden mt-2">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 ring-1 ring-black/5 px-4 sm:px-6">
        <div className="flex flex-col gap-4 py-4">
          {allLinks.map(({ href, label }, linkIndex) => (
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
          {!loading && (
            user ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-gray-200 pt-4"
              >
                <div className="text-sm font-medium text-gray-600 py-2">{user.name}</div>
                <button
                  onClick={handleLogout}
                  className="text-base font-medium text-gray-950 block py-2 w-full text-left"
                >
                  {t('nav.logout') || '로그아웃'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Link href={`/${locale}/login`} className="text-base font-medium text-gray-950 block py-2">
                  {t('nav.login')}
                </Link>
              </motion.div>
            )
          )}
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
