'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const browserChecks = String.raw`(async () => {
  const out = {};
  const app = window.app;
  const wait = (fn, ms = 3000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      try { const value = fn(); if (value) { clearInterval(timer); resolve(value); }
      else if (Date.now() - start > ms) { clearInterval(timer); reject(new Error('timed out waiting for UI')); } }
      catch (e) { clearInterval(timer); reject(e); }
    }, 25);
  });

  try {
    await app.panels.settings();
    const opacity = await wait(() => document.querySelector('#panel input[aria-label="Pen opacity"]'));
    const row = opacity.closest('.setting-row');
    opacity.value = '38';
    opacity.dispatchEvent(new Event('input', { bubbles: true }));
    opacity.dispatchEvent(new Event('change', { bubbles: true }));
    const toggle = row.querySelector('input[type="checkbox"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    out.penOpacityRangeStoresAndEnablesValue = app.settings.penOpacity === 0.38 && app.settings.penOpacityEnabled === true && row.textContent.includes('38%');
  } catch (e) { out.penOpacityRangeStoresAndEnablesValue = String(e); }

  try {
    await app.panels.close();
    const key = 'gazboard:custom_templates';
    const before = localStorage.getItem(key);
    const list = JSON.parse(before || '[]');
    list.unshift({ id: 'smoke-template-tag', name: 'Smoke template', group: 'Custom templates', custom: true, tags: ['feature-smoke'], objects: [] });
    localStorage.setItem(key, JSON.stringify(list));
    await app.panels.templates();
    const filter = await wait(() => document.querySelector('[data-template-tag="feature-smoke"]'));
    filter.click();
    await wait(() => document.querySelector('.tpl[title="Smoke template"]'));
    out.templateTagFilterShowsMatchingTemplate = [...document.querySelectorAll('.tpl')].some((el) => el.title === 'Smoke template') &&
      ![...document.querySelectorAll('.tpl')].some((el) => el.title !== 'Smoke template');
    await app.panels.close();
    if (before == null) localStorage.removeItem(key); else localStorage.setItem(key, before);
  } catch (e) { out.templateTagFilterShowsMatchingTemplate = String(e); }

  try {
    await app.panels.close();
    const { pickRecordingsForVideoExport } = await import('app://board/js/export-video.js');
    const selected = pickRecordingsForVideoExport(app, [{ id: 'preset-smoke', name: 'Preset test', durationMs: 1000 }]);
    const preset = await wait(() => document.querySelector('#videoExportModal select[aria-label="Video quality"]'));
    preset.value = '1080p60';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
    const cameraMode = document.querySelector('#videoExportModal select[aria-label="Video framing"]');
    const fixedFrame = document.querySelector('#videoExportModal select[aria-label="Fixed view area"]');
    cameraMode.value = 'follow';
    cameraMode.dispatchEvent(new Event('change', { bubbles: true }));
    const followDisablesFixedScope = fixedFrame.disabled;
    [...document.querySelectorAll('#videoExportModal button')].find((b) => b.textContent.trim() === 'Export Video').click();
    const followResult = await selected;
    out.videoFollowFramingSelectionReturnsFollowMode = followDisablesFixedScope && followResult.video.cameraMode === 'follow';

    const boardSelected = pickRecordingsForVideoExport(app, [{ id: 'board-frame-smoke', name: 'Board frame', durationMs: 1000 }]);
    await wait(() => document.querySelector('#videoExportModal select[aria-label="Video framing"]'));
    const boardCameraMode = document.querySelector('#videoExportModal select[aria-label="Video framing"]');
    const boardFixedFrame = document.querySelector('#videoExportModal select[aria-label="Fixed view area"]');
    boardCameraMode.value = 'fixed';
    boardCameraMode.dispatchEvent(new Event('change', { bubbles: true }));
    boardFixedFrame.value = 'board';
    [...document.querySelectorAll('#videoExportModal button')].find((b) => b.textContent.trim() === 'Export Video').click();
    const boardResult = await boardSelected;
    out.videoFixedWholeBoardSelectionReturnsBoardFrame = boardResult.video.cameraMode === 'fixed' && boardResult.video.fixedFrame === 'board';

    out.videoPresetDialogReturnsSelectedSizeAndRate = followResult.video.width === 1920 && followResult.video.height === 1080 && followResult.video.fps === 60;
  } catch (e) { out.videoPresetDialogReturnsSelectedSizeAndRate = String(e); }

  try {
    await app.panels.close();
    const savedAutosave = app.settings.autosave;
    app.settings.autosave = false;
    app.newBoard(true);
    const sf = app.surface, it = app.interaction;
    sf.cam.x = sf.width / 2; sf.cam.y = sf.height / 2; sf.cam.z = 1;
    app.setTool('select');
    const answer = { id: 'tape-toggle-answer', type: 'text', x: -20, y: -10, w: 120, h: 40,
      text: 'answer', rotation: 0 };
    app.store.add(answer, 'feature smoke answer');
    const cover = app.addCurtain();
    app.store.update(cover.id, { x: -40, y: -30, w: 160, h: 80 }, 'feature smoke placement');
    app.setTool('select');
    const rect = sf.canvas.getBoundingClientRect();
    const point = sf.cam.toScreen(cover.x + 20, cover.y + 20);
    const ev = (buttons) => ({ pointerId: 211, pointerType: 'mouse', button: 0, buttons, pressure: 0.5,
      clientX: rect.left + point.x, clientY: rect.top + point.y, shiftKey: false, altKey: false,
      ctrlKey: false, metaKey: false });
    const tap = () => { it.onDown(ev(1)); it.onUp(ev(0)); it.action = null; it.actionId = null; it.pointers.clear(); };
    tap();
    const coverRevealed = app.store.get(cover.id)?.revealed === true;
    tap();
    const coverConcealedAgain = app.store.get(cover.id)?.revealed === false;

    app.newBoard(true);
    const tape = { id: 'freehand-tape-toggle', type: 'curtain', subtype: 'tape', tool: 'tape', width: 30,
      points: [{ x: -30, y: 0 }, { x: 40, y: 0 }], bbox: { x: -30, y: 0, w: 70, h: 0 }, rotation: 0, revealed: false };
    app.store.add(tape, 'feature smoke tape');
    sf.cam.x = sf.width / 2; sf.cam.y = sf.height / 2; sf.cam.z = 1;
    const tapePoint = sf.cam.toScreen(0, 0);
    const tapeEvent = (buttons) => ({ ...ev(buttons), pointerId: 212,
      clientX: rect.left + tapePoint.x, clientY: rect.top + tapePoint.y });
    const tapeTap = () => { it.onDown(tapeEvent(1)); it.onUp(tapeEvent(0)); it.action = null; it.actionId = null; it.pointers.clear(); };
    app.setTool('select');
    const { pick, curtainAt } = await import('app://board/js/core/hit.js');
    const tapeHitBeforeTap = pick(app.store, { x: 0, y: 0 })?.id === tape.id && curtainAt(app.store, { x: 0, y: 0 })?.id === tape.id;
    tapeTap();
    const tapeRevealed = app.store.get(tape.id)?.revealed === true;
    const tapeStateAfterFirst = app.store.get(tape.id)?.revealed;
    tapeTap();
    const tapeConcealedAgain = app.store.get(tape.id)?.revealed === false;
    const tapeStateAfterSecond = app.store.get(tape.id)?.revealed;

    const ribbonTape = document.querySelector('#toolbar [data-ribbon-id="tape"]');
    ribbonTape?.click();
    const ribbonActivatesDrawingTool = app.tool === 'tape';
    app.setTool('select');
    const { closePopover } = await import('app://board/js/ui/popover.js');
    closePopover();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query) => ({ matches: query === '(pointer: coarse)' || query === '(max-width: 760px)' });
    const { initToolbar } = await import('app://board/js/ui/toolbar.js');
    initToolbar(app);
    document.querySelector('#toolbar [data-pop="add"]')?.click();
    const addTapeItem = [...document.querySelectorAll('.pop .menu-action-zone')].find((el) => el.textContent.includes('Study Tape'));
    addTapeItem?.click();
    const addMenuActivatesDrawingTool = app.tool === 'tape';
    window.matchMedia = originalMatchMedia;
    initToolbar(app);
    app.settings.autosave = savedAutosave;
    app.newBoard(true);
    out.rectangularCoverTogglesAndKeepsAnswer = coverRevealed && coverConcealedAgain ||
      'revealed=' + coverRevealed + ', concealed=' + coverConcealedAgain + ', state=' + app.store.get(cover.id)?.revealed;
    out.freehandStudyTapeTogglesTwice = tapeRevealed && tapeConcealedAgain ||
      'hit=' + tapeHitBeforeTap + ', after1=' + tapeStateAfterFirst + ', after2=' + tapeStateAfterSecond +
      ', revealed=' + tapeRevealed + ', concealed=' + tapeConcealedAgain;
    out.ribbonAndAddMenuActivateTapeTool = ribbonTape && addTapeItem && ribbonActivatesDrawingTool && addMenuActivatesDrawingTool ||
      'button=' + !!ribbonTape + ', item=' + !!addTapeItem + ', ribbon=' + ribbonActivatesDrawingTool + ', menu=' + addMenuActivatesDrawingTool;
  } catch (e) {
    out.rectangularCoverTogglesAndKeepsAnswer = String(e);
    out.freehandStudyTapeTogglesTwice = String(e);
    out.ribbonAndAddMenuActivateTapeTool = String(e);
  }

  return out;
})()`;

async function run(win, app) {
  const checks = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    penOpacityRangeStoresAndEnablesValue: 'pen opacity slider stores its range and toggle state',
    templateTagFilterShowsMatchingTemplate: 'template tag filtering shows the matching template',
    videoPresetDialogReturnsSelectedSizeAndRate: 'video export dialog returns the chosen resolution and frame rate',
    videoFollowFramingSelectionReturnsFollowMode: 'video export dialog returns replay-follow framing and disables fixed scope',
    videoFixedWholeBoardSelectionReturnsBoardFrame: 'video export dialog returns fixed whole-board framing',
    rectangularCoverTogglesAndKeepsAnswer: 'rectangular cover toggles on and off with its answer restored',
    freehandStudyTapeTogglesTwice: 'freehand study tape toggles revealed and concealed',
    ribbonAndAddMenuActivateTapeTool: 'desktop ribbon and phone Add menu activate the study tape drawing tool'
  };
  let passed = 0, failed = 0;
  const lines = [];
  for (const [key, label] of Object.entries(names)) {
    const ok = checks[key] === true;
    ok ? passed++ : failed++;
    const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — ${String(checks[key])}`}`;
    lines.push(line);
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${line}`);
  }
  const summary = `${passed} passed, ${failed} failed`;
  lines.push('', summary);
  console.log(`\n${summary}`);
  const out = path.join(__dirname, 'out', 'features-4.8.8-results.txt');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, lines.join('\n') + '\n');
  app.exit(failed ? 1 : 0);
}

module.exports = { run };
