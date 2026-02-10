'use client'

import React, { useEffect, useCallback } from 'react'
import { Navbar } from './navbar'

interface Banner {
  id: string
  imageUrl: string
  linkUrl: string | null
  title: string | null
  description: string | null
}

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [banners, setBanners] = React.useState<Banner[]>([])
  const [loading, setLoading] = React.useState(true)

  useEffect(() => {
    fetch('/api/hero-banners')
      .then((res) => res.json())
      .then((data) => {
        setBanners(data.banners || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 자동 슬라이드 (5초 간격)
  const nextSlide = useCallback(() => {
    if (banners.length <= 1) return
    setCurrentSlide((prev) => (prev + 1) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [nextSlide, banners.length])

  const totalSlides = banners.length || 1
  const currentBanner = banners[currentSlide]

  const slideContent = (
    <div className="absolute inset-0 transition-opacity duration-700">
      {loading || banners.length === 0 ? (
        // 기본 그라디언트 배경 (배너 없을 때)
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200" />
      ) : (
        <img
          src={currentBanner?.imageUrl}
          alt="배너"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="pt-28 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
            {currentBanner?.linkUrl ? (
              <a
                href={currentBanner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 cursor-pointer"
              >
                {slideContent}
              </a>
            ) : (
              slideContent
            )}

            {/* 인디케이터 */}
            {totalSlides > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gray-800/30 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-2">
                  {Array.from({ length: totalSlides }).map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCurrentSlide(index)
                      }}
                      className="group relative"
                      aria-label={`Slide ${index + 1}`}
                    >
                      <div
                        className={`rounded-full bg-white transition-all duration-300 ${
                          currentSlide === index
                            ? 'w-2 h-2'
                            : 'w-1.5 h-1.5 opacity-60 group-hover:opacity-80'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
