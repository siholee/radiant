import { Container } from '@/components/container'
import { Footer } from '@/components/footer'
import { Gradient, GradientBackground } from '@/components/gradient'
import { LogoCloud } from '@/components/logo-cloud'
import { Navbar } from '@/components/navbar'
import { Heading, Lead, Subheading } from '@/components/text'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketing',
  description:
    '블로그, SNS, 영상까지 콘텐츠 마케팅의 모든 것을 제공합니다. 지금 시작하세요.',
}

type PriceItem = {
  label: string
  amount: number
  originalAmount?: number
  unit: string
  note?: string
  subtitle: string
}

type Tier = {
  name: 'Standard' | 'Deluxe' | 'Premium'
  slug: string
  description: string
  priceMonthly: number | null
  originalPrice?: number
  priceUnit?: string | null
  priceNote?: string
  prices: PriceItem[]
  href: string
  highlights: Array<{ description: string; subtitle?: string }>
  features: Array<{ section: string; name: string; value: string | number | boolean }>
}

const tiers = [
  {
    name: 'Standard' as const,
    slug: 'standard',
    description: '가볍게 시작하기 좋은 기본 플랜',
    priceMonthly: null,
    priceUnit: null,
    prices: [
      { label: '블로그 포스팅', amount: 30000, unit: '/ 건', subtitle: '2,000자 이상' },
      { label: '블로그 포스팅 (이미지 포함)', amount: 50000, unit: '/ 건', subtitle: '2,000자 이상 + 썸네일 1개 제작 + 상업적 무료 이미지 15개 이상 삽입' },
      { label: '카드형 SNS 포스팅', amount: 70000, unit: '/ 건', subtitle: '카드 이미지 6개 이상' },
      { label: '숏폼 영상', amount: 100000, unit: '/ 건', subtitle: '20~40초 길이 영상 제작' },
    ],
    href: '#',
    highlights: [],
    features: [
      { section: 'Features', name: 'Accounts', value: 3 },
      { section: 'Features', name: 'Deal progress boards', value: 5 },
      { section: 'Features', name: 'Sourcing platforms', value: 'Select' },
      { section: 'Features', name: 'Contacts', value: 100 },
      { section: 'Features', name: 'AI assisted outreach', value: false },
      { section: 'Analysis', name: 'Competitor analysis', value: false },
      { section: 'Analysis', name: 'Dashboard reporting', value: false },
      { section: 'Analysis', name: 'Community insights', value: false },
      { section: 'Analysis', name: 'Performance analysis', value: false },
      { section: 'Support', name: 'Email support', value: true },
      { section: 'Support', name: '24 / 7 call center support', value: false },
      { section: 'Support', name: 'Dedicated account manager', value: false },
    ],
  },
  {
    name: 'Deluxe' as const,
    slug: 'deluxe',
    description: '소셜 마케팅 관리 올인원',
    priceMonthly: null,
    priceUnit: null,
    prices: [
      { label: '블로그 포스팅', amount: 100000, originalAmount: 120000, unit: '/ 월', note: '(4회 기준)', subtitle: '2,000자 이상' },
      { label: '블로그 포스팅 (이미지 포함)', amount: 150000, originalAmount: 200000, unit: '/ 월', note: '(4회 기준)', subtitle: '2,000자 이상 + 썸네일 1개 제작 + 상업적 무료 이미지 15개 이상 삽입' },
      { label: '카드형 SNS 포스팅', amount: 200000, originalAmount: 280000, unit: '/ 월', note: '(4회 기준)', subtitle: '카드 이미지 6개 이상' },
      { label: '숏폼 영상', amount: 350000, originalAmount: 400000, unit: '/ 월', note: '(4회 기준)', subtitle: '20~40초 길이 영상 제작' },
    ],
    href: '#',
    highlights: [
      { description: '*추가 포스팅은 상담을 통해 유연하게 조정 가능' },
    ],
    features: [
      { section: 'Features', name: 'Accounts', value: 10 },
      { section: 'Features', name: 'Deal progress boards', value: 'Unlimited' },
      { section: 'Features', name: 'Sourcing platforms', value: '100+' },
      { section: 'Features', name: 'Contacts', value: 1000 },
      { section: 'Features', name: 'AI assisted outreach', value: true },
      { section: 'Analysis', name: 'Competitor analysis', value: '5 / month' },
      { section: 'Analysis', name: 'Dashboard reporting', value: true },
      { section: 'Analysis', name: 'Community insights', value: true },
      { section: 'Analysis', name: 'Performance analysis', value: true },
      { section: 'Support', name: 'Email support', value: true },
      { section: 'Support', name: '24 / 7 call center support', value: true },
      { section: 'Support', name: 'Dedicated account manager', value: false },
    ],
  },
  {
    name: 'Premium' as const,
    slug: 'premium',
    description: '영상부터 광고까지 풀패키지 솔루션',
    priceMonthly: 500000,
    originalPrice: 700000,
    priceUnit: '/ 월',
    priceNote: '(4회 기준)',
    prices: [],
    href: '#',
    highlights: [
      { description: '블로그 포스팅', subtitle: '2,000자 이상' },
      { description: '블로그 포스팅 (이미지 포함)', subtitle: '2,000자 이상 + 썸네일 1개 제작 + 상업적 무료 이미지 15개 이상 삽입' },
      { description: '카드형 SNS 포스팅', subtitle: '카드 이미지 6개 이상' },
      { description: '숏폼 영상', subtitle: '20~40초 길이 영상 제작' },
      { description: '*추가 포스팅은 상담을 통해 유연하게 조정 가능' },
      { description: '*매월 유라시스 서비스 무료 또는 할인 리워드 제공' },
    ],
    features: [
      { section: 'Features', name: 'Accounts', value: 'Unlimited' },
      { section: 'Features', name: 'Deal progress boards', value: 'Unlimited' },
      { section: 'Features', name: 'Sourcing platforms', value: '100+' },
      { section: 'Features', name: 'Contacts', value: 'Unlimited' },
      { section: 'Features', name: 'AI assisted outreach', value: true },
      { section: 'Analysis', name: 'Competitor analysis', value: 'Unlimited' },
      { section: 'Analysis', name: 'Dashboard reporting', value: true },
      { section: 'Analysis', name: 'Community insights', value: true },
      { section: 'Analysis', name: 'Performance analysis', value: true },
      { section: 'Support', name: 'Email support', value: true },
      { section: 'Support', name: '24 / 7 call center support', value: true },
      { section: 'Support', name: 'Dedicated account manager', value: true },
    ],
  },
]

function Header() {
  return (
    <Container className="mt-16">
      <Heading as="h1">합리적인 가격으로 시작하는 콘텐츠 마케팅</Heading>
      <Lead className="mt-6 max-w-3xl">
        블로그부터 숏폼 영상까지, 당신의 비즈니스에 딱 맞는 플랜을 선택하세요.<br />
        전문가가 제작하는 고품질 콘텐츠로 브랜드를 성장시키세요.
      </Lead>
    </Container>
  )
}

function PricingCards() {
  return (
    <div className="relative py-24">
      <Gradient className="absolute inset-x-2 top-48 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier, tierIndex) => (
            <PricingCard key={tierIndex} tier={tier} />
          ))}
        </div>
        <LogoCloud className="mt-24" />
      </Container>
    </div>
  )
}

function PricingCard({ tier }: { tier: Tier }) {
  const hasPrices = tier.prices && tier.prices.length > 0
  const hasHighlights = tier.highlights && tier.highlights.length > 0
  
  return (
    <div className="-m-2 grid grid-cols-1 rounded-4xl shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 ring-black/5 max-lg:mx-auto max-lg:w-full max-lg:max-w-md">
      <div className="grid grid-cols-1 rounded-4xl p-2 shadow-md shadow-black/5">
        <div className="rounded-3xl bg-white p-10 pb-9 shadow-2xl ring-1 ring-black/5">
          <Subheading>{tier.name}</Subheading>
          <p className="mt-2 text-sm/6 text-gray-950/75">{tier.description}</p>
          
          {tier.priceMonthly && (
            <div className="mt-8">
              {tier.originalPrice && (
                <div className="mb-2">
                  <span className="text-2xl text-gray-950/40 line-through">
                    {tier.originalPrice.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="text-5xl font-medium text-gray-950">
                  {tier.priceMonthly.toLocaleString('ko-KR')}원
                </div>
                <div className="text-sm/5 text-gray-950/75">
                  <p>{tier.priceUnit || '/ 월'}</p>
                  {tier.priceNote && (
                    <p className="text-xs">{tier.priceNote}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {hasPrices && (
            <div className="mt-8 space-y-6">
              {tier.prices.map((price, index) => (
                <div key={index}>
                  <div className="text-sm/6 font-medium text-gray-950">{price.label}</div>
                  {price.originalAmount && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-950/40 line-through">
                        {price.originalAmount.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  )}
                  <div className={`${price.originalAmount ? 'mt-1' : 'mt-1'} flex items-baseline gap-3`}>
                    <div className="text-3xl font-medium text-gray-950">
                      {price.amount.toLocaleString('ko-KR')}원
                    </div>
                    <div className="flex items-baseline gap-1 text-sm text-gray-950/75">
                      <span>{price.unit}</span>
                      {price.note && (
                        <span className="text-xs">{price.note}</span>
                      )}
                    </div>
                  </div>
                  {price.subtitle && (
                    <div className="mt-2 text-xs text-gray-950/50">{price.subtitle}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {hasHighlights && (
            <div className={tier.priceMonthly || hasPrices ? "mt-8" : "mt-12"}>
              <ul className="space-y-3">
                {tier.highlights.map((props, featureIndex) => {
                  const isNote = props.description.startsWith('*')
                  const prevItems = tier.highlights.slice(0, featureIndex)
                  const isFirstNote = isNote && !prevItems.some(item => item.description.startsWith('*'))
                  return (
                    <FeatureItem key={featureIndex} {...props} tierSlug={tier.slug} isFirstNote={isFirstNote} />
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeatureItem({
  description,
  subtitle,
  disabled = false,
  tierSlug,
  isFirstNote = false,
}: {
  description: string
  subtitle?: string
  disabled?: boolean
  tierSlug?: string
  isFirstNote?: boolean
}) {
  const isNote = description.startsWith('*')
  const shouldAddDeluxeSpacing = isNote && tierSlug === 'deluxe'
  const shouldAddPremiumSpacing = isNote && tierSlug === 'premium' && isFirstNote
  const isPremiumService = tierSlug === 'premium' && !isNote
  
  return (
    <li
      data-disabled={disabled ? true : undefined}
      className={`flex items-start gap-4 text-sm/6 data-disabled:text-gray-950/25 ${shouldAddDeluxeSpacing ? 'mt-6' : ''} ${shouldAddPremiumSpacing ? 'mt-10' : ''} ${isPremiumService ? 'text-gray-950' : 'text-gray-950/75'}`}
    >
      {!isNote && (
        <span className="inline-flex h-6 items-center">
          <PlusIcon className="size-3.75 shrink-0 fill-gray-950/25" />
        </span>
      )}
      <div className="flex-1">
        {disabled && <span className="sr-only">Not included:</span>}
        <div className={`${isNote ? 'text-xs text-gray-950/60' : ''} ${isPremiumService ? 'font-medium' : ''}`}>{description}</div>
        {subtitle && (
          <div className="mt-2 text-xs text-gray-950/50">{subtitle}</div>
        )}
      </div>
    </li>
  )
}

function PlusIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 15 15" aria-hidden="true" {...props}>
      <path clipRule="evenodd" d="M8 0H7v7H0v1h7v7h1V8h7V7H8V0z" />
    </svg>
  )
}

function Testimonial() {
  return (
    <div className="mx-2 my-24 rounded-4xl bg-gray-900 bg-[url(/dot-texture.svg)] pt-72 pb-24 lg:pt-36">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[384px_1fr_1fr]">
          <div className="-mt-96 lg:-mt-52">
            <div className="group -m-2 rounded-4xl bg-white/15 shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 ring-black/5 max-lg:mx-auto max-lg:max-w-xs">
              <div className="rounded-4xl p-2 shadow-md shadow-black/5">
                <div className="relative overflow-hidden rounded-3xl shadow-2xl outline outline-1 -outline-offset-1 outline-black/10">
                  <img
                    alt=""
                    src="/testimonials/tina-yards.jpg"
                    className="aspect-3/4 w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex scale-0 flex-col items-center gap-6 transition-all duration-500 ease-out group-hover:scale-100">
                      <a
                        href="https://blog.naver.com/syaysa1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-32 flex-col items-center gap-2 rounded-2xl bg-white/10 py-5 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/20"
                      >
                        <svg className="h-8 w-8 fill-white drop-shadow-lg" viewBox="0 0 24 24">
                          <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z"/>
                        </svg>
                        <span className="text-xs font-semibold text-white drop-shadow-lg">네이버</span>
                      </a>
                      <div className="h-px w-20 bg-white/30"></div>
                      <a
                        href="https://www.youtube.com/@sue_chung"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-32 flex-col items-center gap-2 rounded-2xl bg-white/10 py-5 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/20"
                      >
                        <svg className="h-8 w-8 fill-white drop-shadow-lg" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span className="text-xs font-semibold text-white drop-shadow-lg">유튜브</span>
                      </a>
                      <div className="h-px w-20 bg-white/30"></div>
                      <a
                        href="https://www.instagram.com/suyeonjeong2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-32 flex-col items-center gap-2 rounded-2xl bg-white/10 py-5 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/20"
                      >
                        <svg className="h-8 w-8 fill-white drop-shadow-lg" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                        <span className="text-xs font-semibold text-white drop-shadow-lg">인스타</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex max-lg:mt-16 lg:col-span-2 lg:px-16 lg:-mt-24">
            <figure className="mx-auto flex w-full max-w-2xl flex-col max-lg:text-center">
              <figcaption className="mb-10">
                <p className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                  정수연
                </p>
                <p className="mt-3 text-xl font-medium">
                  <span className="bg-gradient-to-r from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent">
                    마케팅 본부장
                  </span>
                </p>
              </figcaption>
              <blockquote>
                <p className="text-2xl font-light leading-relaxed tracking-tight text-white/90 lg:text-3xl">
                  <span className="text-white/40">&ldquo;</span>
                  본인 일이라고 생각하고<br />
                  6년간 한결같이 일하고 있습니다.
                  <span className="text-white/40">&rdquo;</span>
                </p>
              </blockquote>
              <div className="mt-12 space-y-3 border-t border-white/10 pt-8 text-sm text-white/60">
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>디자인 전문 대학원 졸업, 실기교사(디자인) 교원자격증·GTQ 2급 포토샵·ACA 자격 보유</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>네이버 블로그 마케팅 전문가 (6년차)</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>학원·뷰티·주얼리·유학·의료 등 다양한 업종 SNS 및 블로그 통합 운영 경력</span>
                </p>
              </div>
            </figure>
          </div>
        </div>
      </Container>
    </div>
  )
}

function FrequentlyAskedQuestions() {
  return (
    <Container>
      <section id="faqs" className="scroll-mt-8">
        <Subheading className="text-center">
          FREQUENTLY ASKED QUESTIONS
        </Subheading>
        <Heading as="div" className="mt-2 text-center">
          자주 묻는 질문
        </Heading>
        <div className="mx-auto mt-16 mb-32 max-w-xl space-y-12">
          <dl>
            <dt className="text-sm font-semibold">
              월 단위 플랜의 4회 기준이라고 적혀있는데, 더 많이 진행하는 것도 가능한가요?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              물론입니다.<br />
              4회는 기본 제공 횟수이며, 필요에 따라 추가 제작이 가능합니다.<br />
              브랜드의 마케팅 목표와 예산에 맞춰 유연하게 조정할 수 있으니, 상담을 통해 최적의 플랜을 함께 구성해드리겠습니다.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              기본 블로그 포스팅과 이미지 포함 블로그 포스팅은 어떻게 다른가요?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              기본 블로그 포스팅은 클라이언트께서 제공하신 이미지를 활용해 글을 작성하는 서비스입니다.<br />
              이미지의 간단한 편집이나 크기 조정 등은 기본 플랜에서도 충분히 가능합니다.<br /><br />
              이미지 포함 블로그 포스팅은 썸네일 제작부터 본문에 어울리는 이미지 선정 및 삽입까지 모두 진행해드립니다.<br />
              유라시스에서 정식으로 라이선스를 보유하고 구입한 상업용 이미지를 사용하기 때문에 저작권 문제 걱정 없이 안심하고 사용하실 수 있습니다.<br />
              자세한 사항은 해당 글을 참고해주세요.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              예시에 없는 소셜 미디어도 가능한가요?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              당연히 가능합니다.<br />
              플랜에 명시된 형식(블로그, 카드형 SNS, 숏폼 영상 등)과 동일하다면 어떤 플랫폼이든 제작 및 관리가 가능합니다.<br />
              인스타그램, 페이스북, 네이버 블로그, 유튜브 쇼츠 등 다양한 채널에서 활용하실 수 있습니다.<br /><br />
              특정 플랫폼이 어떤 플랜에 해당하는지 궁금하시다면 언제든 편하게 상담 신청을 해주세요.
            </dd>
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              프리미엄 플랜의 유라시스 서비스 무료 또는 할인 리워드란 무엇인가요?
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600">
              유라시스는 SNS 마케팅 외에도 명함 및 인쇄물 디자인, 웹페이지 디자인 서비스를 제공하고 있습니다.<br />
              프리미엄 플랜 구독 고객님께는 매월 진행되는 프로모션에 따라 이러한 서비스를 무료로 제공하거나 특별 할인 혜택을 드립니다.<br /><br />
              현재 진행 중인 리워드는 공지사항에서 확인하실 수 있습니다.
            </dd>
          </dl>
        </div>
      </section>
    </Container>
  )
}

export default function Marketing() {
  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container className="pt-24 sm:pt-32">
        <Navbar />
      </Container>
      <Header />
      <PricingCards />
      <Testimonial />
      <FrequentlyAskedQuestions />
      <Footer />
    </main>
  )
}
