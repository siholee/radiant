'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  LinkIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

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

interface ModelTrainingModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  profileName: string
  profileVersion: number
  onUpdate?: () => void
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <ClockIcon className="h-4 w-4 text-amber-500" />,
  PROCESSING: <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />,
  COMPLETED: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
  FAILED: <ExclamationCircleIcon className="h-4 w-4 text-red-500" />,
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  PROCESSING: '처리 중',
  COMPLETED: '완료',
  FAILED: '실패',
}

export default function ModelTrainingModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  profileVersion,
  onUpdate,
}: ModelTrainingModalProps) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)
  const [error, setError] = useState('')
  const [pollingActive, setPollingActive] = useState(false)

  // Version history
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [showVersions, setShowVersions] = useState(false)

  // Test generation
  const [showTest, setShowTest] = useState(false)
  const [testPrompt, setTestPrompt] = useState('')
  const [testResult, setTestResult] = useState<{ content: string; qualityMetrics?: any } | null>(null)
  const [generating, setGenerating] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'samples' | 'versions' | 'test'>('samples')

  const loadSamples = useCallback(async () => {
    try {
      const res = await fetch(`/api/writing-style/samples?profileId=${profileId}`)
      if (!res.ok) throw new Error('Failed to fetch samples')
      const data = await res.json()
      setSamples(data.samples || [])
      const hasProcessing = data.samples?.some(
        (s: Sample) => s.status === 'PENDING' || s.status === 'PROCESSING'
      )
      setPollingActive(hasProcessing)
    } catch (err) {
      console.error('Failed to load samples:', err)
      setPollingActive(false)
    }
  }, [profileId])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadSamples().finally(() => setLoading(false))
    }
  }, [isOpen, loadSamples])

  // Polling for sample updates
  useEffect(() => {
    if (!pollingActive || !isOpen) return
    const interval = setInterval(() => loadSamples(), 3000)
    return () => clearInterval(interval)
  }, [pollingActive, isOpen, loadSamples])

  // Add sample from URL
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return
    setAddingUrl(true)
    setError('')
    try {
      const res = await fetch('/api/writing-style/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add URL')
      setUrlInput('')
      await loadSamples()
      setPollingActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setAddingUrl(false)
    }
  }

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const formData = new FormData()
    formData.append('profileId', profileId)
    Array.from(files).forEach(file => formData.append('files', file))

    setError('')
    try {
      const res = await fetch('/api/writing-style/samples/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      if (data.summary?.failed > 0) {
        const failedFiles = data.results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.fileName}: ${r.error}`)
          .join('\n')
        setError(`${data.summary.success}개 성공, ${data.summary.failed}개 실패`)
      }

      await loadSamples()
      setPollingActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    e.target.value = ''
  }

  // Delete sample
  const handleDeleteSample = async (sampleId: string) => {
    if (!confirm('이 샘플을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/writing-style/samples?id=${sampleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete sample')
      await loadSamples()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Retry failed sample
  const handleRetrySample = async (sampleId: string) => {
    try {
      const res = await fetch(`/api/writing-style/samples/${sampleId}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to retry')
      await loadSamples()
      setPollingActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Load version history
  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/writing-style/profiles/${profileId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.history || [])
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
    }
  }

  // Rollback to version
  const handleRollback = async (version: number) => {
    if (!confirm(`버전 ${version}으로 롤백하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/writing-style/profiles/${profileId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: version }),
      })
      if (!res.ok) throw new Error('Failed to rollback')
      onUpdate?.()
      await loadVersions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Test generation
  const handleTestGenerate = async () => {
    if (!testPrompt.trim()) return
    setGenerating(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/writing-style/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, prompt: testPrompt.trim(), locale: 'ko' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test generation failed')
      setTestResult({ content: data.content, qualityMetrics: data.qualityMetrics })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  const completedCount = samples.filter(s => s.status === 'COMPLETED').length
  const processingCount = samples.filter(s => s.status === 'PENDING' || s.status === 'PROCESSING').length

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 px-8 py-6">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title className="text-2xl font-semibold tracking-tight text-gray-900">
                          {profileName}
                        </Dialog.Title>
                        <p className="mt-1 text-sm text-gray-600">
                          학습 데이터 관리 · 버전 {profileVersion} · 샘플 {samples.length}개
                        </p>
                      </div>
                      <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-200/30 blur-3xl" />
                  <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-200/30 blur-3xl" />
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100 bg-gray-50/50 px-8">
                  <div className="flex gap-6">
                    {[
                      { key: 'samples' as const, label: '학습 데이터', count: samples.length },
                      { key: 'versions' as const, label: '버전 히스토리' },
                      { key: 'test' as const, label: '테스트 생성' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setActiveTab(tab.key)
                          if (tab.key === 'versions') loadVersions()
                        }}
                        className={`relative py-3 text-sm font-medium transition-colors ${
                          activeTab === tab.key
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                        {tab.count !== undefined && (
                          <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {tab.count}
                          </span>
                        )}
                        {activeTab === tab.key && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-8 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                    <button onClick={() => setError('')} className="ml-2 font-medium underline">닫기</button>
                  </div>
                )}

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-8 py-6">
                  {/* Samples Tab */}
                  {activeTab === 'samples' && (
                    <div className="space-y-5">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl bg-green-50 p-4 text-center">
                          <p className="text-2xl font-bold text-green-700">{completedCount}</p>
                          <p className="text-xs text-green-600">학습 완료</p>
                        </div>
                        <div className="rounded-xl bg-blue-50 p-4 text-center">
                          <p className="text-2xl font-bold text-blue-700">{processingCount}</p>
                          <p className="text-xs text-blue-600">처리 중</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4 text-center">
                          <p className="text-2xl font-bold text-gray-700">{samples.length}</p>
                          <p className="text-xs text-gray-600">전체 샘플</p>
                        </div>
                      </div>

                      {/* URL Input */}
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                            placeholder="네이버 블로그 또는 워드프레스 URL 입력..."
                            className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={handleAddUrl}
                          disabled={addingUrl || !urlInput.trim()}
                          className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
                        >
                          {addingUrl ? '추가 중...' : 'URL 추가'}
                        </button>
                      </div>

                      {/* File Upload */}
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600">
                        <DocumentArrowUpIcon className="h-5 w-5" />
                        <span>파일 업로드 (.txt, .md, 최대 10개)</span>
                        <input
                          type="file"
                          accept=".txt,.md"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Sample List */}
                      {loading ? (
                        <div className="flex h-32 items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
                        </div>
                      ) : samples.length === 0 ? (
                        <div className="rounded-xl bg-gray-50 py-12 text-center">
                          <DocumentArrowUpIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                          <p className="text-sm text-gray-500">아직 학습 데이터가 없습니다</p>
                          <p className="mt-1 text-xs text-gray-400">파일을 업로드하거나 URL을 추가하세요</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {samples.map((sample) => (
                            <div
                              key={sample.id}
                              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {STATUS_ICONS[sample.status]}
                                    <h4 className="truncate text-sm font-medium text-gray-900">
                                      {sample.title || '제목 없음'}
                                    </h4>
                                    <span className="text-xs text-gray-400">
                                      {STATUS_LABELS[sample.status]}
                                      {sample.status === 'PROCESSING' && ` ${sample.progress}%`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {sample.wordCount.toLocaleString()}자
                                    {sample.platform && ` · ${sample.platform}`}
                                    {sample.qualityScore && ` · 품질 ${sample.qualityScore}점`}
                                  </p>
                                  {sample.status === 'PROCESSING' && sample.processingStep && (
                                    <p className="mt-1 text-xs text-blue-600">{sample.processingStep}</p>
                                  )}
                                  {sample.status === 'FAILED' && sample.errorMessage && (
                                    <p className="mt-1 text-xs text-red-500">{sample.errorMessage}</p>
                                  )}
                                  {sample.contentPreview && (
                                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">{sample.contentPreview}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  {sample.status === 'FAILED' && sample.retryCount < 3 && (
                                    <button
                                      onClick={() => handleRetrySample(sample.id)}
                                      className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                      title={`재시도 (${sample.retryCount}/3)`}
                                    >
                                      <ArrowPathIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSample(sample.id)}
                                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                    title="삭제"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Versions Tab */}
                  {activeTab === 'versions' && (
                    <div className="space-y-3">
                      {versions.length === 0 ? (
                        <div className="rounded-xl bg-gray-50 py-12 text-center">
                          <ClockIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                          <p className="text-sm text-gray-500">버전 히스토리가 없습니다</p>
                        </div>
                      ) : (
                        versions.map((v) => (
                          <div
                            key={v.version}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-gray-900">버전 {v.version}</span>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {new Date(v.timestamp).toLocaleString('ko-KR')}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRollback(v.version)}
                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                              >
                                롤백
                              </button>
                            </div>
                            {v.changes.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {v.changes.map((change, i) => (
                                  <li key={i} className="text-xs text-gray-600">• {change}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Test Tab */}
                  {activeTab === 'test' && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">테스트 주제</label>
                        <input
                          type="text"
                          value={testPrompt}
                          onChange={(e) => setTestPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTestGenerate()}
                          placeholder="예: 봄철 피크닉 준비 방법"
                          className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={handleTestGenerate}
                        disabled={generating || !testPrompt.trim()}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50"
                      >
                        {generating ? (
                          <span className="flex items-center justify-center gap-2">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            생성 중...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <BeakerIcon className="h-4 w-4" />
                            테스트 생성
                          </span>
                        )}
                      </button>

                      {testResult && (
                        <div className="space-y-3">
                          <div className="rounded-xl bg-gray-50 p-4">
                            <h4 className="mb-2 text-sm font-medium text-gray-700">생성 결과</h4>
                            <p className="whitespace-pre-wrap text-sm text-gray-700">{testResult.content}</p>
                          </div>
                          {testResult.qualityMetrics && (
                            <div className="flex items-center gap-4 rounded-xl bg-blue-50 p-3 text-sm">
                              <span className="text-blue-700">
                                AI 감지 점수: {testResult.qualityMetrics.aiDetectionScore}
                              </span>
                              <span className={testResult.qualityMetrics.aiDetectionPassed ? 'text-green-600' : 'text-amber-600'}>
                                {testResult.qualityMetrics.aiDetectionPassed ? '✓ 통과' : '⚠ 주의'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
