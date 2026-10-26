const ACTION_VERBS = '(?:create|make|add|delete|remove|move|rename|copy|write|save|open|install|setup|set\\s+up|configure|enable|execute|run|start|build|generate|update|modify|change|replace|switch|edit|adjust|customize|fix|repair|resolve|debug|check|verify|commit|push|deploy|automate)'
const DIRECT_ACTION_VERBS = '(?:create|make|add|delete|remove|move|rename|copy|write|save|open|install|setup|set\\s+up|configure|enable|execute|run|start|build|generate|update|modify|change|replace|switch|edit|adjust|customize|fix|repair|resolve|debug|check|verify|commit|push|deploy|automate)'
const ACTION_TARGETS = '(?:workflow|automation|task|step|file|folder|directory|desktop|workspace|project|terminal|browser|command|tool|script|job|repository|repo|website|homepage|server|endpoint|api|index\\.html|image|images|photo|photos|picture|pictures|visual|design|style|theme|layout|content|product|products|clothing|pinia|pinai|store|state\\s+management|dependency|dependencies|url|urls|link|links)'

const DIRECT_ACTION_PATTERN = new RegExp(`^\\s*(?:please\\s+)?${DIRECT_ACTION_VERBS}\\b`, 'i')
const REQUESTED_ACTION_PATTERN = new RegExp(
  `\\b(?:please|i need you to|i want you to|can you|could you|would you)\\b[\\s\\S]*\\b${ACTION_VERBS}\\b[\\s\\S]*\\b${ACTION_TARGETS}\\b`,
  'i',
)
const ACTION_WITH_TARGET_PATTERN = new RegExp(`\\b${ACTION_VERBS}\\b[\\s\\S]*\\b${ACTION_TARGETS}\\b`, 'i')
const EXPLANATION_PATTERN = /^(?:how|what|why|when|where|who|explain|describe|tell me about|help me understand|can you explain|could you explain|would you explain)\b/i
const HOW_TO_PATTERN = /\b(?:how do i|how can i|what is|what are|explain how|tell me how)\b/i
const CONVERSATIONAL_PROMPT_PATTERN = /^\s*(?:please\s+)?(?:print|say|tell me|show me|give me)\b/i
const ADVISORY_REQUEST_PATTERN = /^\s*(?:please\s+)?(?:give|suggest|recommend|share|provide|list|brainstorm)\b[\s\S]*\b(?:idea|ideas|advice|suggestion|suggestions|recommendation|recommendations|options|what to build)\b/i
const FILE_EDIT_PATTERN = /\b(?:add|insert|remove|delete|replace|update|edit|modify|change|write|create)\b[\s\S]{0,180}\b(?:in|into|inside|to)\b[\s\S]{0,100}\b[A-Za-z0-9_-]+\.(?:html?|css|js|mjs|cjs|ts|tsx|jsx|json|md|txt|vue)\b/i
const WORKFLOW_TARGET_PATTERN = /\b(?:workflow|automation|task|step|file|folder|directory|desktop|workspace|project|terminal|browser|command|tool|script|job|repository|repo|website|homepage|index\.html|image|images|photo|photos|picture|pictures|visual|design|style|theme|layout|content|product|products|clothing|pinia|pinai|store|state\s+management|dependency|dependencies)\b/i
const PROJECT_SETUP_PATTERN = /\b(?:setup|set\s*[-]?\s*up|setupt|scaffold|initialize|bootstrap)\b[\s\S]{0,120}\b(?:project|app|application|api|service|website|repository|repo)\b/i

export const detectRequestMode = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return 'chat'

  // Advisory requests should stay in chat even when they mention an action
  // word such as "build" or a workflow target such as "project".
  if (ADVISORY_REQUEST_PATTERN.test(text)) {
    return 'chat'
  }

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

  // Project setup requests are executable actions even when they use the
  // conversational phrasing "please give me setup project ...". Keep this
  // after the explanation checks so questions such as "how do I set up ...?"
  // remain informational chat.
  if (PROJECT_SETUP_PATTERN.test(text)) {
    return 'workflow'
  }

  // Follow-up edits to a named source file must stay in workflow mode,
  // including requests such as "add image using URL in testing.html".
  if (FILE_EDIT_PATTERN.test(text)) {
    return 'workflow'
  }

  // Conversational requests such as "print background ..." should stay in
  // chat unless they also name a concrete workflow target.
  if (CONVERSATIONAL_PROMPT_PATTERN.test(text) && !WORKFLOW_TARGET_PATTERN.test(text)) {
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
