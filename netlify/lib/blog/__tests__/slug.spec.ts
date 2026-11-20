import { describe, expect, it } from 'vitest'
import { ensureUniqueSlug, isValidSlug, slugify } from '../slug'

describe('blog slugs', () => {
  it('normaliza acentos, espacios y símbolos', () => {
    expect(slugify('Hipnosis Regresiva: primeros pasos')).toBe('hipnosis-regresiva-primeros-pasos')
    expect(slugify('Sanación emocional')).toBe('sanacion-emocional')
    expect(slugify('   ')).toBe('articulo')
  })

  it('valida el formato del slug', () => {
    expect(isValidSlug('hipnosis-regresiva')).toBe(true)
    expect(isValidSlug('Hipnosis Regresiva')).toBe(false)
    expect(isValidSlug('-hola')).toBe(false)
  })

  it('evita slugs reservados y duplicados', () => {
    expect(ensureUniqueSlug('blog', [])).toBe('blog-articulo')
    expect(ensureUniqueSlug('hola', [{ id: '1', slug: 'hola' }])).toBe('hola-2')
    expect(ensureUniqueSlug('hola', [{ id: '1', slug: 'hola' }], '1')).toBe('hola')
  })
})
