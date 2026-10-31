

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

const normalizeApiBaseUrl = (value) => {
  if (!value || !/^(?:https?:\/\/|\/)/i.test(value)) return '/api/v1'
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api/v1'

  try {
    const parsed = new URL(value)
    const path = parsed.pathname.replace(/\/+$/, '')

    // Accept a production origin such as https://api.example.com while still
    // sending requests to the backend's actual API namespace.
    if (!path || path === '/') parsed.pathname = '/api/v1'
    else if (path === '/api') parsed.pathname = '/api/v1'
    else parsed.pathname = path

    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return '/api/v1'
  }
}

const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl)

export class ApiError extends Error {
  constructor(message, status = 0, code = 'API_ERROR', details = null, retryAfter = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
  }
}

const getToken = () => localStorage.getItem('omni_token')

const isJsonContentType = (contentType) => contentType.toLowerCase().includes('json')

const isHtmlGatewayError = (value) => (
  typeof value === 'string'
  && /<!doctype\s+html|<html[\s>]|<title>\s*\d{3}\s+[^<]*<\/title>|nginx\//i.test(value)
)

const getApiErrorMessage = (payload, status) => {
  // Reverse proxies often return an HTML error page when the API is down.
  // Never show that implementation detail in the chat UI.
  if (isHtmlGatewayError(payload)) {
    if (status === 502) {
      return 'The KAIRO backend is temporarily unavailable. Please start the backend server and try again.'
    }
    if (status === 503) {
      return 'The KAIRO backend is temporarily unavailable for maintenance. Please try again shortly.'
    }
    if (status === 504) {
      return 'The KAIRO backend took too long to respond. Please try again shortly.'
    }
    return `KAIRO could not complete the request (HTTP ${status}). Please try again.`
  }

  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  return payload?.message
    || payload?.detail
    || payload?.error?.message
    || (status ? `The request failed with HTTP ${status}.` : 'The request could not be completed.')
}

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {})
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    throw new ApiError('Unable to connect to the SMAgen server.', 0, 'NETWORK_ERROR')
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = isJsonContentType(contentType)
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok || payload?.success === false) {
    const error = payload?.error || {}
    const retryHeader = response.headers.get('retry-after')
    const retryParsed = retryHeader ? Number.parseInt(retryHeader, 10) : null
    const retryAfter = payload?.retryAfter
      || error.retryAfter
      || (Number.isFinite(retryParsed) && retryParsed > 0 ? retryParsed : null)

    throw new ApiError(
      getApiErrorMessage(payload, response.status),
      response.status,
      error.code || payload?.title || 'API_ERROR',
      payload,
      retryAfter,
    )
  }

  return payload
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

const chatBody = (message, history) => ({ message, history })

const extractStreamText = (value) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return ''

  // API responses may wrap the assistant answer in data while using the
  // top-level message for a generic status such as "Chat response generated".
  const nestedDataText = extractStreamText(value.data)
  if (nestedDataText) return nestedDataText

  const choice = value.choices?.[0]
  const candidates = [
    value.delta,
    value.token,
    value.text,
    value.content,
    value.message,
    value.error?.message,
    value.error,
    choice?.delta?.content,
    choice?.text,
  ]

  for (const candidate of candidates) {
    const text = typeof candidate === 'object' ? extractStreamText(candidate) : candidate
    if (typeof text === 'string' && text) return text
  }

  return ''
}

const parseStreamPayload = (payload) => {
  if (!payload || payload === '[DONE]') return ''
  try {
    return extractStreamText(JSON.parse(payload))
  } catch {
    return payload
  }
}

const streamChat = async (message, history = [], options = {}) => {
  const { signal, onChunk, headers: optionHeaders = {} } = options
  const headers = new Headers(optionHeaders)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'text/event-stream, application/x-ndjson, text/plain, application/json')

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatBody(message, history)),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Unable to connect to the SMAgen server.', 0, 'NETWORK_ERROR')
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const payload = isJsonContentType(contentType)
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')
    const error = payload?.error || {}
    throw new ApiError(
      getApiErrorMessage(payload, response.status),
      response.status,
      error.code || payload?.title || 'API_ERROR',
      payload,
    )
  }

  const onText = typeof onChunk === 'function' ? onChunk : () => {}
  const contentType = response.headers.get('content-type') || ''
  let accumulated = ''

  const emit = (text) => {
    if (!text) return
    accumulated += text
    onText(text)
  }

  const revealText = async (text) => {
    if (!text) return
    const chunkSize = Math.max(12, Math.ceil(text.length / 80))
    for (let index = 0; index < text.length; index += chunkSize) {
      if (signal?.aborted) {
        const abortError = new Error('The response stream was stopped.')
        abortError.name = 'AbortError'
        throw abortError
      }
      emit(text.slice(index, index + chunkSize))
      if (index + chunkSize < text.length) {
        await new Promise((resolve) => window.setTimeout(resolve, 16))
      }
    }
  }

  // A non-streaming server can still answer this request with the existing JSON shape.
  if (contentType.includes('application/json') || !response.body) {
    const payload = await response.json().catch(() => null)
    const text = extractStreamText(payload)
    // Keep the chat feeling live on older deployments that return one JSON
    // response instead of SSE/NDJSON. Native stream responses still use the
    // network chunks below and are not delayed by this fallback.
    await revealText(text)
    return { message: accumulated }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const flushSseEvent = (event) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    emit(parseStreamPayload(data))
  }

  const flushJsonLine = (line) => {
    emit(parseStreamPayload(line.trim()))
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    if (contentType.includes('text/event-stream')) {
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ''
      events.forEach(flushSseEvent)
    } else if (contentType.includes('application/x-ndjson') || contentType.includes('application/jsonl')) {
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      lines.forEach(flushJsonLine)
    } else if (!done) {
      // Plain text streaming responses can be rendered as soon as each network chunk arrives.
      emit(buffer)
      buffer = ''
    }

    if (done) break
  }

  if (contentType.includes('text/event-stream')) {
    if (buffer.trim()) flushSseEvent(buffer)
  } else if (contentType.includes('application/x-ndjson') || contentType.includes('application/jsonl')) {
    if (buffer.trim()) flushJsonLine(buffer)
  } else if (buffer) {
    emit(buffer)
  }

  return { message: accumulated }
}

export const api = {
  developerLogin: (body) => request('/developers/login', json('POST', body)),
  developerRegister: (body) => request('/developers/register', json('POST', body)),
  resendVerification: (email) => request('/developers/resend-verification', json('POST', { email })),
  verifyEmail: (token) => request(`/developers/verify-email?token=${encodeURIComponent(token)}`),
  developerLogout: () => request('/developers/logout', { method: 'DELETE' }),
  createDeveloperApiKey: () => request('/developers/api-keys', json('POST', {})),

  adminLogin: (body) => request('/admin/auth/login', json('POST', body)),
  adminLogout: () => request('/admin/auth/logout', { method: 'DELETE' }),
  createAdminApiKey: () => request('/admin/auth/api-keys', json('POST', {})),

  chat: (message, history = [], options = {}) => request('/chat', { ...json('POST', chatBody(message, history)), ...options }),
  chatStream: streamChat,

  createWorkflow: (body) => request('/workflows/create', json('POST', body)),
  listWorkflows: () => request('/workflows/listWorkflows'),
  runWorkflow: (body) => request('/workflows/run', json('POST', body)),
  resumeWorkflow: (runId) => request(`/workflows/run/${runId}`, json('POST', {})),
  cancelWorkflow: (runId) => request(`/workflows/runs/${runId}/cancel`, json('POST', {})),
  listRuns: () => request('/workflows/runs'),
  getRun: (runId) => request(`/workflows/runs/${runId}`),

  listApprovals: (runId = '') => request(`/admin/approvals/pending${runId ? `?runId=${encodeURIComponent(runId)}` : ''}`),
  getApproval: (id) => request(`/admin/approvals/${id}`),
  decideApproval: (id, body) => request(`/admin/approvals/${id}/decision`, json('POST', body)),
}

export const apiBaseUrl = API_BASE_URL
