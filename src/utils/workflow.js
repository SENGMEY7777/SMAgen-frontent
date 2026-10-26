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

const parseWorkflowErrorValue = (value) => {
  if (typeof value !== 'string') return value

  const text = value.trim()
  if (!text.startsWith('{') && !text.startsWith('[')) return value

  try {
    return JSON.parse(text)
  } catch {
    return value
  }
}

const getWorkflowErrorMessage = (value) => {
  const parsed = parseWorkflowErrorValue(value)
  const nestedError = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null
  const candidates = [
    parsed?.message,
    nestedError?.message,
    parsed?.detail,
    nestedError?.detail,
    typeof parsed === 'string' ? parsed : '',
  ]

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || ''
}

const getWorkflowErrorCode = (value) => {
  const parsed = parseWorkflowErrorValue(value)
  const nestedError = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null
  return String(parsed?.code || nestedError?.code || '').trim().toUpperCase()
}

const getWorkflowErrorStatus = (value) => {
  const parsed = parseWorkflowErrorValue(value)
  const nestedError = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null
  return Number(parsed?.status || nestedError?.status || 0)
}

const compactWorkflowTechnicalDetail = (message) => {
  const withoutStack = String(message || '').split(/\n\s*at\s+/i)[0]
  const compact = withoutStack.replace(/\s+/g, ' ').trim()
  return compact.length > 240 ? `${compact.slice(0, 237).trimEnd()}…` : compact
}

export const explainWorkflowError = (value) => {
  if (value == null || value === '') return null

  const message = getWorkflowErrorMessage(value)
  const code = getWorkflowErrorCode(value)
  const status = getWorkflowErrorStatus(value)
  const fingerprint = `${code} ${message}`.toLowerCase()

  if (!message && !code && !status) return null

  let explanation = {
    title: 'Workflow stopped',
    message: 'The workflow could not complete because an unexpected error occurred.',
    nextStep: 'Try again. If the problem continues, open the activity logs and share the technical details.',
  }

  if (code === 'LLM_TIMEOUT' || /timed out|timeout/.test(fingerprint)) {
    explanation = {
      title: 'The workflow planner took too long',
      message: 'The AI planner did not finish creating an execution plan within the allowed time.',
      nextStep: 'Try again. If it keeps happening, check the Gemini model, API key, and internet connection.',
    }
  } else if (code === 'LLM_UNAVAILABLE' || /gemini request|llm service|generativelanguage/.test(fingerprint)) {
    explanation = {
      title: 'The AI planner is unavailable',
      message: 'The workflow could not start because the AI service did not return a valid plan.',
      nextStep: 'Try again after checking that the Gemini API key, model, and backend connection are available.',
    }
  } else if (code === 'NETWORK_ERROR' || /unable to connect|failed to fetch|network error/.test(fingerprint)) {
    explanation = {
      title: 'SMAgen could not connect to the server',
      message: 'The workflow request did not reach the SMAgen backend.',
      nextStep: 'Make sure the backend is running on port 8082, then try again.',
    }
  } else if (/workspace symlink|symlinks cannot be exported/.test(fingerprint)) {
    explanation = {
      title: 'The project could not be exported',
      message: 'The generated project contains a dependency symlink that cannot be copied to the destination.',
      nextStep: 'Remove node_modules from the export or export the source files without installed dependencies.',
    }
  } else if (/shell chaining|\&\&|command.*not allowed/.test(fingerprint)) {
    explanation = {
      title: 'A command was blocked for safety',
      message: 'The workflow tried to run a command that is not allowed by the execution safety rules.',
      nextStep: 'Ask for the commands to run as separate safe steps instead of one chained command.',
    }
  } else if ([401, 403].includes(status) || /unauthorized|forbidden|api key/.test(fingerprint)) {
    explanation = {
      title: 'Authorization is required',
      message: 'The server or AI provider rejected the workflow request because the credentials are missing or invalid.',
      nextStep: 'Check your login session and the configured API credentials, then try again.',
    }
  } else if (code === 'TASK_EXECUTION_ERROR' || /execution failed|command failed|task failed/.test(fingerprint)) {
    explanation = {
      title: 'A workflow step failed',
      message: 'The plan was created, but one of its tasks could not finish successfully.',
      nextStep: 'Open the workflow steps or activity logs to see which task failed, then retry with that issue corrected.',
    }
  }

  return {
    ...explanation,
    technicalDetail: compactWorkflowTechnicalDetail(message || code || (status ? `HTTP ${status}` : 'Unknown workflow error')),
  }
}

export const formatWorkflowError = (value) => {
  const explanation = explainWorkflowError(value)
  if (!explanation) return 'The workflow could not be completed.'
  return `${explanation.title}. ${explanation.message} Next step: ${explanation.nextStep}`
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
