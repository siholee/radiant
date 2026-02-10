'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, PlusIcon, PencilIcon, TrashIcon, BeakerIcon, CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { EyeIcon, EyeSlashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import LayoutMarketplaceModal from '@/components/LayoutMarketplaceModal'
import ShareLayoutModal from '@/components/ShareLayoutModal'

interface LayoutTemplate {
  id: string
  name: string
  description: string | null
  promptInstruction: string
  isSystem: boolean
  isPublic: boolean
  isActive: boolean
  usageCount: number
  previewSample: string | null
  version: number
  sortOrder: number
  createdAt: string
  user?: { id: string; name: string } | null
}

interface TestGenerateResult {
  success: boolean
  outline?: {
    title: string
    sections: Array<{
      title: string
      description: string
      estimatedWords: number
    }>
  }
  error?: string
}

type FilterScope = 'all' | 'mine' | 'system'
type SortBy = 'recent' | 'usage'

export default function LayoutTemplatesPage() {
  const [templates, setTemplates] = useState<LayoutTemplate[]>([])
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
    promptInstruction: '',
    isPublic: false,
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Test generate states
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<TestGenerateResult | null>(null)
  
  // Modal states
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingLayout, setSharingLayout] = useState<LayoutTemplate | null>(null)
  
  // Expandable states
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTemplates()
  }, [filterScope])

  const fetchTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const scope = filterScope === 'system' ? 'all' : filterScope
      const response = await fetch(`/api/blog-layout?scope=${scope}`)
      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      let filteredTemplates = data.templates || []
      
      // Apply filter
      if (filterScope === 'system') {
        filteredTemplates = filteredTemplates.filter((t: LayoutTemplate) => t.isSystem)
      }
      
      setTemplates(filteredTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const sortedTemplates = [...templates].sort((a, b) => {
    if (sortBy === 'usage') {
      return b.usageCount - a.usageCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const handleCreate = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', promptInstruction: '', isPublic: false })
    setShowForm(true)
  }

  const handleEdit = (template: LayoutTemplate) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      description: template.description || '',
      promptInstruction: template.promptInstruction,
      isPublic: template.isPublic,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const url = editingId ? `/api/blog-layout/${editingId}` : '/api/blog-layout'
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save template')
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', description: '', promptInstruction: '', isPublic: false })
      fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 레이아웃을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/blog-layout/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete template')
      
      fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleTogglePublic = async (template: LayoutTemplate) => {
    try {
      const response = await fetch(`/api/blog-layout/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          promptInstruction: template.promptInstruction,
          isPublic: !template.isPublic,
        }),
      })

      if (!response.ok) throw new Error('Failed to update template')
      
      fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle public status')
    }
  }

  const handleTestGenerate = async (id: string) => {
    setTestingId(id)
    setTestResult(null)
    setError('')

    try {
      const response = await fetch(`/api/blog-layout/${id}/test-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTopic: 'AI와 머신러닝의 미래',
          testKeywords: ['인공지능', '딥러닝', '자동화'],
        }),
      })

      if (!response.ok) throw new Error('Failed to test generate')
      
      const data = await response.json()
      setTestResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test generate')
    } finally {
      setTestingId(null)
    }
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

  const handleForkFromMarketplace = async (templateId: string) => {
    const response = await fetch(`/api/blog-layout/${templateId}/fork`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to fork template')
    await fetchTemplates()
  }

  const openShareModal = (template: LayoutTemplate) => {
    setSharingLayout(template)
    setShowShareModal(true)
  }

  const handleShare = async (layoutId: string, name: string, description: string) => {
    const response = await fetch(`/api/blog-layout/${layoutId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        isPublic: true,
      }),
    })
    if (!response.ok) throw new Error('Failed to share layout')
    await fetchTemplates()
    setShowShareModal(false)
    setSharingLayout(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            레이아웃 템플릿 관리
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
              새 템플릿 만들기
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
                { value: 'mine' as FilterScope, label: '내 템플릿' },
                { value: 'system' as FilterScope, label: '시스템' },
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
              {editingId ? '템플릿 수정' : '새 템플릿 만들기'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="예: 기술 블로그 표준 레이아웃"
                  required
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="템플릿에 대한 간단한 설명"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  레이아웃 지시문 * (최소 50자)
                </label>
                <textarea
                  value={formData.promptInstruction}
                  onChange={(e) => setFormData({ ...formData, promptInstruction: e.target.value })}
                  rows={8}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                  placeholder="AI가 블로그 레이아웃을 생성할 때 따를 상세한 지시사항을 입력하세요..."
                  required
                  minLength={50}
                  maxLength={2000}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.promptInstruction.length} / 2000 자
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

        {/* Test Result Modal */}
        {testResult && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">테스트 생성 결과</h3>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {testResult.success && testResult.outline ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">
                          레이아웃 생성 성공
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-2">{testResult.outline.title}</h4>
                      <div className="space-y-3">
                        {testResult.outline.sections.map((section, idx) => (
                          <div key={idx} className="border-l-4 border-indigo-400 pl-4 py-2">
                            <h5 className="font-medium text-gray-900">{section.title}</h5>
                            <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              예상 단어 수: {section.estimatedWords}
                            </p>
                          </div>
                        ))}
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
              </div>
            </div>
          </div>
        )}

        {/* Templates List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">템플릿이 없습니다. 새로운 템플릿을 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sortedTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.isSystem && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      시스템
                    </span>
                  )}
                  {template.isPublic && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      공개
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    v{template.version}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    사용 {template.usageCount}회
                  </span>
                </div>

                {/* Stats & Info */}
                <div className="text-xs text-gray-500 mb-4">
                  {template.user && <span>작성자: {template.user.name} | </span>}
                  <span>생성일: {new Date(template.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>

                {/* Preview Sample - Collapsible */}
                {template.previewSample && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleExpand(template.id)}
                      className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 mr-1 transform transition-transform ${
                          expandedIds.has(template.id) ? 'rotate-180' : ''
                        }`}
                      />
                      샘플 미리보기
                    </button>
                    {expandedIds.has(template.id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap border border-gray-200">
                        {template.previewSample}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTestGenerate(template.id)}
                    disabled={testingId === template.id}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <BeakerIcon className="h-4 w-4 mr-1" />
                    {testingId === template.id ? '테스트 중...' : '테스트'}
                  </button>

                  {!template.isSystem && (
                    <>
                      <button
                        onClick={() => handleEdit(template)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        수정
                      </button>

                      <button
                        onClick={() => handleTogglePublic(template)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {template.isPublic ? (
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

                      {!template.isPublic && (
                        <button
                          onClick={() => openShareModal(template)}
                          className="inline-flex items-center px-3 py-1.5 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50"
                        >
                          <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                          마켓에 공유
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(template.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        <LayoutMarketplaceModal
          isOpen={showMarketplace}
          onClose={() => setShowMarketplace(false)}
          onFork={handleForkFromMarketplace}
        />

        {sharingLayout && (
          <ShareLayoutModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false)
              setSharingLayout(null)
            }}
            layoutId={sharingLayout.id}
            currentName={sharingLayout.name}
            currentDescription={sharingLayout.description}
            onShare={handleShare}
          />
        )}
      </div>
    </div>
  )
}
