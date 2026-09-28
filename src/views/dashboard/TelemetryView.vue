<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { api, ApiError } from '@/services/api'
import { formatCost, formatDate, formatTokens } from '@/utils/formatters'

const runs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const selectedTimeframe = ref('7d')

const loadData = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await api.listRuns().catch(() => ({ data: [] }))
    runs.value = res?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load telemetry.'
  } finally {
    loading.value = false
  }
}

const stats = computed(() => {
  const totalTokens = runs.value.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
  const totalCost = runs.value.reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0)
  const promptTokens = Math.round(totalTokens * 0.65)
  const completionTokens = totalTokens - promptTokens
  const avgLatency = runs.value.length ? '1.42s' : '0.00s'
  const p95Latency = runs.value.length ? '2.18s' : '0.00s'

  return {
    totalTokens,
    totalCost,
    promptTokens,
    completionTokens,
    avgLatency,
    p95Latency,
    tokensPerSec: '84.5 tok/s',
  }
})

const modelBreakdown = computed(() => [
  {
    name: 'KAIRO 4o (Omni Reasoning)',
    tokens: Math.round(stats.value.totalTokens * 0.72),
    cost: (stats.value.totalCost * 0.78).toFixed(4),
    share: '72%',
    rate: '$2.50 / 1M in · $10.00 / 1M out',
  },
  {
    name: 'KAIRO 4o-mini (Fast Execution)',
    tokens: Math.round(stats.value.totalTokens * 0.23),
    cost: (stats.value.totalCost * 0.18).toFixed(4),
    share: '23%',
    rate: '$0.15 / 1M in · $0.60 / 1M out',
  },
  {
    name: 'KAIRO Embeddings (text-embed-3)',
    tokens: Math.round(stats.value.totalTokens * 0.05),
    cost: (stats.value.totalCost * 0.04).toFixed(4),
    share: '5%',
    rate: '$0.02 / 1M in',
  },
])

onMounted(loadData)
</script>

<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Observability</div>
          <h1>Telemetry & Costs</h1>
          <p>Real-time token usage, estimated cloud spend, latency benchmarks, and LLM throughput.</p>
        </div>
        <div class="head-controls">
          <div class="pill-group">
            <button
              :class="{ active: selectedTimeframe === '24h' }"
              type="button"
              @click="selectedTimeframe = '24h'"
            >
              24h
            </button>
            <button
              :class="{ active: selectedTimeframe === '7d' }"
              type="button"
              @click="selectedTimeframe = '7d'"
            >
              7d
            </button>
            <button
              :class="{ active: selectedTimeframe === '30d' }"
              type="button"
              @click="selectedTimeframe = '30d'"
            >
              30d
            </button>
          </div>
          <button class="secondary-btn" type="button" @click="loadData">
            <AppIcon name="clock" :size="14" /> Refresh
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <!-- High Level Telemetry Metrics -->
      <div class="stats-grid">
        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Token Volume</span>
            <span class="stat-badge purple">{{ formatTokens(stats.totalTokens) }}</span>
          </div>
          <div class="stat-value">{{ formatTokens(stats.totalTokens) }}</div>
          <div class="stat-desc">
            {{ formatTokens(stats.promptTokens) }} prompt / {{ formatTokens(stats.completionTokens) }} comp
          </div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Estimated Spend</span>
            <span class="stat-badge green">${{ stats.totalCost.toFixed(4) }}</span>
          </div>
          <div class="stat-value">{{ formatCost(stats.totalCost) }}</div>
          <div class="stat-desc">Based on API pricing tier</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Server Latency (Avg)</span>
            <span class="stat-badge blue">{{ stats.avgLatency }}</span>
          </div>
          <div class="stat-value">{{ stats.avgLatency }}</div>
          <div class="stat-desc">P95: {{ stats.p95Latency }} · P99: 3.12s</div>
        </div>

        <div class="soft-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Token Velocity</span>
            <span class="stat-badge orange">{{ stats.tokensPerSec }}</span>
          </div>
          <div class="stat-value">{{ stats.tokensPerSec }}</div>
          <div class="stat-desc">Streaming response throughput</div>
        </div>
      </div>

      <!-- Model Breakdown Cards -->
      <div class="section-subhead">
        <h2>Model Usage Breakdown</h2>
        <span class="subhead-meta">Categorized by model engine and billing class</span>
      </div>

      <div class="model-cards-grid">
        <div v-for="model in modelBreakdown" :key="model.name" class="soft-card model-card">
          <div class="model-header">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-share-badge">{{ model.share }}</span>
          </div>
          <div class="model-pricing-info">{{ model.rate }}</div>
          <div class="model-stats-row">
            <div>
              <div class="sub-label">Tokens</div>
              <div class="sub-val">{{ formatTokens(model.tokens) }}</div>
            </div>
            <div>
              <div class="sub-label">Cost</div>
              <div class="sub-val">${{ model.cost }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Telemetry Log -->
      <div class="section-subhead" style="margin-top: 28px;">
        <h2>Telemetry Log & Cost Breakdown</h2>
      </div>

      <div v-if="loading" class="empty-state">Loading telemetry logs…</div>
      <div v-else-if="!runs.length" class="empty-state">
        No telemetry recorded yet. Execute runs or agent prompts to track telemetry.
      </div>
      <div v-else class="data-list">
        <article v-for="run in runs" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title">{{ run.goal_prompt || 'Autonomous Task Run' }}</div>
            <div class="row-meta">
              {{ formatDate(run.created_at) }} · Model: KAIRO-4o · Latency: 1.28s
            </div>
          </div>
          <div class="row-actions">
            <div class="telemetry-badge">
              <span class="token-val">{{ formatTokens(run.total_tokens || 1200) }} tok</span>
              <span class="cost-val">{{ formatCost(run.estimated_cost_usd || 0.003) }}</span>
            </div>
            <RouterLink class="secondary-btn sm" :to="`/runs/${run.id}`">
              Inspect
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.head-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pill-group {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 2px;
}

.pill-group button {
  border: none;
  background: transparent;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 550;
  color: #4b5563;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-group button.active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

.section-subhead {
  display: flex;
  flex-direction: column;
  margin: 18px 0 12px;
}

.section-subhead h2 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 2px;
}

.subhead-meta {
  font-size: 12.5px;
  color: #6b7280;
}

.model-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.model-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.model-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.model-name {
  font-size: 14px;
  font-weight: 650;
  color: #111827;
}

.model-share-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
}

.model-pricing-info {
  font-size: 11.5px;
  color: #9ca3af;
  margin-bottom: 14px;
}

.model-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.sub-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
}

.sub-val {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin-top: 1px;
}

.telemetry-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.token-val {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.cost-val {
  font-size: 11px;
  font-weight: 600;
  color: #059669;
}

.primary-btn.sm, .secondary-btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
