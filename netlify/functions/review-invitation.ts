import { createPublicInvitationHandler } from '../lib/review-invitations/handlers'
import { getReviewInvitationStore } from '../lib/review-invitations/runtime'

export const config = { path: '/api/reviews/invitation' }

export default async function reviewInvitation(request: Request) {
  return createPublicInvitationHandler({ invitationStore: getReviewInvitationStore() })(request)
}
