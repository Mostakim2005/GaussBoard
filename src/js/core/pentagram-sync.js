/**
 * @file pentagram-sync.js
 * @description Orchestrates cross-app Pentagram sync for GaussBoard:
 * - Exports canonical Markdown sidecars + JSON Canvas 1.0 to Obsidian Nihon/Whiteboards/
 * - Emits multimodal ingest events (sidecar, canvas, page PNG preview, transcripts) to RAG Manager (:27130)
 * - Sends board context to DeepTutor (:8001)
 */

import { generateMarkdownSidecar, collectBoardSidecarMetadata } from './markdown-sidecar.js';
import { exportToJsonCanvas } from './json-canvas.js';

export function buildBoardSyncBundle(app, options = {}) {
  const doc = app?.store?.doc || {};
  const boardName = doc.name || app?.store?.name || 'Board';
  const meta = collectBoardSidecarMetadata(doc, boardName, options);
  const markdown = generateMarkdownSidecar(doc, boardName, {
    xrefId: meta.xrefId,
    updatedAt: meta.updatedAt,
    diagramPaths: meta.diagramPaths
  });
  const canvas = exportToJsonCanvas(doc);
  const safeStem = String(boardName)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Board';

  const pagePngs = [];
  if (options.includePreview !== false && typeof app?.boardPictureFor === 'function') {
    try {
      const pic = app.boardPictureFor(false);
      if (typeof pic === 'string' && pic.startsWith('data:image/')) {
        pagePngs.push(pic);
      }
    } catch {}
  }

  return {
    boardId: meta.boardId,
    boardName,
    safeStem,
    mdFilename: `${safeStem}.md`,
    canvasFilename: `${safeStem}.canvas`,
    meta,
    markdown,
    canvas,
    pagePngs,
    transcripts: meta.transcripts
  };
}

export async function syncBoardToEcosystem(app, options = {}) {
  const boardApi = options.boardApi || (typeof window !== 'undefined' ? window.board : null);
  const bundle = buildBoardSyncBundle(app, options);

  let obsidianMd = null;
  let obsidianCanvas = null;
  if (typeof boardApi?.syncToObsidian === 'function') {
    try {
      obsidianMd = await boardApi.syncToObsidian({
        filename: bundle.mdFilename,
        content: bundle.markdown
      });
    } catch (err) {
      obsidianMd = { ok: false, error: err?.message || 'Obsidian sync failed' };
    }
    try {
      obsidianCanvas = await boardApi.syncToObsidian({
        filename: bundle.canvasFilename,
        content: JSON.stringify(bundle.canvas, null, 2)
      });
    } catch (err) {
      obsidianCanvas = { ok: false, error: err?.message || 'Obsidian canvas sync failed' };
    }
  }

  let rag = null;
  if (typeof boardApi?.ingestToRag === 'function') {
    try {
      rag = await boardApi.ingestToRag({
        source_app: 'gaussboard',
        event: options.event || 'board.synced',
        xref_id: bundle.meta.xrefId,
        source_uri: bundle.meta.sourceUri,
        board_id: bundle.boardId,
        title: bundle.boardName,
        updated_at: bundle.meta.updatedAt,
        markdown: bundle.markdown,
        canvas: bundle.canvas,
        obsidian_paths: {
          markdown: obsidianMd?.vaultRel || null,
          canvas: obsidianCanvas?.vaultRel || null
        },
        page_pngs: bundle.pagePngs,
        transcripts: bundle.transcripts,
        anki_note_ids: bundle.meta.ankiNoteIds,
        diagram_paths: bundle.meta.diagramPaths
      });
    } catch (err) {
      rag = { ok: false, offline: true, error: err?.message || 'RAG ingest failed' };
    }
  }

  return {
    ok: !!(obsidianMd?.ok || rag?.ok),
    obsidian: {
      md: obsidianMd,
      canvas: obsidianCanvas
    },
    rag,
    xrefId: bundle.meta.xrefId
  };
}

export async function sendBoardContextToDeepTutor(app, options = {}) {
  const boardApi = options.boardApi || (typeof window !== 'undefined' ? window.board : null);
  if (typeof boardApi?.sendToDeepTutor !== 'function') {
    return { ok: false, offline: true, error: 'DeepTutor bridge unavailable' };
  }
  const bundle = buildBoardSyncBundle(app, { includePreview: false });
  return boardApi.sendToDeepTutor({
    mode: options.mode || 'ask',
    prompt: options.prompt || '',
    title: bundle.boardName,
    boardId: bundle.boardId,
    xrefId: bundle.meta.xrefId,
    sourceUri: bundle.meta.sourceUri,
    markdown: bundle.markdown
  });
}
