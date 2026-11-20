export const reviewLimits = {
  nameMin: 2,
  nameMax: 60,
  ratingMin: 1,
  ratingMax: 5,
  messageMin: 10,
  messageMax: 1000,
  maxPerDay: 3,
  maxPublic: 50
} as const

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
  timeZone: 'UTC'
})

const averageFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

export function formatReviewDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function formatReviewAverage(value: number) {
  return averageFormatter.format(value)
}
