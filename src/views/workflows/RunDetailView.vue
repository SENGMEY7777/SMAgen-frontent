<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import DashboardLayout from '../components/DashboardLayout.vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/common/StatusPill.vue'
import { api, ApiError } from '../services/api'
import { createSocketClient } from '../services/socket'
import { formatDate, formatCost, formatTokens } from '../utils/formatters'
import { ACTIVE_RUN_STATUSES } from '../constants'

const route = useRoute()
const router = useRouter()
const run = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const approvalModalOpen = ref(false)
const selectedApproval = ref(null)
const deciding = ref(false)
const rejectionReason = ref('')
const approvalError = ref('')
let timer
let socket

const tasks = computed(() => run.value?.tasks || [])
const logs = computed(() => run.value?.logs || [])
const progress = computed(() => {
  if (!tasks.value.length) return run.value?.status === 'COMPLETED' ? 100 : 8
  const done = tasks.value.filter((task) => ['SUCCESS', 'FAILED', 'SKIPPED'].includes(task.status)).length
  return Math.round((done / tasks.value.length) * 100)
})
const isActive = computed(() => ACTIVE_RUN_STATUSES.includes(run.value?.status))

const load = async (silent = false) => {
  if (silent) refreshing.value = true
  else loading.value = true
  try {
    const response = await api.getRun(String(route.params.runId))
    run.value = response?.data || null
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load this workflow run.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const openReview = async () => {
  approvalError.value = ''
  rejectionReason.value = ''
  try {
    const res = await api.listApprovals().catch(() => ({ data: [] }))
    const list = res?.data || []
    const match = list.find((a) => String(a.run_id) === String(route.params.runId) || String(a.runId) === String(route.params.runId)) || list[0]
    if (match) {
      const detailRes = await api.getApproval(match.id).catch(() => ({ data: match }))
      selectedApproval.value = detailRes?.data || match
    } else {
      selectedApproval.value = {
        id: 'run-approval',
        action_summary: 'Pending Security Checkpoint',
        task_title: tasks.value.find(t => t.status === 'AWAITING_APPROVAL')?.title || 'Dangerous Command Execution',
        assigned_tool: 'fileManager / executeCommand',
        tool_input: 'Pending privileged operation requires authorization.',
      }
    }
    approvalModalOpen.value = true
  } catch (error) {
    approvalError.value = error instanceof ApiError ? error.message : 'Unable to load approval details.'
    approvalModalOpen.value = true
  }
}

const submitDecision = async (status) => {
  if (!selectedApproval.value || deciding.value) return
  if (status === 'REJECTED' && !rejectionReason.value.trim()) {
    approvalError.value = 'A rejection reason is required when rejecting.'
    return
  }

  deciding.value = true
  approvalError.value = ''
  try {
    if (selectedApproval.value.id && selectedApproval.value.id !== 'run-approval') {
      await api.decideApproval(selectedApproval.value.id, {
        status,
        ...(status === 'REJECTED' ? { rejectionReason: rejectionReason.value.trim() } : {}),
      })
    } else {
      await api.resumeWorkflow(String(route.params.runId))
    }
    approvalModalOpen.value = false
    selectedApproval.value = null
    rejectionReason.value = ''
    await load(true)
  } catch (error) {
    approvalError.value = error instanceof ApiError ? error.message : 'Unable to submit decision.'
  } finally {
    deciding.value = false
  }
}

const resume = async () => {
  try {
    await api.resumeWorkflow(String(route.params.runId))
    await load(true)
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to resume this run.'
  }
}

const formatLogMessage = (rawMessage) => {
  if (!rawMessage) return ''
  if (typeof rawMessage !== 'string') return JSON.stringify(rawMessage)
  try {
    const parsed = JSON.parse(rawMessage)
    if (parsed && typeof parsed === 'object') {
      if (parsed.payload?.message) return parsed.payload.message
      if (parsed.payload?.error) return `Error: ${parsed.payload.error}`
      if (parsed.event) {
        const details = parsed.payload ? ` (${JSON.stringify(parsed.payload)})` : ''
        return `${parsed.event}${details}`
      }
      return JSON.stringify(parsed, null, 2)
    }
  } catch {
    // Plain string log
  }
  return rawMessage
}

onMounted(async () => {
  await load()
  timer = window.setInterval(() => {
    if (isActive.value) load(true)
  }, 4500)

  socket = createSocketClient()

  socket.on('connect', () => {
    socket.emit('join_run', String(route.params.runId))
  })

  const refreshEvents = [
    'telemetry',
    'task_started',
    'task_completed',
    'task_failed',
    'approval_required',
    'workflow_completed',
    'workflow_failed',
  ]
  refreshEvents.forEach((evt) => {
    socket.on(evt, () => load(true))
  })
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  if (socket) {
    socket.emit('leave_run', String(route.params.runId))
    socket.disconnect()
  }
})
</script>

<template>
  <DashboardLayout :recent-items="run ? [run] : []">
    <section class="section-page">
      <div class="section-head">
        <div>
          <button class="back-link" type="button" @click="router.back()">
            <AppIcon name="arrow" :size="14" /> Back
          </button>
          <div class="eyebrow">Workflow run</div>
          <h1>{{ run?.status || 'Run detail' }}</h1>
          <p>{{ run?.id || route.params.runId }} · {{ formatDate(run?.created_at) }}</p>
        </div>
        <div class="row-actions">
          <button class="secondary-btn" type="button" @click="load(true)">
            <AppIcon name="clock" :size="14" /> {{ refreshing ? 'Refreshing…' : 'Refresh' }}
          </button>
          <button v-if="run?.status === 'PENDING'" class="primary-btn" type="button" @click="resume">
            <AppIcon name="play" :size="14" /> Resume
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>
      <div v-if="loading" class="empty-state">Loading workflow details…</div>

      <div v-else-if="run" class="run-layout">
        <div class="run-summary">
          <div class="plan-header">
            <h2>Execution plan</h2>
            <StatusPill :status="run.status" />
          </div>
          <p class="run-goal">{{ run.goal_prompt }}</p>
          <div class="progress-track">
            <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
          </div>
          <div class="row-meta" style="margin-top: 8px">
            {{ progress }}% complete · {{ tasks.length }} task{{ tasks.length === 1 ? '' : 's' }}
          </div>
          <div v-if="run.status === 'AWAITING_APPROVAL'" class="approval-note">
            <AppIcon name="shield" :size="16" />
            <span>This run is waiting for a human approval checkpoint.</span>
            <button class="review-btn" type="button" @click="openReview">
              Review & Decide →
            </button>
          </div>
          <div class="task-list">
            <div
              v-for="(task, index) in tasks"
              :key="task.id || task.node_key"
              class="task-row"
              :class="{ clickable: task.status === 'AWAITING_APPROVAL' }"
              @click="task.status === 'AWAITING_APPROVAL' ? openReview() : null"
            >
              <span class="task-index">{{ index + 1 }}</span>
              <span class="task-copy">
                <strong>{{ task.title }}</strong>
                <small>{{ task.assigned_tool }} · {{ task.status }}</small>
              </span>
              <StatusPill :status="task.status" />
            </div>
            <div v-if="!tasks.length" class="empty-state">The planner is preparing task nodes…</div>
          </div>
        </div>

        <div class="soft-card logs-card">
          <div class="eyebrow">Telemetry</div>
          <h3 style="margin: 0 0 10px">Activity log</h3>
          <div v-if="!logs.length" class="row-meta">No logs yet. This panel updates while the run is active.</div>
          <div v-for="log in logs" :key="log.id" class="log-line">
            <small>{{ log.level }} · {{ log.source }} · {{ formatDate(log.created_at) }}</small>
            <p>{{ formatLogMessage(log.message) }}</p>
          </div>
        </div>
      </div>

      <!-- Inline Approval Decision Modal -->
      <div v-if="approvalModalOpen" class="modal-backdrop" @click="approvalModalOpen = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="shield-badge"><AppIcon name="shield" :size="16" /></span>
              <div>
                <h3>Security Approval Checkpoint</h3>
                <p>A privileged or dangerous command requires human authorization.</p>
              </div>
            </div>
            <button class="close-btn" type="button" @click="approvalModalOpen = false">
              <AppIcon name="close" :size="16" />
            </button>
          </div>

          <div v-if="approvalError" class="inline-error">{{ approvalError }}</div>

          <div class="approval-card-body">
            <div class="field-row">
              <span class="meta-label">Task</span>
              <span class="meta-val">{{ selectedApproval?.task_title || 'Execute Privileged Step' }}</span>
            </div>
            <div class="field-row">
              <span class="meta-label">Tool</span>
              <span class="meta-val">{{ selectedApproval?.assigned_tool || 'systemExecutor' }}</span>
            </div>

            <div class="code-box">
              <span class="code-label">Command / Payload</span>
              <code>{{ typeof selectedApproval?.tool_input === 'string' ? selectedApproval?.tool_input : JSON.stringify(selectedApproval?.tool_input || {}, null, 2) }}</code>
            </div>

            <div class="field">
              <label for="rejection-input">Rejection reason <span>(only if rejecting)</span></label>
              <textarea
                id="rejection-input"
                v-model="rejectionReason"
                rows="2"
                placeholder="Specify reason for rejection…"
              ></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button class="secondary-btn" type="button" :disabled="deciding" @click="approvalModalOpen = false">
              Cancel
            </button>
            <button class="danger-btn" type="button" :disabled="deciding" @click="submitDecision('REJECTED')">
              Reject
            </button>
            <button class="primary-btn" type="button" :disabled="deciding" @click="submitDecision('APPROVED')">
              <AppIcon name="check" :size="14" /> {{ deciding ? 'Processing…' : 'Approve & Continue' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 16px;
  padding: 0;
  color: #777b87;
  background: transparent;
  font-size: 12px;
}

.back-link .app-icon {
  transform: rotate(180deg);
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.approval-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 17px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #ffedd5;
  font-size: 12px;
  font-weight: 500;
}

.review-btn {
  margin-left: auto;
  background: #ea580c;
  color: #ffffff;
  border: none;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.review-btn:hover {
  background: #c2410c;
}

.task-row.clickable {
  cursor: pointer;
}

.task-row.clickable:hover {
  background: #fdf6ec;
}

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal-content {
  background: #ffffff;
  border-radius: 14px;
  width: min(560px, 100%);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: modalIn 0.18s ease-out;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shield-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #fff7ed;
  color: #ea580c;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.modal-title-wrap h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: #111827;
}

.modal-title-wrap p {
  margin: 1px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.close-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.approval-card-body {
  padding: 18px 20px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  margin-bottom: 8px;
}

.meta-label {
  color: #6b7280;
  font-weight: 550;
}

.meta-val {
  color: #111827;
  font-weight: 600;
}

.code-box {
  margin: 12px 0 16px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.code-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.code-box code {
  font-family: monospace;
  font-size: 12px;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-all;
  display: block;
  max-height: 120px;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

.danger-btn {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.danger-btn:hover {
  background: #fecaca;
}
</style>
