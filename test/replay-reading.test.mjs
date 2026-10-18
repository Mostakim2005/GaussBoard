import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ReplayEngine } from '../src/js/core/replay.js';
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
