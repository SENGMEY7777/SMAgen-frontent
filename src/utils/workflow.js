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
    id: entry?.id
      ?? entry?.telemetryId
      ?? entry?.telemetry_id
      ?? entry?.log_id
      ?? entry?.logId
      ?? `${eventName || 'activity'}-${index}`,
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
    title: 'A workflow step failed',
    message: /^workflow failed\.?$/i.test(message)
      ? 'The workflow stopped because one of its tasks failed before completion.'
      : `The workflow stopped because ${message || 'one of its tasks failed before completion.'}`,
    nextStep: 'Open View steps and expand the failed task to see the exact error, then correct it and run the workflow again.',
  }

  if (code === 'LOCAL_DESKTOP_FILE_NOT_FOUND' || code === 'LOCAL_DESKTOP_PATH_NOT_FOUND' || /requested Desktop (?:file|path) was not found|local Desktop path was not found/.test(fingerprint)) {
    explanation = {
      title: 'The file was not found',
      message: 'KAIRO could not find that file in the active Desktop project, so it stopped without deleting anything.',
      nextStep: 'Check the filename and specify the project-relative path, for example: Workflow/src/views/LoginView.php.',
    }
  } else if (code === 'LOCAL_DESKTOP_DESTINATION_EXISTS' || /destination Desktop path already exists/.test(fingerprint)) {
    explanation = {
      title: 'The rename destination already exists',
      message: 'KAIRO found another file or folder at the new name, so it stopped without changing the original project.',
      nextStep: 'Choose a different destination name, or explicitly ask to merge or replace the existing destination after confirming its contents.',
    }
  } else if (code === 'LOCAL_DESKTOP_FILE_AMBIGUOUS' || /more than one Desktop file matches/.test(fingerprint)) {
    explanation = {
      title: 'More than one matching file was found',
      message: 'KAIRO found multiple files with that name and did not guess which one to delete.',
      nextStep: 'Run the request again with the exact project-relative path, for example: Workflow/src/views/LoginView.php.',
    }
  } else if (code === 'LOCAL_FILE_PATH_TYPE_MISMATCH') {
    explanation = {
      title: 'The existing target has the wrong type',
      message: 'KAIRO found a folder where the project expected a file, so it stopped without changing that path.',
      nextStep: 'Check the project structure and choose a file path that is not already used by a folder.',
    }
  } else if (code === 'LOCAL_DESKTOP_PATH_TYPE_MISMATCH' || /Desktop path is not a file/.test(fingerprint)) {
    explanation = {
      title: 'The Desktop target type does not match',
      message: 'KAIRO found an item at the requested Desktop path, but it is not the type required by this task.',
      nextStep: 'Check whether the path should be a folder or a file, then run the request with the correct path.',
    }
  } else if (/self-healing reflection failed|reflection.*gemini|automatic repair was unavailable|gemini service is temporarily unavailable/.test(fingerprint)) {
    explanation = {
      title: 'The task failed and automatic repair was unavailable',
      message: 'A workflow task could not finish. KAIRO could not generate a safe correction because the Gemini repair service was temporarily unavailable, so dependent tasks were stopped safely.',
      nextStep: 'Open View steps to inspect the failed task, then try again when the Gemini service is available.',
    }
  } else if (code === 'LLM_TIMEOUT' || /timed out|timeout/.test(fingerprint)) {
    explanation = {
      title: 'The workflow planner took too long',
      message: 'The AI planner did not finish creating an execution plan within the allowed time.',
      nextStep: 'Try again in a moment. If it keeps happening, check the Gemini model, API key, network connection, and server timeout setting.',
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
      nextStep: 'Start the supported Node.js or Docker backend and confirm its /health endpoint is reachable, then try again.',
    }
  } else if (/server file access is read-only|server file access/.test(fingerprint)) {
    explanation = {
      title: 'The server is in read-only mode',
      message: 'The workflow can read server files, but it is not allowed to create or update files.',
      nextStep: 'Set SERVER_FILE_ACCESS=read-write on the Node.js server, restart it, and approve the requested file changes.',
    }
  } else if (/file already exists|eexist|overwrite.*not permitted|already exists.*overwrite/.test(fingerprint)) {
    explanation = {
      title: 'The requested target already exists',
      message: 'KAIRO stopped because this task tried to create a file or folder that is already on the Desktop. It did not overwrite the existing item automatically.',
      nextStep: 'For removal, run the request again after the updated removal workflow is active. For changes, explicitly ask to update or overwrite the existing file.',
    }
  } else if (/proposed tool input is unchanged|self-healing stopped/.test(fingerprint)) {
    explanation = {
      title: 'Automatic repair could not find a safe change',
      message: 'The repair engine returned the same task input, so KAIRO stopped instead of repeating the same failure.',
      nextStep: 'Review the failed step details, correct the underlying command or file path, and run the workflow again.',
    }
  } else if (/workspace symlink|symlinks cannot be exported/.test(fingerprint)) {
    explanation = {
      title: 'The project could not be exported',
      message: 'The generated project contains a dependency symlink that cannot be copied to the destination.',
      nextStep: 'Remove node_modules from the export or export the source files without installed dependencies.',
    }
  } else if (/shell chaining|\&\&|shell operators|command chaining/.test(fingerprint)) {
    explanation = {
      title: 'A command was blocked for safety',
      message: 'The workflow tried to run a command that is not allowed by the execution safety rules.',
      nextStep: 'Ask for the commands to run as separate safe steps instead of one chained command.',
    }
  } else if (/command is not allowed|not allowed by the executor|security policy/.test(fingerprint)) {
    explanation = {
      title: 'The requested runtime is not enabled',
      message: 'The workflow requested a command that the backend safety allowlist does not currently support.',
      nextStep: 'Restart the backend after enabling the required runtime command, then run the workflow again.',
    }
  } else if (/externally-managed-environment|pep\s*668|break-system-packages|system pip/.test(fingerprint)) {
    explanation = {
      title: 'Python dependencies must stay inside the virtual environment',
      message: 'macOS blocked installation through the system Python environment. The project virtual environment must be used for package installation.',
      nextStep: 'Run the install step with ./venv/bin/python -m pip install -r requirements.txt, then run validation again. Do not use system pip, --user, or --break-system-packages.',
    }
  } else if (/missing.*(?:build|script)|(?:build|script).*missing|npm run build.*(?:failed|error)/.test(fingerprint)) {
    explanation = {
      title: 'The project build script is missing',
      message: 'The Vue project does not contain a usable package.json build script, so production verification could not start.',
      nextStep: 'KAIRO should add "build": "vite build" to package.json before running npm run build. Retry the workflow after restarting the backend with the latest planner.',
    }
  } else if (code === 'LLM_INVALID_JSON' || /bad escaped character|invalid escape|malformed json|unexpected token.*json|json\.parse/.test(fingerprint)) {
    explanation = {
      title: 'The AI planner returned malformed JSON',
      message: 'The AI generated a plan containing an invalid escaped character, so KAIRO stopped before executing any task.',
      nextStep: 'Retry the workflow. KAIRO now repairs common backslashes from regexes, source code, and file paths; if it continues, shorten the prompt and remove large pasted code blocks.',
    }
  } else if (/\beslint\b|\bnpm\s+(?:run\s+)?lint\b|\bprettier\b/.test(fingerprint)) {
    explanation = {
      title: 'Project verification failed',
      message: 'The project files were created, but the requested code-quality check returned an error.',
      nextStep: 'Open the activity details to read the exact lint output, then add the required configuration or fix the reported files and run the check again.',
    }
  } else if (/execution safety policy blocked|self-healing skipped.*policy/.test(fingerprint)) {
    explanation = {
      title: 'The command was blocked for safety',
      message: 'KAIRO stopped before retrying because the server safety policy rejected the command.',
      nextStep: 'Use an allowed command as a separate workflow step and try again.',
    }
  } else if (/remote server returned an internal error|remote server itself|internal server error/.test(fingerprint)) {
    explanation = {
      title: 'The remote server has an internal error',
      message: 'KAIRO cannot repair code running on a remote server using a request retry alone.',
      nextStep: 'Open the remote server logs or provide its source code, fix the server there, and run the request again.',
    }
  } else if (/maximum self-healing retries exceeded|maximum.*retries/.test(fingerprint)) {
    explanation = {
      title: 'Automatic repair attempts were exhausted',
      message: 'KAIRO tried the configured number of safe repairs, but the task still failed.',
      nextStep: 'Open the failed step details, correct the underlying issue, and retry the workflow.',
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
