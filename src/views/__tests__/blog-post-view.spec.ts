import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import BlogPostView from '../BlogPostView.vue'
import { createTestHead } from '../../test/createTestHead'

const { post } = vi.hoisted(() => ({
  post: {
    id: 'uno',
    slug: 'hipnosis-regresiva',
    title: 'Hipnosis regresiva',
    excerpt: 'Una guía breve para comprender qué ocurre en una sesión de hipnosis regresiva.',
    contentHtml: '<h2>Contenido</h2><p>Texto seguro.</p><script>alert(1)</script>',
    coverImage: null,
    publishedAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z'
  }
}))

vi.mock('../../content/blog', () => ({
  getBlogPost: (slug: string) => (slug === post.slug ? post : undefined),
  formatBlogDate: () => '15 de enero de 2026'
}))

const StubView = defineComponent({ render: () => null })

async function renderAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/blog/:slug', component: StubView },
      { path: '/blog', component: StubView },
      { path: '/:pathMatch(.*)*', component: StubView }
    ]
  })
  await router.push(path)
  await router.isReady()

  const result = render(BlogPostView, {
    global: { plugins: [router, createTestHead()] }
  })

  return result
}

afterEach(() => cleanup())

describe('BlogPostView', () => {
  it('muestra el artículo y sanea el HTML', async () => {
    const { container } = await renderAt('/blog/hipnosis-regresiva')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hipnosis regresiva' })
    ).toBeInTheDocument()
    expect(screen.getByText('15 de enero de 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al blog/ })).toHaveAttribute('href', '/blog')
    expect(container.querySelector('.blog-content h2')?.textContent).toBe('Contenido')
    expect(container.querySelector('script')).toBeNull()
  })

  it('muestra 404 para un slug inexistente', async () => {
    await renderAt('/blog/no-existe')

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })
    ).toBeInTheDocument()
  })
})
