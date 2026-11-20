// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  detectSpam,
  hashIp,
  validateReviewInput,
  type ValidReviewInput
} from '../validation'

const validInput: ValidReviewInput = {
  name: 'Ana López',
  rating: 5,
  message: 'La sesión me ayudó a comprender muchas cosas y me sentí muy acompañada.',
  consent: true,
  honeypot: '',
  invitationToken: 'token-de-prueba-valido'
}

describe('validateReviewInput', () => {
  it('acepta una reseña válida y normaliza espacios', () => {
    const result = validateReviewInput({ ...validInput, name: '  Ana López  ' })

    expect(result).toEqual({
      ok: true,
      value: { ...validInput, name: 'Ana López' }
    })
  })

  it('rechaza nombre, calificación, mensaje y consentimiento inválidos', () => {
    const result = validateReviewInput({
      name: 'A',
      rating: 6,
      message: 'Corto',
      consent: false
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fields.name).toMatch(/2 a 60/)
      expect(result.fields.rating).toMatch(/1 a 5/)
      expect(result.fields.message).toMatch(/10 a 1000/)
      expect(result.fields.consent).toMatch(/consentimiento/)
    }
  })

  it('rechaza calificaciones no enteras o enviadas como texto', () => {
    expect(validateReviewInput({ ...validInput, rating: 4.5 }).ok).toBe(false)
    expect(validateReviewInput({ ...validInput, rating: '5' }).ok).toBe(false)
  })

  it('rechaza cuerpos que no son objetos', () => {
    expect(validateReviewInput(null).ok).toBe(false)
    expect(validateReviewInput([]).ok).toBe(false)
    expect(validateReviewInput('texto').ok).toBe(false)
  })
})

describe('detectSpam', () => {
  it('marca enlaces como sospechosos', () => {
    const result = detectSpam({
      ...validInput,
      message: 'Visita https://spam.example.com para ganar dinero rápido.'
    })

    expect(result.suspicious).toBe(true)
    expect(result.reasons).toContain('url')
  })

  it('marca términos bloqueados sin distinguir acentos ni mayúsculas', () => {
    const result = detectSpam({
      ...validInput,
      message: 'Te ofrezco un PRÉSTAMO inmediato y sin trámites.'
    })

    expect(result.suspicious).toBe(true)
    expect(result.reasons).toContain('blocked-term')
  })

  it('marca texto con mayúsculas excesivas o caracteres repetidos', () => {
    expect(
      detectSpam({
        ...validInput,
        message: 'ESTA RESEÑA ESTA ESCRITA COMPLETAMENTE EN MAYUSCULAS PARA PARECER SPAM'
      }).suspicious
    ).toBe(true)
    expect(detectSpam({ ...validInput, message: 'Excelenteeeeeeeeeeee la sesión' }).suspicious).toBe(
      true
    )
  })

  it('no marca una reseña limpia', () => {
    expect(detectSpam(validInput)).toEqual({ suspicious: false, reasons: [] })
  })
})

describe('hashIp', () => {
  it('genera un hash determinista y no reversible', () => {
    const hash = hashIp('192.168.1.1', 'salt')

    expect(hash).toHaveLength(64)
    expect(hash).toBe(hashIp('192.168.1.1', 'salt'))
    expect(hash).not.toContain('192.168.1.1')
    expect(hash).not.toBe(hashIp('192.168.1.1', 'otro-salt'))
  })
})
