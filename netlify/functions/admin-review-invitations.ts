import { createReviewInvitationsHandler } from '../lib/review-invitations/handlers'
import {
  getInvitationSender,
  getReviewClientStore,
  getReviewInvitationStore,
  getSiteUrl
} from '../lib/review-invitations/runtime'

export const config = { path: '/api/admin/review-invitations' }

export default async function adminReviewInvitations(request: Request) {
  return createReviewInvitationsHandler({
    clientStore: getReviewClientStore(),
    invitationStore: getReviewInvitationStore(),
    sender: getInvitationSender(),
    siteUrl: getSiteUrl(),
    sessionSecret: process.env.BLOG_SESSION_SECRET
  })(request)
}
