<script setup>
import { onMounted, ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { IconClock, IconArrowRight, IconX, IconCheck } from '@tabler/icons-vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { api, ApiError } from '@/services/api'
import { formatDate } from '@/utils/formatters'

const approvals = ref([])
const selected = ref(null)
const loading = ref(true)
const deciding = ref(false)
const rejectionReason = ref('')
const errorMessage = ref('')

const load = async () => {
  loading.value = true
  try {
    const response = await api.listApprovals()
    approvals.value = response?.data || []
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load approvals.'
  } finally {
    loading.value = false
  }
}

const openApproval = async (approval) => {
  try {
    const response = await api.getApproval(approval.id)
    selected.value = response?.data || approval
  } catch {
    selected.value = approval
  }
}

const decide = async (status) => {
  if (!selected.value || deciding.value) return
  if (status === 'REJECTED' && !rejectionReason.value.trim()) {
    errorMessage.value = 'A rejection reason is required.'
    return
  }

  deciding.value = true
  errorMessage.value = ''
  try {
    await api.decideApproval(selected.value.id, {
      status,
      ...(status === 'REJECTED' ? { rejectionReason: rejectionReason.value.trim() } : {}),
    })
    selected.value = null
    rejectionReason.value = ''
    await load()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Unable to update approval.'
  } finally {
    deciding.value = false
  }
}

onMounted(load)
</script>

<template>
  <DashboardLayout :recent-items="approvals">
    <section class="section-page">
      <div class="section-head">
        <div>
          <div class="eyebrow">Human in the loop</div>
          <h1>Approval queue</h1>
          <p>Review risky actions before they continue through a workflow.</p>
        </div>
        <button class="secondary-btn" type="button" @click="load">
          <IconClock :size="15" /> Refresh
        </button>
      </div>

      <div v-if="errorMessage" class="inline-error">{{ errorMessage }}</div>
      <div v-if="loading" class="empty-state">Loading approval requests…</div>
      <div v-else-if="!approvals.length" class="empty-state">
        <strong>All clear.</strong> There are no pending approval requests.
      </div>
      <div v-else class="data-list">
        <article v-for="approval in approvals" :key="approval.id" class="data-row">
          <div class="row-main">
            <div class="row-title">{{ approval.action_summary }}</div>
            <div class="row-meta">
              {{ approval.task_title }} · {{ approval.assigned_tool }} · {{ formatDate(approval.created_at) }}
            </div>
          </div>
          <div class="row-actions">
            <StatusPill status="AWAITING_APPROVAL" />
            <button class="secondary-btn" type="button" @click="openApproval(approval)">
              Review <IconArrowRight :size="13" />
            </button>
          </div>
        </article>
      </div>

      <div v-if="selected" class="soft-card approval-detail">
        <button class="close-detail" type="button" @click="selected = null" aria-label="Close detail">
          <IconX :size="16" />
        </button>
        <div class="eyebrow">Approval request</div>
        <h2>{{ selected.action_summary }}</h2>
        <p>{{ selected.task_title }} · {{ selected.assigned_tool }}</p>
        <div class="approval-code">
          <strong>Tool input</strong>
          <code>{{ typeof selected.tool_input === 'string' ? selected.tool_input : JSON.stringify(selected.tool_input || {}, null, 2) }}</code>
        </div>
        <div class="field">
          <label for="rejection">
            Rejection reason <span>(required only when rejecting)</span>
          </label>
          <textarea
            id="rejection"
            v-model="rejectionReason"
            placeholder="Explain why this action should not continue…"
          ></textarea>
        </div>
        <div class="form-actions">
          <button class="danger-btn" type="button" :disabled="deciding" @click="decide('REJECTED')">
            Reject
          </button>
          <button class="primary-btn" type="button" :disabled="deciding" @click="decide('APPROVED')">
            <IconCheck :size="14" /> Approve
          </button>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>

<style scoped>
.approval-detail {
  position: relative;
  width: min(650px, 100%);
  margin-top: 18px;
}

.approval-detail h2 {
  margin: 3px 0 6px;
  font-size: 19px;
  letter-spacing: -0.035em;
}

.approval-detail > p {
  margin: 0 0 17px;
  color: #9296a0;
  font-size: 12px;
}

.close-detail {
  position: absolute;
  top: 17px;
  right: 17px;
  padding: 5px;
  border-radius: 7px;
  color: #8d909b;
  background: #f5f6f8;
}

.approval-code {
  display: grid;
  gap: 8px;
  margin-bottom: 17px;
  padding: 12px;
  border-radius: 10px;
  background: #f7f8fa;
}

.approval-code strong {
  color: #696c77;
  font-size: 11px;
}

.approval-code code {
  max-height: 130px;
  overflow: auto;
  color: #696c77;
  font-size: 10px;
  white-space: pre-wrap;
}

.field label span {
  color: #aaaeb8;
  font-weight: 400;
}
</style>
