import { createLogoutHandler } from '../lib/blog/handlers'

export const config = { path: '/api/admin/logout' }

export default async function adminLogout(request: Request) {
  return createLogoutHandler()(request)
}
