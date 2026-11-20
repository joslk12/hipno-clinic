import { describe, expect, it } from 'vitest'
import { contact } from '../contact'
import { profile } from '../profile'
import { getService, services } from '../services'
import { site } from '../site'

describe('contenido de servicios', () => {
  it('incluye todos los campos obligatorios en cada servicio', () => {
    for (const service of services) {
      expect(service.name).toBeTruthy()
      expect(service.description).toBeTruthy()
      expect(service.duration).toBeTruthy()
      expect(service.price).toBeTruthy()
      expect(service.ctaLabel).toBe('AGENDAR CITA')
    }
  })

  it('usa identificadores únicos', () => {
    const ids = services.map((service) => service.id)

    expect(new Set(ids).size).toBe(services.length)
  })

  it('encuentra un servicio por id', () => {
    expect(getService('hipnosis-regresiva')?.name).toBe('Hipnosis Regresiva')
    expect(getService('no-existe')).toBeUndefined()
  })
})

describe('contenido del sitio y perfil', () => {
  it('reutiliza los datos de contacto', () => {
    expect(site.contact).toEqual(contact)
    expect(site.contact.phoneDisplay).toBe('+52 56 3127 0122')
    expect(site.contact.email).toBe('mariaguienri88@gmail.com')
  })

  it('define nombre, trayectoria y tres pilares', () => {
    expect(profile.name).toBe('Maricela Aguilar Enríquez')
    expect(profile.role).toContain('Hipnosis Regresiva y Regenerativa')
    expect(profile.history).toBeTruthy()
    expect(profile.philosophy).toBeTruthy()
    expect(profile.pillars).toHaveLength(3)
  })
})
