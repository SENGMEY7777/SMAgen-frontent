<template>
  <DashboardLayout :recent-items="runs">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Execution Engine</div>
          <h1>Workflows (DAG)</h1>
          <p>Multi-step autonomous DAG task planner, dependency resolution, and execution visualizer.</p>
        </div>
        <button class="secondary-btn" type="button" @click="load">
          <IconClock :size="14" /> Refresh
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <!-- Quick DAG Launcher Card -->
      <div class="soft-card dag-builder-card">
        <div class="builder-header">
          <div class="builder-icon">
            <IconGitFork :size="18" />
          </div>
          <div>
            <h3>Launch Autonomous DAG Workflow</h3>
            <p>Describe your goal. The planner will generate execution nodes with tool assignments.</p>
          </div>
        </div>
        <form class="builder-input-group" @submit.prevent="startDagWorkflow">
          <textarea
            id="goal-prompt"
            v-model="goalPrompt"
            class="dag-textarea"
            name="goalPrompt"
            aria-label="Workflow goal"
            placeholder="e.g. Audit repository dependencies, generate unit tests, and create a security summary report..."
            rows="2"
            maxlength="2000"
            @keydown.enter.exact.prevent="startDagWorkflow"
          ></textarea>
          <div class="goal-input-meta">
            <span>Press Enter to launch · Shift + Enter for a new line</span>
            <span>{{ goalPrompt.length.toLocaleString() }} / 2,000</span>
          </div>
          <div class="builder-actions">
            <button
              class="primary-btn launch-btn"
              type="submit"
              :disabled="!goalPrompt.trim() || launching"
            >
              <component :is="launching ? IconClock : IconPlayerPlay" :size="14" />
              <span>{{ launching ? 'Planning DAG…' : 'Execute DAG' }}</span>
            </button>
            <button
              class="secondary-btn launch-btn preview-btn"
              type="button"
              @click="router.push('/runs/demo')"
            >
              <IconGitFork :size="14" />
              <span>Preview Canvas (Demo)</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Active DAG Tasks -->
      <div class="section-subhead">
        <h2>In-Flight &amp; Pending DAGs ({{ activeRuns.length }})</h2>
      </div>
      <div v-if="loading" class="empty-state">Loading autonomous workflows…</div>
      <div v-else-if="!activeRuns.length" class="empty-state">
        No workflows are currently executing. Use the builder above to trigger a new DAG.
      </div>
      <div v-else class="data-list">
        <article v-for="run in activeRuns.slice(0, 10)" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title" :title="run.goal_prompt">{{ run.goal_prompt }}</div>
            <div class="row-meta">
              {{ formatDate(run.created_at) }} · {{ formatTokens(run.total_tokens) }} tokens
            </div>
          </div>
          <div class="row-actions">
            <StatusPill :status="run.status" />
            <RouterLink class="secondary-btn sm" :to="`/runs/${run.id}`">
              View DAG Graph <IconArrowRight :size="12" />
            </RouterLink>
          </div>
        </article>
      </div>

      <!-- Completed History -->
      <div class="section-subhead" style="margin-top: 28px;">
        <h2>Completed Workflows ({{ completedRuns.length }})</h2>
      </div>
      <div v-if="!completedRuns.length && !loading" class="empty-state">
        Completed workflow runs will be archived here.
      </div>
      <div v-else-if="completedRuns.length" class="data-list">
        <article v-for="run in completedRuns.slice(0, 10)" :key="run.id" class="data-row">
          <div class="row-main">
            <div class="row-title" :title="run.goal_prompt">{{ run.goal_prompt }}</div>
            <div class="row-meta">
              {{ formatDate(run.created_at) }} · {{ formatTokens(run.total_tokens) }} tokens
            </div>
          </div>
          <div class="row-actions">
            <StatusPill :status="run.status" />
            <RouterLink class="secondary-btn sm" :to="`/runs/${run.id}`">
              Inspect <IconArrowRight :size="12" />
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconClock, IconGitFork, IconPlayerPlay, IconArrowRight } from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { formatDate, formatTokens } from '@/utils/formatters'
import { getWorkflowRunId } from '@/utils/workflow'

const router = useRouter()
const runs = ref([])
const workflows = ref([])
const loading = ref(true)
const launching = ref(false)
const errorMessage = ref('')
const goalPrompt = ref('')

const activeRuns = computed(() => {
  return runs.value.filter((r) => ['RUNNING', 'PENDING', 'AWAITING_APPROVAL'].includes(r.status))
})

const completedRuns = computed(() => {
  return runs.value.filter((r) => ['COMPLETED', 'FAILED'].includes(r.status))
})

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [runsRes, workflowsRes] = await Promise.all([
      api.listRuns().catch(() => ({ data: [] })),
      api.listWorkflows().catch(() => ({ data: [] })),
    ])
    runs.value = runsRes?.data || []
    workflows.value = workflowsRes?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load workflows.'
  } finally {
    loading.value = false
  }
}

const startDagWorkflow = async () => {
  const goal = goalPrompt.value.trim()
  if (!goal || launching.value) return
  launching.value = true
  errorMessage.value = ''
  try {
    const response = await api.runWorkflow({ goalPrompt: goal })
    const runId = getWorkflowRunId(response)

    if (!runId) {
      throw new ApiError('The workflow started but no run ID was returned. Please try again.')
    }

    goalPrompt.value = ''
    await router.push(`/runs/${runId}`)
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to launch DAG workflow.'
  } finally {
    launching.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.dag-builder-card {
  padding: 18px 20px;
  margin-bottom: 24px;
}

.builder-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.builder-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f5f3ff;
  color: #7c3aed;
  display: grid;
  place-items: center;
}

.builder-header h3 {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.builder-header p {
  margin: 0;
  font-size: 12.5px;
  color: #6b7280;
}

.builder-input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dag-textarea {
  width: 100%;
  min-height: 84px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.55;
  color: #111827;
  background: #fbfcfd;
  resize: vertical;
  outline: none;
  caret-color: #4f46e5;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.dag-textarea:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.dag-textarea::placeholder {
  color: #9ca3af;
}

.goal-input-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
  color: #9ca3af;
  font-size: 11.5px;
  line-height: 1.4;
}

.builder-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.launch-btn {
  align-self: flex-end;
  padding: 8px 18px;
}

.preview-btn {
  color: #7c3aed;
  background: #faf5ff;
  border-color: #e9d5ff;
}

.preview-btn:hover {
  color: #6d28d9;
  background: #f3e8ff;
  border-color: #d8b4fe;
}

.section-subhead {
  margin: 18px 0 12px;
}

.section-subhead h2 {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.secondary-btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}

.data-row {
  min-width: 0;
  width: 100%;
}

.row-main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.row-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

@media (max-width: 560px) {
  .goal-input-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .builder-actions {
    justify-content: stretch;
  }

  .builder-actions .launch-btn {
    flex: 1 1 100%;
  }
}
</style>
