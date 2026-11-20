import { readBlogEnv, type BlogEnv } from './config'
import { createBlobBlogStore, type BlogStore } from './store'

let store: BlogStore | undefined

export function getBlogStore(): BlogStore {
  if (!store) store = createBlobBlogStore()
  return store
}

export function getBlogEnv(): BlogEnv {
  return readBlogEnv()
}
