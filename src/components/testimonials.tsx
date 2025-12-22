'use client'

import { clsx } from 'clsx'
import {
  MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  type HTMLMotionProps,
} from 'framer-motion'
import { useCallback, useLayoutEffect, useRef } from 'react'
import useMeasure, { type RectReadOnly } from 'react-use-measure'
import { Container } from './container'
import { Heading, Subheading } from './text'

const testimonials = [
  {
    img: '/testimonials/tina-yards.jpg',
    name: '김민지',
    title: '마케팅 디렉터, 테크스타트업',
    quote:
      'SNS 마케팅을 맡긴 후 브랜드 인지도가 3배 이상 상승했어요. 전문적인 콘텐츠 기획력이 정말 인상적이었습니다.',
  },
  {
    img: '/testimonials/conor-neville.jpg',
    name: '박준호',
    title: '대표이사, 뷰티 브랜드',
    quote:
      '인스타그램 팔로워가 6개월 만에 10만 돌파했습니다. 트렌디한 콘텐츠와 정확한 타겟팅 덕분이에요.',
  },
  {
    img: '/testimonials/amy-chase.jpg',
    name: '이서연',
    title: 'CMO, 패션 커머스',
    quote:
      '광고 효율이 이전 대비 2배 이상 개선되었어요. ROI를 확실하게 체감할 수 있었습니다.',
  },
  {
    img: '/testimonials/veronica-winton.jpg',
    name: '최동욱',
    title: '마케팅 팀장, F&B 프랜차이즈',
    quote:
      '매장 방문율이 눈에 띄게 증가했습니다. SNS를 통한 고객 유입이 매출에 직접적으로 연결되고 있어요.',
  },
  {
    img: '/testimonials/dillon-lenora.jpg',
    name: '정하은',
    title: '브랜드 매니저, 라이프스타일 브랜드',
    quote: '바이럴 마케팅의 정석을 보여주셨어요. 단기간에 브랜드 이미지가 완전히 달라졌습니다.',
  },
  {
    img: '/testimonials/harriet-arron.jpg',
    name: '강민수',
    title: '대표, IT 스타트업',
    quote:
      '적은 예산으로도 최대의 효과를 낼 수 있었습니다. 데이터 기반 분석과 전략이 탁월해요.',
  },
]

function TestimonialCard({
  name,
  title,
  img,
  children,
  bounds,
  scrollX,
  onClick,
  ...props
}: {
  img: string
  name: string
  title: string
  children: React.ReactNode
  bounds: RectReadOnly
  scrollX: MotionValue<number>
  onClick?: () => void
} & HTMLMotionProps<'div'>) {
  let ref = useRef<HTMLDivElement | null>(null)

  let computeOpacity = useCallback(() => {
    let element = ref.current
    if (!element || bounds.width === 0) return 1

    let rect = element.getBoundingClientRect()

    if (rect.left < bounds.left) {
      let diff = bounds.left - rect.left
      let percent = diff / rect.width
      return Math.max(0.5, 1 - percent)
    } else if (rect.right > bounds.right) {
      let diff = rect.right - bounds.right
      let percent = diff / rect.width
      return Math.max(0.5, 1 - percent)
    } else {
      return 1
    }
  }, [ref, bounds.width, bounds.left, bounds.right])

  let opacity = useSpring(computeOpacity(), {
    stiffness: 154,
    damping: 23,
  })

  useLayoutEffect(() => {
    opacity.set(computeOpacity())
  }, [computeOpacity, opacity])

  useMotionValueEvent(scrollX, 'change', () => {
    opacity.set(computeOpacity())
  })

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      {...props}
      className="relative flex aspect-9/16 w-72 shrink-0 snap-start scroll-ml-(--scroll-padding) flex-col justify-end overflow-hidden rounded-3xl sm:aspect-3/4 sm:w-96 select-none cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
    >
      <img
        alt=""
        src={img}
        className="absolute inset-x-0 top-0 aspect-square w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl bg-linear-to-t from-black from-[calc(7/16*100%)] ring-1 ring-gray-950/10 ring-inset sm:from-25%"
      />
      <figure className="relative p-10">
        <blockquote>
          <p className="relative text-xl/7 text-white">
            <span aria-hidden="true" className="absolute -translate-x-full">
              “
            </span>
            {children}
            <span aria-hidden="true" className="absolute">
              ”
            </span>
          </p>
        </blockquote>
        <figcaption className="mt-6 border-t border-white/20 pt-6">
          <p className="text-sm/6 font-medium text-white">{name}</p>
          <p className="text-sm/6 font-medium">
            <span className="bg-linear-to-r from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent">
              {title}
            </span>
          </p>
        </figcaption>
      </figure>
    </motion.div>
  )
}

export function Testimonials() {
  let scrollRef = useRef<HTMLDivElement | null>(null)
  let { scrollX } = useScroll({ container: scrollRef })
  let [setReferenceWindowRef, bounds] = useMeasure()

  const scrollToCard = useCallback((index: number) => {
    if (scrollRef.current && scrollRef.current.children[index]) {
      const card = scrollRef.current.children[index] as HTMLElement
      const scrollContainer = scrollRef.current
      const containerWidth = scrollContainer.offsetWidth
      const cardWidth = card.offsetWidth
      const cardLeft = card.offsetLeft
      const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2)
      
      scrollContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' })
    }
  }, [])

  useLayoutEffect(() => {
    // 페이지 로드 시 3번째 카드로 스크롤 (인덱스 2)
    scrollToCard(2)
  }, [scrollToCard])

  return (
    <div className="overflow-hidden py-32">
      <Container>
        <div ref={setReferenceWindowRef}>
          <Subheading>Review</Subheading>
          <Heading as="h3" className="mt-2">
            전문가들이 선택한 파트너
          </Heading>
        </div>
      </Container>
      <div
        ref={scrollRef}
        className={clsx([
          'mt-16 flex gap-8 px-(--scroll-padding)',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'overflow-x-auto scroll-smooth',
          '[--scroll-padding:max(--spacing(6),calc((100vw-(var(--container-2xl)))/2))] lg:[--scroll-padding:max(--spacing(8),calc((100vw-(var(--container-7xl)))/2))]',
        ])}
      >
        {testimonials.map(({ img, name, title, quote }, testimonialIndex) => (
          <TestimonialCard
            key={testimonialIndex}
            name={name}
            title={title}
            img={img}
            bounds={bounds}
            scrollX={scrollX}
            onClick={() => scrollToCard(testimonialIndex)}
          >
            {quote}
          </TestimonialCard>
        ))}
        <div className="w-2xl shrink-0 sm:w-216" />
      </div>
    </div>
  )
}
