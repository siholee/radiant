'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function MypageDashboard() {
  const { t } = useTranslation('common')

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('mypage.welcome')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('mypage.comingSoon')}
          </p>
        </div>

        {/* Placeholder Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Card 1 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">{t('mypage.comingSoon')}</p>
              </div>
            </div>
          </div>

          {/* Placeholder Card 2 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-sm">{t('mypage.comingSoon')}</p>
              </div>
            </div>
          </div>

          {/* Placeholder Card 3 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">{t('mypage.comingSoon')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('mypage.comingSoon')}
          </h2>
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <svg className="mx-auto h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg">{t('mypage.comingSoon')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
