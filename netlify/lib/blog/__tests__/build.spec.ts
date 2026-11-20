import { describe, expect, it, vi } from 'vitest'
import { shouldTriggerBuild, triggerBuild } from '../build'

describe('blog build hook', () => {
  it('decide cuándo reconstruir', () => {
    expect(shouldTriggerBuild(null, { status: 'published' })).toBe(true)
    expect(shouldTriggerBuild({ status: 'published' }, { status: 'draft' })).toBe(true)
    expect(shouldTriggerBuild({ status: 'draft' }, { status: 'draft' })).toBe(false)
    expect(shouldTriggerBuild({ status: 'published' }, null)).toBe(true)
  })

  it('advierte si no hay hook configurado', async () => {
    const result = await triggerBuild(undefined)
    expect(result.triggered).toBe(false)
    expect(result.warning).toContain('BLOG_BUILD_HOOK_URL')
  })

  it('llama al hook y maneja errores', async () => {
    const ok = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch
    expect(await triggerBuild('https://hook.test', ok)).toEqual({ triggered: true })

    const bad = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch
    expect((await triggerBuild('https://hook.test', bad)).warning).toContain('500')

    const fail = vi.fn(async () => {
      throw new Error('network')
    }) as unknown as typeof fetch
    expect((await triggerBuild('https://hook.test', fail)).triggered).toBe(false)
  })
})
