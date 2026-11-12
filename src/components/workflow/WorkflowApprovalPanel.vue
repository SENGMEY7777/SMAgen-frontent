<template>
  <div
    class="workflow-approval-panel"
    role="region"
    :aria-label="approval.taskTitle || 'Approval required before this step can continue.'"
  >
    <div class="workflow-approval-meta">
      <IconTerminal2 :size="18" />
      <span class="workflow-approval-meta-title">
        {{ approval.taskTitle || 'Approval required before this step can continue.' }}
      </span>
    </div>

    <div class="workflow-command-box">
      <span class="workflow-command-label">
        {{ approval.assignedTool || 'workflow action' }}
      </span>
      <code v-html="highlightedCommand"></code>
    </div>

    <div class="workflow-choice-list" role="radiogroup" aria-label="Workflow approval choice">
      <div
        v-for="(option, index) in options"
        :key="option.value"
        class="workflow-choice-row"
      >
        <label
          class="workflow-choice"
          :class="{ selected: approval.choice === option.value }"
        >
          <input
            type="radio"
            :name="`workflow-approval-${runId}-${messageIndex}`"
            :value="option.value"
            :checked="approval.choice === option.value"
            @change="$emit('update:choice', option.value)"
          />
          <span class="workflow-choice-number">{{ option.number }}</span>
          <span class="workflow-choice-text">{{ option.label }}</span>
        </label>

        <div
          v-if="String(option.number) === '5' || option.value === 'reject' || index === options.length - 1"
          class="workflow-approval-actions"
          role="group"
          aria-label="Approval actions"
        >
          <button class="workflow-skip-btn" type="button" :disabled="decisionPending" @click="$emit('skip')">
            Skip
          </button>
          <button class="workflow-submit-btn" type="button" :disabled="decisionPending" @click="$emit('submit')">
            <IconLoader2 v-if="decisionPending" :size="14" class="spin-icon" />
            <span>{{ decisionPending ? 'Submitting…' : 'Submit' }}</span>
            <IconCornerDownLeft v-if="!decisionPending" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <textarea
      v-if="approval.choice === 'reject'"
      class="workflow-rejection-input"
      rows="2"
      :value="approval.rejectionReason"
      placeholder="Tell KAIRO what to do instead…"
      @input="$emit('update:rejectionReason', $event.target.value)"
    ></textarea>

    <div v-if="error" class="workflow-card-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IconCornerDownLeft, IconLoader2, IconTerminal2 } from '@tabler/icons-vue'
import { highlightCode } from '@/utils/markdown'

const props = defineProps({
  approval: {
    type: Object,
    required: true,
  },
  options: {
    type: Array,
    default: () => [],
  },
  runId: {
    type: [String, Number],
    default: '',
  },
  messageIndex: {
    type: [String, Number],
    default: 0,
  },
  decisionPending: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  stringifyValue: {
    type: Function,
    required: true,
  },
})

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightJsonText = (jsonText) => {
  const tokenRegex = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g
  let lastIndex = 0
  let out = ''
  let match

  while ((match = tokenRegex.exec(jsonText)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtml(jsonText.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        const colonIdx = token.lastIndexOf(':')
        const keyPart = token.slice(0, colonIdx)
        out += `<span class="hl-fn">${escapeHtml(keyPart)}</span><span class="hl-operator">:</span>`
      } else {
        out += `<span class="hl-string">${escapeHtml(token)}</span>`
      }
    } else if (/^(?:true|false|null)$/.test(token)) {
      out += `<span class="hl-keyword">${escapeHtml(token)}</span>`
    } else if (/^[{}\[\],]$/.test(token)) {
      out += `<span class="hl-flag">${escapeHtml(token)}</span>`
    } else if (token === ':') {
      out += `<span class="hl-operator">:</span>`
    } else {
      out += `<span class="hl-number">${escapeHtml(token)}</span>`
    }
    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < jsonText.length) {
    out += escapeHtml(jsonText.slice(lastIndex))
  }
  return out
}

const highlightPathOrSegment = (token) => {
  if (/[/\\]/.test(token)) {
    const parts = token.split(/([/\\])/)
    return parts.map((part) => {
      if (!part) return ''
      if (part === '/' || part === '\\') {
        return `<span class="hl-operator">${escapeHtml(part)}</span>`
      }
      return `<span class="hl-string">${escapeHtml(part)}</span>`
    }).join('')
  }
  return `<span class="hl-string">${escapeHtml(token)}</span>`
}

const highlightValue = (val) => {
  if (!val) return ''
  const trimmed = val.trim()
  if (!trimmed) return escapeHtml(val)

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `<span class="hl-number">${escapeHtml(val)}</span>`
  }
  if (/^(true|false|null|yes|no)$/i.test(trimmed)) {
    return `<span class="hl-keyword">${escapeHtml(val)}</span>`
  }
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return `<span class="hl-fn">${escapeHtml(val)}</span>`
  }

  // Highlight mixed value tokens (flags, URLs, paths, numbers, plain text)
  const parts = val.split(/(\s+)/)
  return parts.map((part) => {
    if (!part || /^\s+$/.test(part)) return escapeHtml(part)
    if (/^\d+(\.\d+)?$/.test(part)) {
      return `<span class="hl-number">${escapeHtml(part)}</span>`
    }
    if (/^(true|false|null)$/i.test(part)) {
      return `<span class="hl-keyword">${escapeHtml(part)}</span>`
    }
    if (/^--?[a-zA-Z0-9_-]+(=.*)?$/.test(part)) {
      return `<span class="hl-flag">${escapeHtml(part)}</span>`
    }
    if (/^https?:\/\/\S+$/i.test(part)) {
      return `<span class="hl-fn">${escapeHtml(part)}</span>`
    }
    if (/[/\\]/.test(part)) {
      return highlightPathOrSegment(part)
    }
    return `<span class="hl-string">${escapeHtml(part)}</span>`
  }).join('')
}

const highlightWorkflowCommand = (rawText) => {
  if (!rawText) return ''
  const text = String(rawText).trim()

  if (/^\s*[\[{]/.test(text)) {
    return highlightJsonText(text) || highlightCode(text, 'json')
  }

  const highlightLine = (line) => {
    if (!line.trim()) return ''

    // Whole-line comment
    if (/^\s*(#|\/\/)/.test(line)) {
      return `<span class="hl-comment">${escapeHtml(line)}</span>`
    }

    // Pattern 1: Tool + key: + value (e.g. "httpRequester task: Test live API endpoint")
    const matchToolAction = line.match(/^(\s*)(\S+)(\s+)([^:\s]+:)(\s*)([\s\S]*)$/)
    if (matchToolAction) {
      const [, leading, tool, sp1, action, sp2, val] = matchToolAction
      return `${escapeHtml(leading)}<span class="hl-fn">${escapeHtml(tool)}</span>${escapeHtml(sp1)}<span class="hl-keyword">${escapeHtml(action)}</span>${escapeHtml(sp2)}${highlightValue(val)}`
    }

    // Pattern 2: Single key: + value (e.g. "createdesktopdirectory: data/src/controllers" or "path: src/app.js")
    const matchSingleKey = line.match(/^(\s*)([^:\s]+:)(\s*)([\s\S]*)$/)
    if (matchSingleKey) {
      const [, leading, keyWithColon, sp, val] = matchSingleKey
      const keyName = keyWithColon.slice(0, -1)
      return `${escapeHtml(leading)}<span class="hl-fn">${escapeHtml(keyName)}</span><span class="hl-keyword">:</span>${escapeHtml(sp)}${highlightValue(val)}`
    }

    // Pattern 3: CLI / Bash / Word tokens
    const tokens = line.split(/(\s+)/)
    let isFirst = true
    let result = ''
    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        result += escapeHtml(token)
        continue
      }
      if (isFirst) {
        result += `<span class="hl-fn">${escapeHtml(token)}</span>`
        isFirst = false
      } else if (/^--?[a-zA-Z0-9_-]+(=.*)?$/.test(token)) {
        result += `<span class="hl-flag">${escapeHtml(token)}</span>`
      } else if (/^\d+(\.\d+)?$/.test(token)) {
        result += `<span class="hl-number">${escapeHtml(token)}</span>`
      } else if (/[:=]/.test(token)) {
        const parts = token.split(/([:=])/)
        result += `<span class="hl-keyword">${escapeHtml(parts[0])}</span>`
        for (let i = 1; i < parts.length; i += 2) {
          result += `<span class="hl-operator">${escapeHtml(parts[i])}</span>`
          if (parts[i + 1]) {
            result += highlightValue(parts[i + 1])
          }
        }
      } else if (/[/\\]|\.[a-zA-Z0-9]+$/.test(token)) {
        result += `<span class="hl-string">${escapeHtml(token)}</span>`
      } else if (/^(run|build|install|dev|test|start|checkout|commit|push|pull|clone|add|status|exec)$/i.test(token)) {
        result += `<span class="hl-keyword">${escapeHtml(token)}</span>`
      } else {
        result += `<span class="hl-string">${escapeHtml(token)}</span>`
      }
    }
    return result
  }

  return text.split('\n').map(highlightLine).join('\n')
}

const highlightedCommand = computed(() => {
  const command = props.stringifyValue(
    props.approval.actionSummary || props.approval.toolInput,
    'Approval required for this action.',
  )
  return highlightWorkflowCommand(command)
})

defineEmits(['skip', 'submit', 'update:choice', 'update:rejectionReason'])
</script>

<style scoped>
.workflow-approval-panel {
  order: -1;
  width: min(768px, 100%);
  max-width: 100%;
  box-sizing: border-box;
  max-height: min(520px, calc(100dvh - 190px));
  overflow-y: auto;
  margin: 0 auto 16px;
  padding: clamp(18px, 1.5vw, 26px);
  border: 1px solid #e2e4e8;
  border-radius: 15px;
  background: #ffffff;
  color: #202124;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  scrollbar-width: none;
}

.workflow-approval-panel::-webkit-scrollbar {
  display: none;
}

.workflow-approval-meta {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 15px);
  color: #202124;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 650;
}

.workflow-approval-meta svg {
  width: clamp(18px, 1.5vw, 24px);
  height: clamp(18px, 1.5vw, 24px);
  flex: 0 0 auto;
  color: #5f6368;
}

.workflow-approval-meta-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.workflow-command-box {
  display: grid;
  gap: clamp(4px, 0.4vw, 7px);
  margin-top: clamp(14px, 1.2vw, 20px);
  padding: clamp(12px, 1vw, 17px) clamp(14px, 1.2vw, 20px);
  border: 1px solid #eceef1;
  border-radius: clamp(12px, 1.1vw, 18px);
  background: #f5f6f7;
}

.workflow-command-label {
  color: #000000;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workflow-command-box code {
  display: block;
  max-height: 180px;
  overflow: auto;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 17px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.workflow-command-box :deep(.hl-comment) {
  color: #64748b;
  font-style: italic;
}

.workflow-command-box :deep(.hl-string) {
  color: #16a34a;
  font-weight: 500;
}

.workflow-command-box :deep(.hl-keyword) {
  color: #db2777;
  font-weight: 600;
}

.workflow-command-box :deep(.hl-number) {
  color: #ea580c;
  font-weight: 600;
}

.workflow-command-box :deep(.hl-fn) {
  color: #0284c7;
  font-weight: 650;
}

.workflow-command-box :deep(.hl-flag),
.workflow-command-box :deep(.hl-option) {
  color: #7c3aed;
  font-weight: 550;
}

.workflow-command-box :deep(.hl-operator) {
  color: #db2777;
  font-weight: 600;
}

.workflow-choice-list {
  display: grid;
  gap: clamp(4px, 0.55vw, 9px);
  margin-top: clamp(14px, 1.35vw, 22px);
}

.workflow-choice-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.workflow-choice {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: clamp(10px, 1vw, 16px);
  min-width: 0;
  min-height: clamp(50px, 3.2vw, 58px);
  padding: 9px clamp(12px, 1vw, 17px);
  border: 1px solid transparent;
  border-radius: clamp(12px, 1vw, 17px);
  color: #383b40;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  background: #ffffff;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.workflow-choice:hover {
  border-color: #e2e4e8;
  background: #f8f9fa;
}

.workflow-choice.selected {
  border-color: #dedfe2;
  color: #202124;
  background: #f0f1f2;
}

.workflow-choice input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.workflow-choice-number {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: clamp(30px, 2.2vw, 38px);
  height: clamp(30px, 2.2vw, 38px);
  border-radius: clamp(8px, 0.7vw, 12px);
  color: #52565c;
  background: #eceef0;
  font-size: 16px;
  font-weight: 700;
}

.workflow-choice.selected .workflow-choice-number {
  color: #35393e;
  background: #e1e3e6;
}

.workflow-choice-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.workflow-choice:has(input:focus-visible) {
  outline: 3px solid rgba(37, 99, 235, 0.3);
  outline-offset: 2px;
}

.workflow-rejection-input {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  outline: none;
}

.workflow-rejection-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.workflow-approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 10px;
}

.workflow-skip-btn {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #5f6368;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.workflow-skip-btn:hover {
  border-color: #e2e4e8;
  color: #202124;
  background: #f5f6f7;
}

.workflow-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #000000;
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.16);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.workflow-submit-btn:hover {
  background: #18181b;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

.workflow-submit-btn:focus-visible,
.workflow-skip-btn:focus-visible {
  outline: 3px solid rgba(0, 0, 0, 0.22);
  outline-offset: 2px;
}

.workflow-submit-btn:disabled,
.workflow-skip-btn:disabled {
  cursor: wait;
  opacity: 0.6;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.workflow-card-error {
  margin-top: 8px;
  padding: 7px 10px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

@media (max-width: 560px) {
  .workflow-approval-panel {
    width: 100%;
    max-height: min(560px, calc(100dvh - 160px));
    margin-top: 14px;
    padding: 14px;
    border-radius: 14px;
  }

  .workflow-choice {
    align-items: flex-start;
    min-height: 0;
    padding: 10px;
  }

  .workflow-choice input {
    margin-top: 2px;
  }

  .workflow-choice-row {
    flex-wrap: wrap;
  }

  .workflow-approval-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .workflow-skip-btn,
  .workflow-submit-btn {
    min-height: 40px;
  }
}
</style>
