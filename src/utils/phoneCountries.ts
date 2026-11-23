export interface PhoneCountry {
  code: string
  name: string
  dial: string
  flag: string
}

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = {
  code: 'MX',
  name: 'México',
  dial: '52',
  flag: '🇲🇽'
}

/**
 * Lista ordenada para mostrar en el selector. México va primero porque es el
 * país por defecto de la clínica; el resto agrupa Latinoamérica y destinos
 * frecuentes.
 */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  DEFAULT_PHONE_COUNTRY,
  { code: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', dial: '53', flag: '🇨🇺' },
  { code: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨' },
  { code: 'SV', name: 'El Salvador', dial: '503', flag: '🇸🇻' },
  { code: 'ES', name: 'España', dial: '34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸' },
  { code: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', dial: '504', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', dial: '505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪' },
  { code: 'PR', name: 'Puerto Rico', dial: '1', flag: '🇵🇷' },
  { code: 'CA', name: 'Canadá', dial: '1', flag: '🇨🇦' },
  { code: 'DO', name: 'República Dominicana', dial: '1', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪' },
  { code: 'DE', name: 'Alemania', dial: '49', flag: '🇩🇪' },
  { code: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial: '43', flag: '🇦🇹' },
  { code: 'BE', name: 'Bélgica', dial: '32', flag: '🇧🇪' },
  { code: 'CN', name: 'China', dial: '86', flag: '🇨🇳' },
  { code: 'KR', name: 'Corea del Sur', dial: '82', flag: '🇰🇷' },
  { code: 'DK', name: 'Dinamarca', dial: '45', flag: '🇩🇰' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', dial: '971', flag: '🇦🇪' },
  { code: 'EG', name: 'Egipto', dial: '20', flag: '🇪🇬' },
  { code: 'FI', name: 'Finlandia', dial: '358', flag: '🇫🇮' },
  { code: 'FR', name: 'Francia', dial: '33', flag: '🇫🇷' },
  { code: 'GR', name: 'Grecia', dial: '30', flag: '🇬🇷' },
  { code: 'NL', name: 'Países Bajos', dial: '31', flag: '🇳🇱' },
  { code: 'HU', name: 'Hungría', dial: '36', flag: '🇭🇺' },
  { code: 'ID', name: 'Indonesia', dial: '62', flag: '🇮🇩' },
  { code: 'IE', name: 'Irlanda', dial: '353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italia', dial: '39', flag: '🇮🇹' },
  { code: 'JP', name: 'Japón', dial: '81', flag: '🇯🇵' },
  { code: 'MA', name: 'Marruecos', dial: '212', flag: '🇲🇦' },
  { code: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { code: 'NO', name: 'Noruega', dial: '47', flag: '🇳🇴' },
  { code: 'NZ', name: 'Nueva Zelanda', dial: '64', flag: '🇳🇿' },
  { code: 'PL', name: 'Polonia', dial: '48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹' },
  { code: 'GB', name: 'Reino Unido', dial: '44', flag: '🇬🇧' },
  { code: 'CZ', name: 'Chequia', dial: '420', flag: '🇨🇿' },
  { code: 'RO', name: 'Rumania', dial: '40', flag: '🇷🇴' },
  { code: 'RU', name: 'Rusia', dial: '7', flag: '🇷🇺' },
  { code: 'SA', name: 'Arabia Saudita', dial: '966', flag: '🇸🇦' },
  { code: 'SE', name: 'Suecia', dial: '46', flag: '🇸🇪' },
  { code: 'CH', name: 'Suiza', dial: '41', flag: '🇨🇭' },
  { code: 'TH', name: 'Tailandia', dial: '66', flag: '🇹🇭' },
  { code: 'TR', name: 'Turquía', dial: '90', flag: '🇹🇷' },
  { code: 'UA', name: 'Ucrania', dial: '380', flag: '🇺🇦' },
  { code: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapur', dial: '65', flag: '🇸🇬' },
  { code: 'ZA', name: 'Sudáfrica', dial: '27', flag: '🇿🇦' },
  { code: 'PH', name: 'Filipinas', dial: '63', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', dial: '84', flag: '🇻🇳' }
]

/** Longitud mínima del número nacional para considerar que un prefijo es código de país. */
const MIN_NATIONAL_LENGTH = 9

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function getPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? DEFAULT_PHONE_COUNTRY
}

/** Detecta el país de un número guardado. Si no es inequívoco, usa México. */
export function detectPhoneCountry(value: string): PhoneCountry {
  const digits = phoneDigits(value)
  const match = PHONE_COUNTRIES.filter(
    (country) =>
      digits.startsWith(country.dial) &&
      digits.length - country.dial.length >= MIN_NATIONAL_LENGTH
  ).sort((a, b) => b.dial.length - a.dial.length)[0]

  return match ?? DEFAULT_PHONE_COUNTRY
}

/** Quita el código de país de un número guardado para dejar solo el nacional. */
export function nationalPhone(value: string, country: PhoneCountry): string {
  const digits = phoneDigits(value)
  if (
    digits.startsWith(country.dial) &&
    digits.length - country.dial.length >= MIN_NATIONAL_LENGTH
  ) {
    return digits.slice(country.dial.length)
  }
  return digits
}

/** Compone el valor que se guarda: código de país + número nacional. */
export function joinPhone(dial: string, value: string): string {
  const digits = phoneDigits(value)
  return digits ? `${dial}${digits}` : ''
}
