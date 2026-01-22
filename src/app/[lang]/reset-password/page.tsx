'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/button'
import { GradientBackground } from '@/components/gradient'
import { Link } from '@/components/link'
import { Mark } from '@/components/logo'
import { Field, Input, Label } from '@headlessui/react'
import { clsx } from 'clsx'

interface PasswordStrength {
  score: number
  feedback: string[]
}

export default function ResetPassword({ params }: { params: Promise<{ lang: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState('ko')
  
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })

  useEffect(() => {
    params.then(p => setLang(p.lang))
  }, [params])

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: [] })
      return
    }

    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score++
    else feedback.push(lang === 'ko' ? '8자 이상이어야 합니다' : 'At least 8 characters')

    if (password.length >= 12) score++

    if (/[A-Z]/.test(password)) score++
    else feedback.push(lang === 'ko' ? '대문자를 포함해야 합니다' : 'Include uppercase letter')

    if (/[a-z]/.test(password)) score++
    else feedback.push(lang === 'ko' ? '소문자를 포함해야 합니다' : 'Include lowercase letter')

    if (/\d/.test(password)) score++
    else feedback.push(lang === 'ko' ? '숫자를 포함해야 합니다' : 'Include a number')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
    else feedback.push(lang === 'ko' ? '특수문자를 포함해야 합니다' : 'Include special character')

    setPasswordStrength({ score: Math.min(score, 5), feedback })
  }, [password, lang])

  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-yellow-500'
    if (score <= 4) return 'bg-lime-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = (score: number) => {
    if (lang === 'ko') {
      if (score <= 1) return '매우 약함'
      if (score <= 2) return '약함'
      if (score <= 3) return '보통'
      if (score <= 4) return '강함'
      return '매우 강함'
    }
    if (score <= 1) return 'Very weak'
    if (score <= 2) return 'Weak'
    if (score <= 3) return 'Fair'
    if (score <= 4) return 'Strong'
    return 'Very strong'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(lang === 'ko' ? '유효하지 않은 토큰입니다.' : 'Invalid token.')
      return
    }

    if (password.length < 8) {
      setError(lang === 'ko' ? '비밀번호는 8자 이상이어야 합니다.' : 'Password must be at least 8 characters.')
      return
    }

    if (passwordStrength.score < 4) {
      setError(lang === 'ko' ? '더 강력한 비밀번호를 사용해주세요.' : 'Please use a stronger password.')
      return
    }

    if (password !== confirmPassword) {
      setError(lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (lang === 'ko' ? '비밀번호 재설정에 실패했습니다.' : 'Password reset failed.'))
        return
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push(`/${lang}/login`)
      }, 3000)
    } catch {
      setError(lang === 'ko' ? '네트워크 오류가 발생했습니다.' : 'Network error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  // No token provided
  if (!token) {
    return (
      <main className="overflow-hidden bg-gray-50">
        <GradientBackground />
        <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md ring-1 ring-black/5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lang === 'ko' ? '유효하지 않은 링크' : 'Invalid Link'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {lang === 'ko' 
                  ? '비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.'
                  : 'This password reset link is invalid or has expired.'}
              </p>
              <Link
                href={`/${lang}/forgot-password`}
                className="mt-6 inline-block font-medium text-gray-900 hover:text-gray-600"
              >
                {lang === 'ko' ? '새 링크 요청하기' : 'Request a new link'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Success state
  if (success) {
    return (
      <main className="overflow-hidden bg-gray-50">
        <GradientBackground />
        <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md ring-1 ring-black/5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lang === 'ko' ? '비밀번호가 재설정되었습니다!' : 'Password Reset!'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {lang === 'ko' 
                  ? '새 비밀번호로 로그인할 수 있습니다. 로그인 페이지로 이동합니다...'
                  : 'You can now sign in with your new password. Redirecting to login...'}
              </p>
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
              {lang === 'ko' ? '새 비밀번호 설정' : 'Set new password'}
            </h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              {lang === 'ko' 
                ? '안전한 새 비밀번호를 입력해주세요.'
                : 'Enter a new, secure password for your account.'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <Field className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '새 비밀번호' : 'New Password'}
              </Label>
              <Input
                required
                autoFocus
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
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={clsx(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          i <= passwordStrength.score ? getStrengthColor(passwordStrength.score) : 'bg-gray-200',
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={clsx(
                      passwordStrength.score <= 2 ? 'text-red-600' :
                      passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {getStrengthLabel(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {passwordStrength.feedback.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Field>

            <Field className="mt-6 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '비밀번호 확인' : 'Confirm Password'}
              </Label>
              <Input
                required
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  confirmPassword && password !== confirmPassword && 'ring-red-500',
                )}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">
                  {lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.'}
                </p>
              )}
            </Field>

            <div className="mt-8">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (lang === 'ko' ? '재설정 중...' : 'Resetting...') 
                  : (lang === 'ko' ? '비밀번호 재설정' : 'Reset password')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
