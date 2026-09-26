/**
 * Clean, secure Markdown parser with rich syntax highlighting for AI chat responses.
 */

const escapeHtml = (str) => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * High-performance, zero-dependency syntax highlighter.
 */
export function highlightCode(rawCode, rawLang = '') {
  if (!rawCode) return ''
  const lang = (rawLang || '').toLowerCase().trim()

  const lines = rawCode.split('\n')
  const highlightedLines = lines.map((line) => {
    // Whole-line comment
    if (/^\s*(#|\/\/|--|\/\*)/.test(line)) {
      return `<span class="hl-comment">${escapeHtml(line)}</span>`
    }

    const tokens = []
    const addToken = (html) => {
      const id = `___TK${tokens.length}___`
      tokens.push(html)
      return id
    }

    let processed = line

    // 1. Strings ("...", '...', `...`)
    processed = processed.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, (match) => {
      return addToken(`<span class="hl-string">${escapeHtml(match)}</span>`)
    })

    // 2. Trailing comments (# ..., // ..., -- ...)
    processed = processed.replace(/(\s+)(#|\/\/|--)(.*)$/g, (_, space, symbol, comment) => {
      return `${space}${addToken(`<span class="hl-comment">${escapeHtml(symbol + comment)}</span>`)}`
    })

    // 3. Numbers (integers, floats)
    processed = processed.replace(/\b(\d+(?:\.\d+)?)\b/g, (match) => {
      return addToken(`<span class="hl-number">${escapeHtml(match)}</span>`)
    })

    // 4. Language-specific keywords & directives
    if (lang === 'docker' || lang === 'dockerfile') {
      // Docker instructions
      processed = processed.replace(/\b(FROM|WORKDIR|COPY|RUN|USER|EXPOSE|CMD|ENV|ENTRYPOINT|AS|ADD|ARG|VOLUME|LABEL|STOPSIGNAL|HEALTHCHECK|SHELL|ONBUILD)\b/gi, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match.toUpperCase())}</span>`)
      })
      // Docker buildkit flags & options
      processed = processed.replace(/(--[a-zA-Z0-9_-]+)/g, (match) => {
        return addToken(`<span class="hl-flag">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/\b([a-zA-Z0-9_-]+)=/g, (match, p1) => {
        return `${addToken(`<span class="hl-option">${escapeHtml(p1)}</span>`)}=`
      })
    } else if (['js', 'javascript', 'ts', 'typescript', 'vue', 'json', 'jsx', 'tsx'].includes(lang)) {
      processed = processed.replace(/\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield|true|false)\b/g, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, (match) => {
        return addToken(`<span class="hl-fn">${escapeHtml(match)}</span>`)
      })
    } else if (['py', 'python'].includes(lang)) {
      processed = processed.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|in|is|not|and|or|True|False|None|self|async|await|pass|raise)\b/g, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/(@[A-Za-z0-9_]+)/g, (match) => {
        return addToken(`<span class="hl-annotation">${escapeHtml(match)}</span>`)
      })
    } else if (['java', 'kotlin', 'c', 'cpp', 'csharp', 'go', 'rust'].includes(lang)) {
      processed = processed.replace(/\b(public|private|protected|static|final|class|interface|void|int|long|float|double|boolean|byte|char|short|package|import|return|new|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|throws|func|var|type|struct|chan|go|select|const|fn|mut|impl|trait|pub)\b/g, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/(@[A-Za-z0-9_]+)/g, (match) => {
        return addToken(`<span class="hl-annotation">${escapeHtml(match)}</span>`)
      })
    } else if (['sql', 'mysql', 'postgresql'].includes(lang)) {
      processed = processed.replace(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|CREATE|TABLE|DATABASE|INDEX|ALTER|DROP|SET|INTO|VALUES|AND|OR|NOT|NULL|IS|AS|UNION|ALL|DISTINCT|PRIMARY\s+KEY|FOREIGN\s+KEY)\b/gi, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match.toUpperCase())}</span>`)
      })
    } else if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) {
      processed = processed.replace(/\b(sudo|docker|kubectl|git|npm|yarn|pnpm|npx|node|python|pip|cargo|go|curl|wget|cat|grep|mkdir|rm|cp|mv|chmod|chown|echo|export|source|cd|ls)\b/g, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/(--[a-zA-Z0-9_-]+|-[a-zA-Z0-9]+)/g, (match) => {
        return addToken(`<span class="hl-flag">${escapeHtml(match)}</span>`)
      })
      processed = processed.replace(/(\$[A-Za-z0-9_]+|\$\{[A-Za-z0-9_]+\})/g, (match) => {
        return addToken(`<span class="hl-var">${escapeHtml(match)}</span>`)
      })
    } else {
      // General keywords
      processed = processed.replace(/\b(FROM|WORKDIR|COPY|RUN|USER|EXPOSE|CMD|ENV|AS|const|let|var|function|async|await|import|export|def|class|return|if|else|for|while|SELECT|FROM|WHERE)\b/g, (match) => {
        return addToken(`<span class="hl-keyword">${escapeHtml(match)}</span>`)
      })
    }

    // Escape any remaining plain text characters
    let result = escapeHtml(processed)

    // Restore original highlighted tokens
    tokens.forEach((tokenHtml, idx) => {
      const id = `___TK${idx}___`
      result = result.split(id).join(tokenHtml)
    })

    return result
  })

  return highlightedLines.join('\n')
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

  // Inline math $$...$$
  text = text.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    return `<div class="math-block">${escapeHtml(math.trim())}</div>`
  })

  // Inline math $...$
  text = text.replace(/\$([^$\n]+)\$/g, (_, math) => {
    return `<code class="math-inline">${escapeHtml(math.trim())}</code>`
  })

  return text
}

const getLanguageFileName = (lang) => {
  const l = (lang || '').toLowerCase().trim()
  if (l === 'docker' || l === 'dockerfile') return 'Dockerfile'
  if (l === 'js' || l === 'javascript') return 'script.js'
  if (l === 'ts' || l === 'typescript') return 'main.ts'
  if (l === 'py' || l === 'python') return 'app.py'
  if (l === 'json') return 'config.json'
  if (l === 'yaml' || l === 'yml') return 'config.yaml'
  if (l === 'sql') return 'query.sql'
  if (l === 'bash' || l === 'sh' || l === 'shell' || l === 'zsh') return 'script.sh'
  if (l === 'html') return 'index.html'
  if (l === 'css') return 'style.css'
  if (l === 'java') return 'Application.java'
  if (l === 'go') return 'main.go'
  if (l === 'rust') return 'main.rs'
  return l ? `code.${l}` : 'snippet.txt'
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
        const rawCodeText = codeBuffer.join('\n')
        const highlighted = highlightCode(rawCodeText, codeLang)
        const langDisplay = codeLang
          ? (codeLang.toLowerCase() === 'dockerfile' ? 'Dockerfile' : codeLang.toLowerCase())
          : 'code'
        const fileName = getLanguageFileName(codeLang)
        const codeId = `code-${Math.random().toString(36).substring(2, 9)}`
        const escapedRawForAttr = escapeHtml(rawCodeText)

        output.push(`
<div class="code-block" data-code-id="${codeId}">
  <div class="code-header">
    <span class="code-lang">${langDisplay}</span>
    <div class="code-header-actions">
      <button class="code-action-btn" type="button" title="Download code" data-filename="${fileName}" data-code="${escapedRawForAttr}" onclick="const b=new Blob([this.getAttribute('data-code')],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=this.getAttribute('data-filename');a.click();URL.revokeObjectURL(u);">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button class="code-action-btn" type="button" title="Copy code" data-copy="${escapedRawForAttr}" onclick="navigator.clipboard.writeText(this.getAttribute('data-copy')).then(()=>{const orig=this.innerHTML;this.innerHTML='<span style=\\'color:#4ade80\\'>Copied!</span>';setTimeout(()=>{this.innerHTML=orig;},2000);})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      </button>
    </div>
  </div>
  <pre><code class="language-${langDisplay}">${highlighted}</code></pre>
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
    const rawCodeText = codeBuffer.join('\n')
    const highlighted = highlightCode(rawCodeText, codeLang)
    output.push(`<div class="code-block"><pre><code>${highlighted}</code></pre></div>`)
  }
  flushList()
  flushBlockquote()
  flushTable()

  return output.join('\n')
}
