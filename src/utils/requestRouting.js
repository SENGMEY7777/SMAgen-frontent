const ACTION_VERBS = '(?:create|make|delete|remove|move|rename|copy|write|save|open|install|execute|run|start|build|generate|update|modify|commit|push|deploy|automate)'
const ACTION_TARGETS = '(?:workflow|automation|task|step|file|folder|directory|desktop|workspace|project|terminal|browser|command|tool|script|job|repository|repo|website|homepage|index\\.html)'

const DIRECT_ACTION_PATTERN = new RegExp(`^\\s*(?:please\\s+)?${ACTION_VERBS}\\b`, 'i')
const REQUESTED_ACTION_PATTERN = new RegExp(
  `\\b(?:please|i need you to|i want you to|can you|could you|would you)\\b[\\s\\S]*\\b${ACTION_VERBS}\\b[\\s\\S]*\\b${ACTION_TARGETS}\\b`,
  'i',
)
const ACTION_WITH_TARGET_PATTERN = new RegExp(`\\b${ACTION_VERBS}\\b[\\s\\S]*\\b${ACTION_TARGETS}\\b`, 'i')
const EXPLANATION_PATTERN = /^(?:how|what|why|when|where|who|explain|describe|tell me about|help me understand|can you explain|could you explain|would you explain)\\b/i
const HOW_TO_PATTERN = /\b(?:how do i|how can i|what is|what are|explain how|tell me how)\b/i

export const detectRequestMode = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return 'chat'

  // Explicit actions should run as workflows, including requests phrased as
  // "Can you create ...?" or "Please run ...".
  if (DIRECT_ACTION_PATTERN.test(text)) {
    return 'workflow'
  }

  // Questions about how something works are informational chat, even when
  // they mention a workflow, file, or command.
  if (EXPLANATION_PATTERN.test(text) || HOW_TO_PATTERN.test(text)) {
    return 'chat'
  }

  if (REQUESTED_ACTION_PATTERN.test(text)) {
    return 'workflow'
  }

  if (ACTION_WITH_TARGET_PATTERN.test(text)) {
    return 'workflow'
  }

  return 'chat'
}
