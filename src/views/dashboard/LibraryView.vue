<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '../components/DashboardLayout.vue'
import AppIcon from '../components/AppIcon.vue'
import { api, ApiError } from '../services/api'
import { formatDateShort } from '../utils/formatters'

const router = useRouter()
const workflows = ref([])
const showCreate = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const form = ref({ title: '', description: '', systemPrompt: '' })
const runTarget = ref(null)
const runGoal = ref('')

const load = async () => {
  try {
    const response = await api.listWorkflows()
    workflows.value = response?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load workflows.'
  }
}

const createWorkflow = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    await api.createWorkflow({ ...form.value, isPublic: false })
    form.value = { title: '', description: '', systemPrompt: '' }
    showCreate.value = false
    await load()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to create workflow.'
  } finally {
    loading.value = false
  }
}

const runWorkflow = async () => {
  if (!runGoal.value.trim() || !runTarget.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    const response = await api.runWorkflow({
      workflowId: runTarget.value.id,
      goalPrompt: runGoal.value.trim(),
    })
    if (response?.data?.runId) router.push(`/runs/${response.data.runId}`)
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to start workflow.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <DashboardLayout>
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Library</div>
          <h1>Your workflows</h1>
          <p>Reusable instructions for the jobs you run more than once.</p>
        </div>
        <button class="primary-btn" type="button" @click="showCreate = !showCreate">
          <AppIcon :name="showCreate ? 'close' : 'plus'" :size="15" />
          {{ showCreate ? 'Close' : 'New workflow' }}
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>

      <form v-if="showCreate" class="form-card create-form" @submit.prevent="createWorkflow">
        <div class="field-grid">
          <div class="field">
            <label for="workflow-title">Title</label>
            <input id="workflow-title" v-model="form.title" required minlength="3" placeholder="Workspace audit" />
          </div>
          <div class="field">
            <label for="workflow-description">Description</label>
            <input id="workflow-description" v-model="form.description" placeholder="What this workflow is for" />
          </div>
          <div class="field full">
            <label for="workflow-prompt">System prompt</label>
            <textarea
              id="workflow-prompt"
              v-model="form.systemPrompt"
              required
              placeholder="Describe how SMAgen should approach this workflow…"
            ></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="secondary-btn" type="button" @click="showCreate = false">Cancel</button>
          <button class="primary-btn" type="submit" :disabled="loading">
            {{ loading ? 'Saving…' : 'Save workflow' }}
          </button>
        </div>
      </form>

      <div v-if="!workflows.length && !showCreate" class="empty-state">
        <strong>Your library is quiet.</strong>
        Create a workflow to turn a repeated task into a one-click run.
      </div>
      <div v-else class="data-list">
        <article v-for="workflow in workflows" :key="workflow.id" class="data-row">
          <div class="row-main">
            <div class="row-title">{{ workflow.title }}</div>
            <div class="row-meta">
              {{ workflow.description || 'No description' }} · {{ formatDateShort(workflow.created_at) }}
            </div>
          </div>
          <div class="row-actions">
            <button class="secondary-btn" type="button" @click="runTarget = workflow; runGoal = ''">Run</button>
          </div>
        </article>
      </div>

      <div v-if="runTarget" class="soft-card run-launcher">
        <div class="eyebrow">Run workflow</div>
        <h2>{{ runTarget.title }}</h2>
        <p>{{ runTarget.description || 'Give this workflow a goal and SMAgen will plan the task graph.' }}</p>
        <div class="field">
          <label for="run-goal">Goal prompt</label>
          <textarea id="run-goal" v-model="runGoal" placeholder="What should this run accomplish?"></textarea>
        </div>
        <div class="form-actions">
          <button class="secondary-btn" type="button" @click="runTarget = null">Cancel</button>
          <button class="primary-btn" type="button" :disabled="loading || !runGoal.trim()" @click="runWorkflow">
            <AppIcon name="play" :size="14" /> {{ loading ? 'Starting…' : 'Start run' }}
          </button>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.create-form { margin-bottom: 18px; }
.run-launcher { width: min(700px, 100%); margin-top: 18px; }
.run-launcher h2 { margin: 3px 0 5px; font-size: 20px; letter-spacing: -0.035em; }
.run-launcher p { margin: 0 0 18px; color: #9296a0; font-size: 13px; }
</style>

