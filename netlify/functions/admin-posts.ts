import { createAdminPostsHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/admin/blog/posts' }

export default async function adminPosts(request: Request) {
  return createAdminPostsHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
