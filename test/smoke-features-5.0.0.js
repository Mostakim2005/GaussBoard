'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const browserChecks = String.raw`(async () => {
  const out = {};
  const app = window.app;
  const wait = (fn, ms = 10000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      try {
        const value = fn();
        if (value) { clearInterval(timer); resolve(value); }
        else if (Date.now() - start > ms) { clearInterval(timer); reject(new Error('timed out waiting for UI')); }
      } catch (error) { clearInterval(timer); reject(error); }
    }, 25);
  });

  const bar = app.audioBar;
  const oldTracks = app.store.doc.audioTracks;
  const oldMode = app.settings.replayDisplayMode;
  const oldBarTrack = bar.track;
  const oldReplayTrack = app.replayEngine?.track;
  try {
    const track = { id: 'smoke-v5-replay-mode', name: 'Replay mode test', durationMs: 1000, bookmarks: [] };
    app.store.doc.audioTracks = [track];
    bar.open(track);
    await wait(() => bar.btnSession && bar.btnSession.style.display !== 'none');
    out.singleRecordingShowsSessionControls = true;

    if (!document.querySelector('.ab-session-dropdown')) {
      if (typeof bar.toggleSessionMenu === 'function') bar.toggleSessionMenu();
      else bar.btnSession.click();
    }
    const menu = await wait(() => document.querySelector('.ab-session-dropdown'));
    const selector = menu.querySelector('select.ab-replay-display-mode');
    out.replayModesExposeAllThreeChoices = !!selector &&
      ['reveal', 'spotlight', 'static'].every((value) => [...selector.options].some((option) => option.value === value));
    selector.value = 'spotlight';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    out.replayModeSelectionPersists = app.settings.replayDisplayMode === 'spotlight' &&
      app.surface._ink === null;
  } catch (error) {
    out.singleRecordingShowsSessionControls ||= String(error);
    out.replayModesExposeAllThreeChoices ??= String(error);
    out.replayModeSelectionPersists ??= String(error);
  } finally {
    bar.closeSessionMenu();
    bar.close();
    app.store.doc.audioTracks = oldTracks;
    bar.track = oldBarTrack;
    if (app.replayEngine) {
      app.replayEngine.pause();
      app.replayEngine.track = oldReplayTrack || null;
      if (!oldReplayTrack) app.replayEngine.audio?.removeAttribute?.('src');
    }
    app.settings.replayDisplayMode = oldMode;
    app.saveSettings();
    bar.syncUI();
  }
  return out;
})()`;

async function run(win, app) {
  const checks = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    singleRecordingShowsSessionControls: 'single recording exposes its session controls',
    replayModesExposeAllThreeChoices: 'replay menu offers Live reveal, Spotlight, and Static',
    replayModeSelectionPersists: 'replay display selection updates settings and invalidates the live scene'
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
  const out = path.join(__dirname, 'out', 'features-5.0.0-results.txt');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, lines.join('\n') + '\n');
  app.exit(failed ? 1 : 0);
}

module.exports = { run };
