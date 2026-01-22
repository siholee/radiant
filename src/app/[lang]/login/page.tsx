'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/button'
import { GradientBackground } from '@/components/gradient'
import { Link } from '@/components/link'
import { Mark } from '@/components/logo'
import { Checkbox, Field, Input, Label } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/16/solid'
import { clsx } from 'clsx'

function LoginContent({ params }: { params: Promise<{ lang: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState('ko')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setLang(p.lang))
  }, [params])

  useEffect(() => {
    // Handle URL messages
    const verified = searchParams.get('verified')
    const errorParam = searchParams.get('error')

    if (verified === 'true') {
      setSuccessMessage('이메일 인증이 완료되었습니다. 로그인해주세요.')
    }

    if (errorParam === 'invalid_token') {
      setError('유효하지 않거나 만료된 인증 링크입니다.')
    } else if (errorParam === 'too_many_attempts') {
      setError('너무 많은 시도입니다. 잠시 후 다시 시도해주세요.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.')
        return
      }

      // Successful login - redirect to home or dashboard
      router.push(`/${lang}`)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="p-7 sm:p-11">
            <div className="flex items-start">
              <Link href={`/${lang}`} title="Home">
                <Mark className="h-9 fill-black" />
              </Link>
            </div>
            <h1 className="mt-8 text-base/6 font-medium">
              {lang === 'ko' ? '다시 오신 것을 환영합니다!' : 'Welcome back!'}
            </h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              {lang === 'ko' ? '계속하려면 로그인하세요.' : 'Sign in to your account to continue.'}
            </p>

            {/* Success Message */}
            {successMessage && (
              <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '이메일' : 'Email'}
              </Label>
              <Input
                required
                autoFocus
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </Field>
            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '비밀번호' : 'Password'}
              </Label>
              <Input
                required
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </Field>
            <div className="mt-8 flex items-center justify-between text-sm/5">
              <Field className="flex items-center gap-3">
                <Checkbox
                  name="remember-me"
                  checked={rememberMe}
                  onChange={setRememberMe}
                  disabled={isLoading}
                  className={clsx(
                    'group block size-4 rounded-sm border border-transparent shadow-sm ring-1 ring-black/10',
                    'data-checked:bg-black data-checked:ring-black',
                    'data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-black',
                    'disabled:opacity-50',
                  )}
                >
                  <CheckIcon className="fill-white opacity-0 group-data-checked:opacity-100" />
                </Checkbox>
                <Label>{lang === 'ko' ? '로그인 유지' : 'Remember me'}</Label>
              </Field>
              <Link href={`/${lang}/forgot-password`} className="font-medium hover:text-gray-600">
                {lang === 'ko' ? '비밀번호 찾기' : 'Forgot password?'}
              </Link>
            </div>
            <div className="mt-8">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (lang === 'ko' ? '로그인 중...' : 'Signing in...') 
                  : (lang === 'ko' ? '로그인' : 'Sign in')}
              </Button>
            </div>
          </form>
          <div className="m-1.5 rounded-lg bg-gray-50 py-4 text-center text-sm/5 ring-1 ring-black/5">
            {lang === 'ko' ? '아직 회원이 아니신가요?' : 'Not a member?'}{' '}
            <Link href={`/${lang}/register`} className="font-medium hover:text-gray-600">
              {lang === 'ko' ? '회원가입' : 'Create an account'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function LoginLoading() {
  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5 p-11">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Login({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent params={params} />
    </Suspense>
  )
}
