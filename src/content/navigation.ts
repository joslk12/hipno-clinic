export type NavLink = {
  label: string
  to: string
}

export const navLinks: NavLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Servicios', to: '/servicios' },
  { label: 'Sobre Mí', to: '/sobre-mi' },
  { label: 'Reseñas', to: '/resenas' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contacto', to: '/contacto' }
]
