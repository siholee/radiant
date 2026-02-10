'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type AIModel = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

interface WritingStyleProfile {
  id: string;
  name: string;
  description: string | null;
  modelType: AIModel;
  userId: string;
  isPublic: boolean;
  usageCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string;
  };
  samples?: Array<{
    id: string;
    content: string;
  }>;
  _count?: {
    samples: number;
  };
}

type SortOption = 'usage' | 'recent';

const MODEL_BADGES: Record<AIModel, { label: string; color: string }> = {
  OPENAI: { label: 'GPT', color: 'bg-green-100 text-green-800 border-green-200' },
  GEMINI: { label: 'Gemini', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ANTHROPIC: { label: 'Claude', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export default function ModelMarketplacePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<WritingStyleProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<WritingStyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [sortBy]);

  useEffect(() => {
    filterProfiles();
  }, [searchQuery, profiles]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/writing-style/marketplace?sort=${sortBy}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      showMessage('error', `프로필을 불러오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(query) ||
        profile.description?.toLowerCase().includes(query) ||
        profile.user.name?.toLowerCase().includes(query) ||
        profile.user.email.toLowerCase().includes(query)
    );
    setFilteredProfiles(filtered);
  };

  const handleFork = async (profileId: string) => {
    try {
      setForkingId(profileId);
      const response = await fetch(`/api/writing-style/profiles/${profileId}/fork`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fork failed');
      }

      showMessage('success', '✅ 모델이 내 목록에 추가되었습니다');
      
      // Refresh to update usage count
      setTimeout(() => {
        fetchProfiles();
      }, 1000);
    } catch (error) {
      console.error('Error forking profile:', error);
      showMessage('error', error instanceof Error ? error.message : '복사에 실패했습니다');
    } finally {
      setForkingId(null);
    }
  };

  const toggleSample = (profileId: string) => {
    setExpandedSamples((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            글쓰기 모델 마켓플레이스
          </h1>
          <p className="text-lg text-gray-600">
            다른 사용자들이 공유한 글쓰기 스타일 모델을 탐색하고 복사하여 사용해보세요
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="이름, 설명, 작성자로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="usage">사용량순</option>
              <option value="recent">최신순</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">모델을 불러오는 중...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProfiles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg">
              {searchQuery ? '검색 결과가 없습니다' : '공개된 모델이 없습니다'}
            </p>
          </div>
        )}

        {/* Profile Grid */}
        {!loading && filteredProfiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 flex-1">
                      {profile.name}
                    </h3>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        MODEL_BADGES[profile.modelType].color
                      }`}
                    >
                      {MODEL_BADGES[profile.modelType].label}
                    </span>
                  </div>
                  {profile.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{profile.description}</p>
                  )}
                </div>

                {/* Creator Info */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">
                      {profile.user.name || profile.user.email.split('@')[0]}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 flex flex-wrap gap-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span>{profile.usageCount || 0}회 사용</span>
                  </div>
                  <div className="flex items-center">
                    <span>{profile._count?.samples || 0}개 샘플</span>
                  </div>
                  <div className="flex items-center">
                    <span>v{profile.version}</span>
                  </div>
                </div>

                {/* Sample Preview */}
                {profile.samples && profile.samples.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleSample(profile.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      {expandedSamples.has(profile.id) ? '▼' : '▶'} 샘플 미리보기
                    </button>
                    {expandedSamples.has(profile.id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700 max-h-40 overflow-y-auto">
                        {profile.samples[0].content}
                      </div>
                    )}
                  </div>
                )}

                {/* Fork Button */}
                <button
                  onClick={() => handleFork(profile.id)}
                  disabled={forkingId === profile.id}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    forkingId === profile.id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {forkingId === profile.id ? '복사 중...' : '📥 복사해 사용'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredProfiles.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            총 {filteredProfiles.length}개의 모델
            {searchQuery && profiles.length !== filteredProfiles.length && (
              <span> (전체 {profiles.length}개 중)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
