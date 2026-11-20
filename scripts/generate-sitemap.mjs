import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const base = (process.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')
const routes = ['/', '/servicios', '/sobre-mi', '/resenas', '/blog', '/contacto']
const dataFile = process.env.BLOG_DATA_FILE || 'src/content/generated/blog.json'
const today = new Date().toISOString().slice(0, 10)
let blogPosts = []

if (existsSync(dataFile)) {
  try {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    if (Array.isArray(data)) blogPosts = data
  } catch {
    blogPosts = []
  }
}

const entries = [
  ...routes.map((route) => ({ route, lastmod: today })),
  ...blogPosts
    .filter((post) => post && typeof post.slug === 'string')
    .map((post) => ({
      route: `/blog/${post.slug}`,
      lastmod:
        typeof post.updatedAt === 'string' && post.updatedAt
          ? post.updatedAt.slice(0, 10)
          : today
    }))
]

const urls = entries
  .map(({ route, lastmod }) => `  <url><loc>${base}${route}</loc><lastmod>${lastmod}</lastmod></url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

mkdirSync('public', { recursive: true })
writeFileSync('public/sitemap.xml', xml)
writeFileSync(
  'public/robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`
)
