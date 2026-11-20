import { contact } from './contact'
import { navLinks } from './navigation'

export const site = {
  name: 'Origen Consciente',
  title: 'ORIGEN CONSCIENTE',
  subtitle: 'HIPNOSIS REGRESIVA Y REGENERATIVA',
  slogan: 'Comprende tu historia, crea nuevas posibilidades.',
  description:
    'Hipnosis regresiva y regenerativa para comprender tu historia, liberar cargas emocionales y crear nuevas posibilidades.',
  url: import.meta.env.VITE_SITE_URL ?? 'https://origenconsciente.mx',
  contact,
  navLinks
} as const
