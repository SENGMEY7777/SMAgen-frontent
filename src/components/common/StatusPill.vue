<script setup>
import { computed } from 'vue'

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
</script>

<template>
  <span class="status-pill" :class="statusClass">
    <span class="status-dot"></span>
    <span class="status-text">{{ displayLabel }}</span>
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #4b5563;
  background: #f3f4f6;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill.running, .status-pill.queued { color: #4338ca; background: #eef2ff; }
.status-pill.completed, .status-pill.success, .status-pill.approved { color: #065f46; background: #d1fae5; }
.status-pill.failed, .status-pill.rejected { color: #991b1b; background: #fee2e2; }
.status-pill.awaiting_approval, .status-pill.pending { color: #92400e; background: #fef3c7; }
</style>
