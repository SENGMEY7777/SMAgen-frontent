<template>
  <div class="dashboard-runs-table">
    <div class="section-subhead">
      <div class="subhead-left">
        <h2>Active &amp; Recent Tasks</h2>
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
          <div class="row-title" :title="run.goal_prompt || run.goalPrompt">{{ run.goal_prompt || run.goalPrompt }}</div>
          <div class="row-meta">
            {{ formatDate(run.created_at || run.createdAt) }} · {{ formatTokens(run.total_tokens || run.totalTokens) }} tokens · {{ formatCost(run.estimated_cost_usd || run.estimatedCostUsd) }}
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
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { IconArrowRight } from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { formatCost, formatDate, formatTokens } from '@/utils/formatters'

defineProps({
  runs: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
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

@media (max-width: 560px) {
  .section-subhead {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
