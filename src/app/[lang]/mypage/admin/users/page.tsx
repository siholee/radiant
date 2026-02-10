'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilSquareIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'EMPLOYEE' | 'ADMIN'
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string | null
  blogCount: number
  jobCount: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'USER' as 'USER' | 'EMPLOYEE' | 'ADMIN',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'USER' as 'USER' | 'EMPLOYEE' | 'ADMIN',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch users
  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/ko/mypage')
          return
        }
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, fetchUsers])

  // Invite user
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      setSuccessMessage(`${inviteForm.email}로 초대 메일을 발송했습니다.`)
      setShowInviteModal(false)
      setInviteForm({ email: '', name: '', role: 'USER' })
      fetchUsers(pagination.page, search)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setFormLoading(false)
    }
  }

  // Edit user
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setFormError(null)
    setFormLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      setSuccessMessage('사용자 정보가 업데이트되었습니다.')
      setShowEditModal(false)
      setSelectedUser(null)
      fetchUsers(pagination.page, search)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setFormLoading(false)
    }
  }

  // Reset password
  const handleResetPassword = async (user: User) => {
    if (!confirm(`${user.email}에게 비밀번호 재설정 메일을 발송하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setSuccessMessage(`${user.email}로 비밀번호 재설정 메일을 발송했습니다.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name || '',
      role: user.role,
    })
    setFormError(null)
    setShowEditModal(true)
  }

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            전체 사용자 목록 조회 및 관리
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              {successMessage}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <div className="flex items-center gap-2">
              <XCircleIcon className="h-5 w-5" />
              {error}
            </div>
          </div>
        )}

        {/* Search and Add Button */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="이메일 또는 이름으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setShowInviteModal(true)
              }}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              <span className="flex items-center gap-2">
                <UserPlusIcon className="h-5 w-5" />
                사용자 초대
              </span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 border-b border-gray-300 bg-white/75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8 dark:border-white/15 dark:bg-gray-900/75 dark:text-white"
                    >
                      사용자
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 hidden border-b border-gray-300 bg-white/75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:table-cell dark:border-white/15 dark:bg-gray-900/75 dark:text-white"
                    >
                      권한
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 hidden border-b border-gray-300 bg-white/75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter lg:table-cell dark:border-white/15 dark:bg-gray-900/75 dark:text-white"
                    >
                      이메일 인증
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 hidden border-b border-gray-300 bg-white/75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter lg:table-cell dark:border-white/15 dark:bg-gray-900/75 dark:text-white"
                    >
                      활동
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 border-b border-gray-300 bg-white/75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter dark:border-white/15 dark:bg-gray-900/75 dark:text-white"
                    >
                      가입일
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-10 border-b border-gray-300 bg-white/75 py-3.5 pl-3 pr-4 backdrop-blur backdrop-filter sm:pr-6 lg:pr-8 dark:border-white/15 dark:bg-gray-900/75"
                    >
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        로딩 중...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((user, userIdx) => (
                      <tr key={user.id}>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 lg:pl-8',
                          )}
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.name || '-'}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'hidden whitespace-nowrap px-3 py-4 text-sm sm:table-cell',
                          )}
                        >
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'hidden whitespace-nowrap px-3 py-4 text-sm lg:table-cell',
                          )}
                        >
                          <span
                            className={`text-xs ${user.emailVerified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                          >
                            {user.emailVerified ? '인증됨' : '미인증'}
                          </span>
                        </td>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell dark:text-gray-400',
                          )}
                        >
                          <div className="text-xs">
                            <div>블로그: {user.blogCount}</div>
                            <div>작업: {user.jobCount}</div>
                          </div>
                        </td>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400',
                          )}
                        >
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td
                          className={classNames(
                            userIdx !== users.length - 1 ? 'border-b border-gray-200 dark:border-white/10' : '',
                            'whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 lg:pr-8',
                          )}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              title="수정"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                              <span className="sr-only">, {user.name}</span>
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              title="비밀번호 재설정"
                            >
                              <KeyIcon className="h-5 w-5" />
                              <span className="sr-only">, {user.name}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <nav
            className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-gray-700 dark:bg-gray-800"
            aria-label="Pagination"
          >
          <div className="hidden sm:block">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              전체 <span className="font-medium">{pagination.total}</span>명 중{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>
              -{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>
              명 표시
            </p>
          </div>
          <div className="flex flex-1 justify-between sm:justify-end">
            <button
              onClick={() => fetchUsers(pagination.page - 1, search)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
            >
              이전
            </button>
            <button
              onClick={() => fetchUsers(pagination.page + 1, search)}
              disabled={pagination.page >= pagination.totalPages}
              className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
            >
              다음
            </button>
          </div>
        </nav>
      )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              새 사용자 초대
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이메일 *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름 *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  권한
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      role: e.target.value as 'USER' | 'EMPLOYEE' | 'ADMIN',
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="USER">USER</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              {formError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  {formLoading ? '처리 중...' : '초대 메일 발송'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              사용자 정보 수정
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedUser.email}
            </p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  권한
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as 'USER' | 'EMPLOYEE' | 'ADMIN',
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="USER">USER</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              {formError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  {formLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
