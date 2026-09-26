const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0, code = 'API_ERROR', details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const getToken = () => localStorage.getItem('omni_token')

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
    throw new ApiError('Unable to connect to the SMAgen server.', 0, 'NETWORK_ERROR')
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok || payload?.success === false) {
    const error = payload?.error || {}
    throw new ApiError(
      payload?.message || 'The request could not be completed.',
      response.status,
      error.code || 'API_ERROR',
      payload,
    )
  }

  return payload
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

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

  chat: (message, history = []) => request('/chat', json('POST', { message, history })),

  createWorkflow: (body) => request('/workflows/create', json('POST', body)),
  listWorkflows: () => request('/workflows/listWorkflows'),
  runWorkflow: (body) => request('/workflows/run', json('POST', body)),
  resumeWorkflow: (runId) => request(`/workflows/run/${runId}`, json('POST', {})),
  listRuns: () => request('/workflows/runs'),
  getRun: (runId) => request(`/workflows/runs/${runId}`),

  listApprovals: (runId = '') => request(`/admin/approvals/pending${runId ? `?runId=${encodeURIComponent(runId)}` : ''}`),
  getApproval: (id) => request(`/admin/approvals/${id}`),
  decideApproval: (id, body) => request(`/admin/approvals/${id}/decision`, json('POST', body)),
}

export const apiBaseUrl = API_BASE_URL
