'use client'

import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon, UserIcon, FireIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface LayoutTemplate {
  id: string
  name: string
  description: string | null
  promptInstruction: string
  isSystem: boolean
  isPublic: boolean
  usageCount: number
  previewSample: string | null
  version: number
  createdAt: string
  user?: { id: string; name: string } | null
}

interface LayoutMarketplaceModalProps {
  isOpen: boolean
  onClose: () => void
  onFork: (templateId: string) => Promise<void>
}

export default function LayoutMarketplaceModal({ isOpen, onClose, onFork }: LayoutMarketplaceModalProps) {
  const [templates, setTemplates] = useState<LayoutTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'usage' | 'recent'>('usage')
  const [forking, setForking] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/blog-layout/marketplace')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates
    .filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'usage') return b.usageCount - a.usageCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const handleFork = async (templateId: string) => {
    setForking(templateId)
    try {
      await onFork(templateId)
      onClose()
    } catch (error) {
      console.error('Fork failed:', error)
    } finally {
      setForking(null)
    }
  }

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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header with Apple-style gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-8 py-6">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <Dialog.Title className="text-2xl font-semibold tracking-tight text-gray-900">
                          레이아웃 마켓플레이스
                        </Dialog.Title>
                        <p className="mt-1.5 text-sm text-gray-600">
                          검증된 레이아웃 템플릿을 선택하고 나만의 블로그를 시작하세요
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
                  
                  {/* Decorative blur circles */}
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-200/30 blur-3xl" />
                  <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-200/30 blur-3xl" />
                </div>

                {/* Controls */}
                <div className="border-b border-gray-100 bg-gray-50/50 px-8 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="템플릿 검색..."
                        className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSortBy('usage')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          sortBy === 'usage'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        인기순
                      </button>
                      <button
                        onClick={() => setSortBy('recent')}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          sortBy === 'recent'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        최신순
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white px-8 py-6">
                  {loading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                      <DocumentTextIcon className="mb-3 h-12 w-12 text-gray-300" />
                      <p className="text-sm">검색 결과가 없습니다</p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                        >
                          {/* Badge */}
                          <div className="mb-3 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                              <SparklesIcon className="h-3.5 w-3.5" />
                              v{template.version}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5" />
                                {template.user?.name || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1 font-medium text-blue-600">
                                <FireIcon className="h-3.5 w-3.5" />
                                {template.usageCount}회
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                            {template.name}
                          </h3>
                          <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                            {template.description || '설명 없음'}
                          </p>

                          {/* Preview */}
                          {template.previewSample && (
                            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                              <p className="line-clamp-3">{template.previewSample}</p>
                            </div>
                          )}

                          {/* Action Button */}
                          <button
                            onClick={() => handleFork(template.id)}
                            disabled={forking === template.id}
                            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                          >
                            {forking === template.id ? '가져오는 중...' : '템플릿 가져오기'}
                          </button>
                        </div>
                      ))}
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
