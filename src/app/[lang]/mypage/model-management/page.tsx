'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

// Types
interface Profile {
  id: string
  name: string
  description: string | null
  preferredAiModel: 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
  version: number
  isActive: boolean
  sampleCount: number
  createdBy: { name: string; email: string }
  createdAt: string
  updatedAt: string
}

interface Sample {
  id: string
  title: string | null
  content: string
  contentPreview: string
  sourceUrl: string | null
  wordCount: number
  language: string
  platform: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  processingStep: string | null
  qualityScore: number | null
  errorMessage: string | null
  retryCount: number
  isApproved: boolean
  createdAt: string
}

interface VersionEntry {
  version: number
  changes: string[]
  timestamp: string
  snapshot: {
    name: string
    description: string | null
    preferredAiModel: string
    isActive: boolean
  }
}

// AI Model labels
const AI_MODEL_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI (GPT-4)',
  GEMINI: 'Google Gemini',
  ANTHROPIC: 'Anthropic Claude',
}

export default function ModelManagementPage() {
  const params = useParams()
  const lang = params?.lang as string || 'ko'

  // State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  // Form states
  const [profileForm, setProfileForm] = useState<{
    name: string
    description: string
    preferredAiModel: 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
  }>({
    name: '',
    description: '',
    preferredAiModel: 'OPENAI',
  })
  const [submitting, setSubmitting] = useState(false)

  // Version history
  const [versions, setVersions] = useState<VersionEntry[]>([])

  // URL input
  const [urlInput, setUrlInput] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)

  // Test generation
  const [testPrompt, setTestPrompt] = useState('')
  const [testResult, setTestResult] = useState<{
    content: string
    qualityMetrics: {
      aiDetectionScore: number
      aiDetectionPassed: boolean
    }
  } | null>(null)
  const [generating, setGenerating] = useState(false)

  // Polling for sample status
  const [pollingActive, setPollingActive] = useState(false)

  // Load profiles
  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/writing-style/profiles')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
      setError('프로필을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load samples for selected profile
  const loadSamples = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/writing-style/samples?profileId=${profileId}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch samples: ${res.status}`)
      }
      const data = await res.json()
      setSamples(data.samples || [])

      // Check if any samples are processing
      const hasProcessing = data.samples?.some(
        (s: Sample) => s.status === 'PENDING' || s.status === 'PROCESSING'
      )
      setPollingActive(hasProcessing)
    } catch (err) {
      console.error('Failed to load samples:', err)
      // Stop polling on error to prevent infinite failed requests
      setPollingActive(false)
    }
  }, [])

  // Poll for sample updates
  useEffect(() => {
    if (!pollingActive || !selectedProfile) return

    const interval = setInterval(() => {
      loadSamples(selectedProfile.id)
    }, 3000)

    return () => clearInterval(interval)
  }, [pollingActive, selectedProfile, loadSamples])

  // Initial load
  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Load samples when profile is selected
  useEffect(() => {
    if (selectedProfile) {
      loadSamples(selectedProfile.id)
    } else {
      setSamples([])
    }
  }, [selectedProfile, loadSamples])

  // Create/Update profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const url = editingProfile
        ? `/api/writing-style/profiles?id=${editingProfile.id}`
        : '/api/writing-style/profiles'
      
      const res = await fetch(url, {
        method: editingProfile ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      setShowProfileModal(false)
      setEditingProfile(null)
      setProfileForm({ name: '', description: '', preferredAiModel: 'OPENAI' })
      await loadProfiles()

      // Refresh selected profile if it was edited
      if (editingProfile && selectedProfile?.id === editingProfile.id) {
        setSelectedProfile(data.profile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete profile
  const handleDeleteProfile = async (profile: Profile) => {
    if (!confirm(`"${profile.name}" 프로필을 삭제하시겠습니까? 모든 학습 데이터가 함께 삭제됩니다.`)) {
      return
    }

    try {
      const res = await fetch(`/api/writing-style/profiles?id=${profile.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete profile')
      }

      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null)
      }
      await loadProfiles()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Add sample from URL
  const handleAddUrl = async () => {
    if (!urlInput.trim() || !selectedProfile) return

    setAddingUrl(true)
    setError('')

    try {
      const res = await fetch('/api/writing-style/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          url: urlInput.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add URL')
      }

      setUrlInput('')
      await loadSamples(selectedProfile.id)
      setPollingActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAddingUrl(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedProfile) return

    const formData = new FormData()
    formData.append('profileId', selectedProfile.id)
    
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    setError('')

    try {
      const res = await fetch('/api/writing-style/samples/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Show upload results
      const { summary, results } = data
      if (summary.failed > 0) {
        const failedFiles = results
          .filter((r: { success: boolean; fileName: string; error?: string }) => !r.success)
          .map((r: { success: boolean; fileName: string; error?: string }) => `${r.fileName}: ${r.error}`)
          .join('\n')
        alert(`${summary.success}개 성공, ${summary.failed}개 실패\n\n실패 목록:\n${failedFiles}`)
      }

      await loadSamples(selectedProfile.id)
      setPollingActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }

    // Reset file input
    e.target.value = ''
  }

  // Delete sample
  const handleDeleteSample = async (sampleId: string) => {
    if (!confirm('이 샘플을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/writing-style/samples?id=${sampleId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete sample')
      }

      if (selectedProfile) {
        await loadSamples(selectedProfile.id)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Retry failed sample
  const handleRetrySample = async (sampleId: string) => {
    try {
      const res = await fetch(`/api/writing-style/samples/${sampleId}/retry`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retry')
      }

      if (selectedProfile) {
        await loadSamples(selectedProfile.id)
        setPollingActive(true)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Load version history
  const handleShowVersions = async (profile: Profile) => {
    try {
      const res = await fetch(`/api/writing-style/profiles/${profile.id}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.history || [])
        setShowVersionModal(true)
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
    }
  }

  // Rollback to version
  const handleRollback = async (version: number) => {
    if (!selectedProfile) return
    if (!confirm(`버전 ${version}으로 롤백하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/writing-style/profiles/${selectedProfile.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: version }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to rollback')
      }

      alert(`버전 ${version}으로 롤백되었습니다.`)
      setShowVersionModal(false)
      await loadProfiles()

      // Update selected profile
      if (data.profile) {
        setSelectedProfile(prev => prev ? { ...prev, ...data.profile } : null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Test generation
  const handleTestGenerate = async () => {
    if (!testPrompt.trim() || !selectedProfile) return

    setGenerating(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/writing-style/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          prompt: testPrompt.trim(),
          locale: lang,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Test generation failed')
      }

      setTestResult({
        content: data.content,
        qualityMetrics: data.qualityMetrics,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  // Open edit modal
  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile)
    setProfileForm({
      name: profile.name,
      description: profile.description || '',
      preferredAiModel: profile.preferredAiModel,
    })
    setShowProfileModal(true)
  }

  // Open create modal
  const openCreateModal = () => {
    setEditingProfile(null)
    setProfileForm({ name: '', description: '', preferredAiModel: 'OPENAI' })
    setShowProfileModal(true)
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">모델 관리</h1>
              <p className="mt-2 text-gray-600">
                AI 문체 프로필을 생성하고 학습 데이터를 관리합니다.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              새 프로필 만들기
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">프로필 목록</h2>
            
            {profiles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                아직 프로필이 없습니다.<br />
                <span className="text-sm">새 프로필을 만들어 시작하세요.</span>
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedProfile?.id === profile.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate text-sm">{profile.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {AI_MODEL_LABELS[profile.preferredAiModel]} · v{profile.version}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          샘플 {profile.sampleCount}개
                        </p>
                      </div>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                          profile.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {profile.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedProfile ? (
              <>
                {/* Profile Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedProfile.name}
                      </h2>
                      {selectedProfile.description && (
                        <p className="text-gray-600 mt-1">{selectedProfile.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowVersions(selectedProfile)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        버전 히스토리
                      </button>
                      <button
                        onClick={() => {
                          setTestPrompt('')
                          setTestResult(null)
                          setShowTestModal(true)
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        테스트 생성
                      </button>
                      <button
                        onClick={() => openEditModal(selectedProfile)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(selectedProfile)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-gray-500 text-xs">베이스 모델</span>
                      <p className="font-medium mt-1">{AI_MODEL_LABELS[selectedProfile.preferredAiModel]}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-gray-500 text-xs">버전</span>
                      <p className="font-medium mt-1">v{selectedProfile.version}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-gray-500 text-xs">샘플 수</span>
                      <p className="font-medium mt-1">{selectedProfile.sampleCount}개</p>
                    </div>
                  </div>
                </div>

                {/* Sample Management */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">학습 데이터</h3>

                  {/* Add Sample Forms */}
                  <div className="space-y-3 mb-6">
                    {/* URL Input */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="네이버 블로그 또는 워드프레스 URL 입력..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleAddUrl}
                        disabled={addingUrl || !urlInput.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {addingUrl ? '추가 중...' : 'URL 추가'}
                      </button>
                    </div>

                    {/* File Upload */}
                    <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition">
                      <span className="text-sm text-gray-600">파일 업로드 (.txt, .md, 최대 10개)</span>
                      <input
                        type="file"
                        accept=".txt,.md"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Sample List */}
                  {samples.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      아직 학습 데이터가 없습니다.<br />
                      <span className="text-sm">파일을 업로드하거나 URL을 추가하세요.</span>
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {samples.map((sample) => (
                        <div
                          key={sample.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate text-sm">
                                  {sample.title || '제목 없음'}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${getStatusColor(
                                    sample.status
                                  )}`}
                                >
                                  {sample.status === 'PROCESSING'
                                    ? `처리 중 ${sample.progress}%`
                                    : sample.status === 'COMPLETED'
                                    ? '완료'
                                    : sample.status === 'PENDING'
                                    ? '대기중'
                                    : '실패'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mb-1">
                                {sample.wordCount.toLocaleString()}자 · {sample.platform || '직접 입력'}
                                {sample.qualityScore && ` · 품질 ${sample.qualityScore}점`}
                              </p>
                              {sample.status === 'PROCESSING' && sample.processingStep && (
                                <p className="text-xs text-blue-600 mb-1">
                                  {sample.processingStep}
                                </p>
                              )}
                              {sample.status === 'FAILED' && sample.errorMessage && (
                                <p className="text-xs text-red-600 mb-1">
                                  오류: {sample.errorMessage}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {sample.contentPreview}
                              </p>
                            </div>
                            <div className="flex items-start gap-1 flex-shrink-0">
                              {sample.status === 'FAILED' && sample.retryCount < 3 && (
                                <button
                                  onClick={() => handleRetrySample(sample.id)}
                                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                >
                                  재시도 ({sample.retryCount}/3)
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSample(sample.id)}
                                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">프로필 상세</h2>
                <p className="text-gray-500 text-center py-8">
                  프로필을 선택하면 상세 내용이 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingProfile ? '프로필 수정' : '새 프로필 만들기'}
              </h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    프로필 이름 *
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="예: 기업 블로그 스타일"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (선택)
                  </label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    placeholder="이 프로필의 특징을 설명해주세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    베이스 AI 모델
                  </label>
                  <select
                    value={profileForm.preferredAiModel}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        preferredAiModel: e.target.value as 'OPENAI' | 'GEMINI' | 'ANTHROPIC',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="OPENAI">OpenAI (GPT-4)</option>
                    <option value="GEMINI">Google Gemini</option>
                    <option value="ANTHROPIC">Anthropic Claude</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    블로그 생성 시 사용할 기본 AI 모델입니다.
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-900 rounded-lg ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !profileForm.name.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    {submitting ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={() => setShowVersionModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-semibold">버전 히스토리</h2>
                <button
                  onClick={() => setShowVersionModal(false)}
                  className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-4">
                {versions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">버전 히스토리가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((v) => (
                      <div key={v.version} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">버전 {v.version}</span>
                            <p className="text-xs text-gray-500">
                              {new Date(v.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRollback(v.version)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            롤백
                          </button>
                        </div>
                        {v.changes.length > 0 && (
                          <ul className="mt-2 text-sm text-gray-600">
                            {v.changes.map((change, i) => (
                              <li key={i}>• {change}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Generation Modal */}
      {showTestModal && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={() => setShowTestModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-semibold">테스트 생성</h2>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-600 mb-4">
                  현재 프로필 설정으로 짧은 샘플 텍스트를 생성해봅니다.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      테스트 주제
                    </label>
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="예: 봄철 피크닉 준비 방법"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleTestGenerate}
                    disabled={generating || !testPrompt.trim()}
                    className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    {generating ? '생성 중...' : '테스트 생성'}
                  </button>
                  {testResult && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium mb-2">생성 결과</h3>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{testResult.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          AI 감지 점수: {testResult.qualityMetrics.aiDetectionScore}
                          {testResult.qualityMetrics.aiDetectionPassed ? ' ✓' : ' ⚠'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
