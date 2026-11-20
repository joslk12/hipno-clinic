import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const StubView = defineComponent({
  render: () => null
})

export async function createTestRouter(initialPath = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:pathMatch(.*)*',
        component: StubView
      }
    ]
  })

  await router.push(initialPath)
  await router.isReady()

  return router
}
