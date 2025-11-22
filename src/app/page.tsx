import { BentoCard } from '@/components/bento-card'
import { Button } from '@/components/button'
import { Container } from '@/components/container'
import { Footer } from '@/components/footer'
import { Gradient } from '@/components/gradient'
import { HeroCarousel } from '@/components/hero-carousel'
import { Keyboard } from '@/components/keyboard'
import { Link } from '@/components/link'
import { LinkedAvatars } from '@/components/linked-avatars'
import { LogoCloud } from '@/components/logo-cloud'
import { LogoCluster } from '@/components/logo-cluster'
import { LogoTimeline } from '@/components/logo-timeline'
import { Map } from '@/components/map'
import { Screenshot } from '@/components/screenshot'
import { Testimonials } from '@/components/testimonials'
import { Heading, Subheading } from '@/components/text'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description:
    'Radiant helps you sell more by revealing sensitive information about your customers.',
}

function FeatureSection() {
  return (
    <div className="overflow-hidden">
      <Container className="pb-24">
        <Subheading>Technology</Subheading>
        <Heading as="h2" className="max-w-3xl">
          자체개발 플랫폼으로 인하여<br></br>빠르고 정확한 서비스 제공
        </Heading>
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
  return (
    <Container>
      <Subheading>Solution</Subheading>
      <Heading as="h3" className="mt-2 max-w-3xl">
        모든 상황을 대비한<br></br>맞춤형 올인원 솔루션
      </Heading>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow="CUSTOMIZED"
          title="완벽한 맞춤형 서비스"
          description="클라이언트의 SNS 운영 주기와 플랫폼 수에 맞춘 유연한 맞춤형 서비스를 제공합니다."
          graphic={
            <div className="h-80 bg-[url(/screenshots/profile.png)] bg-size-[1000px_560px] bg-position-[left_-109px_top_-112px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="max-lg:rounded-t-4xl lg:col-span-3 lg:rounded-tl-4xl"
        />
        <BentoCard
          eyebrow="Analysis"
          title="AI 기반 키워드 분석"
          description="전용 프롬프트와 AI 툴을 활용해 매일 인기 키워드를 자동 수집하고 분석합니다."
          graphic={
            <div className="absolute inset-0 bg-[url(/screenshots/competitors.png)] bg-size-[1100px_650px] bg-position-[left_-38px_top_-73px] bg-no-repeat" />
          }
          fade={['bottom']}
          className="lg:col-span-3 lg:rounded-tr-4xl"
        />
        <BentoCard
          eyebrow="Accuracy"
          title="전문성과 꼼꼼함"
          description="n년차 전문가가 직접 컨텐츠 기획 및 최종 검수까지 합니다."
          graphic={
            <div className="flex size-full pt-10 pl-10">
              <Keyboard highlighted={['LeftCommand', 'LeftShift', 'D']} />
            </div>
          }
          className="lg:col-span-2 lg:rounded-bl-4xl"
        />
        <BentoCard
          eyebrow="Limitless"
          title="전 플랫폼 대응가능"
          description="네이버 블로그, 카카오 채널, 티스토리, 인스타그램 등 다양한 플랫폼에 맞춘 솔루션 제공"
          graphic={<LogoCluster />}
          className="lg:col-span-2"
        />
        <BentoCard
          eyebrow="ADAPTIVE"
          title="실시간 전략 최적화"
          description="트렌드 변화와 알고리즘 업데이트에 즉각 대응하여 전략을 실시간으로 조정합니다."
          graphic={<Map />}
          className="max-lg:rounded-b-4xl lg:col-span-2 lg:rounded-br-4xl"
        />
      </div>
    </Container>
  )
}

function DarkBentoSection() {
  return (
    <div className="mx-2 mt-2 rounded-4xl bg-gray-900 py-32">
      <Container>
        <Subheading dark>Promotion</Subheading>
        <Heading as="h3" dark className="mt-2 max-w-3xl">
          Radient만의 특별한 패키지로<br></br>더 큰 혜택을 누리세요
        </Heading>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          <BentoCard
            dark
            eyebrow="AUTOMATION"
            title="AI 자동화 시스템 구축"
            description="SNS 마케팅뿐만 아니라 AI 자동화 시스템 구축까지 원스톱으로 대응합니다."
            graphic={
              <div className="h-80 bg-[url(/screenshots/networking.png)] bg-size-[851px_344px] bg-no-repeat" />
            }
            fade={['top']}
            className="max-lg:rounded-t-4xl lg:col-span-4 lg:rounded-tl-4xl"
          />
          <BentoCard
            dark
            eyebrow="AFFORDABLE"
            title="합리적인 비용"
            description="경쟁사 대비 최대 40% 절감된 합리적인 비용으로 전문 서비스를 이용하세요."
            graphic={<LogoTimeline />}
            // `overflow-visible!` is needed to work around a Chrome bug that disables the mask on the graphic.
            className="z-10 overflow-visible! lg:col-span-2 lg:rounded-tr-4xl"
          />
          <BentoCard
            dark
            eyebrow="SETUP"
            title="초기 셋업 무료 제공"
            description="계정 개설부터 프로필 최적화까지 초기 SNS 셋업 서비스를 무료로 제공합니다."
            graphic={<LinkedAvatars />}
            className="lg:col-span-2 lg:rounded-bl-4xl"
          />
          <BentoCard
            dark
            eyebrow="BUNDLE"
            title="홈페이지 제작 특별 할인"
            description="홈페이지 제작 솔루션 동시 신청 시 패키지 15% 특별 할인 혜택을 받으세요."
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
