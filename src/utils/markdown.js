/**
 * Clean, secure Markdown parser for AI chat responses in Claude/ChatGPT style.
 */

const escapeHtml = (str) => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const renderInline = (text) => {
  if (!text) return ''

  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    return `<code class="inline-code">${escapeHtml(code)}</code>`
  })

  // Bold & Italic ***text*** or ___text___
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>')

  // Bold **text** or __text__
  text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')

  // Italic *text* or _text_
  text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')

  // Strikethrough ~~text~~
  text = text.replace(/~~(.*?)~~/g, '<del>$1</del>')

  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')

  return text
}

export function renderMarkdown(raw) {
  if (!raw) return ''

  const lines = raw.split('\n')
  const output = []
  let inCodeBlock = false
  let codeLang = ''
  let codeBuffer = []
  let inList = false
  let listType = 'ul'
  let inBlockquote = false
  let blockquoteBuffer = []
  let inTable = false
  let tableRows = []

  const flushList = () => {
    if (inList) {
      output.push(`</${listType}>`)
      inList = false
    }
  }

  const flushBlockquote = () => {
    if (inBlockquote) {
      const content = blockquoteBuffer.map(renderInline).join('<br>')
      output.push(`<blockquote>${content}</blockquote>`)
      blockquoteBuffer = []
      inBlockquote = false
    }
  }

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<div class="table-wrapper"><table>'
      const headerRow = tableRows[0]
      tableHtml += '<thead><tr>'
      headerRow.forEach((cell) => {
        tableHtml += `<th>${renderInline(cell)}</th>`
      })
      tableHtml += '</tr></thead><tbody>'
      for (let i = 1; i < tableRows.length; i++) {
        tableHtml += '<tr>'
        tableRows[i].forEach((cell) => {
          tableHtml += `<td>${renderInline(cell)}</td>`
        })
        tableHtml += '</tr>'
      }
      tableHtml += '</tbody></table></div>'
      output.push(tableHtml)
      tableRows = []
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1. Code block boundary: ``` or ```lang
    if (/^```/.test(line.trim())) {
      if (inCodeBlock) {
        // End code block
        const escapedCode = escapeHtml(codeBuffer.join('\n'))
        const langDisplay = codeLang ? escapeHtml(codeLang) : 'code'
        const codeId = `code-${Math.random().toString(36).substring(2, 9)}`
        output.push(`
<div class="code-block" data-code-id="${codeId}">
  <div class="code-header">
    <span class="code-lang">${langDisplay}</span>
    <button class="copy-code-btn" type="button" data-copy="${escapeHtml(codeBuffer.join('\n'))}" onclick="navigator.clipboard.writeText(this.getAttribute('data-copy')).then(()=>{const orig=this.innerHTML;this.innerHTML='Copied!';setTimeout(()=>{this.innerHTML=orig;},2000);})">
      Copy code
    </button>
  </div>
  <pre><code class="language-${langDisplay}">${escapedCode}</code></pre>
</div>`)
        codeBuffer = []
        codeLang = ''
        inCodeBlock = false
      } else {
        // Start code block
        flushList()
        flushBlockquote()
        flushTable()
        inCodeBlock = true
        codeLang = line.trim().replace(/^```/, '').trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // 2. Table row: | cell | cell |
    if (/^\|(.+)\|$/.test(line.trim())) {
      flushList()
      flushBlockquote()
      const rowContent = line.trim().slice(1, -1)
      // Check if it's a delimiter row like |---|---|
      if (/^[\s:-|-]+$/.test(rowContent)) {
        continue
      }
      const cells = rowContent.split('|').map((c) => c.trim())
      inTable = true
      tableRows.push(cells)
      continue
    } else {
      flushTable()
    }

    // 3. Blockquotes: > quote
    if (/^>\s?(.*)/.test(line)) {
      flushList()
      flushTable()
      inBlockquote = true
      blockquoteBuffer.push(line.replace(/^>\s?/, ''))
      continue
    } else {
      flushBlockquote()
    }

    // 4. Horizontal Rules: ---, ***, ___
    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      flushList()
      output.push('<hr class="md-hr" />')
      continue
    }

    // 5. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const title = renderInline(escapeHtml(headingMatch[2]))
      output.push(`<h${level} class="md-h${level}">${title}</h${level}>`)
      continue
    }

    // 6. Lists: unordered (*, -, +) or ordered (1., 2.)
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)/)
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/)

    if (ulMatch || olMatch) {
      const isOl = Boolean(olMatch)
      const targetType = isOl ? 'ol' : 'ul'
      const content = renderInline(escapeHtml(isOl ? olMatch[3] : ulMatch[3]))

      if (!inList || listType !== targetType) {
        flushList()
        inList = true
        listType = targetType
        output.push(`<${listType} class="md-list">`)
      }
      output.push(`<li>${content}</li>`)
      continue
    } else {
      flushList()
    }

    // 7. Empty line
    if (!line.trim()) {
      continue
    }

    // 8. Regular paragraph
    output.push(`<p class="md-p">${renderInline(escapeHtml(line))}</p>`)
  }

  // Flush any remaining opened blocks
  if (inCodeBlock) {
    const escapedCode = escapeHtml(codeBuffer.join('\n'))
    output.push(`<pre class="code-block"><code>${escapedCode}</code></pre>`)
  }
  flushList()
  flushBlockquote()
  flushTable()

  return output.join('\n')
}
