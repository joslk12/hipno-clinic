import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const required = [
  '56 3127 0122',
  '5631270122',
  'mariaguienri88@gmail.com',
  'Santiago Tolman',
  'Origen Consciente'
]

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const pages = walk('dist').filter((file) => file.endsWith('.html'))
const errors = []

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  for (const value of required) {
    if (!html.includes(value)) {
      errors.push(`${page}: falta "${value}"`)
    }
  }
  for (const placeholder of ['lorem ipsum', 'example.com', 'PENDIENTE', 'TODO']) {
    if (html.toLowerCase().includes(placeholder.toLowerCase())) {
      errors.push(`${page}: contiene placeholder "${placeholder}"`)
    }
  }
}

if (!pages.length) errors.push('dist: no se generaron páginas HTML')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Contacto consistente en ${pages.length} páginas HTML.`)
