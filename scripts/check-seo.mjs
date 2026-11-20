import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const base = (process.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')
const publicRoutes = ['/', '/servicios', '/sobre-mi', '/resenas', '/blog', '/contacto']
const dataFile = process.env.BLOG_DATA_FILE || 'src/content/generated/blog.json'

if (existsSync(dataFile)) {
  try {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    if (Array.isArray(data)) {
      for (const post of data) {
        if (post && typeof post.slug === 'string') publicRoutes.push(`/blog/${post.slug}`)
      }
    }
  } catch {
    // El contenido del blog es opcional durante la validación.
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
}

function metaContent(html, key) {
  const tags = html.match(/<meta\b[^>]*>/g) ?? []
  for (const tag of tags) {
    if (attr(tag, 'name') === key || attr(tag, 'property') === key) {
      return attr(tag, 'content')
    }
  }
  return undefined
}

function routeFor(file) {
  const route = file.replace(/^dist/, '').replace(/\.html$/, '')
  return route === '/index' ? '/' : route
}

const pages = walk('dist').filter((file) => file.endsWith('.html'))
const errors = []
const titles = new Map()

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  const route = routeFor(page)
  const expectedUrl = `${base}${route}`

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  if (!title) {
    errors.push(`${page}: falta <title>`)
  } else if (titles.has(title)) {
    errors.push(`${page}: título duplicado con ${titles.get(title)}`)
  } else {
    titles.set(title, page)
  }

  if (!metaContent(html, 'description')) errors.push(`${page}: falta meta description`)

  const canonical = (html.match(/<link\b[^>]*rel="canonical"[^>]*>/) ?? [''])[0]
  const canonicalHref = attr(canonical, 'href')
  if (canonicalHref !== expectedUrl) {
    errors.push(`${page}: canonical "${canonicalHref}" no coincide con "${expectedUrl}"`)
  }

  const ogUrl = metaContent(html, 'og:url')
  if (ogUrl !== expectedUrl) {
    errors.push(`${page}: og:url "${ogUrl}" no coincide con "${expectedUrl}"`)
  }
  if (!metaContent(html, 'og:title')) errors.push(`${page}: falta og:title`)
  if (!metaContent(html, 'og:description')) errors.push(`${page}: falta og:description`)
  if (!metaContent(html, 'og:type')) errors.push(`${page}: falta og:type`)

  const ogImage = metaContent(html, 'og:image')
  if (!ogImage || !/^https?:\/\//.test(ogImage)) {
    errors.push(`${page}: og:image ausente o no absoluta`)
  }
  if (metaContent(html, 'og:image:width') !== '1200') {
    errors.push(`${page}: og:image:width debe ser 1200`)
  }
  if (metaContent(html, 'og:image:height') !== '630') {
    errors.push(`${page}: og:image:height debe ser 630`)
  }
}

for (const route of publicRoutes) {
  const file = route === '/' ? 'dist/index.html' : `dist${route}.html`
  if (!pages.includes(file)) errors.push(`falta la página ${file}`)
}

try {
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
  for (const route of publicRoutes) {
    if (!sitemap.includes(`<loc>${base}${route}</loc>`)) {
      errors.push(`sitemap.xml: falta ${base}${route}`)
    }
  }
} catch {
  errors.push('dist/sitemap.xml: no existe')
}

try {
  const robots = readFileSync('dist/robots.txt', 'utf8')
  if (!robots.includes('Allow: /')) errors.push('robots.txt: falta "Allow: /"')
  if (!robots.includes('Disallow: /admin')) errors.push('robots.txt: falta "Disallow: /admin"')
  if (!robots.includes(`Sitemap: ${base}/sitemap.xml`)) {
    errors.push(`robots.txt: falta "Sitemap: ${base}/sitemap.xml"`)
  }
} catch {
  errors.push('dist/robots.txt: no existe')
}

try {
  const ogImage = readFileSync('dist/assets/og/og-image.jpg')
  if (ogImage.length === 0) errors.push('dist/assets/og/og-image.jpg: está vacío')
  if (ogImage[0] !== 0xff || ogImage[1] !== 0xd8 || ogImage[2] !== 0xff) {
    errors.push('dist/assets/og/og-image.jpg: no es un JPEG válido')
  }
} catch {
  errors.push('dist/assets/og/og-image.jpg: no existe')
}

if (!pages.length) errors.push('dist: no se generaron páginas HTML')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`SEO y metadatos consistentes en ${pages.length} páginas HTML.`)
