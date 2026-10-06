<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconClock, IconFolder, IconFileText } from '@tabler/icons-vue'
import { api, ApiError } from '@/services/api'
import { formatDate } from '@/utils/formatters'

const runs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const selectedFile = ref(null)

const generatedArtifacts = computed(() => {
  const list = []
  runs.value.forEach((run) => {
    if (run.tasks && Array.isArray(run.tasks)) {
      run.tasks.forEach((task) => {
        if (task.output_payload) {
          try {
            const parsed = typeof task.output_payload === 'string' ? JSON.parse(task.output_payload) : task.output_payload
            if (parsed && (parsed.file || parsed.path || parsed.output || parsed.code || parsed.report)) {
              list.push({
                id: `${run.id}_${task.id}`,
                runId: run.id,
                taskTitle: task.title,
                fileName: parsed.file || parsed.path || `${task.assigned_tool}_output.txt`,
                content: parsed.code || parsed.output || parsed.report || JSON.stringify(parsed, null, 2),
                type: parsed.file?.endsWith('.js') || parsed.path?.endsWith('.js') ? 'javascript' : (parsed.file?.endsWith('.json') ? 'json' : 'text'),
                createdAt: task.completed_at || run.created_at,
              })
            }
          } catch {}
        }
      })
    }
  })
  return list
})

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await api.listRuns()
    runs.value = res?.data || []
    if (generatedArtifacts.value.length) {
      selectedFile.value = generatedArtifacts.value[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load sandbox artifacts.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Workspace Sandboxes</div>
          <h1>Artifacts & Sandboxes</h1>
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
                <span class="file-name">{{ file.fileName }}</span>
                <small class="file-meta">{{ file.taskTitle }} · {{ formatDate(file.createdAt) }}</small>
              </div>
            </button>
          </div>
        </div>

        <!-- File Viewer Card -->
        <div class="soft-card file-viewer-card">
          <div v-if="selectedFile" class="viewer-content">
            <div class="viewer-header">
              <div>
                <h2>{{ selectedFile.fileName }}</h2>
                <p>Task: {{ selectedFile.taskTitle }} · Run: {{ selectedFile.runId }}</p>
              </div>
            </div>
            <pre class="code-preview"><code>{{ selectedFile.content }}</code></pre>
          </div>
          <div v-else class="empty-viewer">Select an artifact to inspect contents.</div>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>

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
}

.file-viewer-card {
  padding: 20px;
  min-height: 480px;
}

.viewer-header {
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.viewer-header h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 3px;
  color: #111827;
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
  max-height: 420px;
}

.empty-viewer {
  display: grid;
  place-items: center;
  height: 300px;
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 860px) {
  .artifacts-layout {
    grid-template-columns: 1fr;
  }
}
</style>
