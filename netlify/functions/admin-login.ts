import { createLoginHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/admin/login' }

export default async function adminLogin(request: Request) {
  return createLoginHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
