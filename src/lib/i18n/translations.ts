import type { Translations } from './loader'

export function getNestedTranslation(
  translations: Translations,
  key: string,
  variables?: Record<string, string | number>
): string {
  const keys = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Translation key not found: ${key}`)
      }
      return key
    }
  }

  if (typeof value !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Translation key does not resolve to a string: ${key}`)
    }
    return key
  }

  // Replace variables in the format {variableName}
  if (variables) {
    return value.replace(/\{(\w+)\}/g, (match, varName) => {
      return varName in variables ? String(variables[varName]) : match
    })
  }

  return value
}

export function getFallbackTranslation(
  fallbackTranslations: Translations,
  key: string,
  variables?: Record<string, string | number>
): string {
  if (process.env.NODE_ENV === 'production') {
    return getNestedTranslation(fallbackTranslations, key, variables)
  }
  return key
}
