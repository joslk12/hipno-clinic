import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 800 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 3840, height: 2160 }
]
const paths = [
  '/',
  '/servicios',
  '/sobre-mi',
  '/resenas',
  '/blog',
  '/blog/hipnosis-regresiva-primeros-pasos',
  '/contacto'
]
const themes = ['light', 'dark'] as const

for (const theme of themes) {
  for (const viewport of viewports) {
    for (const path of paths) {
      test(`${theme} ${viewport.width}px ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.addInitScript((value) => localStorage.setItem('oc-theme', value), theme)
        await page.route('**/api/reviews', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ reviews: [], summary: { average: 0, count: 0 } })
          })
        )
        await page.goto(path)
        await expect(page.locator('main')).toBeVisible()

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
        expect(overflow).toBe(false)
      })
    }
  }
}
