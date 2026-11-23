import { neon } from '@netlify/neon'
import { migrateFromBlobs } from './migrate'
import { SCHEMA_STATEMENTS } from './schema'

export type DbRow = Record<string, unknown>

/** Subconjunto de la API de Neon que usan los repositorios. */
export interface Sql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRow[]>
  (query: string, params?: unknown[]): Promise<DbRow[]>
}

export type SqlProvider = () => Promise<Sql>

let ready: Promise<Sql> | undefined

export function connectionString(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return env.DATABASE_URL || env.NETLIFY_DATABASE_URL
}

export function hasDatabase(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(connectionString(env))
}

/** Aplica el esquema y migra los datos de Blobs una sola vez por instancia. */
export async function initializeDatabase(): Promise<Sql> {
  const value = connectionString()
  if (!value) {
    throw new Error(
      'No hay base de datos configurada. Define DATABASE_URL (o NETLIFY_DATABASE_URL) en Netlify.'
    )
  }

  const sql = neon(value) as unknown as Sql
  for (const statement of SCHEMA_STATEMENTS) {
    await sql(statement)
  }
  await migrateFromBlobs(sql)
  return sql
}

export function getSql(): Promise<Sql> {
  if (!ready) {
    ready = initializeDatabase().catch((error: unknown) => {
      ready = undefined
      throw error
    })
  }
  return ready
}

export function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function asString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

export function asJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}
