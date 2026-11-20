import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/vue'
import ReviewList from '../ReviewList.vue'
import type { PublicReview } from '../../../types/reviews'

afterEach(() => cleanup())

const reviews: PublicReview[] = [
  {
    id: '1',
    name: 'Ana López',
    rating: 5,
    message: 'Una experiencia muy clara y respetuosa.',
    createdAt: '2026-01-01T12:00:00.000Z'
  },
  {
    id: '2',
    name: 'María',
    rating: 4,
    message: 'Me sentí acompañada durante todo el proceso.',
    createdAt: '2026-02-01T12:00:00.000Z'
  }
]

describe('ReviewList', () => {
  it('muestra el estado de carga', () => {
    render(ReviewList, { props: { reviews: [], status: 'loading' } })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando reseñas…')
  })

  it('muestra el estado vacío', () => {
    render(ReviewList, { props: { reviews: [] } })

    expect(screen.getByText('Aún no hay reseñas publicadas.')).toBeInTheDocument()
    expect(
      screen.getByText('Sé la primera persona en compartir su experiencia.')
    ).toBeInTheDocument()
  })

  it('muestra el error y emite reintento', async () => {
    const { emitted } = render(ReviewList, {
      props: { reviews: [], status: 'error', error: 'No pudimos cargar las reseñas.' }
    })

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar las reseñas.')

    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(emitted().retry).toHaveLength(1)
  })

  it('lista las reseñas con nombre, estrellas, fecha y mensaje', () => {
    render(ReviewList, { props: { reviews } })

    expect(screen.getByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('Una experiencia muy clara y respetuosa.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4 de 5 estrellas' })).toBeInTheDocument()
    expect(screen.getByText('1 de enero de 2026')).toBeInTheDocument()
    expect(screen.getByText('1 de febrero de 2026')).toBeInTheDocument()
  })

  it('usa el mensaje de error por defecto', () => {
    render(ReviewList, { props: { reviews: [], status: 'error' } })

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar las reseñas.')
  })
})
