export type BlogStatus = 'draft' | 'published'

export interface BlogPostRecord {
  id: string
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  contentHtml: string
  coverImage: string | null
  status: BlogStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PublicBlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  contentHtml: string
  coverImage: string | null
  publishedAt: string
  updatedAt: string
}

export interface BlogPostInput {
  title: string
  slug?: string
  excerpt: string
  contentMarkdown: string
  coverImage: string | null
  status: BlogStatus
}

export interface BuildResult {
  triggered: boolean
  warning?: string
}

export interface BlogPostMutationResult {
  post: BlogPostRecord
  build: BuildResult
}

export interface ImageCleanupResult {
  deleted: number
  warning?: string
}

export interface BlogDeleteResult {
  ok: true
  build: BuildResult
  images: ImageCleanupResult
}

export interface AdminPostsResponse {
  posts: BlogPostRecord[]
}

export interface AdminLoginResponse {
  ok: true
}

export interface AdminSessionResponse {
  authenticated: true
}

export interface BlogImageUploadResponse {
  url: string
  key: string
}

export interface ApiErrorBody {
  error: string
  fields?: Record<string, string>
}
