import { onMounted, onUnmounted, ref } from 'vue'
import { api, ApiError } from '@/services/api'
import { createSocketClient } from '@/services/socket'
import {
  deriveWorkflowStatus,
  getWorkflowLogs,
  getWorkflowRunPayload,
  getWorkflowTasks,
  getWorkflowTaskStatus,
  isTerminalWorkflowStatus,
  isWorkflowRunning,
  normalizeWorkflowLog,
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

  const getEventRunId = (payload) => payload?.runId
    || payload?.run_id
    || payload?.payload?.runId
    || payload?.payload?.run_id

  const getEventData = (payload, eventName) => {
    if (eventName === 'telemetry') return payload?.payload || payload || {}
    return payload?.payload && payload?.event === eventName ? payload.payload : (payload || {})
  }

  const getTaskKey = (task) => {
    const value = task?.id
      || task?.task_id
      || task?.taskId
      || task?.node_key
      || task?.nodeKey
    return value ? String(value) : ''
  }

  const mergeWorkflowTasks = (currentTasks = [], incomingTasks = []) => {
    const merged = Array.isArray(currentTasks) ? currentTasks.map((task) => ({ ...task })) : []

    for (const incomingTask of (Array.isArray(incomingTasks) ? incomingTasks : [])) {
      const key = getTaskKey(incomingTask)
      const existingIndex = key
        ? merged.findIndex((task) => getTaskKey(task) === key)
        : -1

      if (existingIndex === -1) merged.push(incomingTask)
      else merged[existingIndex] = { ...merged[existingIndex], ...incomingTask }
    }

    return merged
  }

  const reconcileTerminalTasks = (tasks, status, errorMessage = '') => {
    const normalizedStatus = String(status || '').toUpperCase()
    if (!isTerminalWorkflowStatus(normalizedStatus)) return tasks

    const fallbackStatus = normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
    return (Array.isArray(tasks) ? tasks : []).map((task) => {
      const taskStatus = getWorkflowTaskStatus(task)
      if (['SUCCESS', 'COMPLETED', 'FAILED', 'SKIPPED'].includes(taskStatus)) return task

      return {
        ...task,
        status: fallbackStatus,
        ...(fallbackStatus === 'FAILED'
          ? { error_message: task.error_message || errorMessage || 'The workflow stopped before this task completed.' }
          : {}),
      }
    })
  }

  const getWorkflowLogKey = (entry, normalizedEntry) => {
    const explicitId = entry?.id
      || entry?.telemetryId
      || entry?.telemetry_id
      || entry?.log_id
      || entry?.logId
    if (explicitId) return String(explicitId)

    const payload = entry?.payload ?? entry?.details
    const payloadTaskId = payload?.taskId || payload?.task_id || entry?.taskId || entry?.task_id || ''
    const timestamp = normalizedEntry.created_at || ''
    const message = typeof normalizedEntry.message === 'string'
      ? normalizedEntry.message
      : stringifyWorkflowValue(normalizedEntry.message)
    return [normalizedEntry.event || 'activity', payloadTaskId, timestamp, message].join('|')
  }

  const mergeWorkflowLogs = (...collections) => {
    const merged = new Map()
    let fallbackIndex = 0

    for (const collection of collections) {
      const entries = Array.isArray(collection)
        ? collection
        : (Array.isArray(collection?.items) ? collection.items : [])

      for (const entry of entries) {
        const normalized = normalizeWorkflowLog(entry, fallbackIndex++)
        merged.set(getWorkflowLogKey(entry, normalized), normalized)
      }
    }

    return Array.from(merged.values()).sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0
      return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime)
    })
  }

  const getEventStatus = (eventName, data) => {
    const rawStatus = String(data?.status || data?.runStatus || data?.run_status || '').toUpperCase()
    if (eventName === 'run_finished' || eventName === 'workflow_completed') {
      return rawStatus === 'FAILED' ? 'FAILED' : 'COMPLETED'
    }
    if (eventName === 'workflow_failed') return 'FAILED'
    if (eventName === 'approval_required' || eventName === 'node_awaiting_approval') return 'AWAITING_APPROVAL'
    if (eventName === 'run_started' || eventName === 'node_running' || eventName === 'node_retrying') return 'RUNNING'
    if (eventName === 'run_status_changed') {
      if (rawStatus === 'WAITING' || rawStatus === 'WAITING_APPROVAL') return 'AWAITING_APPROVAL'
      if (rawStatus) return rawStatus
    }
    return ''
  }

  const getEventTask = (eventName, data, runId) => {
    const task = data?.task && typeof data.task === 'object' ? data.task : {}
    const taskId = data?.taskId || data?.task_id || task.id || task.taskId
    const nodeKey = data?.nodeKey || data?.node_key || task.nodeKey || task.node_key
    const taskStatus = eventName === 'node_running'
      ? 'RUNNING'
      : (eventName === 'node_success' || eventName === 'node_completed'
        ? 'SUCCESS'
        : (eventName === 'node_failed'
          ? 'FAILED'
          : (eventName === 'node_skipped'
            ? 'SKIPPED'
            : (eventName === 'approval_required' || eventName === 'node_awaiting_approval' ? 'AWAITING_APPROVAL' : ''))))

    if (!taskId && !nodeKey && !task.title && !data?.title) return null

    const nextTask = {
      ...task,
      id: taskId || nodeKey || `live-${eventName}`,
      run_id: runId,
    }

    if (taskId) nextTask.task_id = taskId
    if (nodeKey) nextTask.node_key = nodeKey

    const title = data?.title || data?.taskTitle || task.title || task.instruction || nodeKey
    if (title) nextTask.title = title

    const instruction = data?.instruction || task.instruction
    if (instruction) nextTask.instruction = instruction

    const assignedTool = data?.assignedTool || data?.assigned_tool || task.assignedTool || task.assigned_tool
    if (assignedTool) nextTask.assigned_tool = assignedTool

    const toolInput = data?.toolInput ?? data?.tool_input ?? task.toolInput ?? task.tool_input
    if (toolInput !== undefined) nextTask.tool_input = toolInput

    const toolOutput = data?.outputData ?? data?.toolOutput ?? data?.tool_output ?? task.toolOutput ?? task.tool_output
    if (toolOutput !== undefined) nextTask.tool_output = toolOutput

    const output = data?.outputData ?? data?.stdout ?? task.output
    if (output !== undefined) nextTask.output = output

    const errorMessage = data?.error || data?.reason || task.error_message
    if (errorMessage) nextTask.error_message = errorMessage

    nextTask.status = taskStatus || task.status || data?.status || 'PENDING'

    const executionTime = data?.latencyMs ?? data?.latency_ms ?? task.execution_time_ms
    if (executionTime !== undefined) nextTask.execution_time_ms = executionTime

    return nextTask
  }

  const getEventApproval = (data, currentApproval, runId) => {
    if (!data || (!data.approvalId && !data.approval_id && !data.taskId && !data.task_id && !data.actionSummary)) {
      return currentApproval
    }

    return {
      ...currentApproval,
      id: data.approvalId || data.approval_id || currentApproval?.id || `virtual-${runId}`,
      taskId: data.taskId || data.task_id || currentApproval?.taskId || null,
      taskTitle: data.title || data.taskTitle || currentApproval?.taskTitle || 'Approval required',
      assignedTool: data.assignedTool || data.assigned_tool || currentApproval?.assignedTool || 'workflow action',
      actionSummary: data.actionSummary || data.action_summary || data.reason || currentApproval?.actionSummary || 'Approval required for this action.',
      toolInput: data.toolInput ?? data.tool_input ?? currentApproval?.toolInput ?? '',
      choice: currentApproval?.choice || 'allow_once',
      rejectionReason: currentApproval?.rejectionReason || '',
    }
  }

  const applyWorkflowEvent = (index, payload, eventName) => {
    const message = currentMessages.value[index]
    if (!message?.workflow) return

    const workflow = message.workflow
    const runId = String(getEventRunId(payload) || workflow.runId || '')
    const data = getEventData(payload, eventName)
    const event = payload?.event || eventName
    const liveLog = normalizeWorkflowLog({
      ...payload,
      event,
      payload: eventName === 'telemetry' ? payload?.payload : data,
    }, (workflow.logs || []).length)
    const nextStatus = getEventStatus(event, data)
    const eventTask = getEventTask(event, data, runId)
    const nextTasks = eventTask
      ? mergeWorkflowTasks(workflow.tasks, [eventTask])
      : (workflow.tasks || [])
    const nextWorkflow = {
      logs: mergeWorkflowLogs(workflow.logs, [liveLog]),
      tasks: nextTasks,
    }

    if (nextStatus) nextWorkflow.status = nextStatus
    if (event === 'approval_required') {
      nextWorkflow.approval = getEventApproval(data, workflow.approval, runId)
      nextWorkflow.error = ''
    }
    if (event === 'workflow_failed' || (event === 'run_finished' && nextStatus === 'FAILED')) {
      nextWorkflow.error = data?.error || data?.message || data?.reason || workflow.error || 'Workflow failed.'
    }
    if (event === 'run_started' && (data?.summary || data?.plan)) {
      nextWorkflow.summary = data.summary
      nextWorkflow.plan = data.plan
    }
    if (isTerminalWorkflowStatus(nextStatus)) {
      nextWorkflow.tasks = reconcileTerminalTasks(
        nextWorkflow.tasks,
        nextStatus,
        data?.error || data?.message || data?.reason,
      )
      nextWorkflow.completedAt = data?.completedAt || data?.completed_at || workflow.completedAt || new Date().toISOString()
      nextWorkflow.approval = null
    }

    updateWorkflowMessage(index, nextWorkflow)
    scrollToBottom()
  }

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
      const workflowRun = getWorkflowRunPayload(response) || {}
      const currentWorkflow = currentMessages.value[index]?.workflow || {}
      const tasks = mergeWorkflowTasks(currentWorkflow.tasks, getWorkflowTasks(workflowRun))
      const logs = mergeWorkflowLogs(currentWorkflow.logs, getWorkflowLogs(workflowRun))
      const workflowStatus = workflowRun.status || workflowRun.run_status || workflowRun.state
      const workflowErrorValue = workflowRun.error || workflowRun.error_message || workflowRun.failure_reason || ''
      const workflowError = workflowErrorValue ? stringifyWorkflowValue(workflowErrorValue) : ''
      const awaitingTask = tasks.find((task) => getWorkflowTaskStatus(task) === 'AWAITING_APPROVAL')
      const awaitingApproval = String(workflowStatus || '').toUpperCase() === 'AWAITING_APPROVAL' || Boolean(awaitingTask)
      const existingApproval = currentWorkflow.approval || null

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
        const refreshedStatus = deriveWorkflowStatus(workflowStatus, tasks)
        // A socket event can mark the run terminal just before the database
        // response catches up. Do not make the one visible response jump back
        // to RUNNING during that short reconciliation window.
        const status = isTerminalWorkflowStatus(currentWorkflow.status) && !isTerminalWorkflowStatus(refreshedStatus)
          ? currentWorkflow.status
          : refreshedStatus
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
          tasks: reconcileTerminalTasks(tasks, status, workflowError),
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
        'run_started',
        'run_finished',
        'node_running',
        'node_success',
        'node_completed',
        'node_failed',
        'node_skipped',
        'node_awaiting_approval',
        'node_retrying',
        'node_error_trace',
        'self_healing_started',
        'self_healing_required',
        'self_healing_retry_count_updated',
        'self_healing_skipped',
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
          const runId = getEventRunId(payload)
          if (runId) {
            const index = currentMessages.value.findIndex((message) => String(message.workflow?.runId) === String(runId))
            if (index !== -1) {
              applyWorkflowEvent(index, payload, eventName)
              refreshWorkflowMessage(index, runId)
            }
          } else {
            currentMessages.value.forEach((message, index) => {
              if (message.workflow?.runId && isWorkflowRunning(message.workflow)) {
                applyWorkflowEvent(index, payload, eventName)
                refreshWorkflowMessage(index, message.workflow.runId)
              }
            })
          }
        })
      })

      const joinActiveRuns = () => {
        currentMessages.value.forEach((message) => {
          if (message.workflow?.runId && isWorkflowRunning(message.workflow)) {
            try {
              workflowSocket.emit('join_run', String(message.workflow.runId))
            } catch {}
          }
        })
      }

      workflowSocket.on('connect', joinActiveRuns)
      joinActiveRuns()
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
