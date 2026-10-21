/**
 * GazBoard v4.8.12 — Pure-JS Obsidian Markdown & Wikilinks Engine
 * Zero native dependencies. Produces strict XHTML for SVG <foreignObject>
 * Canvas2D caching and interactive Live Preview DOM overlays.
 */

export const WIKILINK_RE = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;
export const BOARDREF_RE = /@\[([^\]\n]+)\]\(b:([a-zA-Z0-9_-]+)(?:#(\d{1,4}))?\)/g;
export const CALLOUT_HEADER_RE = /^\[!([A-Za-z]+)\]([+-])?\s*(.*)$/;
export const TASK_LINE_RE = /^([ \t]*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
export const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
export const INLINE_MATH_RE = /(?:^|(?<=[^$\\]))\$([^\$\n]+?)\$/g;

const CALLOUT_TYPES = new Set([
  'note', 'tip', 'warning', 'danger', 'info', 'success',
  'question', 'bug', 'example', 'quote', 'abstract', 'todo'
]);

const CALLOUT_ICONS = {
  note: '📝',
  tip: '💡',
  warning: '⚠️',
  danger: '⚡',
  info: 'ℹ️',
  success: '✅',
  question: '❓',
  bug: '🐛',
  example: '📋',
  quote: '💬',
  abstract: '📄',
  todo: '☑️'
};

const MD_HEURISTIC_RE = /(?:^|\n)\s*(?:#{1,6}\s+|>\s+|[-*+]\s+(?:[[ xX]]\s+)?|\d+\.\s+|\|.+\|)|(?:\*\*[^*]+\*\*|\*[^*\n]+\*|~~[^~]+~~|`[^`\n]+`|<u>[\s\S]+?<\/u>|\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\[\[[^\]]+\]\]|@\[[^\]]+\]\(b:)/;

/**
 * Fast check to determine if a text string contains Markdown or Obsidian syntax.
 * @param {string} text
 * @returns {boolean}
 */
export function isMarkdown(text) {
  if (!text || typeof text !== 'string') return false;
  return MD_HEURISTIC_RE.test(text);
}

/**
 * Escapes text for strict XML / XHTML compliance inside SVG <foreignObject>.
 * @param {string} str
 * @returns {string}
 */
export function escapeXhtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders TeX math via bundled offline KaTeX if available, or clean XHTML fallback.
 * @param {string} tex
 * @param {boolean} displayMode
 * @returns {string}
 */
export function renderMathToXhtml(tex, displayMode = false) {
  const raw = String(tex || '').trim();
  const katexObj = typeof globalThis !== 'undefined' ? globalThis.katex : null;
  if (katexObj && typeof katexObj.renderToString === 'function') {
    try {
      const html = katexObj.renderToString(raw, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml'
      });
      // Ensure self-closing tags for strict XML inside <foreignObject>
      return html.replace(/<(img|br|hr|input|col|area|base|link|meta|param|source|track|wbr)([^>]*?)(?<!\/)>/gi, '<$1$2 />');
    } catch (_) {
      // Fall through to safe fallback
    }
  }
  const tag = displayMode ? 'div' : 'span';
  const cls = displayMode ? 'gb-math-block' : 'gb-math-inline';
  return `<${tag} class="${cls}" data-tex="${escapeXhtml(raw)}">${escapeXhtml(raw)}</${tag}>`;
}

/**
 * Parses inline Markdown tokens into strict XHTML.
 * Order of precedence:
 * 1. Escaped characters & Inline Code (`code`)
 * 2. Inline Math ($...$)
 * 3. Native Board Refs (@[Label](b:id#page)) & Obsidian Wikilinks ([[Board#Page|Alias]])
 * 4. Standard Markdown Links ([label](url)), including obsidian:// protocol
 * 5. Safe <u>...</u> underline tags
 * 6. Bold (**...**), Italic (*...*), Strikethrough (~~...~~)
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {(title: string, page?: string, alias?: string) => {id?: string, href?: string, label: string}} [options.resolveWikilink]
 * @returns {string}
 */
export function renderInlineMarkdown(text, options = {}) {
  if (!text) return '';

  const placeholders = [];
  const stash = (xhtml) => {
    const token = `\u0000GBPH_${placeholders.length}_\u0000`;
    placeholders.push(xhtml);
    return token;
  };

  let src = String(text);

  // 1. Inline code spans: `code`
  src = src.replace(/`([^`\n]+)`/g, (_, code) =>
    stash(`<code class="gb-inline-code">${escapeXhtml(code)}</code>`)
  );

  // 2. Display math appearing inline & Inline math: $$...$$ and $...$
  src = src.replace(DISPLAY_MATH_RE, (_, tex) =>
    stash(renderMathToXhtml(tex, true))
  );
  src = src.replace(INLINE_MATH_RE, (_, tex) =>
    stash(renderMathToXhtml(tex, false))
  );

  // 3a. Native GazBoard tokens: @[Label](b:boardId#page)
  src = src.replace(BOARDREF_RE, (_, label, boardId, page) => {
    const pageSuffix = page ? `#${escapeXhtml(page)}` : '';
    const dataPage = page ? ` data-page="${escapeXhtml(page)}"` : '';
    return stash(
      `<a class="gb-wikilink" href="b:${escapeXhtml(boardId)}${pageSuffix}" data-board-id="${escapeXhtml(boardId)}"${dataPage}>${escapeXhtml(label)}</a>`
    );
  });

  // 3b. Obsidian Wikilinks: [[Board Name#Page|Alias]]
  src = src.replace(WIKILINK_RE, (_, rawTarget, rawAnchor, rawAlias) => {
    const target = rawTarget.trim();
    const anchor = rawAnchor ? rawAnchor.trim() : '';
    const alias = rawAlias ? rawAlias.trim() : '';

    if (typeof options.resolveWikilink === 'function') {
      const resolved = options.resolveWikilink(target, anchor, alias);
      if (resolved) {
        const boardAttr = resolved.id ? ` data-board-id="${escapeXhtml(resolved.id)}"` : '';
        const anchorAttr = anchor ? ` data-anchor="${escapeXhtml(anchor)}"` : '';
        return stash(
          `<a class="gb-wikilink" href="${escapeXhtml(resolved.href || '#')}" data-wikilink="${escapeXhtml(target)}"${boardAttr}${anchorAttr}>${escapeXhtml(resolved.label)}</a>`
        );
      }
    }

    const defaultLabel = alias || (anchor ? `${target} > ${anchor}` : target);
    const href = `b:${ target }${anchor ? '#' + anchor : ''}`;
    const anchorAttr = anchor ? ` data-anchor="${escapeXhtml(anchor)}"` : '';
    return stash(
      `<a class="gb-wikilink" href="${escapeXhtml(href)}" data-wikilink="${escapeXhtml(target)}"${anchorAttr}>${escapeXhtml(defaultLabel)}</a>`
    );
  });

  // 4. Standard links [label](url) including obsidian:// URIs
  src = src.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const trimmedUrl = url.trim();
    const isSafeProtocol = /^(https?:\/\/|obsidian:\/\/|mailto:|b:|#|\/)/i.test(trimmedUrl);
    const safeHref = isSafeProtocol ? escapeXhtml(trimmedUrl) : '#';
    const isObsidianUri = /^obsidian:\/\//i.test(trimmedUrl);
    const cls = isObsidianUri ? 'gb-obsidian-uri' : 'gb-ext-link';
    return stash(
      `<a class="${cls}" href="${safeHref}">${ renderInlineMarkdown(label, options) }</a>`
    );
  });

  // 5. Explicit underline tags: <u>text</u>
  src = src.replace(/<u>([\s\S]+?)<\/u>/gi, (_, inner) =>
    stash(`<u>${renderInlineMarkdown(inner, options)}</u>`)
  );

  // Escape any remaining raw XML characters before applying emphasis
  src = escapeXhtml(src);

  // 6. Bold + Italic (***text***)
  src = src.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold (**text**)
  src = src.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic (*text*)
  src = src.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Strikethrough (~~text~~)
  src = src.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

  // Restore stashed tokens
  src = src.replace(/\u0000GBPH_(\d+)_\u0000/g, (_, idx) => placeholders[Number(idx)] ?? '');

  return src;
}

/**
 * Splits a GFM table row into cells.
 * @param {string} line
 * @returns {string[]}
 */
function splitTableCells(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
}

/**
 * Checks if a line is a valid GFM table delimiter row (e.g., | :--- | :---: | ---: |).
 * @param {string} line
 * @returns {Array<'left'|'center'|'right'|null>|null}
 */
function parseTableDelimiter(line) {
  if (!line || !line.includes('|')) return null;
  const cells = splitTableCells(line);
  if (cells.length === 0) return null;
  const aligns = [];
  for (const cell of cells) {
    if (!/^:?-{3,}:?$/.test(cell)) return null;
    if (cell.startsWith(':') && cell.endsWith(':')) aligns.push('center');
    else if (cell.endsWith(':')) aligns.push('right');
    else if (cell.startsWith(':')) aligns.push('left');
    else aligns.push(null);
  }
  return aligns;
}

/**
 * Minimal pure-JS syntax highlighter for fenced code blocks.
 * Emits strict XHTML spans.
 * @param {string} code
 * @returns {string}
 */
function highlightCodeXhtml(code) {
  const escaped = escapeXhtml(code);
  return escaped.replace(
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|try|catch|true|false|null|undefined)\b/g,
    '<span class="gb-hl-kw">$1</span>'
  );
}

/**
 * Parses a full Markdown document into an AST with line numbers preserved.
 * @param {string} markdownText
 * @returns {Array<Object>}
 */
export function parseMarkdownAST(markdownText) {
  const raw = String(markdownText ?? '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');
  const ast = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Empty line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // 2. Fenced Code Block (```lang ... ```)
    const fenceMatch = line.match(/^\s*```([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || '';
      const startLine = i;
      i++;
      const codeLines = [];
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      ast.push({
        type: 'codeblock',
        lang,
        code: codeLines.join('\n'),
        lineStart: startLine,
        lineEnd: i - 1
      });
      continue;
    }

    // 3. Multi-line or Single-line Display Math Block ($$ ... $$)
    if (line.trim().startsWith('$$')) {
      const startLine = i;
      const singleLineMatch = line.trim().match(/^\$\$([\s\S]+?)\$\$$/);
      if (singleLineMatch) {
        ast.push({
          type: 'mathblock',
          tex: singleLineMatch[1].trim(),
          lineStart: startLine,
          lineEnd: i
        });
        i++;
        continue;
      }
      const mathLines = [line.trim().slice(2)];
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        mathLines.push(lines[i].trim().slice(0, -2));
        i++;
      }
      ast.push({
        type: 'mathblock',
        tex: mathLines.join('\n').trim(),
        lineStart: startLine,
        lineEnd: i - 1
      });
      continue;
    }

    // 4. Headings (# through ######)
    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      ast.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
        line: i
      });
      i++;
      continue;
    }

    // 5. Horizontal Rule (---, ***, ___)
    if (/^\s*(?:-\s*){3,}$|^\s*(?:\*\s*){3,}$|^\s*(?:_\s*){3,}$/.test(line)) {
      ast.push({ type: 'hr', line: i });
      i++;
      continue;
    }

    // 6. Blockquote or Obsidian Callout (> [!NOTE] Title ...)
    if (/^\s*>\s?/.test(line)) {
      const startLine = i;
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const firstLine = quoteLines[0] || '';
      const calloutMatch = firstLine.match(CALLOUT_HEADER_RE);
      if (calloutMatch) {
        const rawType = calloutMatch[1].toLowerCase();
        const kind = CALLOUT_TYPES.has(rawType) ? rawType : 'note';
        const fold = calloutMatch[2] || '';
        const title = calloutMatch[3] || calloutMatch[1];
        ast.push({
          type: 'callout',
          calloutType: kind,
          rawType: calloutMatch[1],
          fold,
          title,
          body: quoteLines.slice(1).join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
      } else {
        ast.push({
          type: 'blockquote',
          body: quoteLines.join('\n'),
          lineStart: startLine,
          lineEnd: i - 1
        });
      }
      continue;
    }

    // 7. GFM Table
    if (line.includes('|') && i + 1 < lines.length) {
      const aligns = parseTableDelimiter(lines[i + 1]);
      if (aligns) {
        const startLine = i;
        const headers = splitTableCells(line);
        i += 2; // advance past header and delimiter
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
          rows.push(splitTableCells(lines[i]));
          i++;
        }
        ast.push({
          type: 'table',
          headers,
          aligns,
          rows,
          lineStart: startLine,
          lineEnd: i - 1
        });
        continue;
      }
    }

    // 8. Lists (Task Checklists, Unordered, Ordered)
    const taskMatch = line.match(TASK_LINE_RE);
    const ulMatch = !taskMatch && line.match(/^([ \t]*)[-*+]\s+(.*)$/);
    const olMatch = !taskMatch && !ulMatch && line.match(/^([ \t]*)(\d+)\.\s+(.*)$/);

    if (taskMatch || ulMatch || olMatch) {
      const startLine = i;
      const ordered = Boolean(olMatch);
      const items = [];

      while (i < lines.length) {
        const cur = lines[i];
        const tM = cur.match(TASK_LINE_RE);
        if (tM) {
          items.push({
            task: true,
            checked: tM[2].toLowerCase() === 'x',
            indent: tM[1].length,
            text: tM[3],
            line: i
          });
          i++;
          continue;
        }
        const uM = cur.match(/^([ \t]*)[-*+]\s+(.*)$/);
        if (uM && !ordered) {
          items.push({
            task: false,
            checked: false,
            indent: uM[1].length,
            text: uM[2],
            line: i
          });
          i++;
          continue;
        }
        const oM = cur.match(/^([ \t]*)(\d+)\.\s+(.*)$/);
        if (oM && ordered) {
          items.push({
            task: false,
            checked: false,
            indent: oM[1].length,
            orderNum: Number(oM[2]),
            text: oM[3],
            line: i
          });
          i++;
          continue;
        }
        break;
      }

      ast.push({
        type: 'list',
        ordered,
        items,
        lineStart: startLine,
        lineEnd: i - 1
      });
      continue;
    }

    // 9. Standard Paragraph
    const startLine = i;
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*(?:#{1,6}\s+|```|>\s?|[-*+]\s+|\d+\.\s+|\$\$)/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && parseTableDelimiter(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    ast.push({
      type: 'paragraph',
      text: paraLines.join('\n'),
      lineStart: startLine,
      lineEnd: i - 1
    });
  }

  return ast;
}

/**
 * Renders parsed Markdown AST or string into strict XHTML suitable for both
 * SVG <foreignObject> and Live Preview DOM overlays.
 *
 * @param {string} markdownText
 * @param {Object} [options]
 * @returns {string}
 */
export function renderMarkdownToHtml(markdownText, options = {}) {
  const ast = parseMarkdownAST(markdownText);
  const blocks = [];

  for (const node of ast) {
    switch (node.type) {
      case 'heading': {
        const tag = `h${node.level}`;
        blocks.push(
          `<${tag} class="gb-md-h gb-md-h${node.level}" data-line="${node.line}">${renderInlineMarkdown(node.text, options)}</${tag}>`
        );
        break;
      }

      case 'hr': {
        blocks.push(`<hr class="gb-md-hr" data-line="${node.line}" />`);
        break;
      }

      case 'codeblock': {
        const langAttr = node.lang ? ` data-lang="${escapeXhtml(node.lang)}"` : '';
        const langBadge = node.lang
          ? `<div class="gb-code-lang">${escapeXhtml(node.lang)}</div>`
          : '';
        blocks.push(
          `<div class="gb-codeblock-wrap" data-line="${node.lineStart}"${langAttr}>${langBadge}<pre class="gb-codeblock"><code>${highlightCodeXhtml(node.code)}</code></pre></div>`
        );
        break;
      }

      case 'mathblock': {
        blocks.push(
          `<div class="gb-mathblock-wrap" data-line="${node.lineStart}">${renderMathToXhtml(node.tex, true)}</div>`
        );
        break;
      }

      case 'callout': {
        const icon = CALLOUT_ICONS[node.calloutType] || CALLOUT_ICONS.note;
        const bodyHtml = node.body
          ? `<div class="callout-content">${renderMarkdownToHtml(node.body, options)}</div>`
          : '';
        blocks.push(
          `<div class="callout callout-${escapeXhtml(node.calloutType)}" data-callout="${escapeXhtml(node.calloutType)}" data-line="${node.lineStart}">` +
            `<div class="callout-title">` +
              `<span class="callout-icon">${icon}</span>` +
              `<span class="callout-title-inner">${renderInlineMarkdown(node.title, options)}</span>` +
            `</div>` +
            bodyHtml +
          `</div>`
        );
        break;
      }

      case 'blockquote': {
        blocks.push(
          `<blockquote class="gb-blockquote" data-line="${node.lineStart}">${renderMarkdownToHtml(node.body, options)}</blockquote>`
        );
        break;
      }

      case 'table': {
        const ths = node.headers
          .map((h, colIdx) => {
            const align = node.aligns[colIdx];
            const style = align ? ` style="text-align:${align}"` : '';
            return `<th${style}>${renderInlineMarkdown(h, options)}</th>`;
          })
          .join('');

        const trs = node.rows
          .map((row) => {
            const tds = node.headers
              .map((_, colIdx) => {
                const align = node.aligns[colIdx];
                const style = align ? ` style="text-align:${align}"` : '';
                const cellText = row[colIdx] ?? '';
                return `<td${style}>${renderInlineMarkdown(cellText, options)}</td>`;
              })
              .join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');

        blocks.push(
          `<table class="gb-md-table" data-line="${node.lineStart}"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
        );
        break;
      }

      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const hasTasks = node.items.some((it) => it.task);
        const listCls = hasTasks ? 'gb-md-list gb-task-list' : 'gb-md-list';
        const lis = node.items
          .map((item) => {
            if (item.task) {
              const checkedAttr = item.checked ? ' checked="checked"' : '';
              const itemCls = item.checked ? 'gb-task-item is-checked' : 'gb-task-item';
              return (
                `<li class="${itemCls}" data-line="${item.line}">` +
                  `<input type="checkbox" class="gb-task-checkbox" data-line="${item.line}"${checkedAttr} />` +
                  `<span class="gb-task-label">${renderInlineMarkdown(item.text, options)}</span>` +
                `</li>`
              );
            }
            return `<li data-line="${item.line}">${renderInlineMarkdown(item.text, options)}</li>`;
          })
          .join('');
        blocks.push(`<${tag} class="${listCls}" data-line="${node.lineStart}">${lis}</${tag}>`);
        break;
      }

      case 'paragraph': {
        const lineHtml = node.text
          .split('\n')
          .map((l) => renderInlineMarkdown(l, options))
          .join('<br />');
        blocks.push(`<p class="gb-md-p" data-line="${node.lineStart}">${lineHtml}</p>`);
        break;
      }
    }
  }

  return blocks.join('\n');
}

/**
 * Extracts all task checklist items with their 0-based line indices.
 * Used by hit.js and textedit.js to toggle checkboxes on canvas tap.
 *
 * @param {string} markdownText
 * @returns {Array<{line: number, checked: boolean, indent: number, text: string}>}
 */
export function extractTaskItems(markdownText) {
  const lines = String(markdownText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const tasks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TASK_LINE_RE);
    if (m) {
      tasks.push({
        line: i,
        indent: m[1].length,
        checked: m[2].toLowerCase() === 'x',
        text: m[3]
      });
    }
  }
  return tasks;
}

/**
 * Toggles a Markdown task item (`- [ ]` <-> `- [x]`) at a specific 0-based line index.
 *
 * @param {string} markdownText
 * @param {number} lineIndex
 * @returns {{text: string, toggled: boolean, checked?: boolean}}
 */
export function toggleTaskAtLine(markdownText, lineIndex) {
  const raw = String(markdownText ?? '');
  const crlf = raw.includes('\r\n');
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { text: raw, toggled: false };
  }

  const match = lines[lineIndex].match(/^([ \t]*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
  if (!match) {
    return { text: raw, toggled: false };
  }

  const nextChecked = match[2].toLowerCase() !== 'x';
  lines[lineIndex] = `${match[1]}${nextChecked ? 'x' : ' '}${match[3]}`;

  return {
    text: lines.join(crlf ? '\r\n' : '\n'),
    toggled: true,
    checked: nextChecked
  };
}

/**
 * Generates self-contained inline CSS for the SVG <foreignObject> renderer.
 * Having styles inline prevents Chromium security restrictions from stripping
 * styles inside an HTMLImageElement data URI.
 */
export function getMarkdownInlineCss({
  color = '#1e293b',
  fontSize = 20,
  fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  align = 'left'
} = {}) {
  return `
    .gb-markdown-body {
      box-sizing: border-box;
      margin: 0;
      padding: 8px 10px;
      color: ${color};
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: 1.45;
      text-align: ${align};
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .gb-markdown-body * { box-sizing: border-box; }
    .gb-md-h { margin: 0.35em 0 0.25em; font-weight: 700; line-height: 1.25; }
    .gb-md-h1 { font-size: 1.6em; border-bottom: 1px solid rgba(128,128,128,0.25); padding-bottom: 0.15em; }
    .gb-md-h2 { font-size: 1.38em; }
    .gb-md-h3 { font-size: 1.2em; }
    .gb-md-h4, .gb-md-h5, .gb-md-h6 { font-size: 1.05em; }
    .gb-md-p { margin: 0.3em 0; }
    .gb-md-hr { border: 0; border-top: 1px solid rgba(128,128,128,0.35); margin: 0.6em 0; }
    .gb-inline-code {
      font-family: Consolas, "JetBrains Mono", monospace;
      font-size: 0.88em;
      background: rgba(128,128,128,0.16);
      padding: 0.12em 0.35em;
      border-radius: 4px;
    }
    .gb-codeblock-wrap {
      position: relative;
      margin: 0.45em 0;
      background: rgba(15, 23, 42, 0.07);
      border: 1px solid rgba(128,128,128,0.22);
      border-radius: 6px;
      overflow: hidden;
    }
    .gb-code-lang {
      font-family: Consolas, monospace;
      font-size: 0.7em;
      text-transform: uppercase;
      opacity: 0.65;
      padding: 2px 8px;
      border-bottom: 1px solid rgba(128,128,128,0.15);
    }
    .gb-codeblock {
      margin: 0;
      padding: 8px 10px;
      font-family: Consolas, "JetBrains Mono", monospace;
      font-size: 0.85em;
      white-space: pre-wrap;
    }
    .gb-hl-kw { font-weight: 600; color: #7c3aed; }
    .gb-blockquote {
      margin: 0.4em 0;
      padding: 0.2em 0.75em;
      border-left: 4px solid rgba(100,116,139,0.6);
      opacity: 0.9;
    }
    .callout {
      margin: 0.45em 0;
      padding: 8px 12px;
      border-left: 4px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 4px 6px 6px 4px;
    }
    .callout-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .callout-tip, .callout-success { border-left-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .callout-warning { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .callout-danger, .callout-bug { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.12); }
    .callout-info { border-left-color: #06b6d4; background: rgba(6, 182, 212, 0.1); }
    .gb-md-list { margin: 0.35em 0; padding-left: 1.4em; }
    .gb-task-list { list-style: none; padding-left: 0.2em; }
    .gb-task-item { display: flex; align-items: baseline; gap: 0.45em; margin: 0.2em 0; }
    .gb-task-item.is-checked .gb-task-label { text-decoration: line-through; opacity: 0.65; }
    .gb-task-checkbox { width: 0.95em; height: 0.95em; margin: 0; vertical-align: middle; }
    .gb-md-table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.45em 0;
      font-size: 0.92em;
    }
    .gb-md-table th, .gb-md-table td {
      border: 1px solid rgba(128,128,128,0.35);
      padding: 4px 8px;
    }
    .gb-md-table th { background: rgba(128,128,128,0.12); font-weight: 700; }
    .gb-wikilink, .gb-obsidian-uri, .gb-ext-link {
      color: #6366f1;
      text-decoration: underline;
      font-weight: 500;
    }
    .gb-math-block, .gb-mathblock-wrap {
      margin: 0.4em 0;
      text-align: center;
      font-family: "KaTeX_Main", "Cambria Math", serif;
    }
    .gb-math-inline {
      font-family: "KaTeX_Main", "Cambria Math", serif;
      font-style: italic;
    }
  `;
}

/**
 * Builds an SVG <foreignObject> data URI for sharp Canvas2D rendering.
 *
 * @param {string} markdownText
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} [options.color]
 * @param {number} [options.fontSize]
 * @param {string} [options.fontFamily]
 * @param {'left'|'center'|'right'} [options.align]
 * @param {Function} [options.resolveWikilink]
 * @returns {string}
 */
export function buildMarkdownSvgDataUri(markdownText, options = {}) {
  const width = Math.max(40, Math.ceil(options.width || 320));
  const height = Math.max(24, Math.ceil(options.height || 160));
  const htmlContent = renderMarkdownToHtml(markdownText, options);
  const cssContent = getMarkdownInlineCss(options);

  const svg =
    `<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<foreignObject width="100%" height="100%">` +
        `<div xmlns="[http://www.w3.org/1999/xhtml](http://www.w3.org/1999/xhtml)" class="gb-markdown-body">` +
          `<style>${cssContent}</style>` +
          htmlContent +
        `</div>` +
      `</foreignObject>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}