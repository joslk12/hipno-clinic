import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useHead } from '@unhead/vue'

export interface PageMeta {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  robots?: string
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://origenconsciente.mx').replace(/\/$/, '')

export function usePageMeta(meta: MaybeRefOrGetter<PageMeta>) {
  useHead(
    computed(() => {
      const value = toValue(meta)
      const url = `${SITE_URL}${value.path}`
      const image = value.image
        ? /^https?:\/\//.test(value.image)
          ? value.image
          : `${SITE_URL}${value.image.startsWith('/') ? value.image : `/${value.image}`}`
        : `${SITE_URL}/assets/og/og-image.jpg`

      return {
        title: value.title,
        meta: [
          { name: 'description', content: value.description },
          ...(value.robots ? [{ name: 'robots', content: value.robots }] : []),
          { property: 'og:title', content: value.title },
          { property: 'og:description', content: value.description },
          { property: 'og:type', content: value.type ?? 'website' },
          { property: 'og:url', content: url },
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:locale', content: 'es_MX' },
          { property: 'og:site_name', content: 'Origen Consciente' },
          { name: 'twitter:card', content: 'summary_large_image' }
        ],
        link: [{ rel: 'canonical', href: url }]
      }
    })
  )
}
