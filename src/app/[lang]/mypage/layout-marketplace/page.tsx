'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LayoutTemplate {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isSystem: boolean;
  version: string;
  usageCount: number;
  sections: any;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

type SortOption = 'usage' | 'recent';

export default function LayoutMarketplacePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<LayoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, [sortBy]);

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter((template) => {
      const nameMatch = template.name.toLowerCase().includes(query);
      const descMatch = template.description?.toLowerCase().includes(query);
      const creatorMatch = template.user?.name?.toLowerCase().includes(query);
      return nameMatch || descMatch || creatorMatch;
    });
    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/blog-layout/marketplace?sort=${sortBy}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setTemplates(data.templates || []);
      setFilteredTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(`템플릿을 불러오는데 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFork = async (templateId: string) => {
    setForkingId(templateId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/blog-layout/${templateId}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fork template');
      }

      const data = await response.json();
      setSuccessMessage('레이아웃이 내 템플릿 목록에 추가되었습니다');
      
      // Refresh templates to update usage count
      setTimeout(() => {
        fetchTemplates();
      }, 500);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error forking template:', err);
      setError(err instanceof Error ? err.message : '템플릿 복사에 실패했습니다.');
    } finally {
      setForkingId(null);
    }
  };

  const togglePreview = (templateId: string) => {
    setExpandedPreview(expandedPreview === templateId ? null : templateId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderPreview = (sections: any) => {
    if (!sections) return null;
    
    try {
      const sectionData = typeof sections === 'string' ? JSON.parse(sections) : sections;
      return (
        <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
          {JSON.stringify(sectionData, null, 2)}
        </pre>
      );
    } catch (err) {
      return <p className="text-xs text-red-500">미리보기를 표시할 수 없습니다</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            레이아웃 마켓플레이스
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            다른 사용자가 공유한 블로그 레이아웃 템플릿을 탐색하고 복사하여 사용하세요
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-300 font-medium">
              ✓ {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-300 font-medium">
              ✗ {error}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="템플릿 이름, 설명, 제작자로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="usage">사용량순</option>
              <option value="recent">최신순</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                템플릿을 불러오는 중...
              </p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {searchQuery
                ? '검색 결과가 없습니다.'
                : '공개된 템플릿이 없습니다.'}
            </p>
          </div>
        ) : (
          /* Template Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  {/* Template Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        {template.isSystem && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            System
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 mb-4 text-sm">
                    {!template.isSystem && template.user && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {template.user.name || template.user.email}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      v{template.version}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      사용 {template.usageCount}회
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(template.createdAt)}
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="mb-4">
                    <button
                      onClick={() => togglePreview(template.id)}
                      className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {expandedPreview === template.id ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          미리보기 숨기기
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          미리보기 보기
                        </>
                      )}
                    </button>
                    {expandedPreview === template.id && (
                      <div className="mt-3">
                        {renderPreview(template.sections)}
                      </div>
                    )}
                  </div>

                  {/* Fork Button */}
                  <button
                    onClick={() => handleFork(template.id)}
                    disabled={forkingId === template.id}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {forkingId === template.id ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        복사 중...
                      </>
                    ) : (
                      <>
                        📥 복사해 사용
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
