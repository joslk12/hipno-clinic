import type { BlogPostRecord } from '../../../src/types/blog'
import { asString, toIsoString, type DbRow, type Sql, type SqlProvider } from '../db/client'

export interface PostStore {
  listPosts(): Promise<BlogPostRecord[]>
  getPost(id: string): Promise<BlogPostRecord | null>
  savePost(post: BlogPostRecord): Promise<void>
  deletePost(id: string): Promise<void>
}

export function postFromRow(row: DbRow): BlogPostRecord {
  return {
    id: asString(row.id),
    slug: asString(row.slug),
    title: asString(row.title),
    excerpt: asString(row.excerpt),
    contentMarkdown: asString(row.content_markdown),
    contentHtml: asString(row.content_html),
    coverImage: row.cover_image === null || row.cover_image === undefined ? null : String(row.cover_image),
    status: row.status === 'published' ? 'published' : 'draft',
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date(0).toISOString(),
    publishedAt: toIsoString(row.published_at)
  }
}

export function createPostgresPostStore(getSql: SqlProvider): PostStore {
  async function withSql<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
    return work(await getSql())
  }

  return {
    async listPosts() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM blog_posts`
        return rows.map(postFromRow)
      })
    },
    async getPost(id) {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM blog_posts WHERE id = ${id}`
        return rows[0] ? postFromRow(rows[0]) : null
      })
    },
    async savePost(post) {
      await withSql(async (sql) => {
        await sql`
          INSERT INTO blog_posts (
            id, slug, title, excerpt, content_markdown, content_html,
            cover_image, status, created_at, updated_at, published_at
          ) VALUES (
            ${post.id}, ${post.slug}, ${post.title}, ${post.excerpt},
            ${post.contentMarkdown}, ${post.contentHtml}, ${post.coverImage},
            ${post.status}, ${post.createdAt}, ${post.updatedAt}, ${post.publishedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            title = EXCLUDED.title,
            excerpt = EXCLUDED.excerpt,
            content_markdown = EXCLUDED.content_markdown,
            content_html = EXCLUDED.content_html,
            cover_image = EXCLUDED.cover_image,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            published_at = EXCLUDED.published_at
        `
      })
    },
    async deletePost(id) {
      await withSql(async (sql) => {
        await sql`DELETE FROM blog_posts WHERE id = ${id}`
      })
    }
  }
}
