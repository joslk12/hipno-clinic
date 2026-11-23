import { getSql, hasDatabase } from '../db/client'
import { readBlogEnv } from './config'
import { createPostgresPostStore } from './post-store'
import { createBlobBlogStore, type BlogStore } from './store'

let store: BlogStore | undefined

export function getBlogStore(): BlogStore {
  if (!store) {
    const blob = createBlobBlogStore()

    if (!hasDatabase()) {
      store = blob
    } else {
      // Los artículos viven en Postgres; las imágenes y los rate limits siguen en Blobs.
      const posts = createPostgresPostStore(getSql)
      store = {
        listPosts: () => posts.listPosts(),
        getPost: (id) => posts.getPost(id),
        savePost: (post) => posts.savePost(post),
        deletePost: (id) => posts.deletePost(id),
        getImage: (key) => blob.getImage(key),
        saveImage: (key, image) => blob.saveImage(key, image),
        deleteImage: (key) => blob.deleteImage(key),
        getRateTimestamps: (key) => blob.getRateTimestamps(key),
        saveRateTimestamps: (key, timestamps) => blob.saveRateTimestamps(key, timestamps)
      }
    }
  }

  return store
}

export function getBlogEnv() {
  return readBlogEnv()
}
