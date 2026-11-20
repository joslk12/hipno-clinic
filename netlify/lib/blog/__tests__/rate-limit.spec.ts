import { describe, expect, it } from 'vitest'
import { createMemoryBlogStore } from '../store'
import { loginRateLimit, recentAttempts, recordLoginFailure } from '../rate-limit'

describe('blog rate limit', () => {
  it('filtra intentos fuera de la ventana', () => {
    const now = Date.parse('2026-01-01T00:15:00.000Z')
    expect(
      recentAttempts(
        ['2026-01-01T00:00:00.000Z', '2026-01-01T00:10:00.000Z'],
        now,
        15 * 60 * 1000
      )
    ).toEqual(['2026-01-01T00:10:00.000Z'])
  })

  it('bloquea después de cinco fallos', async () => {
    const store = createMemoryBlogStore()
    const now = Date.parse('2026-01-01T00:10:00.000Z')

    for (let index = 0; index < 5; index += 1) {
      const state = await loginRateLimit(store, 'login:uno', now)
      expect(state.limited).toBe(false)
      await recordLoginFailure(store, 'login:uno', state.attempts, now)
    }

    const blocked = await loginRateLimit(store, 'login:uno', now)
    expect(blocked.limited).toBe(true)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})
