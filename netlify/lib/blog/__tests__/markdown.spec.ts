import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('convierte Markdown y conserva estructura segura', () => {
    const html = renderMarkdown('## Título\n\n**Fuerte** y *cursiva*\n\n- Uno\n- Dos')
    expect(html).toContain('<h2>Título</h2>')
    expect(html).toContain('<strong>Fuerte</strong>')
    expect(html).toContain('<ul>')
  })

  it('elimina scripts, eventos y URLs peligrosas', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\n[malo](javascript:alert(1))\n\n<img src="x" onerror="alert(1)">'
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
  })

  it('añade atributos seguros a imágenes y enlaces externos', () => {
    const html = renderMarkdown(
      '![foto](/api/blog/images?key=image:uno)\n\n[externo](https://example.com)'
    )
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
