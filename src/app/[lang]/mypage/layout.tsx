'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import {
  Bars3Icon,
  Cog6ToothIcon,
  KeyIcon,
  DocumentTextIcon,
  XMarkIcon,
  HomeIcon,
  ChevronLeftIcon,
  CpuChipIcon,
  UsersIcon,
  RectangleStackIcon,
  PencilSquareIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from '@/hooks/useTranslation'
import { Logo } from '@/components/logo'
import { Link } from '@/components/link'

interface User {
  id: string
  email: string
  name: string
  role: string
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, locale } = useTranslation('common')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push(`/${locale}/login`)
        return
      }
      const data = await res.json()
      setUser(data.user)
      setLoading(false)
    } catch (err) {
      router.push(`/${locale}/login`)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}`)
  }

  const navigation = useMemo(() => [
    {
      name: '홈',
      href: `/${locale}/mypage`,
      icon: HomeIcon,
      current: pathname === `/${locale}/mypage`,
    },
    // Admin-only menus
    ...(user?.role === 'ADMIN'
      ? [
          {
            name: '홈페이지 관리',
            href: `/${locale}/mypage/admin/homepage`,
            icon: GlobeAltIcon,
            current: pathname?.startsWith(`/${locale}/mypage/admin/homepage`),
          },
          {
            name: '사용자 관리',
            href: `/${locale}/mypage/admin/users`,
            icon: UsersIcon,
            current: pathname?.startsWith(`/${locale}/mypage/admin/users`),
          },
        ]
      : []),
    {
      name: t('mypage.blogCreator'),
      href: `/${locale}/mypage/blog-creator`,
      icon: DocumentTextIcon,
      current: pathname?.startsWith(`/${locale}/mypage/blog-creator`),
    },
    {
      name: t('mypage.apiKeys'),
      href: `/${locale}/mypage/api-keys`,
      icon: KeyIcon,
      current: pathname?.startsWith(`/${locale}/mypage/api-keys`),
    },
    {
      name: t('mypage.layoutTemplates'),
      href: `/${locale}/mypage/layout-templates`,
      icon: RectangleStackIcon,
      current: pathname?.startsWith(`/${locale}/mypage/layout-templates`),
    },
    {
      name: '모델 관리',
      href: `/${locale}/mypage/writing-models`,
      icon: PencilSquareIcon,
      current: pathname?.startsWith(`/${locale}/mypage/writing-models`),
    },
    {
      name: t('mypage.settings'),
      href: `/${locale}/mypage/settings`,
      icon: Cog6ToothIcon,
      current: pathname?.startsWith(`/${locale}/mypage/settings`),
    },
  ], [user?.role, pathname, locale, t])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile sidebar */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            {/* Mobile Sidebar component */}
            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
              <div className="relative flex h-16 shrink-0 items-center">
                <Logo className="h-8 w-auto" />
              </div>
              <nav className="relative flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={classNames(
                              item.current
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
                              'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                            )}
                          >
                            <item.icon
                              aria-hidden="true"
                              className={classNames(
                                item.current
                                  ? 'text-blue-600'
                                  : 'text-gray-400 group-hover:text-blue-600',
                                'size-6 shrink-0'
                              )}
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="-mx-6 mt-auto">
                    <div className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-gray-900 border-t border-gray-200">
                      <div className="size-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="sr-only">Your profile</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{user?.name}</div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          {/* Home Button */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <Logo className="h-8 w-auto" />
            <Link
              href={`/${locale}`}
              className="flex items-center justify-center size-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              title="홈으로"
            >
              <ChevronLeftIcon className="size-5" />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={classNames(
                          item.current
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600',
                          'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className={classNames(
                            item.current
                              ? 'text-blue-600'
                              : 'text-gray-400 group-hover:text-blue-600',
                            'size-6 shrink-0'
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="-mx-6 mt-auto">
                <div className="border-t border-gray-200">
                  <div className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-gray-900">
                    <div className="size-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{user?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-200"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden border-b border-gray-200">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon aria-hidden="true" className="size-6" />
        </button>
        <div className="flex-1 text-sm/6 font-semibold text-gray-900">
          {navigation.find((item) => item.current)?.name || t('mypage.title')}
        </div>
        <div className="size-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-72">
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  )
}
