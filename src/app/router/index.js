import { createRouter, createWebHistory } from 'vue-router'

import { PRIVILEGED_ROLES } from '@/config/constants'
import { useAuthStore } from '@/stores/auth'

const appTitle = 'KAIRO'

const dashboardMeta = {
  requiresAuth: true,
  layout: 'dashboard',
}

const views = {
  chat: () => import('@/views/dashboard/DashboardView.vue'),
  overview: () => import('@/views/dashboard/DashboardOverviewView.vue'),
  workflows: () => import('@/views/workflows/WorkflowsView.vue'),
  runDetail: () => import('@/views/workflows/RunDetailView.vue'),
  artifacts: () => import('@/views/dashboard/ArtifactsView.vue'),
  approvals: () => import('@/views/dashboard/ApprovalsView.vue'),
  telemetry: () => import('@/views/dashboard/TelemetryView.vue'),
  tools: () => import('@/views/dashboard/ToolsView.vue'),
  library: () => import('@/views/dashboard/LibraryView.vue'),
  explore: () => import('@/views/dashboard/ExploreView.vue'),
  history: () => import('@/views/dashboard/HistoryView.vue'),
  settings: () => import('@/views/dashboard/SettingsView.vue'),
  auth: () => import('@/views/auth/AuthView.vue'),
  notFound: () => import('@/views/NotFoundView.vue'),
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: views.chat,
      meta: { ...dashboardMeta, title: 'Chat' },
    },
    {
      path: '/overview',
      name: 'overview',
      component: views.overview,
      meta: { ...dashboardMeta, title: 'Dashboard' },
    },
    {
      path: '/dashboard',
      redirect: { name: 'overview' },
    },
    {
      path: '/workflows',
      name: 'workflows',
      component: views.workflows,
      meta: { ...dashboardMeta, title: 'Workflows' },
    },
    {
      path: '/runs/:runId',
      name: 'run-detail',
      component: views.runDetail,
      meta: { ...dashboardMeta, title: 'Workflow run', allowDemo: true },
    },
    {
      path: '/artifacts',
      name: 'artifacts',
      component: views.artifacts,
      meta: { ...dashboardMeta, title: 'Artifacts' },
    },
    {
      path: '/approvals',
      name: 'approvals',
      component: views.approvals,
      meta: {
        ...dashboardMeta,
        title: 'Security approvals',
        roles: PRIVILEGED_ROLES,
      },
    },
    {
      path: '/telemetry',
      name: 'telemetry',
      component: views.telemetry,
      meta: { ...dashboardMeta, title: 'Telemetry' },
    },
    {
      path: '/tools',
      name: 'tools',
      component: views.tools,
      meta: { ...dashboardMeta, title: 'Tools' },
    },
    {
      path: '/library',
      name: 'library',
      component: views.library,
      meta: { ...dashboardMeta, title: 'Template library' },
    },
    {
      path: '/explore',
      name: 'explore',
      component: views.explore,
      meta: { ...dashboardMeta, title: 'Explore' },
    },
    {
      path: '/history',
      name: 'history',
      component: views.history,
      meta: { ...dashboardMeta, title: 'History' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: views.settings,
      meta: { ...dashboardMeta, title: 'Settings' },
    },
    {
      path: '/login',
      name: 'login',
      component: views.auth,
      props: { mode: 'login' },
      meta: { guestOnly: true, title: 'Sign in' },
    },
    {
      path: '/register',
      name: 'register',
      component: views.auth,
      props: { mode: 'register' },
      meta: { guestOnly: true, title: 'Create account' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: views.notFound,
      meta: { title: 'Page not found' },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

const hasRequiredRole = (to, auth) => {
  const roles = to.meta.roles
  if (!Array.isArray(roles) || roles.length === 0) return true

  return roles.some((role) => String(role).toUpperCase() === String(auth.role).toUpperCase())
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublicDemo = to.meta.allowDemo && String(to.params.runId).toLowerCase() === 'demo'

  if (to.meta.requiresAuth && !auth.isAuthenticated && !isPublicDemo) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'chat' }
  }

  if (to.meta.requiresAuth && !hasRequiredRole(to, auth)) {
    return { name: 'overview' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} · ${appTitle}` : appTitle
  document.title = title
})

export const isInternalRedirect = (value) => {
  const redirect = String(value || '')
  return redirect.startsWith('/') && !redirect.startsWith('//')
}

export default router
