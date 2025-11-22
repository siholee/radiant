// Mock blog data to replace Sanity CMS

export interface Author {
  name: string
  image?: {
    asset: {
      _ref: string
      _type: string
    }
  }
}

export interface Category {
  title: string
  slug: string
}

export interface BlockChild {
  text: string
  _type: string
}

export interface Block {
  _type: string
  style?: string
  children: BlockChild[]
}

export interface Post {
  _id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  featured?: boolean
  author?: Author
  categories?: Category[]
  mainImage?: {
    asset: {
      _ref: string
      _type: string
    }
    alt?: string
  }
  body?: Block[]
}

export const mockCategories: Category[] = [
  { title: 'Product Updates', slug: 'product-updates' },
  { title: 'Company News', slug: 'company-news' },
  { title: 'Sales Tips', slug: 'sales-tips' },
  { title: 'Customer Stories', slug: 'customer-stories' },
]

export const mockAuthors: Author[] = [
  {
    name: 'Michael Foster',
    image: {
      asset: {
        _ref: 'image-1',
        _type: 'reference',
      },
    },
  },
  {
    name: 'Sarah Chen',
    image: {
      asset: {
        _ref: 'image-2',
        _type: 'reference',
      },
    },
  },
]

export const mockPosts: Post[] = [
  {
    _id: '1',
    title: 'Radiant raises $100M Series A from Tailwind Ventures',
    slug: 'radiant-raises-100m-series-a-from-tailwind-ventures',
    excerpt:
      'We are excited to announce that Radiant has raised $100M in Series A funding led by Tailwind Ventures. This investment will help us accelerate product development and expand our team.',
    publishedAt: '2025-11-15T10:00:00Z',
    featured: true,
    author: mockAuthors[0],
    categories: [mockCategories[1]],
    mainImage: {
      asset: {
        _ref: 'image-post-1',
        _type: 'reference',
      },
      alt: 'Radiant funding announcement',
    },
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'Today marks a significant milestone in our journey. We are thrilled to announce that Radiant has raised $100M in Series A funding, led by Tailwind Ventures.',
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        children: [{ _type: 'span', text: 'What This Means for Our Customers' }],
      },
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'This investment will enable us to accelerate our product development, expand our engineering team, and deliver even more value to our customers.',
          },
        ],
      },
    ],
  },
  {
    _id: '2',
    title: 'Introducing Advanced Analytics Dashboard',
    slug: 'introducing-advanced-analytics-dashboard',
    excerpt:
      'Our new analytics dashboard gives you deeper insights into your sales pipeline and customer behavior, helping you close deals faster.',
    publishedAt: '2025-11-10T14:30:00Z',
    featured: true,
    author: mockAuthors[1],
    categories: [mockCategories[0]],
    mainImage: {
      asset: {
        _ref: 'image-post-2',
        _type: 'reference',
      },
      alt: 'Analytics dashboard screenshot',
    },
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'We are excited to launch our new Advanced Analytics Dashboard, designed to give you unprecedented visibility into your sales process.',
          },
        ],
      },
    ],
  },
  {
    _id: '3',
    title: '5 Proven Strategies to Close More Deals',
    slug: '5-proven-strategies-to-close-more-deals',
    excerpt:
      'Learn the top strategies our most successful customers use to increase their close rates and revenue.',
    publishedAt: '2025-11-05T09:00:00Z',
    featured: true,
    author: mockAuthors[0],
    categories: [mockCategories[2]],
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'After analyzing thousands of successful deals on our platform, we have identified five key strategies that consistently lead to higher close rates.',
          },
        ],
      },
    ],
  },
  {
    _id: '4',
    title: 'How Acme Corp Increased Sales by 300%',
    slug: 'how-acme-corp-increased-sales-by-300-percent',
    excerpt:
      'Discover how Acme Corp transformed their sales process and tripled their revenue using Radiant.',
    publishedAt: '2025-10-28T11:00:00Z',
    author: mockAuthors[1],
    categories: [mockCategories[3]],
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'Acme Corp came to us with a challenge: their sales team was working hard but struggling to close deals consistently.',
          },
        ],
      },
    ],
  },
  {
    _id: '5',
    title: 'New Integration: Salesforce and HubSpot',
    slug: 'new-integration-salesforce-and-hubspot',
    excerpt:
      'Radiant now integrates seamlessly with Salesforce and HubSpot, making it easier than ever to sync your data.',
    publishedAt: '2025-10-20T13:00:00Z',
    author: mockAuthors[1],
    categories: [mockCategories[0]],
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: 'We are pleased to announce two new integrations that will streamline your workflow and keep all your data in sync.',
          },
        ],
      },
    ],
  },
]

// Helper functions to simulate Sanity queries
export async function getFeaturedPosts(limit: number = 3) {
  const featured = mockPosts.filter((post) => post.featured).slice(0, limit)
  return { data: featured }
}

export async function getPosts(start: number = 0, end?: number, category?: string) {
  let posts = [...mockPosts]

  if (category) {
    posts = posts.filter((post) =>
      post.categories?.some((cat) => cat.slug === category)
    )
  }

  return { data: posts.slice(start, end) }
}

export async function getPostsCount(category?: string) {
  let posts = [...mockPosts]

  if (category) {
    posts = posts.filter((post) =>
      post.categories?.some((cat) => cat.slug === category)
    )
  }

  return { data: posts.length }
}

export async function getCategories() {
  return { data: mockCategories }
}

export async function getPost(slug: string) {
  const post = mockPosts.find((p) => p.slug === slug)
  return { data: post || null }
}

export async function getPostsForFeed() {
  return { data: mockPosts }
}

export async function getAllPostSlugs() {
  return mockPosts.map((post) => post.slug)
}

// Mock image URL generator (replaces Sanity's image helper)
export function getMockImageUrl(
  imageRef?: { asset: { _ref: string; _type: string }; alt?: string } | string,
  width?: number,
  height?: number
) {
  // Return a placeholder image
  const w = width || 800
  const h = height || 600
  return `https://placehold.co/${w}x${h}/e2e8f0/64748b?text=Blog+Image`
}
