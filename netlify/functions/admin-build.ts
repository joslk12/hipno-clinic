import { createAdminBuildHandler } from '../lib/blog/handlers'
import { getBlogEnv, getBlogStore } from '../lib/blog/runtime'

export const config = { path: '/api/admin/blog/build' }

export default async function adminBuild(request: Request) {
  return createAdminBuildHandler({ store: getBlogStore(), env: getBlogEnv() })(request)
}
