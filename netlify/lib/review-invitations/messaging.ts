export interface SendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

export interface SendMessageInput {
  to: string
  name: string
  link: string
}

export interface InvitationSender {
  readonly emailConfigured: boolean
  readonly whatsappConfigured: boolean
  sendEmail(input: SendMessageInput): Promise<SendResult>
  sendWhatsApp(input: SendMessageInput): Promise<SendResult>
}

export interface MessagingDeps {
  fetchImpl?: typeof fetch
  resendApiKey?: string
  fromEmail?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
}

export const WHATSAPP_TEMPLATE_NAME = 'review_invitation'
export const WHATSAPP_TEMPLATE_LANGUAGE = 'es_MX'

export function buildInvitationMessage(name: string, link: string): string {
  return `Hola ${name}, gracias por acompañarnos en Origen Consciente. Si gustas compartir tu experiencia, usa esta liga privada: ${link}`
}

export function buildWhatsAppLink(to: string, text: string): string {
  const phone = to.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl: typeof fetch
): Promise<SendResult> {
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      const suffix = detail ? ` ${detail.slice(0, 200)}` : ''
      return { ok: false, error: `El proveedor rechazó el mensaje (${response.status}).${suffix}` }
    }

    let providerMessageId: string | undefined
    try {
      const data = (await response.json()) as { id?: string }
      providerMessageId = data.id
    } catch {
      providerMessageId = undefined
    }

    return { ok: true, providerMessageId }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido del proveedor.'
    }
  }
}

export function createInvitationSender(deps: MessagingDeps = {}): InvitationSender {
  const fetchImpl = deps.fetchImpl ?? fetch
  const emailConfigured = Boolean(deps.resendApiKey && deps.fromEmail)
  const whatsappConfigured = Boolean(deps.whatsappAccessToken && deps.whatsappPhoneNumberId)

  return {
    emailConfigured,
    whatsappConfigured,

    async sendEmail(input) {
      if (!emailConfigured) {
        return { ok: false, error: 'Resend no está configurado en este sitio.' }
      }

      return postJson(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${deps.resendApiKey}` },
        {
          from: deps.fromEmail,
          to: [input.to],
          subject: 'Tu liga privada para dejar una reseña | Origen Consciente',
          text: buildInvitationMessage(input.name, input.link),
          html: `<p>Hola ${escapeHtml(input.name)},</p><p>Gracias por acompañarnos en Origen Consciente. Si gustas compartir tu experiencia, usa esta liga privada:</p><p><a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a></p>`
        },
        fetchImpl
      )
    },

    async sendWhatsApp(input) {
      if (!whatsappConfigured) {
        return { ok: false, error: 'WhatsApp Cloud API no está configurada en este sitio.' }
      }

      return postJson(
        `https://graph.facebook.com/v20.0/${deps.whatsappPhoneNumberId}/messages`,
        { Authorization: `Bearer ${deps.whatsappAccessToken}` },
        {
          messaging_product: 'whatsapp',
          to: input.to,
          type: 'template',
          template: {
            name: WHATSAPP_TEMPLATE_NAME,
            language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: input.name },
                  { type: 'text', text: input.link }
                ]
              }
            ]
          }
        },
        fetchImpl
      )
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
