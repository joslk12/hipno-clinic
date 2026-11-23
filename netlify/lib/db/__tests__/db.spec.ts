import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { BlogPostRecord } from '../../../../src/types/blog'
import type { ReviewClient } from '../../../../src/types/review-invitations'
import { clientFromRow, createPostgresClientStore } from '../../review-invitations/client-store'
import { postFromRow, createPostgresPostStore } from '../../blog/post-store'
import { type DbRow, type Sql, connectionString, hasDatabase } from '../client'
import { migrateFromBlobs } from '../migrate'
import { SCHEMA_STATEMENTS } from '../schema'

const post: BlogPostRecord = {
  id: 'post-1',
  slug: 'origen-consciente',
  title: 'Origen Consciente',
  excerpt: 'Resumen',
  contentMarkdown: '## Hola',
  contentHtml: '<h2>Hola</h2>',
  coverImage: '/api/blog/images?key=image:uno',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  publishedAt: '2026-01-02T00:00:00.000Z'
}

const client: ReviewClient = {
  id: 'client-1',
  name: 'Ana López',
  email: 'ana@example.com',
  whatsapp: '525631270122',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z'
}

interface SqlCall {
  query: string
  values: unknown[]
}

function fakeSql(
  respond: (call: SqlCall, index: number) => DbRow[] = () => []
): { sql: Sql; calls: SqlCall[] } {
  const calls: SqlCall[] = []
  const run = (query: string, values: unknown[]) => {
    const call = { query, values }
    calls.push(call)
    return Promise.resolve(respond(call, calls.length - 1))
  }
  const sql = ((strings: TemplateStringsArray | string, ...values: unknown[]) =>
    run(typeof strings === 'string' ? strings : strings.join('?'), values)) as Sql
  sql.query = ((query: string, params: unknown[] = []) => run(query, params)) as Sql['query']
  return { sql, calls }
}

describe('esquema y configuración', () => {
  it('define las tablas y el índice parcial de citas', () => {
    const schema = SCHEMA_STATEMENTS.join('\n')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS blog_posts')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS review_clients')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS availability_rules')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS schedule_slots')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS appointments')
    expect(schema).toContain("WHERE status = 'reserved'")
  })

  it('mantiene schema.sql sincronizado con las sentencias de la app', () => {
    const normalize = (value: string) =>
      value
        .replace(/--[^\n]*/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const fromSql = readFileSync('netlify/lib/db/schema.sql', 'utf8')
      .split(';')
      .map(normalize)
      .filter(Boolean)

    expect(fromSql).toEqual(SCHEMA_STATEMENTS.map(normalize))
  })

  it('lee la connection string de DATABASE_URL o NETLIFY_DATABASE_URL', () => {
    expect(connectionString({ DATABASE_URL: 'postgres://uno' })).toBe('postgres://uno')
    expect(connectionString({ NETLIFY_DATABASE_URL: 'postgres://dos' })).toBe('postgres://dos')
    expect(connectionString({})).toBeUndefined()
    expect(hasDatabase({ DATABASE_URL: 'postgres://uno' })).toBe(true)
    expect(hasDatabase({})).toBe(false)
  })
})

describe('mapeo de filas', () => {
  it('convierte un post de Postgres al registro interno', () => {
    expect(
      postFromRow({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content_markdown: post.contentMarkdown,
        content_html: post.contentHtml,
        cover_image: post.coverImage,
        status: 'published',
        created_at: new Date(post.createdAt),
        updated_at: post.updatedAt,
        published_at: post.publishedAt
      })
    ).toEqual(post)
  })

  it('convierte una clienta de Postgres al registro interno', () => {
    expect(
      clientFromRow({
        id: client.id,
        name: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        created_at: new Date(client.createdAt),
        updated_at: client.updatedAt
      })
    ).toEqual(client)
  })
})

describe('repositorios de Postgres', () => {
  it('lista, obtiene, guarda y elimina artículos', async () => {
    const row = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content_markdown: post.contentMarkdown,
      content_html: post.contentHtml,
      cover_image: post.coverImage,
      status: post.status,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
      published_at: post.publishedAt
    }
    const { sql, calls } = fakeSql((call) => (call.query.includes('SELECT') ? [row] : []))
    const store = createPostgresPostStore(() => Promise.resolve(sql))

    expect(await store.listPosts()).toEqual([post])
    expect(await store.getPost(post.id)).toEqual(post)
    await store.savePost(post)
    await store.deletePost(post.id)

    expect(calls.some((call) => call.query.includes('INSERT INTO blog_posts'))).toBe(true)
    expect(calls.some((call) => call.query.includes('ON CONFLICT (id) DO UPDATE'))).toBe(true)
    expect(calls.some((call) => call.query.includes('DELETE FROM blog_posts'))).toBe(true)
  })

  it('devuelve null si la clienta no existe', async () => {
    const { sql } = fakeSql(() => [])
    const store = createPostgresClientStore(() => Promise.resolve(sql))
    expect(await store.getClient('no-existe')).toBeNull()
  })

  it('guarda clientas con upsert', async () => {
    const { sql, calls } = fakeSql()
    const store = createPostgresClientStore(() => Promise.resolve(sql))
    await store.saveClient(client)
    expect(calls[0]?.values).toContain(client.whatsapp)
    expect(calls[0]?.query).toContain('ON CONFLICT (id) DO UPDATE')
  })
})

vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    list: async ({ prefix }: { prefix: string }) => ({
      blobs: prefix === 'post:' ? [{ key: 'post:1' }] : [{ key: 'client:1' }]
    }),
    get: async (key: string) => (key === 'post:1' ? post : client)
  }))
}))

describe('migración desde Blobs', () => {
  it('copia posts y clientas una sola vez', async () => {
    let migrated = false
    const { sql, calls } = fakeSql((call) => {
      if (call.query.includes('SELECT value FROM migration_state') && migrated) {
        return [{ value: 'done' }]
      }
      if (call.query.includes('INSERT INTO migration_state')) migrated = true
      return []
    })

    await migrateFromBlobs(sql)
    await migrateFromBlobs(sql)

    const inserts = calls.filter((call) => call.query.includes('INSERT INTO')).length
    // 2 datos + 1 marca en la primera llamada; la segunda solo consulta la marca.
    expect(inserts).toBe(3)
    expect(calls.filter((call) => call.query.includes('INSERT INTO blog_posts'))).toHaveLength(1)
    expect(calls.filter((call) => call.query.includes('INSERT INTO review_clients'))).toHaveLength(1)
    expect(calls.filter((call) => call.query.includes('INSERT INTO migration_state'))).toHaveLength(1)
  })
})
