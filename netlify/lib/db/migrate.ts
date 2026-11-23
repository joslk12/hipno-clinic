import { getStore } from '@netlify/blobs'
import type { BlogPostRecord } from '../../../src/types/blog'
import type { ReviewClient } from '../../../src/types/review-invitations'
import type { Sql } from './client'

export const MIGRATION_KEY = 'blobs-posts-clients-v1'

async function listFromBlobs<T>(storeName: string, prefix: string): Promise<T[]> {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const { blobs } = await store.list({ prefix })
  const items = (await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: 'json' }))
  )) as unknown as Array<T | null>
  return items.filter((item): item is T => item !== null)
}

async function isDone(sql: Sql): Promise<boolean> {
  const rows = await sql`SELECT value FROM migration_state WHERE key = ${MIGRATION_KEY}`
  return rows.length > 0
}

async function markDone(sql: Sql): Promise<void> {
  await sql`
    INSERT INTO migration_state (key, value, updated_at)
    VALUES (${MIGRATION_KEY}, ${'done'}, ${new Date().toISOString()})
    ON CONFLICT (key) DO NOTHING
  `
}

/**
 * Copia una sola vez los artículos y clientas que ya vivían en Netlify Blobs.
 * Las imágenes se quedan en Blobs y solo se referencian por su key.
 */
export async function migrateFromBlobs(sql: Sql): Promise<void> {
  if (await isDone(sql)) return

  let posts: BlogPostRecord[]
  let clients: ReviewClient[]
  try {
    posts = await listFromBlobs<BlogPostRecord>('blog', 'post:')
    clients = await listFromBlobs<ReviewClient>('clients', 'client:')
  } catch (error) {
    console.warn(
      'No se pudieron leer los Blobs para la migración; se omitirá esta vez.',
      error instanceof Error ? error.message : error
    )
    return
  }

  for (const post of posts) {
    await sql`
      INSERT INTO blog_posts (
        id, slug, title, excerpt, content_markdown, content_html,
        cover_image, status, created_at, updated_at, published_at
      ) VALUES (
        ${post.id}, ${post.slug}, ${post.title}, ${post.excerpt},
        ${post.contentMarkdown}, ${post.contentHtml}, ${post.coverImage},
        ${post.status}, ${post.createdAt}, ${post.updatedAt}, ${post.publishedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `
  }

  for (const client of clients) {
    await sql`
      INSERT INTO review_clients (id, name, email, whatsapp, created_at, updated_at)
      VALUES (${client.id}, ${client.name}, ${client.email}, ${client.whatsapp}, ${client.createdAt}, ${client.updatedAt})
      ON CONFLICT (id) DO NOTHING
    `
  }

  await markDone(sql)
  console.log(`Migración desde Blobs completada: ${posts.length} artículos, ${clients.length} clientas.`)
}
