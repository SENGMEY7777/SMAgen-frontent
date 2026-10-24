<template>
  <div class="modules-grid">
    <article class="soft-card module-card">
      <div class="module-icon">
        <IconMessageCircle2 :size="18" />
      </div>
      <div class="module-info">
        <div class="module-title-row">
          <h3>AI Chat &amp; Agent</h3>
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
          <span class="module-counter" :class="metrics.pendingApprovals > 0 ? 'orange' : 'green'">
            {{ metrics.pendingApprovals > 0 ? `${metrics.pendingApprovals} Pending` : 'All Clear' }}
          </span>
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
</template>

<script setup>
import { RouterLink } from 'vue-router'
import {
  IconMessageCircle2,
  IconGitFork,
  IconShieldCheck,
  IconTool,
} from '@tabler/icons-vue'

defineProps({
  metrics: {
    type: Object,
    required: true,
  },
  chatSessionsCount: {
    type: Number,
    default: 0,
  },
})
</script>

<style scoped>
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
</style>
