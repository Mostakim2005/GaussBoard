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
    const preset = await wait(() => document.querySelector('#videoExportModal select'));
    preset.value = '1080p60';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
    [...document.querySelectorAll('#videoExportModal button')].find((b) => b.textContent.trim() === 'Export Video').click();
    const result = await selected;
    out.videoPresetDialogReturnsSelectedSizeAndRate = result.video.width === 1920 && result.video.height === 1080 && result.video.fps === 60;
  } catch (e) { out.videoPresetDialogReturnsSelectedSizeAndRate = String(e); }

  return out;
})()`;

async function run(win, app) {
  const checks = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    penOpacityRangeStoresAndEnablesValue: 'pen opacity slider stores its range and toggle state',
    templateTagFilterShowsMatchingTemplate: 'template tag filtering shows the matching template',
    videoPresetDialogReturnsSelectedSizeAndRate: 'video export dialog returns the chosen resolution and frame rate'
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
