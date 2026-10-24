<template>
  <DashboardLayout :recent-items="runs">
    <div class="dashboard-page">
      <!-- Hidden File Picker (accepts code, docs, images, any files) -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        class="visually-hidden"
        @change="handleFileSelect"
      />

      <div v-if="!currentMessages.length" class="hero">
        <div class="orb"></div>
        <h1>Good Morning, <strong>{{ auth.displayName }}</strong><br />How Can I <span>Assist You Today?</span></h1>
        <p class="hero-subtitle">Ask anything, upload an image or code file, plan a workflow, or let SMAgen help you move faster.</p>
        <div class="prompt-suggestions">
          <button type="button" @click="startPrompt('Help me understand this project and suggest the next best step.')">
            Understand my project
          </button>
          <button type="button" @click="startPrompt('Create a safe workflow to inspect my workspace.')">
            Inspect my workspace
          </button>
        </div>
      </div>

      <div v-else ref="chatThreadRef" class="chat-thread" aria-live="polite">
        <div class="chat-thread-inner">
          <div
            v-for="(message, index) in currentMessages"
            :key="`${message.role}-${index}`"
            class="message-row"
            :class="message.role"
          >
            <div class="message-content-box">
              <div v-if="message.role === 'assistant'" class="assistant-response-wrap">
                <div v-if="message.workflow" class="workflow-chat-card" :class="workflowStatusClass(message.workflow)">
                  <div class="workflow-chat-header">
                    <div class="workflow-chat-heading">
                      <span class="workflow-terminal-icon"><IconTerminal2 :size="16" /></span>
                      <div>
                        <div class="workflow-chat-eyebrow">SMAgen workflow</div>
                        <h3>{{ message.workflow.approval ? `Allow ${message.workflow.approval.assignedTool}?` : workflowStatusTitle(message.workflow) }}</h3>
                      </div>
                    </div>
                    <span class="workflow-status-pill">{{ workflowStatusLabel(message.workflow) }}</span>
                  </div>

                  <p class="workflow-chat-prompt">{{ message.workflow.goalPrompt }}</p>

                  <!-- Live Stream Activity Feed (Antigravity-style) -->
                  <div v-if="message.workflow.tasks?.length || isWorkflowRunning(message.workflow)" class="workflow-live-stream">
                    <!-- Stream Toggle Header -->
                    <button
                      type="button"
                      class="stream-toggle-header"
                      @click="toggleStreamOpen(message.workflow)"
                    >
                      <div class="stream-toggle-title">
                        <span class="stream-icon-sparkle">
                          <IconLoader2 v-if="isWorkflowRunning(message.workflow)" :size="13" class="spin-icon" />
                          <IconCheck v-else :size="13" class="text-green" />
                        </span>
                        <span>{{ getStreamHeading(message.workflow) }}</span>
                      </div>
                      <IconChevronDown
                        :size="13"
                        class="stream-chevron"
                        :class="{ 'chevron-up': message.workflow.isStreamOpen !== false }"
                      />
                    </button>

                    <!-- Stream Content Drawer -->
                    <div v-if="message.workflow.isStreamOpen !== false" class="stream-content">
                      <div
                        v-for="(step, sIndex) in getWorkflowSteps(message.workflow)"
                        :key="step.id || sIndex"
                        class="stream-step-row"
                        :class="{ expanded: isStepExpanded(message.workflow, step.id || sIndex) }"
                      >
                        <div
                          class="stream-step-header"
                          @click="toggleStepExpanded(message.workflow, step.id || sIndex)"
                        >
                          <div class="stream-step-left">
                            <span class="stream-step-icon" :class="step.statusClass">
                              <IconLoader2 v-if="step.isRunning" :size="12" class="spin-icon" />
                              <IconCheck v-else-if="step.isCompleted" :size="12" />
                              <IconX v-else-if="step.isFailed" :size="12" />
                              <IconShieldCheck v-else-if="step.isApproval" :size="12" />
                              <IconTerminal2 v-else :size="12" />
                            </span>
                            <span class="stream-step-label">{{ step.label }}</span>
                            <span v-if="step.isApproval" class="stream-shield-pill">
                              <IconShieldCheck :size="10" /> Protected
                            </span>
                          </div>
                          <div class="stream-step-right">
                            <span v-if="step.duration" class="stream-step-duration">{{ step.duration }}</span>
                            <IconChevronRight :size="12" class="step-chevron" />
                          </div>
                        </div>

                        <!-- Expanded details (tool input / output) -->
                        <div v-if="isStepExpanded(message.workflow, step.id || sIndex)" class="stream-step-body">
                          <div v-if="step.toolInput" class="stream-code-block">
                            <div class="code-label">Input</div>
                            <pre><code>{{ step.toolInput }}</code></pre>
                          </div>
                          <div v-if="step.output" class="stream-code-block">
                            <div class="code-label">Output</div>
                            <pre><code>{{ step.output }}</code></pre>
                          </div>
                        </div>
                      </div>

                      <!-- Working / Live Pulsing Indicator at bottom -->
                      <div v-if="isWorkflowRunning(message.workflow)" class="stream-working-row">
                        <span class="working-pulse-dot"></span>
                        <span class="working-text">{{ getCurrentWorkingText(message.workflow) }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="message.workflow.approval" class="workflow-approval-panel">
                    <div class="workflow-approval-meta">
                      <IconShieldCheck :size="15" />
                      <span>{{ message.workflow.approval.taskTitle || 'Approval required before this step can continue.' }}</span>
                    </div>
                    <div class="workflow-command-box">
                      <span class="workflow-command-label">{{ message.workflow.approval.assignedTool || 'workflow action' }}</span>
                      <code>{{ stringifyWorkflowValue(message.workflow.approval.actionSummary || message.workflow.approval.toolInput, 'Approval required for this action.') }}</code>
                    </div>

                    <div class="workflow-choice-list" role="radiogroup" aria-label="Workflow approval choice">
                      <label
                        v-for="option in workflowApprovalOptions(message.workflow.approval.assignedTool)"
                        :key="option.value"
                        class="workflow-choice"
                        :class="{ selected: message.workflow.approval.choice === option.value }"
                      >
                        <input
                          v-model="message.workflow.approval.choice"
                          type="radio"
                          :name="`workflow-approval-${message.workflow.runId}-${index}`"
                          :value="option.value"
                        />
                        <span class="workflow-choice-number">{{ option.number }}</span>
                        <span>{{ option.label }}</span>
                      </label>
                    </div>

                    <textarea
                      v-if="message.workflow.approval.choice === 'reject'"
                      v-model="message.workflow.approval.rejectionReason"
                      class="workflow-rejection-input"
                      rows="2"
                      placeholder="Tell SMAgen what to do instead…"
                    ></textarea>

                    <div v-if="message.workflow.error" class="workflow-card-error">{{ message.workflow.error }}</div>
                    <div class="workflow-approval-actions">
                      <button class="workflow-skip-btn" type="button" :disabled="message.workflow.decisionPending" @click="skipWorkflowApproval(message)">
                        Skip
                      </button>
                      <button class="workflow-submit-btn" type="button" :disabled="message.workflow.decisionPending" @click="submitWorkflowApproval(message)">
                        <IconCheck v-if="!message.workflow.decisionPending" :size="15" />
                        <span>{{ message.workflow.decisionPending ? 'Submitting…' : 'Submit' }}</span>
                      </button>
                    </div>
                  </div>

                  <div v-else class="workflow-chat-status">
                    <span class="workflow-status-dot" :class="workflowStatusClass(message.workflow)"></span>
                    <span>{{ workflowStatusMessage(message.workflow) }}</span>
                    <button
                      v-if="message.workflow.runId"
                      type="button"
                      class="workflow-open-btn"
                      @click="router.push(`/runs/${message.workflow.runId}`)"
                    >
                      Open run
                      <IconArrowRight :size="13" />
                    </button>
                  </div>

                  <div v-if="message.workflow.error && !message.workflow.approval" class="workflow-card-error">{{ message.workflow.error }}</div>
                </div>

                <template v-else>
                  <div class="assistant-markdown" v-html="renderMarkdown(message.content)"></div>
                  <div class="message-actions">
                    <button class="action-btn" type="button" @click="copyMessage(message.content, index)">
                      <component :is="copiedIndex === index ? IconCheck : IconCopy" :size="13" />
                      <span>{{ copiedIndex === index ? 'Copied' : 'Copy' }}</span>
                    </button>
                  </div>
                </template>
                </div>

              <div v-else class="user-message-container">
                <!-- Attached User Images Gallery -->
                <div v-if="message.images && message.images.length" class="message-images-gallery">
                  <img
                    v-for="(img, imgIdx) in message.images"
                    :key="imgIdx"
                    :src="img"
                    alt="User uploaded attachment"
                    class="message-thumbnail"
                    @click="previewImageUrl = img"
                  />
                </div>

                <!-- Attached User Files Gallery -->
                <div v-if="message.files && message.files.length" class="message-files-gallery">
                  <div
                    v-for="(file, fIdx) in message.files"
                    :key="fIdx"
                    class="message-file-chip"
                    :title="file.name"
                  >
                    <div class="file-chip-icon">
                      <IconFile :size="14" />
                    </div>
                    <div class="file-chip-info">
                      <span class="file-chip-name">{{ file.name }}</span>
                      <span v-if="file.size" class="file-chip-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Inline Editing Box matching User Mockup -->
                <div v-if="editingIndex === index" class="user-inline-editor-wrapper">
                  <div class="user-inline-edit-bubble">
                    <textarea
                      v-model="editDraft"
                      class="edit-textarea"
                      rows="1"
                      placeholder="Edit message…"
                      @keydown.enter.exact.prevent="submitEditUserMessage(index)"
                      @keydown.esc="cancelEditUserMessage"
                    ></textarea>
                  </div>
                  <div class="user-edit-actions-row">
                    <span class="edit-info-icon" title="Press Enter to save, Esc to cancel">
                      <IconInfoCircle :size="15" />
                    </span>
                    <button class="edit-cancel-btn" type="button" @click="cancelEditUserMessage">
                      Cancel
                    </button>
                    <button class="edit-save-btn" type="button" @click="submitEditUserMessage(index)">
                      Save
                    </button>
                  </div>
                </div>

                <!-- Normal Bubble & Actions -->
                <div v-else class="user-bubble-wrapper">
                  <div v-if="message.content" class="user-bubble">{{ message.content }}</div>
                  <div class="user-meta-row">
                    <span class="user-time">{{ formatRelativeTime(message.createdAt) }}</span>
                    <button
                      class="user-action-btn"
                      type="button"
                      title="Retry response"
                      :disabled="loading"
                      @click="retryUserMessage(index)"
                    >
                      <IconRefresh :size="13" />
                    </button>
                    <button
                      class="user-action-btn"
                      type="button"
                      title="Edit message"
                      @click="startEditUserMessage(index, message.content)"
                    >
                      <IconPencil :size="13" />
                    </button>
                    <button
                      class="user-action-btn"
                      type="button"
                      :title="copiedUserIndex === index ? 'Copied!' : 'Copy message'"
                      @click="copyUserMessage(message.content, index)"
                    >
                      <component :is="copiedUserIndex === index ? IconCheck : IconCopy" :size="13" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading && activeMode === 'chat'" class="message-row assistant">
            <div class="message-content-box">
              <div class="assistant-response-wrap">
                <div v-if="streamingContent" class="assistant-markdown" v-html="renderMarkdown(streamingContent)"></div>
                <div v-if="streamingContent" class="streaming-caret" aria-label="Generating response"></div>
                <div v-else class="typing-dots"><i></i><i></i><i></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="composer-container">
        <!-- Floating scroll down button -->
        <button
          v-if="showScrollButton"
          class="scroll-down-btn"
          type="button"
          aria-label="Scroll to bottom"
          @click="scrollToBottom"
        >
          <IconChevronDown :size="16" />
        </button>

        <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

        <div class="composer">
          <!-- Attachments (Images & Files) Previews in Composer -->
          <div v-if="attachedImages.length || attachedFiles.length" class="composer-attachments">
            <!-- Images -->
            <div
              v-for="(img, idx) in attachedImages"
              :key="img.id"
              class="attachment-chip"
            >
              <img :src="img.dataUrl" :alt="img.name" class="attachment-preview-img" />
              <button
                class="remove-attachment-btn"
                type="button"
                aria-label="Remove image"
                @click="removeAttachedImage(idx)"
              >
                <IconX :size="12" />
              </button>
            </div>

            <!-- Files -->
            <div
              v-for="(file, idx) in attachedFiles"
              :key="file.id"
              class="attachment-file-chip"
            >
              <div class="file-badge-icon">
                <IconFile :size="14" />
              </div>
              <div class="file-badge-text">
                <span class="file-badge-name">{{ file.name }}</span>
                <span v-if="file.size" class="file-badge-size">{{ formatFileSize(file.size) }}</span>
              </div>
              <button
                class="remove-file-btn"
                type="button"
                aria-label="Remove file"
                @click="removeAttachedFile(idx)"
              >
                <IconX :size="11" />
              </button>
            </div>
          </div>

          <div class="composer-main-row">
            <!-- Upload / Attach Button -->
            <button
              class="tool-circle-btn"
              type="button"
              title="Add attachment, code file, or image"
              @click="triggerFileUpload"
            >
              <IconPlus :size="16" />
            </button>

            <textarea
              ref="textareaRef"
              v-model="input"
              class="composer-input"
              :placeholder="activeMode === 'workflow' ? 'Describe the workflow you want SMAgen to run...' : 'Write a message, attach files or images...'"
              rows="1"
              @paste="handlePaste"
              @keydown.enter.exact.prevent="send"
            ></textarea>

            <div class="composer-actions-right">
              <button
                class="tool-btn-pill"
                type="button"
                :class="{ active: activeMode === 'workflow' }"
                @click="activeMode = activeMode === 'workflow' ? 'chat' : 'workflow'"
              >
                <IconBulb :size="13" />
                <span>Workflow</span>
              </button>
              <!-- Stop Button when generating vs Start/Send Button when idle -->
              <button
                v-if="loading"
                class="stop-button"
                type="button"
                title="Stop generating"
                aria-label="Stop generating"
                @click="stopGeneration"
              >
                <IconPlayerStop :size="14" />
              </button>
              <button
                v-else
                class="send-button"
                type="button"
                :disabled="!input.trim() && !attachedImages.length && !attachedFiles.length"
                title="Send message"
                aria-label="Send message"
                @click="send"
              >
                <IconArrowUp :size="16" />
              </button>
            </div>
          </div>
        </div>

        <div class="chat-footer-bar">
          <span class="footer-disclaimer">SMAgen is AI and can make mistakes. Please double-check responses.</span>
          <div class="footer-model-badge">
            <span class="status-dot"></span>
            <span>SMAgen Pro</span>
          </div>
        </div>
      </div>

      <!-- Lightbox Image Modal -->
      <div v-if="previewImageUrl" class="image-lightbox-overlay" @click="previewImageUrl = null">
        <div class="image-lightbox-card" @click.stop>
          <button class="lightbox-close" type="button" @click="previewImageUrl = null" aria-label="Close image">
            <IconX :size="18" />
          </button>
          <img :src="previewImageUrl" alt="Enlarged view" class="lightbox-img" />
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import {
  IconCheck,
  IconCopy,
  IconFile,
  IconInfoCircle,
  IconRefresh,
  IconPencil,
  IconChevronDown,
  IconChevronRight,
  IconX,
  IconPlus,
  IconBulb,
  IconPlayerStop,
  IconArrowUp,
  IconArrowRight,
  IconShieldCheck,
  IconTerminal2,
  IconLoader2,
} from '@tabler/icons-vue'
import { api, ApiError } from '@/services/api'
import { createSocketClient } from '@/services/socket'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { renderMarkdown } from '@/utils/markdown'
import { formatRelativeTime } from '@/utils/formatters'

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

const chatThreadRef = ref(null)
const showScrollButton = ref(false)
const textareaRef = ref(null)
const fileInputRef = ref(null)
const runs = ref([])
const input = ref('')
const activeMode = ref('chat')
const loading = ref(false)
const errorMessage = ref('')
const copiedIndex = ref(null)
const attachedImages = ref([])
const attachedFiles = ref([])
const previewImageUrl = ref(null)
const streamingContent = ref('')
const workflowPollers = new Map()
const workflowRefreshes = new Set()

const currentMessages = computed(() => chatStore.messages)

const workflowApprovalOptions = (tool = 'this action') => [
  { number: '1', value: 'allow_once', label: 'Yes, allow this time' },
  { number: '2', value: 'allow_conversation', label: `Yes, and always allow '${tool}' in this conversation` },
  { number: '3', value: 'allow_project', label: `Yes, and always allow '${tool}' in this project` },
  { number: '4', value: 'allow_always', label: `Yes, and always allow '${tool}'` },
  { number: '5', value: 'reject', label: 'No (tell SMAgen what to do instead)' },
]

const workflowStatusClass = (workflow) => {
  if (workflow?.approval || workflow?.status === 'AWAITING_APPROVAL') return 'awaiting-approval'
  return String(workflow?.status || 'starting').toLowerCase().replace(/[^a-z0-9_-]/g, '-')
}

const workflowStatusLabel = (workflow) => {
  if (workflow?.approval || workflow?.status === 'AWAITING_APPROVAL') return 'ACTION REQUIRED'
  const status = String(workflow?.status || 'STARTING').toUpperCase()
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'COMPLETED'
  if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED'
  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'STARTING') return 'STARTING'
  return 'RUNNING'
}

const workflowStatusTitle = (workflow) => {
  const status = String(workflow?.status || '').toUpperCase()
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'Workflow completed'
  if (status === 'FAILED' || status === 'CANCELLED') return 'Workflow stopped'
  if (status === 'REJECTED') return 'Workflow approval rejected'
  return 'Workflow is running'
}

const workflowStatusMessage = (workflow) => {
  const status = String(workflow?.status || '').toUpperCase()
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'All workflow steps completed successfully.'
  if (status === 'FAILED' || status === 'CANCELLED') return 'The workflow stopped. Open the run for details.'
  if (status === 'REJECTED') return 'The approval was rejected and the workflow will not continue.'
  if (status === 'STARTING' || status === 'PENDING') return 'Starting the workflow and waiting for its first update…'
  return 'The workflow is running. This card will update automatically.'
}

const stringifyWorkflowValue = (value, fallback = '') => {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const isWorkflowRunning = (workflow) => {
  const status = String(workflow?.status || '').toUpperCase()
  return ['STARTING', 'PENDING', 'RUNNING', 'AWAITING_APPROVAL'].includes(status)
}

const toggleStreamOpen = (workflow) => {
  if (workflow) {
    workflow.isStreamOpen = workflow.isStreamOpen === false ? true : false
  }
}

const isStepExpanded = (workflow, stepId) => {
  return Boolean(workflow?.expandedSteps?.[stepId])
}

const toggleStepExpanded = (workflow, stepId) => {
  if (!workflow) return
  if (!workflow.expandedSteps) workflow.expandedSteps = {}
  workflow.expandedSteps[stepId] = !workflow.expandedSteps[stepId]
}

const getStreamHeading = (workflow) => {
  const tasks = workflow?.tasks || []
  const completed = tasks.filter((t) => ['COMPLETED', 'SUCCESS'].includes(String(t.status || '').toUpperCase())).length
  const total = tasks.length

  if (isWorkflowRunning(workflow)) {
    if (total > 0) {
      return `Executing workflow (${completed}/${total} steps completed)`
    }
    return 'Initializing workflow execution…'
  }

  const status = String(workflow?.status || '').toUpperCase()
  if (status === 'COMPLETED' || status === 'SUCCESS') {
    return `All ${total || completed || 'workflow'} steps completed successfully`
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'Workflow execution stopped'
  }
  return 'Workflow execution steps'
}

const getWorkflowSteps = (workflow) => {
  if (!workflow) return []
  const tasks = workflow.tasks || []
  if (tasks.length > 0) {
    return tasks.map((task, idx) => {
      const status = String(task.status || 'PENDING').toUpperCase()
      const isRunning = status === 'RUNNING'
      const isCompleted = ['COMPLETED', 'SUCCESS'].includes(status)
      const isFailed = ['FAILED', 'CANCELLED'].includes(status)
      const isApproval = status === 'AWAITING_APPROVAL'

      let label = ''
      if (task.assigned_tool) {
        label = `Ran ${task.assigned_tool}: ${task.title || task.instruction || 'Action'}`
      } else {
        label = task.title || task.instruction || `Step ${idx + 1}`
      }

      return {
        id: task.id || `task_${idx}`,
        label,
        isRunning,
        isCompleted,
        isFailed,
        isApproval,
        statusClass: isRunning ? 'running' : (isCompleted ? 'completed' : (isFailed ? 'failed' : (isApproval ? 'approval' : 'pending'))),
        toolInput: task.tool_input ? (typeof task.tool_input === 'string' ? task.tool_input : JSON.stringify(task.tool_input, null, 2)) : null,
        output: task.output ? (typeof task.output === 'string' ? task.output : JSON.stringify(task.output, null, 2)) : null,
        duration: task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : '',
      }
    })
  }

  if (isWorkflowRunning(workflow)) {
    return [
      {
        id: 'init_plan',
        label: `Analyzing goal: "${(workflow.goalPrompt || '').slice(0, 48)}…"`,
        isRunning: true,
        isCompleted: false,
        statusClass: 'running',
      },
    ]
  }

  return []
}

const getCurrentWorkingText = (workflow) => {
  const runningTask = (workflow?.tasks || []).find((t) => String(t.status).toUpperCase() === 'RUNNING')
  if (runningTask) {
    return `Working on: ${runningTask.assigned_tool ? runningTask.assigned_tool + ' — ' : ''}${runningTask.title || runningTask.instruction || 'task'}`
  }
  if (workflow?.approval || workflow?.status === 'AWAITING_APPROVAL') {
    return 'Paused: Awaiting security authorization'
  }
  return 'Working'
}

const updateWorkflowMessage = (index, patch) => {
  const message = currentMessages.value[index]
  if (!message?.workflow) return null

  const nextWorkflow = {
    ...message.workflow,
    ...patch,
  }

  if (patch && Object.prototype.hasOwnProperty.call(patch, 'approval')) {
    nextWorkflow.approval = patch.approval
      ? { ...message.workflow.approval, ...patch.approval }
      : null
  }

  return chatStore.updateMessage(index, { workflow: nextWorkflow })
}

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const autoResizeTextarea = () => {
  nextTick(() => {
    if (!textareaRef.value) return
    textareaRef.value.style.height = 'auto'
    const newHeight = Math.min(textareaRef.value.scrollHeight, 180)
    textareaRef.value.style.height = `${newHeight}px`
  })
}

watch(input, () => {
  autoResizeTextarea()
})

const handleScroll = () => {
  if (!chatThreadRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = chatThreadRef.value
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 120
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatThreadRef.value) {
    chatThreadRef.value.scrollTop = chatThreadRef.value.scrollHeight
    showScrollButton.value = false
  }
}

watch([currentMessages, loading], () => {
  scrollToBottom()
}, { deep: true })

// Upload and Paste Handling for Images and Code/Document Files
const processUploadedFile = (file) => {
  if (!file) return
  const isImg = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)
  if (isImg) {
    const reader = new FileReader()
    reader.onload = (e) => {
      attachedImages.value.push({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name || 'Pasted Image',
        dataUrl: e.target.result,
        size: file.size,
      })
    }
    reader.readAsDataURL(file)
  } else {
    // Read code / text / document file content
    const reader = new FileReader()
    reader.onload = (e) => {
      const ext = file.name ? file.name.split('.').pop().toLowerCase() : ''
      attachedFiles.value.push({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name || 'uploaded_file',
        size: file.size,
        ext,
        content: e.target.result,
      })
    }
    reader.readAsText(file)
  }
}

const handlePaste = (e) => {
  const items = e.clipboardData?.items || []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        processUploadedFile(file)
      }
    }
  }
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || [])
  files.forEach(processUploadedFile)
  e.target.value = ''
}

const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const removeAttachedImage = (index) => {
  attachedImages.value.splice(index, 1)
}

const removeAttachedFile = (index) => {
  attachedFiles.value.splice(index, 1)
}

const copiedUserIndex = ref(null)
const editingIndex = ref(null)
const editDraft = ref('')

const copyUserMessage = async (content, index) => {
  try {
    await navigator.clipboard.writeText(content)
    copiedUserIndex.value = index
    setTimeout(() => {
      if (copiedUserIndex.value === index) copiedUserIndex.value = null
    }, 2000)
  } catch {}
}

const formatPromptWithFiles = (text, files = []) => {
  if (!files || files.length === 0) return text
  const filesContentPrompt = files
    .map((f) => `### Uploaded File: \`${f.name}\`\n\`\`\`${f.ext || ''}\n${f.content}\n\`\`\``)
    .join('\n\n')
  return text
    ? `${text}\n\n${filesContentPrompt}`
    : `I have uploaded the following file(s). Please review, inspect, and analyze:\n\n${filesContentPrompt}`
}

const startEditUserMessage = (index, content) => {
  editingIndex.value = index
  editDraft.value = content
}

const cancelEditUserMessage = () => {
  editingIndex.value = null
  editDraft.value = ''
}

let activeAbortController = null

const stopGeneration = () => {
  if (activeAbortController) {
    activeAbortController.abort()
  }
}

const commitStreamingResponse = () => {
  const content = streamingContent.value
  if (content) {
    chatStore.addMessage({ role: 'assistant', content })
  }
  streamingContent.value = ''
}

const requestChatReply = async (prompt, history, signal) => {
  streamingContent.value = ''
  let receivedChunk = false

  try {
    await api.chatStream(prompt, history, {
      signal,
      onChunk: (chunk) => {
        if (!chunk) return
        receivedChunk = true
        streamingContent.value += chunk
        scrollToBottom()
      },
    })
  } catch (streamError) {
    if (streamError.name === 'AbortError' || signal.aborted) throw streamError

    // Preserve the existing history-validation fallback for older API deployments.
    if (history.length > 0 && !receivedChunk) {
      const response = await api.chat(prompt, [], { signal })
      streamingContent.value = response?.data?.message || 'I could not generate a response.'
      return
    }
    throw streamError
  }

  if (!streamingContent.value) {
    streamingContent.value = 'I could not generate a response.'
  }
}

const submitEditUserMessage = async (index) => {
  const newText = editDraft.value.trim()
  if (!newText || loading.value) return

  const originalMessage = currentMessages.value[index]
  const messageFiles = originalMessage?.files || []

  editingIndex.value = null
  editDraft.value = ''

  // Truncate and update in store
  chatStore.editMessage(index, newText)

  // Calculate sanitized history prior to this message
  const messagesSoFar = currentMessages.value.slice(0, index)
  const history = messagesSoFar
    .filter((item) => item.content && typeof item.content === 'string' && item.content.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content).slice(0, 10000),
    }))

  if (activeAbortController) {
    activeAbortController.abort()
  }
  activeAbortController = new AbortController()
  const signal = activeAbortController.signal

  loading.value = true
  errorMessage.value = ''
  scrollToBottom()

  try {
    const fullPrompt = formatPromptWithFiles(newText, messageFiles)
    await requestChatReply(fullPrompt, history, signal)
  } catch (error) {
    if (error.name === 'AbortError' || signal.aborted) {
      return
    }
    errorMessage.value = error instanceof ApiError ? error.message : 'Failed to generate a reply.'
  } finally {
    commitStreamingResponse()
    activeAbortController = null
    loading.value = false
    scrollToBottom()
  }
}

const retryUserMessage = async (index) => {
  const message = currentMessages.value[index]
  if (!message || loading.value) return

  chatStore.editMessage(index, message.content)

  const messagesSoFar = currentMessages.value.slice(0, index)
  const history = messagesSoFar
    .filter((item) => item.content && typeof item.content === 'string' && item.content.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content).slice(0, 10000),
    }))

  if (activeAbortController) {
    activeAbortController.abort()
  }
  activeAbortController = new AbortController()
  const signal = activeAbortController.signal

  loading.value = true
  errorMessage.value = ''
  scrollToBottom()

  try {
    const fullPrompt = formatPromptWithFiles(message.content, message.files || [])
    await requestChatReply(fullPrompt, history, signal)
  } catch (error) {
    if (error.name === 'AbortError' || signal.aborted) {
      return
    }
    errorMessage.value = error instanceof ApiError ? error.message : 'Failed to generate a reply.'
  } finally {
    commitStreamingResponse()
    activeAbortController = null
    loading.value = false
    scrollToBottom()
  }
}

const copyMessage = async (content, index) => {
  try {
    await navigator.clipboard.writeText(content)
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null
    }, 2000)
  } catch {}
}

const loadRuns = async () => {
  try {
    const response = await api.listRuns()
    runs.value = response?.data || []
  } catch {
    runs.value = []
  }
}

const isTerminalWorkflowStatus = (status) => [
  'COMPLETED',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'REJECTED',
].includes(String(status || '').toUpperCase())

const stopWorkflowPolling = (runId) => {
  const poller = workflowPollers.get(String(runId))
  if (poller) {
    window.clearInterval(poller)
    workflowPollers.delete(String(runId))
  }
}

const findWorkflowApproval = async (run, task, runId, existingApproval = null) => {
  let approval = null
  try {
    const response = await api.listApprovals()
    const approvals = Array.isArray(response?.data) ? response.data : []
    approval = approvals.find((item) => {
      if (task?.id && (String(item.task_id) === String(task.id) || String(item.taskId) === String(task.id))) return true
      return String(item.run_id || item.runId) === String(runId)
    }) || null
  } catch {
    // The run/task state is still enough to render a local approval request.
  }

  if (approval?.id) {
    const details = await api.getApproval(approval.id).catch(() => ({ data: approval }))
    approval = { ...approval, ...(details?.data || {}) }
  }

  const approvalId = approval?.id || existingApproval?.id || `virtual-${runId}`
  return {
    id: approvalId,
    taskId: task?.id || approval?.task_id || approval?.taskId || existingApproval?.taskId || null,
    taskTitle: task?.title || approval?.task_title || approval?.taskTitle || existingApproval?.taskTitle || 'Approval required',
    assignedTool: task?.assigned_tool || approval?.assigned_tool || approval?.assignedTool || existingApproval?.assignedTool || 'workflow action',
    actionSummary: approval?.action_summary || approval?.actionSummary || task?.instruction || existingApproval?.actionSummary || run?.goal_prompt || 'Approval required for this action.',
    toolInput: approval?.tool_input || approval?.toolInput || task?.tool_input || existingApproval?.toolInput || '',
    choice: existingApproval?.choice || 'allow_once',
    rejectionReason: existingApproval?.rejectionReason || '',
  }
}

const refreshWorkflowMessage = async (index, runId) => {
  const key = `${chatStore.activeSessionId}:${index}:${runId}`
  if (workflowRefreshes.has(key)) return
  workflowRefreshes.add(key)

  try {
    const response = await api.getRun(String(runId))
    const workflowRun = response?.data || {}
    const awaitingTask = (workflowRun.tasks || []).find((task) => task.status === 'AWAITING_APPROVAL')
    const awaitingApproval = workflowRun.status === 'AWAITING_APPROVAL' || Boolean(awaitingTask)
    const existingApproval = currentMessages.value[index]?.workflow?.approval || null

    if (awaitingApproval) {
      const approval = await findWorkflowApproval(workflowRun, awaitingTask, runId, existingApproval)
      updateWorkflowMessage(index, {
        status: 'AWAITING_APPROVAL',
        approval,
        tasks: workflowRun.tasks || [],
        logs: workflowRun.logs || [],
        error: '',
      })
    } else {
      const status = String(workflowRun.status || 'RUNNING').toUpperCase()
      updateWorkflowMessage(index, {
        status,
        approval: null,
        tasks: workflowRun.tasks || [],
        logs: workflowRun.logs || [],
        error: '',
      })
      if (isTerminalWorkflowStatus(status)) stopWorkflowPolling(runId)
    }
  } catch (error) {
    // Keep an already-visible approval card usable when a background refresh fails.
    if (!currentMessages.value[index]?.workflow?.approval) {
      updateWorkflowMessage(index, {
        error: error instanceof ApiError ? error.message : 'Unable to refresh workflow status.',
      })
    }
  } finally {
    workflowRefreshes.delete(key)
    scrollToBottom()
  }
}

const startWorkflowPolling = (index, runId) => {
  const key = String(runId)
  if (workflowPollers.has(key)) return

  refreshWorkflowMessage(index, runId)
  const poller = window.setInterval(() => {
    if (!currentMessages.value[index]?.workflow) {
      stopWorkflowPolling(runId)
      return
    }
    refreshWorkflowMessage(index, runId)
  }, 2000)
  workflowPollers.set(key, poller)

  if (workflowSocket) {
    try {
      workflowSocket.emit('join_run', key)
    } catch {}
  }
}

const skipWorkflowApproval = (message) => {
  const index = currentMessages.value.indexOf(message)
  if (index === -1) return
  updateWorkflowMessage(index, {
    error: 'This approval is still pending. Select an option and press Submit when you are ready.',
  })
}

const submitWorkflowApproval = async (message) => {
  const index = currentMessages.value.indexOf(message)
  const workflow = index === -1 ? null : currentMessages.value[index]?.workflow
  const approval = workflow?.approval
  if (!workflow || !approval || workflow.decisionPending) return

  const isRejecting = approval.choice === 'reject'
  if (isRejecting && !approval.rejectionReason?.trim()) {
    updateWorkflowMessage(index, { error: 'Tell SMAgen what to do instead before submitting.' })
    return
  }

  updateWorkflowMessage(index, { decisionPending: true, error: '' })
  const approvalId = String(approval.id || '')
  const isRealApproval = approvalId && !approvalId.startsWith('virtual-')
  const status = isRejecting ? 'REJECTED' : 'APPROVED'
  let backendHandled = false

  try {
    if (isRealApproval) {
      try {
        await api.decideApproval(approvalId, {
          status,
          ...(isRejecting ? { rejectionReason: approval.rejectionReason.trim() } : {}),
        })
        backendHandled = true
      } catch (error) {
        // Older deployments only resume runs directly, so preserve that fallback.
        if (status === 'REJECTED') throw error
      }
    }

    if (status === 'APPROVED' && !backendHandled) {
      await api.resumeWorkflow(String(workflow.runId))
    }

    updateWorkflowMessage(index, {
      status: status === 'APPROVED' ? 'RUNNING' : 'REJECTED',
      approval: null,
      decisionPending: false,
      error: '',
    })
    await refreshWorkflowMessage(index, workflow.runId)
  } catch (error) {
    updateWorkflowMessage(index, {
      decisionPending: false,
      error: error instanceof ApiError ? error.message : 'Unable to submit this workflow decision.',
    })
  }
}

const send = async () => {
  const message = input.value.trim()
  const images = [...attachedImages.value.map((img) => img.dataUrl)]
  const files = [...attachedFiles.value]

  if ((!message && images.length === 0 && files.length === 0) || loading.value) return
  errorMessage.value = ''

  // Format code/file contents into full prompt for AI analysis
  let fullPrompt = message
  if (files.length > 0) {
    const filesContentPrompt = files
      .map((f) => `### Uploaded File: \`${f.name}\`\n\`\`\`${f.ext || ''}\n${f.content}\n\`\`\``)
      .join('\n\n')
    if (fullPrompt) {
      fullPrompt = `${fullPrompt}\n\n${filesContentPrompt}`
    } else {
      fullPrompt = `I have uploaded the following file(s). Please review, inspect, and analyze:\n\n${filesContentPrompt}`
    }
  }

  if (activeMode.value === 'workflow') {
    chatStore.addMessage({
      role: 'user',
      content: message,
      images,
      files,
    })

    const workflowMessageIndex = currentMessages.value.length
    chatStore.addMessage({
      role: 'assistant',
      content: '',
      workflow: {
        runId: null,
        goalPrompt: message || (files.length ? 'Run a workflow using the uploaded file(s).' : 'Run workflow'),
        status: 'STARTING',
        approval: null,
        decisionPending: false,
        tasks: [],
        logs: [],
        isStreamOpen: true,
        expandedSteps: {},
        error: '',
      },
    })

    input.value = ''
    attachedImages.value = []
    attachedFiles.value = []
    autoResizeTextarea()
    loading.value = true
    scrollToBottom()
    try {
      const response = await api.runWorkflow({ goalPrompt: fullPrompt })
      const runId = response?.data?.runId || response?.runId
      if (!runId) throw new ApiError('The workflow started without a run ID.')

      updateWorkflowMessage(workflowMessageIndex, {
        runId: String(runId),
        status: 'RUNNING',
        error: '',
      })
      startWorkflowPolling(workflowMessageIndex, String(runId))
    } catch (error) {
      updateWorkflowMessage(workflowMessageIndex, {
        status: 'FAILED',
        error: error instanceof ApiError ? error.message : 'Unable to start the workflow.',
      })
    } finally {
      loading.value = false
      scrollToBottom()
    }
    return
  }

  // Get sanitized history before appending current message
  const history = currentMessages.value
    .filter((item) => item.content && typeof item.content === 'string' && item.content.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content).slice(0, 10000),
    }))

  // Add user message to active chat session
  chatStore.addMessage({
    role: 'user',
    content: message,
    images,
    files,
  })

  input.value = ''
  attachedImages.value = []
  attachedFiles.value = []
  autoResizeTextarea()
  loading.value = true
  scrollToBottom()

  if (activeAbortController) {
    activeAbortController.abort()
  }
  activeAbortController = new AbortController()
  const signal = activeAbortController.signal

  try {
    const promptToSend = fullPrompt || (images.length ? 'I have attached an image. Please review it.' : '')
    await requestChatReply(promptToSend, history, signal)
  } catch (error) {
    if (error.name === 'AbortError' || signal.aborted) {
      return
    }
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to generate a response.'
  } finally {
    commitStreamingResponse()
    activeAbortController = null
    loading.value = false
    scrollToBottom()
  }
}

const startPrompt = (prompt) => {
  input.value = prompt
  autoResizeTextarea()
}

let workflowSocket = null

onMounted(() => {
  loadRuns()
  if (chatThreadRef.value) {
    chatThreadRef.value.addEventListener('scroll', handleScroll)
  }
  currentMessages.value.forEach((message, index) => {
    if (message.workflow?.runId && !isTerminalWorkflowStatus(message.workflow.status)) {
      startWorkflowPolling(index, message.workflow.runId)
    }
  })

  workflowSocket = createSocketClient()
  if (workflowSocket) {
    const refreshEvents = [
      'telemetry',
      'task_started',
      'task_completed',
      'task_failed',
      'approval_required',
      'workflow_completed',
      'workflow_failed',
      'run_status_changed',
    ]
    refreshEvents.forEach((evt) => {
      workflowSocket.on(evt, (payload) => {
        const runId = payload?.runId || payload?.run_id
        if (runId) {
          const idx = currentMessages.value.findIndex((m) => String(m.workflow?.runId) === String(runId))
          if (idx !== -1) refreshWorkflowMessage(idx, runId)
        } else {
          currentMessages.value.forEach((m, idx) => {
            if (m.workflow?.runId && isWorkflowRunning(m.workflow)) {
              refreshWorkflowMessage(idx, m.workflow.runId)
            }
          })
        }
      })
    })
  }
})

onUnmounted(() => {
  if (chatThreadRef.value) {
    chatThreadRef.value.removeEventListener('scroll', handleScroll)
  }
  workflowPollers.forEach((poller) => window.clearInterval(poller))
  workflowPollers.clear()
  if (workflowSocket) {
    try {
      workflowSocket.disconnect()
    } catch {}
    workflowSocket = null
  }
})
</script>

<style scoped>
.workflow-chat-card {
  width: min(680px, 100%);
  overflow: hidden;
  border: 1px solid #303238;
  border-radius: 16px;
  color: #e5e7eb;
  background: #191a1c;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}

.workflow-chat-card.awaiting-approval {
  border-color: #3b3d43;
}

.workflow-chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 18px 0;
}

.workflow-chat-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.workflow-terminal-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #44474e;
  border-radius: 8px;
  color: #d1d5db;
  background: #24262a;
}

.workflow-chat-eyebrow {
  margin-bottom: 2px;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.workflow-chat-card h3 {
  margin: 0;
  color: #f3f4f6;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.workflow-status-pill {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid #3f4248;
  border-radius: 999px;
  color: #aeb4bf;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.07em;
}

.workflow-chat-card.awaiting-approval .workflow-status-pill {
  border-color: #74501b;
  color: #fbbf24;
  background: rgba(120, 75, 16, 0.22);
}

.workflow-chat-prompt {
  margin: 13px 18px 0;
  color: #b9bdc6;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.workflow-approval-panel {
  margin: 16px 12px 12px;
  padding: 13px;
  border: 1px solid #2e3035;
  border-radius: 12px;
  background: #202124;
}

.workflow-approval-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f3f4f6;
  font-size: 13px;
  font-weight: 600;
}

.workflow-approval-meta svg {
  flex: 0 0 auto;
  color: #fbbf24;
}

.workflow-command-box {
  display: grid;
  gap: 7px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid #25272c;
  border-radius: 8px;
  background: #151619;
}

.workflow-command-label {
  color: #9ca3af;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workflow-command-box code {
  display: block;
  max-height: 120px;
  overflow: auto;
  color: #d1d5db;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.workflow-choice-list {
  display: grid;
  gap: 5px;
  margin-top: 12px;
}

.workflow-choice {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 34px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #c5c8ce;
  font-size: 12.5px;
  line-height: 1.3;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.workflow-choice:hover,
.workflow-choice.selected {
  border-color: #3b3e45;
  color: #f3f4f6;
  background: #292b30;
}

.workflow-choice input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #168bd7;
}

.workflow-choice-number {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 5px;
  color: #aeb4bf;
  background: #303238;
  font-size: 11px;
  font-weight: 700;
}

.workflow-rejection-input {
  width: 100%;
  margin-top: 9px;
  padding: 9px 10px;
  border: 1px solid #3b3e45;
  border-radius: 8px;
  outline: none;
  color: #e5e7eb;
  background: #151619;
  font: inherit;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;
}

.workflow-rejection-input:focus {
  border-color: #168bd7;
}

.workflow-card-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  color: #fecaca;
  background: rgba(127, 29, 29, 0.28);
  font-size: 11.5px;
  line-height: 1.4;
}

.workflow-approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 13px;
}

.workflow-skip-btn,
.workflow-submit-btn,
.workflow-open-btn {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.workflow-skip-btn {
  padding: 7px 4px;
  color: #9ca3af;
  background: transparent;
  font-size: 12px;
}

.workflow-skip-btn:hover {
  color: #f3f4f6;
}

.workflow-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 7px;
  color: #ffffff;
  background: #0788d9;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 3px 10px rgba(7, 136, 217, 0.24);
}

.workflow-submit-btn:hover:not(:disabled) {
  background: #0a9be9;
}

.workflow-submit-btn:disabled,
.workflow-skip-btn:disabled {
  cursor: wait;
  opacity: 0.6;
}

.workflow-chat-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 18px 17px;
  color: #aeb4bf;
  font-size: 12px;
}

.workflow-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);
}

.workflow-status-dot.completed,
.workflow-status-dot.success {
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.12);
}

.workflow-status-dot.failed,
.workflow-status-dot.rejected,
.workflow-status-dot.cancelled {
  background: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.12);
}

.workflow-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 0;
  color: #7ebce9;
  background: transparent;
  font-size: 11.5px;
}

.workflow-open-btn:hover {
  color: #bae0fd;
}

/* Live Stream Activity Feed (Antigravity-style) */
.workflow-live-stream {
  margin: 14px 16px 12px;
  border: 1px solid #2a2c32;
  border-radius: 10px;
  background: #141517;
  overflow: hidden;
}

.stream-toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 13px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.stream-toggle-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.stream-toggle-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stream-icon-sparkle {
  display: flex;
  align-items: center;
  color: #94a3b8;
}

.stream-chevron {
  color: #64748b;
  transition: transform 0.2s ease;
}

.stream-chevron.chevron-up {
  transform: rotate(180deg);
}

.stream-content {
  padding: 4px 10px 10px;
  border-top: 1px solid #222429;
}

.stream-step-row {
  margin-top: 3px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.stream-step-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.stream-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: pointer;
  user-select: none;
}

.stream-step-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.stream-step-icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: #94a3b8;
  flex-shrink: 0;
}

.stream-step-icon.running {
  color: #60a5fa;
}

.stream-step-icon.completed {
  color: #34d399;
}

.stream-step-icon.failed {
  color: #f87171;
}

.stream-step-icon.approval {
  color: #fb923c;
}

.stream-step-label {
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stream-shield-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
  margin-left: 4px;
}

.stream-step-right {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  flex-shrink: 0;
}

.stream-step-duration {
  font-size: 11px;
  color: #64748b;
}

.step-chevron {
  transition: transform 0.2s ease;
}

.stream-step-row.expanded .step-chevron {
  transform: rotate(90deg);
}

.stream-step-body {
  padding: 4px 8px 8px 26px;
}

.stream-code-block {
  margin-top: 6px;
  background: #090a0b;
  border: 1px solid #1f2126;
  border-radius: 6px;
  overflow: hidden;
}

.stream-code-block .code-label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  padding: 3px 8px;
  background: #111215;
  border-bottom: 1px solid #1f2126;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stream-code-block pre {
  margin: 0;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #a5b4fc;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.stream-working-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px 4px;
  color: #94a3b8;
  font-size: 12px;
}

.working-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
  animation: pulse-dot 1.5s infinite ease-in-out;
}

.working-text {
  font-weight: 500;
  color: #94a3b8;
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.text-green {
  color: #34d399;
}

.user-message-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  width: fit-content;
  max-width: 85%;
  align-self: flex-end;
}

.user-bubble-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  width: fit-content;
  max-width: 100%;
}

.user-bubble {
  background: #f3f4f6;
  color: #18181b;
  border-radius: 18px;
  padding: 10px 18px;
  font-size: 14.5px;
  line-height: 1.45;
  letter-spacing: -0.01em;
  display: inline-block;
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: break-word;
  width: fit-content;
  max-width: 100%;
}

.user-meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 0 4px;
  white-space: nowrap;
  flex-shrink: 0;
  width: fit-content;
}

.user-time {
  font-size: 12px;
  color: #71717a;
  font-weight: 400;
  margin-right: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.user-action-btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  padding: 0;
  transition: color 0.12s ease, background 0.12s ease;
}

.user-action-btn:hover {
  color: #18181b;
  background: #f4f4f5;
}

.user-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-inline-editor-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  width: fit-content;
  max-width: 85%;
}

.user-inline-edit-bubble {
  background: #ffffff;
  border: 1.5px solid #2563eb;
  border-radius: 18px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  width: fit-content;
  min-width: 180px;
  max-width: 100%;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.edit-textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14.5px;
  line-height: 1.45;
  color: #18181b;
  resize: none;
  padding: 0;
  margin: 0;
}

.user-edit-actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 4px;
}

.edit-info-icon {
  display: grid;
  place-items: center;
  color: #71717a;
  cursor: help;
}

.edit-cancel-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: #18181b;
  cursor: pointer;
  transition: opacity 0.12s ease;
}

.edit-cancel-btn:hover {
  opacity: 0.7;
}

.edit-save-btn {
  border: none;
  background: #71717a;
  color: #ffffff;
  padding: 5px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.edit-save-btn:hover {
  background: #52525b;
}

.message-images-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.message-thumbnail {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.message-thumbnail:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.composer-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px 4px;
}

.attachment-chip {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

.attachment-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-attachment-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
}

.remove-attachment-btn:hover {
  background: rgba(220, 38, 38, 0.9);
}

.message-files-gallery {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.message-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  padding: 6px 12px;
  color: #18181b;
  font-size: 13px;
  max-width: 280px;
}

.file-chip-icon {
  display: grid;
  place-items: center;
  color: #3b82f6;
}

.file-chip-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
}

.file-chip-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-chip-size {
  font-size: 11px;
  color: #71717a;
  white-space: nowrap;
}

.attachment-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  font-size: 12.5px;
  max-width: 220px;
}

.file-badge-icon {
  display: grid;
  place-items: center;
  color: #2563eb;
  flex-shrink: 0;
}

.file-badge-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  line-height: 1.2;
}

.file-badge-name {
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-badge-size {
  font-size: 10.5px;
  color: #64748b;
}

.remove-file-btn {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  margin-left: 2px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.remove-file-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Lightbox Modal */
.image-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(4px);
  padding: 20px;
}

.image-lightbox-card {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.lightbox-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
