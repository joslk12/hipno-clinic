import type { BlogPostInput, BlogStatus } from '../../../src/types/blog'
import { isValidSlug } from './slug'

export const BLOG_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  excerptMin: 40,
  excerptMax: 200,
  contentMin: 50,
  contentMax: 20_000,
  slugMax: 80
} as const

const COVER_IMAGE_PATTERN = /^\/api\/blog\/images\?key=image:[A-Za-z0-9-]+$/

export type ValidationResult =
  | { ok: true; value: Partial<BlogPostInput> }
  | { ok: false; fields: Record<string, string> }

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateCoverImage(value: unknown, fields: Record<string, string>): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !COVER_IMAGE_PATTERN.test(value)) {
    fields.coverImage = 'La imagen de portada debe ser una imagen subida al blog.'
    return undefined
  }
  return value
}

export function validatePostInput(body: unknown, options: { partial?: boolean } = {}): ValidationResult {
  const record = asRecord(body)
  if (!record) return { ok: false, fields: { _: 'El cuerpo de la solicitud no es válido.' } }

  const fields: Record<string, string> = {}
  const value: Partial<BlogPostInput> = {}
  const partial = options.partial === true

  if (!partial || record.title !== undefined) {
    const title = text(record.title)
    if (title.length < BLOG_LIMITS.titleMin || title.length > BLOG_LIMITS.titleMax) {
      fields.title = `El título debe tener entre ${BLOG_LIMITS.titleMin} y ${BLOG_LIMITS.titleMax} caracteres.`
    } else {
      value.title = title
    }
  }

  if (!partial || record.slug !== undefined) {
    const rawSlug = text(record.slug)
    if (rawSlug) {
      if (!isValidSlug(rawSlug)) {
        fields.slug = 'El slug solo puede usar minúsculas, números y guiones.'
      } else {
        value.slug = rawSlug
      }
    }
  }

  if (!partial || record.excerpt !== undefined) {
    const excerpt = text(record.excerpt)
    if (excerpt.length < BLOG_LIMITS.excerptMin || excerpt.length > BLOG_LIMITS.excerptMax) {
      fields.excerpt = `El resumen debe tener entre ${BLOG_LIMITS.excerptMin} y ${BLOG_LIMITS.excerptMax} caracteres.`
    } else {
      value.excerpt = excerpt
    }
  }

  if (!partial || record.contentMarkdown !== undefined) {
    const content = typeof record.contentMarkdown === 'string' ? record.contentMarkdown.trim() : ''
    if (content.length < BLOG_LIMITS.contentMin || content.length > BLOG_LIMITS.contentMax) {
      fields.contentMarkdown = `El contenido debe tener entre ${BLOG_LIMITS.contentMin} y ${BLOG_LIMITS.contentMax} caracteres.`
    } else {
      value.contentMarkdown = content
    }
  }

  if (!partial || record.coverImage !== undefined) {
    const coverImage = validateCoverImage(record.coverImage, fields)
    if (coverImage !== undefined) value.coverImage = coverImage
  }

  if (!partial || record.status !== undefined) {
    if (record.status !== 'draft' && record.status !== 'published') {
      fields.status = 'El estado debe ser borrador o publicado.'
    } else {
      value.status = record.status satisfies BlogStatus
    }
  }

  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value }
}
