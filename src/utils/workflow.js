export const getWorkflowTaskStatus = (task) => String(task?.status || task?.task_status || task?.state || 'PENDING').toUpperCase()

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
