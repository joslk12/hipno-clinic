import type {
  Appointment,
  AppointmentNotification,
  AvailabilityRule,
  AvailabilityRuleInput,
  ManualSlotRecord,
  ScheduleSlot
} from '../../../src/types/appointments'
import {
  asBoolean,
  asJson,
  asString,
  toIsoString,
  type DbRow,
  type Sql,
  type SqlProvider
} from '../db/client'
import { isValidDateKey } from './timezone'

const EPOCH = new Date(0).toISOString()

export interface AppointmentStore {
  listRules(): Promise<AvailabilityRule[]>
  getRule(id: string): Promise<AvailabilityRule | null>
  saveRule(rule: AvailabilityRule): Promise<void>
  deleteRule(id: string): Promise<void>

  listManualSlots(): Promise<ManualSlotRecord[]>
  getManualSlot(slotKey: string): Promise<ManualSlotRecord | null>
  saveManualSlot(slot: ManualSlotRecord, timestamp: string): Promise<void>
  /** Inserta o actualiza solo `blocked`; sirve para bloquear reglas generadas. */
  setSlotBlocked(slot: ScheduleSlot, blocked: boolean, timestamp: string): Promise<ManualSlotRecord>
  deleteManualSlot(slotKey: string): Promise<void>

  /** Materializa un horario generado antes de reservarlo; nunca sobrescribe bloqueos. */
  materializeSlot(slot: ScheduleSlot, timestamp: string): Promise<void>
  listReservedSlotKeys(): Promise<string[]>

  listAppointments(): Promise<Appointment[]>
  getAppointment(id: string): Promise<Appointment | null>
  /** Devuelve null si otra reserva activa ganó la carrera. */
  reserveAppointment(appointment: Appointment): Promise<Appointment | null>
  cancelAppointment(id: string, cancelledAt: string): Promise<Appointment | null>
  saveNotification(id: string, notification: AppointmentNotification): Promise<void>
}

export type { AvailabilityRuleInput }

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value)
}

function asDateKey(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  const text = String(value)
  const candidate = text.slice(0, 10)
  return isValidDateKey(candidate) ? candidate : null
}

function asNotification(value: unknown): AppointmentNotification | null {
  const notification = asJson<Partial<AppointmentNotification>>(value)
  if (!notification || typeof notification !== 'object') return null
  const email = notification.email
  const whatsapp = notification.whatsapp
  if (!email || !whatsapp || typeof email.ok !== 'boolean' || typeof whatsapp.ok !== 'boolean') {
    return null
  }
  return {
    email: { ok: email.ok, ...(typeof email.error === 'string' ? { error: email.error } : {}) },
    whatsapp: {
      ok: whatsapp.ok,
      ...(typeof whatsapp.error === 'string' ? { error: whatsapp.error } : {})
    }
  }
}

export function ruleFromRow(row: DbRow): AvailabilityRule {
  return {
    id: asString(row.id),
    weekday: Number(row.weekday) as AvailabilityRule['weekday'],
    startTime: asString(row.start_time),
    durationMinutes: Number(row.duration_minutes),
    serviceId: nullableString(row.service_id),
    validFrom: asDateKey(row.valid_from),
    validUntil: asDateKey(row.valid_until),
    active: asBoolean(row.active),
    createdAt: toIsoString(row.created_at) ?? EPOCH,
    updatedAt: toIsoString(row.updated_at) ?? EPOCH
  }
}

export function slotFromRow(row: DbRow): ManualSlotRecord {
  const slotKey = asString(row.slot_key)
  return {
    id: slotKey,
    slotKey,
    startsAt: toIsoString(row.starts_at) ?? EPOCH,
    durationMinutes: Number(row.duration_minutes),
    serviceId: nullableString(row.service_id),
    blocked: asBoolean(row.blocked),
    source: row.source === 'manual' ? 'manual' : 'rule',
    ruleId: nullableString(row.rule_id)
  }
}

export function appointmentFromRow(row: DbRow): Appointment {
  return {
    id: asString(row.id),
    slotKey: asString(row.slot_key),
    startsAt: toIsoString(row.starts_at) ?? EPOCH,
    durationMinutes: Number(row.duration_minutes),
    serviceId: nullableString(row.service_id),
    status: row.status === 'cancelled' ? 'cancelled' : 'reserved',
    name: asString(row.name),
    email: asString(row.email),
    phone: asString(row.phone),
    message: asString(row.message),
    createdAt: toIsoString(row.created_at) ?? EPOCH,
    updatedAt: toIsoString(row.updated_at) ?? EPOCH,
    cancelledAt: toIsoString(row.cancelled_at),
    notification: asNotification(row.notification)
  }
}

export function createPostgresAppointmentStore(getSql: SqlProvider): AppointmentStore {
  async function withSql<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
    return work(await getSql())
  }

  return {
    async listRules() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM availability_rules ORDER BY weekday, start_time, id`
        return rows.map(ruleFromRow)
      })
    },
    async getRule(id) {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM availability_rules WHERE id = ${id}`
        return rows[0] ? ruleFromRow(rows[0]) : null
      })
    },
    async saveRule(rule) {
      await withSql(async (sql) => {
        await sql`
          INSERT INTO availability_rules (
            id, weekday, start_time, duration_minutes, service_id,
            valid_from, valid_until, active, created_at, updated_at
          ) VALUES (
            ${rule.id}, ${rule.weekday}, ${rule.startTime}, ${rule.durationMinutes},
            ${rule.serviceId}, ${rule.validFrom}, ${rule.validUntil}, ${rule.active},
            ${rule.createdAt}, ${rule.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            weekday = EXCLUDED.weekday,
            start_time = EXCLUDED.start_time,
            duration_minutes = EXCLUDED.duration_minutes,
            service_id = EXCLUDED.service_id,
            valid_from = EXCLUDED.valid_from,
            valid_until = EXCLUDED.valid_until,
            active = EXCLUDED.active,
            updated_at = EXCLUDED.updated_at
        `
      })
    },
    async deleteRule(id) {
      await withSql(async (sql) => {
        await sql`DELETE FROM availability_rules WHERE id = ${id}`
      })
    },

    async listManualSlots() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM schedule_slots ORDER BY starts_at, slot_key`
        return rows.map(slotFromRow)
      })
    },
    async getManualSlot(slotKey) {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM schedule_slots WHERE slot_key = ${slotKey}`
        return rows[0] ? slotFromRow(rows[0]) : null
      })
    },
    async saveManualSlot(slot, timestamp) {
      await withSql(async (sql) => {
        await sql`
          INSERT INTO schedule_slots (
            slot_key, starts_at, duration_minutes, service_id, blocked,
            source, rule_id, created_at, updated_at
          ) VALUES (
            ${slot.slotKey}, ${slot.startsAt}, ${slot.durationMinutes}, ${slot.serviceId},
            ${slot.blocked}, ${slot.source}, ${slot.ruleId}, ${timestamp}, ${timestamp}
          )
          ON CONFLICT (slot_key) DO UPDATE SET
            starts_at = EXCLUDED.starts_at,
            duration_minutes = EXCLUDED.duration_minutes,
            service_id = EXCLUDED.service_id,
            blocked = EXCLUDED.blocked,
            source = EXCLUDED.source,
            rule_id = EXCLUDED.rule_id,
            updated_at = EXCLUDED.updated_at
        `
      })
    },
    async setSlotBlocked(slot, blocked, timestamp) {
      return withSql(async (sql) => {
        const rows = await sql`
          INSERT INTO schedule_slots (
            slot_key, starts_at, duration_minutes, service_id, blocked,
            source, rule_id, created_at, updated_at
          ) VALUES (
            ${slot.slotKey}, ${slot.startsAt}, ${slot.durationMinutes}, ${slot.serviceId},
            ${blocked}, ${slot.source}, ${slot.ruleId}, ${timestamp}, ${timestamp}
          )
          ON CONFLICT (slot_key) DO UPDATE SET
            blocked = EXCLUDED.blocked,
            updated_at = EXCLUDED.updated_at
          RETURNING *
        `
        const row = rows[0]
        if (!row) throw new Error('No se pudo guardar el horario.')
        return slotFromRow(row)
      })
    },
    async deleteManualSlot(slotKey) {
      await withSql(async (sql) => {
        await sql`DELETE FROM schedule_slots WHERE slot_key = ${slotKey} AND source = 'manual'`
      })
    },

    async materializeSlot(slot, timestamp) {
      await withSql(async (sql) => {
        await sql`
          INSERT INTO schedule_slots (
            slot_key, starts_at, duration_minutes, service_id, blocked,
            source, rule_id, created_at, updated_at
          ) VALUES (
            ${slot.slotKey}, ${slot.startsAt}, ${slot.durationMinutes}, ${slot.serviceId},
            false, ${slot.source}, ${slot.ruleId}, ${timestamp}, ${timestamp}
          )
          ON CONFLICT (slot_key) DO NOTHING
        `
      })
    },
    async listReservedSlotKeys() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT slot_key FROM appointments WHERE status = 'reserved'`
        return rows.map((row) => asString(row.slot_key))
      })
    },

    async listAppointments() {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM appointments ORDER BY starts_at DESC, id`
        return rows.map(appointmentFromRow)
      })
    },
    async getAppointment(id) {
      return withSql(async (sql) => {
        const rows = await sql`SELECT * FROM appointments WHERE id = ${id}`
        return rows[0] ? appointmentFromRow(rows[0]) : null
      })
    },
    async reserveAppointment(appointment) {
      return withSql(async (sql) => {
        const rows = await sql`
          INSERT INTO appointments (
            id, slot_key, starts_at, duration_minutes, service_id, status,
            name, email, phone, message, created_at, updated_at, cancelled_at, notification
          ) VALUES (
            ${appointment.id}, ${appointment.slotKey}, ${appointment.startsAt},
            ${appointment.durationMinutes}, ${appointment.serviceId}, ${appointment.status},
            ${appointment.name}, ${appointment.email}, ${appointment.phone}, ${appointment.message},
            ${appointment.createdAt}, ${appointment.updatedAt}, ${appointment.cancelledAt},
            ${appointment.notification ? JSON.stringify(appointment.notification) : null}
          )
          ON CONFLICT (slot_key) WHERE status = 'reserved' DO NOTHING
          RETURNING *
        `
        return rows[0] ? appointmentFromRow(rows[0]) : null
      })
    },
    async cancelAppointment(id, cancelledAt) {
      return withSql(async (sql) => {
        const rows = await sql`
          UPDATE appointments
          SET status = 'cancelled', cancelled_at = ${cancelledAt}, updated_at = ${cancelledAt}
          WHERE id = ${id} AND status = 'reserved'
          RETURNING *
        `
        return rows[0] ? appointmentFromRow(rows[0]) : null
      })
    },
    async saveNotification(id, notification) {
      await withSql(async (sql) => {
        await sql`UPDATE appointments SET notification = ${JSON.stringify(notification)}::jsonb WHERE id = ${id}`
      })
    }
  }
}

export interface MemoryAppointmentSeed {
  rules?: AvailabilityRule[]
  slots?: ManualSlotRecord[]
  appointments?: Appointment[]
}

function cloneAppointment(appointment: Appointment): Appointment {
  return { ...appointment }
}

function cloneSlot(slot: ManualSlotRecord): ManualSlotRecord {
  return { ...slot }
}

function cloneRule(rule: AvailabilityRule): AvailabilityRule {
  return { ...rule }
}

interface SlotEntry {
  slot: ManualSlotRecord
  createdAt: string
  updatedAt: string
}

/** Store en memoria con las mismas garantías atómicas que el de Postgres. */
export function createMemoryAppointmentStore(seed: MemoryAppointmentSeed = {}): AppointmentStore {
  const rules = new Map((seed.rules ?? []).map((rule) => [rule.id, cloneRule(rule)]))
  const slots = new Map<string, SlotEntry>(
    (seed.slots ?? []).map((slot) => [
      slot.slotKey,
      { slot: cloneSlot(slot), createdAt: EPOCH, updatedAt: EPOCH }
    ])
  )
  const appointments = new Map(
    (seed.appointments ?? []).map((appointment) => [appointment.id, cloneAppointment(appointment)])
  )

  return {
    async listRules() {
      return [...rules.values()]
        .sort(
          (left, right) =>
            left.weekday - right.weekday ||
            left.startTime.localeCompare(right.startTime) ||
            left.id.localeCompare(right.id)
        )
        .map(cloneRule)
    },
    async getRule(id) {
      const rule = rules.get(id)
      return rule ? cloneRule(rule) : null
    },
    async saveRule(rule) {
      rules.set(rule.id, cloneRule(rule))
    },
    async deleteRule(id) {
      rules.delete(id)
    },

    async listManualSlots() {
      return [...slots.values()]
        .map((entry) => entry.slot)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
        .map(cloneSlot)
    },
    async getManualSlot(slotKey) {
      const entry = slots.get(slotKey)
      return entry ? cloneSlot(entry.slot) : null
    },
    async saveManualSlot(slot, timestamp) {
      slots.set(slot.slotKey, { slot: cloneSlot(slot), createdAt: timestamp, updatedAt: timestamp })
    },
    async setSlotBlocked(slot, blocked, timestamp) {
      const existing = slots.get(slot.slotKey)
      const base: ManualSlotRecord = existing?.slot ?? {
        id: slot.slotKey,
        ...slot,
        blocked: false
      }
      const updated: ManualSlotRecord = { ...base, blocked }
      slots.set(slot.slotKey, {
        slot: updated,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      })
      return cloneSlot(updated)
    },
    async deleteManualSlot(slotKey) {
      slots.delete(slotKey)
    },

    async materializeSlot(slot, timestamp) {
      if (!slots.has(slot.slotKey)) {
        slots.set(slot.slotKey, {
          slot: { id: slot.slotKey, ...slot, blocked: false },
          createdAt: timestamp,
          updatedAt: timestamp
        })
      }
    },
    async listReservedSlotKeys() {
      return [...appointments.values()]
        .filter((appointment) => appointment.status === 'reserved')
        .map((appointment) => appointment.slotKey)
    },

    async listAppointments() {
      return [...appointments.values()]
        .sort(
          (left, right) =>
            right.startsAt.localeCompare(left.startsAt) || left.id.localeCompare(right.id)
        )
        .map(cloneAppointment)
    },
    async getAppointment(id) {
      const appointment = appointments.get(id)
      return appointment ? cloneAppointment(appointment) : null
    },
    async reserveAppointment(appointment) {
      // Sin awaits: la comprobación y la escritura son atómicas en el event loop.
      const taken = [...appointments.values()].some(
        (item) => item.status === 'reserved' && item.slotKey === appointment.slotKey
      )
      if (taken) return null
      appointments.set(appointment.id, cloneAppointment(appointment))
      return cloneAppointment(appointment)
    },
    async cancelAppointment(id, cancelledAt) {
      const appointment = appointments.get(id)
      if (!appointment || appointment.status !== 'reserved') return null
      const updated: Appointment = {
        ...appointment,
        status: 'cancelled',
        cancelledAt,
        updatedAt: cancelledAt
      }
      appointments.set(id, updated)
      return cloneAppointment(updated)
    },
    async saveNotification(id, notification) {
      const appointment = appointments.get(id)
      if (appointment) appointments.set(id, { ...appointment, notification })
    }
  }
}
