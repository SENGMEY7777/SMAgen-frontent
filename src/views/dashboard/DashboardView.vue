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
                <!-- Inline Workflow Execution Card if message is a workflow -->
                <div v-if="message.workflow" class="chat-workflow-card">
                  <div class="workflow-card-head">
                    <div class="workflow-title-wrap">
                      <IconGitFork :size="16" class="workflow-icon" />
                      <span class="workflow-goal" :title="message.workflow.goalPrompt">{{ message.workflow.goalPrompt }}</span>
                    </div>
                    <StatusPill :status="message.workflow.status" />
                  </div>

                  <!-- Workflow Tasks Progress Nodes -->
                  <div v-if="message.workflow.tasks && message.workflow.tasks.length" class="workflow-tasks-progress">
                    <div
                      v-for="task in message.workflow.tasks"
                      :key="task.id"
                      class="task-progress-item"
                      :class="task.status?.toLowerCase()"
                    >
                      <span class="task-status-indicator"></span>
                      <span class="task-name">{{ task.title || task.instruction || task.node_key }}</span>
                      <span class="task-tool-tag">{{ task.assigned_tool }}</span>
                    </div>
                  </div>

                  <!-- Interactive Permission Prompt Card (matching user screenshot) -->
                  <div v-if="message.workflow.approval" class="permission-prompt-card">
                    <div class="prompt-header">
                      <IconFileText :size="16" class="prompt-icon" />
                      <span class="prompt-title">{{ message.workflow.approval.promptTitle || "Allow read access to this path?" }}</span>
                    </div>

                    <div class="prompt-target-box">
                      <code>{{ message.workflow.approval.path || '/workspace/environment' }}</code>
                    </div>

                    <div class="prompt-options-list">
                      <button
                        class="prompt-option-row"
                        :class="{ selected: (message.workflow.selectedOption || 3) === 1 }"
                        type="button"
                        @click="message.workflow.selectedOption = 1"
                      >
                        <span class="option-num-badge">1</span>
                        <span class="option-label">Yes, allow this time</span>
                      </button>

                      <button
                        class="prompt-option-row"
                        :class="{ selected: (message.workflow.selectedOption || 3) === 2 }"
                        type="button"
                        @click="message.workflow.selectedOption = 2"
                      >
                        <span class="option-num-badge">2</span>
                        <span class="option-label">Yes, and always allow in this conversation</span>
                      </button>

                      <button
                        class="prompt-option-row"
                        :class="{ selected: (message.workflow.selectedOption || 3) === 3 }"
                        type="button"
                        @click="message.workflow.selectedOption = 3"
                      >
                        <span class="option-num-badge">3</span>
                        <span class="option-label">Yes, and always allow in this project</span>
                      </button>

                      <button
                        class="prompt-option-row"
                        :class="{ selected: (message.workflow.selectedOption || 3) === 4 }"
                        type="button"
                        @click="message.workflow.selectedOption = 4"
                      >
                        <span class="option-num-badge">4</span>
                        <span class="option-label">Yes, and always allow</span>
                      </button>

                      <button
                        class="prompt-option-row"
                        :class="{ selected: (message.workflow.selectedOption || 3) === 5 }"
                        type="button"
                        @click="message.workflow.selectedOption = 5"
                      >
                        <span class="option-num-badge">5</span>
                        <span class="option-label">No <small>(tell the agent what to do instead)</small></span>
                      </button>
                    </div>

                    <div class="prompt-footer-actions">
                      <button
                        class="prompt-skip-btn"
                        type="button"
                        :disabled="message.workflow.deciding"
                        @click="handleApprovalDecision(message.workflow, 5)"
                      >
                        Skip
                      </button>
                      <button
                        class="prompt-submit-btn"
                        type="button"
                        :disabled="message.workflow.deciding"
                        @click="handleApprovalDecision(message.workflow, message.workflow.selectedOption || 3)"
                      >
                        <span>{{ message.workflow.deciding ? 'Submitting…' : 'Submit ↵' }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Workflow Status Footer -->
                  <div class="workflow-card-footer">
                    <span v-if="message.workflow.status === 'RUNNING' || message.workflow.status === 'PLANNING'" class="footer-status-text">
                      <span class="spinner-dot"></span> Executing workflow tasks…
                    </span>
                    <span v-else-if="message.workflow.status === 'COMPLETED'" class="footer-status-text success">
                      ✓ Workflow completed successfully
                    </span>
                    <span v-else-if="message.workflow.status === 'FAILED'" class="footer-status-text failed">
                      ✕ Workflow halted or failed
                    </span>
                    <RouterLink :to="`/runs/${message.workflow.runId}`" class="view-canvas-link">
                      Inspect Canvas →
                    </RouterLink>
                  </div>
                </div>

                <div v-if="message.content" class="assistant-markdown" v-html="renderMarkdown(message.content)"></div>
                <div v-if="message.content" class="message-actions">
                  <button class="action-btn" type="button" @click="copyMessage(message.content, index)">
                    <component :is="copiedIndex === index ? IconCheck : IconCopy" :size="13" />
                    <span>{{ copiedIndex === index ? 'Copied' : 'Copy' }}</span>
                  </button>
                </div>
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
  IconFileText,
  IconGitFork,
  IconInfoCircle,
  IconRefresh,
  IconPencil,
  IconChevronDown,
  IconX,
  IconPlus,
  IconBulb,
  IconPlayerStop,
  IconArrowUp,
} from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
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

const currentMessages = computed(() => chatStore.messages)

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
    loading.value = true
    try {
      chatStore.addMessage({
        role: 'user',
        content: message || fullPrompt,
        images,
        files,
        mode: 'workflow',
      })

      const response = await api.runWorkflow({ goalPrompt: fullPrompt })
      const runId = response?.data?.runId

      if (runId) {
        chatStore.addMessage({
          role: 'assistant',
          content: '',
          workflow: {
            runId,
            status: 'PLANNING',
            goalPrompt: fullPrompt,
            tasks: [],
            selectedOption: 3,
            deciding: false,
            approval: null,
          },
        })

        const messagesList = chatStore.messages
        const lastMsg = messagesList[messagesList.length - 1]
        if (lastMsg?.workflow) {
          startWorkflowTracker(lastMsg.workflow)
        }
      }
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : 'Unable to start the workflow.'
    } finally {
      loading.value = false
      input.value = ''
      attachedImages.value = []
      attachedFiles.value = []
      autoResizeTextarea()
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


const activeWorkflowTimers = new Map()

const handleApprovalDecision = async (workflow, optionNumber) => {
  if (!workflow || workflow.deciding) return
  workflow.deciding = true
  const isApproved = optionNumber >= 1 && optionNumber <= 4
  const status = isApproved ? 'APPROVED' : 'REJECTED'
  const approvalId = workflow.approval?.id

  try {
    if (approvalId && !String(approvalId).startsWith('virtual-') && !String(approvalId).startsWith('task-')) {
      await api.decideApproval(approvalId, {
        status,
        ...(status === 'REJECTED' ? { rejectionReason: 'User rejected permission in chat' } : {}),
      }).catch((err) => console.warn('Decide approval notice:', err))
    }

    if (isApproved && workflow.runId) {
      await api.resumeWorkflow(workflow.runId).catch(() => {})
    }

    workflow.approval = null
    workflow.selectedOption = optionNumber
    workflow.status = isApproved ? 'RUNNING' : 'REJECTED'
  } catch (err) {
    console.error('Approval submission error:', err)
  } finally {
    workflow.deciding = false
    scrollToBottom()
  }
}

const startWorkflowTracker = (workflowObj) => {
  if (!workflowObj?.runId) return
  const runId = workflowObj.runId

  if (activeWorkflowTimers.has(runId)) {
    clearInterval(activeWorkflowTimers.get(runId))
  }

  const checkStatus = async () => {
    try {
      const res = await api.getRun(runId)
      const data = res?.data
      if (!data) return

      workflowObj.status = data.status
      if (data.goal_prompt && (!workflowObj.goalPrompt || workflowObj.goalPrompt === 'workflow')) {
        workflowObj.goalPrompt = data.goal_prompt
      }
      workflowObj.tasks = data.tasks || []

      const awaitingTask = workflowObj.tasks.find((t) => t.status === 'AWAITING_APPROVAL')
      if (data.status === 'AWAITING_APPROVAL' || awaitingTask) {
        if (!workflowObj.approval) {
          let approvalId = null
          try {
            const appRes = await api.listApprovals(runId)
            const appList = appRes?.data || []
            if (appList.length) approvalId = appList[0].id
          } catch {}

          let toolInput = awaitingTask?.tool_input
          let targetPath = ''
          if (toolInput) {
            try {
              const parsed = typeof toolInput === 'string' ? JSON.parse(toolInput) : toolInput
              if (parsed.path) {
                targetPath = parsed.action ? `${parsed.action}: ${parsed.path}` : parsed.path
              } else if (parsed.command) {
                targetPath = parsed.command
              } else if (parsed.file) {
                targetPath = parsed.file
              } else if (parsed.url) {
                targetPath = parsed.url
              } else if (typeof parsed === 'object') {
                targetPath = parsed.instruction || parsed.target || JSON.stringify(parsed)
              }
            } catch {
              targetPath = String(toolInput)
            }
          }

          if (!targetPath || targetPath === 'workflow') {
            targetPath = awaitingTask?.instruction || awaitingTask?.title || 'Execution Checkpoint'
          }

          const actionTool = awaitingTask?.assigned_tool || 'systemExecutor'
          const promptTitle = actionTool === 'executeCommand'
            ? 'Allow command execution?'
            : (actionTool === 'fileManager'
                ? 'Allow file & directory access?'
                : 'Allow permission for this action?')

          workflowObj.approval = {
            id: approvalId || `task-${awaitingTask?.id || 'pending'}`,
            path: targetPath,
            title: awaitingTask?.title || 'Security Permission Checkpoint',
            action: actionTool,
            promptTitle,
          }
          if (!workflowObj.selectedOption) workflowObj.selectedOption = 3
          scrollToBottom()
        }
      } else if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        workflowObj.approval = null
        if (activeWorkflowTimers.has(runId)) {
          clearInterval(activeWorkflowTimers.get(runId))
          activeWorkflowTimers.delete(runId)
        }
        loadRuns()
        scrollToBottom()
      }
    } catch (err) {
      console.warn('Workflow poll notice:', err)
    }
  }

  checkStatus()
  const timer = setInterval(checkStatus, 2000)
  activeWorkflowTimers.set(runId, timer)
}

onMounted(() => {
  loadRuns()
  if (chatThreadRef.value) {
    chatThreadRef.value.addEventListener('scroll', handleScroll)
  }
  currentMessages.value.forEach((msg) => {
    if (msg?.workflow && ['PLANNING', 'RUNNING', 'AWAITING_APPROVAL'].includes(msg.workflow.status)) {
      startWorkflowTracker(msg.workflow)
    }
  })
})

onUnmounted(() => {
  if (chatThreadRef.value) {
    chatThreadRef.value.removeEventListener('scroll', handleScroll)
  }
  activeWorkflowTimers.forEach((timer) => clearInterval(timer))
  activeWorkflowTimers.clear()
})
</script>

<style scoped>
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

/* Permission Prompt Card (pixel-perfect match with prompt screenshot) */
.permission-prompt-card {
  margin: 14px 0 8px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 18px 20px;
  color: #f4f4f5;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.prompt-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.prompt-icon {
  color: #a1a1aa;
  flex-shrink: 0;
}

.prompt-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.prompt-target-box {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 9px 12px;
  margin-bottom: 14px;
  overflow-x: auto;
}

.prompt-target-box code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: #e4e4e7;
  word-break: break-all;
}

.prompt-options-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 16px;
}

.prompt-option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s ease;
  color: #d4d4d8;
}

.prompt-option-row:hover {
  background: #27272a;
  color: #ffffff;
}

.prompt-option-row.selected {
  background: #27272a;
  border-color: #3f3f46;
  color: #ffffff;
}

.option-num-badge {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #27272a;
  color: #a1a1aa;
  font-size: 11.5px;
  font-weight: 600;
  flex-shrink: 0;
}

.prompt-option-row.selected .option-num-badge {
  background: #3f3f46;
  color: #ffffff;
}

.option-label {
  font-size: 13.5px;
  font-weight: 450;
  flex: 1;
}

.option-label small {
  color: #71717a;
  font-size: 12px;
}

.prompt-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 6px;
}

.prompt-skip-btn {
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: color 0.12s ease;
}

.prompt-skip-btn:hover {
  color: #f4f4f5;
}

.prompt-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #0070f3;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.prompt-submit-btn:hover:not(:disabled) {
  background: #005bb5;
}

.prompt-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Chat Workflow Card */
.chat-workflow-card {
  width: 100%;
  max-width: 620px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  margin-bottom: 8px;
}

.workflow-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 12px;
}

.workflow-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.workflow-icon {
  color: #7c3aed;
  flex-shrink: 0;
}

.workflow-goal {
  font-size: 13.5px;
  font-weight: 650;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-tasks-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.task-progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f9fafb;
}

.task-status-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  flex-shrink: 0;
}

.task-progress-item.success .task-status-indicator,
.task-progress-item.completed .task-status-indicator {
  background: #16a34a;
}

.task-progress-item.running .task-status-indicator {
  background: #3b82f6;
  animation: pulseDot 1.5s infinite;
}

.task-progress-item.awaiting_approval .task-status-indicator {
  background: #f59e0b;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.task-name {
  flex: 1;
  color: #374151;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-tool-tag {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.workflow-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.footer-status-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.footer-status-text.success {
  color: #16a34a;
  font-weight: 600;
}

.footer-status-text.failed {
  color: #dc2626;
  font-weight: 600;
}

.spinner-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: pulseDot 1.2s infinite;
}

.view-canvas-link {
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
}

.view-canvas-link:hover {
  text-decoration: underline;
}


</style>
