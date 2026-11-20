import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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
  for (const path of paths) {
    test(`sin violaciones en ${theme} ${path}`, async ({ page }) => {
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

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
}
