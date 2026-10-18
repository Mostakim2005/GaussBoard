'use strict';
// Focused behavior checks for the audit fixes shipped as V 4.8.4.1.
// Run separately from the mandatory full regression suite with:
//   npm run smoke:features:4.8.4.1
const path = require('node:path');
const fs = require('node:fs/promises');

const browserChecks = String.raw`(async () => {
  const result = {};
  const app = window.app;
  const { startImageCrop } = await import('app://board/js/ui/contextmenu.js');

  const makeImage = (id, crop) => ({ id, type: 'image', src: '', missing: true,
    x: 0, y: 0, w: 100, h: 80, ...(crop ? { crop: { ...crop } } : {}) });
  const slider = (overlay, index, value) => {
    const el = overlay.querySelectorAll('input[type="range"]')[index];
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  try {
    const cancelImage = makeImage('feature-crop-cancel');
    app.store.add(cancelImage, 'feature smoke setup');
    const cancelHistory = app.store.undoStack.length;
    startImageCrop(app, cancelImage);
    const cancelOverlay = document.getElementById('cropOverlay');
    slider(cancelOverlay, 2, 20);
    const previewChanged = cancelImage.crop?.sx === 0.2;
    cancelOverlay.querySelector('.crop-title button, div > button')?.click();
    result.cropCancelRestoresOriginal = previewChanged && !cancelImage.crop &&
      app.store.undoStack.length === cancelHistory && !document.getElementById('cropOverlay');
  } catch (e) { result.cropCancelRestoresOriginal = String(e); }

  try {
    const applyImage = makeImage('feature-crop-apply');
    app.store.add(applyImage, 'feature smoke setup');
    const applyHistory = app.store.undoStack.length;
    startImageCrop(app, applyImage);
    const overlay = document.getElementById('cropOverlay');
    slider(overlay, 2, 15);
    [...overlay.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Apply').click();
    const appliedOnce = app.store.undoStack.length === applyHistory + 1 && applyImage.crop?.sx === 0.15;
    const undoWorks = app.store.undo() && !applyImage.crop;
    const redoWorks = app.store.redo() && applyImage.crop?.sx === 0.15;
    result.cropApplyIsOneUndoableChange = appliedOnce && undoWorks && redoWorks;
  } catch (e) { result.cropApplyIsOneUndoableChange = String(e); }

  try {
    const initialCrop = { sx: 0.1, sy: 0.15, sw: 0.7, sh: 0.65 };
    const resetImage = makeImage('feature-crop-reset', initialCrop);
    app.store.add(resetImage, 'feature smoke setup');
    const resetHistory = app.store.undoStack.length;
    startImageCrop(app, resetImage);
    const overlay = document.getElementById('cropOverlay');
    [...overlay.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Reset').click();
    const resetOnce = app.store.undoStack.length === resetHistory + 1 && !resetImage.crop;
    const undoRestoresCrop = app.store.undo() && JSON.stringify(resetImage.crop) === JSON.stringify(initialCrop);
    result.cropResetIsOneUndoableChange = resetOnce && undoRestoresCrop;
  } catch (e) { result.cropResetIsOneUndoableChange = String(e); }

  try {
    const { clampImageCrop } = await import('app://board/js/core/render.js');
    const { sx, sy, sw, sh } = clampImageCrop({ sx: 99, sy: -5, sw: 99, sh: 99 }, 10, 8);
    result.cropSourceRectStaysInsideImage = sx === 9 && sy === 0 && sw === 1 && sh === 8 &&
      sx >= 0 && sy >= 0 && sx + sw <= 10 && sy + sh <= 8;
  } catch (e) { result.cropSourceRectStaysInsideImage = String(e); }

  try {
    const { VideoExporter } = await import('app://board/js/export-video.js');
    const { Surface } = await import('app://board/js/core/surface.js');
    const proto = Surface.prototype;
    const old = { drawScene: proto.drawScene, drawReplaySession: proto.drawReplaySession, destroy: proto.destroy };
    const originals = {};
    const replace = (obj, key, value) => {
      originals[key] = Object.getOwnPropertyDescriptor(obj, key);
      Object.defineProperty(obj, key, { configurable: true, writable: true, value });
    };
    const stats = { destroyed: 0, closedContexts: 0, disconnectedSources: 0, stoppedVideo: 0,
      replayTracks: [], baseFilters: [], blockAudio: false };
    const originalTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    const originalAudio = window.Audio;
    const originalAudioContext = window.AudioContext;
    const originalMediaRecorder = window.MediaRecorder;
    const originalMediaStream = window.MediaStream;
    const canvasCapture = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'captureStream');
    const restore = (obj, key, desc) => desc
      ? Object.defineProperty(obj, key, desc) : delete obj[key];

    try {
      proto.drawScene = function (_ctx, _w, _h, _onFrame, _selection, exclude) {
        if (typeof exclude === 'function') stats.baseFilters.push({
          excluded: ['single-export', 'stitched-a', 'stitched-b'].filter((id) => !exclude({ audioId: id })),
          otherRetained: exclude({ audioId: 'other-track' })
        });
      };
      proto.drawReplaySession = function (_ctx, clock) { stats.replayTracks.push(clock.track?.id); };
      proto.destroy = function () { stats.destroyed++; return old.destroy.call(this); };

      class FakeAudio {
        constructor() { this.duration = Infinity; this.currentTime = 0; this.ended = false; this.listeners = {}; this.src = ''; window.__featureAudio = this; }
        addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
        removeEventListener(name, fn) { this.listeners[name] = (this.listeners[name] || []).filter((x) => x !== fn); }
        emit(name) { for (const fn of [...(this.listeners[name] || [])]) fn(); }
        load() { if (!stats.blockAudio) Promise.resolve().then(() => this.emit('canplaythrough')); }
        play() { this.currentTime = 0; return Promise.resolve(); }
        pause() {}
        removeAttribute(name) { if (name === 'src') this.src = ''; }
      }
      class FakeMediaStream { constructor(tracks) { this.tracks = tracks; } getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); } getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); } }
      class FakeAudioContext {
        createMediaElementSource() { return { connect() {}, disconnect() { stats.disconnectedSources++; } }; }
        createMediaStreamDestination() { return { stream: new FakeMediaStream([{ kind: 'audio', stop() {} }]) }; }
        close() { stats.closedContexts++; return Promise.resolve(); }
      }
      class FakeMediaRecorder {
        static isTypeSupported() { return true; }
        constructor() { this.state = 'inactive'; }
        start() { this.state = 'recording'; }
        requestData() { this.ondataavailable?.({ data: new Blob(['feature-smoke']) }); }
        stop() { if (this.state === 'inactive') return; this.state = 'inactive'; this.onstop?.(); }
      }
      replace(window, 'Audio', FakeAudio);
      replace(window, 'AudioContext', FakeAudioContext);
      replace(window, 'MediaRecorder', FakeMediaRecorder);
      replace(window, 'MediaStream', FakeMediaStream);
      replace(HTMLCanvasElement.prototype, 'captureStream', function () {
        const video = { kind: 'video', requestFrame() {}, stop() { stats.stoppedVideo++; } };
        return { getVideoTracks: () => [video], getAudioTracks: () => [], getTracks: () => [video] };
      });
      window.setTimeout = (fn, ms, ...args) => {
        if (ms >= 1000) return originalTimeout(fn, 10, ...args);
        if (ms >= 80 && ms <= 250) return originalTimeout(() => { if (window.__featureAudio) window.__featureAudio.currentTime = 1; fn(...args); }, 0);
        return originalTimeout(fn, 0, ...args);
      };
      window.clearTimeout = (id) => originalClearTimeout(id);

      const liveReplay = { track: { id: 'live-board-track' }, currentTimeMs: 321, active: true };
      const videoApp = { store: { doc: { objects: {} } }, replayEngine: liveReplay,
        surface: { cam: { x: 0, y: 0, z: 1 } }, __featureTrackId: null };
      const exporter = new VideoExporter(videoApp);
      const single = await exporter.exportReplayVideo({ track: { id: 'single-export', assetId: 'fake', durationMs: 750 }, width: 160, height: 90, fps: 10 });
      result.exportUsesFiniteTrackDurationAndPrivateClock = single.durationMs === 750 && single.blob.size > 0 &&
        stats.replayTracks.includes('single-export') && stats.replayTracks.length > 0 &&
        liveReplay.track.id === 'live-board-track' && liveReplay.currentTimeMs === 321 &&
        stats.baseFilters.some((f) => f.excluded.includes('single-export') && f.otherRetained);
      const afterSingleCleanup = stats.destroyed === 1 && stats.closedContexts > 0 && stats.disconnectedSources === 1 && stats.stoppedVideo === 1;

      stats.replayTracks = []; stats.baseFilters = [];
      const stitched = await exporter.exportStitchedReplayVideo({ tracks: [
        { id: 'stitched-a', assetId: 'fake-a', durationMs: 750 },
        { id: 'stitched-b', assetId: 'fake-b', durationMs: 750 }
      ], width: 160, height: 90, fps: 10 });
      result.stitchedExportKeepsTracksAndLiveReplaySeparate = stitched.durationMs === 1500 && stitched.blob.size > 0 &&
        stats.replayTracks.includes('stitched-a') && stats.replayTracks.includes('stitched-b') &&
        liveReplay.currentTimeMs === 321 && liveReplay.track.id === 'live-board-track' && stats.baseFilters.length >= 2 &&
        stats.baseFilters.some((f) => f.excluded.includes('stitched-a') && f.otherRetained) &&
        stats.baseFilters.some((f) => f.excluded.includes('stitched-b') && f.otherRetained);
      result._stitchedDebug = { durationMs: stitched.durationMs, blobSize: stitched.blob.size,
        replayTracks: stats.replayTracks, baseFilters: stats.baseFilters, liveTrack: liveReplay.track.id,
        liveTime: liveReplay.currentTimeMs };

      const beforeInvalid = stats.destroyed;
      let invalidMessage = '';
      try { await exporter.exportReplayVideo({ track: { id: 'invalid-duration', assetId: 'fake', durationMs: 0 }, width: 160, height: 90, fps: 10 }); }
      catch (e) { invalidMessage = e.message; }
      result.infiniteAudioDurationIsRejectedAndSurfaceDisposed = /Could not determine audio duration/.test(invalidMessage) && stats.destroyed === beforeInvalid + 1;

      stats.blockAudio = true;
      const beforeTimeout = stats.destroyed;
      let timeoutMessage = '';
      try { await exporter.exportReplayVideo({ track: { id: 'blocked-audio', assetId: 'fake', durationMs: 750 }, width: 160, height: 90, fps: 10 }); }
      catch (e) { timeoutMessage = e.message; }
      result.audioReadinessTimeoutDisposesSurface = /Audio load timeout/.test(timeoutMessage) && stats.destroyed === beforeTimeout + 1;

      result.mediaResourcesDisposed = afterSingleCleanup && stats.stoppedVideo >= 2 && stats.disconnectedSources >= 3 && stats.closedContexts >= 3;
    } finally {
      window.setTimeout = originalTimeout;
      window.clearTimeout = originalClearTimeout;
      restore(window, 'Audio', originals.Audio);
      restore(window, 'AudioContext', originals.AudioContext);
      restore(window, 'MediaRecorder', originals.MediaRecorder);
      restore(window, 'MediaStream', originals.MediaStream);
      restore(HTMLCanvasElement.prototype, 'captureStream', canvasCapture);
      proto.drawScene = old.drawScene;
      proto.drawReplaySession = old.drawReplaySession;
      proto.destroy = old.destroy;
      delete window.__featureAudio;
    }
  } catch (e) { result.exporterFeatureChecks = String(e && e.stack || e); }

  return result;
})()`;

async function run(win, app) {
  const checks = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    cropCancelRestoresOriginal: 'crop preview cancel restores the image and creates no undo entry',
    cropApplyIsOneUndoableChange: 'crop Apply is one change that undo and redo restore',
    cropResetIsOneUndoableChange: 'crop Reset is one change that undo restores',
    cropSourceRectStaysInsideImage: 'crop source rectangle is clamped to image bounds',
    exportUsesFiniteTrackDurationAndPrivateClock: 'single video export uses finite track duration and a private replay clock',
    stitchedExportKeepsTracksAndLiveReplaySeparate: 'stitched export replays each track without changing the live replay clock',
    infiniteAudioDurationIsRejectedAndSurfaceDisposed: 'infinite audio duration without track metadata fails cleanly',
    audioReadinessTimeoutDisposesSurface: 'audio readiness timeout is bounded and disposes its surface',
    mediaResourcesDisposed: 'export closes media sources, streams, audio contexts, and surfaces'
  };
  let passed = 0, failed = 0;
  const lines = [];
  for (const [key, label] of Object.entries(names)) {
    const value = checks[key] === true;
    value ? passed++ : failed++;
    const detail = value ? '' : ` — ${String(checks[key])}${checks._stitchedDebug && key === 'stitchedExportKeepsTracksAndLiveReplaySeparate' ? ` ${JSON.stringify(checks._stitchedDebug)}` : ''}`;
    const line = `${value ? 'PASS' : 'FAIL'}  ${label}${detail}`;
    lines.push(line);
    console.log(`${value ? '  ok  ' : ' FAIL '} ${label}${detail}`);
  }
  if (checks.exporterFeatureChecks) {
    failed++;
    lines.push(`FAIL  exporter harness — ${checks.exporterFeatureChecks}`);
    console.error(checks.exporterFeatureChecks);
  }
  const summary = `${passed} passed, ${failed} failed`;
  lines.push('', summary);
  console.log(`\n${summary}`);
  const out = path.join(__dirname, 'out', 'features-4.8.4.1-results.txt');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, lines.join('\n') + '\n');
  app.exit(failed ? 1 : 0);
}

module.exports = { run };
