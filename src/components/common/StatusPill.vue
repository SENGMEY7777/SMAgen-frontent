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
  gap: 4px;
  color: #4b5563;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-pill :deep(svg) {
  flex: 0 0 auto;
}

.status-pill.running :deep(svg) {
  animation: status-spin 1.2s linear infinite;
}

@keyframes status-spin {
  to { transform: rotate(360deg); }
}
</style>
