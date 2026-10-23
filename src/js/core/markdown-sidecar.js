/**
 * Markdown Sidecar & Vault Summary Exporter for GazBoard.
 * Generates clean Obsidian Markdown with YAML frontmatter, KaTeX math blocks,
 * diagram code blocks, and video timestamp bookmarks.
 */

/**
 * Extracts YAML frontmatter and markdown sections from GazBoard document state.
 * @param {Object} doc - GazBoard doc state
 * @param {string} [boardName='Board'] - Current board name
 * @param {Object} [options]
 * @returns {string} Clean Obsidian-compatible Markdown text
 */
export function generateMarkdownSidecar(doc, boardName = 'Board', options = {}) {
  const objects = doc?.objects || {};
  const tags = Array.isArray(doc?.tags) ? [...doc.tags] : [];
  const aliases = Array.isArray(doc?.aliases) ? [...doc.aliases] : [];

  // Scan text and notes for inline #hashtags if not already recorded in doc.tags
  for (const o of Object.values(objects)) {
    if (!o || typeof o.text !== 'string') continue;
    const matches = o.text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
    if (matches) {
      for (const m of matches) {
        const tag = m.trim().replace(/^#/, '');
        if (tag && !tags.includes(tag)) tags.push(tag);
      }
    }
  }

  const now = new Date().toISOString().split('T')[0];
  const lines = [];

  // 1. YAML Frontmatter
  lines.push('---');
  lines.push(`title: "${boardName.replace(/"/g, '\\"')}"`);
  lines.push(`date: ${now}`);
  if (tags.length) {
    lines.push(`tags: [${tags.map(t => JSON.stringify(t)).join(', ')}]`);
  }
  if (aliases.length) {
    lines.push(`aliases: [${aliases.map(a => JSON.stringify(a)).join(', ')}]`);
  }
  lines.push('generator: GazBoard v5.9.0');
  lines.push('---');
  lines.push('');

  // 2. Title & Board Summary
  lines.push(`# ${boardName}`);
  lines.push('');

  // 3. Notes & Markdown Cards
  const notes = [];
  const diagrams = [];
  const videos = [];
  const excerpts = [];

  for (const [id, o] of Object.entries(objects)) {
    if (!o || typeof o !== 'object') continue;
    if (o.type === 'note' || o.type === 'text') {
      notes.push(o);
    } else if (o.type === 'image' && o.subtype === 'visualization') {
      diagrams.push(o);
    } else if (o.type === 'video') {
      videos.push(o);
    } else if (o.excerptSource) {
      excerpts.push(o);
    }
  }

  // Render Notes
  if (notes.length) {
    lines.push('## Notes & Cards');
    lines.push('');
    for (const note of notes) {
      const text = (note.text || '').trim();
      if (!text) continue;
      // If it looks like a card with a title or content
      if (note.color && note.color !== '#ffd94a') {
        lines.push(`> [!note] Note (${note.color})`);
        const indented = text.split('\n').map(l => `> ${l}`).join('\n');
        lines.push(indented);
      } else {
        lines.push(text);
      }
      lines.push('');
    }
  }

  // Render Visualizations & Diagrams
  if (diagrams.length) {
    lines.push('## Diagrams & Visualizations');
    lines.push('');
    for (const d of diagrams) {
      const kind = d.vizKind || 'mermaid';
      const title = d.name || 'Diagram';
      lines.push(`### ${title}`);
      lines.push('');
      if (kind === 'mermaid') {
        lines.push('```mermaid');
        lines.push(d.vizSource || '');
        lines.push('```');
      } else {
        lines.push('```json');
        lines.push(d.vizSource || '');
        lines.push('```');
      }
      lines.push('');
    }
  }

  // Render Video Bookmarks & Timestamps
  if (videos.length) {
    lines.push('## Video References & Timestamps');
    lines.push('');
    for (const v of videos) {
      const title = v.name || v.url || 'Video';
      lines.push(`### ${title}`);
      if (v.url) {
        lines.push(`- **URL**: [${v.url}](${v.url})`);
      }
      if (Array.isArray(v.bookmarks) && v.bookmarks.length) {
        lines.push('- **Timestamp Bookmarks**:');
        for (const bm of v.bookmarks) {
          const m = Math.floor(bm.time / 60);
          const s = Math.floor(bm.time % 60);
          const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          lines.push(`  - \`[${mmss}]\` ${bm.label || 'Bookmark'}`);
        }
      }
      lines.push('');
    }
  }

  // Render Linked Excerpts
  if (excerpts.length) {
    lines.push('## Linked Excerpts');
    lines.push('');
    for (const ex of excerpts) {
      const src = ex.excerptSource;
      const bName = src?.boardName || 'Source Board';
      const page = src?.page ? ` (Page ${src.page + 1})` : '';
      lines.push(`- Excerpt from **${bName}**${page}`);
      if (ex.name) lines.push(`  - Description: ${ex.name}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Prompts user to save or download the generated Markdown sidecar file.
 */
export async function exportMarkdownSidecarFile(app) {
  const boardName = app.store?.name || 'Board';
  const doc = app.store?.doc;
  const content = generateMarkdownSidecar(doc, boardName);
  const defaultFilename = `${boardName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.md`;

  if (window.board?.saveFile) {
    const res = await window.board.saveFile({
      defaultName: defaultFilename,
      content,
      filters: [{ name: 'Markdown (*.md)', extensions: ['md'] }]
    });
    if (res?.saved) {
      app.toast?.(`Exported ${defaultFilename}`);
    }
    return;
  }

  // Browser fallback
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  app.toast?.(`Exported ${defaultFilename}`);
}
