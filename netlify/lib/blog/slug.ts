const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'blog',
  'contacto',
  'en',
  'es',
  'resenas',
  'servicios',
  'sitemap',
  'sobre-mi',
  '404'
])

const MAX_SLUG_LENGTH = 80

export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/g, '')

  return slug || 'articulo'
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= MAX_SLUG_LENGTH
}

function appendSuffix(base: string, suffix: string): string {
  const available = MAX_SLUG_LENGTH - suffix.length - 1
  const trimmed = base.slice(0, available).replace(/-$/g, '') || 'articulo'
  return `${trimmed}-${suffix}`
}

export function ensureUniqueSlug(
  base: string,
  existing: Array<{ id: string; slug: string }>,
  currentId?: string
): string {
  const used = new Set(existing.filter((post) => post.id !== currentId).map((post) => post.slug))
  let candidate = RESERVED_SLUGS.has(base) ? appendSuffix(base, 'articulo') : base
  if (!used.has(candidate)) return candidate

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    candidate = appendSuffix(base, String(suffix))
    if (!used.has(candidate)) return candidate
  }

  return appendSuffix(base, Date.now().toString(36))
}
