'use client'

import { BentoCard } from '@/components/bento-card'
import { Container } from '@/components/container'
import { Footer } from '@/components/footer'
import { Gradient, GradientBackground } from '@/components/gradient'
import { Keyboard } from '@/components/keyboard'
import { LogoCloud } from '@/components/logo-cloud'
import { LogoCluster } from '@/components/logo-cluster'
import { Map } from '@/components/map'
import { Navbar } from '@/components/navbar'
import { Heading, Lead, Subheading } from '@/components/text'
import { useTranslation } from '@/hooks/useTranslation'
import { useEffect } from 'react'

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
}

function Header() {
  const { t } = useTranslation('marketing')
  
  return (
    <Container className="mt-16">
      <Heading as="h1">{t('header.heading')}</Heading>
      <Lead className="mt-6 max-w-3xl" dangerouslySetInnerHTML={{ __html: t('header.lead') }} />
    </Container>
  )
}

function PricingCards() {
  const { t, locale } = useTranslation('marketing')
  
  const isKorean = locale === 'ko'
  
  const tiers: Tier[] = [
    {
      name: 'Standard' as const,
      slug: 'standard',
      description: t('tiers.standard.description'),
      priceMonthly: null,
      priceUnit: null,
      prices: [
        { label: t('tiers.standard.prices.blogPost'), amount: isKorean ? 30000 : 20, unit: t('tiers.standard.prices.perItem'), subtitle: t('tiers.standard.prices.subtitle1') },
        { label: t('tiers.standard.prices.blogPostWithImage'), amount: isKorean ? 50000 : 30, unit: t('tiers.standard.prices.perItem'), subtitle: t('tiers.standard.prices.subtitle2') },
        { label: t('tiers.standard.prices.snsCard'), amount: isKorean ? 70000 : 45, unit: t('tiers.standard.prices.perItem'), subtitle: t('tiers.standard.prices.subtitle3') },
        { label: t('tiers.standard.prices.shortVideo'), amount: isKorean ? 100000 : 65, unit: t('tiers.standard.prices.perItem'), subtitle: t('tiers.standard.prices.subtitle4') },
      ],
      href: '#',
      highlights: [],
    },
    {
      name: 'Deluxe' as const,
      slug: 'deluxe',
      description: t('tiers.deluxe.description'),
      priceMonthly: null,
      priceUnit: null,
      prices: [
        { label: t('tiers.deluxe.prices.blogPost'), amount: isKorean ? 100000 : 65, originalAmount: isKorean ? 120000 : 80, unit: t('tiers.deluxe.prices.perMonth'), note: t('tiers.deluxe.prices.note'), subtitle: t('tiers.deluxe.prices.subtitle1') },
        { label: t('tiers.deluxe.prices.blogPostWithImage'), amount: isKorean ? 150000 : 100, originalAmount: isKorean ? 200000 : 120, unit: t('tiers.deluxe.prices.perMonth'), note: t('tiers.deluxe.prices.note'), subtitle: t('tiers.deluxe.prices.subtitle2') },
        { label: t('tiers.deluxe.prices.snsCard'), amount: isKorean ? 200000 : 130, originalAmount: isKorean ? 280000 : 180, unit: t('tiers.deluxe.prices.perMonth'), note: t('tiers.deluxe.prices.note'), subtitle: t('tiers.deluxe.prices.subtitle3') },
        { label: t('tiers.deluxe.prices.shortVideo'), amount: isKorean ? 350000 : 230, originalAmount: isKorean ? 400000 : 260, unit: t('tiers.deluxe.prices.perMonth'), note: t('tiers.deluxe.prices.note'), subtitle: t('tiers.deluxe.prices.subtitle4') },
      ],
      href: '#',
      highlights: [
        { description: t('tiers.deluxe.highlight') },
      ],
    },
    {
      name: 'Premium' as const,
      slug: 'premium',
      description: t('tiers.premium.description'),
      priceMonthly: isKorean ? 500000 : 333,
      originalPrice: isKorean ? 700000 : 560,
      priceUnit: t('tiers.premium.perMonth'),
      priceNote: t('tiers.premium.note'),
      prices: [],
      href: '#',
      highlights: [
        { description: t('tiers.premium.highlights.blogPost'), subtitle: t('tiers.premium.highlights.subtitle1') },
        { description: t('tiers.premium.highlights.blogPostWithImage'), subtitle: t('tiers.premium.highlights.subtitle2') },
        { description: t('tiers.premium.highlights.snsCard'), subtitle: t('tiers.premium.highlights.subtitle3') },
        { description: t('tiers.premium.highlights.shortVideo'), subtitle: t('tiers.premium.highlights.subtitle4') },
        { description: t('tiers.premium.highlights.additional') },
        { description: t('tiers.premium.highlights.reward') },
      ],
    },
  ]
  
  return (
    <div className="relative py-24">
      <Gradient className="absolute inset-x-2 top-48 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
      <Container className="relative">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier, tierIndex) => (
            <PricingCard key={tierIndex} tier={tier} locale={locale} />
          ))}
        </div>
        <LogoCloud className="mt-24" />
      </Container>
    </div>
  )
}

function PricingCard({ tier, locale }: { tier: Tier; locale: string }) {
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
                    {locale === 'ko' ? '' : '$'}{tier.originalPrice.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}{locale === 'ko' ? '원' : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="text-5xl font-medium text-gray-950">
                  {locale === 'ko' ? '' : '$'}{tier.priceMonthly.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}{locale === 'ko' ? '원' : ''}
                </div>
                <div className="text-sm/5 text-gray-950/75">
                  <p>{tier.priceUnit}</p>
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
                        {locale === 'ko' ? '' : '$'}{price.originalAmount.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}{locale === 'ko' ? '원' : ''}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline gap-3">
                    <div className="text-3xl font-medium text-gray-950">
                      {locale === 'ko' ? '' : '$'}{price.amount.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}{locale === 'ko' ? '원' : ''}
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
                {tier.highlights.map((highlight, index) => {
                  const isNote = highlight.description.startsWith('*')
                  const prevItems = tier.highlights.slice(0, index)
                  const isFirstNote = isNote && !prevItems.some(item => item.description.startsWith('*'))
                  const shouldAddDeluxeSpacing = isNote && tier.slug === 'deluxe'
                  const shouldAddPremiumSpacing = isNote && tier.slug === 'premium' && isFirstNote
                  const isPremiumService = tier.slug === 'premium' && !isNote
                  
                  return (
                    <li
                      key={index}
                      className={`flex items-start gap-4 text-sm/6 ${shouldAddDeluxeSpacing ? 'mt-6' : ''} ${shouldAddPremiumSpacing ? 'mt-10' : ''} ${isPremiumService ? 'text-gray-950' : 'text-gray-950/75'}`}
                    >
                      {!isNote && (
                        <span className="inline-flex h-6 items-center">
                          <PlusIcon className="size-3.75 shrink-0 fill-gray-950/25" />
                        </span>
                      )}
                      <div className="flex-1">
                        <div className={`${isNote ? 'text-xs text-gray-950/60' : ''} ${isPremiumService ? 'font-medium' : ''}`}>{highlight.description}</div>
                        {highlight.subtitle && (
                          <div className="mt-2 text-xs text-gray-950/50">{highlight.subtitle}</div>
                        )}
                      </div>
                    </li>
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

function PlusIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 15 15" aria-hidden="true" {...props}>
      <path clipRule="evenodd" d="M8 0H7v7H0v1h7v7h1V8h7V7H8V0z" />
    </svg>
  )
}

function BentoSection() {
  const { t } = useTranslation('home')
  
  return (
    <Container>
      <Subheading>{t('solution.subheading')}</Subheading>
      <Heading 
        as="h3" 
        className="mt-2 max-w-3xl"
        dangerouslySetInnerHTML={{ __html: t('solution.heading') }}
      />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow={t('solution.customized.eyebrow')}
          title={t('solution.customized.title')}
          description={t('solution.customized.description')}
          graphic={
            <div className="h-80 bg-[url(/screenshots/profile.png)] bg-size-[1000px_560px] bg-position-[left_-109px_top_-112px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="max-lg:rounded-t-4xl lg:col-span-3 lg:rounded-tl-4xl"
        />
        <BentoCard
          eyebrow={t('solution.analysis.eyebrow')}
          title={t('solution.analysis.title')}
          description={t('solution.analysis.description')}
          graphic={
            <div className="absolute inset-0 bg-[url(/screenshots/competitors.png)] bg-size-[1100px_650px] bg-position-[left_-38px_top_-73px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="lg:col-span-3 lg:rounded-tr-4xl"
        />
        <BentoCard
          eyebrow={t('solution.accuracy.eyebrow')}
          title={t('solution.accuracy.title')}
          description={t('solution.accuracy.description')}
          graphic={
            <div className="flex size-full pt-10 pl-10">
              <Keyboard highlighted={['LeftCommand', 'S']} />
            </div>
          }
          className="lg:col-span-2 lg:rounded-bl-4xl"
        />
        <BentoCard
          eyebrow={t('solution.limitless.eyebrow')}
          title={t('solution.limitless.title')}
          description={t('solution.limitless.description')}
          graphic={<LogoCluster />}
          className="lg:col-span-2"
        />
        <BentoCard
          eyebrow={t('solution.adaptive.eyebrow')}
          title={t('solution.adaptive.title')}
          description={t('solution.adaptive.description')}
          graphic={<Map />}
          className="max-lg:rounded-b-4xl lg:col-span-2 lg:rounded-br-4xl"
        />
      </div>
    </Container>
  )
}

function Testimonial() {
  const { t } = useTranslation('marketing')
  
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
                        <span className="text-xs font-semibold text-white drop-shadow-lg">{t('testimonial.social.naver')}</span>
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
                        <span className="text-xs font-semibold text-white drop-shadow-lg">{t('testimonial.social.youtube')}</span>
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
                        <span className="text-xs font-semibold text-white drop-shadow-lg">{t('testimonial.social.instagram')}</span>
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
                  {t('testimonial.name')}
                </p>
                <p className="mt-3 text-xl font-medium">
                  <span className="bg-gradient-to-r from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent">
                    {t('testimonial.role')}
                  </span>
                </p>
              </figcaption>
              <blockquote>
                <p className="text-2xl font-light leading-relaxed tracking-tight text-white/90 lg:text-3xl">
                  <span className="text-white/40">&ldquo;</span>
                  <span dangerouslySetInnerHTML={{ __html: t('testimonial.quote') }} />
                  <span className="text-white/40">&rdquo;</span>
                </p>
              </blockquote>
              <div className="mt-12 space-y-3 border-t border-white/10 pt-8 text-sm text-white/60">
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>{t('testimonial.credentials.education')}</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>{t('testimonial.credentials.expertise')}</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-white/40">•</span>
                  <span>{t('testimonial.credentials.experience')}</span>
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
  const { t } = useTranslation('marketing')
  
  return (
    <Container>
      <section id="faqs" className="scroll-mt-8">
        <Subheading className="text-center">
          {t('faq.subheading')}
        </Subheading>
        <Heading as="div" className="mt-2 text-center">
          {t('faq.heading')}
        </Heading>
        <div className="mx-auto mt-16 mb-32 max-w-xl space-y-12">
          <dl>
            <dt className="text-sm font-semibold">
              {t('faq.questions.q1.question')}
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600" dangerouslySetInnerHTML={{ __html: t('faq.questions.q1.answer') }} />
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              {t('faq.questions.q2.question')}
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600" dangerouslySetInnerHTML={{ __html: t('faq.questions.q2.answer') }} />
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              {t('faq.questions.q3.question')}
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600" dangerouslySetInnerHTML={{ __html: t('faq.questions.q3.answer') }} />
          </dl>
          <dl>
            <dt className="text-sm font-semibold">
              {t('faq.questions.q4.question')}
            </dt>
            <dd className="mt-4 text-sm/6 text-gray-600" dangerouslySetInnerHTML={{ __html: t('faq.questions.q4.answer') }} />
          </dl>
        </div>
      </section>
    </Container>
  )
}

export default function Build() {
  const { t } = useTranslation('marketing')
  
  useEffect(() => {
    document.title = t('metadata.title')
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', t('metadata.description'))
    }
  }, [t])
  
  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container className="pt-24 sm:pt-32">
        <Navbar />
      </Container>
      <Header />
      <PricingCards />
      <div className="py-24">
        <BentoSection />
      </div>
      <Testimonial />
      <FrequentlyAskedQuestions />
      <Footer />
    </main>
  )
}
