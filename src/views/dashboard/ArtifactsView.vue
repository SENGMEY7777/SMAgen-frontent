<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Workspace Sandboxes</div>
          <h1>Artifacts &amp; Sandboxes</h1>
          <p>Inspect files, code modules, and structured reports generated in the workspace environment.</p>
        </div>
        <button class="secondary-btn" type="button" @click="load">
          <IconClock :size="14" /> Refresh
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <div v-if="loading" class="empty-state">Loading sandbox files…</div>
      <div v-else-if="!generatedArtifacts.length" class="empty-state">
        <strong>No artifacts generated yet.</strong>
        Execute a workflow or chat task that writes files or sandbox outputs to view them here.
      </div>

      <div v-else class="artifacts-layout">
        <!-- Sidebar file list -->
        <div class="soft-card file-tree-card">
          <div class="file-tree-header">
            <IconFolder :size="16" />
            <span>Generated Files ({{ generatedArtifacts.length }})</span>
          </div>
          <div class="file-list">
            <button
              v-for="file in generatedArtifacts"
              :key="file.id"
              class="file-row"
              :class="{ active: selectedFile?.id === file.id }"
              type="button"
              @click="selectedFile = file"
            >
              <IconFileText :size="14" />
              <div class="file-info">
                <span class="file-name" :title="file.fileName">{{ file.fileName }}</span>
                <small class="file-meta">{{ file.taskTitle }} · {{ formatDate(file.createdAt) }}</small>
              </div>
            </button>
          </div>
        </div>

        <!-- File Viewer Card -->
        <div class="soft-card file-viewer-card">
          <div v-if="selectedFile" class="viewer-content">
            <div class="viewer-header">
              <div class="viewer-meta-info">
                <h2>{{ selectedFile.fileName }}</h2>
                <p>Task: {{ selectedFile.taskTitle }} · Tool: {{ selectedFile.tool }}</p>
              </div>
              <button class="secondary-btn sm" type="button" @click="copyCode">
                <component :is="copied ? IconCheck : IconCopy" :size="13" />
                <span>{{ copied ? 'Copied' : 'Copy Code' }}</span>
              </button>
            </div>
            <pre class="code-preview"><code>{{ selectedFile.content }}</code></pre>
          </div>
          <div v-else class="empty-viewer">Select an artifact to inspect contents.</div>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconClock, IconFolder, IconFileText, IconCopy, IconCheck } from '@tabler/icons-vue'
import { api, ApiError } from '@/services/api'
import { formatDate } from '@/utils/formatters'

const runs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const selectedFile = ref(null)
const copied = ref(false)

const copyCode = async () => {
  if (!selectedFile.value?.content) return
  try {
    await navigator.clipboard.writeText(selectedFile.value.content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {}
}

const parsePayload = (val) => {
  if (!val) return null
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return null
  }
}

const generatedArtifacts = computed(() => {
  const list = []
  const seenIds = new Set()

  runs.value.forEach((run) => {
    const tasks = run.tasks && Array.isArray(run.tasks) ? run.tasks : []
    tasks.forEach((task) => {
      const outObj = parsePayload(task.output_payload)
      const inObj = parsePayload(task.tool_input)

      // Identify file name / path
      let rawPath =
        outObj?.file ||
        outObj?.fileName ||
        outObj?.path ||
        inObj?.path ||
        inObj?.file ||
        inObj?.fileName

      if (!rawPath && task.assigned_tool === 'fileManager') {
        rawPath = inObj?.action ? `task_${task.id || 'artifact'}.txt` : null
      }

      // Identify content / code
      let content =
        outObj?.code ||
        outObj?.content ||
        outObj?.report ||
        outObj?.output ||
        outObj?.stdout ||
        inObj?.content ||
        inObj?.code

      // Fallback if output_payload is string
      if (!content && task.output_payload) {
        if (typeof task.output_payload === 'string') {
          content = task.output_payload
        } else if (outObj) {
          content = JSON.stringify(outObj, null, 2)
        }
      }

      // If we have content or path, format as artifact
      if ((rawPath || content) && content && typeof content === 'string' && content.trim()) {
        const cleanName = rawPath ? String(rawPath).split('/').pop() : `${task.assigned_tool || 'task'}_output.txt`
        const artifactId = `${run.id}_${task.id || Math.random().toString(36).slice(2)}`

        if (!seenIds.has(artifactId)) {
          seenIds.add(artifactId)
          list.push({
            id: artifactId,
            runId: run.id,
            taskTitle: task.title || task.instruction || 'Execution Output',
            fileName: cleanName,
            fullPath: rawPath || cleanName,
            content: content,
            tool: task.assigned_tool || 'systemExecutor',
            createdAt: task.completed_at || task.created_at || run.created_at,
          })
        }
      }
    })
  })

  return list
})

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await api.listRuns()
    const rawRuns = res?.data || []

    // Fetch full run details with tasks for recent runs in parallel (up to 20 runs)
    const detailedRuns = await Promise.all(
      rawRuns.slice(0, 20).map(async (runItem) => {
        try {
          const detailRes = await api.getRun(runItem.id)
          return detailRes?.data || runItem
        } catch {
          return runItem
        }
      })
    )

    runs.value = detailedRuns
    if (generatedArtifacts.value.length) {
      selectedFile.value = generatedArtifacts.value[0]
    } else {
      selectedFile.value = null
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load sandbox artifacts.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.artifacts-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

.file-tree-card {
  padding: 14px;
}

.file-tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 10px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 520px;
  overflow-y: auto;
}

.file-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
  width: 100%;
}

.file-row:hover {
  background: #f3f4f6;
}

.file-row.active {
  background: #eef2ff;
  color: #4f46e5;
}

.file-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-row.active .file-name {
  color: #4f46e5;
}

.file-meta {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-viewer-card {
  padding: 20px;
  min-height: 480px;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.viewer-meta-info {
  min-width: 0;
}

.viewer-header h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 3px;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-header p {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.code-preview {
  margin: 0;
  padding: 14px;
  border-radius: 8px;
  background: #1e1e2e;
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 520px;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-viewer {
  display: grid;
  place-items: center;
  height: 300px;
  color: #9ca3af;
  font-size: 13px;
}

.secondary-btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}

@media (max-width: 860px) {
  .artifacts-layout {
    grid-template-columns: 1fr;
  }
}
</style>
