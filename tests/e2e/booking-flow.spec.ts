import { expect, test, type Page } from '@playwright/test'

function contactForm(page: Page) {
  return page.locator('form[name="contact"]:not([hidden])')
}

test('flujo completo servicio → contacto → envío exitoso', async ({ page }) => {
  await page.goto('/servicios')

  const regresiva = page
    .getByRole('article')
    .filter({ hasText: 'Hipnosis Regresiva' })
    .getByRole('button', { name: 'AGENDAR CITA' })
  await regresiva.click()

  const form = contactForm(page)

  await expect(page).toHaveURL(/\/contacto$/)
  await expect(page.getByText('Servicio seleccionado:')).toContainText('Hipnosis Regresiva')
  await expect(form.getByLabel('Mensaje o Motivo de Consulta')).toHaveValue(/Hipnosis Regresiva/)

  let requests = 0
  await page.route('**/*', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    requests += 1
    await route.fulfill({ status: 200, contentType: 'text/html', body: '' })
  })

  await form.getByLabel('Nombre Completo').fill('Ana Pérez')
  await form.getByLabel('Correo Electrónico').fill('ana@example.com')
  await form.getByLabel(/Teléfono o WhatsApp/).fill('55 1234 5678')
  await form.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()

  await expect(page.getByRole('status')).toContainText('Gracias por escribirnos')
  expect(requests).toBe(1)
  await expect(form.getByLabel('Nombre Completo')).toHaveValue('')
})

test('conserva los datos y permite reintentar tras un error', async ({ page }) => {
  await page.goto('/contacto')

  const form = contactForm(page)

  await form.getByLabel('Nombre Completo').fill('Luis Ramírez')
  await form.getByLabel('Correo Electrónico').fill('luis@example.com')
  await form.getByLabel('Mensaje o Motivo de Consulta').fill('Me interesa una sesión de hipnosis.')

  let attempts = 0
  await page.route('**/*', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    attempts += 1
    await route.fulfill({
      status: attempts === 1 ? 500 : 200,
      contentType: 'text/html',
      body: ''
    })
  })

  await form.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos enviar tu mensaje')
  await expect(form.getByLabel('Nombre Completo')).toHaveValue('Luis Ramírez')
  await expect(form.getByLabel('Mensaje o Motivo de Consulta')).toHaveValue(
    'Me interesa una sesión de hipnosis.'
  )

  await form.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias por escribirnos')
  expect(attempts).toBe(2)
})
