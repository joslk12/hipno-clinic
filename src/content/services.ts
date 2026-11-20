export interface Service {
  id: string
  name: string
  description: string
  duration: string
  price: string
  ctaLabel: string
  icon: string
}

export const services: Service[] = [
  {
    id: 'hipnosis-regresiva',
    name: 'Hipnosis Regresiva',
    description:
      'Exploración guiada del pasado para identificar la raíz de patrones, fobias o bloqueos inconscientes.',
    duration: '90 min',
    price: '$1,800 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'regressive'
  },
  {
    id: 'hipnosis-regenerativa',
    name: 'Hipnosis Regenerativa',
    description:
      'Restauración de la energía vital, reconexión psico-emocional y regeneración de la tranquilidad mental.',
    duration: '120 min',
    price: '$2,200 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'regenerative'
  },
  {
    id: 'terapia-sanacion-emocional',
    name: 'Terapia de Sanación Emocional',
    description:
      'Acompañamiento para ansiedad, duelo, equilibrio emocional y desarrollo personal.',
    duration: '60 min',
    price: '$1,500 MXN',
    ctaLabel: 'AGENDAR CITA',
    icon: 'healing'
  }
]

export function getService(id: string) {
  return services.find((service) => service.id === id)
}
