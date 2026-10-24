<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h1>Dashboard & Metrics</h1>
          <p>Overall system performance, active autonomous tasks, and operational costs.</p>
        </div>
        <div class="head-actions">
          <div class="live-pill" title="Real-time WebSocket & background polling active">
            <span class="live-pulse"></span>
            <span>Live Data</span>
          </div>
          <button class="secondary-btn" type="button" :disabled="isRefreshing" @click="manualRefresh">
            <IconRefresh :size="14" :class="{ 'spin-icon': isRefreshing }" /> Refresh
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <!-- Key Metrics Cards Grid -->
      <div class="stats-grid">
        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Success Rate</span>
            <span class="stat-badge" :class="metrics.successBadgeColor">{{ metrics.successRate }}%</span>
          </div>
          <div class="stat-value">{{ metrics.successRate }}%</div>
          <div class="stat-desc">
            {{ metrics.totalRuns > 0 ? `${metrics.completed} of ${metrics.totalRuns} tasks completed` : 'No tasks executed yet' }}
          </div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Active Tasks</span>
            <span class="stat-badge" :class="metrics.activeTasks > 0 ? 'blue' : 'gray'">{{ metrics.activeTasks }}</span>
          </div>
          <div class="stat-value">{{ metrics.activeTasks }}</div>
          <div class="stat-desc">
            {{ metrics.activeTasks > 0 ? `${metrics.activeTasks} in-flight DAG execution${metrics.activeTasks === 1 ? '' : 's'}` : 'All autonomous DAGs idle' }}
          </div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Pending Approvals</span>
            <span class="stat-badge" :class="metrics.pendingApprovals > 0 ? 'orange' : 'green'">{{ metrics.pendingApprovals }}</span>
          </div>
          <div class="stat-value">{{ metrics.pendingApprovals }}</div>
          <div class="stat-desc">
            {{ metrics.pendingApprovals > 0 ? `${metrics.pendingApprovals} human gate${metrics.pendingApprovals === 1 ? '' : 's'} awaiting review` : 'All operations authorized' }}
          </div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Token Consumption</span>
            <span class="stat-badge purple">{{ formatTokens(metrics.totalTokens) }}</span>
          </div>
          <div class="stat-value">{{ formatTokens(metrics.totalTokens) }}</div>
          <div class="stat-desc">Est. cost {{ formatCost(metrics.totalCost) }} · {{ metrics.totalRuns }} runs</div>
        </div>
      </div>

      <!-- Quick Action Modules -->
      <div class="modules-grid">
        <article class="soft-card module-card">
          <div class="module-icon">
            <IconMessageCircle2 :size="18" />
          </div>
          <div class="module-info">
            <div class="module-title-row">
              <h3>AI Chat & Agent</h3>
              <span class="module-counter blue">{{ chatSessionsCount }} Active</span>
            </div>
            <p>Start a conversational session with code artifacts and real-time reasoning.</p>
          </div>
          <RouterLink to="/" class="secondary-btn sm">Open Chat</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon purple">
            <IconGitFork :size="18" />
          </div>
          <div class="module-info">
            <div class="module-title-row">
              <h3>Workflows (DAG)</h3>
              <span class="module-counter purple">{{ metrics.activeTasks > 0 ? `${metrics.activeTasks} Running` : `${metrics.totalRuns} Total` }}</span>
            </div>
            <p>Launch multi-step autonomous workflows and monitor dependency execution.</p>
          </div>
          <RouterLink to="/workflows" class="secondary-btn sm">View DAGs</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon orange">
            <IconShieldCheck :size="18" />
          </div>
          <div class="module-info">
            <div class="module-title-row">
              <h3>Security Approvals</h3>
              <span class="module-counter" :class="metrics.pendingApprovals > 0 ? 'orange' : 'green'">{{ metrics.pendingApprovals > 0 ? `${metrics.pendingApprovals} Pending` : 'All Clear' }}</span>
            </div>
            <p>Review and decide on privileged shell and database execution checkpoints.</p>
          </div>
          <RouterLink to="/approvals" class="secondary-btn sm">Review Queue</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon green">
            <IconTool :size="18" />
          </div>
          <div class="module-info">
            <div class="module-title-row">
              <h3>Tool Integrations</h3>
              <span class="module-counter green">6 Active</span>
            </div>
            <p>Manage active runtime tools: Shell Execution, MySQL, WebSearch, and APIs.</p>
          </div>
          <RouterLink to="/tools" class="secondary-btn sm">Manage Tools</RouterLink>
        </article>
      </div>

      <!-- Recent Active Workflow Runs Table -->
      <div class="section-subhead">
        <div class="subhead-left">
          <h2>Active & Recent Tasks</h2>
          <span class="badge-count">{{ runs.length }}</span>
        </div>
        <RouterLink to="/history" class="view-all-link">View all history →</RouterLink>
      </div>

      <div v-if="loading" class="empty-state">Loading dashboard tasks…</div>
      <div v-else-if="!runs.length" class="empty-state">
        No active tasks yet. Start a chat or workflow to begin execution.
      </div>
      <div v-else class="data-list">
        <article v-for="run in runs.slice(0, 10)" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title" :title="run.goal_prompt">{{ run.goal_prompt }}</div>
            <div class="row-meta">
              {{ formatDate(run.created_at) }} · {{ formatTokens(run.total_tokens) }} tokens · {{ formatCost(run.estimated_cost_usd) }}
            </div>
          </div>
          <div class="row-actions">
            <StatusPill :status="run.status" />
            <RouterLink class="secondary-btn sm" :to="`/runs/${run.id}`">
              Inspect <IconArrowRight :size="12" />
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import {
  IconRefresh,
  IconMessageCircle2,
  IconGitFork,
  IconShieldCheck,
  IconTool,
  IconArrowRight,
} from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { createSocketClient } from '@/services/socket'
import { useChatStore } from '@/stores/chat'
import { formatCost, formatDate, formatTokens } from '@/utils/formatters'

const runs = ref([])
const approvals = ref([])
const loading = ref(true)
const isRefreshing = ref(false)
const errorMessage = ref('')

const chatStore = useChatStore()
const chatSessionsCount = computed(() => chatStore.sessions?.length || 0)

let timer = null
let socket = null

const metrics = computed(() => {
  const totalRuns = runs.value.length
  const completed = runs.value.filter((r) => r.status === 'COMPLETED').length
  const failed = runs.value.filter((r) => r.status === 'FAILED').length
  const successRate = totalRuns ? Math.round((completed / totalRuns) * 100) : 100
  const activeTasks = runs.value.filter((r) => ['RUNNING', 'PENDING', 'AWAITING_APPROVAL'].includes(r.status)).length
  const totalTokens = runs.value.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
  const totalCost = runs.value.reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0)

  let successBadgeColor = 'green'
  if (totalRuns === 0) {
    successBadgeColor = 'gray'
  } else if (successRate >= 80) {
    successBadgeColor = 'green'
  } else if (successRate >= 50) {
    successBadgeColor = 'orange'
  } else {
    successBadgeColor = 'red'
  }

  return {
    totalRuns,
    completed,
    failed,
    successRate,
    successBadgeColor,
    activeTasks,
    totalTokens,
    totalCost,
    pendingApprovals: approvals.value.length,
  }
})

const loadData = async (silent = false) => {
  if (!silent) {
    loading.value = true
  }
  errorMessage.value = ''
  try {
    const [runsRes, approvalsRes] = await Promise.all([
      api.listRuns().catch(() => ({ data: [] })),
      api.listApprovals().catch(() => ({ data: [] })),
    ])
    runs.value = runsRes?.data || []
    approvals.value = approvalsRes?.data || []
  } catch (error) {
    if (!silent) {
      errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load dashboard metrics.'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
    isRefreshing.value = false
  }
}

const manualRefresh = () => {
  isRefreshing.value = true
  loadData(false)
}

onMounted(() => {
  loadData()

  // Periodic polling every 5s for background freshness
  timer = window.setInterval(() => {
    loadData(true)
  }, 5000)

  // Socket client for real-time WebSocket events
  socket = createSocketClient()
  if (socket) {
    const refreshEvents = [
      'telemetry',
      'task_started',
      'task_completed',
      'task_failed',
      'approval_required',
      'approval_resolved',
      'workflow_completed',
      'workflow_failed',
      'run_status_changed',
    ]
    refreshEvents.forEach((evt) => {
      socket.on(evt, () => loadData(true))
    })

    socket.on('connect_error', () => {
      // Quietly ignore connection errors to prevent console flooding
    })
  }
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
  if (socket) {
    try {
      socket.disconnect()
    } catch {}
    socket = null
  }
})
</script>

<style scoped>
.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 4px 10px;
  border-radius: 999px;
  user-select: none;
}

.live-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 16px 18px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #6b7280;
}

.stat-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.stat-badge.green { background: #dcfce7; color: #15803d; }
.stat-badge.blue { background: #dbeafe; color: #1d4ed8; }
.stat-badge.orange { background: #ffedd5; color: #c2410c; }
.stat-badge.purple { background: #f3e8ff; color: #7e22ce; }
.stat-badge.red { background: #fee2e2; color: #b91c1c; }
.stat-badge.gray { background: #f3f4f6; color: #6b7280; }

.stat-value {
  font-size: 26px;
  font-weight: 750;
  color: #111827;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.stat-desc {
  margin-top: 5px;
  font-size: 11.5px;
  color: #9ca3af;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.module-icon.purple { background: #f5f3ff; color: #7c3aed; }
.module-icon.orange { background: #fff7ed; color: #ea580c; }
.module-icon.green { background: #f0fdf4; color: #16a34a; }

.module-info {
  flex: 1;
  min-width: 0;
}

.module-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.module-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: #111827;
}

.module-counter {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.module-counter.blue { background: #eff6ff; color: #1d4ed8; }
.module-counter.purple { background: #f5f3ff; color: #7c3aed; }
.module-counter.green { background: #f0fdf4; color: #15803d; }
.module-counter.orange { background: #fff7ed; color: #c2410c; }

.module-info p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.35;
}

.section-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32px 0 14px;
}

.subhead-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-subhead h2 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.badge-count {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
}

.view-all-link {
  font-size: 12.5px;
  font-weight: 600;
  color: #4f46e5;
}

.primary-btn.sm, .secondary-btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}

.data-row {
  min-width: 0;
  width: 100%;
}

.row-main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.row-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  font-size: 15px;
  font-weight: 500;
}
</style>
