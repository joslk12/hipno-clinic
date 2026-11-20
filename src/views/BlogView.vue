<script setup lang="ts">
import { pageMeta } from '../content/pages'
import { blogPosts, formatBlogDate } from '../content/blog'
import { usePageMeta } from '../composables/usePageMeta'
import BaseCard from '../components/ui/BaseCard.vue'
import SectionHeading from '../components/ui/SectionHeading.vue'

usePageMeta(pageMeta.blog)
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      eyebrow="Blog"
      title="Ideas para acompañar tu proceso"
      subtitle="Reflexiones sobre hipnosis regresiva, sanación emocional y bienestar cotidiano."
    />

    <div
      v-if="blogPosts.length === 0"
      class="mt-10 rounded-2xl border border-border bg-surface-alt p-8 text-center"
    >
      <p class="font-display text-2xl font-semibold text-accent">Contenido próximamente</p>
      <p class="mx-auto mt-3 max-w-xl font-body text-base leading-relaxed text-text-muted">
        Estamos preparando artículos sobre hipnosis, bienestar y crecimiento personal para acompañarte
        en tu proceso.
      </p>
    </div>

    <div v-else class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <BaseCard
        v-for="post in blogPosts"
        :key="post.id"
        as="article"
        interactive
        class="overflow-hidden"
      >
        <RouterLink :to="`/blog/${post.slug}`" class="group block h-full">
          <img
            v-if="post.coverImage"
            :src="post.coverImage"
            :alt="`Portada del artículo: ${post.title}`"
            class="aspect-[16/9] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div class="flex h-full flex-col p-6">
            <time :datetime="post.publishedAt" class="font-body text-xs text-text-muted">
              {{ formatBlogDate(post.publishedAt) }}
            </time>
            <h2 class="mt-2 font-display text-2xl font-semibold text-accent">
              {{ post.title }}
            </h2>
            <p class="mt-3 flex-1 font-body text-sm leading-relaxed text-text-muted">
              {{ post.excerpt }}
            </p>
            <span class="mt-5 font-body text-sm font-semibold text-accent">
              Leer artículo
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </RouterLink>
      </BaseCard>
    </div>
  </section>
</template>
