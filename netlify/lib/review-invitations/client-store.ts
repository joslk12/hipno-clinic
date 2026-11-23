import type { ReviewClient } from '../../../src/types/review-invitations'
import { asString, toIsoString, type DbRow, type Sql, type SqlProvider } from '../db/client'

export interface ClientStore {
  listClients(): Promise<ReviewClient[]>
  getClient(id: string): Promise<ReviewClient | null>
  saveClient(client: ReviewClient): Promise<void>
  deleteClient(id: string): Promise<void>
}

export function clientFromRow(row: DbRow): ReviewClient {
  return {
    id: asString(row.id),
    name: asString(row.name),
    email: asString(row.email),
    whatsapp: asString(row.whatsapp),
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date(0).toISOString()
  }
}

export function createPostgresClientStore(getSql: SqlProvider): ClientStore {
  async function withSql<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
    return work(await getSql())
  }

  return {
    async listClients() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM review_clients ORDER BY created_at DESC, id`
        return rows.map(clientFromRow)
      })
    },
    async getClient(id) {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM review_clients WHERE id = ${id}`
        return rows[0] ? clientFromRow(rows[0]) : null
      })
    },
    async saveClient(client) {
      await withSql(async (sql) => {
        await sql`
          INSERT INTO review_clients (id, name, email, whatsapp, created_at, updated_at)
          VALUES (${client.id}, ${client.name}, ${client.email}, ${client.whatsapp}, ${client.createdAt}, ${client.updatedAt})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            whatsapp = EXCLUDED.whatsapp,
            updated_at = EXCLUDED.updated_at
        `
      })
    },
    async deleteClient(id) {
      await withSql(async (sql) => {
        await sql`DELETE FROM review_clients WHERE id = ${id}`
      })
    }
  }
}
