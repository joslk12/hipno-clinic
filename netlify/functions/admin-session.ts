import { createSessionHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/admin/session' }

export default async function adminSession(request: Request) {
  return createSessionHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
