'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import LayoutMarketplaceModal from '@/components/LayoutMarketplaceModal'
import ModelMarketplaceModal from '@/components/ModelMarketplaceModal'

interface ApiKey {
  id: string
  provider: string
  name: string
  status: string
  createdAt: string
}

interface WritingStyleProfile {
  id: string
  name: string
  description: string | null
  preferredAiModel: string
  openerAi: string
  researchAi: string
  editorAi: string
  version: number
  isActive: boolean
  sampleCount: number
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
  user?: { name: string } | null
}

interface MarketplaceTemplate extends LayoutTemplate {
  user: { name: string } | null
}

export default function BlogCreatorPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [styleProfiles, setStyleProfiles] = useState<WritingStyleProfile[]>([])
  const [selectedStyleProfile, setSelectedStyleProfile] = useState<string>('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSteps, setShowSteps] = useState(false)
  const [showBlogModal, setShowBlogModal] = useState(false)

  // Form states
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [targetLength, setTargetLength] = useState(1500)
  const [generating, setGenerating] = useState(false)

  // System layout type
  const [systemLayoutType, setSystemLayoutType] = useState<'basic' | 'restaurant'>('basic')
  
  // Restaurant review specific fields
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantAtmosphere, setRestaurantAtmosphere] = useState('')
  const [restaurantMenus, setRestaurantMenus] = useState('')
  const [restaurantImages, setRestaurantImages] = useState<string[]>([])

  // Layout Template states (simplified - only for selection and preview)
  const [layoutTemplates, setLayoutTemplates] = useState<LayoutTemplate[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState('')
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false)
  const [aiRecommendResult, setAiRecommendResult] = useState<{ name: string; reason: string } | null>(null)

  // Marketplace modals
  const [showLayoutMarketplace, setShowLayoutMarketplace] = useState(false)
  const [showModelMarketplace, setShowModelMarketplace] = useState(false)

  // AI agent label map
  const aiAgentLabels: Record<string, string> = {
    openai: 'OpenAI (GPT-4)',
    claude: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    tavily: 'Tavily',
  }

  useEffect(() => {
    loadApiKeys()
    loadJobs()
    loadStyleProfiles()
    loadLayoutTemplates()
    setLoading(false)
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

  const loadStyleProfiles = async () => {
    try {
      const res = await fetch('/api/writing-style/profiles')
      if (res.ok) {
        const data = await res.json()
        setStyleProfiles(data.profiles || [])
      }
    } catch (err) {
      console.error('Failed to load style profiles:', err)
    }
  }

  const loadLayoutTemplates = async () => {
    try {
      const res = await fetch('/api/blog-layout?scope=all')
      if (res.ok) {
        const data = await res.json()
        setLayoutTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Failed to load layout templates:', err)
    }
  }

  const handleAIRecommend = async () => {
    if (!topic) {
      alert('먼저 주제를 입력해주세요.')
      return
    }
    if (!confirm('AI 추천에는 소량의 API 비용이 발생합니다. 계속하시겠습니까?')) return
    setAiRecommendLoading(true)
    setAiRecommendResult(null)
    try {
      const res = await fetch('/api/blog-layout/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (res.ok && data.recommendation) {
        setSelectedLayoutId(data.recommendation.templateId)
        setAiRecommendResult({
          name: data.recommendation.templateName,
          reason: data.recommendation.reason,
        })
      } else {
        throw new Error(data.error || '추천 실패')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAiRecommendLoading(false)
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
        console.log('Job detail loaded:', data.job)
        setSelectedJob(data.job)
      } else {
        console.error('Failed to load job:', res.status, await res.text())
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
      // Build prompt based on layout type
      let prompt = ''
      const selectedModel = styleProfiles.find(p => p.id === selectedStyleProfile)
      
      if (systemLayoutType === 'restaurant') {
        prompt = `레이아웃: 음식점 리뷰\n음식점 이름: ${restaurantName}\n분위기: ${restaurantAtmosphere || '이미지 기반으로 추측'}\n주문 메뉴: ${restaurantMenus}\n목표 길이: ${targetLength}자`
      } else {
        prompt = `주제: ${topic}\n키워드: ${keywords}\n목표 길이: ${targetLength}자`
      }

      const res = await fetch('/api/blog-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          title: systemLayoutType === 'restaurant' ? restaurantName : topic,
          locale: 'ko',
          tags: systemLayoutType === 'restaurant' 
            ? [restaurantName, '맛집', '리뷰'] 
            : keywords.split(',').map(k => k.trim()).filter(Boolean),
          ...(selectedStyleProfile && { styleProfileId: selectedStyleProfile }),
          ...(selectedLayoutId && { layoutId: selectedLayoutId }),
          systemLayoutType,
          aiAgents: selectedModel
            ? {
                opener: selectedModel.openerAi || 'openai',
                researcher: selectedModel.researchAi || 'perplexity',
                writer: selectedModel.preferredAiModel?.toLowerCase() || 'openai',
                editor: selectedModel.editorAi || 'openai',
              }
            : {
                opener: 'openai',
                researcher: 'perplexity',
                writer: 'openai',
                editor: 'openai',
              },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate blog')
      }

      setTopic('')
      setKeywords('')
      setRestaurantName('')
      setRestaurantAtmosphere('')
      setRestaurantMenus('')
      setRestaurantImages([])
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

  const handleForkLayout = async (layoutId: string) => {
    const response = await fetch(`/api/blog-layout/${layoutId}/fork`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to fork layout')
    await loadLayoutTemplates()
  }

  const handleForkModel = async (profileId: string) => {
    const response = await fetch(`/api/writing-style/profiles/${profileId}/fork`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to fork model')
    await loadStyleProfiles()
  }

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
            <h3 className="text-sm font-medium text-yellow-800">OpenAI API 키가 필요합니다</h3>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">새 블로그 생성</h2>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Model Selection (Top) */}
              <div className="pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">모델</label>
                  <div className="flex gap-1">
                    <a
                      href="/ko/mypage/writing-models"
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      관리
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowModelMarketplace(true)}
                      className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                    >
                      마켓
                    </button>
                  </div>
                </div>
                <Listbox value={selectedStyleProfile} onChange={setSelectedStyleProfile} disabled={!hasOpenAIKey}>
                  <div className="relative">
                    <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pl-3 pr-2 text-left text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="col-start-1 row-start-1 truncate pr-6">
                        {selectedStyleProfile
                          ? styleProfiles.find(p => p.id === selectedStyleProfile)?.name || '기본 모델'
                          : '기본 모델'}
                      </span>
                      <ChevronUpDownIcon
                        aria-hidden="true"
                        className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                      />
                    </ListboxButton>
                    <ListboxOptions
                      transition
                      className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-1 outline-black/5 data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in sm:text-sm"
                    >
                      <ListboxOption
                        value=""
                        className="group relative cursor-default select-none py-2 pl-8 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white data-[focus]:outline-none"
                      >
                        <span className="block truncate font-normal group-data-[selected]:font-semibold">기본 모델</span>
                        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 group-[:not([data-selected])]:hidden group-data-[focus]:text-white">
                          <CheckIcon aria-hidden="true" className="size-5" />
                        </span>
                      </ListboxOption>
                      {styleProfiles.map((profile) => (
                        <ListboxOption
                          key={profile.id}
                          value={profile.id}
                          className="group relative cursor-default select-none py-2 pl-8 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white data-[focus]:outline-none"
                        >
                          <span className="block truncate font-normal group-data-[selected]:font-semibold">
                            {profile.name}
                          </span>
                          <span className="block truncate text-xs text-gray-500 group-data-[focus]:text-indigo-200">
                            v{profile.version} · 샘플 {profile.sampleCount}개
                          </span>
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 group-[:not([data-selected])]:hidden group-data-[focus]:text-white">
                            <CheckIcon aria-hidden="true" className="size-5" />
                          </span>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
                {/* Model AI Agent Info */}
                {selectedStyleProfile && (() => {
                  const model = styleProfiles.find(p => p.id === selectedStyleProfile)
                  if (!model) return null
                  return (
                    <div className="mt-2 bg-blue-50 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-medium text-blue-800 mb-1.5">AI 에이전트 구성</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <span className="text-blue-700">오프너: <b>{aiAgentLabels[model.openerAi] || model.openerAi}</b></span>
                        <span className="text-blue-700">리서처: <b>{aiAgentLabels[model.researchAi] || model.researchAi}</b></span>
                        <span className="text-blue-700">라이터: <b>{aiAgentLabels[model.preferredAiModel?.toLowerCase()] || model.preferredAiModel}</b></span>
                        <span className="text-blue-700">편집자: <b>{aiAgentLabels[model.editorAi] || model.editorAi}</b></span>
                      </div>
                    </div>
                  )
                })()}
                {!selectedStyleProfile && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium text-gray-600 mb-1.5">기본 AI 에이전트 구성</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <span className="text-gray-500">오프너: <b>OpenAI</b></span>
                      <span className="text-gray-500">리서처: <b>Perplexity</b></span>
                      <span className="text-gray-500">라이터: <b>OpenAI</b></span>
                      <span className="text-gray-500">편집자: <b>OpenAI</b></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Layout Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">레이아웃</label>
                  <div className="flex gap-1">
                    <a
                      href="/ko/mypage/layout-templates"
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      관리
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowLayoutMarketplace(true)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      마켓
                    </button>
                  </div>
                </div>
                <Listbox
                  value={systemLayoutType === 'basic' && !selectedLayoutId ? '__basic' : systemLayoutType === 'restaurant' && !selectedLayoutId ? '__restaurant' : selectedLayoutId || '__basic'}
                  onChange={(val: string) => {
                    if (val === '__basic') {
                      setSystemLayoutType('basic')
                      setSelectedLayoutId('')
                    } else if (val === '__restaurant') {
                      setSystemLayoutType('restaurant')
                      setSelectedLayoutId('')
                    } else {
                      setSystemLayoutType('basic')
                      setSelectedLayoutId(val)
                    }
                    setAiRecommendResult(null)
                  }}
                  disabled={!hasOpenAIKey}
                >
                  <div className="relative">
                    <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pl-3 pr-2 text-left text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="col-start-1 row-start-1 truncate pr-6">
                        {selectedLayoutId
                          ? layoutTemplates.find(l => l.id === selectedLayoutId)?.name || '레이아웃 선택'
                          : systemLayoutType === 'restaurant'
                            ? '음식점 리뷰'
                            : '기본 블로그'}
                      </span>
                      <ChevronUpDownIcon
                        aria-hidden="true"
                        className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                      />
                    </ListboxButton>
                    <ListboxOptions
                      transition
                      className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-1 outline-black/5 data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in sm:text-sm"
                    >
                      {/* System layouts */}
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">시스템 레이아웃</div>
                      <ListboxOption
                        value="__basic"
                        className="group relative cursor-default select-none py-2 pl-8 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white data-[focus]:outline-none"
                      >
                        <span className="block truncate font-normal group-data-[selected]:font-semibold">기본 블로그</span>
                        <span className="block truncate text-xs text-gray-500 group-data-[focus]:text-indigo-200">서론 · 본론 · 결론</span>
                        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 group-[:not([data-selected])]:hidden group-data-[focus]:text-white">
                          <CheckIcon aria-hidden="true" className="size-5" />
                        </span>
                      </ListboxOption>
                      <ListboxOption
                        value="__restaurant"
                        className="group relative cursor-default select-none py-2 pl-8 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white data-[focus]:outline-none"
                      >
                        <span className="block truncate font-normal group-data-[selected]:font-semibold">음식점 리뷰</span>
                        <span className="block truncate text-xs text-gray-500 group-data-[focus]:text-indigo-200">소개 · 인테리어 · 음식 · 결론</span>
                        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 group-[:not([data-selected])]:hidden group-data-[focus]:text-white">
                          <CheckIcon aria-hidden="true" className="size-5" />
                        </span>
                      </ListboxOption>
                      {/* Custom layouts */}
                      {layoutTemplates.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">커스텀 레이아웃</div>
                          {layoutTemplates.map((layout) => (
                            <ListboxOption
                              key={layout.id}
                              value={layout.id}
                              className="group relative cursor-default select-none py-2 pl-8 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white data-[focus]:outline-none"
                            >
                              <span className="block truncate font-normal group-data-[selected]:font-semibold">
                                {layout.name}
                              </span>
                              <span className="block truncate text-xs text-gray-500 group-data-[focus]:text-indigo-200">
                                {layout.isSystem ? '시스템' : `v${layout.version}`}
                                {layout.usageCount > 0 ? ` · ${layout.usageCount}회 사용` : ''}
                              </span>
                              <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-600 group-[:not([data-selected])]:hidden group-data-[focus]:text-white">
                                <CheckIcon aria-hidden="true" className="size-5" />
                              </span>
                            </ListboxOption>
                          ))}
                        </>
                      )}
                    </ListboxOptions>
                  </div>
                </Listbox>
                {aiRecommendResult && (
                  <div className="mt-2 bg-purple-50 rounded-lg p-2 text-xs">
                    <p className="font-medium text-purple-800">AI 추천: {aiRecommendResult.name}</p>
                    <p className="text-purple-600 mt-0.5">{aiRecommendResult.reason}</p>
                  </div>
                )}
              </div>

              {/* Basic Layout Fields */}
              {systemLayoutType === 'basic' && (
                <>
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
                </>
              )}

              {/* Restaurant Review Layout Fields */}
              {systemLayoutType === 'restaurant' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      음식점 이름 *
                    </label>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="예: 을지로 골목식당"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!hasOpenAIKey}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      음식점 분위기 <span className="text-gray-400 font-normal">(선택)</span>
                    </label>
                    <input
                      type="text"
                      value={restaurantAtmosphere}
                      onChange={(e) => setRestaurantAtmosphere(e.target.value)}
                      placeholder="생략 시 이미지 기반으로 작성"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasOpenAIKey}
                    />
                    <p className="text-xs text-gray-400 mt-1">비워두면 이미지를 기반으로 추측합니다.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      주문한 메뉴 및 설명 *
                    </label>
                    <textarea
                      value={restaurantMenus}
                      onChange={(e) => setRestaurantMenus(e.target.value)}
                      placeholder="예:&#10;- 된장찌개 (8,000원): 구수하고 깊은 맛&#10;- 제육볶음 (10,000원): 매콤달콤한 양념"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!hasOpenAIKey}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이미지 추가 <span className="text-gray-400 font-normal">(선택)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="restaurant-images"
                        onChange={(e) => {
                          // 이미지 미리보기 URL 생성
                          const files = Array.from(e.target.files || [])
                          const urls = files.map(f => URL.createObjectURL(f))
                          setRestaurantImages(prev => [...prev, ...urls])
                        }}
                        disabled={!hasOpenAIKey}
                      />
                      <label htmlFor="restaurant-images" className="cursor-pointer">
                        <span className="text-sm text-blue-600 font-medium">클릭하여 이미지 추가</span>
                        <p className="text-xs text-gray-400 mt-1">음식, 인테리어, 외관 사진</p>
                      </label>
                    </div>
                    {restaurantImages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {restaurantImages.map((url, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setRestaurantImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <XMarkIcon className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                </>
              )}

              <button
                type="submit"
                disabled={!hasOpenAIKey || generating || (systemLayoutType === 'basic' && !topic) || (systemLayoutType === 'restaurant' && (!restaurantName || !restaurantMenus))}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '생성 시작 중...' : '블로그 생성'}
              </button>
            </form>
          </div>

          {/* Middle: Jobs List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">생성 작업</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">작업 상세</h2>

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

                {/* Completed: Show Content */}
                {selectedJob.status === 'COMPLETED' && selectedJob.blogPost && (
                  <div className="space-y-4">
                    {/* Blog Post Preview Card */}
                    <div className="overflow-hidden bg-white shadow sm:rounded-lg ring-1 ring-black/5">
                      <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedJob.blogPost.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span>{new Date(selectedJob.createdAt).toLocaleDateString('ko-KR')}</span>
                          {selectedJob.tags && selectedJob.tags.length > 0 && (
                            <div className="flex gap-2">
                              {selectedJob.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-gray-100">
                        <div className="px-4 py-5 sm:p-6">
                          <div className="text-gray-700 line-clamp-3">
                            {selectedJob.blogPost.content.substring(0, 200)}...
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-6">
                        <button
                          onClick={() => setShowBlogModal(true)}
                          className="w-full inline-flex items-center justify-center gap-x-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                        >
                          전체 보기
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Generation Steps - Collapsible */}
                    {selectedJob.steps && (selectedJob.steps as any).stages && Array.isArray((selectedJob.steps as any).stages) && (
                      <div className="border-t pt-4">
                        <button
                          onClick={() => setShowSteps(!showSteps)}
                          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <span className="flex items-center gap-2">
                            생성 과정
                            <span className="text-xs text-gray-500">
                              ({((selectedJob.steps as any).stages as any[]).length}단계)
                            </span>
                          </span>
                          <svg
                            className={`h-5 w-5 transform transition-transform ${showSteps ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {showSteps && (
                          <div className="mt-3 space-y-3">
                            {((selectedJob.steps as any).stages as any[]).map((step) => (
                              <div
                                key={step.id}
                                className="flex items-start gap-3"
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
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Processing: Show Steps */}
                {(selectedJob.status === 'PROCESSING' || selectedJob.status === 'PENDING') && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      생성 과정
                    </h4>
                    {selectedJob.steps && (selectedJob.steps as any).stages && Array.isArray((selectedJob.steps as any).stages) ? (
                      <div className="space-y-3">
                        {((selectedJob.steps as any).stages as any[]).map((step) => (
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
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        생성 준비 중...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blog Post Modal */}
      {showBlogModal && selectedJob?.blogPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowBlogModal(false)}
          />
          
          {/* Modal Content */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
              {/* Close Button */}
              <button
                onClick={() => setShowBlogModal(false)}
                className="absolute top-4 right-4 z-10 rounded-full bg-white p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 shadow-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              {/* Blog Content */}
              <div className="max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {selectedJob.blogPost.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{new Date(selectedJob.createdAt).toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                    {selectedJob.tags && selectedJob.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {selectedJob.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-8 py-8">
                  <article className="prose prose-lg max-w-none">
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedJob.blogPost.content}
                    </div>
                  </article>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent px-8 py-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {selectedJob.processingTime && (
                        <span>생성 시간: {selectedJob.processingTime}초</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCopy(selectedJob.blogPost!.content, selectedJob.id)}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copiedId === selectedJob.id ? '복사됨!' : '복사하기'}
                      </button>
                      <button
                        onClick={() => {
                          handleEdit(selectedJob)
                          setShowBlogModal(false)
                        }}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        수정하기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Modals */}
      <LayoutMarketplaceModal
        isOpen={showLayoutMarketplace}
        onClose={() => setShowLayoutMarketplace(false)}
        onFork={handleForkLayout}
      />

      <ModelMarketplaceModal
        isOpen={showModelMarketplace}
        onClose={() => setShowModelMarketplace(false)}
        onFork={handleForkModel}
      />
    </div>
  )
}
