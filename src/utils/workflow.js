export const getWorkflowTaskStatus = (task) => String(task?.status || task?.task_status || task?.state || 'PENDING').toUpperCase()

const asCollection = (value) => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.data)) return value.data
  return []
}

const firstNonEmptyCollection = (...values) => {
  for (const value of values) {
    const collection = asCollection(value)
    if (collection.length) return collection
  }
  return []
}

export const getWorkflowRunPayload = (response) => {
  const payload = response?.data ?? response
  return payload?.run
    || payload?.workflow
    || payload?.data?.run
    || payload?.data?.workflow
    || payload?.data
    || payload
}

export const getWorkflowRunId = (response) => {
  const payload = response?.data ?? response
  const nestedPayload = payload?.data
  return response?.runId
    || response?.run_id
    || response?.id
    || payload?.runId
    || payload?.run_id
    || payload?.id
    || nestedPayload?.runId
    || nestedPayload?.run_id
    || nestedPayload?.id
    || nestedPayload?.run?.runId
    || nestedPayload?.run?.run_id
    || nestedPayload?.run?.id
    || nestedPayload?.workflow?.runId
    || nestedPayload?.workflow?.run_id
    || nestedPayload?.workflow?.id
    || payload?.run?.runId
    || payload?.run?.run_id
    || payload?.run?.id
    || payload?.workflow?.runId
    || payload?.workflow?.run_id
    || payload?.workflow?.id
}

export const getWorkflowTasks = (workflow) => firstNonEmptyCollection(workflow?.tasks, workflow?.nodes)

export const getWorkflowLogs = (workflow) => firstNonEmptyCollection(
  workflow?.logs,
  workflow?.activity_logs,
  workflow?.activityLogs,
  workflow?.events,
  workflow?.telemetry,
)

export const normalizeWorkflowLog = (entry, index = 0) => {
  const eventName = entry?.event || entry?.event_name || entry?.eventName || entry?.type || entry?.kind
  const payload = entry?.payload ?? entry?.details
  const eventText = typeof eventName === 'string' ? eventName : ''
  const level = String(
    entry?.level
      || entry?.severity
      || (/(failed|error|exception)/i.test(`${eventText} ${entry?.message || ''}`) ? 'ERROR' : '')
      || (/(approval|awaiting|warn)/i.test(`${eventText} ${entry?.message || ''}`) ? 'WARN' : 'INFO'),
  ).toUpperCase()

  return {
    ...entry,
    id: entry?.id ?? entry?.log_id ?? entry?.logId ?? `${eventName || 'activity'}-${index}`,
    level,
    source: entry?.source || entry?.service || entry?.component || eventText.split('_')[0]?.toUpperCase() || 'SYSTEM',
    created_at: entry?.created_at || entry?.createdAt || entry?.timestamp || entry?.occurred_at || entry?.time,
    message: entry?.message ?? entry?.description ?? eventName ?? payload ?? entry,
    payload,
    event: eventName,
  }
}

export const stringifyWorkflowValue = (value, fallback = '') => {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export const isWorkflowRunning = (workflow) => {
  const status = String(workflow?.status || '').toUpperCase()
  return ['STARTING', 'PENDING', 'RUNNING', 'AWAITING_APPROVAL'].includes(status)
}

export const isTerminalWorkflowStatus = (status) => [
  'COMPLETED',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'REJECTED',
].includes(String(status || '').toUpperCase())

export const deriveWorkflowStatus = (rawStatus, tasks = []) => {
  const status = String(rawStatus || 'RUNNING').toUpperCase()
  if (['COMPLETED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REJECTED', 'AWAITING_APPROVAL'].includes(status)) {
    return status
  }

  const taskStatuses = tasks.map(getWorkflowTaskStatus)
  if (taskStatuses.some((taskStatus) => ['FAILED', 'CANCELLED'].includes(taskStatus))) return 'FAILED'
  if (taskStatuses.length && taskStatuses.every((taskStatus) => ['COMPLETED', 'SUCCESS', 'SKIPPED'].includes(taskStatus))) {
    return 'COMPLETED'
  }
  return status
}
