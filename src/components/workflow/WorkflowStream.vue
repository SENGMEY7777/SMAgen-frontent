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
          <h3>Done — workflow completed successfully.</h3>
          <p>{{ completedStepCount(workflow) }} of {{ workflow.tasks?.length || 0 }} steps completed.</p>
        </div>
      </div>

      <div v-if="completionChanges.length" class="completion-results">
        <div class="completion-results-heading"><span class="change-style">Changes:</span></div>
        <ul class="completion-result-list">
          <li v-for="result in completionChanges" :key="result.id" class="completion-result-row">
            <div class="completion-result-copy">
              <span class="completion-result-label">{{ result.label }}</span>
              <span v-if="result.detail"> — {{ result.detail }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="editedFiles.length" class="completion-results completion-file-results">
        <div class="completion-results-heading"><span class="change-style">Updated:</span></div>
        <ul class="completion-result-list">
          <li v-for="file in editedFiles" :key="`summary-${file.id}`" class="completion-result-row">
            <div class="completion-result-copy">
              <button
                type="button"
                class="completion-file-link"
                :aria-label="`Review ${file.path}`"
                @click="openReview(workflow, file)"
              >
                {{ file.path }}
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="editedFiles.length" class="completion-edit-card" aria-label="Updated files">
        <div class="completion-edit-card-header">
          <div class="completion-edit-card-summary">
            <div class="completion-edit-file-icon" aria-hidden="true">
              <IconFileDiff :size="22" />
            </div>
            <div class="completion-edit-card-copy">
              <span class="completion-edit-card-title">{{ editedFilesHeading }}</span>
              <div class="completion-edit-stats">
                <span class="completion-edit-added">+{{ workflowDiffStats.additions }}</span>
                <span class="completion-edit-removed">-{{ workflowDiffStats.deletions }}</span>
              </div>
            </div>
          </div>
          <div class="completion-edit-card-actions">
            <button
              type="button"
              class="completion-edit-secondary-btn"
              disabled
              aria-disabled="true"
              title="Undo is not available for this workflow yet"
            >
              <span>Undo</span>
              <IconArrowBackUp :size="15" />
            </button>
            <button
              type="button"
              class="completion-edit-review-btn"
              :class="{ active: reviewOpen }"
              :aria-expanded="reviewOpen"
              aria-controls="workflow-review-content"
              @click="toggleReview(workflow)"
            >
              <span>{{ reviewOpen ? 'Close review' : 'Review' }}</span>
            </button>
          </div>
        </div>

        <div v-if="editedFiles.length" class="completion-edit-file-list" aria-label="Changed files">
          <div
            v-for="file in visibleEditedFiles"
            :key="file.id"
            class="completion-edit-file-item"
          >
            <div class="completion-edit-file-row">
              <button
                type="button"
                class="completion-edit-file-toggle"
                :aria-label="`Review ${file.path}`"
                :aria-pressed="reviewOpen && String(reviewTaskId) === String(file.taskId)"
                :title="`Review ${file.path}`"
                @click="openReview(workflow, file)"
              >
                <span class="completion-edit-file-path">
                  <span class="completion-edit-file-directory">{{ getFilePathParts(file).directory }}</span>
                  <span class="completion-edit-file-name">{{ getFilePathParts(file).name }}</span>
                </span>
                <span class="completion-edit-file-row-stats">
                  <span class="completion-edit-added">+{{ fileStatsById[file.id]?.additions || 0 }}</span>
                  <span class="completion-edit-removed">-{{ fileStatsById[file.id]?.deletions || 0 }}</span>
                </span>
              </button>
            </div>
          </div>
          <button
            v-if="editedFiles.length > MAX_VISIBLE_EDITED_FILES"
            type="button"
            class="completion-edit-file-list-toggle"
            :aria-expanded="showAllEditedFiles"
            @click="showAllEditedFiles = !showAllEditedFiles"
          >
            <span>{{ showAllEditedFiles ? 'Show fewer files' : `Show ${editedFiles.length - MAX_VISIBLE_EDITED_FILES} more files` }}</span>
            <IconChevronDown :size="16" :class="{ 'rotate-180': showAllEditedFiles }" />
          </button>
        </div>
      </div>

      <section
        v-if="reviewOpen"
        class="workflow-review-panel"
        :class="{ collapsed: reviewPanelCollapsed, 'is-resizing': reviewPanelResizing }"
        :style="reviewPanelWidth ? { '--review-panel-width': `${reviewPanelWidth}px` } : undefined"
        aria-label="Workflow review"
      >
        <div
          v-if="!reviewPanelCollapsed"
          class="workflow-review-resize-handle"
          role="separator"
          aria-label="Resize review panel"
          aria-orientation="vertical"
          aria-controls="workflow-review-content"
          :aria-valuenow="Math.round(getReviewPanelWidth())"
          aria-valuemin="320"
          :aria-valuemax="getReviewPanelMaxWidth()"
          tabindex="0"
          @pointerdown.prevent="startReviewResize"
          @pointermove="resizeReviewPanel"
          @pointerup="stopReviewResize"
          @pointercancel="stopReviewResize"
          @keydown="resizeReviewPanelWithKeyboard"
        ></div>
        <!-- 1. Top Window Tab Bar -->
        <div class="workflow-review-tab-bar">
          <div class="workflow-review-tabs">
            <div class="workflow-review-tab-item active">
              <span class="tab-icon-box"><IconFile :size="13" /></span>
              <span class="tab-label">Review</span>
              <button type="button" class="tab-close-btn" title="Close review" @click="closeReview">
                <IconX :size="12" />
              </button>
            </div>
            <button type="button" class="workflow-review-tab-plus" title="New tab">
              <IconPlus :size="13" />
            </button>
          </div>
          <div class="workflow-review-window-controls">
            <button type="button" class="win-ctrl-btn" title="Expand">
              <IconMaximize :size="13" />
            </button>
            <button type="button" class="win-ctrl-btn" title="Split pane">
              <IconColumns :size="13" />
            </button>
            <button
              type="button"
              class="win-ctrl-btn side-panel-toggle"
              :class="{ active: !reviewPanelCollapsed }"
              :title="reviewPanelCollapsed ? 'Expand panel' : 'Collapse panel'"
              @click="toggleReviewPanel"
            >
              <IconLayoutSidebarRight :size="14" />
            </button>
          </div>
        </div>

        <div v-if="!reviewPanelCollapsed" id="workflow-review-content" class="workflow-review-panel-content">
          <!-- 2. Turn Subheader Bar -->
          <div class="workflow-review-turn-bar">
            <div class="workflow-review-turn-left">
              <button type="button" class="turn-select-btn">
                <span>Last Turn</span>
                <IconChevronDown :size="13" />
              </button>
              <div class="turn-diff-stats">
                <span class="stat-added">+{{ workflowDiffStats.additions }}</span>
                <span class="stat-removed">-{{ workflowDiffStats.deletions }}</span>
              </div>
            </div>
            <div class="workflow-review-turn-right">
              <button type="button" class="turn-tool-btn" title="More options"><IconDots :size="14" /></button>
              <button type="button" class="turn-tool-btn" title="Diff view"><IconSwitchHorizontal :size="14" /></button>
              <button type="button" class="turn-tool-btn" title="Copy code" @click="copyReviewCode(workflow)"><IconCopy :size="14" /></button>
              <button type="button" class="turn-tool-btn" title="Zoom in" :disabled="reviewZoom >= REVIEW_ZOOM_MAX" @click="zoomReviewIn"><IconZoomIn :size="14" /></button>
              <button type="button" class="turn-tool-btn" title="Zoom out" :disabled="reviewZoom <= REVIEW_ZOOM_MIN" @click="zoomReviewOut"><IconZoomOut :size="14" /></button>
              <button type="button" class="turn-tool-btn" title="Close" @click="closeReview"><IconX :size="14" /></button>
            </div>
          </div>

          <!-- 3. File Section Header Strip (Gray Bar) -->
          <div class="workflow-review-file-strip">
            <div class="file-strip-left">
              <span class="file-strip-caret">▼</span>
              <span class="file-strip-path">
                <span class="file-strip-dir">{{ selectedFileDir }}</span>
                <strong class="file-strip-name">{{ selectedFileName }}</strong>
              </span>
              <div class="file-strip-stats">
                <span class="stat-added">+{{ selectedFileStats.additions }}</span>
                <span class="stat-removed">-{{ selectedFileStats.deletions }}</span>
              </div>
            </div>
            <div class="file-strip-right">
              <button type="button" class="file-strip-action-btn" title="Copy file content" @click="copyReviewCode(workflow)"><IconCopy :size="13" /></button>
              <button type="button" class="file-strip-action-btn" title="Collapse file"><IconChevronDown :size="13" /></button>
              <button type="button" class="file-strip-action-btn" title="Open in new window"><IconExternalLink :size="13" /></button>
            </div>
          </div>

          <!-- 4. Multi-file tabs if workflow created multiple files -->
          <div v-if="editedFiles.length > 1" class="workflow-review-file-pills">
            <button
              v-for="file in editedFiles"
              :key="file.id"
              type="button"
              class="review-file-pill-btn"
              :class="{ active: String(file.taskId) === String(reviewTaskId) }"
              @click="reviewTaskId = file.taskId"
            >
              <IconFile :size="12" />
              <span>{{ file.path }}</span>
              <span class="pill-stats">+{{ fileStatsById[file.id].additions }} -{{ fileStatsById[file.id].deletions }}</span>
            </button>
          </div>

          <!-- 5. Code Diff Body -->
          <div v-if="reviewTask" class="workflow-review-code-body" :style="{ fontSize: `${12 * reviewZoom / 100}px` }">
            <template v-for="line in reviewLines" :key="line.id">
              <div v-if="line.isUnmodifiedBanner" class="workflow-review-unmodified-pill">
                <IconChevronUp :size="12" />
                <span>{{ line.text }}</span>
              </div>
              <div v-else class="workflow-review-code-line" :class="`is-${line.kind}`">
                <span class="workflow-review-line-number">{{ line.number }}</span>
                <code v-html="line.highlightedHtml"></code>
              </div>
            </template>
          </div>
          <div v-else class="workflow-review-empty">No file output is available for review.</div>
        </div>
      </section>

      <div v-if="validationItems.length" class="completion-results">
        <div class="completion-results-heading">Tests passed:</div>
        <ul class="completion-result-list">
          <li v-for="result in validationItems" :key="result.id" class="completion-result-row">
            <div class="completion-result-copy">
              <span class="completion-result-label">{{ result.label }}</span>
              <span> — Completed successfully</span>
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
        <span v-if="completionTimeLabel" class="completion-response-time">{{ completionTimeLabel }}</span>
      </div>
    </div>

    <Teleport to=".composer-container">
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
    </Teleport>

    <div v-if="workflow.runId" class="workflow-subtle-footer">
      <button type="button" class="workflow-subtle-run-btn" @click="$emit('open-run', workflow.runId)">
        Open full workflow run <IconArrowRight :size="12" />
      </button>
    </div>

    <div v-if="workflowErrorExplanation && !workflow.approval" class="workflow-card-error" role="alert">
      <div class="workflow-card-error-content">
        <div class="workflow-card-error-heading">Breakdown</div>
        <ul class="workflow-card-error-list">
          <li>
            <strong>{{ workflowErrorExplanation.title }}</strong>
            <span> — {{ workflowErrorExplanation.message }}</span>
          </li>
          <li>
            <strong>Next step</strong>
            <span> — {{ workflowErrorExplanation.nextStep }}</span>
          </li>
        </ul>
        <details v-if="workflowErrorExplanation.technicalDetail" class="workflow-card-error-details">
          <summary>Technical details</summary>
          <code>{{ workflowErrorExplanation.technicalDetail }}</code>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  IconArrowRight,
  IconArrowBackUp,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconColumns,
  IconCopy,
  IconDots,
  IconExternalLink,
  IconFileDiff,
  IconLayoutSidebarRight,
  IconLoader2,
  IconMaximize,
  IconPlus,
  IconShieldCheck,
  IconSwitchHorizontal,
  IconTerminal2,
  IconThumbDown,
  IconThumbUp,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-vue'
import WorkflowApprovalPanel from '@/components/workflow/WorkflowApprovalPanel.vue'
import { explainWorkflowError } from '@/utils/workflow'

const props = defineProps({
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
const copiedCode = ref(false)
const reaction = ref(null)
const reviewOpen = ref(false)
const reviewTaskId = ref(null)
const reviewPanelCollapsed = ref(false)
const reviewPanelWidth = ref(null)
const reviewPanelResizing = ref(false)
const reviewZoom = ref(100)
const showAllEditedFiles = ref(false)
const REVIEW_ZOOM_MIN = 75
const REVIEW_ZOOM_MAX = 175
const REVIEW_PANEL_MIN_WIDTH = 320
const REVIEW_PANEL_MAX_WIDTH = 1200
const MAX_VISIBLE_EDITED_FILES = 3

const getReviewPanelWidth = () => reviewPanelWidth.value || (window.innerWidth <= 640 ? window.innerWidth : Math.min(840, window.innerWidth * 0.52))
const getReviewPanelMaxWidth = () => Math.max(REVIEW_PANEL_MIN_WIDTH, Math.min(REVIEW_PANEL_MAX_WIDTH, window.innerWidth - 48))
const updateAppWidthForReview = () => {
  if (!reviewOpen.value || window.innerWidth <= 640) {
    document.documentElement.style.removeProperty('--workflow-review-width')
    return
  }

  const width = reviewPanelCollapsed.value ? 48 : getReviewPanelWidth()
  document.documentElement.style.setProperty('--workflow-review-width', `${width}px`)
}

watch([reviewOpen, reviewPanelCollapsed, reviewPanelWidth], updateAppWidthForReview, { flush: 'sync' })
window.addEventListener('resize', updateAppWidthForReview)
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateAppWidthForReview)
  document.documentElement.style.removeProperty('--workflow-review-width')
})

const clampReviewPanelWidth = (width) => Math.max(
  REVIEW_PANEL_MIN_WIDTH,
  Math.min(getReviewPanelMaxWidth(), width),
)

const startReviewResize = (event) => {
  if (event.button !== 0) return
  event.currentTarget.setPointerCapture(event.pointerId)
  reviewPanelResizing.value = true
}

const resizeReviewPanel = (event) => {
  if (!reviewPanelResizing.value) return
  reviewPanelWidth.value = clampReviewPanelWidth(window.innerWidth - event.clientX)
}

const stopReviewResize = (event) => {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
  reviewPanelResizing.value = false
}

const resizeReviewPanelWithKeyboard = (event) => {
  const step = event.shiftKey ? 80 : 24
  let nextWidth

  if (event.key === 'ArrowLeft') nextWidth = getReviewPanelWidth() + step
  else if (event.key === 'ArrowRight') nextWidth = getReviewPanelWidth() - step
  else if (event.key === 'Home') nextWidth = REVIEW_PANEL_MIN_WIDTH
  else if (event.key === 'End') nextWidth = Math.min(REVIEW_PANEL_MAX_WIDTH, window.innerWidth - 48)
  else return

  event.preventDefault()
  reviewPanelWidth.value = clampReviewPanelWidth(nextWidth)
}

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

const parseValue = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const findResultPaths = (value, paths = [], maxPaths = Number.POSITIVE_INFINITY) => {
  if (!value || paths.length >= maxPaths) return paths
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (paths.length < maxPaths) findResultPaths(item, paths, maxPaths)
    })
    return paths
  }
  if (typeof value !== 'object') return paths

  for (const key of ['path', 'file_path', 'filePath', 'file', 'fileName', 'filename', 'location', 'folder', 'directory', 'target', 'targetPath', 'relativePath']) {
    const candidate = value[key]
    if (paths.length >= maxPaths) break
    if (typeof candidate === 'string' && candidate.trim() && !paths.includes(candidate)) paths.push(candidate)
  }

  Object.values(value).forEach((child) => {
    if (paths.length < maxPaths && child && typeof child === 'object') findResultPaths(child, paths, maxPaths)
  })
  return paths
}

const isImageResultTask = (task) => {
  const tool = String(task?.assigned_tool || task?.assignedTool || '').toLowerCase()
  const title = `${task?.title || ''} ${task?.instruction || ''}`
  return tool === 'imagegenerator' || /\b(?:generate|create)\b[\s\w-]{0,40}\b(?:image|images|photo|photos|picture|pictures)\b/i.test(title)
}

const isCompletedTask = (task) => ['COMPLETED', 'SUCCESS'].includes(
  String(task?.status || task?.task_status || task?.state || '').toUpperCase(),
)

const getCompletedTasks = (workflow) => (workflow?.tasks || []).filter(isCompletedTask)

const completedStepCount = (workflow) => getCompletedTasks(workflow).length

const getWorkflowResultItems = (workflow) => {
  const completedTasks = getCompletedTasks(workflow)
  const imageTasks = completedTasks.filter(isImageResultTask)
  // Keep build/test/validation tasks in the dedicated "Tests passed" section
  // instead of presenting verification as a file change.
  const visibleTasks = completedTasks.filter((task) => !isImageResultTask(task) && !isValidationTask(task))
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
    const paths = findResultPaths(output, [], 3).filter((path) => path !== 'local Desktop')
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

const getTaskPayload = (task, keys) => parseValue(keys
  .map((key) => task?.[key])
  .find((value) => value !== undefined && value !== null && value !== ''))

const getTaskText = (task) => `${task?.title || ''} ${task?.instruction || ''} ${task?.description || ''} ${task?.command || ''}`.trim()

const getTaskResultPaths = (task) => {
  const output = getTaskPayload(task, [
    'tool_output',
    'toolOutput',
    'output_data',
    'outputData',
    'output_payload',
    'outputPayload',
    'result',
    'output',
  ])
  const input = getTaskPayload(task, ['tool_input', 'toolInput', 'input'])
  return [...findResultPaths(output, [], Number.POSITIVE_INFINITY), ...findResultPaths(input, [], Number.POSITIVE_INFINITY)]
    .map((path) => String(path).trim())
    .filter((path, index, paths) => path && paths.indexOf(path) === index)
}

const isLikelyFilePath = (value) => {
  const path = String(value || '').trim()
  return Boolean(path && /(?:^|[\\/])[^\\/]+\.[a-z0-9]{1,12}$/i.test(path))
}

const getEditedFileItems = (workflow) => {
  const seen = new Set()
  const files = []

  getCompletedTasks(workflow).forEach((task, taskIndex) => {
    const paths = getTaskResultPaths(task).filter((path) => !/^local (?:desktop|downloads)$/i.test(path))
    const filePaths = paths.filter(isLikelyFilePath)
    if (!filePaths.length) return

    const taskText = getTaskText(task)
    const status = /\b(?:create|created|generate|generated|add|added|write|written|scaffold)\b/i.test(taskText)
      ? 'Created'
      : 'Updated'

    filePaths.forEach((filePath, fileIndex) => {
      if (seen.has(filePath)) return
      seen.add(filePath)
      files.push({
        id: `file-${taskIndex}-${fileIndex}-${filePath}`,
        taskId: task.id || `task-${taskIndex}`,
        path: filePath,
        status,
      })
    })
  })

  return files
}

const findNumericValue = (value, keys) => {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumericValue(item, keys)
      if (found !== null) return found
    }
    return null
  }

  for (const key of keys) {
    const numeric = Number(value[key])
    if (Number.isFinite(numeric) && numeric >= 0) return numeric
  }

  for (const child of Object.values(value)) {
    const found = findNumericValue(child, keys)
    if (found !== null) return found
  }
  return null
}

const extractCodeContent = (obj, targetPath = '') => {
  if (!obj) return ''
  if (typeof obj === 'string') {
    const trimmed = obj.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed)
        const extracted = extractCodeContent(parsed, targetPath)
        if (extracted) return extracted
      } catch {}
    }
    return trimmed
  }
  if (typeof obj !== 'object') return ''

  for (const key of ['diff', 'patch', 'content', 'code', 'body', 'text', 'source', 'script', 'stdout']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key]
  }

  if (Array.isArray(obj.files)) {
    if (targetPath) {
      const match = obj.files.find((f) => f && (f.path === targetPath || f.fileName === targetPath || String(f.path || '').endsWith(targetPath)))
      if (match && typeof match.content === 'string') return match.content
    }
    const first = obj.files.find((f) => f && typeof f.content === 'string')
    if (first) return first.content
  } else if (obj.files && typeof obj.files === 'object') {
    if (targetPath && typeof obj.files[targetPath] === 'string') return obj.files[targetPath]
    const firstVal = Object.values(obj.files).find((v) => typeof v === 'string')
    if (firstVal) return firstVal
  }

  return ''
}

const getReviewContent = (task, targetPath = '') => {
  if (!task) return ''
  const selectedPath = targetPath || ''

  const rawOutput = getRawTaskValue(task, [
    'tool_output',
    'toolOutput',
    'output_data',
    'outputData',
    'output_payload',
    'outputPayload',
    'result',
    'output',
  ])
  const parsedOutput = parseValue(rawOutput)
  const outputContent = extractCodeContent(parsedOutput, selectedPath)
  if (outputContent) return outputContent

  const rawInput = getRawTaskValue(task, ['tool_input', 'toolInput', 'input'])
  const parsedInput = parseValue(rawInput)
  const inputContent = extractCodeContent(parsedInput, selectedPath)
  if (inputContent) return inputContent

  if (typeof rawOutput === 'string' && rawOutput.trim()) return rawOutput
  if (typeof rawInput === 'string' && rawInput.trim()) return rawInput

  if (parsedOutput && typeof parsedOutput === 'object') return JSON.stringify(parsedOutput, null, 2)
  if (parsedInput && typeof parsedInput === 'object') return JSON.stringify(parsedInput, null, 2)
  return 'No output content was returned by this workflow step.'
}

const escapeReviewHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightVueExpr = (expr) => {
  const pattern = /(['"])(?:(?=(\\?))\2.)*?\1|\b\d+\b|\.[a-zA-Z_$][a-zA-Z0-9_$]*|\b[A-Z][a-zA-Z0-9]+\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g
  let lastIndex = 0
  let result = ''
  let match

  while ((match = pattern.exec(expr)) !== null) {
    if (match.index > lastIndex) {
      result += escapeReviewHtml(expr.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('\'') || token.startsWith('"')) {
      result += `<span class="tok-string">${escapeReviewHtml(token)}</span>`
    } else if (/^\d+$/.test(token)) {
      result += `<span class="tok-num">${escapeReviewHtml(token)}</span>`
    } else if (token.startsWith('.')) {
      result += `.<span class="tok-prop">${escapeReviewHtml(token.slice(1))}</span>`
    } else if (/^[A-Z]/.test(token)) {
      result += `<span class="tok-tag">${escapeReviewHtml(token)}</span>`
    } else if (expr.slice(match.index + token.length).trim().startsWith('(')) {
      result += `<span class="tok-fn">${escapeReviewHtml(token)}</span>`
    } else if (['true', 'false', 'null', 'undefined'].includes(token)) {
      result += `<span class="tok-directive">${escapeReviewHtml(token)}</span>`
    } else {
      result += `<span class="tok-expr">${escapeReviewHtml(token)}</span>`
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < expr.length) {
    result += escapeReviewHtml(expr.slice(lastIndex))
  }
  return result
}

const highlightReviewLine = (rawLine, filename = '') => {
  if (!rawLine) return '&nbsp;'
  const ext = String(filename || '').split('.').pop().toLowerCase()
  const isCss = ['css', 'scss', 'less'].includes(ext) || /^\s*[a-zA-Z-]+\s*:\s*[^<;]+;/.test(rawLine) || /^\s*(?:\.|\#)[a-zA-Z0-9_-]+/.test(rawLine)
  const isHtmlVue = ['html', 'htm', 'vue', 'xml', 'svg', 'jsx', 'tsx'].includes(ext)
    || /<[a-zA-Z0-9_:-]+/.test(rawLine)

  if (/^\s*(<!--|\/\/|#|\/\*|\*)/.test(rawLine)) {
    return `<span class="tok-comment">${escapeReviewHtml(rawLine)}</span>`
  }

  if (isHtmlVue) {
    const vueRegex = /(\{\{[\s\S]*?\}\})|(v-[a-zA-Z0-9_:-]+)\s*=\s*(["'])([\s\S]*?)\3|([:@][a-zA-Z0-9_:-]+)\s*=\s*(["'])([\s\S]*?)\6|([a-zA-Z0-9_:-]+)\s*=\s*(["'])([\s\S]*?)\9|\b(disabled|checked|required|readonly|autofocus)\b|(<\/?)([a-zA-Z0-9_:-]+)|(\/?>)/g

    let lastIndex = 0
    let out = ''
    let m

    while ((m = vueRegex.exec(rawLine)) !== null) {
      if (m.index > lastIndex) {
        out += escapeReviewHtml(rawLine.slice(lastIndex, m.index))
      }

      if (m[1]) {
        const inner = m[1].slice(2, -2)
        out += `{{${highlightVueExpr(inner)}}}`
      } else if (m[2]) {
        const dir = m[2]
        const expr = m[4]
        out += `<span class="tok-directive">${escapeReviewHtml(dir)}</span>=&quot;${highlightVueExpr(expr)}&quot;`
      } else if (m[5]) {
        const attr = m[5]
        const expr = m[7]
        out += `<span class="tok-attr">${escapeReviewHtml(attr)}</span>=&quot;${highlightVueExpr(expr)}&quot;`
      } else if (m[8]) {
        const attr = m[8]
        const val = m[10]
        out += `<span class="tok-attr">${escapeReviewHtml(attr)}</span>=<span class="tok-string">&quot;${escapeReviewHtml(val)}&quot;</span>`
      } else if (m[11]) {
        out += `<span class="tok-attr">${escapeReviewHtml(m[11])}</span>`
      } else if (m[12]) {
        out += `<span class="tok-tag">${escapeReviewHtml(m[12] + m[13])}</span>`
      } else if (m[14]) {
        out += `<span class="tok-tag">${escapeReviewHtml(m[14])}</span>`
      }

      lastIndex = m.index + m[0].length
    }

    if (lastIndex < rawLine.length) {
      out += escapeReviewHtml(rawLine.slice(lastIndex))
    }
    return out || '&nbsp;'
  }

  if (isCss) {
    let line = rawLine
    const tokens = []
    const addToken = (html) => {
      const id = `\uE000${tokens.length}\uE001`
      tokens.push(html)
      return id
    }
    line = line.replace(/(#[0-9a-fA-F]{3,8})\b/g, (m) => addToken(`<span class="tok-val">${escapeReviewHtml(m)}</span>`))
    line = line.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (m) => addToken(`<span class="tok-val">${escapeReviewHtml(m)}</span>`))
    const propMatch = line.match(/^(\s*)([a-zA-Z-][a-zA-Z0-9-]*)\s*(:)(.*)$/)
    if (propMatch && !propMatch[2].startsWith('http') && !propMatch[4].startsWith('//')) {
      const space = propMatch[1]
      const propName = propMatch[2]
      const colon = propMatch[3]
      let propVal = propMatch[4]
      propVal = propVal.replace(/\b(\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|fr|vw|vh)?)\b/g, (m) => addToken(`<span class="tok-val">${escapeReviewHtml(m)}</span>`))
      propVal = propVal.replace(/\b(hidden|ellipsis|flex|center|auto|grid|pointer|transparent|inherit|none|block|inline|relative|absolute|fixed|monospace|ui-monospace|SFMono-Regular|Menlo|Monaco|Consolas|sans-serif|serif)\b/g, (m) => addToken(`<span class="tok-val">${escapeReviewHtml(m)}</span>`))
      const propToken = addToken(`<span class="tok-prop">${escapeReviewHtml(propName)}</span>`)
      line = space + propToken + colon + propVal
    } else {
      line = line.replace(/(:(?:hover|active|focus|focus-visible|disabled|enabled|not|first-child|last-child))\b/g, (m) => addToken(`<span class="tok-prop">${escapeReviewHtml(m)}</span>`))
      line = line.replace(/(\.[a-zA-Z0-9_-]+)/g, (m) => addToken(`<span class="tok-prop">${escapeReviewHtml(m)}</span>`))
      line = line.replace(/(#[a-zA-Z0-9_-]+)/g, (m) => addToken(`<span class="tok-prop">${escapeReviewHtml(m)}</span>`))
      line = line.replace(/\b(div|span|button|a|ul|ol|li|p|code|pre|small|strong|body|html|section|aside|header|footer|nav|svg|path|table|th|td|tr|input|label)\b/g, (m) => addToken(`<span class="tok-tag">${escapeReviewHtml(m)}</span>`))
    }
    let result = escapeReviewHtml(line)
    tokens.forEach((tokenHtml, idx) => {
      result = result.split(`\uE000${idx}\uE001`).join(tokenHtml)
    })
    return result || '&nbsp;'
  }

  // JS/TS
  let line = escapeReviewHtml(rawLine)
  line = line.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, (m) => `<span class="tok-string">${m}</span>`)
  line = line.replace(/\b(\d+(?:\.\d+)?)\b/g, (m) => `<span class="tok-num">${m}</span>`)
  line = line.replace(/\b(import|export|from|default|const|let|var|function|return|if|else|true|false|null|undefined|async|await|class|new|this|typeof|def|elif|lambda|is|not|and|or|pass|raise|public|private|protected|static|final|interface|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/g, (m) => `<span class="tok-keyword">${m}</span>`)
  line = line.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, (m) => `<span class="tok-fn">${m}</span>`)
  return line || '&nbsp;'
}

const getSelectedFile = (workflow, files = getEditedFileItems(workflow)) => {
  return files.find((file) => String(file.taskId) === String(reviewTaskId.value)) || files[0] || null
}

const getSelectedFileName = (workflow, files = getEditedFileItems(workflow)) => {
  const file = getSelectedFile(workflow, files)
  if (!file) return 'file'
  const parts = file.path.split(/[\\/]/)
  return parts[parts.length - 1]
}

const getSelectedFileDir = (workflow, files = getEditedFileItems(workflow)) => {
  const file = getSelectedFile(workflow, files)
  if (!file) return ''
  const parts = file.path.split(/[\\/]/)
  if (parts.length <= 1) return ''
  return parts.slice(0, parts.length - 1).join('/') + '/'
}

const getFilePathParts = (file) => {
  const path = String(file?.path || '')
  const separatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return {
    directory: separatorIndex >= 0 ? path.slice(0, separatorIndex + 1) : '',
    name: path.slice(separatorIndex + 1),
  }
}

const getFileStats = (file, workflow) => {
  if (!file) return { additions: 0, deletions: 0 }
  const task = getCompletedTasks(workflow).find((t, i) => String(t.id || `task-${i}`) === String(file.taskId))
  if (task) {
    const lines = getReviewLines(task, workflow, file.path)
    const added = lines.filter((l) => l.kind === 'added').length
    const removed = lines.filter((l) => l.kind === 'removed').length
    if (added > 0 || removed > 0) {
      return { additions: added, deletions: removed }
    }
    if (lines.length > 0) {
      return { additions: lines.length, deletions: 0 }
    }
  }
  return { additions: 0, deletions: 0 }
}

const getSelectedFileStats = (workflow, files = getEditedFileItems(workflow)) => {
  const file = getSelectedFile(workflow, files)
  return getFileStats(file, workflow)
}

const getWorkflowDiffStats = (workflow, files = getEditedFileItems(workflow)) => {
  let totalAdded = 0
  let totalRemoved = 0
  let hasAny = false

  files.forEach((file) => {
    const stats = getFileStats(file, workflow)
    totalAdded += stats.additions
    totalRemoved += stats.deletions
    if (stats.additions > 0 || stats.deletions > 0) hasAny = true
  })

  getCompletedTasks(workflow).forEach((task) => {
    const output = getTaskPayload(task, ['diff', 'changeSummary', 'change_summary'])
    const add = findNumericValue(output, ['additions', 'added', 'insertions', 'linesAdded'])
    const del = findNumericValue(output, ['deletions', 'deleted', 'removed', 'linesRemoved'])
    if (add !== null || del !== null) {
      hasAny = true
      totalAdded = Math.max(totalAdded, add || 0)
      totalRemoved = Math.max(totalRemoved, del || 0)
    }
  })

  return hasAny ? { additions: totalAdded, deletions: totalRemoved } : { additions: 0, deletions: 0 }
}

const getEditedFilesHeading = (workflow, files = getEditedFileItems(workflow)) => {
  if (files.length === 1) return `${files[0].status} ${files[0].path}`
  const statuses = new Set(files.map((file) => file.status))
  if (statuses.size === 1 && statuses.has('Created')) return `Created ${files.length} files`
  if (statuses.size === 1 && statuses.has('Updated')) return `Updated ${files.length} files`
  return `Updated ${files.length} files`
}

const getRawTaskValue = (task, keys) => keys
  .map((key) => task?.[key])
  .find((value) => value !== undefined && value !== null && value !== '')

const getReviewTask = (workflow, files = getEditedFileItems(workflow)) => {
  const selectedFile = files.find((file) => String(file.taskId) === String(reviewTaskId.value)) || files[0]
  if (!selectedFile) return null

  return getCompletedTasks(workflow).find((task, index) => String(task.id || `task-${index}`) === String(selectedFile.taskId)) || null
}

const getReviewLines = (task, workflow = null, targetPath = '') => {
  if (!task) return []
  const file = workflow ? getSelectedFile(workflow) : null
  const filename = targetPath || file?.path || ''
  const content = getReviewContent(task, filename)
  if (!content) return []

  const rawLines = content.split('\n')
  const isDiff = rawLines.some((l) => /^(?:---|\+\+\+|@@\s*-\d+)/.test(l))
    || (rawLines.filter((l) => /^[+-]/.test(l)).length >= 2 && rawLines.some((l) => l.startsWith('+')) && rawLines.some((l) => l.startsWith('-')))

  let oldLine = 1
  let newLine = 1
  let inHunk = false
  let prevNewLine = 0
  const lines = []

  rawLines.forEach((text, index) => {
    if (isDiff && (text.startsWith('---') || text.startsWith('+++') || text.startsWith('diff --git') || text.startsWith('index '))) {
      return
    }

    if (isDiff && text.startsWith('@@')) {
      const match = text.match(/@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s*@@/)
      if (match) {
        const nextOld = parseInt(match[1], 10)
        const nextNew = parseInt(match[2], 10)

        if (prevNewLine > 0 && nextNew > prevNewLine + 1) {
          const gap = nextNew - prevNewLine - 1
          lines.push({
            id: `gap-${index}`,
            isUnmodifiedBanner: true,
            text: `${gap} unmodified line${gap === 1 ? '' : 's'}`,
          })
        }

        oldLine = nextOld
        newLine = nextNew
        inHunk = true
        prevNewLine = nextNew - 1
      }
      return
    }

    let kind = 'context'
    let lineNum = newLine
    let displayText = text

    if (isDiff && inHunk) {
      if (text.startsWith('+')) {
        kind = 'added'
        lineNum = newLine++
        prevNewLine = lineNum
        displayText = text.slice(1)
      } else if (text.startsWith('-')) {
        kind = 'removed'
        lineNum = oldLine++
        displayText = text.slice(1)
      } else {
        kind = 'context'
        lineNum = newLine++
        oldLine++
        prevNewLine = lineNum
        displayText = text.startsWith(' ') ? text.slice(1) : text
      }
    } else {
      kind = 'context'
      lineNum = index + 1
      displayText = text
    }

    const highlightedHtml = highlightReviewLine(displayText, filename)

    lines.push({
      id: `${task?.id || 'review'}-${index}`,
      number: lineNum,
      text: displayText,
      highlightedHtml,
      kind,
    })
  })

  return lines
}

// Keep derived workflow data in one reactive snapshot. The template renders the
// same values in several places, so caching them avoids reparsing task payloads
// and rebuilding highlighted code on every template expression.
const editedFiles = computed(() => getEditedFileItems(props.workflow))
const completionChanges = computed(() => getCompletionChanges(props.workflow))
const validationItems = computed(() => getValidationItems(props.workflow))
const workflowErrorExplanation = computed(() => explainWorkflowError(props.workflow?.error))
const workflowDiffStats = computed(() => getWorkflowDiffStats(props.workflow, editedFiles.value))
const editedFilesHeading = computed(() => getEditedFilesHeading(props.workflow, editedFiles.value))
const selectedFile = computed(() => getSelectedFile(props.workflow, editedFiles.value))
const selectedFileName = computed(() => getSelectedFileName(props.workflow, editedFiles.value))
const selectedFileDir = computed(() => getSelectedFileDir(props.workflow, editedFiles.value))
const selectedFileStats = computed(() => getSelectedFileStats(props.workflow, editedFiles.value))
const fileStatsById = computed(() => Object.fromEntries(
  editedFiles.value.map((file) => [file.id, getFileStats(file, props.workflow)]),
))
const visibleEditedFiles = computed(() => (
  showAllEditedFiles.value ? editedFiles.value : editedFiles.value.slice(0, MAX_VISIBLE_EDITED_FILES)
))
const reviewTask = computed(() => getReviewTask(props.workflow, editedFiles.value))
const reviewLines = computed(() => getReviewLines(reviewTask.value, props.workflow, selectedFile.value?.path || ''))
const completionTimeLabel = computed(() => getCompletionTimeLabel(props.workflow))

watch(editedFiles, (files) => {
  if (!files.some((file) => String(file.taskId) === String(reviewTaskId.value))) {
    reviewTaskId.value = files[0]?.taskId || null
  }
})

const copyReviewCode = async (workflow) => {
  const files = workflow === props.workflow ? editedFiles.value : getEditedFileItems(workflow)
  const task = getReviewTask(workflow, files)
  const file = getSelectedFile(workflow, files)
  const content = getReviewContent(task, file?.path)
  if (!content) return
  try {
    await navigator.clipboard.writeText(content)
    copiedCode.value = true
    setTimeout(() => { copiedCode.value = false }, 1800)
  } catch (e) {
    console.error('Failed to copy code:', e)
  }
}

const openReview = (workflow, selectedFile = null) => {
  const files = workflow === props.workflow ? editedFiles.value : getEditedFileItems(workflow)
  reviewTaskId.value = selectedFile?.taskId || files[0]?.taskId || null
  reviewPanelCollapsed.value = false
  reviewOpen.value = true
}

const toggleReview = (workflow) => {
  if (reviewOpen.value) {
    closeReview()
    return
  }
  openReview(workflow)
}

const toggleReviewPanel = () => {
  reviewPanelCollapsed.value = !reviewPanelCollapsed.value
}

const zoomReviewIn = () => {
  reviewZoom.value = Math.min(REVIEW_ZOOM_MAX, reviewZoom.value + 10)
}

const zoomReviewOut = () => {
  reviewZoom.value = Math.max(REVIEW_ZOOM_MIN, reviewZoom.value - 10)
}

const resetReviewZoom = () => {
  reviewZoom.value = 100
}

const closeReview = () => {
  reviewOpen.value = false
}

const isValidationTask = (task) => {
  const text = getTaskText(task)
  const input = getTaskPayload(task, ['tool_input', 'toolInput', 'input'])
  const command = typeof input?.command === 'string' ? input.command : ''
  const action = typeof input?.action === 'string' ? input.action : ''
  // Inspect task metadata and the executable command only. Do not scan source
  // content inside fileManager payloads, where words such as "test" may be
  // dependency names rather than a validation step.
  const validationText = `${text} ${command} ${action}`
    .replace(/\b[\w.-]+\.(?:html?|css|js|mjs|cjs|ts|tsx|jsx|json|md|txt|vue)\b/gi, '')
  return /\b(?:test|tests|lint|build|verify|validation|validate|check|checks)\b/i.test(validationText)
}

const getValidationItems = (workflow) => getCompletedTasks(workflow)
  .filter(isValidationTask)
  .map((task, index) => ({
    id: task.id || `validation-${index}`,
    label: task.title || task.instruction || `Validation ${index + 1}`,
  }))

const getCompletionChanges = (workflow) => getWorkflowResultItems(workflow)

const getCompletionTimeLabel = (workflow) => {
  const timestamp = workflow?.completedAt || workflow?.createdAt
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const getCompletionDuration = (workflow) => {
  if (workflow?.finalSeconds) return `${workflow.finalSeconds}s`
  const started = workflow?.startedAt || (workflow?.createdAt ? new Date(workflow.createdAt).getTime() : null)
  const completed = workflow?.completedAt ? new Date(workflow.completedAt).getTime() : Date.now()
  return started ? `${Math.max(1, Math.round((completed - started) / 1000))}s` : 'a few seconds'
}

const getWorkflowResponseText = (workflow) => {
  const changes = getCompletionChanges(workflow)
  const files = getEditedFileItems(workflow)
  const validation = getValidationItems(workflow)
  return [
    `Done — workflow completed successfully in ${getCompletionDuration(workflow)}.`,
    `${completedStepCount(workflow)} of ${(workflow?.tasks || []).length} steps completed.`,
    changes.length ? 'Changes:' : '',
    ...changes.map((result) => `- ${result.label}${result.detail ? ` — ${result.detail}` : ''}`),
    files.length ? 'Updated files:' : '',
    ...files.map((file) => `- ${file.path} — ${file.status}`),
    validation.length ? 'Tests passed:' : '',
    ...validation.map((result) => `- ${result.label} — Completed successfully`),
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

.change-style {
  font-size: 16px !important;
  font-weight: 500 !important;
}
.workflow-antigravity-stream {
  width: 100%;
  max-width: 760px;
  background: transparent;
  padding: 2px 0 8px;
}

.stream-elapsed-header {
  font-size: 13.5px;
  font-weight: 600;
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
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
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
  font-size: 16px;
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

.workflow-card-error-content {
  display: grid;
  gap: 4px;
}

.workflow-card-error-heading {
  color: #991b1b;
  font-weight: 650;
}

.workflow-card-error-list {
  margin: 0 0 2px 18px;
  padding: 0;
  color: #b91c1c;
  line-height: 1.45;
  list-style: disc;
}

.workflow-card-error-list li {
  margin-bottom: 4px;
  padding-left: 2px;
}

.workflow-card-error-list strong {
  font-weight: 650;
}

.workflow-card-error-details {
  margin-top: 2px;
  color: #7f1d1d;
}

.workflow-card-error-details summary {
  cursor: pointer;
  font-size: 11px;
}

.workflow-card-error-details code {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.4;
}

.workflow-completion-response {
  margin: 16px 0 4px;
  padding: 0;
  color: #18181b;
  font-size: 16px;
  line-height: 1.55;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  color: #18181b;
  font-size: inherit;
  font-weight: 400;
  line-height: inherit;
}

.completion-heading-copy p {
  margin: 3px 0 0;
  color: #52525b;
  font-size: inherit;
}

.completion-results {
  margin-top: 12px;
}

.completion-results-heading {
  margin-bottom: 7px;
  color: #18181b;
  font-size: 14px;
  font-weight: 400;
}

.completion-result-list {
  margin: 8px 0 16px 20px;
  padding: 0;
  line-height: 1.8;
  color: #000000;
  list-style: disc;
}

.completion-result-row {
  display: list-item;
  margin-bottom: 5px;
  padding: 0;
}

.completion-result-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.completion-result-label {
  color: #000000;
  font-size: 16px;
  font-weight: 400;
}

.completion-result-copy span {
  color: #000000;
  font-size: 16px;
}

.completion-file-link {
  padding: 0;
  color: #2f80d7;
  font: inherit;
  text-align: left;
  overflow-wrap: anywhere;
}

.completion-edit-card {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
}

.completion-edit-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 72px;
  padding: 12px 16px;
}

.completion-edit-card-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.completion-edit-file-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  background: #ffffff;
  color: #3f3f46;
}

.completion-edit-card-copy {
  min-width: 0;
}

.completion-edit-card-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #18181b;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.3;
}

.completion-edit-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
}

.completion-edit-added {
  color: #16a34a;
}

.completion-edit-removed {
  color: #dc2626;
}

.completion-edit-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.completion-edit-file-list {
  border-top: 1px solid #f1f1f3;
  padding: 4px 12px;
}

.completion-edit-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 6px 0;
  color: #52525b;
  font-size: 16px;
}

.completion-edit-file-item + .completion-edit-file-item {
  border-top: 1px solid #f4f4f5;
}

.completion-edit-file-toggle {
  display: flex;
  min-height: 36px;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

.completion-edit-file-toggle:hover,
.completion-edit-file-toggle[aria-pressed="true"] {
  background: #f8fafc;
}

.completion-edit-file-toggle:focus-visible {
  outline: 2px solid #a5b4fc;
  outline-offset: 2px;
}

.completion-edit-file-toggle:hover .completion-edit-file-name,
.completion-edit-file-toggle:focus-visible .completion-edit-file-name {
  color: #18181b;
}

.completion-edit-file-list-toggle {
  display: flex;
  width: calc(100% + 24px);
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 4px -12px -4px;
  padding: 0 12px;
  border: 0;
  border-top: 1px solid #f4f4f5;
  color: #27272a;
  background: #fafafa;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

.completion-edit-file-list-toggle:hover {
  background: #f4f4f5;
}

.completion-edit-file-list-toggle :deep(svg) {
  transition: transform 120ms ease;
}

.completion-edit-file-list-toggle :deep(svg.rotate-180) {
  transform: rotate(180deg);
}

.completion-edit-file-path {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  min-width: 0;
  color: #71717a;
  font-weight: 400;
}

.completion-edit-file-directory {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px !important;
}

.completion-edit-file-name {
  flex: 0 0 auto;
  color: #27272a;
  font-weight: 400;
}

.completion-edit-file-row-stats {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
}

.completion-edit-secondary-btn {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  color: #3f3f46;
  background: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;
}

.completion-edit-secondary-btn:disabled {
  color: #a1a1aa;
  border-color: #ededf0;
  background: #fafafa;
  cursor: not-allowed;
}

.completion-edit-review-btn {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid #18181b;
  border-radius: 8px;
  color: #ffffff;
  background: #18181b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
}

.completion-edit-review-btn:hover {
  background: #3f3f46;
  border-color: #3f3f46;
}

.completion-edit-review-btn.active {
  color: #18181b;
  background: #ffffff;
}

.completion-edit-review-btn.active:hover {
  background: #f4f4f5;
  border-color: #a1a1aa;
}

.workflow-review-panel {
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: var(--review-panel-width, min(840px, 52vw));
  max-width: calc(100vw - 48px);
  background: #ffffff;
  border-left: 1px solid #dbe3ef;
  box-shadow: none;
  animation: workflow-review-enter 180ms ease-out both;
  user-select: text;
}

.workflow-review-panel.is-resizing {
  user-select: none;
  transition: none;
}

.workflow-review-resize-handle {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  left: -5px;
  display: grid;
  place-items: center;
  width: 10px;
  cursor: col-resize;
  touch-action: none;
}

.workflow-review-resize-handle:focus-visible {
  outline: none;
}

.workflow-review-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  min-height: 38px;
  padding: 0 12px 0 8px;
  border-bottom: 1px solid #dbe3ef;
  background: linear-gradient(105deg, #f4f7ff 0%, #fbfaff 54%, #f8fafc 100%);
}

.workflow-review-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-review-tab-item {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 10px 0 8px;
  border: 1px solid #dbe3ef;
  border-bottom-color: #ffffff;
  border-radius: 6px 6px 0 0;
  background: #ffffff;
  color: #18181b;
  font-size: 12px;
  font-weight: 500;
}

.tab-icon-box {
  display: grid;
  place-items: center;
  color: #6366f1;
}

.tab-label {
  color: #18181b;
}

.tab-close-btn {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  margin-left: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 120ms ease;
}

.tab-close-btn:hover {
  background: #f4f4f5;
  color: #18181b;
}

.workflow-review-tab-plus {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: all 120ms ease;
}

.workflow-review-tab-plus:hover {
  background: #f4f4f5;
  color: #18181b;
}

.workflow-review-window-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.win-ctrl-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: all 120ms ease;
}

.win-ctrl-btn:hover {
  background: #f4f4f5;
  color: #18181b;
}

.win-ctrl-btn.side-panel-toggle.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  border-radius: 50%;
  width: 24px;
  height: 24px;
}

.workflow-review-panel.collapsed {
  width: 48px;
}

.workflow-review-panel.collapsed .workflow-review-tab-bar {
  padding: 0 6px;
  justify-content: center;
}

.workflow-review-panel.collapsed .workflow-review-tabs,
.workflow-review-panel.collapsed .workflow-review-panel-content {
  display: none;
}

.workflow-review-panel-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.workflow-review-turn-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  min-height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.workflow-review-turn-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.turn-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #18181b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
}

.turn-select-btn:hover {
  background: #f4f4f5;
}

.turn-diff-stats {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
}

.stat-added {
  color: #15803d;
}

.stat-removed {
  color: #dc2626;
}

.workflow-review-turn-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.turn-tool-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: all 120ms ease;
}

.turn-tool-btn:hover:not(:disabled) {
  background: #f4f4f5;
  color: #18181b;
}

.turn-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.workflow-review-file-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  min-height: 34px;
  padding: 0 14px;
  background: #f1f5f9;
  border-bottom: 1px solid #dbe3ef;
}

.file-strip-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.file-strip-caret {
  color: #16a34a;
  font-size: 10px;
  flex: 0 0 auto;
}

.file-strip-path {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-strip-dir {
  color: #71717a;
  font-weight: 400;
}

.file-strip-name {
  color: #09090b;
  font-weight: 700;
}

.file-strip-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 700;
}

.file-strip-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.file-strip-action-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: all 120ms ease;
}

.file-strip-action-btn:hover {
  background: #e4e4e7;
  color: #18181b;
}

.workflow-review-file-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.review-file-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #ffffff;
  color: #52525b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 120ms ease;
}

.review-file-pill-btn:hover {
  background: #f4f4f5;
  border-color: #d4d4d8;
  color: #18181b;
}

.review-file-pill-btn.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #ffffff;
}

.review-file-pill-btn.active .pill-stats {
  color: #a1a1aa;
}

.pill-stats {
  color: #71717a;
  font-weight: 600;
}

.workflow-review-code-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-color: transparent transparent;
  padding: 0;
  background: #ffffff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.workflow-review-code-body::-webkit-scrollbar:vertical {
  width: 0;
}

.workflow-review-unmodified-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 6px 14px;
  padding: 4px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  user-select: none;
}

.workflow-review-code-line {
  display: grid;
  grid-template-columns: 55px minmax(0, 1fr);
  min-width: max-content;
  padding: 0;
  white-space: pre;
  border-left: 3.5px solid transparent;
}

.workflow-review-code-line.is-added {
  background: #e8f8ed;
  border-left: 3.5px solid #16a34a;
}

.workflow-review-code-line.is-added .workflow-review-line-number {
  color: #15803d;
  font-weight: 600;
}

.workflow-review-code-line.is-removed {
  background: #fff0f0;
  border-left: 3.5px dashed #dc2626;
}

.workflow-review-code-line.is-removed .workflow-review-line-number {
  color: #dc2626;
  font-weight: 600;
}

.workflow-review-code-line.is-context {
  background: #ffffff;
  border-left: 3.5px solid transparent;
}

.workflow-review-code-line.is-context .workflow-review-line-number {
  color: #666666;
}

.workflow-review-line-number {
  user-select: none;
  font-size: 11px;
  line-height: 1.6;
  text-align: right;
  padding-right: 14px;
  color: #64748b;
}

.workflow-review-code-line code {
  min-width: 0;
  padding: 0 12px 0 4px;
  color: #24292f;
  font: inherit;
  line-height: 1.6;
}

/* Syntax tokens are inserted with v-html, so they need deep selectors in this scoped stylesheet. */
:deep(.tok-tag),
:deep(.review-tok-tag) {
  color: #c02636;
  font-weight: 500;
}

:deep(.tok-attr),
:deep(.review-tok-attr) {
  color: #2563eb;
}

:deep(.tok-string),
:deep(.review-tok-string) {
  color: #15803d;
}

:deep(.tok-directive),
:deep(.review-tok-directive),
:deep(.tok-expr),
:deep(.review-tok-expr) {
  color: #c2410c;
}

:deep(.tok-val),
:deep(.review-tok-val) {
  color: #c2410c;
}

:deep(.tok-num),
:deep(.review-tok-num),
:deep(.tok-number),
:deep(.review-tok-number) {
  color: #2563eb;
  font-weight: 500;
}

:deep(.tok-fn),
:deep(.review-tok-fn) {
  color: #2563eb;
}

:deep(.tok-keyword),
:deep(.review-tok-keyword) {
  color: #c02636;
  font-weight: 600;
}

:deep(.tok-prop),
:deep(.review-tok-prop) {
  color: #2563eb;
}

:deep(.tok-comment),
:deep(.review-tok-comment) {
  color: #666666;
  font-style: italic;
}

.workflow-review-empty {
  padding: 24px 14px;
  color: #71717a;
  font-size: 12px;
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
  border-color: #d4d4d8;
  color: #18181b;
  background: #f4f4f5;
}

.completion-response-time {
  margin-left: 8px;
  color: #a1a1aa;
  font-size: 11px;
}

@media (max-width: 640px) {
  .completion-edit-card-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }

  .completion-edit-card-actions {
    width: 100%;
  }

  .completion-edit-secondary-btn,
  .completion-edit-review-btn {
    flex: 1 1 0;
    justify-content: center;
  }

  .workflow-review-panel-body {
    grid-template-columns: 1fr;
  }

  .workflow-review-panel {
    width: 100vw;
    max-width: 100vw;
  }

  .workflow-review-resize-handle {
    display: none;
  }

  .workflow-review-panel.collapsed {
    width: 58px;
  }

  .workflow-review-file-list {
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid #e4e4e7;
  }
}

@keyframes workflow-review-enter {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
