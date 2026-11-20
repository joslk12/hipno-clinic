import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AdminReviewInvitationActions from '../AdminReviewInvitationActions.vue'

afterEach(() => cleanup())

const client = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const invitation = {
  id: 'inv-1',
  clientId: client.id,
  clientName: client.name,
  createdAt: client.createdAt,
  expiresAt: '2026-02-01T00:00:00.000Z',
  status: 'enviada' as const,
  history: []
}

describe('AdminReviewInvitationActions', () => {
  it('permite elegir canales y envía la selección', async () => {
    const { emitted } = render(AdminReviewInvitationActions, {
      props: { client, emailConfigured: true, whatsappConfigured: true }
    })

    const email = screen.getByLabelText(/Correo/)
    const whatsapp = screen.getByLabelText(/WhatsApp/)

    expect(email).toBeChecked()
    expect(whatsapp).toBeChecked()

    await userEvent.click(email)
    await userEvent.click(screen.getByRole('button', { name: 'ENVIAR LIGA' }))

    expect(emitted().send).toEqual([[['whatsapp']]])
  })

  it('muestra REENVIAR cuando la liga está canjeada', async () => {
    const { emitted } = render(AdminReviewInvitationActions, {
      props: {
        client,
        invitation: { ...invitation, status: 'canjeada' },
        emailConfigured: true,
        whatsappConfigured: true
      }
    })

    await userEvent.click(screen.getByRole('button', { name: 'REENVIAR (NUEVA LIGA)' }))

    expect(emitted().send).toEqual([[['email', 'whatsapp']]])
  })

  it('deshabilita los canales sin proveedor o sin contacto', () => {
    render(AdminReviewInvitationActions, {
      props: {
        client: { ...client, whatsapp: '' },
        emailConfigured: false,
        whatsappConfigured: true
      }
    })

    expect(screen.getByLabelText(/Correo/)).toBeDisabled()
    expect(screen.getByLabelText(/WhatsApp/)).toBeDisabled()
    expect(screen.getByText(/Resend no configurado/)).toBeInTheDocument()
    expect(screen.getByText(/sin número registrado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENVIAR LIGA' })).toBeDisabled()
  })
})
