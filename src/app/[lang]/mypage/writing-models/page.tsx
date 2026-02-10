'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon, PlusIcon, PencilIcon, TrashIcon, BeakerIcon, CheckIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/20/solid'
import { EyeIcon, EyeSlashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import ModelMarketplaceModal from '@/components/ModelMarketplaceModal'
import ShareModelModal from '@/components/ShareModelModal'
import ModelTrainingModal from '@/components/ModelTrainingModal'

interface WritingStyleProfile {
  id: string
  name: string
  description: string | null
  preferredAiModel: 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
  openerAi: string
  researchAi: string
  editorAi: string
  version: number
  isActive: boolean
  isPublic: boolean
  usageCount: number
  sampleCount: number
  previewSample: string | null
  previewGeneratedAt: Date | null
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string } | null
  userId?: string
}

interface TestGenerateResult {
  success: boolean
  preview?: string
  error?: string
}

type FilterScope = 'all' | 'mine'
type SortBy = 'recent' | 'usage'

const AI_MODEL_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
  ANTHROPIC: 'Claude'
}

const AI_MODEL_COLORS: Record<string, string> = {
  OPENAI: 'bg-emerald-100 text-emerald-800',
  GEMINI: 'bg-blue-100 text-blue-800',
  ANTHROPIC: 'bg-purple-100 text-purple-800'
}

export default function WritingModelsPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<WritingStyleProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterScope, setFilterScope] = useState<FilterScope>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  
  // Create/Edit form states
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    preferredAiModel: 'OPENAI' as 'OPENAI' | 'GEMINI' | 'ANTHROPIC',
    openerAi: 'openai',
    researchAi: 'perplexity',
    editorAi: 'openai',
    isPublic: false,
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Test generate states
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testTopic, setTestTopic] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)
  const [testResult, setTestResult] = useState<TestGenerateResult | null>(null)
  
  // Modal states
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingProfile, setSharingProfile] = useState<WritingStyleProfile | null>(null)
  
  // Training modal states
  const [showTrainingModal, setShowTrainingModal] = useState(false)
  const [trainingProfile, setTrainingProfile] = useState<WritingStyleProfile | null>(null)
  
  // Expandable states
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchProfiles()
  }, [filterScope])

  const fetchProfiles = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/writing-style/profiles?scope=${filterScope}`)
      if (!response.ok) throw new Error('Failed to fetch profiles')
      
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  const sortedProfiles = [...profiles].sort((a, b) => {
    if (sortBy === 'usage') {
      return b.usageCount - a.usageCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const handleCreate = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', preferredAiModel: 'OPENAI', openerAi: 'openai', researchAi: 'perplexity', editorAi: 'openai', isPublic: false })
    setShowForm(true)
  }

  const handleEdit = (profile: WritingStyleProfile) => {
    setEditingId(profile.id)
    setFormData({
      name: profile.name,
      description: profile.description || '',
      preferredAiModel: profile.preferredAiModel,
      openerAi: profile.openerAi || 'openai',
      researchAi: profile.researchAi || 'perplexity',
      editorAi: profile.editorAi || 'openai',
      isPublic: profile.isPublic,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const url = editingId 
        ? `/api/writing-style/profiles?id=${editingId}` 
        : '/api/writing-style/profiles'
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', description: '', preferredAiModel: 'OPENAI', openerAi: 'openai', researchAi: 'perplexity', editorAi: 'openai', isPublic: false })
      fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 글쓰기 모델을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/writing-style/profiles?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete profile')
      
      fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile')
    }
  }

  const handleTogglePublic = async (profile: WritingStyleProfile) => {
    try {
      const response = await fetch(`/api/writing-style/profiles?id=${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description,
          preferredAiModel: profile.preferredAiModel,
          openerAi: profile.openerAi,
          researchAi: profile.researchAi,
          editorAi: profile.editorAi,
          isPublic: !profile.isPublic,
        }),
      })

      if (!response.ok) throw new Error('Failed to update profile')
      
      fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle public status')
    }
  }

  const handleTestGenerate = (id: string) => {
    setTestingId(id)
    setTestTopic('')
    setTestResult(null)
    setShowTestModal(true)
  }

  const executeTestGenerate = async () => {
    if (!testTopic.trim() || !testingId) return

    setError('')
    
    try {
      const response = await fetch(`/api/writing-style/profiles/${testingId}/test-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: testTopic }),
      })

      if (!response.ok) throw new Error('Failed to test generate')
      
      const data = await response.json()
      setTestResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test generate')
      setTestResult({ success: false, error: err instanceof Error ? err.message : 'Test failed' })
    }
  }

  const closeTestModal = () => {
    setShowTestModal(false)
    setTestingId(null)
    setTestTopic('')
    setTestResult(null)
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const openTrainingModal = (profile: WritingStyleProfile) => {
    setTrainingProfile(profile)
    setShowTrainingModal(true)
  }

  const handleForkFromMarketplace = async (profileId: string) => {
    const response = await fetch(`/api/writing-style/profiles/${profileId}/fork`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to fork profile')
    await fetchProfiles()
  }

  const openShareModal = (profile: WritingStyleProfile) => {
    setSharingProfile(profile)
    setShowShareModal(true)
  }

  const handleShare = async (profileId: string, name: string, description: string) => {
    const response = await fetch(`/api/writing-style/profiles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profileId,
        name,
        description,
        isPublic: true,
      }),
    })
    if (!response.ok) throw new Error('Failed to share profile')
    await fetchProfiles()
    setShowShareModal(false)
    setSharingProfile(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            모델 관리
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowMarketplace(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              마켓플레이스
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              새 모델 만들기
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex space-x-2">
              {[
                { value: 'all' as FilterScope, label: '전체' },
                { value: 'mine' as FilterScope, label: '내 모델' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterScope(filter.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    filterScope === filter.value
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="ml-auto flex items-center space-x-2">
              <span className="text-sm text-gray-700">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="recent">최신순</option>
                <option value="usage">사용량순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? '모델 수정' : '새 모델 만들기'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  모델 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="예: 기술 블로그 스타일"
                  required
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="이 글쓰기 모델에 대한 간단한 설명"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  라이터 AI (글 작성) *
                </label>
                <select
                  value={formData.preferredAiModel}
                  onChange={(e) => setFormData({ ...formData, preferredAiModel: e.target.value as 'OPENAI' | 'GEMINI' | 'ANTHROPIC' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="OPENAI">OpenAI (GPT-4)</option>
                  <option value="GEMINI">Gemini</option>
                  <option value="ANTHROPIC">Claude</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  이 모델로 콘텐츠를 작성할 때 사용할 AI
                </p>
              </div>

              {/* AI Agent Configuration */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 에이전트 구성</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      오프너 AI (주제 분석)
                    </label>
                    <select
                      value={formData.openerAi}
                      onChange={(e) => setFormData({ ...formData, openerAi: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="openai">OpenAI (GPT-4)</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      리서치 AI (자료 조사)
                    </label>
                    <select
                      value={formData.researchAi}
                      onChange={(e) => setFormData({ ...formData, researchAi: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="perplexity">Perplexity</option>
                      <option value="openai">OpenAI (GPT-4)</option>
                      <option value="tavily">Tavily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      편집자 AI (품질 검토)
                    </label>
                    <select
                      value={formData.editorAi}
                      onChange={(e) => setFormData({ ...formData, editorAi: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="openai">OpenAI (GPT-4)</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  각 단계에서 사용할 AI를 설정합니다. 라이터 AI는 위에서 선택한 AI가 사용됩니다.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  다른 사용자에게 공개 (마켓플레이스)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? '저장 중...' : editingId ? '수정 완료' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Test Generate Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">테스트 생성</h3>
                  <button
                    onClick={closeTestModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {!testResult ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        테스트 주제 *
                      </label>
                      <input
                        type="text"
                        value={testTopic}
                        onChange={(e) => setTestTopic(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="예: AI와 머신러닝의 미래"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={closeTestModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={executeTestGenerate}
                        disabled={!testTopic.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        생성
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResult.success && testResult.preview ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-800">
                              테스트 생성 성공
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">생성된 미리보기:</h4>
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                              {testResult.preview}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <XMarkIcon className="h-5 w-5 text-red-600 mr-2" />
                          <span className="text-sm font-medium text-red-800">
                            {testResult.error || '테스트 생성 실패'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={closeTestModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profiles List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">글쓰기 모델이 없습니다. 새로운 모델을 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sortedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
                    {profile.description && (
                      <p className="text-sm text-gray-600 mt-1">{profile.description}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${AI_MODEL_COLORS[profile.preferredAiModel]}`}>
                    {AI_MODEL_LABELS[profile.preferredAiModel]}
                  </span>
                  {profile.isPublic && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      공개
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    v{profile.version}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    사용 {profile.usageCount}회
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    샘플 {profile.sampleCount}개
                  </span>
                </div>

                {/* AI Agent Info */}
                <div className="flex flex-wrap gap-1.5 mb-4 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    오프너: {profile.openerAi === 'openai' ? 'GPT-4' : profile.openerAi === 'claude' ? 'Claude' : 'Gemini'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                    리서치: {profile.researchAi === 'perplexity' ? 'Perplexity' : profile.researchAi === 'openai' ? 'GPT-4' : 'Tavily'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                    편집: {profile.editorAi === 'openai' ? 'GPT-4' : profile.editorAi === 'claude' ? 'Claude' : 'Gemini'}
                  </span>
                </div>

                {/* Stats & Info */}
                <div className="text-xs text-gray-500 mb-4">
                  {profile.user && <span>작성자: {profile.user.name} | </span>}
                  <span>생성일: {new Date(profile.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>

                {/* Preview Sample - Collapsible */}
                {profile.previewSample && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleExpand(profile.id)}
                      className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 mr-1 transform transition-transform ${
                          expandedIds.has(profile.id) ? 'rotate-180' : ''
                        }`}
                      />
                      미리보기 샘플
                    </button>
                    {expandedIds.has(profile.id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap border border-gray-200 max-h-60 overflow-y-auto">
                        {profile.previewSample}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openTrainingModal(profile)}
                    className="inline-flex items-center px-3 py-1.5 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-1" />
                    학습 관리
                  </button>

                  <button
                    onClick={() => handleTestGenerate(profile.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <BeakerIcon className="h-4 w-4 mr-1" />
                    테스트
                  </button>

                  <button
                    onClick={() => handleEdit(profile)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    수정
                  </button>

                  <button
                    onClick={() => handleTogglePublic(profile)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {profile.isPublic ? (
                      <>
                        <EyeSlashIcon className="h-4 w-4 mr-1" />
                        비공개
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        공개
                      </>
                    )}
                  </button>

                  {!profile.isPublic && (
                    <button
                      onClick={() => openShareModal(profile)}
                      className="inline-flex items-center px-3 py-1.5 border border-purple-300 rounded-md text-sm font-medium text-purple-700 bg-white hover:bg-purple-50"
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                      마켓에 공유
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        <ModelMarketplaceModal
          isOpen={showMarketplace}
          onClose={() => setShowMarketplace(false)}
          onFork={handleForkFromMarketplace}
        />

        {trainingProfile && (
          <ModelTrainingModal
            isOpen={showTrainingModal}
            onClose={() => {
              setShowTrainingModal(false)
              setTrainingProfile(null)
            }}
            profileId={trainingProfile.id}
            profileName={trainingProfile.name}
            profileVersion={trainingProfile.version}
            onUpdate={fetchProfiles}
          />
        )}

        {sharingProfile && (
          <ShareModelModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false)
              setSharingProfile(null)
            }}
            profileId={sharingProfile.id}
            currentName={sharingProfile.name}
            currentDescription={sharingProfile.description}
            onShare={handleShare}
          />
        )}
      </div>
    </div>
  )
}
