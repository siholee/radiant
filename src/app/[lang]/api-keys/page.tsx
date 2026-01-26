'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ApiKey {
  id: string
  provider: string
  name: string
  maskedKey: string
  status: string
  createdAt: string
  lastUsedAt: string | null
  usage?: {
    requestCount: number
    totalCost: number
    totalInputTokens: number
    totalOutputTokens: number
  }
}

export default function ApiKeysPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [provider, setProvider] = useState('OPENAI')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
    loadApiKeys()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/ko/login')
        return
      }
      const data = await res.json()
      setUser(data.user)
      setLoading(false)
    } catch (err) {
      router.push('/ko/login')
    }
  }

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (err) {
      console.error('Failed to load API keys:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      setShowForm(false)
      setName('')
      setApiKey('')
      await loadApiKeys()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 API 키를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete API key')
      }

      await loadApiKeys()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-2 text-gray-600">
            OpenAI 등의 API 키를 안전하게 관리하세요
          </p>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? '취소' : '+ 새 API 키 추가'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">새 API 키 추가</h2>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider *
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="OPENAI">OpenAI</option>
                  <option value="ANTHROPIC">Anthropic</option>
                  <option value="GOOGLE">Google</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: My OpenAI Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key *
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  API 키는 암호화되어 안전하게 저장됩니다.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </form>
          </div>
        )}

        {/* API Keys List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              등록된 API 키가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      API Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {key.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {key.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {key.maskedKey}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            key.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.usage ? (
                          <div>
                            <div>{key.usage.requestCount} requests</div>
                            <div className="text-xs text-gray-400">
                              ${key.usage.totalCost.toFixed(4)}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(key.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(key.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800">💡 안전한 API 키 관리</h3>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>모든 API 키는 AES-256-GCM으로 암호화되어 저장됩니다</li>
            <li>API 키는 한 번 저장되면 다시 확인할 수 없습니다</li>
            <li>각 API 키의 사용량과 비용이 자동으로 추적됩니다</li>
            <li>사용하지 않는 키는 즉시 삭제하시기 바랍니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
