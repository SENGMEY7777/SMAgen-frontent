<template>
  <div class="workflow-antigravity-stream">
    <div class="stream-elapsed-header">{{ getElapsedText(workflow) }}</div>
    <hr class="stream-hairline-divider" />

    <div class="stream-plan-text" v-html="renderMarkdown(getPlanText(workflow))"></div>

    <div v-if="getCurrentWorkingText(workflow)" class="stream-subactivity-text">
      {{ getCurrentWorkingText(workflow) }}
    </div>

    <div v-if="workflow.tasks?.length" class="stream-steps-preview">
      <button type="button" class="stream-steps-toggle" @click="$emit('toggle-stream')">
        <span>{{ workflow.isStreamOpen ? 'Hide steps' : `View ${workflow.tasks.length} steps` }}</span>
        <IconChevronDown :size="12" :class="{ 'rotate-180': workflow.isStreamOpen }" />
      </button>

      <div v-if="workflow.isStreamOpen" class="stream-steps-list">
        <div
          v-for="(step, stepIndex) in getWorkflowSteps(workflow)"
          :key="step.id || stepIndex"
          class="stream-step-item"
          @click="$emit('toggle-step', step.id || stepIndex)"
        >
          <div class="stream-step-row-head">
            <span class="stream-step-icon" :class="step.statusClass">
              <IconLoader2 v-if="step.isRunning" :size="12" class="spin-icon" />
              <IconCheck v-else-if="step.isCompleted" :size="12" />
              <IconX v-else-if="step.isFailed" :size="12" />
              <IconShieldCheck v-else-if="step.isApproval" :size="12" />
              <IconTerminal2 v-else :size="12" />
            </span>
            <span class="stream-step-title">{{ step.label }}</span>
            <span v-if="step.duration" class="stream-step-time">{{ step.duration }}</span>
          </div>
          <div v-if="step.isFailed && step.output" class="stream-step-error-preview">
            {{ step.output }}
          </div>
          <div v-if="isStepExpanded(workflow, step.id || stepIndex)" class="stream-step-details">
            <pre v-if="step.toolInput"><code>{{ step.toolInput }}</code></pre>
            <pre v-if="step.output"><code>{{ step.output }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <WorkflowApprovalPanel
      v-if="workflow.approval"
      :approval="workflow.approval"
      :options="approvalOptions(workflow.approval.assignedTool)"
      :run-id="workflow.runId"
      :message-index="messageIndex"
      :decision-pending="workflow.decisionPending"
      :error="workflow.error"
      :stringify-value="stringifyValue"
      @skip="$emit('skip-approval')"
      @submit="$emit('submit-approval')"
      @update:choice="$emit('update-approval-choice', $event)"
      @update:rejection-reason="$emit('update-approval-rejection', $event)"
    />

    <div v-if="workflow.runId" class="workflow-subtle-footer">
      <button type="button" class="workflow-subtle-run-btn" @click="$emit('open-run', workflow.runId)">
        Open full workflow run <IconArrowRight :size="12" />
      </button>
    </div>

    <div v-if="workflow.error && !workflow.approval" class="workflow-card-error">
      {{ workflow.error }}
    </div>
  </div>
</template>

<script setup>
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconLoader2,
  IconShieldCheck,
  IconTerminal2,
  IconX,
} from '@tabler/icons-vue'
import WorkflowApprovalPanel from '@/components/workflow/WorkflowApprovalPanel.vue'

defineProps({
  workflow: {
    type: Object,
    required: true,
  },
  messageIndex: {
    type: Number,
    default: 0,
  },
  approvalOptions: {
    type: Function,
    required: true,
  },
  getElapsedText: {
    type: Function,
    required: true,
  },
  getPlanText: {
    type: Function,
    required: true,
  },
  getCurrentWorkingText: {
    type: Function,
    required: true,
  },
  getWorkflowSteps: {
    type: Function,
    required: true,
  },
  isStepExpanded: {
    type: Function,
    required: true,
  },
  renderMarkdown: {
    type: Function,
    required: true,
  },
  stringifyValue: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'toggle-stream',
  'toggle-step',
  'skip-approval',
  'submit-approval',
  'update-approval-choice',
  'update-approval-rejection',
  'open-run',
])
</script>

<style scoped>
.workflow-antigravity-stream {
  width: 100%;
  max-width: 760px;
  background: transparent;
  padding: 2px 0 8px;
}

.stream-elapsed-header {
  font-size: 13.5px;
  font-weight: 400;
  color: #71717a;
  letter-spacing: -0.01em;
  margin-bottom: 10px;
}

.stream-hairline-divider {
  border: none;
  border-top: 1px solid #e4e4e7;
  margin: 10px 0 16px;
}

.stream-plan-text {
  font-size: 14.5px;
  line-height: 1.55;
  color: #18181b;
  margin-bottom: 10px;
  word-break: break-word;
}

.stream-plan-text :deep(p) {
  margin: 0;
}

.stream-plan-text :deep(code) {
  background: #f4f4f5;
  color: #18181b;
  padding: 2px 6px;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 500;
}

.stream-subactivity-text {
  font-size: 13.5px;
  font-weight: 400;
  color: #a1a1aa;
  line-height: 1.5;
  margin-top: 6px;
  margin-bottom: 8px;
}

.stream-steps-preview {
  margin-top: 12px;
}

.stream-steps-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #71717a;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  transition: color 0.15s ease;
}

.stream-steps-toggle:hover {
  color: #18181b;
}

.stream-steps-toggle svg {
  transition: transform 0.2s ease;
}

.stream-steps-toggle svg.rotate-180 {
  transform: rotate(180deg);
}

.stream-steps-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-left: 2px solid #f4f4f5;
  padding-left: 10px;
}

.stream-step-item {
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.stream-step-item:hover {
  background: #f4f4f5;
}

.stream-step-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #3f3f46;
}

.stream-step-icon {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #71717a;
}

.stream-step-icon.running { color: #2563eb; }
.stream-step-icon.completed { color: #16a34a; }
.stream-step-icon.failed { color: #dc2626; }
.stream-step-icon.approval { color: #d97706; }

.stream-step-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stream-step-time {
  font-size: 11px;
  color: #a1a1aa;
}

.stream-step-error-preview {
  margin: 4px 0 2px 24px;
  color: #b91c1c;
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.stream-step-details pre {
  margin: 6px 0 2px 24px;
  background: #18181b;
  color: #e4e4e7;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  overflow-x: auto;
}

.workflow-subtle-footer {
  margin-top: 10px;
  padding: 2px 0;
}

.workflow-subtle-run-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}

.workflow-subtle-run-btn:hover {
  color: #18181b;
  text-decoration: underline;
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

.spin-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
