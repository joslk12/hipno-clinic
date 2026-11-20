import { createReviewClientsHandler } from '../lib/review-invitations/handlers'
import { getReviewClientStore } from '../lib/review-invitations/runtime'

export const config = { path: '/api/admin/review-clients' }

export default async function adminReviewClients(request: Request) {
  return createReviewClientsHandler({
    store: getReviewClientStore(),
    sessionSecret: process.env.BLOG_SESSION_SECRET
  })(request)
}
