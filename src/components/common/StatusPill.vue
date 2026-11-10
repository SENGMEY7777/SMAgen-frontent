<template>
  <span class="status-pill" :class="statusClass">
    <component :is="statusIcon" :size="14" aria-hidden="true" />
    <span class="status-text">{{ displayLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import {
  IconCircleCheck,
  IconCircleDot,
  IconCirclePlus,
  IconCircleX,
  IconClock,
  IconLoader2,
} from '@tabler/icons-vue'

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
})

const displayLabel = computed(() => {
  if (props.label) return props.label
  if (!props.status) return '—'
  return props.status.replace(/_/g, ' ')
})

const statusClass = computed(() => {
  return String(props.status || '').toLowerCase()
})

const statusIcon = computed(() => {
  const status = String(props.status || '').toLowerCase()

  if (status === 'created') return IconCirclePlus
  if (['running', 'in_progress'].includes(status)) return IconLoader2
  if (['queued', 'pending', 'awaiting_approval'].includes(status)) return IconClock
  if (['completed', 'success', 'approved'].includes(status)) return IconCircleCheck
  if (['failed', 'rejected'].includes(status)) return IconCircleX
  return IconCircleDot
})
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.3;
  color: #4b5563;
  background: #f3f4f6;
  border-color: #e5e7eb;
  transition: all 0.15s ease;
}

.status-pill :deep(svg) {
  flex: 0 0 auto;
}

/* FAILED / REJECTED / ERROR */
.status-pill.failed,
.status-pill.rejected,
.status-pill.error {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

/* COMPLETED / SUCCESS / APPROVED */
.status-pill.completed,
.status-pill.success,
.status-pill.approved {
  color: #16a34a;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

/* RUNNING / IN PROGRESS */
.status-pill.running,
.status-pill.in_progress {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.status-pill.running :deep(svg),
.status-pill.in_progress :deep(svg) {
  animation: status-spin 1.2s linear infinite;
}

/* QUEUED / PENDING */
.status-pill.queued,
.status-pill.pending {
  color: #d97706;
  background: #fffbeb;
  border-color: #fde68a;
}

/* AWAITING APPROVAL */
.status-pill.awaiting_approval {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
}

/* CANCELLED / CREATED */
.status-pill.cancelled,
.status-pill.created {
  color: #4b5563;
  background: #f3f4f6;
  border-color: #e5e7eb;
}

@keyframes status-spin {
  to { transform: rotate(360deg); }
}
</style>
