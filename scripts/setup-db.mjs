import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { neon } from '@netlify/neon'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL
if (!connectionString) {
  console.error(
    'Falta DATABASE_URL (o NETLIFY_DATABASE_URL). Defínela en el entorno antes de ejecutar este script.'
  )
  process.exit(1)
}

const schemaPath = fileURLToPath(new URL('../netlify/lib/db/schema.sql', import.meta.url))
const statements = readFileSync(schemaPath, 'utf8')
  .split(';')
  .map((statement) =>
    statement
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')
      .trim()
  )
  .filter(Boolean)

const sql = neon(connectionString)

for (const [index, statement] of statements.entries()) {
  await sql.query(statement)
  console.log(`[${index + 1}/${statements.length}] OK`)
}

console.log('Esquema aplicado. Las tablas ya están listas.')
