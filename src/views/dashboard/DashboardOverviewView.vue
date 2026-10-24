<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Overview</div>
          <h1>Dashboard &amp; Metrics</h1>
          <p>Overall system performance, active autonomous tasks, and operational costs.</p>
        </div>
        <div class="head-actions">
          <div class="live-pill" title="Real-time WebSocket &amp; background polling active">
            <span class="live-pulse"></span>
            <span>Live Data</span>
          </div>
          <button class="secondary-btn" type="button" :disabled="isRefreshing" @click="manualRefresh">
            <IconRefresh :size="14" :class="{ 'spin-icon': isRefreshing }" /> Refresh
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <DashboardMetricsGrid :metrics="metrics" />
      <DashboardQuickActions :metrics="metrics" :chat-sessions-count="chatSessionsCount" />
      <DashboardRunsTable :runs="runs" :loading="loading" />
    </section>
  </DashboardLayout>
</template>

<script setup>
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import DashboardMetricsGrid from '@/components/dashboard/DashboardMetricsGrid.vue'
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions.vue'
import DashboardRunsTable from '@/components/dashboard/DashboardRunsTable.vue'
import { IconRefresh } from '@tabler/icons-vue'
import { useDashboardOverview } from '@/composables/useDashboardOverview'

const {
  runs,
  loading,
  isRefreshing,
  errorMessage,
  chatSessionsCount,
  metrics,
  manualRefresh,
} = useDashboardOverview()
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
