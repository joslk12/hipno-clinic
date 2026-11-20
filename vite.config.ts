import vue from '@vitejs/plugin-vue'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const blogDataPath = resolve(
  process.cwd(),
  process.env.BLOG_DATA_FILE || 'src/content/generated/blog.json'
)

function readBlogPosts() {
  if (!existsSync(blogDataPath)) return []

  try {
    const data = JSON.parse(readFileSync(blogDataPath, 'utf8'))
    return Array.isArray(data)
      ? data.filter(
          (post): post is { slug: string } =>
            typeof post === 'object' && post !== null && typeof post.slug === 'string'
        )
      : []
  } catch {
    return []
  }
}

const blogPosts = readBlogPosts()

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@blog-data': blogDataPath
    }
  },
  ssgOptions: {
    includedRoutes(paths) {
      const staticRoutes = paths.filter(
        (path) => !path.includes(':') && !path.startsWith('/admin')
      )
      const articleRoutes = blogPosts.map((post) => `/blog/${post.slug}`)

      return [...new Set([...staticRoutes, '/404', ...articleRoutes])]
    }
  }
})
