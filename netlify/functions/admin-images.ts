import { createAdminImagesHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/admin/blog/images' }

export default async function adminImages(request: Request) {
  return createAdminImagesHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
