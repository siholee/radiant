'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'

interface HeroBanner {
  id: string
  imageUrl: string
  linkUrl: string | null
  title: string | null
  description: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string }
}

type AdminTab = 'banners' // 확장 가능한 탭 구조

export default function HomepageManagementPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('banners')
  const [banners, setBanners] = useState<HeroBanner[]>([]) // 로컬 편집용
  const [savedBanners, setSavedBanners] = useState<HeroBanner[]>([]) // DB 저장된 원본
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ linkUrl: '', title: '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs: { key: AdminTab; label: string; icon: typeof PhotoIcon }[] = [
    { key: 'banners', label: '배너 관리', icon: PhotoIcon },
    // 추후 탭 추가:
    // { key: 'seo', label: 'SEO 설정', icon: GlobeAltIcon },
    // { key: 'announcement', label: '공지사항', icon: MegaphoneIcon },
  ]

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/hero-banners')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBanners(data.banners || [])
      setSavedBanners(data.banners || [])
      setHasChanges(false)
    } catch (err) {
      setError('배너 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  // 변경사항 감지
  useEffect(() => {
    const changed = JSON.stringify(banners) !== JSON.stringify(savedBanners)
    setHasChanges(changed)
  }, [banners, savedBanners])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)

      // 이미지 업로드만 수행
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/admin/hero-banners/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { imageUrl } = await uploadRes.json()

      // 로컬 state에만 추가 (DB에는 아직 저장 안 됨)
      const newBanner: HeroBanner = {
        id: `temp-${Date.now()}`, // 임시 ID
        imageUrl,
        linkUrl: null,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: null,
        isActive: true,
        sortOrder: banners.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setBanners([...banners, newBanner])
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleToggleActive = (banner: HeroBanner) => {
    setBanners(
      banners.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b))
    )
  }

  const handleDelete = (id: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return
    setBanners(banners.filter((b) => b.id !== id))
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newBanners = [...banners]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newBanners.length) return

    // 순서 교환
    const temp = newBanners[index].sortOrder
    newBanners[index].sortOrder = newBanners[swapIndex].sortOrder
    newBanners[swapIndex].sortOrder = temp
    ;[newBanners[index], newBanners[swapIndex]] = [
      newBanners[swapIndex],
      newBanners[index],
    ]
    setBanners(newBanners)
  }

  const startEdit = (banner: HeroBanner) => {
    setEditingId(banner.id)
    setEditForm({
      linkUrl: banner.linkUrl || '',
      title: banner.title || '',
      description: banner.description || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ linkUrl: '', title: '', description: '' })
  }

  const saveEdit = () => {
    if (!editingId) return

    setBanners(
      banners.map((b) =>
        b.id === editingId
          ? { ...b, linkUrl: editForm.linkUrl, title: editForm.title, description: editForm.description }
          : b
      )
    )
    cancelEdit()
  }

  const handleImageReplace = async (bannerId: string, file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/admin/hero-banners/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      const { imageUrl } = await uploadRes.json()

      setBanners(banners.map((b) => (b.id === bannerId ? { ...b, imageUrl } : b)))
    } catch {
      setError('이미지 교체에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDragDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const newBanners = [...banners]
    const [moved] = newBanners.splice(fromIndex, 1)
    newBanners.splice(toIndex, 0, moved)

    // sortOrder 재설정
    newBanners.forEach((b, i) => {
      b.sortOrder = i
    })

    setBanners(newBanners)
  }

  // 적용 버튼: 모든 변경사항을 DB에 저장
  const handleApplyChanges = async () => {
    if (!hasChanges) return

    try {
      setApplying(true)
      setError(null)

      // 1. 새 배너 생성 (temp- ID인 것들)
      const newBanners = banners.filter((b) => b.id.startsWith('temp-'))
      for (const banner of newBanners) {
        const res = await fetch('/api/admin/hero-banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl,
            title: banner.title,
            description: banner.description,
          }),
        })
        if (!res.ok) throw new Error('Failed to create banner')
      }

      // 2. 기존 배너 업데이트 (temp-가 아닌 것들)
      const existingBanners = banners.filter((b) => !b.id.startsWith('temp-'))
      for (const banner of existingBanners) {
        const original = savedBanners.find((sb) => sb.id === banner.id)
        if (!original) continue

        // 변경사항 확인
        const hasUpdate =
          banner.linkUrl !== original.linkUrl ||
          banner.title !== original.title ||
          banner.description !== original.description ||
          banner.isActive !== original.isActive ||
          banner.imageUrl !== original.imageUrl

        if (hasUpdate) {
          const res = await fetch(`/api/admin/hero-banners/${banner.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: banner.imageUrl,
              linkUrl: banner.linkUrl,
              title: banner.title,
              description: banner.description,
              isActive: banner.isActive,
            }),
          })
          if (!res.ok) throw new Error('Failed to update banner')
        }
      }

      // 3. 삭제된 배너 처리
      const deletedBannerIds = savedBanners
        .filter((sb) => !banners.find((b) => b.id === sb.id))
        .map((sb) => sb.id)

      for (const id of deletedBannerIds) {
        const res = await fetch(`/api/admin/hero-banners/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to delete banner')
      }

      // 4. 순서 업데이트
      const orders = banners
        .filter((b) => !b.id.startsWith('temp-'))
        .map((b, i) => ({ id: b.id, sortOrder: i }))

      if (orders.length > 0) {
        const res = await fetch('/api/admin/hero-banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders }),
        })
        if (!res.ok) throw new Error('Failed to update order')
      }

      setSuccess('변경사항이 성공적으로 적용되었습니다.')
      setTimeout(() => setSuccess(null), 3000)
      await fetchBanners()
    } catch (err: any) {
      setError(err.message || '변경사항 적용에 실패했습니다.')
    } finally {
      setApplying(false)
    }
  }

  const handleResetChanges = () => {
    if (!confirm('모든 변경사항을 취소하시겠습니까?')) return
    setBanners(savedBanners)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">홈페이지 관리</h1>
            <p className="mt-2 text-sm text-gray-500">
              홈페이지의 배너, 콘텐츠 등을 관리합니다.
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleResetChanges}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4" />
                취소
              </button>
              <button
                onClick={handleApplyChanges}
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    적용 중...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-5 w-5" />
                    변경사항 적용
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 성공 메시지 */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckIcon className="h-5 w-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 배너 관리 탭 */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            {/* 업로드 영역 */}
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                id="banner-upload"
              />
              <label
                htmlFor="banner-upload"
                className="cursor-pointer"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-600">업로드 중...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                      <PlusIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-indigo-600">
                        클릭하여 이미지 업로드
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        JPG, PNG, WebP, GIF, SVG • 최대 10MB • 권장 크기: 1920×600px
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* 배너 목록 */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : banners.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-16 text-center">
                <PhotoIcon className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">배너가 없습니다</h3>
                <p className="mt-2 text-sm text-gray-500">
                  위 버튼을 클릭하여 첫 번째 히어로 배너를 추가하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    배너 목록 ({banners.length}개)
                  </h2>
                  <button
                    onClick={fetchBanners}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    새로고침
                  </button>
                </div>

                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className={`group relative overflow-hidden rounded-2xl bg-white border transition-all ${
                      banner.isActive
                        ? 'border-gray-200 shadow-sm'
                        : 'border-gray-200 opacity-60'
                    } ${dragOverIndex === index ? 'ring-2 ring-indigo-500' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString())
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverIndex(index)
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverIndex(null)
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                      handleDragDrop(fromIndex, index)
                    }}
                  >
                    <div className="flex gap-4 p-4">
                      {/* 이미지 프리뷰 */}
                      <div className="relative h-32 w-56 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title || '배너 이미지'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = ''
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        {/* 이미지 교체 오버레이 */}
                        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageReplace(banner.id, file)
                            }}
                          />
                          <div className="text-center">
                            <PhotoIcon className="mx-auto h-6 w-6 text-white" />
                            <span className="mt-1 block text-xs text-white">이미지 교체</span>
                          </div>
                        </label>
                        {/* 순서 표시 */}
                        <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                          {index + 1}
                        </div>
                      </div>

                      {/* 정보 영역 */}
                      <div className="flex flex-1 flex-col justify-between">
                        {editingId === banner.id ? (
                          /* 수정 모드 */
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">제목</label>
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="배너 제목"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                <LinkIcon className="inline h-3 w-3 mr-1" />
                                클릭 시 이동 링크
                              </label>
                              <input
                                type="url"
                                value={editForm.linkUrl}
                                onChange={(e) => setEditForm((f) => ({ ...f, linkUrl: e.target.value }))}
                                placeholder="https://example.com/page"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">설명</label>
                              <input
                                type="text"
                                value={editForm.description}
                                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="배너 설명 (선택)"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                              >
                                <CheckIcon className="h-4 w-4" />
                                저장
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <XMarkIcon className="h-4 w-4" />
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 표시 모드 */
                          <>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {banner.title || '(제목 없음)'}
                                </h3>
                                {!banner.isActive && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                    비활성
                                  </span>
                                )}
                              </div>
                              {banner.description && (
                                <p className="mt-1 text-sm text-gray-500">{banner.description}</p>
                              )}
                              {banner.linkUrl && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                                  <LinkIcon className="h-3 w-3" />
                                  <a
                                    href={banner.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline truncate max-w-xs"
                                  >
                                    {banner.linkUrl}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              {banner.user?.name && `${banner.user.name} · `}
                              {new Date(banner.createdAt).toLocaleDateString('ko-KR')}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      {editingId !== banner.id && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                              title="위로 이동"
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === banners.length - 1}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                              title="아래로 이동"
                            >
                              <ArrowDownIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(banner)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="수정"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(banner)}
                              className={`rounded-lg p-1.5 ${
                                banner.isActive
                                  ? 'text-green-500 hover:bg-green-50 hover:text-green-600'
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                              }`}
                              title={banner.isActive ? '비활성화' : '활성화'}
                            >
                              {banner.isActive ? (
                                <EyeIcon className="h-4 w-4" />
                              ) : (
                                <EyeSlashIcon className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(banner.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="삭제"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 안내 */}
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6">
              <h3 className="font-semibold text-indigo-900">배너 관리 안내</h3>
              <ul className="mt-3 space-y-2 text-sm text-indigo-700">
                <li>• 배너는 순서대로 홈페이지 히어로 영역에 캐러셀로 표시됩니다.</li>
                <li>• 드래그 앤 드롭 또는 화살표 버튼으로 순서를 변경할 수 있습니다.</li>
                <li>• 각 배너에 클릭 시 이동할 링크를 설정할 수 있습니다.</li>
                <li>• 비활성화된 배너는 홈페이지에 표시되지 않습니다.</li>
                <li>• 권장 이미지 크기: 1920×600px (16:5 비율)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
