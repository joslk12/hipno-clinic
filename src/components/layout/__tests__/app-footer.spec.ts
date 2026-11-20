import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import AppFooter from '../AppFooter.vue'
import { contact, WHATSAPP_MESSAGE } from '../../../content/contact'
import { createTestRouter } from '../../../test/createTestRouter'

afterEach(() => cleanup())

async function renderFooter() {
  const router = await createTestRouter('/')
  return render(AppFooter, { global: { plugins: [router] } })
}

describe('AppFooter', () => {
  it('genera los enlaces de contacto correctos', async () => {
    await renderFooter()

    const whatsapp = screen.getByRole('link', { name: /whatsapp/i })
    const email = screen.getByRole('link', { name: /correo/i })
    const phone = screen.getByRole('link', { name: /llamar/i })
    const location = screen.getByRole('link', { name: /google maps/i })

    expect(whatsapp).toHaveAttribute(
      'href',
      `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    )
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(email).toHaveAttribute('href', `mailto:${contact.email}`)
    expect(phone).toHaveAttribute('href', contact.phoneHref)
    expect(location).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.coordinates)}`
    )
    expect(location).toHaveAttribute('target', '_blank')
  })

  it('muestra ubicación, correo, teléfono y lema', async () => {
    await renderFooter()

    expect(screen.getByText(contact.location)).toBeInTheDocument()
    expect(screen.getByText(contact.email)).toBeInTheDocument()
    expect(screen.getByText(contact.phoneDisplay)).toBeInTheDocument()
    expect(screen.getByText(contact.tagline)).toBeInTheDocument()
  })
})
