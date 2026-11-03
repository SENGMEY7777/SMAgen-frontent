<template>
  <div
    class="workflow-approval-panel"
    role="region"
    :aria-label="approval.taskTitle || 'Approval required before this step can continue.'"
  >
    <div class="workflow-approval-meta">
      <IconTerminal2 :size="18" />
      <span class="workflow-approval-meta-title">
        {{ approval.taskTitle || 'Approval required before this step can continue.' }}
      </span>
    </div>

    <div class="workflow-command-box">
      <span
        class="workflow-command-label"
        :class="{ 'is-file-manager': approval.assignedTool === 'fileManager' }"
      >
        {{ approval.assignedTool || 'workflow action' }}
      </span>
      <code v-html="highlightedCommand"></code>
    </div>

    <div class="workflow-choice-list" role="radiogroup" aria-label="Workflow approval choice">
      <div
        v-for="(option, index) in options"
        :key="option.value"
        class="workflow-choice-row"
        :class="{ 'has-actions': String(option.number) === '5' || option.value === 'reject' || index === options.length - 1 }"
      >
        <label
          class="workflow-choice"
          :class="{ selected: approval.choice === option.value }"
        >
          <input
            type="radio"
            :name="`workflow-approval-${runId}-${messageIndex}`"
            :value="option.value"
            :checked="approval.choice === option.value"
            @change="$emit('update:choice', option.value)"
          />
          <span class="workflow-choice-number">{{ option.number }}</span>
          <span class="workflow-choice-text">{{ option.label }}</span>
        </label>

        <!-- Feature buttons placed directly on Row Option 5 -->
        <div
          v-if="String(option.number) === '5' || option.value === 'reject' || index === options.length - 1"
          class="workflow-approval-actions"
          role="group"
          aria-label="Approval actions"
        >
          <button class="workflow-skip-btn" type="button" :disabled="decisionPending" @click="$emit('skip')">
            Skip
          </button>
          <button class="workflow-submit-btn" type="button" :disabled="decisionPending" @click="$emit('submit')">
            <span>{{ decisionPending ? 'Submitting…' : 'Submit' }}</span>
            <IconCornerDownLeft :size="13" />
          </button>
        </div>
      </div>
    </div>

    <textarea
      v-if="approval.choice === 'reject'"
      class="workflow-rejection-input"
      rows="2"
      :value="approval.rejectionReason"
      placeholder="Tell KAIRO what to do instead…"
      @input="$emit('update:rejectionReason', $event.target.value)"
    ></textarea>

    <div v-if="error" class="workflow-card-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IconTerminal2, IconCornerDownLeft } from '@tabler/icons-vue'
import { highlightCode } from '@/utils/markdown'

const props = defineProps({
  approval: {
    type: Object,
    required: true,
  },
  options: {
    type: Array,
    default: () => [],
  },
  runId: {
    type: [String, Number],
    default: '',
  },
  messageIndex: {
    type: [String, Number],
    default: 0,
  },
  decisionPending: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  stringifyValue: {
    type: Function,
    required: true,
  },
})

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightedCommand = computed(() => {
  const command = props.stringifyValue(
    props.approval.actionSummary || props.approval.toolInput,
    'Approval required for this action.',
  )

  if (/^\s*[\[{]/.test(command)) {
    return highlightCode(command, 'json')
  }

  const commandParts = command.match(/^(\s*)(\S+)(\s+)([^:\s]+:)(\s*)([\s\S]*)$/)
  if (!commandParts) {
    return highlightCode(command, 'javascript')
  }

  const [, leadingSpace, tool, spacing, key, valueSpacing, value] = commandParts
  return `${escapeHtml(leadingSpace)}<span class="hl-fn">${escapeHtml(tool)}</span>${escapeHtml(spacing)}<span class="hl-keyword">${escapeHtml(key)}</span>${escapeHtml(valueSpacing)}<span class="hl-string">${escapeHtml(value)}</span>`
})

defineEmits(['skip', 'submit', 'update:choice', 'update:rejectionReason'])
</script>

<style scoped>
.workflow-approval-panel {
  order: -1;
  width: min(760px, 100%);
  max-width: min(760px, 100%);
  box-sizing: border-box;
  max-height: min(520px, calc(100dvh - 190px));
  overflow-y: auto;
  margin: 0 0 12px;
  padding: clamp(18px, 1.5vw, 26px);
  border: 1px solid #e2e4e8;
  border-radius: 15px;
  background: #ffffff;
  color: #202124;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  scrollbar-width: none;
}

.workflow-approval-panel::-webkit-scrollbar {
  display: none;
}

.workflow-approval-meta {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 15px);
  color: #202124;
  font-size: 22px;
  line-height: 0.5;
  font-weight: 650;
}

.workflow-approval-meta svg {
  width: clamp(18px, 1.5vw, 24px);
  height: clamp(18px, 1.5vw, 24px);
  flex: 0 0 auto;
  color: #5f6368;
}

.workflow-approval-meta-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.workflow-command-box {
  display: grid;
  gap: clamp(4px, 0.4vw, 7px);
  margin-top: clamp(14px, 1.2vw, 20px);
  padding: clamp(12px, 1vw, 17px) clamp(14px, 1.2vw, 20px);
  border: 1px solid #eceef1;
  border-radius: clamp(12px, 1.1vw, 18px);
  background: #f5f6f7;
}

.workflow-command-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #000000;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workflow-command-label.is-file-manager {
  color: #0284c7;
}

.workflow-command-label.is-file-manager::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0284c7;
}

.workflow-command-box code {
  display: block;
  max-height: 180px;
  overflow: auto;
  color: #000000;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 18px;
  line-height: 1.35;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.workflow-command-box :deep(.hl-comment) {
  color: #64748b;
  font-style: italic;
}

.workflow-command-box :deep(.hl-string) {
  color: #65a30d;
}

.workflow-command-box :deep(.hl-keyword) {
  color: #db2777;
  font-weight: 600;
}

.workflow-command-box :deep(.hl-number) {
  color: #f472b6;
}

.workflow-command-box :deep(.hl-fn) {
  color: #0891b2;
  font-weight: 600;
}

.workflow-command-box :deep(.hl-flag),
.workflow-command-box :deep(.hl-option) {
  color: #7c3aed;
}

.workflow-choice-list {
  display: grid;
  gap: 4px;
  margin-top: clamp(12px, 1.1vw, 18px);
}

.workflow-choice-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  width: 100%;
}

.workflow-choice {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 42px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #383b40;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.workflow-choice:hover {
  border-color: #e2e4e8;
  background: #f4f5f7;
  color: #18181b;
}

.workflow-choice:hover .workflow-choice-number {
  background: #e2e4e7;
  color: #18181b;
}

.workflow-choice.selected {
  border-color: #dedfe2;
  color: #18181b;
  background: #f0f1f2;
}

.workflow-choice.selected .workflow-choice-number {
  color: #18181b;
  background: #dedfe2;
}

.workflow-choice input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.workflow-choice-number {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: #52565c;
  background: #eceef0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}

.workflow-choice-text {
  display: inline-flex;
  align-items: center;
  font-size: 15px;
  line-height: 1;
}

.workflow-choice:has(input:focus-visible) {
  outline: 3px solid rgba(37, 99, 235, 0.3);
  outline-offset: 2px;
}

.workflow-rejection-input {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  outline: none;
}

.workflow-rejection-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.workflow-choice-row.has-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workflow-approval-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 8px;
  margin-left: auto;
}

.workflow-skip-btn {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #71717a;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.workflow-skip-btn:hover {
  border-color: #e4e4e7;
  color: #18181b;
  background: #f4f4f5;
}

.workflow-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #09090b;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.workflow-submit-btn:hover {
  background: #27272a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transform: translateY(-1px);
}

.workflow-submit-btn:focus-visible,
.workflow-skip-btn:focus-visible {
  outline: 3px solid rgba(0, 0, 0, 0.22);
  outline-offset: 2px;
}

.workflow-submit-btn:disabled,
.workflow-skip-btn:disabled {
  cursor: wait;
  opacity: 0.6;
}

.workflow-card-error {
  margin-top: 8px;
  padding: 7px 10px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

@media (max-width: 560px) {
  .workflow-approval-panel {
    width: 100%;
    max-height: min(560px, calc(100dvh - 160px));
    margin-top: 14px;
    padding: 14px;
    border-radius: 14px;
  }

  .workflow-choice {
    align-items: flex-start;
    min-height: 0;
    padding: 10px;
  }

  .workflow-choice input {
    margin-top: 2px;
  }

  .workflow-choice-row {
    flex-wrap: wrap;
  }

  .workflow-approval-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .workflow-skip-btn,
  .workflow-submit-btn {
    min-height: 40px;
  }
}
</style>
