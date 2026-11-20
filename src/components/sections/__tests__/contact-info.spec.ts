import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import ContactInfo from '../ContactInfo.vue'
import { contact, WHATSAPP_MESSAGE } from '../../../content/contact'

afterEach(() => cleanup())

describe('ContactInfo', () => {
  it('genera los enlaces de contacto directos', () => {
    render(ContactInfo)

    expect(screen.getByRole('link', { name: /llamar al/i })).toHaveAttribute(
      'href',
      contact.phoneHref
    )
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute(
      'href',
      `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    )
    expect(screen.getByRole('link', { name: /correo a/i })).toHaveAttribute(
      'href',
      `mailto:${contact.email}`
    )
    expect(screen.getByText(contact.location)).toBeInTheDocument()
  })
})
