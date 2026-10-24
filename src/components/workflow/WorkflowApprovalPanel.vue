<template>
  <div
    class="workflow-approval-panel"
    role="region"
    :aria-label="approval.taskTitle || 'Approval required before this step can continue.'"
  >
    <div class="workflow-approval-meta">
      <IconShieldCheck :size="15" />
      <span class="workflow-approval-meta-title">
        {{ approval.taskTitle || 'Approval required before this step can continue.' }}
      </span>
    </div>

    <div class="workflow-command-box">
      <span class="workflow-command-label">{{ approval.assignedTool || 'workflow action' }}</span>
      <code>{{ stringifyValue(approval.actionSummary || approval.toolInput, 'Approval required for this action.') }}</code>
    </div>

    <div class="workflow-choice-list" role="radiogroup" aria-label="Workflow approval choice">
      <label
        v-for="option in options"
        :key="option.value"
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
        <span>{{ option.label }}</span>
      </label>
    </div>

    <textarea
      v-if="approval.choice === 'reject'"
      class="workflow-rejection-input"
      rows="2"
      :value="approval.rejectionReason"
      placeholder="Tell SMAgen what to do instead…"
      @input="$emit('update:rejectionReason', $event.target.value)"
    ></textarea>

    <div v-if="error" class="workflow-card-error">{{ error }}</div>
    <div class="workflow-approval-actions" role="group" aria-label="Approval actions">
      <button class="workflow-skip-btn" type="button" :disabled="decisionPending" @click="$emit('skip')">
        Skip
      </button>
      <button class="workflow-submit-btn" type="button" :disabled="decisionPending" @click="$emit('submit')">
        <IconCheck v-if="!decisionPending" :size="15" />
        <span>{{ decisionPending ? 'Submitting…' : 'Submit' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { IconCheck, IconShieldCheck } from '@tabler/icons-vue'

defineProps({
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

defineEmits(['skip', 'submit', 'update:choice', 'update:rejectionReason'])
</script>

<style scoped>
.workflow-approval-panel {
  width: 100%;
  margin: 18px 0 16px;
  padding: 18px;
  border: 1px solid #dbe3ec;
  border-radius: 16px;
  background: #ffffff;
  color: #172033;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.07);
}

.workflow-approval-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #172033;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 600;
}

.workflow-approval-meta svg {
  flex: 0 0 auto;
  color: #2563eb;
}

.workflow-approval-meta-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.workflow-command-box {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 13px 14px;
  border: 1px solid #e5eaf0;
  border-radius: 11px;
  background: #f8fafc;
}

.workflow-command-label {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workflow-command-box code {
  display: block;
  max-height: 150px;
  overflow: auto;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.workflow-choice-list {
  display: grid;
  gap: 7px;
  margin-top: 16px;
}

.workflow-choice {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 9px 11px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  color: #334155;
  font-size: 13.5px;
  line-height: 1.35;
  cursor: pointer;
  background: #ffffff;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
}

.workflow-choice:hover,
.workflow-choice.selected {
  border-color: #93c5fd;
  color: #172033;
  background: #eff6ff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
}

.workflow-choice input {
  width: 17px;
  height: 17px;
  margin: 0;
  flex: 0 0 auto;
  accent-color: #2563eb;
}

.workflow-choice-number {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  color: #475569;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 700;
}

.workflow-choice.selected .workflow-choice-number {
  color: #1d4ed8;
  background: #dbeafe;
}

.workflow-choice input:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.25);
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
  font-size: 13px;
  outline: none;
}

.workflow-rejection-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.workflow-approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.workflow-skip-btn {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid #d5dce5;
  border-radius: 9px;
  background: #ffffff;
  color: #526174;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.workflow-skip-btn:hover {
  border-color: #94a3b8;
  color: #1e293b;
  background: #f8fafc;
}

.workflow-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 17px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: #0b84d8;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(11, 132, 216, 0.2);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.workflow-submit-btn:hover {
  background: #076eb8;
  box-shadow: 0 6px 14px rgba(11, 132, 216, 0.25);
  transform: translateY(-1px);
}

.workflow-submit-btn:focus-visible,
.workflow-skip-btn:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.22);
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
  font-size: 12px;
}

@media (max-width: 560px) {
  .workflow-approval-panel {
    margin-top: 14px;
    padding: 14px;
    border-radius: 14px;
  }

  .workflow-approval-meta {
    font-size: 14px;
  }

  .workflow-choice {
    align-items: flex-start;
    min-height: 0;
    padding: 10px;
  }

  .workflow-choice input {
    margin-top: 2px;
  }

  .workflow-approval-actions {
    justify-content: stretch;
  }

  .workflow-skip-btn,
  .workflow-submit-btn {
    flex: 1;
  }
}
</style>
