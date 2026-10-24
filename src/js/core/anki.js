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
 * Check if AnkiConnect is active on desktop
 */
export async function checkAnkiConnect(url = ANKI_CONNECT_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'version', version: 6 }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { ok: true, version: data.result || 6 };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Connection timed out' : 'Not reachable' };
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
      .map((o) => o.text || o.runs?.map((r) => r.text).join('') || '')
      .filter(Boolean);
    if (texts.length) {
      backText = texts.join('\n\n');
    }
  }

  if (obj.label) {
    frontText = obj.label;
  }

  const backlink = `gazboard://board/${encodeURIComponent(boardId)}?obj=${encodeURIComponent(obj.id)}`;

  return {
    id: obj.id,
    front: frontText,
    back: backText + `<br><br><small><a href="${backlink}">🔗 Open in GazBoard</a></small>`,
    tags: ['gazboard', isTape ? 'study-tape' : 'answer-cover', safeName(boardName)]
  };
}

/**
 * Push all study cards on the current board into desktop Anki via AnkiConnect
 */
export async function syncBoardToAnki(app, options = {}) {
  const check = await checkAnkiConnect();
  if (!check.ok) {
    return {
      ok: false,
      error: t('AnkiConnect is not running at 127.0.0.1:8765. Please ensure Anki desktop is open with the AnkiConnect add-on installed.')
    };
  }

  const boardName = app.store?.doc?.name || 'GazBoard';
  const deckName = options.deckName || `GazBoard::${safeName(boardName)}`;
  const cards = collectStudyCards(app.store);

  if (!cards.length) {
    return {
      ok: false,
      error: t('No Study Tape or Answer Cover cards found on this board. Use the Study Tape tool (🩹) to occlude items first.')
    };
  }

  try {
    // 1. Ensure deck exists
    await invokeAnkiConnect('createDeck', { deck: deckName });

    // 2. Prepare notes
    const notes = cards.map((c) => {
      const content = extractCardContent(app, c);
      return {
        deckName,
        modelName: 'Basic',
        fields: {
          Front: content.front,
          Back: content.back
        },
        tags: content.tags,
        options: {
          allowDuplicate: true
        }
      };
    });

    // 3. Add notes to Anki
    const noteIds = await invokeAnkiConnect('addNotes', { notes });
    const successCount = noteIds ? noteIds.filter(Boolean).length : cards.length;

    return {
      ok: true,
      count: successCount,
      deckName
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

  // Ensure JSZip is loaded
  let JSZip = window.JSZip;
  if (!JSZip) {
    try {
      const script = document.createElement('script');
      script.src = new URL('../../vendor/jszip.min.js', import.meta.url).href;
      await new Promise((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
      });
      JSZip = window.JSZip;
    } catch {
      // Fallback
    }
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

  const zip = new JSZip();

  // 1. Deck manifest
  const manifest = {
    generator: 'GazBoard Engineering Notebook',
    version: '6.2.0',
    boardName,
    exportedAt: new Date().toISOString(),
    deckName: `GazBoard::${safeName(boardName)}`,
    cardCount: exportCards.length,
    cards: exportCards
  };
  zip.file('deck_manifest.json', JSON.stringify(manifest, null, 2));

  // 2. Anki Tab-Separated Values (TSV) Import File for Anki desktop / AnkiDroid / AnkiMobile
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
  zip.file('anki_import.txt', tsvLines.join('\n'));

  // 3. Media map (compliant with Anki APKG structure)
  zip.file('media', '{}');

  const zipBlob = await zip.generateAsync({ type: 'uint8array' });
  const filename = `${safeName(boardName)}-Cards.apkg`;

  // Save dialog or download blob
  if (window.board?.saveDialog && window.board?.writeFile) {
    const targetPath = options.filePath || await window.board.saveDialog({
      title: t('Export Flashcards (.apkg)'),
      defaultPath: filename,
      filters: [
        { name: t('Anki Package'), extensions: ['apkg', 'zip'] },
        { name: t('All Files'), extensions: ['*'] }
      ]
    });
    if (!targetPath) return { ok: false, cancelled: true };
    await window.board.writeFile(targetPath, zipBlob.buffer);
    return { ok: true, count: exportCards.length, filePath: targetPath };
  } else {
    // Browser download fallback
    const blob = new Blob([zipBlob], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, count: exportCards.length, filePath: filename };
  }
}
