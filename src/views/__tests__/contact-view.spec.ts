import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import { createPinia } from 'pinia'
import ContactView from '../ContactView.vue'
import { createTestHead } from '../../test/createTestHead'

afterEach(() => cleanup())

describe('ContactView', () => {
  it('compone el formulario, el contacto directo y la ubicación', () => {
    render(ContactView, { global: { plugins: [createPinia(), createTestHead()] } })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agenda tu sesión')
    expect(screen.getByLabelText('Nombre Completo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENVIAR MENSAJE' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Contacto directo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Ubicación' })).toBeInTheDocument()
  })
})
