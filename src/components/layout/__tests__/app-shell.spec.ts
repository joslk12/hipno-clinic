import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/vue'
import { h } from 'vue'
import { axe } from 'vitest-axe'
import AppShell from '../AppShell.vue'
import { createTestRouter } from '../../../test/createTestRouter'

afterEach(() => cleanup())

describe('AppShell', () => {
  it('no tiene violaciones críticas de accesibilidad', async () => {
    const router = await createTestRouter('/')
    const { container } = render(AppShell, {
      slots: { default: () => h('h1', 'Inicio') },
      global: { plugins: [router] }
    })

    const results = await axe(container)

    expect(results.violations).toHaveLength(0)
  })
})
