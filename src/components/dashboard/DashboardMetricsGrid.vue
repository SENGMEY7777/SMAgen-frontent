<template>
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
</template>

<script setup>
import { formatCost, formatTokens } from '@/utils/formatters'

defineProps({
  metrics: {
    type: Object,
    required: true,
  },
})
</script>

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
</style>
