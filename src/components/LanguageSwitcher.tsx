'use client'

import { useLocale } from '@/contexts/LocaleContext'
import { locales, localeNames } from '@/lib/i18n'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon, LanguageIcon } from '@heroicons/react/16/solid'
import { clsx } from 'clsx'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={clsx(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-950',
          'transition-colors hover:bg-black/5'
        )}
      >
        <LanguageIcon className="size-5" />
        <span>{localeNames[locale]}</span>
        <ChevronDownIcon className="size-4" />
      </MenuButton>

      <MenuItems
        className={clsx(
          'absolute right-0 mt-2 w-40 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5',
          'focus:outline-none'
        )}
      >
        <div className="py-1">
          {locales.map((loc) => (
            <MenuItem key={loc}>
              {({ focus }) => (
                <button
                  onClick={() => setLocale(loc)}
                  className={clsx(
                    'block w-full px-4 py-2 text-left text-sm',
                    focus && 'bg-gray-100',
                    locale === loc && 'font-semibold text-gray-950',
                    locale !== loc && 'text-gray-700'
                  )}
                >
                  {localeNames[loc]}
                </button>
              )}
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  )
}

export function LanguageSwitcherMobile() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 mt-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-4">
        Language
      </div>
      <div className="flex gap-2 px-4">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={clsx(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              locale === loc
                ? 'bg-gray-950 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {localeNames[loc]}
          </button>
        ))}
      </div>
    </div>
  )
}
