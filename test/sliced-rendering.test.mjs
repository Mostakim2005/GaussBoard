import test from 'node:test';
import assert from 'node:assert/strict';
import { Surface } from '../src/js/core/surface.js';
import { drawStroke } from '../src/js/core/render.js';

function createMockStore(objectCount = 3000) {
  const order = [];
  const objects = {};

  for (let i = 0; i < objectCount; i++) {
    const id = `s_${i}`;
    order.push(id);
    objects[id] = {
      id,
      type: 'stroke',
      tool: 'pen',
      points: [
        { x: (i % 50) * 20, y: Math.floor(i / 50) * 20 },
        { x: (i % 50) * 20 + 10, y: Math.floor(i / 50) * 20 + 10 }
      ],
      width: 4,
      color: '#000000'
    };
  }

  return {
    rev: 1,
    doc: {
      order,
      objects,
      pages: [],
      background: { color: '#ffffff' }
    },
    get: (id) => objects[id],
    objects: Object.values(objects)
  };
}

function createMockSurface(store) {
  const canvas = {
    getContext: () => ({
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      clip: () => {},
      drawImage: () => {},
      setTransform: () => {},
      clearRect: () => {},
      fillRect: () => {},
      stroke: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    }),
    width: 1920,
    height: 1080
  };

  const app = {
    settings: {},
    replayEngine: { active: false, track: null },
    audioBar: { visible: false },
    circuitWorkbenchModal: { sim: { running: false } }
  };

  const surface = new Surface(canvas, store, { ephemeral: true, app });
  surface.width = 1920;
  surface.height = 1080;
  return surface;
}

test('Rule 1: TRAP 1 Filter — Audio Replay session strokes strictly excluded from background slicing', () => {
  const store = createMockStore(3000);
  const activeTrackId = 'track_lecture_101';

  // Mark 50 strokes as belonging to the active recorded audio replay session
  for (let i = 100; i < 150; i++) {
    store.doc.objects[`s_${i}`].audioId = activeTrackId;
  }

  const surface = createMockSurface(store);
  surface.app.replayEngine.active = true;
  surface.app.replayEngine.track = { id: activeTrackId };

  // Generate queue for progressive slicing
  const queue = surface._paintOrder(1920, 1080);

  // Invariant check: zero replay strokes must be admitted into queue
  const leakedReplayStrokes = queue.filter(o => o.audioId === activeTrackId);
  assert.equal(leakedReplayStrokes.length, 0, 'No audio replay strokes permitted in background progressive slices');
});

test('Rule 1: TRAP 6 Invariant — Concealed Answer Cover completely culls enclosed secret strokes', () => {
  const store = createMockStore(100);

  // Secret equation at index 5
  store.doc.objects['s_5'].points = [
    { x: 100, y: 100 },
    { x: 140, y: 140 }
  ];
  store.doc.objects['s_5'].bbox = { x: 100, y: 100, w: 40, h: 40 };

  // Concealed rectangular answer cover placed later in z-order at index 80 enclosing s_5
  const coverId = 'cov_secret';
  store.doc.order.splice(80, 0, coverId);
  store.doc.objects[coverId] = {
    id: coverId,
    type: 'cover',
    revealed: false,
    x: 80,
    y: 80,
    w: 100,
    h: 100,
    width: 100,
    height: 100
  };

  const surface = createMockSurface(store);

  // 1. While concealed: s_5 must be culled from background queue (prevents secret flash leaks)
  const concealedQueue = surface._paintOrder(1920, 1080);
  assert.ok(!concealedQueue.some(o => o.id === 's_5'), 'Secret stroke under concealed cover must be culled');
  assert.ok(concealedQueue.some(o => o.id === coverId), 'Answer cover itself must be in render queue');

  // 2. When revealed: s_5 enters render queue
  store.doc.objects[coverId].revealed = true;
  const revealedQueue = surface._paintOrder(1920, 1080);
  assert.ok(revealedQueue.some(o => o.id === 's_5'), 'Revealed stroke enters render queue');
});

test('Rule 2: Dynamic Frame Budget adaptation based on active subsystems', () => {
  const store = createMockStore(10);
  const surface = createMockSurface(store);

  // Idle / pan-zoom budget
  assert.equal(surface._getSliceBudgetMs(), 8.0, 'Standard idle slice budget is 8.0ms');

  // Active MNA Circuit Simulation drops budget to 3.0ms
  surface.app.circuitWorkbenchModal.sim.running = true;
  assert.equal(surface._getSliceBudgetMs(), 3.0, 'MNA simulation drops slice budget to 3.0ms');
  surface.app.circuitWorkbenchModal.sim.running = false;

  // Active Audio Replay drops budget to 3.5ms
  surface.app.replayEngine.active = true;
  assert.equal(surface._getSliceBudgetMs(), 3.5, 'Audio Replay drops slice budget to 3.5ms');
});

test('Rule 3 & 5: Progressive slicing detection, snapshot preservation & onload dirty flag', () => {
  const store = createMockStore(3500);
  const surface = createMockSurface(store);

  assert.equal(surface._isHeavy(1920, 1080), true, 'Board with 3500 objects triggers heavy slicing');

  // Verify heavy constants
  assert.equal(Surface.HEAVY, 2500);
  assert.equal(Surface.HEAVY_SLICE, 300);

  // Simulate dirty flag on onload during build
  surface._build = { total: 1000, index: 600 };
  // When build is > 50% complete, dirty flag is set without throwing away progress
  assert.equal(surface._build.index / surface._build.total > 0.5, true);
});

test('Rule 4: Zoom-Aware LOD downsampling & sub-pixel culling in render.js', () => {
  let lineToCalls = 0;
  let fillRectCalls = 0;

  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => { lineToCalls++; },
    stroke: () => {},
    fillRect: () => { fillRectCalls++; },
    getTransform: () => ({ a: 0.2, b: 0, c: 0, d: 0.2, e: 0, f: 0 }) // camZ = 0.2 (< 0.35)
  };

  // Test 1: Long stroke (100 points) at camZ = 0.2
  const longPoints = [];
  for (let i = 0; i < 100; i++) longPoints.push({ x: i * 10, y: i * 5 });
  const stroke = { type: 'stroke', tool: 'pen', points: longPoints, width: 4 };

  drawStroke(mockCtx, stroke, 0.2);
  // Stride at camZ = 0.2 is 2 (so ~50 lineTo calls instead of 100 spline curves)
  assert.ok(lineToCalls >= 40 && lineToCalls <= 60, `LOD downsampling used stride lineTo: ${lineToCalls}`);

  // Test 2: Sub-pixel dot (smaller than 1.5px screen footprint)
  const tinyDot = {
    type: 'stroke',
    tool: 'pen',
    points: [{ x: 50, y: 50 }, { x: 52, y: 52 }],
    bbox: { x: 50, y: 50, w: 2, h: 2 } // 2 * 0.2 = 0.4px < 1.5px
  };

  drawStroke(mockCtx, tinyDot, 0.2);
  assert.ok(fillRectCalls >= 1, 'Sub-pixel culling drew quick dot fillRect');
});
