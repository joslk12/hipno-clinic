import type { ScheduleSlot } from '../../../src/types/appointments'
import type { AppointmentStore } from './store'
import {
  APPOINTMENTS_TIME_ZONE,
  addDaysToDateKey,
  formatLocalDateKey,
  getWeekday,
  isBookableTime,
  isPastInstant,
  parseSlotKey,
  slotKeyToUtc
} from './timezone'

export const DEFAULT_HORIZON_DAYS = 60

export interface DateRange {
  from: string
  to: string
}

export function defaultDateRange(
  now: Date,
  timeZone = APPOINTMENTS_TIME_ZONE,
  horizonDays = DEFAULT_HORIZON_DAYS
): DateRange {
  const from = formatLocalDateKey(now, timeZone)
  return { from, to: addDaysToDateKey(from, horizonDays - 1) ?? from }
}

export interface SlotCatalog {
  /** Definiciones no bloqueadas, deduplicadas por slotKey. */
  definitions: Map<string, ScheduleSlot>
  /** Claves con un registro bloqueado en schedule_slots. */
  blockedKeys: Set<string>
}

export interface BuildCatalogOptions {
  rules: Awaited<ReturnType<AppointmentStore['listRules']>>
  storedSlots: Awaited<ReturnType<AppointmentStore['listManualSlots']>>
  from: string
  to: string
  now: Date
  timeZone?: string
  includePast?: boolean
}

/**
 * Combina reglas recurrentes con excepciones individuales.
 *
 * Solo las filas `manual` de schedule_slots sobrescriben una regla; las filas
 * `rule` son materializaciones de la reserva y se ignoran aquí para que editar
 * o borrar una regla no deje horarios fantasma.
 */
export function buildSlotCatalog(options: BuildCatalogOptions): SlotCatalog {
  const timeZone = options.timeZone ?? APPOINTMENTS_TIME_ZONE
  const definitions = new Map<string, ScheduleSlot>()
  const blockedKeys = new Set<string>()

  for (const rule of options.rules) {
    if (!rule.active || !isBookableTime(rule.startTime)) continue

    for (let dateKey = options.from; dateKey <= options.to; ) {
      const ruleWeekday = getWeekday(dateKey)
      if (
        ruleWeekday === rule.weekday &&
        (!rule.validFrom || dateKey >= rule.validFrom) &&
        (!rule.validUntil || dateKey <= rule.validUntil)
      ) {
        const slotKey = `${dateKey}T${rule.startTime}`
        const startsAt = slotKeyToUtc(slotKey, timeZone)
        if (startsAt && (options.includePast || !isPastInstant(new Date(startsAt), options.now))) {
          definitions.set(slotKey, {
            slotKey,
            startsAt,
            durationMinutes: rule.durationMinutes,
            serviceId: rule.serviceId,
            blocked: false,
            source: 'rule',
            ruleId: rule.id
          })
        }
      }
      const next = addDaysToDateKey(dateKey, 1)
      if (!next || next <= dateKey) break
      dateKey = next
    }
  }

  for (const stored of options.storedSlots) {
    const parsed = parseSlotKey(stored.slotKey)
    if (
      !parsed ||
      !isBookableTime(parsed.time) ||
      parsed.dateKey < options.from ||
      parsed.dateKey > options.to
    ) {
      continue
    }

    if (stored.blocked) {
      blockedKeys.add(stored.slotKey)
      definitions.delete(stored.slotKey)
      continue
    }
    // Un horario materializado desde una regla no sustituye a la regla vigente.
    if (stored.source !== 'manual') continue

    const startsAt = slotKeyToUtc(stored.slotKey, timeZone)
    if (!startsAt || (!options.includePast && isPastInstant(new Date(startsAt), options.now))) {
      continue
    }
    definitions.set(stored.slotKey, {
      slotKey: stored.slotKey,
      startsAt,
      durationMinutes: stored.durationMinutes,
      serviceId: stored.serviceId,
      blocked: false,
      source: 'manual',
      ruleId: stored.ruleId
    })
  }

  return { definitions, blockedKeys }
}

export interface AvailableSlotsOptions {
  store: AppointmentStore
  now?: Date
  timeZone?: string
  from?: string
  to?: string
  serviceId?: string | null
  horizonDays?: number
}

/** Horarios públicos: futuros, no bloqueados, no reservados y del servicio pedido. */
export async function getAvailableSlots(options: AvailableSlotsOptions): Promise<ScheduleSlot[]> {
  const now = options.now ?? new Date()
  const timeZone = options.timeZone ?? APPOINTMENTS_TIME_ZONE
  const defaults = defaultDateRange(now, timeZone, options.horizonDays)
  const from = options.from ?? defaults.from
  const to =
    options.to ??
    (options.from
      ? addDaysToDateKey(from, (options.horizonDays ?? DEFAULT_HORIZON_DAYS) - 1) ?? from
      : defaults.to)
  const [rules, storedSlots, reserved] = await Promise.all([
    options.store.listRules(),
    options.store.listManualSlots(),
    options.store.listReservedSlotKeys()
  ])
  const catalog = buildSlotCatalog({ rules, storedSlots, from, to, now, timeZone })
  const reservedKeys = new Set(reserved)
  const serviceId = options.serviceId?.trim() || null

  return [...catalog.definitions.values()]
    .filter((slot) => !reservedKeys.has(slot.slotKey) && !catalog.blockedKeys.has(slot.slotKey))
    .filter((slot) => !serviceId || slot.serviceId === null || slot.serviceId === serviceId)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.slotKey.localeCompare(right.slotKey))
}

/** Definición de una clave concreta, sin aplicar filtro de reservas ni servicio. */
export async function getSlotDefinition(
  store: AppointmentStore,
  slotKey: string,
  now: Date,
  timeZone = APPOINTMENTS_TIME_ZONE,
  includePast = false
): Promise<ScheduleSlot | null> {
  const parsed = parseSlotKey(slotKey)
  if (!parsed) return null
  const [rules, storedSlots] = await Promise.all([store.listRules(), store.listManualSlots()])
  const catalog = buildSlotCatalog({
    rules,
    storedSlots,
    from: parsed.dateKey,
    to: parsed.dateKey,
    now,
    timeZone,
    includePast
  })
  return catalog.definitions.get(slotKey) ?? null
}
