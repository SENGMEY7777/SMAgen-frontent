<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import {
  IconClock,
  IconMessageCircle2,
  IconGitFork,
  IconShieldCheck,
  IconTool,
  IconArrowRight,
} from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { formatCost, formatDate, formatTokens } from '@/utils/formatters'

const runs = ref([])
const approvals = ref([])
const loading = ref(true)
const errorMessage = ref('')

const metrics = computed(() => {
  const totalRuns = runs.value.length
  const completed = runs.value.filter((r) => r.status === 'COMPLETED').length
  const successRate = totalRuns ? Math.round((completed / totalRuns) * 100) : 100
  const activeTasks = runs.value.filter((r) => ['RUNNING', 'PENDING', 'AWAITING_APPROVAL'].includes(r.status)).length
  const totalTokens = runs.value.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
  const totalCost = runs.value.reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0)

  return {
    totalRuns,
    successRate,
    activeTasks,
    totalTokens,
    totalCost,
    pendingApprovals: approvals.value.length,
  }
})

const loadData = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [runsRes, approvalsRes] = await Promise.all([
      api.listRuns().catch(() => ({ data: [] })),
      api.listApprovals().catch(() => ({ data: [] })),
    ])
    runs.value = runsRes?.data || []
    approvals.value = approvalsRes?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load dashboard metrics.'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h1>Dashboard & Metrics</h1>
          <p>Overall system performance, active autonomous tasks, and operational costs.</p>
        </div>
        <button class="secondary-btn" type="button" @click="loadData">
          <IconClock :size="14" /> Refresh
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <!-- Key Metrics Cards Grid -->
      <div class="stats-grid">
        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Success Rate</span>
            <span class="stat-badge green">{{ metrics.successRate }}%</span>
          </div>
          <div class="stat-value">{{ metrics.successRate }}%</div>
          <div class="stat-desc">Completed workflow tasks</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Active Tasks</span>
            <span class="stat-badge blue">{{ metrics.activeTasks }}</span>
          </div>
          <div class="stat-value">{{ metrics.activeTasks }}</div>
          <div class="stat-desc">In-flight DAG executions</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Pending Approvals</span>
            <span class="stat-badge orange">{{ metrics.pendingApprovals }}</span>
          </div>
          <div class="stat-value">{{ metrics.pendingApprovals }}</div>
          <div class="stat-desc">Human-in-the-loop gates</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Token Consumption</span>
            <span class="stat-badge purple">{{ formatTokens(metrics.totalTokens) }}</span>
          </div>
          <div class="stat-value">{{ formatTokens(metrics.totalTokens) }}</div>
          <div class="stat-desc">Est. cost {{ formatCost(metrics.totalCost) }}</div>
        </div>
      </div>

      <!-- Quick Action Modules -->
      <div class="modules-grid">
        <article class="soft-card module-card">
          <div class="module-icon">
            <IconMessageCircle2 :size="18" />
          </div>
          <div class="module-info">
            <h3>AI Chat & Agent</h3>
            <p>Start a conversational session with code artifacts and real-time reasoning.</p>
          </div>
          <RouterLink to="/" class="primary-btn sm">Open Chat</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon purple">
            <IconGitFork :size="18" />
          </div>
          <div class="module-info">
            <h3>Workflows (DAG)</h3>
            <p>Launch multi-step autonomous workflows and monitor dependency execution.</p>
          </div>
          <RouterLink to="/workflows" class="secondary-btn sm">View DAGs</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon orange">
            <IconShieldCheck :size="18" />
          </div>
          <div class="module-info">
            <h3>Security Approvals</h3>
            <p>Review and decide on privileged shell and database execution checkpoints.</p>
          </div>
          <RouterLink to="/approvals" class="secondary-btn sm">Review Queue</RouterLink>
        </article>

        <article class="soft-card module-card">
          <div class="module-icon green">
            <IconTool :size="18" />
          </div>
          <div class="module-info">
            <h3>Tool Integrations</h3>
            <p>Manage active runtime tools: Shell Execution, MySQL, WebSearch, and APIs.</p>
          </div>
          <RouterLink to="/tools" class="secondary-btn sm">Manage Tools</RouterLink>
        </article>
      </div>

      <!-- Recent Active Workflow Runs Table -->
      <div class="section-subhead">
        <h2>Active & Recent Tasks</h2>
        <RouterLink to="/history" class="view-all-link">View all history →</RouterLink>
      </div>

      <div v-if="loading" class="empty-state">Loading dashboard tasks…</div>
      <div v-else-if="!runs.length" class="empty-state">
        No active tasks yet. Start a chat or workflow to begin execution.
      </div>
      <div v-else class="data-list">
        <article v-for="run in runs.slice(0, 5)" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title">{{ run.goal_prompt }}</div>
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

<style scoped>
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

.module-info h3 {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 650;
  color: #111827;
}

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
  margin: 10px 0 14px;
}

.section-subhead h2 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
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
</style>
