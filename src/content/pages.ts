import type { PageMeta } from '../composables/usePageMeta'

export const pageMeta = {
  home: {
    title: 'Hipnosis Regresiva y Regenerativa en Santiago Tolman | Origen Consciente',
    description:
      'Descubre la hipnosis regresiva y regenerativa con Maricela Aguilar Enríquez en Santiago Tolman, Estado de México. Agenda tu sesión.',
    path: '/'
  },
  services: {
    title: 'Servicios de Hipnosis y Sanación Emocional | Origen Consciente',
    description:
      'Hipnosis regresiva, hipnosis regenerativa y terapia de sanación emocional. Conoce duraciones, inversiones y agenda.',
    path: '/servicios'
  },
  about: {
    title: 'Maricela Aguilar Enríquez | Especialista en Hipnosis',
    description:
      'Conoce la trayectoria, filosofía y pilares de Maricela Aguilar Enríquez, especialista en hipnosis regresiva y regenerativa.',
    path: '/sobre-mi'
  },
  reviews: {
    title: 'Reseñas de clientas | Origen Consciente',
    description:
      'Lee las opiniones de clientes de Origen Consciente y comparte tu experiencia con la hipnosis regresiva y regenerativa.',
    path: '/resenas'
  },
  blog: {
    title: 'Blog | Origen Consciente',
    description:
      'Artículos sobre hipnosis regresiva, sanación emocional, bienestar y transformación personal.',
    path: '/blog'
  },
  contact: {
    title: 'Contacto y Agendamiento | Origen Consciente',
    description:
      'Agenda tu sesión de hipnosis en Santiago Tolman, Estado de México. Contáctanos por WhatsApp, correo o formulario.',
    path: '/contacto'
  },
  notFound: {
    title: 'Página no encontrada | Origen Consciente',
    description:
      'La página que buscas no existe. Vuelve al inicio de Origen Consciente.',
    path: '/404'
  }
} satisfies Record<string, PageMeta>
