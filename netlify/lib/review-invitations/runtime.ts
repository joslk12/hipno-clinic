import { getSql, hasDatabase } from '../db/client'
import { createPostgresClientStore } from './client-store'
import { createInvitationSender, type InvitationSender } from './messaging'
import {
  createBlobInvitationStore,
  createBlobReviewClientStore,
  type ClientStore,
  type InvitationStore
} from './store'

let clientStore: ClientStore | undefined
let invitationStore: InvitationStore | undefined
let sender: InvitationSender | undefined

export function getReviewClientStore(): ClientStore {
  if (!clientStore) {
    clientStore = hasDatabase()
      ? createPostgresClientStore(getSql)
      : createBlobReviewClientStore()
  }
  return clientStore
}

export function getReviewInvitationStore(): InvitationStore {
  if (!invitationStore) invitationStore = createBlobInvitationStore()
  return invitationStore
}

export function getInvitationSender(): InvitationSender {
  if (!sender) {
    sender = createInvitationSender({
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.REVIEWS_FROM_EMAIL,
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    })
  }
  return sender
}

export function getSiteUrl(): string {
  return (process.env.VITE_SITE_URL || process.env.URL || '').replace(/\/$/, '')
}
