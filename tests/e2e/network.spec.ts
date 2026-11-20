import { expect, test } from '@playwright/test'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

test('la primera carga no solicita recursos de terceros', async ({ page }) => {
  const thirdParty: string[] = []

  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!['http:', 'https:'].includes(url.protocol)) return
    if (!LOCAL_HOSTS.has(url.hostname)) thirdParty.push(request.url())
  })

  await page.goto('/')
  await expect(page.locator('main')).toBeVisible()
  await page.waitForLoadState('networkidle')

  expect(thirdParty).toEqual([])
})

test('el mapa se carga solo al acercarse a la sección de ubicación', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })

  const mapRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('google.com/maps')) mapRequests.push(request.url())
  })

  await page.goto('/contacto')
  await expect(page.locator('main')).toBeVisible()
  await page.waitForLoadState('networkidle')

  const map = page.locator('iframe[title="Ubicación de Origen Consciente en Santiago Tolman"]')
  await expect(map).toHaveCount(0)
  expect(mapRequests).toEqual([])

  await page.getByRole('heading', { name: 'Ubicación' }).scrollIntoViewIfNeeded()
  await expect(map).toHaveCount(1)
})
