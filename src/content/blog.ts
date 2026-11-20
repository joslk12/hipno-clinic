import blogData from '@blog-data'
import type { PublicBlogPost } from '@/types/blog'

function isPublicPost(value: unknown): value is PublicBlogPost {
  if (typeof value !== 'object' || value === null) return false
  const post = value as Partial<PublicBlogPost>
  return (
    typeof post.id === 'string' &&
    typeof post.slug === 'string' &&
    typeof post.title === 'string' &&
    typeof post.excerpt === 'string' &&
    typeof post.contentHtml === 'string' &&
    typeof post.publishedAt === 'string' &&
    typeof post.updatedAt === 'string'
  )
}

const rawBlogData: unknown[] = Array.isArray(blogData) ? (blogData as unknown[]) : []

export const blogPosts: PublicBlogPost[] = rawBlogData
  .filter(isPublicPost)
  .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))

export function getBlogPost(slug: string): PublicBlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function formatBlogDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}
