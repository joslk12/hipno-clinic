<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DOMPurify from 'dompurify'
import { getBlogPost, formatBlogDate } from '../content/blog'
import { pageMeta } from '../content/pages'
import { usePageMeta, type PageMeta } from '../composables/usePageMeta'
import BaseButton from '../components/ui/BaseButton.vue'
import BrandOrnament from '../components/ui/BrandOrnament.vue'
import NotFoundView from './NotFoundView.vue'

const route = useRoute()
const post = computed(() => getBlogPost(String(route.params.slug)))

const meta = computed<PageMeta>(() =>
  post.value
    ? {
        title: `${post.value.title} | Origen Consciente`,
        description: post.value.excerpt,
        path: `/blog/${post.value.slug}`,
        image: post.value.coverImage ?? undefined,
        type: 'article'
      }
    : pageMeta.notFound
)

usePageMeta(meta)

const safeHtml = computed(() => {
  const html = post.value?.contentHtml ?? ''
  if (typeof window === 'undefined') return html

  const purify = DOMPurify as unknown as { sanitize?: (value: string) => string }
  return typeof purify.sanitize === 'function' ? purify.sanitize(html) : html
})
</script>

<template>
  <NotFoundView v-if="!post" />

  <article v-else class="mx-auto max-w-3xl px-4 py-16 md:px-8">
    <RouterLink
      to="/blog"
      class="font-body text-sm font-semibold text-accent hover:underline"
    >
      <span aria-hidden="true">←</span> Volver al blog
    </RouterLink>

    <header class="mt-8">
      <BrandOrnament name="divider-3" class="h-8 w-32" />
      <h1 class="mt-5 font-display text-4xl font-semibold tracking-[0.04em] text-accent md:text-5xl">
        {{ post.title }}
      </h1>
      <time :datetime="post.publishedAt" class="mt-4 block font-body text-sm text-text-muted">
        {{ formatBlogDate(post.publishedAt) }}
      </time>
      <p class="mt-5 font-accent text-xl italic leading-relaxed text-text-muted">
        {{ post.excerpt }}
      </p>
    </header>

    <img
      v-if="post.coverImage"
      :src="post.coverImage"
      :alt="`Portada del artículo: ${post.title}`"
      class="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
      decoding="async"
    />

    <div class="blog-content mt-10" v-html="safeHtml" />

    <div class="mt-12 border-t border-border pt-8">
      <RouterLink v-slot="{ href, navigate }" to="/blog" custom>
        <BaseButton as="a" :href="href" variant="secondary" @click="navigate">
          Ver más artículos
        </BaseButton>
      </RouterLink>
    </div>
  </article>
</template>
