import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ReplayEngine } from '../src/js/core/replay.js';
import { Surface } from '../src/js/core/surface.js';
import { AudioRecorder } from '../src/js/core/audio-recorder.js';
import { audioInkClock, replayInkEnabled } from '../src/js/core/replay-clock.js';

class FakeAudio {
  constructor() {
    this.listeners = new Map();
    this.duration = Infinity;
    this.currentTime = 0;
    this.readyState = 0;
    this.paused = true;
    this.ended = false;
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  emit(name) { this.listeners.get(name)?.(); }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

test('replay keeps seeks made before metadata and enters read mode only after play succeeds', async () => {
  const previous = {
    Audio: globalThis.Audio,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame
  };
  globalThis.Audio = FakeAudio;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  try {
    let reading = false;
    const app = { setReadingMode: (value) => { reading = value; }, surface: { invalidate() {}, _ink: null } };
    const engine = new ReplayEngine(app);
    engine.loadTrack({ id: 'track-a', assetId: 'asset-a', durationMs: 8000 });
    engine.seek(2750);
    assert.equal(engine.audio.currentTime, 0);
    assert.equal(engine.pendingSeekMs, 2750);

    engine.audio.readyState = 1;
    // Chromium can report Infinity for a WebM recording even after metadata.
    engine.audio.duration = Infinity;
    engine.audio.emit('loadedmetadata');
    assert.equal(engine.audio.currentTime, 2.75);
    assert.equal(engine.pendingSeekMs, null);

    assert.equal(await engine.play(), true);
    assert.equal(engine.active, true);
    assert.equal(reading, true);
    engine.pause();
  } finally {
    if (previous.Audio === undefined) delete globalThis.Audio; else globalThis.Audio = previous.Audio;
    if (previous.requestAnimationFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    if (previous.cancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
  }
});

test('replay does not enter active state when the media play request rejects', async () => {
  const previousAudio = globalThis.Audio;
  const previousRaf = globalThis.requestAnimationFrame;
  globalThis.Audio = class extends FakeAudio { play() { return Promise.reject(new Error('blocked')); } };
  globalThis.requestAnimationFrame = () => 1;
  try {
    let reading = false;
    const engine = new ReplayEngine({ setReadingMode: (value) => { reading = value; }, surface: { invalidate() {}, _ink: null } });
    engine.loadTrack({ id: 'track-b', assetId: 'asset-b', durationMs: 1000 });
    await assert.rejects(engine.play(), /blocked/);
    assert.equal(engine.active, false);
    assert.equal(reading, false);
  } finally {
    if (previousAudio === undefined) delete globalThis.Audio; else globalThis.Audio = previousAudio;
    if (previousRaf === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previousRaf;
  }
});

test('recording chunks are written in order before the asset is finalized', async () => {
  const previous = {
    MediaRecorder: globalThis.MediaRecorder,
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    window: globalThis.window
  };
  const events = [];
  class FakeMediaRecorder {
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      const chunk = (value, delay) => ({
        size: 1,
        async arrayBuffer() {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return Uint8Array.of(value).buffer;
        }
      });
      this.ondataavailable({ data: chunk(1, 8) });
      this.ondataavailable({ data: chunk(2, 0) });
      queueMicrotask(() => this.onstop());
    }
  }
  globalThis.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } } });
  globalThis.window = { board: { recording: {
    async start() { events.push('start'); },
    async appendChunk(_id, bytes) { events.push(`chunk:${bytes[0]}`); },
    async finish() { events.push('finish'); return { assetId: 'asset-c' }; }
  } } };
  try {
    const recorder = new AudioRecorder();
    await recorder.start();
    const result = await recorder.stop();
    assert.equal(result.assetId, 'asset-c');
    assert.deepEqual(events, ['start', 'chunk:1', 'chunk:2', 'finish']);
  } finally {
    if (previous.MediaRecorder === undefined) delete globalThis.MediaRecorder; else globalThis.MediaRecorder = previous.MediaRecorder;
    if (previous.navigator) Object.defineProperty(globalThis, 'navigator', previous.navigator); else delete globalThis.navigator;
    if (previous.window === undefined) delete globalThis.window; else globalThis.window = previous.window;
  }
});

test('replay writing uses the replay clock and respects the audio-ink sync switch', () => {
  const app = {
    settings: { audioInkSync: true }, audioRecorder: { state: 'idle' },
    replayEngine: { active: true, currentTimeMs: 1400, track: { id: 'track-d' } }
  };
  assert.deepEqual(audioInkClock(app), { trackId: 'track-d', timeMs: 1400 });
  app.replayEngine.active = false;
  app.audioBar = { visible: true };
  assert.deepEqual(audioInkClock(app), { trackId: 'track-d', timeMs: 1400 });
  app.settings.audioInkSync = false;
  assert.equal(audioInkClock(app), null);
  app.audioRecorder = { state: 'recording', activeTrackId: 'recording-e', currentOffsetMs: () => 350 };
  assert.deepEqual(audioInkClock(app), { trackId: 'recording-e', timeMs: 350 });
});

test('sync setting is the single gate for replay ink rendering', () => {
  assert.equal(replayInkEnabled({ audioInkSync: false }), false);
  assert.equal(replayInkEnabled({ audioInkSync: true }), true);
  assert.equal(replayInkEnabled({}), true);
});

test('live replay camera-follow can be toggled without changing replay state', () => {
  const previous = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    let cancelled = 0;
    const engine = new ReplayEngine({
      settings: { replayCameraFollow: true },
      surface: { cam: { cancelGlide() { cancelled++; } }, invalidate() {} }
    });
    assert.equal(engine.autoFollow, true);
    engine.setCameraFollow(false);
    assert.equal(engine.autoFollow, false);
    assert.equal(cancelled, 1);
    engine.setCameraFollow(true);
    assert.equal(engine.autoFollow, true);
  } finally {
    if (previous === undefined) delete globalThis.Audio; else globalThis.Audio = previous;
  }
});

test('pending seek remains the replay clock source while media catches up', () => {
  const previous = {
    Audio: globalThis.Audio,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame
  };
  globalThis.Audio = FakeAudio;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const engine = new ReplayEngine({ surface: { invalidate() {}, _ink: null } });
    engine.loadTrack({ id: 'track-pending', assetId: 'asset-pending', durationMs: 5000 });
    engine.active = true;
    engine.audio.paused = false;
    engine.pendingSeekMs = 2400;
    engine.currentTimeMs = 2400;
    engine.loop();
    assert.equal(engine.currentTimeMs, 2400);
    engine.pause();
  } finally {
    if (previous.Audio === undefined) delete globalThis.Audio; else globalThis.Audio = previous.Audio;
    if (previous.requestAnimationFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    if (previous.cancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
  }
});

test('dead-zone camera stays still inside its frame and pans only at an edge', () => {
  const previous = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    const stroke = { id: 's1', audioId: 'track-zone', type: 'stroke', t0: 0, t1: 1000,
      bbox: { x: 200, y: 200, w: 220, h: 50 }, points: [{ x: 250, y: 250, t: 0 }, { x: 400, y: 250, t: 500 }] };
    const cam = { x: 0, y: 0, z: 1, toScreen(x, y) { return { x: x + this.x, y: y + this.y }; },
      panBy(dx, dy) { this.x += dx; this.y += dy; }, cancelGlide() {} };
    const engine = new ReplayEngine({ settings: { replayCameraFollow: true, replayCameraMode: 'dead-zone' },
      store: { doc: { order: ['s1'], objects: { s1: stroke } } },
      surface: { cam, width: 500, height: 500, invalidate() {} } });
    engine.track = { id: 'track-zone' };
    engine.currentTimeMs = 100;
    engine.followActiveStroke();
    assert.deepEqual({ x: cam.x, y: cam.y }, { x: 0, y: 0 });
    engine.currentTimeMs = 700;
    engine.followActiveStroke();
    assert.deepEqual({ x: cam.x, y: cam.y }, { x: -50, y: 0 });
  } finally {
    if (previous === undefined) delete globalThis.Audio; else globalThis.Audio = previous;
  }
});

test('live replay draws a visible source-over outline for highlighter strokes', () => {
  const previousPath2D = globalThis.Path2D;
  class FakePath2D { moveTo() {} lineTo() {} quadraticCurveTo() {} bezierCurveTo() {} }
  globalThis.Path2D = FakePath2D;
  const commands = [];
  const state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  const ctx = {
    save() { stack.push({ ...state, strokeStyle: this.strokeStyle, shadowColor: this.shadowColor, shadowBlur: this.shadowBlur }); },
    restore() { Object.assign(state, stack.pop()); this.globalAlpha = state.globalAlpha; this.globalCompositeOperation = state.globalCompositeOperation; },
    setTransform() {}, stroke(path) { commands.push({ style: this.strokeStyle, blend: this.globalCompositeOperation, width: this.lineWidth, path }); },
    beginPath() {}, arc() {}, fill() {}, closePath() {},
    set globalAlpha(value) { state.globalAlpha = value; }, get globalAlpha() { return state.globalAlpha; },
    set globalCompositeOperation(value) { state.globalCompositeOperation = value; }, get globalCompositeOperation() { return state.globalCompositeOperation; }
  };
  try {
    const stroke = { id: 'highlight', type: 'stroke', tool: 'highlighter', audioId: 'track-highlight',
      t0: 0, t1: 100, width: 8, opacity: 0.5, color: '#ffee00',
      points: [{ x: 10, y: 10, p: 0.5, t: 0 }, { x: 20, y: 10, p: 0.5, t: 100 }] };
    const surface = Object.create(Surface.prototype);
    surface.app = { settings: { audioInkSync: true, replayOutlineColor: '#00e5ff', replayOutlineEffect: 'neon' } };
    surface.store = { doc: { objects: { highlight: stroke }, order: ['highlight'] } };
    surface.cam = { x: 0, y: 0, z: 1 };
    surface.dpr = 1;
    surface.editing = null;
    surface.invalidate = () => {};
    surface.drawReplaySession(ctx, { track: { id: 'track-highlight' }, currentTimeMs: 50, ghostMode: 'none' });
    assert.ok(commands.some((command) => command.style === '#00e5ff' && command.blend === 'source-over'),
      'the replay outline should be drawn in visible source-over mode');
  } finally {
    if (previousPath2D === undefined) delete globalThis.Path2D; else globalThis.Path2D = previousPath2D;
  }
});

test('Reading mode routes pointer input to pan and bypasses object-edit dispatch', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }), documentElement: { dataset: {} } };
  try {
    const { Interaction } = await import('../src/js/core/tools.js');
    const interaction = Object.create(Interaction.prototype);
    interaction.canvas = { setPointerCapture() {} };
    interaction.surface = {
      cam: { x: 12, y: 18, cancelGlide() {}, toWorld: (x, y) => ({ x, y }) },
      screenPoint: (event) => ({ x: event.clientX, y: event.clientY })
    };
    interaction.app = { readingMode: true, settings: {}, hideMenus: () => false, notePenSeen() {} };
    interaction.pointers = new Map();
    interaction.action = null;
    interaction.actionId = null;
    interaction.pinch = null;
    interaction.secondaryPan = null;
    interaction.onDown({ pointerId: 1, pointerType: 'pen', button: 0, buttons: 1, clientX: 30, clientY: 40 });
    assert.equal(interaction.action.type, 'pan');
    assert.equal(interaction.action.reading, true);
    assert.equal(interaction.action.cam.x, 12);
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});
