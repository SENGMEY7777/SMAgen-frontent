/**
 * Utility to map file names and extensions to vibrant colors, labels, and icons.
 */
export const getFileIconInfo = (filename = '') => {
  const cleanName = String(filename || '').trim()
  const lower = cleanName.toLowerCase()
  const ext = lower.includes('.') ? lower.split('.').pop() : ''

  // Special files
  if (lower === 'dockerfile' || lower.includes('docker-compose')) {
    return { ext: 'docker', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'DOCKER' }
  }
  if (lower.startsWith('.env')) {
    return { ext: 'env', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', label: 'ENV' }
  }
  if (lower === '.gitignore' || lower.includes('git')) {
    return { ext: 'git', color: '#f05032', bg: '#fff5f5', border: '#fecaca', label: 'GIT' }
  }

  switch (ext) {
    case 'vue':
      return { ext, color: '#42b883', bg: '#ecfdf5', border: '#a7f3d0', label: 'VUE' }
    case 'js':
    case 'mjs':
    case 'cjs':
      return { ext, color: '#eab308', bg: '#fefce8', border: '#fef08a', label: 'JS' }
    case 'ts':
    case 'mts':
    case 'cts':
      return { ext, color: '#3178c6', bg: '#eff6ff', border: '#bfdbfe', label: 'TS' }
    case 'jsx':
    case 'tsx':
      return { ext, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', label: ext.toUpperCase() }
    case 'json':
      return { ext, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'JSON' }
    case 'html':
    case 'htm':
      return { ext, color: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'HTML' }
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return { ext, color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', label: 'CSS' }
    case 'md':
    case 'markdown':
      return { ext, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', label: 'MD' }
    case 'py':
      return { ext, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'PY' }
    case 'sh':
    case 'bash':
    case 'zsh':
      return { ext, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'SH' }
    case 'sql':
      return { ext, color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', label: 'SQL' }
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'webp':
    case 'ico':
      return { ext, color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', label: 'IMG' }
    case 'yml':
    case 'yaml':
    case 'toml':
    case 'xml':
      return { ext, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', label: 'CFG' }
    case 'txt':
    case 'log':
      return { ext, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'TXT' }
    default:
      return {
        ext: ext || 'file',
        color: '#6366f1',
        bg: '#eef2ff',
        border: '#c7d2fe',
        label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE'
      }
  }
}
