<template>
  <Teleport to="body">
    <Transition name="confirm-dialog">
      <div
        v-if="open"
        class="confirm-dialog-backdrop"
        role="presentation"
        @click.self="$emit('cancel')"
      >
        <section
          class="confirm-dialog-card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <div class="confirm-dialog-icon" aria-hidden="true">
            <IconTrash :size="20" />
          </div>
          <div class="confirm-dialog-content">
            <h2 :id="titleId">{{ title }}</h2>
            <p :id="messageId">{{ message }}</p>
          </div>
          <button class="confirm-dialog-close" type="button" aria-label="Close" @click="$emit('cancel')">
            <IconX :size="17" />
          </button>
          <div class="confirm-dialog-actions">
            <button class="confirm-dialog-cancel" type="button" @click="$emit('cancel')">
              {{ cancelLabel }}
            </button>
            <button class="confirm-dialog-confirm" type="button" @click="$emit('confirm')">
              <IconTrash :size="15" />
              {{ confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { IconTrash, IconX } from '@tabler/icons-vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Delete project?' },
  message: { type: String, default: 'This action cannot be undone.' },
  confirmLabel: { type: String, default: 'Delete Project' },
  cancelLabel: { type: String, default: 'Cancel' },
})

defineEmits(['confirm', 'cancel'])

const titleId = computed(() => `confirm-dialog-title-${props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
const messageId = computed(() => `${titleId.value}-message`)
</script>

<style scoped>
.confirm-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(3px);
}

.confirm-dialog-card {
  position: relative;
  width: min(100%, 420px);
  padding: 26px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.confirm-dialog-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: #fef2f2;
  color: #dc2626;
}

.confirm-dialog-content h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
}

.confirm-dialog-content p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 13.5px;
  line-height: 1.55;
}

.confirm-dialog-close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.confirm-dialog-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.confirm-dialog-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.confirm-dialog-cancel {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.confirm-dialog-cancel:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.confirm-dialog-confirm {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #ffffff;
}

.confirm-dialog-confirm:hover {
  border-color: #b91c1c;
  background: #b91c1c;
}

.confirm-dialog-enter-active,
.confirm-dialog-leave-active {
  transition: opacity 0.16s ease;
}

.confirm-dialog-enter-active .confirm-dialog-card,
.confirm-dialog-leave-active .confirm-dialog-card {
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
  opacity: 0;
}

.confirm-dialog-enter-from .confirm-dialog-card,
.confirm-dialog-leave-to .confirm-dialog-card {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
