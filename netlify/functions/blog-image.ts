import { createPublicImageHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/blog/images' }

export default async function blogImage(request: Request) {
  return createPublicImageHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
