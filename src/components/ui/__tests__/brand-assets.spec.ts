import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import BrandIcon from '../BrandIcon.vue'
import BrandLogo from '../BrandLogo.vue'
import BrandOrnament from '../BrandOrnament.vue'
import { applyTheme } from '../../../composables/useTheme'

afterEach(() => {
  cleanup()
  applyTheme('light')
})

describe('BrandLogo', () => {
  it('renderiza el logo horizontal con sus dimensiones reales', () => {
    const { container } = render(BrandLogo, {
      props: { variant: 'horizontal' }
    })

    const image = screen.getByRole('img', { name: 'Origen Consciente' })

    expect(image).toHaveAttribute('width', '1005')
    expect(image).toHaveAttribute('height', '455')
    expect(image.getAttribute('src')).toContain('origen-consciente-horizontal')
    expect(container.querySelector('source')).not.toBeInTheDocument()
  })

  it('renderiza el símbolo con dimensiones propias', () => {
    render(BrandLogo, {
      props: { variant: 'symbol' }
    })

    const image = screen.getByRole('img', { name: 'Símbolo de Origen Consciente' })

    expect(image).toHaveAttribute('width', '363')
    expect(image).toHaveAttribute('height', '455')
  })

  it('usa la versión light del logo en tema claro y la original en tema oscuro', () => {
    const { unmount } = render(BrandLogo, {
      props: { variant: 'horizontal' }
    })

    expect(screen.getByRole('img').getAttribute('src')).toContain(
      'origen-consciente-horizontal-light.png'
    )

    unmount()
    applyTheme('dark')
    render(BrandLogo, { props: { variant: 'horizontal' } })

    expect(screen.getByRole('img').getAttribute('src')).toContain(
      'origen-consciente-horizontal.png'
    )
  })

  it('oculta el logo a lectores de pantalla cuando es decorativo', () => {
    render(BrandLogo, {
      props: { variant: 'symbol', decorative: true }
    })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('BrandOrnament', () => {
  it('renderiza el ornamento solicitado como máscara decorativa', () => {
    const { container } = render(BrandOrnament, {
      props: { name: 'corner-1' }
    })

    const image = container.querySelector('img')

    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('alt', '')
    expect(image?.getAttribute('src')).toContain('comp-19.png')
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})

describe('BrandIcon', () => {
  it('expone una etiqueta accesible', () => {
    render(BrandIcon, {
      props: { name: 'whatsapp', label: 'Escríbenos por WhatsApp' }
    })

    const icon = screen.getByRole('img', { name: 'Escríbenos por WhatsApp' })

    expect(icon.getAttribute('src')).toContain('whatsapp-light.png')
  })

  it('usa la versión original del icono en tema oscuro', () => {
    applyTheme('dark')

    render(BrandIcon, {
      props: { name: 'whatsapp', label: 'Escríbenos por WhatsApp' }
    })

    expect(screen.getByRole('img').getAttribute('src')).toContain('/whatsapp.png')
  })

  it('usa la etiqueta por defecto y permite ocultarlo si es decorativo', () => {
    const { container } = render(BrandIcon, {
      props: { name: 'mail', decorative: true }
    })

    const image = container.querySelector('img')

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image?.getAttribute('src')).toContain('mail-light.png')
  })
})
