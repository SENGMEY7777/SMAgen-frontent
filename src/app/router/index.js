import { createRouter, createWebHistory } from 'vue-router'

const isAuthenticated = () => Boolean(localStorage.getItem('omni_token'))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'chat', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { requiresAuth: true } },
    { path: '/overview', name: 'overview', component: () => import('@/views/dashboard/DashboardOverviewView.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', redirect: '/overview' },
    { path: '/workflows', name: 'workflows', component: () => import('@/views/workflows/WorkflowsView.vue'), meta: { requiresAuth: true } },
    { path: '/artifacts', name: 'artifacts', component: () => import('@/views/dashboard/ArtifactsView.vue'), meta: { requiresAuth: true } },
    { path: '/approvals', name: 'approvals', component: () => import('@/views/dashboard/ApprovalsView.vue'), meta: { requiresAuth: true } },
    { path: '/telemetry', name: 'telemetry', component: () => import('@/views/dashboard/TelemetryView.vue'), meta: { requiresAuth: true } },
    { path: '/tools', name: 'tools', component: () => import('@/views/dashboard/ToolsView.vue'), meta: { requiresAuth: true } },
    { path: '/library', name: 'library', component: () => import('@/views/dashboard/LibraryView.vue'), meta: { requiresAuth: true } },
    { path: '/explore', name: 'explore', component: () => import('@/views/dashboard/ExploreView.vue'), meta: { requiresAuth: true } },
    { path: '/history', name: 'history', component: () => import('@/views/dashboard/HistoryView.vue'), meta: { requiresAuth: true } },
    { path: '/runs/:runId', name: 'run-detail', component: () => import('@/views/workflows/RunDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/settings', name: 'settings', component: () => import('@/views/dashboard/SettingsView.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('@/views/auth/AuthView.vue'), props: { mode: 'login' } },
    { path: '/register', name: 'register', component: () => import('@/views/auth/AuthView.vue'), props: { mode: 'register' } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) return { name: 'login', query: { redirect: to.fullPath } }
  if ((to.name === 'login' || to.name === 'register') && isAuthenticated()) return { name: 'chat' }
  return true
})

export default router
