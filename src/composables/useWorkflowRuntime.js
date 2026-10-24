import { onMounted, onUnmounted, ref } from 'vue'
import { api, ApiError } from '@/services/api'
import { createSocketClient } from '@/services/socket'
import {
  deriveWorkflowStatus,
  getWorkflowTaskStatus,
  isTerminalWorkflowStatus,
  isWorkflowRunning,
  stringifyWorkflowValue,
} from '@/utils/workflow'

export function useWorkflowRuntime({
  chatStore,
  currentMessages,
  updateWorkflowMessage,
  scrollToBottom,
}) {
  const workflowPollers = new Map()
  const workflowRefreshes = new Set()
  const timerTick = ref(0)
  let timerInterval = null
  let workflowSocket = null

  const stopWorkflowPolling = (runId) => {
    const poller = workflowPollers.get(String(runId))
    if (poller) {
      window.clearInterval(poller)
      workflowPollers.delete(String(runId))
    }
  }

  const findWorkflowApproval = async (run, task, runId, existingApproval = null) => {
    let approval = null
    try {
      const response = await api.listApprovals()
      const approvalPayload = response?.data || response
      const approvals = Array.isArray(approvalPayload)
        ? approvalPayload
        : (approvalPayload?.approvals || approvalPayload?.items || [])
      approval = approvals.find((item) => {
        if (task?.id && (String(item.task_id) === String(task.id) || String(item.taskId) === String(task.id))) return true
        return String(item.run_id || item.runId) === String(runId)
      }) || null
    } catch {
      // The run/task state is still enough to render a local approval request.
    }

    if (approval?.id) {
      const details = await api.getApproval(approval.id).catch(() => ({ data: approval }))
      const detailPayload = details?.data?.approval || details?.data || details?.approval || details
      approval = { ...approval, ...(detailPayload || {}) }
    }

    const approvalId = approval?.id || existingApproval?.id || `virtual-${runId}`
    return {
      id: approvalId,
      taskId: task?.id || approval?.task_id || approval?.taskId || existingApproval?.taskId || null,
      taskTitle: task?.title || approval?.task_title || approval?.taskTitle || existingApproval?.taskTitle || 'Approval required',
      assignedTool: task?.assigned_tool || approval?.assigned_tool || approval?.assignedTool || existingApproval?.assignedTool || 'workflow action',
      actionSummary: approval?.action_summary || approval?.actionSummary || task?.instruction || existingApproval?.actionSummary || run?.goal_prompt || 'Approval required for this action.',
      toolInput: approval?.tool_input || approval?.toolInput || task?.tool_input || existingApproval?.toolInput || '',
      choice: existingApproval?.choice || 'allow_once',
      rejectionReason: existingApproval?.rejectionReason || '',
    }
  }

  const refreshWorkflowMessage = async (index, runId) => {
    const key = `${chatStore.activeSessionId}:${index}:${runId}`
    if (workflowRefreshes.has(key)) return
    workflowRefreshes.add(key)

    try {
      const response = await api.getRun(String(runId))
      const workflowRun = response?.data?.run
        || response?.data?.workflow
        || response?.data
        || response?.run
        || response?.workflow
        || response
        || {}
      const tasks = Array.isArray(workflowRun.tasks)
        ? workflowRun.tasks
        : (workflowRun.tasks?.items || workflowRun.tasks?.data || [])
      const logs = Array.isArray(workflowRun.logs)
        ? workflowRun.logs
        : (workflowRun.logs?.items || workflowRun.logs?.data || [])
      const workflowStatus = workflowRun.status || workflowRun.run_status || workflowRun.state
      const workflowErrorValue = workflowRun.error || workflowRun.error_message || workflowRun.failure_reason || ''
      const workflowError = workflowErrorValue ? stringifyWorkflowValue(workflowErrorValue) : ''
      const awaitingTask = tasks.find((task) => getWorkflowTaskStatus(task) === 'AWAITING_APPROVAL')
      const awaitingApproval = String(workflowStatus || '').toUpperCase() === 'AWAITING_APPROVAL' || Boolean(awaitingTask)
      const existingApproval = currentMessages.value[index]?.workflow?.approval || null

      if (awaitingApproval) {
        const approval = await findWorkflowApproval(workflowRun, awaitingTask, runId, existingApproval)
        updateWorkflowMessage(index, {
          status: 'AWAITING_APPROVAL',
          approval,
          tasks,
          logs,
          error: workflowError,
        })
      } else {
        const status = deriveWorkflowStatus(workflowStatus, tasks)
        const currentWorkflow = currentMessages.value[index]?.workflow || {}
        const isTerminal = isTerminalWorkflowStatus(status)
        let completedAt = currentWorkflow.completedAt || workflowRun.completed_at || workflowRun.completedAt || null
        let finalSeconds = currentWorkflow.finalSeconds || null

        if (isTerminal && !finalSeconds) {
          completedAt = completedAt || new Date().toISOString()
          const started = currentWorkflow.startedAt || (currentWorkflow.createdAt ? new Date(currentWorkflow.createdAt).getTime() : null)
          finalSeconds = started
            ? Math.max(1, Math.round((new Date(completedAt).getTime() - started) / 1000))
            : (currentWorkflow.elapsedSeconds || 1)
        }

        updateWorkflowMessage(index, {
          status,
          approval: null,
          tasks,
          logs,
          completedAt,
          finalSeconds,
          error: workflowError,
        })
        if (isTerminal) stopWorkflowPolling(runId)
      }
    } catch (error) {
      if (!currentMessages.value[index]?.workflow?.approval) {
        updateWorkflowMessage(index, {
          error: error instanceof ApiError ? error.message : 'Unable to refresh workflow status.',
        })
      }
    } finally {
      workflowRefreshes.delete(key)
      scrollToBottom()
    }
  }

  const startWorkflowPolling = (index, runId) => {
    const key = String(runId)
    if (workflowPollers.has(key)) return

    refreshWorkflowMessage(index, runId)
    const poller = window.setInterval(() => {
      if (!currentMessages.value[index]?.workflow) {
        stopWorkflowPolling(runId)
        return
      }
      refreshWorkflowMessage(index, runId)
    }, 2000)
    workflowPollers.set(key, poller)

    if (workflowSocket) {
      try {
        workflowSocket.emit('join_run', key)
      } catch {}
    }
  }

  const skipWorkflowApproval = (message) => {
    const index = currentMessages.value.indexOf(message)
    if (index === -1) return
    updateWorkflowMessage(index, {
      error: 'This approval is still pending. Select an option and press Submit when you are ready.',
    })
  }

  const submitWorkflowApproval = async (message) => {
    const index = currentMessages.value.indexOf(message)
    const workflow = index === -1 ? null : currentMessages.value[index]?.workflow
    const approval = workflow?.approval
    if (!workflow || !approval || workflow.decisionPending) return

    const isRejecting = approval.choice === 'reject'
    if (isRejecting && !approval.rejectionReason?.trim()) {
      updateWorkflowMessage(index, { error: 'Tell SMAgen what to do instead before submitting.' })
      return
    }

    updateWorkflowMessage(index, { decisionPending: true, error: '' })
    const approvalId = String(approval.id || '')
    const isRealApproval = approvalId && !approvalId.startsWith('virtual-')
    const status = isRejecting ? 'REJECTED' : 'APPROVED'
    const runId = String(workflow.runId || '')
    let decisionRecorded = false

    if (runId) stopWorkflowPolling(runId)

    try {
      if (isRealApproval) {
        try {
          await api.decideApproval(approvalId, {
            status,
            ...(isRejecting ? { rejectionReason: approval.rejectionReason.trim() } : {}),
          })
          decisionRecorded = true
        } catch (error) {
          if (status === 'REJECTED') throw error
        }
      }

      if (status === 'APPROVED') {
        if (!runId) throw new ApiError('This approval is missing its workflow run ID.')
        try {
          await api.resumeWorkflow(runId)
        } catch (resumeError) {
          if (resumeError?.status !== 409 && !decisionRecorded) throw resumeError
        }
      }

      updateWorkflowMessage(index, {
        status: status === 'APPROVED' ? 'RUNNING' : 'REJECTED',
        approval: null,
        decisionPending: false,
        error: '',
      })

      if (runId) {
        await new Promise((resolve) => window.setTimeout(resolve, 500))
        await refreshWorkflowMessage(index, runId)
        if (!isTerminalWorkflowStatus(currentMessages.value[index]?.workflow?.status)) {
          startWorkflowPolling(index, runId)
        }
      }
    } catch (error) {
      updateWorkflowMessage(index, {
        decisionPending: false,
        error: error instanceof ApiError ? error.message : 'Unable to submit this workflow decision.',
      })
    }
  }

  onMounted(() => {
    currentMessages.value.forEach((message, index) => {
      if (message.workflow?.runId && !isTerminalWorkflowStatus(message.workflow.status)) {
        startWorkflowPolling(index, message.workflow.runId)
      }
    })

    workflowSocket = createSocketClient()
    if (workflowSocket) {
      const refreshEvents = [
        'telemetry',
        'task_started',
        'task_completed',
        'task_failed',
        'approval_required',
        'workflow_completed',
        'workflow_failed',
        'run_status_changed',
      ]
      refreshEvents.forEach((eventName) => {
        workflowSocket.on(eventName, (payload) => {
          const runId = payload?.runId || payload?.run_id
          if (runId) {
            const index = currentMessages.value.findIndex((message) => String(message.workflow?.runId) === String(runId))
            if (index !== -1) refreshWorkflowMessage(index, runId)
          } else {
            currentMessages.value.forEach((message, index) => {
              if (message.workflow?.runId && isWorkflowRunning(message.workflow)) {
                refreshWorkflowMessage(index, message.workflow.runId)
              }
            })
          }
        })
      })
    }

    timerInterval = window.setInterval(() => {
      if (currentMessages.value.some((message) => message.workflow && isWorkflowRunning(message.workflow))) {
        timerTick.value++
      }
    }, 1000)
  })

  onUnmounted(() => {
    if (timerInterval) {
      window.clearInterval(timerInterval)
      timerInterval = null
    }
    workflowPollers.forEach((poller) => window.clearInterval(poller))
    workflowPollers.clear()
    if (workflowSocket) {
      try {
        workflowSocket.disconnect()
      } catch {}
      workflowSocket = null
    }
  })

  return {
    timerTick,
    startWorkflowPolling,
    stopWorkflowPolling,
    refreshWorkflowMessage,
    skipWorkflowApproval,
    submitWorkflowApproval,
  }
}
