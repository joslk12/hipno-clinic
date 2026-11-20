import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } from './auth'
import type { BlogStore } from './store'

export function recentAttempts(timestamps: string[], now: number, windowMs: number): string[] {
  const threshold = now - windowMs
  return timestamps.filter((timestamp) => {
    const value = Date.parse(timestamp)
    return Number.isFinite(value) && value > threshold
  })
}

export async function loginRateLimit(
  store: BlogStore,
  key: string,
  now = Date.now()
): Promise<{ limited: boolean; retryAfterSeconds: number; attempts: string[] }> {
  const attempts = recentAttempts(await store.getRateTimestamps(key), now, LOGIN_WINDOW_MS)
  const limited = attempts.length >= LOGIN_MAX_ATTEMPTS
  const oldest = attempts.length > 0 ? Math.min(...attempts.map((value) => Date.parse(value))) : now
  const retryAfterSeconds = limited
    ? Math.max(1, Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000))
    : 0

  return { limited, retryAfterSeconds, attempts }
}

export async function recordLoginFailure(
  store: BlogStore,
  key: string,
  attempts: string[],
  now = Date.now()
): Promise<void> {
  await store.saveRateTimestamps(key, [...attempts, new Date(now).toISOString()])
}

export async function clearLoginFailures(store: BlogStore, key: string): Promise<void> {
  await store.saveRateTimestamps(key, [])
}
