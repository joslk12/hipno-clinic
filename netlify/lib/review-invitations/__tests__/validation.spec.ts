import { describe, expect, it } from 'vitest'
import type { ReviewClient } from '../../../../src/types/review-invitations'
import {
  isValidInvitationToken,
  normalizeWhatsapp,
  validateChannels,
  validateClientInput
} from '../validation'

const client: ReviewClient = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('validateClientInput', () => {
  it('acepta nombre y un solo medio de contacto', () => {
    const result = validateClientInput({ name: ' Ana ', email: 'ANA@Example.com', whatsapp: '' })

    expect(result).toEqual({
      ok: true,
      value: { name: 'Ana', email: 'ana@example.com', whatsapp: '' }
    })
  })

  it('normaliza el WhatsApp a dígitos con código de país', () => {
    const result = validateClientInput({ name: 'Ana', email: '', whatsapp: '+52 (56) 3127-0122' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.whatsapp).toBe('525631270122')
  })

  it('rechaza contacto inválido y falta de medios', () => {
    const invalid = validateClientInput({ name: 'Ana', email: 'correo', whatsapp: '123' })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(Object.keys(invalid.fields).sort()).toEqual(['email', 'whatsapp'])

    const empty = validateClientInput({ name: 'Ana', email: '', whatsapp: '' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.fields.email).toMatch(/correo o un número/)
  })
})

describe('validateChannels', () => {
  it('dedupe canales y respeta los medios del cliente', () => {
    expect(validateChannels(['email', 'email', 'whatsapp'], client)).toEqual({
      ok: true,
      value: ['email', 'whatsapp']
    })
    expect(validateChannels([], client).ok).toBe(false)
    expect(validateChannels(['whatsapp'], { ...client, whatsapp: '' }).ok).toBe(false)
  })
})

describe('isValidInvitationToken', () => {
  it('acepta tokens opacos y rechaza basura', () => {
    expect(isValidInvitationToken('a'.repeat(43))).toBe(true)
    expect(isValidInvitationToken('short')).toBe(false)
    expect(isValidInvitationToken(123)).toBe(false)
    expect(normalizeWhatsapp('+52 56')).toBe('5256')
  })
})
