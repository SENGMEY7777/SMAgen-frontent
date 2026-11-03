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

          <!-- Project Name Input with Left Folder Icon -->
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
            <div class="source-folders-header">
              <label class="source-folders-label">Source folders</label>
              <div class="source-folders-indicator">
                <IconDeviceLaptop :size="16" />
                <span>This computer</span>
              </div>
            </div>

            <!-- Source Folders Card -->
            <div
              class="source-folders-card"
              :class="{
                'has-folders': selectedFolders.length > 0,
                'is-dragover': isDraggingOver,
              }"
              @dragover.prevent="isDraggingOver = true"
              @dragleave.prevent="isDraggingOver = false"
              @drop="onDropFolder"
            >
              <!-- When folders are selected: matches user's second image -->
              <template v-if="selectedFolders.length > 0">
                <div
                  v-for="(folder, index) in selectedFolders"
                  :key="folder.name + index"
                  class="folder-row-item"
                >
                  <div class="folder-row-left">
                    <IconFolder :size="18" class="folder-row-icon" />
                    <span class="folder-row-name">{{ folder.name }}</span>
                  </div>
                  <button
                    class="folder-row-remove-btn"
                    type="button"
                    aria-label="Remove folder"
                    @click="removeFolder(index)"
                  >
                    <IconX :size="15" />
                  </button>
                </div>

                <!-- Add folder row button -->
                <button
                  class="add-folder-row-btn"
                  type="button"
                  @click="triggerFolderPick"
                >
                  <IconFolderPlus :size="18" class="add-folder-icon" />
                  <span class="add-folder-label">Add folder</span>
                </button>
              </template>

              <!-- When no folder is selected yet -->
              <template v-else>
                <div
                  class="source-folders-picker-prompt"
                  role="button"
                  tabindex="0"
                  @click="triggerFolderPick"
                  @keydown.enter="triggerFolderPick"
                >
                  <span>Add a folder on <strong>this computer</strong></span>
                  <IconChevronDown :size="14" />
                </div>
                <button
                  class="source-folders-add-btn"
                  type="button"
                  @click="triggerFolderPick"
                >
                  <IconFolderPlus :size="16" />
                  <span>Add</span>
                </button>
              </template>

              <!-- Hidden directory input to upload directly from local computer -->
              <input
                ref="directoryInputRef"
                type="file"
                webkitdirectory
                directory
                multiple
                class="visually-hidden"
                aria-hidden="true"
                tabindex="-1"
                @change="onFolderSelected"
              />
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
import {
  IconFolder,
  IconFolderPlus,
  IconChevronDown,
  IconX,
  IconDeviceLaptop,
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'create'])

const projectName = ref('')
const selectedFolders = ref([])
const isInputFocused = ref(false)
const isDraggingOver = ref(false)
const nameInputRef = ref(null)
const directoryInputRef = ref(null)

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      projectName.value = ''
      selectedFolders.value = []
      isDraggingOver.value = false
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

const addFolder = (folderName) => {
  if (!folderName) return
  if (!selectedFolders.value.some((f) => f.name === folderName)) {
    selectedFolders.value.push({
      name: folderName,
      path: `Desktop/${folderName}`,
    })
  }
}

const triggerFolderPick = async () => {
  // 1. Try modern File System Access API first (opens macOS Finder directly)
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await window.showDirectoryPicker()
      if (dirHandle && dirHandle.name) {
        addFolder(dirHandle.name)
        return
      }
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }

  // 2. Direct native directory picker fallback (opens local computer)
  directoryInputRef.value?.click()
}

const onFolderSelected = (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  const firstRelativePath = files[0]?.webkitRelativePath || ''
  const folderName = firstRelativePath.split('/')[0] || files[0]?.name || 'Local Project'

  addFolder(folderName)
  event.target.value = ''
}

const onDropFolder = async (e) => {
  e.preventDefault()
  isDraggingOver.value = false
  const items = e.dataTransfer?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (typeof item.getAsFileSystemHandle === 'function') {
      try {
        const handle = await item.getAsFileSystemHandle()
        if (handle && handle.kind === 'directory') {
          addFolder(handle.name)
        }
      } catch {}
    } else if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry()
      if (entry && entry.isDirectory) {
        addFolder(entry.name)
      }
    }
  }
}

const removeFolder = (index) => {
  selectedFolders.value.splice(index, 1)
}

const handleCreate = () => {
  const primaryFolder = selectedFolders.value[0]
  const name = projectName.value.trim() || primaryFolder?.name || 'My Project'
  const workspacePath = primaryFolder?.path || `Desktop/${name}`

  emit('create', {
    name,
    workspacePath,
    sourceFolders: selectedFolders.value.map((f) => f.name),
    description: selectedFolders.value.length
      ? `Linked folders: ${selectedFolders.value.map((f) => f.name).join(', ')}.`
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
  width: min(530px, 94vw);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 24px 28px;
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
  font-weight: 700;
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
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
  height: 48px;
  box-sizing: border-box;
}

.project-name-group.is-focused {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.project-name-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  flex-shrink: 0;
  border-right: 1px solid #e4e4e7;
  color: #18181b;
  background: #ffffff;
}

.project-name-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 14px;
  border: none;
  outline: none;
  font-size: 15px;
  color: #18181b;
  background: transparent;
}

.project-name-input::placeholder {
  color: #a1a1aa;
}

/* Source Folders Section */
.source-folders-section {
  margin-top: 20px;
}

.source-folders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.source-folders-label {
  font-size: 14px;
  font-weight: 600;
  color: #18181b;
  margin: 0;
}

.source-folders-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #71717a;
  font-size: 13.5px;
  font-weight: 450;
}

.source-folders-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 130px;
  padding: 22px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.source-folders-card.is-dragover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.source-folders-card.has-folders {
  display: block;
  min-height: auto;
  padding: 0;
  overflow: hidden;
}

/* Selected Folder Row (Matching User Second Image) */
.folder-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid #f4f4f5;
  background: #ffffff;
  box-sizing: border-box;
}

.folder-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.folder-row-icon {
  color: #52525b;
  flex-shrink: 0;
}

.folder-row-name {
  font-size: 14.5px;
  font-weight: 500;
  color: #18181b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-row-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.folder-row-remove-btn:hover {
  background: #f4f4f5;
  color: #18181b;
}

/* Add Folder Row Button */
.add-folder-row-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 18px;
  border: none;
  background: #ffffff;
  color: #18181b;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.add-folder-row-btn:hover {
  background: #fafafa;
}

.add-folder-icon {
  color: #52525b;
  flex-shrink: 0;
}

.add-folder-label {
  font-size: 14.5px;
  font-weight: 500;
  color: #18181b;
}

/* Empty State */
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

.source-folders-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
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

/* Modal Footer */
.project-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 26px;
}

.project-modal-cancel-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #71717a;
  font-size: 14.5px;
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
  border-radius: 14px;
  background: #18181b;
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
  transition: background 0.15s ease, transform 0.1s ease;
}

.project-modal-submit-btn:hover {
  background: #27272a;
}

.project-modal-submit-btn:active {
  transform: scale(0.99);
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
