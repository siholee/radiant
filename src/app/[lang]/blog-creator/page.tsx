'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ApiKey {
  id: string
  provider: string
  name: string
  status: string
  createdAt: string
}

interface GenerationStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  output?: string
}

interface Job {
  id: string
  prompt: string
  title?: string
  status: string
  createdAt: string
  progress: number
  currentStep?: string
  steps?: GenerationStep[]
  errorMessage?: string
  blogPost?: {
    id: string
    title: string
    content: string
  }
}

interface JobDetail extends Job {
  locale: string
  tags: string[]
  aiProvider: string
  aiModel: string
  processingTime?: number
}

export default function BlogCreatorPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form states
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('professional')
  const [keywords, setKeywords] = useState('')
  const [targetLength, setTargetLength] = useState(1500)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    checkAuth()
    loadApiKeys()
    loadJobs()
  }, [])

  // Auto-refresh jobs every 3 seconds if there are pending/processing jobs
  useEffect(() => {
    const hasPendingJobs = jobs.some(j => j.status === 'PENDING' || j.status === 'PROCESSING')
    if (!hasPendingJobs) return

    const interval = setInterval(() => {
      loadJobs()
      // Also refresh selected job if it's processing
      if (selectedJob && (selectedJob.status === 'PENDING' || selectedJob.status === 'PROCESSING')) {
        loadJobDetail(selectedJob.id)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [jobs, selectedJob])

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

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/blog-generator')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } catch (err) {
      console.error('Failed to load jobs:', err)
    }
  }

  const loadJobDetail = async (jobId: string) => {
    try {
      const res = await fetch(`/api/blog-generator/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedJob(data.job)
      }
    } catch (err) {
      console.error('Failed to load job detail:', err)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGenerating(true)

    try {
      const res = await fetch('/api/blog-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `주제: ${topic}\n톤: ${tone}\n키워드: ${keywords}\n목표 길이: ${targetLength}자`,
          title: topic,
          locale: 'ko',
          tags: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate blog')
      }

      setTopic('')
      setKeywords('')
      await loadJobs()
      // Auto-select the new job
      loadJobDetail(data.job.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = useCallback(async (content: string, jobId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(jobId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      alert('복사 실패')
    }
  }, [])

  const handleEdit = useCallback((job: Job) => {
    const content = job.blogPost?.content || ''
    const title = job.blogPost?.title || job.title || ''
    const editWindow = window.open('', '_blank')
    if (editWindow) {
      editWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Edit: ${title}</title>
          <style>
            body { font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; }
            h1 { margin-bottom: 20px; }
            textarea { width: 100%; min-height: 600px; padding: 15px; font-size: 14px; line-height: 1.6; }
            .actions { margin-top: 15px; }
            button { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <textarea id="editor">${content}</textarea>
          <div class="actions">
            <button onclick="copyToClipboard()">클립보드에 복사</button>
          </div>
          <script>
            function copyToClipboard() {
              const text = document.getElementById('editor').value;
              navigator.clipboard.writeText(text).then(() => alert('복사 완료!'));
            }
          </script>
        </body>
        </html>
      `)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const hasOpenAIKey = apiKeys.some(k => k.provider === 'OPENAI' && k.status === 'ACTIVE')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Blog Contents Creator</h1>
          <p className="mt-2 text-gray-600">
            AI를 활용한 블로그 콘텐츠 생성 도구
          </p>
        </div>

        {/* API Key Warning */}
        {!hasOpenAIKey && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800">⚠️ OpenAI API 키가 필요합니다</h3>
            <p className="mt-1 text-sm text-yellow-700">
              블로그를 생성하려면 먼저 OpenAI API 키를 등록해야 합니다.
            </p>
            <a 
              href="/ko/api-keys" 
              className="mt-2 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              API 키 등록하기 →
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Generate Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">새 블로그 생성</h2>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주제 *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: Next.js 15의 새로운 기능"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!hasOpenAIKey}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  톤
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!hasOpenAIKey}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="educational">Educational</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키워드 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Next.js, React, SSR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!hasOpenAIKey}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  목표 길이 (글자 수)
                </label>
                <input
                  type="number"
                  value={targetLength}
                  onChange={(e) => setTargetLength(Number(e.target.value))}
                  min={500}
                  max={5000}
                  step={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!hasOpenAIKey}
                />
              </div>

              <button
                type="submit"
                disabled={!hasOpenAIKey || generating}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '생성 시작 중...' : '블로그 생성'}
              </button>
            </form>
          </div>

          {/* Middle: Jobs List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">생성 작업</h2>
              <button
                onClick={loadJobs}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                새로고침
              </button>
            </div>

            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                아직 생성된 작업이 없습니다.
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {jobs.map((job) => {
                  const title = job.blogPost?.title || job.title || job.prompt.substring(0, 30)
                  const isSelected = selectedJob?.id === job.id

                  return (
                    <div
                      key={job.id}
                      onClick={() => loadJobDetail(job.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate text-sm">
                            {title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(job.createdAt).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <span
                          className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                            job.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : job.status === 'PROCESSING'
                              ? 'bg-blue-100 text-blue-800'
                              : job.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {job.status === 'PROCESSING' ? `${job.progress}%` : job.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Job Detail / Thinking Process */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">작업 상세</h2>

            {!selectedJob ? (
              <p className="text-gray-500 text-center py-8">
                작업을 선택하면 상세 내용이 표시됩니다.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Status Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedJob.blogPost?.title || selectedJob.title || '생성 중...'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedJob.currentStep}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedJob.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : selectedJob.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedJob.status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedJob.status}
                  </span>
                </div>

                {/* Progress Bar */}
                {(selectedJob.status === 'PROCESSING' || selectedJob.status === 'PENDING') && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${selectedJob.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {selectedJob.progress || 0}%
                    </p>
                  </div>
                )}

                {/* Thinking Process Steps */}
                {selectedJob.steps && selectedJob.steps.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      🧠 생성 과정
                    </h4>
                    <div className="space-y-3">
                      {selectedJob.steps.map((step) => (
                        <div
                          key={step.id}
                          className={`flex items-start gap-3 ${
                            step.status === 'pending' ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Step Icon */}
                          <div className="shrink-0 mt-0.5">
                            {step.status === 'completed' ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : step.status === 'in_progress' ? (
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                              </div>
                            ) : step.status === 'failed' ? (
                              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-300" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {step.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {step.description}
                            </p>
                            {step.output && step.status === 'completed' && (
                              <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                {step.output}
                              </p>
                            )}
                            {step.status === 'in_progress' && (
                              <p className="text-xs text-blue-600 mt-1 animate-pulse">
                                진행 중...
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedJob.errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-600">{selectedJob.errorMessage}</p>
                  </div>
                )}

                {/* Completed: Show Content */}
                {selectedJob.status === 'COMPLETED' && selectedJob.blogPost && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">📝 생성된 콘텐츠</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(selectedJob.blogPost!.content, selectedJob.id)}
                          className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          {copiedId === selectedJob.id ? '✓ 복사됨' : '복사'}
                        </button>
                        <button
                          onClick={() => handleEdit(selectedJob)}
                          className="text-xs px-2 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-4 max-h-[300px] overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {selectedJob.blogPost.content}
                      </pre>
                    </div>
                    {selectedJob.processingTime && (
                      <p className="text-xs text-gray-500 mt-2">
                        생성 시간: {selectedJob.processingTime}초
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
