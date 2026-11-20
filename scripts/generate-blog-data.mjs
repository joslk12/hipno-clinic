import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const dataFile = process.env.BLOG_DATA_FILE || 'src/content/generated/blog.json'
const apiBase = (process.env.BLOG_API_URL || process.env.URL || '').replace(/\/$/, '')

function ensureFile() {
  if (existsSync(dataFile)) return
  mkdirSync(dirname(dataFile), { recursive: true })
  writeFileSync(dataFile, '[]\n')
}

if (process.env.BLOG_SKIP_FETCH === '1') {
  ensureFile()
  console.log('BLOG_SKIP_FETCH=1: se conserva el contenido de blog existente.')
  process.exit(0)
}

if (!apiBase) {
  ensureFile()
  console.warn('BLOG_API_URL no está configurado: se conserva el contenido de blog existente.')
  process.exit(0)
}

try {
  const response = await fetch(`${apiBase}/api/blog/posts`, {
    signal: AbortSignal.timeout(10_000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const payload = await response.json()
  if (!Array.isArray(payload.posts)) throw new Error('Respuesta sin lista de artículos')

  const posts = payload.posts.filter(
    (post) =>
      post &&
      typeof post === 'object' &&
      typeof post.slug === 'string' &&
      typeof post.title === 'string' &&
      typeof post.contentHtml === 'string' &&
      typeof post.publishedAt === 'string'
  )

  mkdirSync(dirname(dataFile), { recursive: true })
  writeFileSync(dataFile, `${JSON.stringify(posts, null, 2)}\n`)
  console.log(`Contenido de blog actualizado: ${posts.length} artículos.`)
} catch (error) {
  ensureFile()
  console.warn(
    `No se pudo descargar el contenido del blog (${error instanceof Error ? error.message : error}); se conserva el contenido existente.`
  )
}
