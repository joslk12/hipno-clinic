import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '../index'

const publicRoutes = [
  ['/', 'home'],
  ['/servicios', 'services'],
  ['/sobre-mi', 'about'],
  ['/resenas', 'reviews'],
  ['/blog', 'blog'],
  ['/contacto', 'contact']
] as const

describe('router', () => {
  it.each(publicRoutes)('resuelve %s con nombre %s', async (path, name) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    await router.push(path)

    expect(router.currentRoute.value.name).toBe(name)
  })

  it.each([
    ['/blog/hipnosis-regresiva', 'blog-post'],
    ['/admin/blog', 'admin-blog'],
    ['/admin/resenas', 'admin-reviews']
  ])('resuelve %s con nombre %s', async (path, name) => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push(path)
    expect(router.currentRoute.value.name).toBe(name)
  })

  it('muestra la ruta 404 para una ruta inexistente', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    await router.push('/ruta-inexistente')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('usa carga diferida para todas las vistas', () => {
    for (const route of routes) {
      expect(typeof route.component).toBe('function')
    }
  })
})
