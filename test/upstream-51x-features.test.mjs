import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PEN_EFFECTS, NEON_COLORS, penIcon } from '../src/js/ui/palettes.js';
import { pickPenInk } from '../src/js/ui/toolbar.js';
import { drawStroke, NEON_REACH, setDarkBoard } from '../src/js/core/render.js';
import { Store, boundsOf } from '../src/js/core/store.js';
import { hitObject, outlineAlong } from '../src/js/core/hit.js';
import { Surface } from '../src/js/core/surface.js';
import { Interaction } from '../src/js/core/tools.js';
import { buildSvg } from '../src/js/export.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

class FakePath2D {
  constructor() { this.ops = []; }
  moveTo(x, y) { this.ops.push(['M', x, y]); }
  lineTo(x, y) { this.ops.push(['L', x, y]); }
  quadraticCurveTo(cx, cy, x, y) { this.ops.push(['Q', cx, cy, x, y]); }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { this.ops.push(['C', c1x, c1y, c2x, c2y, x, y]); }
}

function makeRecorderCtx(camZ = 1) {
  const ops = [];
  return {
    ops,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeStyle: '#000',
    fillStyle: '#000',
    shadowColor: 'transparent',
    shadowBlur: 0,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    save() { ops.push({ op: 'save' }); },
    restore() { ops.push({ op: 'restore' }); },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    rect() {},
    clip() {},
    setLineDash() {},
    getTransform() { return { a: camZ, b: 0, c: 0, d: camZ, e: 0, f: 0 }; },
    measureText(s) { return { width: String(s || '').length * 8 }; },
    createLinearGradient() {
      const stops = [];
      return { addColorStop(t, c) { stops.push([t, c]); }, stops };
    },
    stroke(path) {
      ops.push({
        op: 'stroke',
        pathOps: path?.ops ? [...path.ops] : [],
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
        shadowColor: this.shadowColor,
        shadowBlur: this.shadowBlur,
        globalAlpha: this.globalAlpha
      });
    },
    fillRect(x, y, w, h) {
      ops.push({ op: 'fillRect', fillStyle: this.fillStyle, x, y, w, h });
    }
  };
}

function createHarness(settingsOverrides = {}) {
  const store = new Store();
  const listeners = new Map();
  const glowStyle = { transform: '' };
  const penGlowEl = { id: 'penGlow', hidden: true, style: glowStyle };
  const nibEl = { id: 'inkNib', hidden: true, style: { transform: '', backgroundImage: '' } };
  const createdChildren = [];

  const parentElement = {
    querySelector: () => null,
    appendChild: (el) => { createdChildren.push(el); }
  };

  const canvas = {
    id: 'c',
    style: {},
    parentElement,
    width: 1200,
    height: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    getContext: () => makeRecorderCtx(1),
    addEventListener: (name, fn) => {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
    removeEventListener: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  };

  const settings = {
    penColor: '#b026ff',
    penWidth: 6,
    penEffect: 'neon',
    eraserSize: 30,
    eraserMode: 'partial',
    eraseShapes: false,
    recordPointer: false,
    drawAhead: false,
    inkToShape: false,
    holdToShape: true,
    pressure: true,
    penHold: true,
    penButtonErases: true,
    ...settingsOverrides
  };

  const app = {
    tool: 'pen',
    settings,
    viewMode: false,
    readingMode: false,
    stylusKnown: false,
    mouseInks: true,
    fingerInks: true,
    ruler: { visible: false, snap: true },
    surface: null,
    store,
    audioRecorder: null,
    replayEngine: null,
    saveSettings() {},
    commitTextEdit() {},
    hideMenus() { return false; },
    setSelection() {},
    pruneSelection() {},
    notePenSeen() { app.stylusKnown = true; },
    toast() {},
    syncUI() {},
    syncZoom() {},
    showHint() {},
    openRulerMenu() {},
    showContextMenu() {},
    showRadial() {}
  };

  const surface = new Surface(canvas, store, { ephemeral: true, app });
  surface.width = 1200;
  surface.height = 800;
  surface.cam.x = 0;
  surface.cam.y = 0;
  surface.cam.z = 1;
  app.surface = surface;

  const interaction = new Interaction(app, {
    inkNib: nibEl,
    penGlow: penGlowEl
  });

  return { app, store, surface, interaction, canvas, listeners, penGlowEl, createdChildren };
}

test('1. Neon pen: palettes, icon, bounds vs hit, rendering, Zoom LOD, SVG export, and shape exclusion', () => {
  assert.ok(PEN_EFFECTS.some((e) => e.id === 'neon'), 'PEN_EFFECTS includes neon');
  assert.equal(NEON_COLORS[0], '#b026ff', 'NEON_COLORS starts with neon purple');
  assert.equal(NEON_COLORS.length, 8);
  const svgIcon = penIcon('#b026ff', 'neon', 'pen');
  assert.ok(svgIcon.includes('feGaussianBlur'), 'penIcon renders neon glow filter');

  // pickPenInk keeps neon effect when recolouring
  const mockApp = { settings: { penColor: '#b026ff', penEffect: 'neon' }, saveSettings() {}, syncUI() {} };
  pickPenInk(mockApp, '#00e5ff');
  assert.equal(mockApp.settings.penEffect, 'neon');
  assert.equal(mockApp.settings.penColor, '#00e5ff');

  const neonStroke = {
    id: 'n1',
    type: 'stroke',
    tool: 'pen',
    color: '#b026ff',
    width: 6,
    effect: 'neon',
    opacity: 0.9,
    rotation: 0,
    points: [
      { x: 20, y: 50, p: 0.5, t: 100 },
      { x: 100, y: 50, p: 0.5, t: 140 },
      { x: 180, y: 50, p: 0.5, t: 180 }
    ],
    bbox: { x: 20, y: 50, w: 160, h: 0 }
  };
  const plainStroke = { ...neonStroke, id: 'p1', effect: 'none' };

  const nb = boundsOf(neonStroke);
  const pb = boundsOf(plainStroke);
  assert.equal(nb.h, pb.h + 6 * NEON_REACH * 2, 'boundsOf pads for neon glow reach');
  assert.equal(hitObject(neonStroke, { x: 100, y: 51 }, 2), true, 'core line is hit');
  assert.equal(hitObject(neonStroke, { x: 100, y: 65 }, 2), false, 'outer glow alone is not hit');

  const prevPath2D = globalThis.Path2D;
  globalThis.Path2D = FakePath2D;
  try {
    // Rendering at 1x on dark and light boards
    setDarkBoard(true);
    const darkCtx = makeRecorderCtx(1);
    drawStroke(darkCtx, neonStroke, 1);
    const darkStrokes = darkCtx.ops.filter((o) => o.op === 'stroke');
    assert.equal(darkStrokes.length, 3, 'dark board draws double halo + core');
    assert.ok(darkStrokes[0].shadowBlur > 0);
    assert.equal(darkStrokes[2].shadowBlur, 0);

    setDarkBoard(false);
    const lightCtx = makeRecorderCtx(1);
    drawStroke(lightCtx, neonStroke, 1);
    const lightStrokes = lightCtx.ops.filter((o) => o.op === 'stroke');
    assert.equal(lightStrokes.length, 2, 'light board draws single halo + core');
    assert.ok(lightStrokes[0].shadowBlur > 0);
    assert.equal(lightStrokes[1].shadowBlur, 0);
  } finally {
    if (prevPath2D === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = prevPath2D;
  }

  // Zoom-Aware LOD (< 0.35): neon stroke keeps solid ink color, never rainbow/galaxy gradient
  const lodPoints = Array.from({ length: 40 }, (_, i) => ({ x: i * 5, y: 50, p: 0.5 }));
  const lodNeon = { ...neonStroke, points: lodPoints, bbox: { x: 0, y: 50, w: 195, h: 0 } };
  const lodCtx = makeRecorderCtx(0.2);
  drawStroke(lodCtx, lodNeon, 0.2);
  const lodStrokeOp = lodCtx.ops.find((o) => o.op === 'stroke');
  assert.equal(lodStrokeOp.strokeStyle, '#b026ff', 'Zoom LOD preserves solid neon color');

  // SVG export keeps <filter id="gbneon...">
  const prevDoc = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => makeRecorderCtx(1) }) };
  let svg;
  try {
    const { store, app } = createHarness();
    store.add(neonStroke, 'test');
    svg = buildSvg(app, { x: 0, y: 0, w: 220, h: 120 });
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
  assert.match(svg, /<filter id="gbneon\d+"/, 'SVG export includes neon blur filter');
  assert.match(svg, /filter="url\(#gbneon\d+\)"/, 'SVG export applies neon filter');

  // Neon circle does NOT snap into shape even when inkToShape or holdToShape is enabled
  const { interaction, store: s2, app: a2 } = createHarness({
    penEffect: 'neon',
    penColor: '#b026ff',
    inkToShape: true,
    holdToShape: true
  });
  const circPts = [];
  for (let i = 0; i <= 32; i++) {
    const ang = (i / 32) * Math.PI * 2;
    circPts.push({ x: 300 + Math.cos(ang) * 70, y: 300 + Math.sin(ang) * 70, p: 0.5, t: 200 + i * 10 });
  }
  const act = {
    type: 'draw',
    tool: 'pen',
    obj: { id: 'neon_circ', type: 'stroke', tool: 'pen', color: '#b026ff', width: 6, effect: 'neon', points: circPts }
  };
  interaction.action = act;
  interaction.armShapeHold(act, circPts[circPts.length - 1]);
  assert.equal(interaction._shapeHoldTimer || null, null, 'holdToShape does not arm for neon strokes');
  interaction.finishStroke(act);
  assert.equal(s2.objects.length, 1);
  assert.equal(s2.objects[0].type, 'stroke');
  assert.equal(s2.objects[0].effect, 'neon');
  assert.equal(s2.objects[0].points[0].t, 200, 'TRAP 2: p.t timestamps preserved on neon stroke');
  assert.equal(a2.settings.eraseShapes, false);
});

test('2. Erase shapes toggle: off by default, erases bare outlines when enabled, respects text & TRAP 6 covers', () => {
  const defaultAppJs = fs.readFileSync(path.join(ROOT, 'src/js/app.js'), 'utf8');
  assert.match(defaultAppJs, /eraseShapes:\s*false/, 'DEFAULT_SETTINGS sets eraseShapes: false');

  const prevDoc = globalThis.document;
  const mockCtx = {
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    save() {},
    restore() {},
    beginPath() {},
    rect(x, y, w, h) { this._shape = { kind: 'rect', x, y, w, h }; },
    roundRect(x, y, w, h) { this._shape = { kind: 'rect', x, y, w, h }; },
    moveTo() {},
    lineTo() {},
    closePath() {},
    ellipse() {},
    arc() {},
    isPointInPath(x, y) {
      const s = this._shape;
      return !!s && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
    },
    isPointInStroke(x, y) {
      const s = this._shape;
      if (!s) return false;
      const half = this.lineWidth / 2;
      const nearX = (vx) => Math.abs(x - vx) <= half && y >= s.y - half && y <= s.y + s.h + half;
      const nearY = (vy) => Math.abs(y - vy) <= half && x >= s.x - half && x <= s.x + s.w + half;
      return nearX(s.x) || nearX(s.x + s.w) || nearY(s.y) || nearY(s.y + s.h);
    }
  };
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? { getContext: () => mockCtx } : { style: {} })
  };

  try {
    const bareBox = { id: 'sh_bare', type: 'shape', kind: 'rect', x: 100, y: 100, w: 120, h: 80, lineWidth: 3, rotation: 0 };
    const textBox = { id: 'sh_text', type: 'shape', kind: 'rect', x: 300, y: 100, w: 120, h: 80, text: 'Keep me', lineWidth: 3, rotation: 0 };
    const lockedBox = { id: 'sh_lock', type: 'shape', kind: 'rect', x: 500, y: 100, w: 120, h: 80, locked: true, lineWidth: 3, rotation: 0 };
    const secretBox = { id: 'sh_secret', type: 'shape', kind: 'rect', x: 700, y: 100, w: 100, h: 80, lineWidth: 3, rotation: 0 };
    const coverCurtain = { id: 'cv_1', type: 'curtain', x: 690, y: 90, w: 120, h: 100, revealed: false };

    // Inside bareBox must not trigger outlineAlong
    assert.equal(outlineAlong(bareBox, { x: 150, y: 140 }, { x: 170, y: 140 }, 10), false, 'Interior scrub ignores shape outline');
    assert.equal(outlineAlong(bareBox, { x: 95, y: 120 }, { x: 110, y: 120 }, 10), true, 'Crossing outline triggers outlineAlong');

    const { app, store, surface, interaction } = createHarness({ eraseShapes: false });
    const bands = [];
    surface.invalidateBand = (b) => bands.push(b);

    store.add(structuredClone(bareBox), 's');
    store.add(structuredClone(textBox), 's');
    store.add(structuredClone(lockedBox), 's');
    store.add(structuredClone(secretBox), 's');
    store.add(structuredClone(coverCurtain), 's');

    // Off by default: crossing bareBox outline leaves it intact
    app.tool = 'eraser';
    interaction.startErase({ x: 95, y: 120 });
    interaction.eraseSweep(interaction.action, { x: 95, y: 120 }, { x: 110, y: 120 });
    interaction.finishErase(interaction.action);
    assert.ok(store.get('sh_bare'), 'eraseShapes=false leaves bare shape intact');

    // Enabled: erases bareBox outline, leaves textBox / lockedBox / covered secretBox, expands band, supports undo
    app.settings.eraseShapes = true;
    bands.length = 0;
    interaction.startErase({ x: 95, y: 120 });
    interaction.eraseSweep(interaction.action, { x: 95, y: 120 }, { x: 110, y: 120 });
    interaction.eraseSweep(interaction.action, { x: 295, y: 120 }, { x: 310, y: 120 }); // textBox
    interaction.eraseSweep(interaction.action, { x: 495, y: 120 }, { x: 510, y: 120 }); // lockedBox
    interaction.eraseSweep(interaction.action, { x: 695, y: 120 }, { x: 710, y: 120 }); // concealed under cover
    interaction.finishErase(interaction.action);

    assert.equal(store.get('sh_bare'), undefined, 'eraseShapes=true removes bare shape when outline crossed');
    assert.ok(store.get('sh_text'), 'Shapes with text are never erased');
    assert.ok(store.get('sh_lock'), 'Locked shapes are never erased');
    assert.ok(store.get('sh_secret'), 'TRAP 6: Shapes under concealed answer cover are never erased');
    assert.ok(bands.some((b) => b.w >= 120 && b.h >= 80), 'invalidateBand covers the full erased shape bounding box');

    store.undo();
    assert.ok(store.get('sh_bare'), 'Undo restores erased shape');
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});

test('3. Pen glow: tracks hovering/writing pen, hides for eraser/leave/blur/destroy, isolates split pane', () => {
  const defaultAppJs = fs.readFileSync(path.join(ROOT, 'src/js/app.js'), 'utf8');
  assert.match(defaultAppJs, /recordPointer:\s*false/, 'DEFAULT_SETTINGS sets recordPointer: false');

  const { app, interaction, listeners, penGlowEl } = createHarness({ recordPointer: false });

  // Off by default
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 200, clientY: 210, buttons: 0 });
  assert.equal(penGlowEl.hidden, true, 'Pen glow remains hidden when recordPointer is false');

  // On: shows and tracks on move and pointerrawupdate
  app.settings.recordPointer = true;
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 220, clientY: 210, buttons: 0 });
  assert.equal(penGlowEl.hidden, false);
  assert.equal(penGlowEl.style.transform, 'translate3d(220px,210px,0)');

  for (const fn of listeners.get('pointerrawupdate') || []) {
    fn({ pointerId: 1, pointerType: 'pen', clientX: 305, clientY: 412, buttons: 1 });
  }
  assert.equal(penGlowEl.style.transform, 'translate3d(305px,412px,0)');

  // Pen tail eraser (buttons & 32) hides glow
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 310, clientY: 415, buttons: 32 });
  assert.equal(penGlowEl.hidden, true, 'Pen tail eraser hides pen glow');

  // Re-appears on normal pen hover, hides on S-Pen barrel button erase (buttons & 2)
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 320, clientY: 420, buttons: 0 });
  assert.equal(penGlowEl.hidden, false);
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 325, clientY: 425, buttons: 2 });
  assert.equal(penGlowEl.hidden, true, 'Barrel button eraser hides pen glow');

  // Re-appears, then hides on eraser tool
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 330, clientY: 430, buttons: 0 });
  assert.equal(penGlowEl.hidden, false);
  app.tool = 'eraser';
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 335, clientY: 435, buttons: 0 });
  assert.equal(penGlowEl.hidden, true, 'Eraser tool hides pen glow');

  // Pointer leave & window blur hide glow
  app.tool = 'pen';
  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 150, clientY: 160, buttons: 0 });
  assert.equal(penGlowEl.hidden, false);
  for (const fn of listeners.get('pointerleave') || []) {
    fn({ pointerType: 'pen' });
  }
  assert.equal(penGlowEl.hidden, true, 'pointerleave hides pen glow');

  interaction.onMove({ pointerId: 1, pointerType: 'pen', clientX: 150, clientY: 160, buttons: 0 });
  assert.equal(penGlowEl.hidden, false);
  interaction.finishOnWindowBlur();
  assert.equal(penGlowEl.hidden, true, 'finishOnWindowBlur hides pen glow');

  // Split Workspace secondary canvas allocates its own .pen-glow inside its parent without touching main #penGlow
  const prevDoc = globalThis.document;
  let removed = false;
  const splitParent = {
    querySelector: () => null,
    appendChild() {}
  };
  globalThis.document = {
    getElementById: (id) => (id === 'penGlow' ? penGlowEl : null),
    createElement: () => ({
      className: '',
      hidden: true,
      style: { transform: '' },
      parentNode: splitParent,
      remove() { removed = true; }
    })
  };
  try {
    const leftCanvas = {
      id: 'splitLeftCanvas',
      style: {},
      parentElement: splitParent,
      addEventListener() {},
      removeEventListener() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 800 })
    };
    const leftSurface = {
      canvas: leftCanvas,
      cam: { x: 0, y: 0, z: 1, toWorld: (x, y) => ({ x, y }), toScreen: (x, y) => ({ x, y }) },
      selection: new Set(),
      overlays: [],
      invalidate() {},
      screenPoint: (e) => ({ x: e.clientX, y: e.clientY })
    };
    const leftInteraction = new Interaction(
      { ...app, surface: leftSurface },
      { surface: leftSurface, canvas: leftCanvas }
    );
    leftInteraction.onMove({ pointerId: 9, pointerType: 'pen', clientX: 90, clientY: 80, buttons: 0 });
    assert.ok(leftInteraction._glowEl && leftInteraction._glowEl !== penGlowEl, 'Split pane creates isolated glow layer');
    assert.equal(leftInteraction._glowEl.className, 'pen-glow');
    assert.equal(leftInteraction._glowEl.hidden, false);
    assert.equal(penGlowEl.hidden, true, 'Main #penGlow remains untouched by split pane');
    leftInteraction.destroy();
    assert.equal(removed, true, 'Owned split-pane glow element cleans up on destroy');
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});

test('4. Draw-ahead prediction: clamped ephemeral tail, corner/ruler/tape guards, zero saved pollution, TRAP 2 intact', () => {
  const defaultAppJs = fs.readFileSync(path.join(ROOT, 'src/js/app.js'), 'utf8');
  assert.match(defaultAppJs, /drawAhead:\s*false/, 'DEFAULT_SETTINGS sets drawAhead: false');

  const { app, store, surface, interaction } = createHarness({ drawAhead: false });
  const basePts = [
    { x: 100, y: 200, p: 0.5, t: 10 },
    { x: 110, y: 200, p: 0.5, t: 20 },
    { x: 120, y: 200, p: 0.5, t: 30 }
  ];
  const drawAct = {
    type: 'draw',
    obj: { id: 's_pred', type: 'stroke', tool: 'pen', color: '#201f1e', width: 4, effect: 'none', points: basePts }
  };
  const mkPredEvent = (coords) => ({
    getPredictedEvents: () => coords.map(([x, y]) => ({ clientX: x, clientY: y }))
  });

  // Off by default
  assert.equal(interaction.predictTail(mkPredEvent([[126, 200]]), drawAct), null);

  // Enabled: clamps beyond PREDICT_REACH (18px @ 1x)
  app.settings.drawAhead = true;
  const tail = interaction.predictTail(mkPredEvent([[128, 200], [160, 200]]), drawAct);
  assert.ok(tail && tail.points.length === 2);
  assert.equal(tail.points[1].x, 120 + Interaction.PREDICT_REACH, 'Overshooting prediction clamped to PREDICT_REACH');
  assert.equal(tail.points[0].t, undefined, 'Predicted points carry no fake timestamps');

  // Corner rejection (cos < 0.85)
  const sharpTurn = interaction.predictTail(mkPredEvent([[120, 212]]), drawAct);
  assert.equal(sharpTurn, null, 'Sharp corner prediction is rejected to avoid blunting');

  // Ruled stroke & Study Tape curtain rejection
  assert.equal(interaction.predictTail(mkPredEvent([[126, 200]]), { ...drawAct, ruled: true }), null);
  const tapeAct = {
    type: 'draw',
    obj: { id: 'cv_tape', type: 'curtain', subtype: 'tape', tool: 'tape', points: basePts }
  };
  assert.equal(interaction.predictTail(mkPredEvent([[126, 200]]), tapeAct), null);

  // Surface._drawWet renders predicted tail on ephemeral copy without mutating wet.points
  const prevPath2D = globalThis.Path2D;
  globalThis.Path2D = FakePath2D;
  try {
    surface.wet = drawAct.obj;
    surface.wetTail = tail;
    const mockWetCtx = makeRecorderCtx(1);
    mockWetCtx.setTransform = () => {};
    surface._drawWet(mockWetCtx);
    assert.equal(drawAct.obj.points.length, 3, 'wet.points not mutated by _drawWet');
    const wetStrokeOp = mockWetCtx.ops.find((o) => o.op === 'stroke');
    assert.ok(wetStrokeOp, 'ephemeral tail stroke was rendered in _drawWet');
    const lastOp = wetStrokeOp.pathOps[wetStrokeOp.pathOps.length - 1];
    assert.equal(lastOp[lastOp.length - 2], 120 + Interaction.PREDICT_REACH, 'rendered path extends to predicted tip');
  } finally {
    if (prevPath2D === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = prevPath2D;
  }

  // finishStroke clears wetTail and saves zero predicted points while preserving p.t
  interaction.action = drawAct;
  interaction.finishStroke(drawAct);
  assert.equal(surface.wet, null);
  assert.equal(surface.wetTail, null, 'finishStroke clears surface.wetTail');
  const saved = store.get('s_pred');
  assert.equal(saved.points.length, 3, 'Only real points saved to Store');
  assert.deepEqual(saved.points.map((p) => p.t), [10, 20, 30], 'TRAP 2: real p.t timestamps intact');
});
