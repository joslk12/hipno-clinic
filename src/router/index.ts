import type { RouteRecordRaw, RouterScrollBehavior } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/servicios', name: 'services', component: () => import('@/views/ServicesView.vue') },
  { path: '/sobre-mi', name: 'about', component: () => import('@/views/AboutView.vue') },
  { path: '/resenas', name: 'reviews', component: () => import('@/views/ReviewsView.vue') },
  { path: '/blog', name: 'blog', component: () => import('@/views/BlogView.vue') },
  {
    path: '/blog/:slug',
    name: 'blog-post',
    component: () => import('@/views/BlogPostView.vue')
  },
  { path: '/contacto', name: 'contact', component: () => import('@/views/ContactView.vue') },
  {
    path: '/admin',
    name: 'admin-hub',
    component: () => import('@/views/admin/AdminReviewsView.vue')
  },
  {
    path: '/admin/blog',
    name: 'admin-blog',
    component: () => import('@/views/admin/AdminBlogView.vue')
  },
  {
    path: '/admin/resenas',
    name: 'admin-reviews',
    component: () => import('@/views/admin/AdminReviewsView.vue')
  },
  {
    path: '/admin/citas',
    name: 'admin-citas',
    component: () => import('@/views/admin/AdminAppointmentsView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]

export const scrollBehavior: RouterScrollBehavior = (_to, _from, savedPosition) => {
  if (savedPosition) return savedPosition
  return { top: 0 }
}
