import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import StarRating from '../StarRating.vue'

afterEach(() => cleanup())

describe('StarRating', () => {
  it('muestra el valor redondeado como texto accesible', () => {
    render(StarRating, { props: { rating: 4 } })

    expect(screen.getByRole('img', { name: '4 de 5 estrellas' })).toBeInTheDocument()
  })

  it('redondea fracciones al entero más cercano', () => {
    render(StarRating, { props: { rating: 4.6 } })

    expect(screen.getByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument()
  })

  it('oculta las estrellas decorativas a lectores de pantalla', () => {
    render(StarRating, { props: { rating: 3 } })

    const stars = screen.getByRole('img').querySelectorAll('[aria-hidden="true"]')

    expect(stars).toHaveLength(5)
  })

  it('permite personalizar el máximo de estrellas', () => {
    render(StarRating, { props: { rating: 2, max: 3 } })

    expect(screen.getByRole('img', { name: '2 de 3 estrellas' })).toBeInTheDocument()
    expect(screen.getByRole('img').querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })
})
