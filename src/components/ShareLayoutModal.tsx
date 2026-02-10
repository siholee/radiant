'use client'

import { useState } from 'react'
import { XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface ShareLayoutModalProps {
  isOpen: boolean
  onClose: () => void
  layoutId: string
  currentName: string
  currentDescription: string | null
  onShare: (layoutId: string, name: string, description: string) => Promise<void>
}

export default function ShareLayoutModal({
  isOpen,
  onClose,
  layoutId,
  currentName,
  currentDescription,
  onShare
}: ShareLayoutModalProps) {
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription || '')
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('레이아웃 이름을 입력해주세요')
      return
    }

    setSharing(true)
    setError('')

    try {
      await onShare(layoutId, name, description)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유에 실패했습니다')
    } finally {
      setSharing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudArrowUpIcon className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">마켓에 공유하기</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-white hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              다른 사용자들과 레이아웃을 공유합니다. 공유할 레이아웃의 이름과 설명을 작성해주세요.
            </p>

            {/* Name Input */}
            <div>
              <label htmlFor="layout-name" className="block text-sm font-medium text-gray-700 mb-1">
                레이아웃 이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="layout-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 네이버 블로그 스타일"
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/50자</p>
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="layout-description" className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                id="layout-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 레이아웃의 특징을 설명해주세요"
                rows={4}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/200자</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={sharing || !name.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {sharing ? '공유 중...' : '🚀 공유하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
