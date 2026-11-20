import { describe, expect, it } from 'vitest'
import { validatePostInput } from '../validation'

const valid = {
  title: 'Hipnosis regresiva',
  excerpt: 'Una guía breve para comprender qué ocurre en una sesión de hipnosis regresiva.',
  contentMarkdown: '## Contenido\n\nEste es un contenido suficientemente largo para validar el artículo.',
  coverImage: null,
  status: 'draft'
}

describe('validatePostInput', () => {
  it('acepta un artículo válido', () => {
    const result = validatePostInput(valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe(valid.title)
  })

  it('rechaza campos fuera de límites', () => {
    const result = validatePostInput({ ...valid, title: 'a', excerpt: 'corto', status: 'otro' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fields.title).toBeTruthy()
      expect(result.fields.excerpt).toBeTruthy()
      expect(result.fields.status).toBeTruthy()
    }
  })

  it('valida el slug y la portada', () => {
    const result = validatePostInput({
      ...valid,
      slug: 'Slug inválido',
      coverImage: 'https://example.com/foto.jpg'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fields.slug).toBeTruthy()
      expect(result.fields.coverImage).toBeTruthy()
    }
  })

  it('permite actualizaciones parciales', () => {
    const result = validatePostInput({ status: 'published' }, { partial: true })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ status: 'published' })
  })
})
