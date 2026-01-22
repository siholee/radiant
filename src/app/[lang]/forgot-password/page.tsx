'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { GradientBackground } from '@/components/gradient'
import { Link } from '@/components/link'
import { Mark } from '@/components/logo'
import { Field, Input, Label } from '@headlessui/react'
import { clsx } from 'clsx'

export default function ForgotPassword({ params }: { params: Promise<{ lang: string }> }) {
  const [lang, setLang] = useState('ko')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    params.then(p => setLang(p.lang))
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (lang === 'ko' ? '요청에 실패했습니다.' : 'Request failed.'))
        return
      }

      setSuccess(true)
    } catch {
      setError(lang === 'ko' ? '네트워크 오류가 발생했습니다.' : 'Network error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <main className="overflow-hidden bg-gray-50">
        <GradientBackground />
        <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md ring-1 ring-black/5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lang === 'ko' ? '이메일을 확인해주세요' : 'Check your email'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {lang === 'ko' 
                  ? '해당 이메일로 등록된 계정이 있다면, 비밀번호 재설정 링크를 보내드렸습니다.'
                  : 'If an account exists with this email, we\'ve sent a password reset link.'}
              </p>
              <p className="mt-4 text-xs text-gray-500">
                {lang === 'ko' 
                  ? '이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.'
                  : 'If you don\'t see the email, check your spam folder.'}
              </p>
              <Link
                href={`/${lang}/login`}
                className="mt-6 inline-block font-medium text-gray-900 hover:text-gray-600"
              >
                ← {lang === 'ko' ? '로그인으로 돌아가기' : 'Back to login'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
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
              {lang === 'ko' ? '비밀번호 재설정' : 'Reset your password'}
            </h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              {lang === 'ko' 
                ? '가입하신 이메일 주소를 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.'
                : 'Enter your email address and we\'ll send you a link to reset your password.'}
            </p>

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
                placeholder={lang === 'ko' ? 'you@example.com' : 'you@example.com'}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </Field>

            <div className="mt-8">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (lang === 'ko' ? '전송 중...' : 'Sending...') 
                  : (lang === 'ko' ? '재설정 링크 보내기' : 'Send reset link')}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <Link
                href={`/${lang}/login`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                ← {lang === 'ko' ? '로그인으로 돌아가기' : 'Back to login'}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
