import { expect, test, type Page, type Route } from '@playwright/test'

const VALID_TOKEN = 'token-e2e-valido'

const review = {
  id: '1',
  name: 'Ana López',
  rating: 5,
  message: 'Una experiencia muy clara y respetuosa.',
  createdAt: '2026-01-01T12:00:00.000Z'
}

const listResponse = {
  reviews: [review],
  summary: { average: 5, count: 1 }
}

const emptyResponse = {
  reviews: [],
  summary: { average: 0, count: 0 }
}

async function fillForm(page: Page) {
  await page.getByLabel('Tu nombre').fill('María')
  await page.locator('label[for="review-rating-5"]').click()
  await page
    .getByLabel('Tu reseña')
    .fill('Me sentí acompañada durante todo el proceso.')
  await page.getByLabel('Acepto que mi reseña se publique en el sitio.').check()
}

function json(route: Route, status: number, payload: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  })
}

async function mockReviewsApi(
  page: Page,
  options: {
    invitation?: 'valid' | 'invalid' | 'error'
    list?: typeof listResponse | typeof emptyResponse
    listAfterPost?: typeof listResponse | typeof emptyResponse
    post?: (route: Route) => Promise<void> | void
  } = {}
) {
  await page.route('**/api/reviews/invitation**', (route) => {
    const token = new URL(route.request().url()).searchParams.get('token')

    if (options.invitation === 'error') return json(route, 500, { error: 'No disponible.' })
    if (token === VALID_TOKEN) return json(route, 200, { valid: true })
    return json(route, 200, { valid: false })
  })

  let submitted = false

  await page.route('**/api/reviews', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = true
      if (options.post) return options.post(route)
      return json(route, 201, {
        review,
        status: 'approved',
        message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
      })
    }

    const nextList = options.listAfterPost ?? (submitted ? listResponse : (options.list ?? emptyResponse))
    return json(route, 200, nextList)
  })
}

test('muestra el listado y el resumen de reseñas aprobadas', async ({ page }) => {
  await mockReviewsApi(page, { list: listResponse })

  await page.goto('/resenas')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Lo que dicen nuestros clientes'
  )
  await expect(page.getByText('Ana López')).toBeVisible()
  await expect(page.getByText('Una experiencia muy clara y respetuosa.')).toBeVisible()
  await expect(page.getByText('5.0')).toBeVisible()
  await expect(page.getByText('1 reseña publicada')).toBeVisible()
  await expect(page.getByText('Las reseñas se escriben solo con una invitación privada.')).toBeVisible()
})

test('sin token no muestra el formulario', async ({ page }) => {
  await mockReviewsApi(page)

  await page.goto('/resenas')

  await expect(page.getByRole('heading', { name: 'Reseñas por invitación' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PUBLICAR RESEÑA' })).toHaveCount(0)
})

test('con un token inválido no muestra el formulario', async ({ page }) => {
  await mockReviewsApi(page)

  await page.goto('/resenas?token=token-invalido')

  await expect(page.getByRole('heading', { name: 'Reseñas por invitación' })).toBeVisible()
  await expect(page.getByText('Esta liga ya no es válida.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PUBLICAR RESEÑA' })).toHaveCount(0)
})

test('publica una reseña aprobada con token válido y recarga el listado', async ({ page }) => {
  let sentToken: string | null = null

  await mockReviewsApi(page, {
    post: async (route) => {
      const body = (await route.request().postDataJSON()) as Record<string, unknown>
      sentToken = String(body.invitationToken ?? '')
      await json(route, 201, {
        review,
        status: 'approved',
        message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
      })
    }
  })

  await page.goto(`/resenas?token=${VALID_TOKEN}`)
  await expect(page.getByText('Aún no hay reseñas publicadas.')).toBeVisible()

  await fillForm(page)
  await page.getByRole('button', { name: 'PUBLICAR RESEÑA' }).click()

  await expect(
    page.getByText('Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!')
  ).toBeVisible()
  await expect(page.getByText('Ana López')).toBeVisible()
  await expect(page.getByText('Aún no hay reseñas publicadas.')).toHaveCount(0)
  expect(sentToken).toBe(VALID_TOKEN)
})

test('muestra el mensaje de moderación para una reseña pendiente', async ({ page }) => {
  await mockReviewsApi(page, {
    listAfterPost: emptyResponse,
    post: (route) =>
      json(route, 201, {
        review: { ...review, name: 'María' },
        status: 'pending',
        message: 'Tu reseña quedó pendiente de revisión. ¡Gracias por compartir tu experiencia!'
      })
  })

  await page.goto(`/resenas?token=${VALID_TOKEN}`)
  await fillForm(page)
  await page.getByRole('button', { name: 'PUBLICAR RESEÑA' }).click()

  await expect(
    page.getByText('Tu reseña quedó pendiente de revisión. ¡Gracias por compartir tu experiencia!')
  ).toBeVisible()
  await expect(page.getByText('Aún no hay reseñas publicadas.')).toBeVisible()
})

test('rechaza un token ya utilizado', async ({ page }) => {
  let posts = 0

  await mockReviewsApi(page, {
    post: (route) => {
      posts += 1
      if (posts === 1) {
        return json(route, 201, {
          review,
          status: 'approved',
          message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
        })
      }
      return json(route, 403, { error: 'La invitación no es válida, expiró o ya fue utilizada.' })
    }
  })

  await page.goto(`/resenas?token=${VALID_TOKEN}`)
  await fillForm(page)
  await page.getByRole('button', { name: 'PUBLICAR RESEÑA' }).click()
  await expect(page.getByText('Tu reseña ya está publicada.')).toBeVisible()

  await fillForm(page)
  await page.getByRole('button', { name: 'PUBLICAR RESEÑA' }).click()

  await expect(page.getByRole('alert')).toHaveText(/ya fue utilizada/)
  expect(posts).toBe(2)
})

test('muestra un error si no se puede validar la invitación', async ({ page }) => {
  await mockReviewsApi(page, { invitation: 'error' })

  await page.goto(`/resenas?token=${VALID_TOKEN}`)

  await expect(page.getByText('No pudimos validar la invitación.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PUBLICAR RESEÑA' })).toHaveCount(0)
})

test('muestra el error de carga y permite reintentar', async ({ page }) => {
  let attempts = 0

  await page.route('**/api/reviews/invitation**', (route) =>
    json(route, 200, { valid: false })
  )
  await page.route('**/api/reviews', (route) => {
    attempts += 1

    if (attempts === 1) {
      return json(route, 500, { error: 'No pudimos procesar las reseñas.' })
    }

    return json(route, 200, listResponse)
  })

  await page.goto('/resenas')

  await expect(page.getByRole('alert')).toContainText('No pudimos procesar las reseñas.')

  await page.getByRole('button', { name: 'Reintentar' }).click()

  await expect(page.getByText('Ana López')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
