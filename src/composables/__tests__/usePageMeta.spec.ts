import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { render } from '@testing-library/vue'
import { createTestHead } from '../../test/createTestHead'
import { pageMeta } from '../../content/pages'
import { usePageMeta, type PageMeta } from '../usePageMeta'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/assets/og/og-image.jpg`

async function resolveMeta(meta: PageMeta) {
  const head = createTestHead()
  const Probe = defineComponent({
    setup() {
      usePageMeta(meta)
      return () => null
    }
  })

  const { unmount } = render(Probe, { global: { plugins: [head] } })
  const tags = await head.resolveTags()
  unmount()

  return tags
}

function content(tags: Awaited<ReturnType<typeof resolveMeta>>, key: string) {
  return tags.find((tag) => tag.tag === 'meta' && (tag.props.name === key || tag.props.property === key))
    ?.props.content
}

describe('usePageMeta', () => {
  it('define canonical y Open Graph absolutos y únicos por ruta', async () => {
    for (const meta of Object.values(pageMeta)) {
      const url = `${SITE_URL}${meta.path}`
      const tags = await resolveMeta(meta)

      expect(url.startsWith('https://')).toBe(true)
      expect(tags.find((tag) => tag.tag === 'title')?.textContent).toBe(meta.title)
      expect(content(tags, 'description')).toBe(meta.description)
      expect(tags.find((tag) => tag.tag === 'link' && tag.props.rel === 'canonical')?.props.href).toBe(
        url
      )
      expect(content(tags, 'og:title')).toBe(meta.title)
      expect(content(tags, 'og:description')).toBe(meta.description)
      expect(content(tags, 'og:type')).toBe('website')
      expect(content(tags, 'og:url')).toBe(url)
      expect(content(tags, 'og:image')).toBe(DEFAULT_IMAGE)
      expect(content(tags, 'og:image:width')).toBe('1200')
      expect(content(tags, 'og:image:height')).toBe('630')
    }
  })

  it('usa la imagen de marca predeterminada cuando la página no define una propia', async () => {
    const tags = await resolveMeta({
      title: 'Título de prueba',
      description: 'Descripción de prueba',
      path: '/prueba'
    })

    expect(content(tags, 'og:image')).toBe(DEFAULT_IMAGE)
  })

  it('resuelve imágenes relativas contra SITE_URL y admite artículos', async () => {
    const tags = await resolveMeta({
      title: 'Artículo de prueba',
      description: 'Descripción de prueba',
      path: '/blog/articulo',
      image: '/api/blog/images?key=image:uno',
      type: 'article',
      robots: 'noindex, nofollow'
    })

    expect(content(tags, 'og:image')).toBe(
      `${SITE_URL}/api/blog/images?key=image:uno`
    )
    expect(content(tags, 'og:type')).toBe('article')
    expect(content(tags, 'robots')).toBe('noindex, nofollow')
  })

  it('respeta una imagen Open Graph propia', async () => {
    const tags = await resolveMeta({
      title: 'Título de prueba',
      description: 'Descripción de prueba',
      path: '/prueba',
      image: 'https://cdn.example.com/og.jpg'
    })

    expect(content(tags, 'og:image')).toBe('https://cdn.example.com/og.jpg')
  })
})
