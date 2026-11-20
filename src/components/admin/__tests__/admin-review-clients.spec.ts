import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import AdminReviewClientForm from '../AdminReviewClientForm.vue'
import AdminReviewClientList from '../AdminReviewClientList.vue'

afterEach(() => cleanup())

const client = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('AdminReviewClientList', () => {
  it('lista clientes con estado y permite elegir, editar y eliminar', async () => {
    const { emitted } = render(AdminReviewClientList, {
      props: {
        clients: [client],
        invitations: [
          {
            id: 'inv-1',
            clientId: client.id,
            clientName: client.name,
            createdAt: client.createdAt,
            expiresAt: '2026-02-01T00:00:00.000Z',
            status: 'enviada',
            lastSentAt: '2026-01-02T00:00:00.000Z',
            history: []
          }
        ]
      }
    })

    expect(screen.getByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('Enviada')).toBeInTheDocument()
    expect(screen.getByText('2026-01-02T00:00:00.000Z')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(emitted().select).toHaveLength(1)
    expect(emitted().edit).toHaveLength(1)
    expect(emitted().delete).toHaveLength(1)
  })

  it('muestra estados de carga, error y vacío', async () => {
    const { emitted, rerender } = render(AdminReviewClientList, {
      props: { clients: [], invitations: [], loading: true }
    })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando clientes…')

    await rerender({
      clients: [],
      invitations: [],
      loading: false,
      error: 'No pudimos cargar los clientes.'
    })
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los clientes.')

    await rerender({ clients: [], invitations: [], loading: false, error: '' })
    expect(screen.getByText('Aún no hay clientes registrados.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    expect(emitted().create).toHaveLength(1)
  })
})

describe('AdminReviewClientForm', () => {
  it('emite los datos recortados al guardar', async () => {
    const { emitted } = render(AdminReviewClientForm, { props: { client: null } })

    await fireEvent.update(screen.getByLabelText('Nombre'), '  Ana López  ')
    await fireEvent.update(screen.getByLabelText(/Correo electrónico/), ' ana@example.com ')
    await fireEvent.update(screen.getByLabelText(/WhatsApp/), ' 525631270122 ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }))

    expect(emitted().save).toEqual([
      [{ name: 'Ana López', email: 'ana@example.com', whatsapp: '525631270122' }]
    ])
  })

  it('carga los datos del cliente a editar y permite cancelar', async () => {
    const { emitted } = render(AdminReviewClientForm, { props: { client } })

    expect(screen.getByLabelText('Nombre')).toHaveValue(client.name)
    expect(screen.getByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(emitted().cancel).toHaveLength(1)
  })
})
