import { createRouter, createWebHistory } from 'vue-router'

const isAuthenticated = () => Boolean(localStorage.getItem('omni_token'))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'chat', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
    { path: '/overview', name: 'overview', component: () => import('../views/DashboardOverviewView.vue'), meta: { requiresAuth: true } },
    { path: '/dashboard', redirect: '/overview' },
    { path: '/workflows', name: 'workflows', component: () => import('../views/WorkflowsView.vue'), meta: { requiresAuth: true } },
    { path: '/artifacts', name: 'artifacts', component: () => import('../views/ArtifactsView.vue'), meta: { requiresAuth: true } },
    { path: '/approvals', name: 'approvals', component: () => import('../views/ApprovalsView.vue'), meta: { requiresAuth: true } },
    { path: '/telemetry', name: 'telemetry', component: () => import('../views/TelemetryView.vue'), meta: { requiresAuth: true } },
    { path: '/tools', name: 'tools', component: () => import('../views/ToolsView.vue'), meta: { requiresAuth: true } },
    { path: '/library', name: 'library', component: () => import('../views/LibraryView.vue'), meta: { requiresAuth: true } },
    { path: '/explore', name: 'explore', component: () => import('../views/ExploreView.vue'), meta: { requiresAuth: true } },
    { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue'), meta: { requiresAuth: true } },
    { path: '/runs/:runId', name: 'run-detail', component: () => import('../views/RunDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('../views/AuthView.vue'), props: { mode: 'login' } },
    { path: '/register', name: 'register', component: () => import('../views/AuthView.vue'), props: { mode: 'register' } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) return { name: 'login', query: { redirect: to.fullPath } }
  if ((to.name === 'login' || to.name === 'register') && isAuthenticated()) return { name: 'chat' }
  return true
})

export default router
