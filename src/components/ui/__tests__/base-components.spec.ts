import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/vue'
import BaseButton from '../BaseButton.vue'
import BaseCard from '../BaseCard.vue'
import BaseBadge from '../BaseBadge.vue'
import BaseInput from '../BaseInput.vue'
import BaseTextarea from '../BaseTextarea.vue'
import SectionHeading from '../SectionHeading.vue'

afterEach(() => cleanup())

describe('BaseButton', () => {
  it('renderiza el texto, el estilo primario y respeta disabled', async () => {
    const onClick = vi.fn()

    render(BaseButton, {
      props: { disabled: true },
      attrs: { onClick },
      slots: { default: 'AGENDAR CITA' }
    })

    const button = screen.getByRole('button', { name: 'AGENDAR CITA' })

    expect(button).toBeDisabled()
    expect(button).toHaveClass('bg-logo-gradient', 'text-charcoal')
    expect(button).toHaveAttribute('aria-disabled', 'true')

    await fireEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('emite click cuando está habilitado', async () => {
    const onClick = vi.fn()

    render(BaseButton, {
      attrs: { onClick },
      slots: { default: 'AGENDAR CITA' }
    })

    await fireEvent.click(screen.getByRole('button', { name: 'AGENDAR CITA' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza un enlace cuando as es a', () => {
    render(BaseButton, {
      props: { as: 'a' },
      attrs: { href: '/servicios' },
      slots: { default: 'SERVICIOS' }
    })

    const link = screen.getByRole('link', { name: 'SERVICIOS' })

    expect(link).toHaveAttribute('href', '/servicios')
    expect(link).not.toHaveAttribute('type')
  })

  it('bloquea el clic y marca aria-busy en estado loading', () => {
    render(BaseButton, {
      props: { loading: true },
      slots: { default: 'GUARDANDO' }
    })

    const button = screen.getByRole('button', { name: 'GUARDANDO' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('BaseCard', () => {
  it('renderiza la superficie y el hover dorado cuando es interactiva', () => {
    const { container } = render(BaseCard, {
      props: { interactive: true },
      slots: { default: 'Contenido' }
    })

    const card = container.firstElementChild

    expect(card).toHaveClass('bg-surface', 'border-border', 'rounded-2xl', 'hover:border-accent')
  })

  it('permite cambiar la etiqueta con as', () => {
    render(BaseCard, {
      props: { as: 'article' },
      slots: { default: 'Contenido' }
    })

    expect(screen.getByRole('article')).toHaveTextContent('Contenido')
  })
})

describe('BaseBadge', () => {
  it('renderiza el tono dorado por defecto con texto oscuro', () => {
    render(BaseBadge, {
      slots: { default: '45 min' }
    })

    expect(screen.getByText('45 min')).toHaveClass('bg-accent-satin', 'text-charcoal')
  })

  it('renderiza el tono neutral', () => {
    render(BaseBadge, {
      props: { tone: 'neutral' },
      slots: { default: 'Inversión' }
    })

    expect(screen.getByText('Inversión')).toHaveClass('border-border', 'bg-surface-alt')
  })
})

describe('BaseInput', () => {
  it('asocia la etiqueta y emite update:modelValue', async () => {
    const { emitted } = render(BaseInput, {
      props: { label: 'Nombre', modelValue: '' }
    })

    const input = screen.getByLabelText('Nombre')

    await fireEvent.update(input, 'Ana')

    expect(emitted()['update:modelValue']).toEqual([['Ana']])
  })

  it('expone el error con aria-invalid y aria-describedby', () => {
    render(BaseInput, {
      props: {
        id: 'correo',
        label: 'Correo',
        error: 'Correo inválido',
        required: true
      }
    })

    const input = screen.getByLabelText('Correo')

    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'correo-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Correo inválido')
  })
})

describe('BaseTextarea', () => {
  it('renderiza un textarea con filas y emite update:modelValue', async () => {
    const { emitted } = render(BaseTextarea, {
      props: { label: 'Mensaje', rows: 6, modelValue: '' }
    })

    const textarea = screen.getByLabelText('Mensaje')

    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('rows', '6')

    await fireEvent.update(textarea, 'Hola')

    expect(emitted()['update:modelValue']).toEqual([['Hola']])
  })

  it('expone el error con aria-invalid y aria-describedby', () => {
    render(BaseTextarea, {
      props: {
        id: 'mensaje',
        label: 'Mensaje',
        error: 'Escribe un mensaje',
        required: true
      }
    })

    const textarea = screen.getByLabelText('Mensaje')

    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAttribute('aria-describedby', 'mensaje-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un mensaje')
  })
})

describe('SectionHeading', () => {
  it('renderiza h1, eyebrow y subtítulo', () => {
    render(SectionHeading, {
      props: {
        as: 'h1',
        eyebrow: 'Especialista',
        title: 'Maricela Aguilar',
        subtitle: 'Hipnosis regresiva y regenerativa'
      }
    })

    const heading = screen.getByRole('heading', { level: 1, name: 'Maricela Aguilar' })

    expect(heading).toHaveClass('font-display', 'text-accent')
    expect(screen.getByText('Especialista')).toBeInTheDocument()
    expect(screen.getByText('Hipnosis regresiva y regenerativa')).toBeInTheDocument()
  })

  it('usa h2 por defecto', () => {
    render(SectionHeading, {
      props: { title: 'Servicios' }
    })

    expect(screen.getByRole('heading', { level: 2, name: 'Servicios' })).toBeInTheDocument()
  })
})
