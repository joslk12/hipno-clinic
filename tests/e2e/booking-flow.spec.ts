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
  await expect(page.getByText('No pudimos enviar tu mensaje')).toBeVisible()
  await expect(form.getByLabel('Nombre Completo')).toHaveValue('Luis Ramírez')
  await expect(form.getByLabel('Mensaje o Motivo de Consulta')).toHaveValue(
    'Me interesa una sesión de hipnosis.'
  )

  await form.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias por escribirnos')
  expect(attempts).toBe(2)
})

function mexicoDateKey(offsetDays = 2): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000))

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

function mockSlot(dateKey = mexicoDateKey()) {
  const slotKey = `${dateKey}T10:00`
  const [year, month, day] = dateKey.split('-').map(Number)
  // America/Mexico_City no observa horario de verano desde 2022.
  const startsAt = new Date(Date.UTC(year, month - 1, day, 16, 0)).toISOString()
  const slot = { slotKey }

  return {
    slot,
    startsAt,
    appointment: {
      id: 'appointment-1',
      slotKey,
      startsAt,
      durationMinutes: 60,
      serviceId: null,
      status: 'reserved',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '55 1234 5678',
      message: 'Quiero agendar una sesión de hipnosis.',
      createdAt: startsAt,
      updatedAt: startsAt,
      cancelledAt: null,
      notification: null
    }
  }
}

async function mockAvailability(page: Page, response?: { status: number; body: unknown }) {
  const { slot, appointment } = mockSlot()
  const requests = { slots: 0, appointments: [] as Array<Record<string, unknown>> }

  await page.route('**/api/appointments/slots**', (route) => {
    requests.slots += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slots: [
          {
            ...slot,
            startsAt: appointment.startsAt,
            durationMinutes: 60,
            serviceId: null,
            blocked: false,
            source: 'manual',
            ruleId: null
          }
        ]
      })
    })
  })

  await page.route('**/api/appointments', (route) => {
    if (route.request().method() !== 'POST') return route.continue()

    requests.appointments.push(route.request().postDataJSON() as Record<string, unknown>)

    if (response) {
      return route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body)
      })
    }

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ appointment })
    })
  })

  return requests
}

async function chooseSlotAndFill(page: Page) {
  const form = contactForm(page)

  await expect(page.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible()
  await page.getByRole('button', { name: /1 horario/ }).click()
  await page.getByRole('button', { name: '10:00' }).click()

  await form.getByLabel('Nombre Completo').fill('Ana Pérez')
  await form.getByLabel('Correo Electrónico').fill('ana@example.com')
  await form.getByLabel(/Teléfono o WhatsApp/).fill('55 1234 5678')
  await form.getByLabel('Mensaje o Motivo de Consulta').fill('Quiero agendar una sesión de hipnosis.')
}

test('reserva la cita cuando hay horarios disponibles', async ({ page }) => {
  const requests = await mockAvailability(page)
  const otherPosts: string[] = []

  page.on('request', (request) => {
    if (request.method() === 'POST' && !request.url().includes('/api/appointments')) {
      otherPosts.push(request.url())
    }
  })

  await page.goto('/contacto')
  await chooseSlotAndFill(page)
  await page.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()

  await expect(page.getByText('Tu cita está confirmada')).toBeVisible()
  expect(requests.appointments).toHaveLength(1)
  expect(requests.appointments[0]).toMatchObject({
    slotKey: `${mexicoDateKey()}T10:00`,
    name: 'Ana Pérez',
    email: 'ana@example.com'
  })
  expect(otherPosts).toEqual([])
})

test('recarga la disponibilidad y avisa cuando el horario ya fue reservado', async ({ page }) => {
  const requests = await mockAvailability(page, {
    status: 409,
    body: { error: 'Ese horario ya no está disponible.' }
  })

  await page.goto('/contacto')
  await chooseSlotAndFill(page)
  await page.getByRole('button', { name: 'ENVIAR MENSAJE' }).click()

  await expect(page.getByText('Ese horario ya no está disponible. Elige otro, por favor.')).toBeVisible()
  expect(requests.appointments).toHaveLength(1)
  expect(requests.slots).toBeGreaterThan(1)
})
