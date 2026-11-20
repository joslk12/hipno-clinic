import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import ReviewForm from '../ReviewForm.vue'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const approvedResult = {
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

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Tu nombre'), 'Ana López')
  await user.click(screen.getByRole('radio', { name: '5 de 5 estrellas' }))
  await user.type(
    screen.getByLabelText('Tu reseña'),
    'Una experiencia muy clara y respetuosa.'
  )
  await user.click(screen.getByLabelText('Acepto que mi reseña se publique en el sitio.'))
}

describe('ReviewForm', () => {
  it('muestra todos los campos y el honeypot oculto', () => {
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByLabelText('Tu reseña')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Acepto que mi reseña se publique en el sitio.')
    ).toBeInTheDocument()
    expect(document.querySelector('input[name="website"]')).toHaveAttribute('tabindex', '-1')
  })

  it('valida, asocia los errores y enfoca el primer campo inválido', async () => {
    const user = userEvent.setup()
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    const name = screen.getByLabelText('Tu nombre')
    const message = screen.getByLabelText('Tu reseña')
    const consent = screen.getByLabelText('Acepto que mi reseña se publique en el sitio.')

    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(/Escribe tu nombre/i)
    expect(message).toHaveAttribute('aria-invalid', 'true')
    expect(consent).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Elige una calificación de 1 a 5 estrellas.')).toBeInTheDocument()
    await waitFor(() => expect(name).toHaveFocus())
  })

  it('envía una reseña válida, muestra el mensaje y limpia los campos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => approvedResult
    })

    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    const { emitted } = render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Tu reseña ya está publicada. ¡Gracias por compartir tu experiencia!'
      )
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body as string)).toMatchObject({
      invitationToken: 'token-de-prueba-valido'
    })
    expect(screen.getByLabelText('Tu nombre')).toHaveValue('')
    expect(screen.getByLabelText('Tu reseña')).toHaveValue('')
    expect(screen.getByLabelText('Acepto que mi reseña se publique en el sitio.')).not.toBeChecked()
    expect(emitted().created).toHaveLength(1)
  })

  it('muestra el mensaje de moderación cuando la reseña queda pendiente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          ...approvedResult,
          status: 'pending',
          message: 'Tu reseña quedó pendiente de revisión. ¡Gracias por compartir tu experiencia!'
        })
      })
    )

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Tu reseña quedó pendiente de revisión. ¡Gracias por compartir tu experiencia!'
      )
    )
  })

  it('muestra los errores del servidor y conserva los datos', async () => {
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

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByText('Revisa los campos marcados.')).toBeInTheDocument()
    )

    expect(screen.getByText('Escribe tu nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tu nombre')).toHaveValue('Ana López')
    expect(screen.getByLabelText('Tu reseña')).toHaveValue(
      'Una experiencia muy clara y respetuosa.'
    )
  })

  it('muestra un error de red y conserva los datos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos enviar tu reseña. Revisa tu conexión e inténtalo de nuevo.'
      )
    )
    expect(screen.getByLabelText('Tu nombre')).toHaveValue('Ana López')
  })

  it('no envía si el honeypot tiene valor', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: 'token-de-prueba-valido' } })
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]')

    await fillValidForm(user)
    await fireEvent.update(honeypot as HTMLInputElement, 'spam')
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no envía sin token de invitación', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(ReviewForm, { props: { token: '' } })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'PUBLICAR RESEÑA' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/liga ya no es válida/)
  })
})
