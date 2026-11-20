import type { Context } from '@netlify/functions'
import { createReviewsHandler } from '../lib/reviews/handler'
import { createBlobReviewStore } from '../lib/reviews/store'
import { createBlobInvitationStore } from '../lib/review-invitations/store'

let handler: ReturnType<typeof createReviewsHandler> | undefined

function getHandler() {
  if (!handler) {
    handler = createReviewsHandler({
      store: createBlobReviewStore(),
      invitationStore: createBlobInvitationStore(),
      adminToken: process.env.REVIEWS_ADMIN_TOKEN,
      rateSalt: process.env.REVIEWS_RATE_SALT
    })
  }

  return handler
}

function getClientIp(request: Request, context: Context) {
  const forwarded =
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]

  return context.ip ?? forwarded?.trim() ?? 'unknown'
}

export default async function reviews(request: Request, context: Context) {
  return getHandler()(request, { ip: getClientIp(request, context) })
}
