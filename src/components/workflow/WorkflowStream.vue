<template>
  <div class="workflow-antigravity-stream">
    <div class="stream-elapsed-header">{{ getElapsedText(workflow) }}</div>
    <hr class="stream-hairline-divider" />

    <div class="stream-plan-text" v-html="renderMarkdown(getPlanText(workflow))"></div>

    <div
      v-if="getCurrentWorkingText(workflow)"
      class="stream-subactivity-text"
      :class="{ 'is-live': isWorkflowLive(workflow) }"
      aria-live="polite"
    >
      <span class="stream-subactivity-indicator" aria-hidden="true"></span>
      <span>{{ getCurrentWorkingText(workflow) }}</span>
      <span v-if="isWorkflowLive(workflow)" class="stream-subactivity-dots" aria-hidden="true">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>

    <section
      v-if="isWorkflowLive(workflow) && getLiveActivities(workflow).length"
      class="stream-live-activity"
      aria-live="polite"
      aria-label="Live workflow activity"
    >
      <div class="stream-live-activity-head">
        <span class="stream-live-indicator active"></span>
        <strong>Live activity</strong>
        <span>{{ getActivityCount(workflow) }} events</span>
      </div>
      <div v-for="activity in getLiveActivities(workflow)" :key="activity.id" class="stream-live-activity-row">
        <span class="stream-activity-status" :class="activity.statusClass"></span>
        <span class="stream-activity-source">{{ activity.source }}</span>
        <span class="stream-activity-message">{{ activity.message }}</span>
        <time v-if="activity.time" class="stream-activity-time">{{ activity.time }}</time>
      </div>
    </section>

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
            <div v-if="step.toolInput" class="stream-code-block">
              <div class="stream-code-header">
                <span>input</span>
              </div>
              <pre class="stream-step-code"><code v-html="highlightCode(step.toolInput)"></code></pre>
            </div>
            <div v-if="step.output" class="stream-code-block">
              <div class="stream-code-header">
                <span>output</span>
              </div>
              <pre class="stream-step-code"><code v-html="highlightCode(step.output)"></code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isWorkflowComplete(workflow) && !workflow.approval" class="workflow-completion-response" aria-live="polite">
      <div class="completion-heading-row">
        <div class="completion-heading-copy">
          <h3>Workflow completed successfully</h3>
          <p>{{ getElapsedText(workflow).replace('Completed in ', '') }} · {{ completedStepCount(workflow) }} of {{ workflow.tasks?.length || 0 }} steps completed.</p>
        </div>
      </div>

      <div v-if="getWorkflowResultItems(workflow).length" class="completion-results">
        <div class="completion-results-heading">Breakdown</div>
        <ul class="completion-result-list">
          <li v-for="result in getWorkflowResultItems(workflow)" :key="result.id" class="completion-result-row">
            <span class="completion-result-icon" aria-hidden="true">•</span>
            <div class="completion-result-copy">
              <strong>{{ result.label }}</strong>
              <span> — {{ result.detail }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="completion-actions" aria-label="Workflow response actions">
        <button type="button" class="completion-action-btn" :title="copied ? 'Copied' : 'Copy response'" @click="copyCompletionResponse(workflow)">
          <component :is="copied ? IconCheck : IconCopy" :size="14" />
          <span>{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>
        <button
          type="button"
          class="completion-action-btn reaction-btn"
          :class="{ active: reaction === 'like' }"
          :aria-pressed="reaction === 'like'"
          title="Like response"
          @click="setReaction('like')"
        >
          <IconThumbUp :size="14" />
          <span>Like</span>
        </button>
        <button
          type="button"
          class="completion-action-btn reaction-btn"
          :class="{ active: reaction === 'unlike' }"
          :aria-pressed="reaction === 'unlike'"
          title="Unlike response"
          @click="setReaction('unlike')"
        >
          <IconThumbDown :size="14" />
          <span>Unlike</span>
        </button>
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
import { ref } from 'vue'
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconLoader2,
  IconShieldCheck,
  IconTerminal2,
  IconThumbDown,
  IconThumbUp,
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

const isWorkflowComplete = (workflow) => ['COMPLETED', 'SUCCESS'].includes(String(workflow?.status || '').toUpperCase())

const isWorkflowLive = (workflow) => ['STARTING', 'PENDING', 'RUNNING', 'AWAITING_APPROVAL'].includes(String(workflow?.status || '').toUpperCase())

const copied = ref(false)
const reaction = ref(null)

const getRawActivities = (workflow) => {
  const sources = [workflow?.logs, workflow?.activity_logs, workflow?.activityLogs, workflow?.events, workflow?.telemetry]
  for (const source of sources) {
    if (Array.isArray(source) && source.length) return source
    if (Array.isArray(source?.items) && source.items.length) return source.items
    if (Array.isArray(source?.data) && source.data.length) return source.data
  }
  return []
}

const formatActivityName = (value) => String(value || 'Activity')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatActivityMessage = (activity) => {
  const eventName = activity?.event || activity?.event_name || activity?.eventName || activity?.type || activity?.kind
  const payload = activity?.payload ?? activity?.details
  const message = activity?.message || activity?.description
  if (typeof message === 'string' && message.trim() && message !== eventName) return message
  if (typeof payload === 'object') {
    const payloadMessage = payload.message || payload.error || payload.reason || payload.status
    if (payloadMessage) return `${formatActivityName(eventName)}: ${typeof payloadMessage === 'string' ? payloadMessage : JSON.stringify(payloadMessage)}`
  }
  if (message && typeof message !== 'object') return String(message)
  return formatActivityName(eventName)
}

const getLiveActivities = (workflow) => getRawActivities(workflow)
  .map((activity, index) => {
    const eventName = activity?.event || activity?.event_name || activity?.eventName || activity?.type || activity?.kind || ''
    const eventText = typeof eventName === 'string' ? eventName : ''
    const rawLevel = String(activity?.level || activity?.severity || '').toLowerCase()
    const searchable = `${eventText} ${activity?.message || ''}`.toLowerCase()
    const statusClass = rawLevel === 'error' || /failed|error|exception/.test(searchable)
      ? 'error'
      : (rawLevel === 'warn' || /approval|awaiting|warning/.test(searchable) ? 'warning' : 'success')
    const timestamp = activity?.created_at || activity?.createdAt || activity?.timestamp || activity?.occurred_at || activity?.time
    let time = ''
    if (timestamp) {
      const date = new Date(timestamp)
      if (!Number.isNaN(date.getTime())) {
        time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      }
    }
    return {
      id: activity?.id || activity?.log_id || activity?.logId || `${eventName || 'activity'}-${index}`,
      source: activity?.source || activity?.service || activity?.component || eventText.split('_')[0]?.toUpperCase() || 'SYSTEM',
      message: formatActivityMessage(activity),
      statusClass,
      time,
      timestamp: timestamp ? new Date(timestamp).getTime() : index,
    }
  })
  .sort((left, right) => left.timestamp - right.timestamp)
  .slice(-5)
  .reverse()

const getActivityCount = (workflow) => getRawActivities(workflow).length

const completedStepCount = (workflow) => (workflow?.tasks || []).filter((task) => {
  return ['COMPLETED', 'SUCCESS'].includes(String(task?.status || task?.task_status || task?.state || '').toUpperCase())
}).length

const parseValue = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const findResultPaths = (value, paths = []) => {
  if (!value || paths.length >= 3) return paths
  if (Array.isArray(value)) {
    value.forEach((item) => findResultPaths(item, paths))
    return paths
  }
  if (typeof value !== 'object') return paths

  for (const key of ['path', 'file_path', 'filePath', 'location', 'folder', 'directory']) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim() && !paths.includes(candidate)) paths.push(candidate)
  }

  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') findResultPaths(child, paths)
  })
  return paths
}

const isImageResultTask = (task) => {
  const tool = String(task?.assigned_tool || task?.assignedTool || '').toLowerCase()
  const title = `${task?.title || ''} ${task?.instruction || ''}`
  return tool === 'imagegenerator' || /\b(?:generate|create)\b[\s\w-]{0,40}\b(?:image|images|photo|photos|picture|pictures)\b/i.test(title)
}

const getWorkflowResultItems = (workflow) => {
  const completedTasks = (workflow?.tasks || [])
    .filter((task) => ['COMPLETED', 'SUCCESS'].includes(String(task?.status || task?.task_status || task?.state || '').toUpperCase()))
  const imageTasks = completedTasks.filter(isImageResultTask)
  const visibleTasks = completedTasks.filter((task) => !isImageResultTask(task))
  const items = visibleTasks.map((task, index) => {
    const output = parseValue(
      task.tool_output
        || task.toolOutput
        || task.output_data
        || task.outputData
        || task.output_payload
        || task.outputPayload
        || task.result
        || task.output,
    )
    const paths = findResultPaths(output).filter((path) => path !== 'local Desktop')
    return {
      id: task.id || `result-${index}`,
      label: task.title || task.instruction || `Step ${index + 1}`,
      detail: paths.length ? paths.join(' · ') : 'Completed successfully',
    }
  })

  if (imageTasks.length) {
    items.push({
      id: 'generated-images',
      label: `Generated ${imageTasks.length} image${imageTasks.length === 1 ? '' : 's'}`,
      detail: 'Dynamic image URLs generated and resolved',
    })
  }

  return items
}

const getCompletionDuration = (workflow) => {
  if (workflow?.finalSeconds) return `${workflow.finalSeconds}s`
  const started = workflow?.startedAt || (workflow?.createdAt ? new Date(workflow.createdAt).getTime() : null)
  const completed = workflow?.completedAt ? new Date(workflow.completedAt).getTime() : Date.now()
  return started ? `${Math.max(1, Math.round((completed - started) / 1000))}s` : 'a few seconds'
}

const getWorkflowResponseText = (workflow) => {
  const results = getWorkflowResultItems(workflow)
  return [
    `Workflow completed successfully in ${getCompletionDuration(workflow)}.`,
    `${completedStepCount(workflow)} of ${(workflow?.tasks || []).length} steps completed.`,
    results.length ? 'Results:' : '',
    ...results.map((result) => `- ${result.label} — ${result.detail}`),
  ].filter(Boolean).join('\n')
}

const copyCompletionResponse = async (workflow) => {
  const text = getWorkflowResponseText(workflow)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1800)
  } catch {
    copied.value = false
  }
}

const setReaction = (nextReaction) => {
  reaction.value = reaction.value === nextReaction ? null : nextReaction
}

const escapeCodeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightCode = (value) => {
  const source = String(value ?? '')
  let html = ''
  let index = 0

  while (index < source.length) {
    const character = source[index]

    const commentMatch = source.slice(index).match(/^(?:\/\/|#|--\s)[^\n]*/)
    if (commentMatch) {
      html += `<span class="stream-code-comment">${escapeCodeHtml(commentMatch[0])}</span>`
      index += commentMatch[0].length
      continue
    }

    if (character === '"' || character === "'") {
      const quote = character
      let end = index + 1

      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2
          continue
        }
        if (source[end] === quote) {
          end += 1
          break
        }
        end += 1
      }

      const token = source.slice(index, end)
      const tokenClass = /^\s*:/.test(source.slice(end))
        ? 'stream-code-key'
        : 'stream-code-string'
      html += `<span class="${tokenClass}">${escapeCodeHtml(token)}</span>`
      index = end
      continue
    }

    const keywordMatch = source.slice(index).match(/^(?:SELECT|FROM|WHERE|CREATE|TABLE|DROP|ALTER|INSERT|INTO|VALUES|UPDATE|DELETE|JOIN|ON|ORDER|BY|GROUP|LIMIT|PRIMARY|KEY|CONSTRAINT|UNIQUE|NOT|NULL|DEFAULT|IF|EXISTS|EXTENSION|AS|AND|OR)\b/i)
    if (keywordMatch) {
      html += `<span class="stream-code-keyword">${escapeCodeHtml(keywordMatch[0])}</span>`
      index += keywordMatch[0].length
      continue
    }

    const numberMatch = source.slice(index).match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)
    if (numberMatch) {
      html += `<span class="stream-code-number">${escapeCodeHtml(numberMatch[0])}</span>`
      index += numberMatch[0].length
      continue
    }

    const literalMatch = source.slice(index).match(/^(?:true|false|null|undefined)\b/)
    if (literalMatch) {
      html += `<span class="stream-code-literal">${literalMatch[0]}</span>`
      index += literalMatch[0].length
      continue
    }

    if ('{}[],:'.includes(character)) {
      html += `<span class="stream-code-punctuation">${character}</span>`
      index += 1
      continue
    }

    html += escapeCodeHtml(character)
    index += 1
  }

  return html
}
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
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 400;
  color: #a1a1aa;
  line-height: 1.5;
  margin-top: 6px;
  margin-bottom: 8px;
  animation: subactivity-enter 320ms ease-out both;
  transition: color 180ms ease, opacity 180ms ease;
}

.stream-subactivity-text.is-live {
  color: #8f8f99;
}

.stream-subactivity-indicator {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #a1a1aa;
}

.stream-subactivity-text.is-live .stream-subactivity-indicator {
  background: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
  animation: subactivity-pulse 1.5s ease-in-out infinite;
}

.stream-subactivity-dots {
  display: inline-flex;
  min-width: 14px;
  color: #71717a;
  letter-spacing: 1px;
}

.stream-subactivity-dots span {
  animation: subactivity-dot 1.2s ease-in-out infinite;
}

.stream-subactivity-dots span:nth-child(2) {
  animation-delay: 160ms;
}

.stream-subactivity-dots span:nth-child(3) {
  animation-delay: 320ms;
}

@keyframes subactivity-enter {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes subactivity-pulse {
  0%, 100% {
    opacity: 0.55;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes subactivity-dot {
  0%, 60%, 100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-subactivity-text,
  .stream-subactivity-text.is-live .stream-subactivity-indicator,
  .stream-subactivity-dots span {
    animation: none;
  }
}

.stream-live-activity {
  margin: 12px 0 4px;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #f8fbff;
}

.stream-live-activity.completed {
  border-color: #dcfce7;
  background: #fbfffc;
}

.stream-live-activity-head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #334155;
  font-size: 11px;
  margin-bottom: 7px;
}

.stream-live-activity-head strong {
  font-size: 11.5px;
}

.stream-live-activity-head > span:last-child {
  margin-left: auto;
  color: #94a3b8;
}

.stream-live-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}

.stream-live-indicator.active {
  background: #2563eb;
  box-shadow: 0 0 0 3px #dbeafe;
  animation: live-pulse 1.4s ease-in-out infinite;
}

.stream-live-activity-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 5px 0;
  border-top: 1px solid #eef2f7;
  color: #475569;
  font-size: 11.5px;
}

.stream-activity-status {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #22c55e;
}

.stream-activity-status.warning { background: #f59e0b; }
.stream-activity-status.error { background: #ef4444; }

.stream-activity-source {
  flex: 0 0 auto;
  min-width: 66px;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stream-activity-message {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-activity-time {
  flex: 0 0 auto;
  margin-left: auto;
  color: #94a3b8;
  font-size: 10px;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
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

.stream-step-details {
  margin: 6px 0 2px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stream-code-block {
  overflow: hidden;
  background: #111216;
  color: #f8fafc;
  border: 1px solid #232530;
  border-radius: 9px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}

.stream-code-header {
  display: flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 11px;
  background: #181920;
  color: #cbd5e1;
  border-bottom: 1px solid #232530;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

.stream-step-details pre.stream-step-code {
  margin: 0;
  background: #111216;
  color: #e2e8f0;
  border: none;
  padding: 11px 12px;
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.stream-step-code code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.stream-step-code :deep(.stream-code-key) {
  color: #38bdf8;
  font-weight: 600;
}

.stream-step-code :deep(.stream-code-string) {
  color: #4ade80;
}

.stream-step-code :deep(.stream-code-number) {
  color: #f472b6;
}

.stream-step-code :deep(.stream-code-literal) {
  color: #818cf8;
  font-weight: 600;
}

.stream-step-code :deep(.stream-code-punctuation) {
  color: #cbd5e1;
}

.stream-step-code :deep(.stream-code-comment) {
  color: #64748b;
  font-style: italic;
}

.stream-step-code :deep(.stream-code-keyword) {
  color: #818cf8;
  font-weight: 600;
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

.workflow-completion-response {
  margin: 16px 0 4px;
  padding: 0;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.5;
}

.completion-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.completion-heading-copy {
  min-width: 0;
}

.completion-heading-copy h3 {
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 700;
}

.completion-heading-copy p {
  margin: 3px 0 0;
  color: #374151;
  font-size: 12px;
}

.completion-results {
  margin-top: 12px;
}

.completion-results-heading {
  margin-bottom: 5px;
  color: #111827;
  font-size: 12px;
  font-weight: 700;
}

.completion-result-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.completion-result-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 3px 0;
}

.completion-result-icon {
  width: 10px;
  flex: 0 0 auto;
  margin-top: 0;
  color: #111827;
  font-size: 16px;
  line-height: 1.4;
}

.completion-result-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.completion-result-copy strong {
  color: #111827;
  font-size: 13px;
  font-weight: 650;
}

.completion-result-copy span {
  color: #374151;
  font-size: 13px;
}

.completion-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
}

.completion-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.completion-action-btn:hover,
.completion-action-btn.active {
  border-color: #bbf7d0;
  color: #15803d;
  background: #f0fdf4;
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
