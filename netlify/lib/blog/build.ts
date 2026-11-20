import type { BuildResult, BlogStatus } from '../../../src/types/blog'

export interface BuildState {
  status: BlogStatus
}

export function shouldTriggerBuild(
  previous: BuildState | null,
  next: BuildState | null
): boolean {
  return previous?.status === 'published' || next?.status === 'published'
}

export async function triggerBuild(
  hookUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000
): Promise<BuildResult> {
  if (!hookUrl) {
    return {
      triggered: false,
      warning:
        'El cambio se guardó, pero BLOG_BUILD_HOOK_URL no está configurado; publica el sitio manualmente.'
    }
  }

  try {
    const response = await fetchImpl(hookUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs)
    })

    if (!response.ok) {
      return {
        triggered: false,
        warning: `El cambio se guardó, pero Netlify rechazó la reconstrucción (${response.status}).`
      }
    }

    return { triggered: true }
  } catch {
    return {
      triggered: false,
      warning: 'El cambio se guardó, pero no fue posible iniciar la reconstrucción en Netlify.'
    }
  }
}
