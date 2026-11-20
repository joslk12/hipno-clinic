export const contact = {
  phoneDisplay: '+52 56 3127 0122',
  phoneHref: 'tel:+525631270122',
  whatsapp: '525631270122',
  email: 'mariaguienri88@gmail.com',
  location: 'Barranca de la soledad SN, Santiago Tolman, Estado de México',
  coordinates: '19.731820,-98.796141',
  tagline: 'Sana tu mente - Equilibra tus emociones - Transforma tu vida'
} as const

export const WHATSAPP_MESSAGE =
  'Hola Maricela, me gustaría solicitar información para agendar una sesión de hipnosis.'

export function whatsappUrl(message = WHATSAPP_MESSAGE) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`
}

export function mapsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.coordinates)}`
}
