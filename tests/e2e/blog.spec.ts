import { expect, test } from '@playwright/test'

const firstSlug = 'sanacion-emocional-en-la-vida-cotidiana'
const secondSlug = 'hipnosis-regresiva-primeros-pasos'

test('lista los artículos publicados del fixture en orden descendente', async ({ page }) => {
  await page.goto('/blog')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Ideas para acompañar tu proceso' })
  ).toBeVisible()

  const articles = page.locator('main article')
  await expect(articles).toHaveCount(2)
  await expect(articles.first().getByRole('heading', { level: 2 })).toHaveText(
    'Sanación emocional en la vida cotidiana'
  )
  await expect(articles.nth(1).getByRole('heading', { level: 2 })).toHaveText(
    'Hipnosis regresiva: primeros pasos'
  )
})

test('abre el detalle, muestra metadatos y permite volver', async ({ page }) => {
  await page.goto(`/blog/${firstSlug}`)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sanación emocional en la vida cotidiana' })
  ).toBeVisible()
  await expect(page.locator('main .blog-content h2').first()).toHaveText('Escuchar lo que sientes')
  await expect(page).toHaveTitle('Sanación emocional en la vida cotidiana | Origen Consciente')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://origenconsciente.mx/blog/${firstSlug}`
  )

  await page.getByRole('link', { name: /Volver al blog/ }).click()
  await expect(page).toHaveURL(/\/blog$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Ideas para acompañar tu proceso' })).toBeVisible()
})

test('muestra 404 para un artículo inexistente', async ({ page }) => {
  await page.goto('/blog/no-existe')

  await expect(page.getByText('404')).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Página no encontrada' })
  ).toBeVisible()
})

test('el detalle del blog no solicita recursos de terceros', async ({ page }) => {
  const thirdParty: string[] = []
  const localHosts = new Set(['127.0.0.1', 'localhost'])

  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['http:', 'https:'].includes(url.protocol)) return
    if (!localHosts.has(url.hostname)) thirdParty.push(request.url())
  })

  await page.goto(`/blog/${secondSlug}`)
  await page.waitForLoadState('networkidle')

  const imageSources = await page.locator('main img').evaluateAll((images) =>
    images.map((image) => (image as HTMLImageElement).src)
  )
  for (const source of imageSources) {
    expect(new URL(source).origin).toBe('http://127.0.0.1:4173')
  }
  expect(thirdParty).toEqual([])
})
