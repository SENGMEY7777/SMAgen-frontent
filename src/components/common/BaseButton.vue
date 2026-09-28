<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'pill'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  icon: { type: String, default: '' },
  iconSize: { type: [Number, String], default: 14 },
})

defineEmits(['click'])
</script>

<template>
  <button :type="type" class="base-btn" :class="[`btn-${variant}`, `btn-${size}`, { 'is-loading': loading }]"
    :disabled="disabled || loading" @click="$emit('click', $event)">
    <AppIcon v-if="loading" name="clock" :size="iconSize" class="btn-spinner" />
    <AppIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <slot />
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.base-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.btn-sm {
  min-height: 30px;
  padding: 0 10px;
  font-size: 11.5px;
}

.btn-md {
  min-height: 38px;
  padding: 0 14px;
  font-size: 12.5px;
}

.btn-lg {
  min-height: 44px;
  padding: 0 20px;
  font-size: 14px;
}

/* Variants */
.btn-primary {
  color: #ffffff;
  background: #111827;
}

.btn-primary:not(:disabled):hover {
  background: #1f2937;
}

.btn-secondary {
  border: 1px solid #e5e7eb;
  color: #374151;
  background: #ffffff;
}

.btn-secondary:not(:disabled):hover {
  border-color: #c7d2fe;
  color: #4f46e5;
  background: #f5f7ff;
}

.btn-danger {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fee2e2;
}

.btn-danger:not(:disabled):hover {
  background: #fee2e2;
}

.btn-ghost {
  color: #6b7280;
  background: transparent;
}

.btn-ghost:not(:disabled):hover {
  background: #f3f4f6;
  color: #111827;
}

.btn-pill {
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #6b7280;
}

.btn-pill:not(:disabled):hover {
  border-color: #c7d2fe;
  color: #4f46e5;
  background: #f5f7ff;
}

.btn-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
