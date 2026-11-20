export interface BlogEnv {
  adminPassword?: string
  sessionSecret?: string
  buildHookUrl?: string
  siteUrl?: string
}

export function readBlogEnv(env: Record<string, string | undefined> = process.env): BlogEnv {
  return {
    adminPassword: env.BLOG_ADMIN_PASSWORD,
    sessionSecret: env.BLOG_SESSION_SECRET,
    buildHookUrl: env.BLOG_BUILD_HOOK_URL,
    siteUrl: env.BLOG_API_URL || env.URL
  }
}
