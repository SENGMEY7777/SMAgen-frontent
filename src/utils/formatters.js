/**
 * Reusable data and date formatters
 */

export function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'

  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }

  return date.toLocaleString(undefined, defaultOptions)
}

export function formatDateShort(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTokens(tokens) {
  const num = Number(tokens) || 0
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return String(num)
}

export function formatCost(costUsd) {
  const num = Number(costUsd) || 0
  if (num === 0) return '$0.00'
  if (num < 0.01) return `<$0.01`
  return `$${num.toFixed(2)}`
}

export function truncate(text, maxLength = 40) {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

export function formatRelativeTime(value) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Just now'

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 45) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour === 1) return '1 hour ago'
  if (diffHour < 24) return `${diffHour} hours ago`
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}
