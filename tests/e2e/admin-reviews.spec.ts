import { expect, test, type Page, type Route } from '@playwright/test'

interface MockClient {
  id: string
  name: string
  email: string
  whatsapp: string
  createdAt: string
  updatedAt: string
}

interface MockInvitation {
  id: string
  clientId: string
  status: string
  history: Array<{ channel: string; sentAt: string; ok: boolean }>
}

async function mockAdminApi(page: Page) {
  let authenticated = false
  const clients: MockClient[] = []
  const invitations: MockInvitation[] = []
  const sends: Array<Record<string, unknown>> = []
  let providerError = false

  await page.route('**/api/admin/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const body = async () => {
      try {
        return (await request.postDataJSON()) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    const fulfill = (status: number, payload: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      })

    if (url.pathname === '/api/admin/session') {
      return fulfill(authenticated ? 200 : 401, { authenticated })
    }
    if (url.pathname === '/api/admin/login') {
      authenticated = true
      return fulfill(200, { ok: true })
    }
    if (url.pathname === '/api/admin/logout') {
      authenticated = false
      return fulfill(200, { ok: true })
    }
    if (url.pathname === '/api/admin/review-clients') {
      if (!authenticated) return fulfill(401, { error: 'Sesión no válida o expirada.' })

      if (method === 'GET') return fulfill(200, { clients })

      if (method === 'POST') {
        const input = await body()
        const now = new Date().toISOString()
        const client: MockClient = {
          id: `client-${clients.length + 1}`,
          name: String(input.name ?? ''),
          email: String(input.email ?? ''),
          whatsapp: String(input.whatsapp ?? ''),
          createdAt: now,
          updatedAt: now
        }
        clients.push(client)
        return fulfill(201, { client, message: 'Cliente registrado.' })
      }
    }
    if (url.pathname === '/api/admin/review-invitations') {
      if (!authenticated) return fulfill(401, { error: 'Sesión no válida o expirada.' })

      if (method === 'GET') {
        return fulfill(200, {
          invitations,
          channels: { email: true, whatsapp: true }
        })
      }
      if (method === 'POST') {
        const input = await body()
        sends.push(input)
        const channels = (input.channels as string[]) ?? []
        const invitationId = `inv-${invitations.length + 1}`
        if (input.invitationId) {
          const previous = invitations.find((item) => item.id === input.invitationId)
          if (previous) previous.status = 'expirada'
        }
        invitations.push({
          id: invitationId,
          clientId: String(input.clientId ?? ''),
          status: providerError ? 'pendiente' : 'enviada',
          history: channels.map((channel) => ({
            channel,
            sentAt: new Date().toISOString(),
            ok: !providerError
          }))
        })
        return fulfill(200, {
          invitationId,
          link: 'https://origenconsciente.mx/resenas?token=token-e2e',
          status: providerError ? 'pendiente' : 'enviada',
          results: channels.map((channel) => ({
            channel,
            ok: !providerError,
            ...(providerError ? { error: 'Proveedor rechazado' } : {})
          })),
          message: providerError ? 'No se pudo enviar la liga.' : 'Liga enviada.'
        })
      }
    }

    return fulfill(404, { error: 'Ruta no encontrada.' })
  })

  return {
    failProvider() {
      providerError = true
    },
    redeemLast() {
      const last = invitations.at(-1)
      if (last) last.status = 'canjeada'
    },
    sends
  }
}

test('pide login y gestiona clientes e invitaciones', async ({ page }) => {
  const api = await mockAdminApi(page)

  await page.goto('/admin/resenas')
  await expect(page.getByRole('heading', { name: 'Panel de administrador' })).toBeVisible()
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Reseñas por invitación' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.locator('input[autocomplete="name"]').fill('Ana López')
  await page.locator('input[autocomplete="email"]').fill('ana@example.com')
  await page.locator('input[autocomplete="tel-national"]').fill('5631270122')
  await page.getByRole('button', { name: 'Guardar cliente' }).click()

  await expect(page.getByRole('cell', { name: 'Ana López' })).toBeVisible()

  await page.getByRole('button', { name: 'Elegir' }).click()
  await page.getByRole('checkbox', { name: 'Correo' }).check()
  await page.getByRole('checkbox', { name: 'WhatsApp' }).check()
  await page.getByRole('button', { name: 'ENVIAR LIGA' }).click()

  await expect(page.getByRole('heading', { name: 'Resultado del envío' })).toBeVisible()
  await expect(page.getByText(/email: enviado/)).toBeVisible()
  await expect(page.getByText(/whatsapp: enviado/)).toBeVisible()
  expect(api.sends[0]).toMatchObject({
    clientId: 'client-1',
    channels: ['email', 'whatsapp']
  })
})

test('muestra el error del proveedor y permite reintentar', async ({ page }) => {
  const api = await mockAdminApi(page)
  api.failProvider()

  await page.goto('/admin/resenas')
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.locator('input[autocomplete="name"]').fill('Ana López')
  await page.locator('input[autocomplete="email"]').fill('ana@example.com')
  await page.getByRole('button', { name: 'Guardar cliente' }).click()
  await page.getByRole('button', { name: 'Elegir' }).click()
  await page.getByRole('checkbox', { name: 'Correo' }).check()
  await page.getByRole('button', { name: 'ENVIAR LIGA' }).click()

  await expect(page.getByText(/Proveedor rechazado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENVIAR LIGA' })).toBeEnabled()
})

test('reenvía una liga nueva cuando la anterior fue canjeada', async ({ page }) => {
  const api = await mockAdminApi(page)

  await page.goto('/admin/resenas')
  await page.getByLabel('Contraseña').fill('secreto')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  await page.locator('input[autocomplete="name"]').fill('Ana López')
  await page.locator('input[autocomplete="email"]').fill('ana@example.com')
  await page.getByRole('button', { name: 'Guardar cliente' }).click()
  await page.getByRole('button', { name: 'Elegir' }).click()
  await page.getByRole('button', { name: 'ENVIAR LIGA' }).click()
  await expect(page.getByRole('heading', { name: 'Resultado del envío' })).toBeVisible()

  api.redeemLast()
  await page.reload()
  await page.getByRole('button', { name: 'Elegir' }).click()
  await expect(page.getByRole('button', { name: 'REENVIAR (NUEVA LIGA)' })).toBeVisible()
  await page.getByRole('button', { name: 'REENVIAR (NUEVA LIGA)' }).click()

  await expect(page.getByRole('heading', { name: 'Resultado del envío' })).toBeVisible()
  expect(api.sends).toHaveLength(2)
  expect(api.sends[1]).toMatchObject({ clientId: 'client-1', invitationId: 'inv-1' })
})
