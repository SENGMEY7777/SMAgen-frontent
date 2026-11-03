<template>
  <Teleport to="body">
    <Transition name="project-modal-fade">
      <div v-if="modelValue" class="project-modal-backdrop" @click="handleBackdropClick">
        <div
          class="project-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          @click.stop
        >
          <!-- Modal Header -->
          <div class="project-modal-header">
            <h2 id="create-project-title" class="project-modal-title">Create project</h2>
            <button
              class="project-modal-close-btn"
              type="button"
              aria-label="Close"
              @click="closeModal"
            >
              <IconX :size="18" />
            </button>
          </div>

          <!-- Project Name Input with Left Folder Icon (Blue Border Matching Mockup) -->
          <div class="project-name-group" :class="{ 'is-focused': isInputFocused }">
            <div class="project-name-icon-box" aria-hidden="true">
              <IconFolder :size="18" />
            </div>
            <input
              ref="nameInputRef"
              v-model="projectName"
              type="text"
              class="project-name-input"
              placeholder="Project name"
              aria-label="Project name"
              @focus="isInputFocused = true"
              @blur="isInputFocused = false"
              @keydown.enter.prevent="handleCreate"
            />
          </div>

          <!-- Source Folders Section -->
          <div class="source-folders-section">
            <label class="source-folders-label">Source folders</label>
            <div class="source-folders-card">
              <!-- When no folder is selected yet -->
              <template v-if="!selectedFolder">
                <div v-if="!showManualInput" class="source-folders-picker-prompt" role="button" tabindex="0" @click="triggerFolderPick" @keydown.enter="triggerFolderPick">
                  <span>Add a folder on <strong>this computer</strong></span>
                  <IconChevronDown :size="14" />
                </div>
                <div v-if="!showManualInput" class="source-folders-actions-row">
                  <button
                    class="source-folders-add-btn"
                    type="button"
                    @click="triggerFolderPick"
                  >
                    <IconFolderPlus :size="16" />
                    <span>Add</span>
                  </button>
                  <button
                    class="source-folders-path-toggle"
                    type="button"
                    @click="showManualInput = true"
                  >
                    Type path
                  </button>
                </div>

                <!-- Manual Path Input Fallback -->
                <div v-else class="manual-path-box">
                  <input
                    ref="manualInputRef"
                    v-model="manualPathDraft"
                    type="text"
                    class="manual-path-input"
                    placeholder="Folder name or path (e.g. Desktop/Final-Blockchai)"
                    @keydown.enter.prevent="saveManualPath"
                  />
                  <button
                    class="manual-path-confirm-btn"
                    type="button"
                    :disabled="!manualPathDraft.trim()"
                    @click="saveManualPath"
                  >
                    Set
                  </button>
                  <button
                    class="manual-path-cancel-btn"
                    type="button"
                    @click="showManualInput = false"
                  >
                    Cancel
                  </button>
                </div>
              </template>

              <!-- When folder is selected -->
              <div v-else class="selected-folder-chip">
                <div class="selected-folder-info">
                  <IconFolder :size="17" class="selected-folder-icon" />
                  <div class="selected-folder-names">
                    <span class="selected-folder-title">{{ selectedFolder.name }}</span>
                    <span class="selected-folder-path">{{ selectedFolder.path }}</span>
                  </div>
                </div>
                <button
                  class="remove-selected-folder-btn"
                  type="button"
                  aria-label="Remove folder"
                  title="Remove folder"
                  @click="clearSelectedFolder"
                >
                  <IconX :size="14" />
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="project-modal-footer">
            <button
              class="project-modal-cancel-btn"
              type="button"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              class="project-modal-submit-btn"
              type="button"
              :disabled="!projectName.trim()"
              @click="handleCreate"
            >
              Create project
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { IconFolder, IconFolderPlus, IconChevronDown, IconX } from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'create'])

const projectName = ref('')
const selectedFolder = ref(null)
const isInputFocused = ref(false)
const showManualInput = ref(false)
const manualPathDraft = ref('')
const nameInputRef = ref(null)
const manualInputRef = ref(null)

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      projectName.value = ''
      selectedFolder.value = null
      showManualInput.value = false
      manualPathDraft.value = ''
      await nextTick()
      nameInputRef.value?.focus()
    }
  },
)

const closeModal = () => {
  emit('update:modelValue', false)
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    closeModal()
  }
}

const triggerFolderPick = async () => {
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
      if (dirHandle && dirHandle.name) {
        selectedFolder.value = {
          name: dirHandle.name,
          path: `Desktop/${dirHandle.name}`,
        }
        if (!projectName.value.trim()) {
          projectName.value = dirHandle.name
        }
      }
      return
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }

  // Fallback to manual path input without showing any browser upload popup
  showManualInput.value = true
  await nextTick()
  manualInputRef.value?.focus()
}

const saveManualPath = () => {
  const raw = manualPathDraft.value.trim()
  if (!raw) return

  const clean = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const parts = clean.split('/')
  const folderName = parts[parts.length - 1] || 'Local Project'
  const workspacePath = clean.includes('/') ? clean : `Desktop/${clean}`

  selectedFolder.value = {
    name: folderName,
    path: workspacePath,
  }

  if (!projectName.value.trim()) {
    projectName.value = folderName
  }

  showManualInput.value = false
  manualPathDraft.value = ''
}

const clearSelectedFolder = () => {
  selectedFolder.value = null
  showManualInput.value = false
  manualPathDraft.value = ''
}

const handleCreate = () => {
  const name = projectName.value.trim()
  if (!name) return

  emit('create', {
    name,
    workspacePath: selectedFolder.value?.path || `Desktop/${name}`,
    description: selectedFolder.value
      ? `Linked from local folder ${selectedFolder.value.name}.`
      : 'Project workspace',
  })

  closeModal()
}
</script>

<style scoped>
.project-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.project-modal-card {
  width: min(540px, 94vw);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 26px 28px;
  box-sizing: border-box;
}

/* Header */
.project-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.project-modal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: #18181b;
  letter-spacing: -0.015em;
}

.project-modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.project-modal-close-btn:hover {
  background: #f4f4f5;
  color: #18181b;
}

/* Project Name Input */
.project-name-group {
  display: flex;
  align-items: stretch;
  border: 1.5px solid #3b82f6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.project-name-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  flex-shrink: 0;
  border-right: 1px solid #e4e4e7;
  color: #18181b;
  background: #ffffff;
}

.project-name-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 12px 14px;
  border: none;
  outline: none;
  font-size: 15px;
  color: #18181b;
  background: transparent;
}

.project-name-input::placeholder {
  color: #9ca3af;
}

/* Source Folders Section */
.source-folders-section {
  margin-top: 20px;
}

.source-folders-label {
  display: block;
  font-size: 14px;
  font-weight: 550;
  color: #18181b;
  margin-bottom: 8px;
}

.source-folders-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  padding: 24px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  box-sizing: border-box;
}

.source-folders-picker-prompt {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #3f3f46;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}

.source-folders-picker-prompt:hover {
  color: #18181b;
}

.source-folders-picker-prompt strong {
  font-weight: 600;
  color: #18181b;
}

.source-folders-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.source-folders-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: 1px solid #e4e4e7;
  border-radius: 9999px;
  background: #f4f4f5;
  color: #18181b;
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.source-folders-add-btn:hover {
  background: #e4e4e7;
  border-color: #d4d4d8;
}

.source-folders-path-toggle {
  padding: 7px 14px;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: transparent;
  color: #71717a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.source-folders-path-toggle:hover {
  color: #18181b;
  background: #f4f4f5;
}

/* Manual Path Box */
.manual-path-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.manual-path-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  background: #ffffff;
  color: #18181b;
  font-size: 14px;
  outline: none;
}

.manual-path-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.manual-path-confirm-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 9px;
  background: #18181b;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.manual-path-confirm-btn:hover:not(:disabled) {
  background: #27272a;
}

.manual-path-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.manual-path-cancel-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #71717a;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.manual-path-cancel-btn:hover {
  color: #18181b;
}

/* Selected Folder Chip */
.selected-folder-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #f9fafb;
  box-sizing: border-box;
}

.selected-folder-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.selected-folder-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.selected-folder-names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.selected-folder-title {
  font-size: 14px;
  font-weight: 600;
  color: #18181b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-folder-path {
  font-size: 12px;
  color: #71717a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-selected-folder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.remove-selected-folder-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Modal Footer */
.project-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 26px;
}

.project-modal-cancel-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #71717a;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.project-modal-cancel-btn:hover {
  background: #f4f4f5;
  color: #18181b;
}

.project-modal-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  border: none;
  border-radius: 11px;
  background: #18181b;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
}

.project-modal-submit-btn:hover:not(:disabled) {
  background: #27272a;
  transform: translateY(-1px);
}

.project-modal-submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Transitions */
.project-modal-fade-enter-active,
.project-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.project-modal-fade-enter-from,
.project-modal-fade-leave-to {
  opacity: 0;
}

.project-modal-fade-enter-active .project-modal-card {
  transition: transform 0.2s ease;
}

.project-modal-fade-enter-from .project-modal-card {
  transform: scale(0.96) translateY(8px);
}
</style>
