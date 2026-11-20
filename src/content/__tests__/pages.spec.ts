import { describe, expect, it } from 'vitest'
import { pageMeta } from '../pages'

const pages = Object.values(pageMeta)

describe('pageMeta', () => {
  it('define títulos, descripciones y rutas únicas para cada página', () => {
    expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length)
    expect(new Set(pages.map((page) => page.description)).size).toBe(pages.length)
    expect(new Set(pages.map((page) => page.path)).size).toBe(pages.length)

    for (const page of pages) {
      expect(page.title.length).toBeGreaterThan(20)
      expect(page.description.length).toBeGreaterThan(40)
      expect(page.path.startsWith('/')).toBe(true)
    }
  })
})
