'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const browserChecks = String.raw`(async () => {
  const app = window.app;
  const out = {};
  const originalDoc = structuredClone(app.store.doc);
  const oldClipboard = app.clipboard;
  const oldClipStamp = app.clipStamp;
  const oldReading = app.readingMode;
  const oldOpenBoardRef = app.openBoardRef;
  const sourceId = app.store.doc.id;
  const sourceName = app.store.doc.name || app.store.doc.title || 'Smoke source';
  try {
    app.store.add({ id: 'smoke-v5-1-excerpt-source', type: 'text', x: 80, y: 100, w: 300, h: 55,
      text: 'Linked excerpt smoke test', fontSize: 24, color: '#111111', rotation: 0, markdown: false }, 'excerpt smoke source');
    app.setSelection(['smoke-v5-1-excerpt-source']);
    const payload = app.buildExcerptPayload();
    out.selectionMakesBoundedScreenshotPayload = !!payload && payload.version === 1 &&
      payload.dataUrl.startsWith('data:image/png;base64,') && payload.source.boardId === sourceId &&
      payload.source.bounds.w > 0 && payload.dataUrl.length < 16 * 1024 * 1024;

    const pasted = app.insertExcerptPayload(payload, { x: 420, y: 260 });
    out.excerptImageKeepsSourceMetadata = !!pasted && pasted.type === 'image' &&
      pasted.excerptSource.boardId === sourceId && pasted.excerptSource.boardName === sourceName &&
      pasted.excerptSource.bounds.w > 0;

    let opened = null;
    app.openBoardRef = (ref) => { opened = ref; return true; };
    const followed = app.openExcerptSource(pasted);
    out.openSourceUsesBoardPageAndBounds = followed === true && opened?.id === sourceId &&
      opened.page === payload.source.page && opened.box?.x === payload.source.bounds.x;

    app.clipboard = [pasted];
    app.readingMode = false;
    const leftDoc = structuredClone(originalDoc);
    leftDoc.id = 'smoke-v5-1-left-board';
    leftDoc.name = 'Split target';
    leftDoc.title = 'Split target';
    leftDoc.objects = [];
    app.splitWorkspace.enable({ leftBoardData: leftDoc });
    app.splitWorkspace.isPointerOverLeft = true;
    await app.pasteAt(null);
    const leftPaste = app.splitWorkspace.leftStore?.objects?.find((o) => o.excerptSource?.boardId === sourceId);
    out.splitPanePastePreservesExcerptBacklink = !!leftPaste;

    const dropEvent = { clientX: 40, clientY: 70 };
    const dropped = app.splitWorkspace.dropExcerptPayload(payload, dropEvent);
    out.splitPaneDropAddsLinkedExcerpt = !!dropped &&
      app.splitWorkspace.leftStore.objects.some((o) => o.id === dropped.id && o.excerptSource?.boardId === sourceId);
  } catch (error) {
    for (const key of ['selectionMakesBoundedScreenshotPayload', 'excerptImageKeepsSourceMetadata',
      'openSourceUsesBoardPageAndBounds', 'splitPanePastePreservesExcerptBacklink', 'splitPaneDropAddsLinkedExcerpt']) {
      out[key] ??= String(error?.stack || error);
    }
  } finally {
    try { app.splitWorkspace.disable(); } catch {}
    app.store.load(originalDoc);
    app.surface?.repaintAll();
    app.clipboard = oldClipboard;
    app.clipStamp = oldClipStamp;
    app.readingMode = oldReading;
    app.openBoardRef = oldOpenBoardRef;
  }
  return out;
})()`;

async function run(win, app) {
  const results = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    selectionMakesBoundedScreenshotPayload: 'selection produces a bounded PNG excerpt with source metadata',
    excerptImageKeepsSourceMetadata: 'pasted excerpt is an image linked to its source bounds',
    openSourceUsesBoardPageAndBounds: 'open source returns to the exact board and excerpt area',
    splitPanePastePreservesExcerptBacklink: 'keyboard paste into split pane keeps the source link',
    splitPaneDropAddsLinkedExcerpt: 'drag payload drops into split pane as a linked image'
  };
  let passed = 0, failed = 0;
  const lines = [];
  for (const [key, label] of Object.entries(names)) {
    const ok = results[key] === true;
    ok ? passed++ : failed++;
    const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — ${String(results[key])}`}`;
    lines.push(line);
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${line}`);
  }
  lines.push('', `${passed} passed, ${failed} failed`);
  const out = path.join(__dirname, 'out', 'features-5.1.0-results.txt');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, lines.join('\n') + '\n');
  app.exit(failed ? 1 : 0);
}

module.exports = { run };
