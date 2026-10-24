import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api, ApiError } from '@/services/api'
import { createSocketClient } from '@/services/socket'
import { useChatStore } from '@/stores/chat'

const collectionFrom = (response, keys = []) => {
  const payload = response?.data ?? response
  if (Array.isArray(payload)) return payload

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }

  return []
}

const normalizedStatus = (run) => String(run?.status || '').toUpperCase()

export function useDashboardOverview() {
  const runs = ref([])
  const approvals = ref([])
  const loading = ref(true)
  const isRefreshing = ref(false)
  const errorMessage = ref('')
  const chatStore = useChatStore()

  const chatSessionsCount = computed(() => chatStore.sessions?.length || 0)

  const metrics = computed(() => {
    const totalRuns = runs.value.length
    const completed = runs.value.filter((run) => ['COMPLETED', 'SUCCESS'].includes(normalizedStatus(run))).length
    const failed = runs.value.filter((run) => ['FAILED', 'CANCELLED'].includes(normalizedStatus(run))).length
    const successRate = totalRuns ? Math.round((completed / totalRuns) * 100) : 100
    const activeTasks = runs.value.filter((run) => ['RUNNING', 'PENDING', 'AWAITING_APPROVAL'].includes(normalizedStatus(run))).length
    const totalTokens = runs.value.reduce((sum, run) => sum + Number(run.total_tokens || run.totalTokens || 0), 0)
    const totalCost = runs.value.reduce((sum, run) => sum + Number(run.estimated_cost_usd || run.estimatedCostUsd || 0), 0)

    let successBadgeColor = 'green'
    if (totalRuns === 0) {
      successBadgeColor = 'gray'
    } else if (successRate >= 80) {
      successBadgeColor = 'green'
    } else if (successRate >= 50) {
      successBadgeColor = 'orange'
    } else {
      successBadgeColor = 'red'
    }

    return {
      totalRuns,
      completed,
      failed,
      successRate,
      successBadgeColor,
      activeTasks,
      totalTokens,
      totalCost,
      pendingApprovals: approvals.value.length,
    }
  })

  const loadData = async (silent = false) => {
    if (!silent) loading.value = true
    errorMessage.value = ''

    try {
      const [runsRes, approvalsRes] = await Promise.all([
        api.listRuns().catch(() => ({ data: [] })),
        api.listApprovals().catch(() => ({ data: [] })),
      ])

      runs.value = collectionFrom(runsRes, ['runs', 'items'])
      approvals.value = collectionFrom(approvalsRes, ['approvals', 'items'])
    } catch (error) {
      if (!silent) {
        errorMessage.value = error instanceof ApiError ? error.message : 'Unable to load dashboard metrics.'
      }
    } finally {
      if (!silent) loading.value = false
      isRefreshing.value = false
    }
  }

  const manualRefresh = () => {
    isRefreshing.value = true
    loadData(false)
  }

  let timer = null
  let socket = null

  onMounted(() => {
    loadData()

    timer = window.setInterval(() => {
      loadData(true)
    }, 5000)

    socket = createSocketClient()
    if (socket) {
      const refreshEvents = [
        'telemetry',
        'task_started',
        'task_completed',
        'task_failed',
        'approval_required',
        'approval_resolved',
        'workflow_completed',
        'workflow_failed',
        'run_status_changed',
      ]

      refreshEvents.forEach((eventName) => {
        socket.on(eventName, () => loadData(true))
      })

      socket.on('connect_error', () => {
        // Polling remains the fallback when WebSocket is unavailable.
      })
    }
  })

  onBeforeUnmount(() => {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }

    if (socket) {
      try {
        socket.disconnect()
      } catch {}
      socket = null
    }
  })

  return {
    runs,
    loading,
    isRefreshing,
    errorMessage,
    chatSessionsCount,
    metrics,
    manualRefresh,
  }
}
