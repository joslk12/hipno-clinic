import { createPublicPostsHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/blog/posts' }

export default async function blogPosts(request: Request) {
  return createPublicPostsHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
