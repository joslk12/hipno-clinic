import { expect, test, type Page, type Route } from '@playwright/test'

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

interface MockState {
  slotKey: string
  mutations: Array<{ path: string; method: string; body?: unknown }>
}

async function mockAdminApi(page: Page): Promise<MockState> {
  let authenticated = false
  const mutations: MockState['mutations'] = []
  const now = new Date().toISOString()
  const slotKey = `${mexicoDateKey()}T10:00`
  const startsAt = new Date(`${slotKey.replace('T', 'T')}:00-06:00`).toISOString()

  const rules: Array<Record<string, unknown>> = []
  const slots: Array<Record<string, unknown>> = [
    {
      id: 'slot-1',
      slotKey,
      startsAt,
      durationMinutes: 60,
      serviceId: null,
      blocked: false,
      source: 'manual',
      ruleId: null,
      createdAt: now,
      updatedAt: now
    }
  ]
  const appointment: Record<string, unknown> = {
    id: 'appointment-1',
    slotKey,
    startsAt,
    durationMinutes: 60,
    serviceId: null,
    status: 'reserved',
    name: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '55 1234 5678',
    message: 'Quiero agendar una sesión.',
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    notification: null
  }

  const body = (request: { postDataJSON(): unknown }) =>
    Promise.resolve(request.postDataJSON() ?? {})
  const fulfill = (route: Route, status: number, payload: unknown) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    })

  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname

    if (path === '/api/admin/session') {
      return fulfill(route, authenticated ? 200 : 401, { authenticated })
    }

    if (path === '/api/admin/login') {
      authenticated = true
      return fulfill(route, 200, { ok: true })
    }

    if (path === '/api/admin/logout') {
      authenticated = false
      return fulfill(route, 200, { ok: true })
    }

    if (!path.startsWith('/api/admin/appointments/')) {
      return fulfill(route, 404, { error: 'Ruta no encontrada.' })
    }

    if (!authenticated) {
      return fulfill(route, 401, { error: 'Sesión no válida o expirada.' })
    }

    if (path === '/api/admin/appointments/rules') {
      if (method === 'GET') return fulfill(route, 200, { rules })

      if (method === 'POST') {
        const input = (await body(request)) as Record<string, unknown>
        mutations.push({ path, method, body: input })
        const rule = { id: 'rule-1', ...input, createdAt: now, updatedAt: now }
        rules.push(rule)
        return fulfill(route, 201, { rule })
      }
    }

    if (path === '/api/admin/appointments/slots') {
      if (method === 'GET') return fulfill(route, 200, { slots })

      if (method === 'PATCH') {
        const input = (await body(request)) as Record<string, unknown>
        mutations.push({ path: `${path}?slotKey=${url.searchParams.get('slotKey')}`, method, body: input })
        const slot = slots.find((item) => item.slotKey === url.searchParams.get('slotKey'))
        if (slot) {
          slot.blocked = input.blocked
          slot.updatedAt = now
        }
        return fulfill(route, 200, { slot })
      }
    }

    if (path === '/api/admin/appointments/bookings') {
      if (method === 'GET') return fulfill(route, 200, { appointments: [appointment] })

      if (method === 'PATCH') {
        mutations.push({ path: `${path}?id=${url.searchParams.get('id')}`, method })
        appointment.status = 'cancelled'
        appointment.cancelledAt = now
        appointment.updatedAt = now
        return fulfill(route, 200, { appointment })
      }
    }

    return fulfill(route, 404, { error: 'Ruta no encontrada.' })
  })

  return { slotKey, mutations }
}

test('gestiona reglas, bloqueos y citas desde /admin/citas', async ({ page }) => {
  const { slotKey, mutations } = await mockAdminApi(page)
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/admin/citas')
  await expect(page.getByRole('heading', { level: 1, name: 'Panel de administrador' })).toBeVisible()

  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Citas' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible()

  await page.getByRole('checkbox', { name: 'lunes 11:00' }).check()
  await page.locator('#grid-duration').fill('90')
  await page.getByRole('button', { name: 'GUARDAR DISPONIBILIDAD' }).click()

  await expect(page.getByText('Disponibilidad guardada (1 horarios).')).toBeVisible()
  await expect(page.locator('td[title="11:00"]')).toBeVisible()
  expect(mutations[0]).toMatchObject({
    path: '/api/admin/appointments/rules',
    method: 'POST',
    body: { weekday: 1, startTime: '11:00', durationMinutes: 90 }
  })

  await page.getByRole('button', { name: 'BLOQUEAR' }).click()

  await expect(page.getByText('Horario bloqueado.')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Bloqueado' })).toBeVisible()
  expect(mutations[1]).toMatchObject({
    path: `/api/admin/appointments/slots?slotKey=${slotKey}`,
    method: 'PATCH',
    body: { blocked: true }
  })

  await page.getByRole('button', { name: 'CANCELAR CITA' }).click()

  await expect(page.getByText('Cita cancelada. El horario vuelve a estar disponible.')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Cancelada' })).toBeVisible()
  expect(mutations[2]).toMatchObject({
    path: '/api/admin/appointments/bookings?id=appointment-1',
    method: 'PATCH'
  })
})
