'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function Register({ params }: { params: Promise<{ lang: string }> }) {
  const router = useRouter()
  const [lang, setLang] = useState('ko')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })

  useEffect(() => {
    params.then(p => setLang(p.lang))
  }, [params])

  // Password strength checker
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength({ score: 0, feedback: [] })
      return
    }

    const feedback: string[] = []
    let score = 0

    // Length check
    if (formData.password.length >= 8) score++
    else feedback.push(lang === 'ko' ? '8자 이상이어야 합니다' : 'At least 8 characters')

    if (formData.password.length >= 12) score++

    // Uppercase check
    if (/[A-Z]/.test(formData.password)) score++
    else feedback.push(lang === 'ko' ? '대문자를 포함해야 합니다' : 'Include uppercase letter')

    // Lowercase check
    if (/[a-z]/.test(formData.password)) score++
    else feedback.push(lang === 'ko' ? '소문자를 포함해야 합니다' : 'Include lowercase letter')

    // Number check
    if (/\d/.test(formData.password)) score++
    else feedback.push(lang === 'ko' ? '숫자를 포함해야 합니다' : 'Include a number')

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) score++
    else feedback.push(lang === 'ko' ? '특수문자를 포함해야 합니다' : 'Include special character')

    setPasswordStrength({ score: Math.min(score, 5), feedback })
  }, [formData.password, lang])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError(lang === 'ko' ? '이름을 입력해주세요.' : 'Please enter your name.')
      return false
    }

    if (!formData.email.trim()) {
      setError(lang === 'ko' ? '이메일을 입력해주세요.' : 'Please enter your email.')
      return false
    }

    if (formData.password.length < 8) {
      setError(lang === 'ko' ? '비밀번호는 8자 이상이어야 합니다.' : 'Password must be at least 8 characters.')
      return false
    }

    if (passwordStrength.score < 4) {
      setError(lang === 'ko' ? '더 강력한 비밀번호를 사용해주세요.' : 'Please use a stronger password.')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError(lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (lang === 'ko' ? '회원가입에 실패했습니다.' : 'Registration failed.'))
        return
      }

      setSuccess(true)
    } catch {
      setError(lang === 'ko' ? '네트워크 오류가 발생했습니다.' : 'Network error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

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
                {lang === 'ko' ? '회원가입 완료!' : 'Registration Complete!'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {lang === 'ko' 
                  ? '인증 이메일을 발송했습니다. 이메일을 확인하여 계정을 활성화해주세요.'
                  : 'We sent a verification email. Please check your inbox to activate your account.'}
              </p>
              <Button
                onClick={() => router.push(`/${lang}/login`)}
                className="mt-6"
              >
                {lang === 'ko' ? '로그인 페이지로 이동' : 'Go to Login'}
              </Button>
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
              {lang === 'ko' ? '계정 만들기' : 'Create an account'}
            </h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              {lang === 'ko' ? '무료로 시작해보세요.' : 'Get started for free.'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <Field className="mt-6 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '이름' : 'Name'}
              </Label>
              <Input
                required
                autoFocus
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </Field>

            <Field className="mt-6 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '이메일' : 'Email'}
              </Label>
              <Input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </Field>

            <Field className="mt-6 space-y-3">
              <Label className="text-sm/5 font-medium">
                {lang === 'ko' ? '비밀번호' : 'Password'}
              </Label>
              <Input
                required
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
              {/* Password Strength Indicator */}
              {formData.password && (
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
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                className={clsx(
                  'block w-full rounded-lg border border-transparent shadow-sm ring-1 ring-black/10',
                  'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(1.5)-1px)] text-base/6 sm:text-sm/6',
                  'data-focus:outline-2 data-focus:-outline-offset-1 data-focus:outline-black',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  formData.confirmPassword && formData.password !== formData.confirmPassword && 'ring-red-500',
                )}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600">
                  {lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.'}
                </p>
              )}
            </Field>

            <div className="mt-8">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (lang === 'ko' ? '회원가입 중...' : 'Creating account...') 
                  : (lang === 'ko' ? '회원가입' : 'Create account')}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              {lang === 'ko' 
                ? '회원가입 시 이용약관 및 개인정보처리방침에 동의합니다.'
                : 'By signing up, you agree to our Terms and Privacy Policy.'}
            </p>
          </form>
          <div className="m-1.5 rounded-lg bg-gray-50 py-4 text-center text-sm/5 ring-1 ring-black/5">
            {lang === 'ko' ? '이미 계정이 있으신가요?' : 'Already have an account?'}{' '}
            <Link href={`/${lang}/login`} className="font-medium hover:text-gray-600">
              {lang === 'ko' ? '로그인' : 'Sign in'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
