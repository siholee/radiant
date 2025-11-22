'use client'

import React from 'react'
import { Navbar } from './navbar'

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const totalSlides = 3 // 캐러셀 이미지 개수

  return (
    <>
      <Navbar />
      <div className="pt-28 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
            {/* 이미지가 여기에 들어갈 예정 */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200" />
            
            {/* 인디케이터 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-gray-800/30 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
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
          </div>
        </div>
      </div>
    </>
  )
}
