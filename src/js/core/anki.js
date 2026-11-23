/**
 * GazBoard - AnkiConnect Bridge & APKG Flashcard Exporter
 * Supports desktop Anki synchronization via AnkiConnect HTTP API (127.0.0.1:8765)
 * and standalone offline .apkg package export via pure JS ZIP packaging.
 */

import { t } from '../i18n.js';
import { safeName } from '../export.js';
import { collectStudyCards, formatInterval, previewNextIntervals } from './fsrs.js';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

/**
 * Resolve AnkiConnect base URL from ecosystem-registry (via preload IPC) or fallback.
 */
export async function resolveAnkiConnectUrl(overrideUrl) {
  if (typeof overrideUrl === 'string' && overrideUrl.trim()) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }
  try {
    const svcs = await (typeof window !== 'undefined' ? window.board?.getEcosystemServices?.() : null);
    if (svcs?.ankiConnect?.url) return String(svcs.ankiConnect.url).replace(/\/+$/, '');
  } catch {}
  return ANKI_CONNECT_URL;
}

/**
 * Deterministic cross-reference identifier for a board card object.
 */
export function ensureCardXrefId(boardId, obj) {
  if (obj?.xrefId && typeof obj.xrefId === 'string') return obj.xrefId;
  return `xref_gb_${safeName(boardId || 'board')}_${safeName(obj?.id || 'card')}`;
}

/**
 * Check if AnkiConnect is active on desktop
 */
export async function checkAnkiConnect(url) {
  const targetUrl = await resolveAnkiConnectUrl(url);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'version', version: 6 }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}`, url: targetUrl };
    const data = await resp.json();
    return { ok: true, version: data.result || 6, url: targetUrl };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Connection timed out' : 'Not reachable', url: targetUrl };
  }
}

/**
 * Invoke an AnkiConnect action with strict timeout guard
 */
export async function invokeAnkiConnect(action, params = {}, url = ANKI_CONNECT_URL, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }),
      signal: controller.signal
    });
    if (!resp.ok) throw new Error(`AnkiConnect HTTP error: ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AnkiConnect request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract question and answer representations for a Study Tape or Answer Cover object
 */
export function extractCardContent(app, item) {
  const obj = item.object;
  const boardName = app.store?.doc?.name || 'GazBoard';
  const boardId = app.store?.doc?.id || 'board';
  const isTape = item.isTape;

  let frontText = isTape
    ? t('Study Tape Occlusion ({board})', { board: boardName })
    : t('Answer Cover Question ({board})', { board: boardName });
  let backText = t('Revealed content on GazBoard whiteboard.');

  // Check if any text/note objects are attached to this cover
  if (Array.isArray(app.store?.objects)) {
    const attached = app.store.objects.filter((o) => o.attachedTo === obj.id);
    const texts = attached
      .filter((o) => o.type === 'text' || o.type === 'note')
      .map((o) => o.text || o.runs?.map((r) => r.t ?? r.text ?? '').join('') || '')
      .filter(Boolean);
    if (texts.length) {
      backText = texts.join('\n\n');
    }
  }

  if (obj.label) {
    frontText = obj.label;
  }

  const backlink = `gaussboard://open?board=${encodeURIComponent(boardId)}&obj=${encodeURIComponent(obj.id)}`;
  const xrefId = ensureCardXrefId(boardId, obj);
  const ankiNoteId = Number.isInteger(obj.ankiNoteId) && obj.ankiNoteId > 0 ? obj.ankiNoteId : null;

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return {
    id: obj.id,
    xrefId,
    ankiNoteId,
    frontPlain: frontText,
    backPlain: backText,
    backlink,
    front: esc(frontText),
    back: esc(backText) + `<br><br><small><a href="${esc(backlink)}">Open in GaussBoard</a></small>`,
    tags: ['gazboard', isTape ? 'study-tape' : 'answer-cover', safeName(boardName), `xref:${xrefId}`]
  };
}

function persistCardAnkiMeta(app, obj, patch) {
  if (!obj) return;
  if (obj.ankiNoteId === patch.ankiNoteId && obj.xrefId === patch.xrefId) return;
  if (typeof app.store?.update === 'function') {
    app.store.update(obj.id, patch, 'sync anki note');
  } else {
    Object.assign(obj, patch);
  }
}

/**
 * Push all study cards on the current board into desktop Anki via AnkiConnect (idempotent update-or-create)
 */
export async function syncBoardToAnki(app, options = {}) {
  const url = await resolveAnkiConnectUrl(options.url);
  const check = await checkAnkiConnect(url);
  if (!check.ok) {
    return {
      ok: false,
      error: t('AnkiConnect is not running at 127.0.0.1:8765. Please ensure Anki desktop is open with the AnkiConnect add-on installed.')
    };
  }

  const boardName = app.store?.doc?.name || 'GazBoard';
  const deckName = options.deckName || `GaussBoard::${safeName(boardName)}`;
  const cards = collectStudyCards(app.store);

  if (!cards.length) {
    return {
      ok: false,
      error: t('No Study Tape or Answer Cover cards found on this board. Use the Study Tape tool (🩹) to occlude items first.')
    };
  }

  try {
    // 1. Ensure deck exists
    await invokeAnkiConnect('createDeck', { deck: deckName }, url);

    // 2. Verify any previously recorded Anki note IDs still exist
    const candidateIds = [...new Set(
      cards.map((c) => c.object?.ankiNoteId).filter((id) => Number.isInteger(id) && id > 0)
    )];
    const liveNoteIds = new Set();
    if (candidateIds.length) {
      try {
        const infos = await invokeAnkiConnect('notesInfo', { notes: candidateIds }, url);
        if (Array.isArray(infos)) {
          for (const info of infos) {
            if (info && Number.isInteger(info.noteId) && info.noteId > 0) {
              liveNoteIds.add(info.noteId);
            }
          }
        }
      } catch {}
    }

    // 3. Prepare notes & update existing notes in place
    let updatedCount = 0;
    let createdCount = 0;
    const syncedNoteIds = [];
    const toCreate = [];

    for (const c of cards) {
      const obj = c.object;
      const content = extractCardContent(app, c);
      let backHtml = content.back;
      if (typeof app.surface?.renderRectToDataUrl === 'function' && Number.isFinite(obj.x) && Number.isFinite(obj.y) && obj.w > 0 && obj.h > 0) {
        try {
          const dataUrl = app.surface.renderRectToDataUrl({ x: obj.x - 20, y: obj.y - 20, w: obj.w + 40, h: obj.h + 40 });
          const b64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : null;
          if (b64) {
            const mediaName = `gb_${safeName(obj.id)}.png`;
            await invokeAnkiConnect('storeMediaFile', { filename: mediaName, data: b64 }, url);
            backHtml = `<img src="${mediaName}"><br>` + backHtml;
          }
        } catch {}
      }

      let existingId = Number.isInteger(obj.ankiNoteId) && liveNoteIds.has(obj.ankiNoteId) ? obj.ankiNoteId : null;
      if (!existingId) {
        try {
          const found = await invokeAnkiConnect('findNotes', { query: `tag:"xref:${content.xrefId}"` }, url);
          if (Array.isArray(found) && Number.isInteger(found[0]) && found[0] > 0) {
            existingId = found[0];
          }
        } catch {}
      }

      if (existingId) {
        await invokeAnkiConnect('updateNoteFields', {
          note: {
            id: existingId,
            fields: {
              Front: content.front,
              Back: backHtml
            }
          }
        }, url);
        persistCardAnkiMeta(app, obj, { ankiNoteId: existingId, xrefId: content.xrefId });
        updatedCount++;
        syncedNoteIds.push(existingId);
      } else {
        toCreate.push({
          obj,
          xrefId: content.xrefId,
          note: {
            deckName,
            modelName: 'Basic',
            fields: {
              Front: content.front,
              Back: backHtml
            },
            tags: content.tags,
            options: {
              allowDuplicate: false
            }
          }
        });
      }
    }

    // 4. Create only new notes & persist returned Anki note IDs
    if (toCreate.length) {
      const addedIds = await invokeAnkiConnect('addNotes', { notes: toCreate.map((item) => item.note) }, url);
      if (Array.isArray(addedIds)) {
        for (let i = 0; i < toCreate.length; i++) {
          const nid = addedIds[i];
          if (Number.isInteger(nid) && nid > 0) {
            persistCardAnkiMeta(app, toCreate[i].obj, { ankiNoteId: nid, xrefId: toCreate[i].xrefId });
            createdCount++;
            syncedNoteIds.push(nid);
          }
        }
      }
    }

    return {
      ok: true,
      count: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      deckName,
      noteIds: syncedNoteIds
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || t('Failed to push notes to AnkiConnect.')
    };
  }
}

/**
 * Standalone .apkg Flashcard Exporter
 * Generates an Anki package containing card data using pure JS ZIP packaging.
 */
export async function exportBoardToApkg(app, options = {}) {
  const boardName = app.store?.doc?.name || 'GazBoard';
  const cards = collectStudyCards(app.store);

  if (!cards.length) {
    return {
      ok: false,
      error: t('No Study Tape or Answer Cover cards found on this board. Create some using the Study Tape tool before exporting.')
    };
  }

  const exportCards = cards.map((c, i) => {
    const content = extractCardContent(app, c);
    const intervals = previewNextIntervals(c.card);
    return {
      index: i + 1,
      id: content.id,
      front: content.front,
      back: content.back,
      tags: content.tags,
      fsrs: {
        reps: c.card.reps,
        stability: c.card.stability,
        difficulty: c.card.difficulty,
        intervals
      }
    };
  });

  // Anki Tab-Separated Values (TSV) Import File for Anki desktop / AnkiDroid / AnkiMobile
  // Format: #separator:tab \n #html:true \n #tags column:3 \n Front \t Back \t Tags
  const tsvLines = [
    '#separator:tab',
    '#html:true',
    '#tags column:3'
  ];
  for (const c of exportCards) {
    const cleanFront = c.front.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
    const cleanBack = c.back.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
    const tags = c.tags.join(' ');
    tsvLines.push(`${cleanFront}\t${cleanBack}\t${tags}`);
  }

  // Anki Desktop/AnkiDroid require a SQLite collection.anki2 database inside .apkg files.
  // Until native SQLite generation is wired, export a directly Anki-importable UTF-8 TSV (.txt)
  // file (#separator:tab, #html:true, #tags column:3) so File -> Import works cleanly in Anki.
  const tsvText = tsvLines.join('\n');
  const tsvBytes = new TextEncoder().encode(tsvText);
  const filename = `${safeName(boardName)}-Anki-Import.txt`;

  if (window.board?.saveDialog && window.board?.writeFile) {
    const targetPath = options.filePath || await window.board.saveDialog({
      title: t('Export Flashcards (.apkg)'),
      defaultPath: filename,
      filters: [
        { name: t('Anki Package') + ' (TSV .txt)', extensions: ['txt', 'tsv'] },
        { name: t('All Files'), extensions: ['*'] }
      ]
    });
    if (!targetPath) return { ok: false, cancelled: true };
    await window.board.writeFile(targetPath, tsvBytes.buffer);
    return { ok: true, count: exportCards.length, filePath: targetPath, format: 'anki-tsv' };
  } else {
    const blob = new Blob([tsvBytes], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, count: exportCards.length, filePath: filename, format: 'anki-tsv' };
  }
}

/**
 * Generate an Obsidian Practice Engine compatible Markdown bank (.md) from board study cards.
 */
export function generatePracticeEngineBank(app, options = {}) {
  const doc = app.store?.doc || {};
  const boardName = doc.name || 'GazBoard';
  const boardId = doc.id || 'board';
  const cards = collectStudyCards(app.store);
  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];
  const boardXref = doc.xrefId || `xref_gb_${safeName(boardId)}`;
  const ankiNoteIds = [...new Set(
    cards.map((c) => c.object?.ankiNoteId).filter((id) => Number.isInteger(id) && id > 0)
  )];

  const lines = [
    '---',
    `title: ${JSON.stringify(`${boardName} — Practice Bank`)}`,
    `date: ${today}`,
    `updated_at: ${nowIso}`,
    `xref_id: ${JSON.stringify(boardXref)}`,
    'source_app: gaussboard',
    `source_uri: ${JSON.stringify(`gaussboard://open?board=${encodeURIComponent(boardId)}`)}`,
    `board_id: ${JSON.stringify(String(boardId))}`,
    ...(ankiNoteIds.length ? [`anki_note_ids: [${ankiNoteIds.join(', ')}]`] : []),
    'tags: [practice-bank, gaussboard]',
    '---',
    '',
    `# ${boardName} — Practice Bank`,
    ''
  ];

  for (const c of cards) {
    const obj = c.object;
    const card = c.card || {};
    const content = extractCardContent(app, c);
    const kindTag = c.isTape ? 'study-tape' : 'answer-cover';
    const dueStr = Number.isFinite(card.due) ? new Date(card.due).toISOString().split('T')[0] : today;
    const ivl = Math.max(1, Math.round(card.scheduled_days || 1));
    const reps = Math.max(0, Number(card.reps || 0));
    const lapses = Math.max(0, Number(card.lapses || 0));
    const sVal = Math.max(0.1, Number(card.stability || 1)).toFixed(2);
    const dVal = Math.min(10, Math.max(1, Number(card.difficulty || 5))).toFixed(2);
    const diffVal = Math.min(10, Math.max(0.5, Number(card.difficulty || 5) / 2)).toFixed(1);
    const peId = `gb_${safeName(obj.id)}`;
    const ankiPart = content.ankiNoteId ? ` ankiId=${content.ankiNoteId}` : '';

    lines.push(`> [!question] Type:: Conceptual | Difficulty:: Moderate | Subjects:: ${boardName} | Tags:: #gaussboard, #${kindTag}`);
    for (const qLine of String(content.frontPlain || '').replace(/\r\n?/g, '\n').split('\n')) {
      lines.push(`> ${qLine}`);
    }
    lines.push('>');
    lines.push('> > [!answer]');
    for (const aLine of String(content.backPlain || '').replace(/\r\n?/g, '\n').split('\n')) {
      lines.push(`> > ${aLine}`);
    }
    lines.push('> >');
    lines.push(`> > [Open in GaussBoard](${content.backlink})`);
    lines.push(`<!--pe-meta: id=${peId} due=${dueStr} ivl=${ivl} reps=${reps} diff=${diffVal} s=${sVal} d=${dVal} lapses=${lapses} attempts=${reps}${ankiPart} hist= -->`);
    lines.push('');
  }

  return {
    markdown: lines.join('\n'),
    count: cards.length,
    filename: `${safeName(boardName)}-Practice-Bank.md`
  };
}

/**
 * Export study cards as an Obsidian Practice Engine Markdown bank (.md), optionally directly to vault.
 */
export async function exportBoardToPracticeBank(app, options = {}) {
  const bank = generatePracticeEngineBank(app, options);
  if (!bank.count) {
    return {
      ok: false,
      error: t('No Study Tape or Answer Cover cards found on this board. Create some using the Study Tape tool before exporting.')
    };
  }

  if (options.syncToObsidian && typeof window !== 'undefined' && window.board?.syncToObsidian) {
    const res = await window.board.syncToObsidian({
      filename: bank.filename,
      content: bank.markdown,
      subfolder: options.subfolder || 'Practice'
    });
    if (!res?.ok) return { ok: false, error: res?.error || 'Failed to sync Practice Engine bank' };
    return { ok: true, count: bank.count, filePath: res.vaultRel || bank.filename, format: 'practice-engine-md', mode: res.mode };
  }

  const bytes = new TextEncoder().encode(bank.markdown);
  if (typeof window !== 'undefined' && window.board?.saveDialog && window.board?.writeFile) {
    const targetPath = options.filePath || await window.board.saveDialog({
      title: t('Export Practice Engine Bank (.md)'),
      defaultPath: bank.filename,
      filters: [
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: t('All Files'), extensions: ['*'] }
      ]
    });
    if (!targetPath) return { ok: false, cancelled: true };
    await window.board.writeFile(targetPath, bytes.buffer);
    return { ok: true, count: bank.count, filePath: targetPath, format: 'practice-engine-md' };
  }

  const blob = new Blob([bytes], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bank.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { ok: true, count: bank.count, filePath: bank.filename, format: 'practice-engine-md' };
}
