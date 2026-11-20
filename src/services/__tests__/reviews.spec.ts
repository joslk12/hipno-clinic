import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReview, listReviews, ReviewsApiError } from '../reviews'

afterEach(() => {
  vi.unstubAllGlobals()
})

const payload = {
  name: 'Ana López',
  rating: 5,
  message: 'Una experiencia muy clara y respetuosa.',
  consent: true,
  honeypot: '',
  invitationToken: 'token-de-prueba-valido'
}

describe('listReviews', () => {
  it('obtiene las reseñas públicas', async () => {
    const data = {
      reviews: [
        {
          id: '1',
          name: 'Ana',
          rating: 5,
          message: 'Excelente experiencia.',
          createdAt: '2026-01-01T12:00:00.000Z'
        }
      ],
      summary: { average: 5, count: 1 }
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(listReviews()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews', {
      headers: { Accept: 'application/json' }
    })
  })

  it('convierte los errores del servidor en ReviewsApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'No pudimos procesar las reseñas.' })
      })
    )

    await expect(listReviews()).rejects.toMatchObject({
      name: 'ReviewsApiError',
      status: 500,
      message: 'No pudimos procesar las reseñas.'
    })
  })

  it('usa un mensaje de respaldo si el error no es JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('invalid json')
        }
      })
    )

    await expect(listReviews()).rejects.toMatchObject({
      status: 502,
      message: 'No pudimos procesar la solicitud de reseñas.'
    })
  })

  it('convierte fallos de red en ReviewsApiError con estado 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(listReviews()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('No pudimos conectar')
    })
  })
})

describe('createReview', () => {
  it('envía la reseña como JSON y devuelve el resultado', async () => {
    const result = {
      review: {
        id: '1',
        name: 'Ana López',
        rating: 5,
        message: 'Una experiencia muy clara y respetuosa.',
        createdAt: '2026-01-01T12:00:00.000Z'
      },
      status: 'approved',
      message: 'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => result
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(createReview(payload)).resolves.toEqual(result)

    const [url, init] = fetchMock.mock.calls[0]

    expect(url).toBe('/api/reviews')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(payload)
  })

  it('propaga los campos de error del servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Revisa los campos marcados.',
          fields: { name: 'Escribe tu nombre.' }
        })
      })
    )

    await expect(createReview(payload)).rejects.toMatchObject({
      status: 400,
      message: 'Revisa los campos marcados.',
      fields: { name: 'Escribe tu nombre.' }
    })
  })

  it('convierte fallos de red al enviar en ReviewsApiError con estado 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const error = await createReview(payload).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ReviewsApiError)
    expect(error).toMatchObject({
      status: 0,
      message: expect.stringContaining('No pudimos enviar')
    })
  })
})
