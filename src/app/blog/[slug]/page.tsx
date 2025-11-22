import { Button } from '@/components/button'
import { Container } from '@/components/container'
import { Footer } from '@/components/footer'
import { GradientBackground } from '@/components/gradient'
import { Link } from '@/components/link'
import { Navbar } from '@/components/navbar'
import { Heading, Subheading } from '@/components/text'
import { getMockImageUrl, getPost } from '@/lib/mock-blog-data'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'
import dayjs from 'dayjs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  let { data: post } = await getPost((await params).slug)

  return post ? { title: post.title, description: post.excerpt } : {}
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  let { data: post } = await getPost((await params).slug)
  if (!post) notFound()

  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container className="pt-24 sm:pt-32">
        <Navbar />
        <Subheading className="mt-16">
          {dayjs(post.publishedAt).format('dddd, MMMM D, YYYY')}
        </Subheading>
        <Heading as="h1" className="mt-2">
          {post.title}
        </Heading>
        <div className="mt-16 grid grid-cols-1 gap-8 pb-24 lg:grid-cols-[15rem_1fr] xl:grid-cols-[15rem_1fr_15rem]">
          <div className="flex flex-wrap items-center gap-8 max-lg:justify-between lg:flex-col lg:items-start">
            {post.author && (
              <div className="flex items-center gap-3">
                {post.author.image && (
                  <img
                    alt=""
                    src={getMockImageUrl(post.author.image, 64, 64)}
                    className="aspect-square size-6 rounded-full object-cover"
                  />
                )}
                <div className="text-sm/5 text-gray-700">
                  {post.author.name}
                </div>
              </div>
            )}
            {Array.isArray(post.categories) && (
              <div className="flex flex-wrap gap-2">
                {post.categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/blog?category=${category.slug}`}
                    className="rounded-full border border-dotted border-gray-300 bg-gray-50 px-2 text-sm/6 font-medium text-gray-500"
                  >
                    {category.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="text-gray-700">
            <div className="max-w-2xl xl:mx-auto">
              {post.mainImage && (
                <img
                  alt={post.mainImage.alt || ''}
                  src={getMockImageUrl(post.mainImage, 2016, 1344)}
                  className="mb-10 aspect-3/2 w-full rounded-2xl object-cover shadow-xl"
                />
              )}
              {post.body && (
                <div className="prose prose-gray max-w-none">
                  {post.body.map((block: any, index: number) => {
                    if (block._type === 'block') {
                      if (block.style === 'h2') {
                        return (
                          <h2 key={index} className="mt-12 mb-10 text-2xl/8 font-medium tracking-tight text-gray-950 first:mt-0 last:mb-0">
                            {block.children.map((child: any) => child.text).join('')}
                          </h2>
                        )
                      }
                      if (block.style === 'h3') {
                        return (
                          <h3 key={index} className="mt-12 mb-10 text-xl/8 font-medium tracking-tight text-gray-950 first:mt-0 last:mb-0">
                            {block.children.map((child: any) => child.text).join('')}
                          </h3>
                        )
                      }
                      return (
                        <p key={index} className="my-10 text-base/8 first:mt-0 last:mb-0">
                          {block.children.map((child: any) => child.text).join('')}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              )}
              <div className="mt-10">
                <Button variant="outline" href="/blog">
                  <ChevronLeftIcon className="size-4" />
                  Back to blog
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <Footer />
    </main>
  )
}
