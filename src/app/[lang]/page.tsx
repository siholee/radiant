'use client'

import { BentoCard } from '@/components/bento-card'
import { Container } from '@/components/container'
import { Footer } from '@/components/footer'
import { HeroCarousel } from '@/components/hero-carousel'
import { Keyboard } from '@/components/keyboard'
import { LinkedAvatars } from '@/components/linked-avatars'
import { LogoCluster } from '@/components/logo-cluster'
import { LogoTimeline } from '@/components/logo-timeline'
import { Map } from '@/components/map'
import { Screenshot } from '@/components/screenshot'
import { Testimonials } from '@/components/testimonials'
import { Heading, Subheading } from '@/components/text'
import { useTranslation } from '@/hooks/useTranslation'
import { useEffect } from 'react'

function FeatureSection() {
  const { t } = useTranslation('home')
  
  return (
    <div className="overflow-hidden">
      <Container className="pb-24">
        <Subheading>{t('features.subheading')}</Subheading>
        <Heading 
          as="h2" 
          className="max-w-3xl"
          dangerouslySetInnerHTML={{ __html: t('features.heading') }}
        />
        <Screenshot
          width={1216}
          height={768}
          src="/screenshots/app.png"
          className="mt-16 h-144 sm:h-auto sm:w-304"
        />
      </Container>
    </div>
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
              <Keyboard highlighted={['LeftCommand', 'LeftShift', 'D']} />
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

function DarkBentoSection() {
  const { t } = useTranslation('home')
  
  return (
    <div className="mx-2 mt-2 rounded-4xl bg-gray-900 py-32">
      <Container>
        <Subheading dark>{t('promotion.subheading')}</Subheading>
        <Heading 
          as="h3" 
          dark 
          className="mt-2 max-w-3xl"
          dangerouslySetInnerHTML={{ __html: t('promotion.heading') }}
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          <BentoCard
            dark
            eyebrow={t('promotion.automation.eyebrow')}
            title={t('promotion.automation.title')}
            description={t('promotion.automation.description')}
            graphic={
              <div className="h-80 bg-[url(/screenshots/networking.png)] bg-size-[851px_344px] bg-no-repeat" />
            }
            fade={['top']}
            className="max-lg:rounded-t-4xl lg:col-span-4 lg:rounded-tl-4xl"
          />
          <BentoCard
            dark
            eyebrow={t('promotion.affordable.eyebrow')}
            title={t('promotion.affordable.title')}
            description={t('promotion.affordable.description')}
            graphic={<LogoTimeline />}
            // `overflow-visible!` is needed to work around a Chrome bug that disables the mask on the graphic.
            className="z-10 overflow-visible! lg:col-span-2 lg:rounded-tr-4xl"
          />
          <BentoCard
            dark
            eyebrow={t('promotion.setup.eyebrow')}
            title={t('promotion.setup.title')}
            description={t('promotion.setup.description')}
            graphic={<LinkedAvatars />}
            className="lg:col-span-2 lg:rounded-bl-4xl"
          />
          <BentoCard
            dark
            eyebrow={t('promotion.bundle.eyebrow')}
            title={t('promotion.bundle.title')}
            description={t('promotion.bundle.description')}
            graphic={
              <div className="h-80 bg-[url(/screenshots/engagement.png)] bg-size-[851px_344px] bg-no-repeat" />
            }
            fade={['top']}
            className="max-lg:rounded-b-4xl lg:col-span-4 lg:rounded-br-4xl"
          />
        </div>
      </Container>
    </div>
  )
}

export default function Home() {
  const { t } = useTranslation('home')
  
  useEffect(() => {
    document.title = `Radiant - ${t('metadata.description')}`
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', t('metadata.description'))
    }
  }, [t])
  
  return (
    <div className="overflow-hidden">
      <HeroCarousel />
      <main>
        <div className="bg-linear-to-b from-white from-50% to-gray-100 pt-12 pb-32">
          <FeatureSection />
          <BentoSection />
        </div>
        <DarkBentoSection />
      </main>
      <Testimonials />
      <Footer />
    </div>
  )
}
