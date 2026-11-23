/**
 * Markdown Sidecar & Vault Summary Exporter for GazBoard.
 * Generates clean Obsidian Markdown with YAML frontmatter, KaTeX math blocks,
 * diagram code blocks, and video timestamp bookmarks.
 */

/**
 * Collect canonical ECOSYSTEM_INTEGRATION_CONTRACT v2.0.0 metadata from a GazBoard doc.
 */
export function collectBoardSidecarMetadata(doc, boardName = 'Board', options = {}) {
  const rawObjects = doc?.objects || {};
  const entries = Array.isArray(rawObjects)
    ? rawObjects.filter(Boolean).map((o, idx) => [o.id || String(idx), o])
    : Object.entries(rawObjects).filter(([, o]) => o && typeof o === 'object');

  const tags = Array.isArray(doc?.tags) ? [...doc.tags] : [];
  const ankiNoteIds = [];
  const diagramPaths = Array.isArray(options.diagramPaths) ? [...options.diagramPaths] : [];
  const transcripts = [];

  for (const [id, o] of entries) {
    if (typeof o.text === 'string') {
      const matches = o.text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
      if (matches) {
        for (const m of matches) {
          const tag = m.trim().replace(/^#/, '');
          if (tag && !tags.includes(tag)) tags.push(tag);
        }
      }
    }
    if (Number.isInteger(o.ankiNoteId) && o.ankiNoteId > 0 && !ankiNoteIds.includes(o.ankiNoteId)) {
      ankiNoteIds.push(o.ankiNoteId);
    }
    const dPath = o.diagramPath || o.mermaidPath;
    if (typeof dPath === 'string' && dPath.trim() && !diagramPaths.includes(dPath.trim())) {
      diagramPaths.push(dPath.trim());
    }
    if (o.type === 'video' && typeof o.subtitlesText === 'string' && o.subtitlesText.trim()) {
      transcripts.push({
        kind: 'subtitle',
        id: o.id || id,
        name: o.title || o.name || 'Video Subtitles',
        text: o.subtitlesText.trim()
      });
    }
  }

  if (Array.isArray(doc?.audioTracks)) {
    for (const track of doc.audioTracks) {
      if (track && typeof track.transcript === 'string' && track.transcript.trim()) {
        transcripts.push({
          kind: 'audio',
          id: track.id || 'audio',
          name: track.name || 'Audio Transcript',
          text: track.transcript.trim()
        });
      }
    }
  }

  const boardId = doc?.id ? String(doc.id) : null;
  const safeSlug = String(boardId || boardName || 'board').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'board';
  const xrefId = options.xrefId || doc?.xrefId || `xref_gb_${safeSlug}`;
  const updatedAt = options.updatedAt || new Date().toISOString();
  const sourceUri = boardId ? `gaussboard://open?board=${encodeURIComponent(boardId)}` : null;

  return {
    entries,
    boardId,
    safeSlug,
    xrefId,
    updatedAt,
    sourceUri,
    tags,
    ankiNoteIds,
    diagramPaths,
    transcripts
  };
}

/**
 * Extracts YAML frontmatter and markdown sections from GazBoard document state.
 * @param {Object} doc - GazBoard doc state
 * @param {string} [boardName='Board'] - Current board name
 * @param {Object} [options]
 * @returns {string} Clean Obsidian-compatible Markdown text
 */
export function generateMarkdownSidecar(doc, boardName = 'Board', options = {}) {
  const aliases = Array.isArray(doc?.aliases) ? [...doc.aliases] : [];
  const meta = collectBoardSidecarMetadata(doc, boardName, options);

  const now = meta.updatedAt.split('T')[0];
  const lines = [];

  // 1. YAML Frontmatter
  lines.push('---');
  lines.push(`title: ${JSON.stringify(String(boardName || 'Board'))}`);
  lines.push(`date: ${now}`);
  lines.push(`updated_at: ${meta.updatedAt}`);
  lines.push(`xref_id: ${JSON.stringify(meta.xrefId)}`);
  if (meta.tags.length) {
    lines.push(`tags: [${meta.tags.map(t => JSON.stringify(t)).join(', ')}]`);
  }
  if (aliases.length) {
    lines.push(`aliases: [${aliases.map(a => JSON.stringify(a)).join(', ')}]`);
  }
  lines.push('source_app: gaussboard');
  if (meta.sourceUri) {
    lines.push(`source_uri: ${JSON.stringify(meta.sourceUri)}`);
  }
  if (meta.boardId) {
    lines.push(`board_id: ${JSON.stringify(meta.boardId)}`);
    lines.push(`deep_link: ${JSON.stringify(meta.sourceUri)}`);
  }
  if (meta.ankiNoteIds.length) {
    lines.push(`anki_note_ids: [${meta.ankiNoteIds.join(', ')}]`);
  }
  if (meta.diagramPaths.length) {
    lines.push(`diagram_paths: [${meta.diagramPaths.map((p) => JSON.stringify(p)).join(', ')}]`);
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

  for (const [, o] of meta.entries) {
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
      const page = Number.isInteger(src?.page) && src.page > 0 ? ` (Page ${src.page})` : '';
      lines.push(`- Excerpt from **${bName}**${page}`);
      if (ex.name) lines.push(`  - Description: ${ex.name}`);
    }
    lines.push('');
  }

  if (meta.transcripts.length) {
    lines.push('## Audio & Subtitle Transcripts');
    lines.push('');
    for (const tr of meta.transcripts) {
      lines.push(`### ${tr.name}`);
      lines.push('');
      lines.push(tr.text);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Prompts user to save or download the generated Markdown sidecar file.
 */
export async function exportMarkdownSidecarFile(app) {
  const boardName = app.store?.doc?.name || app.store?.name || 'Board';
  const doc = app.store?.doc;
  const content = generateMarkdownSidecar(doc, boardName);
  const defaultFilename = `${boardName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.md`;

  if (window.board?.saveDialog && window.board?.writeFile) {
    const filePath = await window.board.saveDialog({
      title: 'Save Markdown Sidecar',
      defaultPath: defaultFilename,
      filters: [{ name: 'Markdown (*.md)', extensions: ['md'] }]
    });
    if (!filePath) return;
    await window.board.writeFile(filePath, new TextEncoder().encode(content).buffer);
    app.toast?.(`Exported ${filePath.split(/[\\/]/).pop() || defaultFilename}`);
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
