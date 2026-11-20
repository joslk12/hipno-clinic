import type {
  AdminLoginResponse,
  AdminPostsResponse,
  AdminSessionResponse,
  BlogDeleteResult,
  BlogImageUploadResponse,
  BlogPostInput,
  BlogPostMutationResult,
  BuildResult
} from '../types/blog'

export class AdminBlogApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'AdminBlogApiError'
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin'
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'No pudimos completar la solicitud.'
    throw new AdminBlogApiError(message, response.status, payload?.fields)
  }

  return payload as T
}

export function login(password: string): Promise<AdminLoginResponse> {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}

export function logout(): Promise<{ ok: true }> {
  return request('/api/admin/logout', { method: 'POST' })
}

export function getSession(): Promise<AdminSessionResponse> {
  return request('/api/admin/session')
}

export function listPosts(): Promise<AdminPostsResponse> {
  return request('/api/admin/blog/posts')
}

export function createPost(input: BlogPostInput): Promise<BlogPostMutationResult> {
  return request('/api/admin/blog/posts', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export function updatePost(id: string, input: BlogPostInput): Promise<BlogPostMutationResult> {
  return request(`/api/admin/blog/posts?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
}

export function deletePost(id: string): Promise<BlogDeleteResult> {
  return request(`/api/admin/blog/posts?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

export function uploadImage(file: File): Promise<BlogImageUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request('/api/admin/blog/images', {
    method: 'POST',
    body: formData
  })
}

export function rebuildSite(): Promise<BuildResult> {
  return request('/api/admin/blog/build', { method: 'POST' })
}
