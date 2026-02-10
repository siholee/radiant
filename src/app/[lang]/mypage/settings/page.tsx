'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  // Account Info State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')

  // Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setName(data.user.name || '')
          setEmail(data.user.email || '')
          setOriginalName(data.user.name || '')
          setOriginalEmail(data.user.email || '')
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
      } finally {
        setInitialLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    // Check if there are changes
    const hasNameChange = name !== originalName
    const hasEmailChange = email !== originalEmail

    if (!hasNameChange && !hasEmailChange) {
      setError('변경된 내용이 없습니다.')
      return
    }

    setProfileLoading(true)

    try {
      const updateData: { name?: string; email?: string } = {}
      if (hasNameChange) updateData.name = name
      if (hasEmailChange) updateData.email = email

      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '계정 정보 업데이트에 실패했습니다.')
      }

      setMessage('계정 정보가 업데이트되었습니다.')
      setOriginalName(name)
      setOriginalEmail(email)

      if (data.emailChanged) {
        setMessage('계정 정보가 업데이트되었습니다. 새 이메일 주소로 인증 메일이 발송됩니다.')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '계정 정보 업데이트에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다.')
      }

      setMessage('비밀번호가 성공적으로 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Check if there are unsaved profile changes
  const hasProfileChanges = name !== originalName || email !== originalEmail

  if (initialLoading) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">환경설정</h1>
          <p className="mt-2 text-gray-600">계정 정보 및 비밀번호를 관리합니다.</p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Account Information Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">계정 정보</h2>
            <p className="text-gray-600 mb-6">
              이름과 이메일 주소를 업데이트할 수 있습니다.
            </p>
            <form onSubmit={handleAccountUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={profileLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={profileLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  * 이메일 변경 시 새 주소로 인증이 필요합니다.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={profileLoading || !hasProfileChanges}
                  className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {profileLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
            <p className="text-gray-600 mb-6">
              보안을 위해 주기적으로 비밀번호를 변경하세요.
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호 *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (최소 8자)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인 *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
