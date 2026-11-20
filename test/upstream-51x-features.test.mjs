import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PEN_EFFECTS, NEON_COLORS, penIcon } from '../src/js/ui/palettes.js';
import { pickPenInk } from '../src/js/ui/toolbar.js';
import { drawStroke, drawImage, NEON_REACH, setDarkBoard, setPaintBand, bandStats } from '../src/js/core/render.js';
import { Store, boundsOf } from '../src/js/core/store.js';
import { hitObject, outlineAlong } from '../src/js/core/hit.js';
import { Surface } from '../src/js/core/surface.js';
import { Interaction } from '../src/js/core/tools.js';
import { buildSettingsSearch } from '../src/js/ui/panels.js';
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
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {},
    fill() {},
    rect() {},
    clip() {},
    setLineDash() {},
    setTransform() {},
    strokeRect() {},
    fillText() {},
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
      ops.push({
        op: 'fillRect',
        fillStyle: this.fillStyle,
        shadowBlur: this.shadowBlur,
        shadowColor: this.shadowColor,
        x, y, w, h
      });
    }
  };
}

function createHarness(settingsOverrides = {}) {
  const store = new Store();
  const listeners = new Map();
  const glowStyle = { transform: '' };
  const penGlowEl = { id: 'penGlow', hidden: true, style: glowStyle };
  const eraserRingEl = { id: 'eraserRing', hidden: true, style: { transform: '', width: '', height: '' } };
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
    penGlow: penGlowEl,
    eraserRing: eraserRingEl
  });

  return { app, store, surface, interaction, canvas, listeners, penGlowEl, eraserRingEl, createdChildren };
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

function createMiniDom() {
  class MiniNode {
    constructor(nodeType) {
      this.nodeType = nodeType;
      this.parentNode = null;
      this.childNodes = [];
    }
    get parentElement() {
      return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
    }
  }
  class MiniText extends MiniNode {
    constructor(text) { super(3); this.nodeValue = String(text); }
    get textContent() { return this.nodeValue; }
    set textContent(v) { this.nodeValue = String(v); }
  }
  class MiniFrag extends MiniNode {
    constructor() { super(11); }
    append(...items) {
      for (const item of items) {
        const node = typeof item === 'string' ? new MiniText(item) : item;
        if (node) { node.parentNode = this; this.childNodes.push(node); }
      }
    }
  }
  class MiniElement extends MiniNode {
    constructor(tag) {
      super(1);
      this.tagName = tag.toUpperCase();
      this.attributes = Object.create(null);
      this.className = '';
      this.hidden = false;
      this.value = '';
      this.style = {};
      this._listeners = new Map();
    }
    get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
    get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
    set textContent(v) {
      this.childNodes = [];
      if (v !== '' && v != null) this.appendChild(new MiniText(String(v)));
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
      if (k === 'hidden') this.hidden = true;
      if (k === 'value') this.value = String(v);
      if (k === 'class') this.className = String(v);
    }
    getAttribute(k) { return this.attributes[k]; }
    appendChild(child) {
      if (child.nodeType === 11) {
        for (const c of [...child.childNodes]) this.appendChild(c);
        return child;
      }
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }
    replaceChild(newChild, oldChild) {
      const idx = this.childNodes.indexOf(oldChild);
      if (idx === -1) return oldChild;
      oldChild.parentNode = null;
      if (newChild.nodeType === 11) {
        const items = [...newChild.childNodes];
        for (const it of items) it.parentNode = this;
        this.childNodes.splice(idx, 1, ...items);
      } else {
        newChild.parentNode = this;
        this.childNodes.splice(idx, 1, newChild);
      }
      return oldChild;
    }
    normalize() {
      const merged = [];
      for (const c of this.childNodes) {
        if (c.nodeType === 3) {
          if (!c.nodeValue) { c.parentNode = null; continue; }
          const prev = merged[merged.length - 1];
          if (prev && prev.nodeType === 3) {
            prev.nodeValue += c.nodeValue;
            c.parentNode = null;
            continue;
          }
        }
        merged.push(c);
      }
      this.childNodes = merged;
    }
    addEventListener(name, fn) {
      if (!this._listeners.has(name)) this._listeners.set(name, []);
      this._listeners.get(name).push(fn);
    }
    dispatchEvent(e) {
      for (const fn of this._listeners.get(e.type) || []) fn(e);
      return true;
    }
    closest(selectorList) {
      const parts = selectorList.split(',').map((s) => s.trim());
      let cur = this;
      while (cur && cur.nodeType === 1) {
        for (const p of parts) {
          if (p === '[hidden]' && cur.hidden) return cur;
          if (cur.tagName.toLowerCase() === p.toLowerCase()) return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    }
    querySelectorAll(sel) {
      if (sel === ':scope > .section') {
        return this.children.filter((c) => c.className.split(/\s+/).includes('section'));
      }
      if (sel === ':scope > h5') {
        return this.children.filter((c) => c.tagName === 'H5');
      }
      if (sel === 'mark.set-mark') {
        const out = [];
        const walk = (node) => {
          for (const c of node.children) {
            if (c.tagName === 'MARK' && c.className.split(/\s+/).includes('set-mark')) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      }
      return [];
    }
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    }
  }

  return {
    createElement: (tag) => new MiniElement(tag),
    createTextNode: (t) => new MiniText(t),
    createDocumentFragment: () => new MiniFrag(),
    createTreeWalker(root, _what, filter) {
      const flat = [];
      const walk = (node) => {
        for (const c of [...node.childNodes]) {
          if (c.nodeType === 3) {
            if (!filter || filter.acceptNode(c) === 1) flat.push(c);
          } else if (c.nodeType === 1) {
            walk(c);
          }
        }
      };
      walk(root);
      let idx = -1;
      return {
        currentNode: null,
        nextNode() {
          idx++;
          if (idx >= flat.length) return false;
          this.currentNode = flat[idx];
          return true;
        }
      };
    }
  };
}

test('5. Settings search: word-start, section headings, mark highlights, Escape reset, rerender persistence, CSS/App wiring', () => {
  const prevDoc = globalThis.document;
  const prevNodeFilter = globalThis.NodeFilter;
  const miniDoc = createMiniDom();
  globalThis.document = miniDoc;
  globalThis.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };

  try {
    const mkEl = (tag, attrs = {}, ...kids) => {
      const el = miniDoc.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      for (const kid of kids) el.appendChild(typeof kid === 'string' ? miniDoc.createTextNode(kid) : kid);
      return el;
    };

    const chk = mkEl('input', { type: 'checkbox' });
    const themeRow = mkEl('div', { class: 'setting-row set-row' },
      mkEl('span', {}, 'Theme'), mkEl('span', {}, 'Light or dark surface'));
    const folderRow = mkEl('div', { class: 'setting-row set-row' },
      mkEl('span', {}, 'Boards folder'), mkEl('button', {}, 'Open folder'));
    const cjkRow = mkEl('div', { class: 'setting-row set-row' },
      mkEl('span', {}, '笔尖设置'), mkEl('span', {}, '中文界面说明'));
    const secApp = mkEl('div', { class: 'section' }, mkEl('h5', {}, 'Appearance'), themeRow, folderRow, cjkRow);

    const aheadRow = mkEl('div', { class: 'setting-row set-row' },
      mkEl('span', {}, 'Draw ahead of the pen'), chk, mkEl('div', {}, 'Short guess past the nib'));
    const pressureRow = mkEl('div', { class: 'setting-row set-row' },
      mkEl('span', {}, 'Pressure sensitivity'), mkEl('div', {}, 'Vary ink width'));
    const scribbleCard = mkEl('div', { class: 'scribble-config-card' },
      mkEl('span', {}, 'Gesture scratch-out eraser'));
    const secInk = mkEl('div', { class: 'section' }, mkEl('h5', {}, 'Inking'), aheadRow, pressureRow, scribbleCard);

    const page = mkEl('div', {}, secApp, secInk);

    let words = '';
    const search = buildSettingsSearch(page, {
      getWords: () => words,
      setWords: (v) => { words = v; }
    });

    const type = (val) => {
      search.input.value = val;
      search.input.dispatchEvent({ type: 'input' });
    };

    // Word-start matching: "pen" matches "Draw ahead of the pen", NOT "Open folder"
    type('pen');
    assert.equal(aheadRow.hidden, false, '"pen" shows pen row');
    assert.equal(folderRow.hidden, true, '"pen" does NOT falsely match "Open folder"');
    assert.equal(themeRow.hidden, true);
    assert.equal(search.none.hidden, true);
    assert.ok(page.querySelectorAll('mark.set-mark').some((m) => m.textContent.toLowerCase() === 'pen'), 'Highlights matching word with mark.set-mark');
    assert.equal(aheadRow.children[1], chk, 'Interactive toggle element preserved in-place');

    // Multi-word order-independent matching + GaussBoard custom scribble card
    type('pen ahead');
    assert.equal(aheadRow.hidden, false, 'Multi-word order-independent match finds row');
    assert.equal(pressureRow.hidden, true);
    type('scratch eraser');
    assert.equal(scribbleCard.hidden, false, 'GaussBoard scribble-config-card is searchable');
    assert.equal(secInk.hidden, false);

    // CJK substring matching (no word boundaries needed)
    type('笔尖');
    assert.equal(cjkRow.hidden, false, 'CJK query matches inside CJK setting');
    assert.equal(themeRow.hidden, true);

    // Section heading match reveals whole section
    type('INKING');
    assert.equal(secInk.hidden, false);
    assert.equal(aheadRow.hidden, false);
    assert.equal(pressureRow.hidden, false);
    assert.equal(scribbleCard.hidden, false);
    assert.equal(secApp.hidden, true, 'Non-matching section hides when heading matches another section');

    // Empty search notice
    type('zzqq no match');
    assert.equal(search.none.hidden, false, 'No-match notice becomes visible');
    assert.equal(secApp.hidden, true);
    assert.equal(secInk.hidden, true);

    // Escape clears search and removes all <mark.set-mark> highlights cleanly
    let stopped = false;
    search.input.dispatchEvent({ type: 'keydown', key: 'Escape', stopPropagation() { stopped = true; } });
    assert.equal(stopped, true, 'Escape with non-empty query stops propagation before closing panel');
    assert.equal(search.input.value, '');
    assert.equal(words, '');
    assert.equal(secApp.hidden, false);
    assert.equal(secInk.hidden, false);
    assert.equal(page.querySelectorAll('mark.set-mark').length, 0, 'Escape strips all mark.set-mark elements');
    assert.equal(aheadRow.textContent, 'Draw ahead of the penShort guess past the nib', 'Normalized text matches original');

    // Persistence across rerender (re-creating search with shared getWords/setWords)
    words = 'pressure';
    const secInk2 = mkEl('div', { class: 'section' }, mkEl('h5', {}, 'Inking'),
      mkEl('div', { class: 'setting-row set-row' }, mkEl('span', {}, 'Pressure sensitivity')),
      mkEl('div', { class: 'setting-row set-row' }, mkEl('span', {}, 'Theme')));
    const page2 = mkEl('div', {}, secInk2);
    const search2 = buildSettingsSearch(page2, { getWords: () => words, setWords: (v) => { words = v; } });
    assert.equal(search2.input.value, 'pressure', 'Re-render preserves search query in input');
    assert.equal(secInk2.children[1].hidden, false);
    assert.equal(secInk2.children[2].hidden, true);
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
    if (prevNodeFilter === undefined) delete globalThis.NodeFilter;
    else globalThis.NodeFilter = prevNodeFilter;
  }

  // Verify App Escape capture guard & CSS sticky/dark-mode contrast rules
  const appJs = fs.readFileSync(path.join(ROOT, 'src/js/app.js'), 'utf8');
  assert.match(appJs, /el\.closest\('\.settings-search'\)\s*&&\s*el\.value/, 'app.js lets Escape clear non-empty Settings search first');
  const appCss = fs.readFileSync(path.join(ROOT, 'src/css/app.css'), 'utf8');
  assert.match(appCss, /\.settings-search\s*\{\s*position:\s*sticky;/, 'app.css keeps .settings-search sticky');
  assert.match(appCss, /:root\[data-theme="dark"\]\s+\.panel\s+mark\.set-mark\s*\{[^}]*color:\s*#1b1a19/, 'app.css enforces high-contrast dark text on dark-mode search highlights');
});

test('6. Smoother eraser near PDFs: interior page shadow skip, busy warmFreeze guard, hardware eraserRing layer & split-pane isolation', () => {
  // 6a. Page drop shadow skipped inside band, kept on edge/full frame, TRAP 1 preserved
  const prevPath2D = globalThis.Path2D;
  globalThis.Path2D = FakePath2D;
  bandStats.off = false;
  bandStats.shadowSkips = 0;
  const pageObj = { id: 'pg_1', type: 'image', kind: 'page', x: 0, y: 0, w: 600, h: 800, rotation: 0, src: '' };

  try {
    setPaintBand({ x: 100, y: 120, w: 80, h: 60 });
    const insideCtx = makeRecorderCtx(1);
    drawImage(insideCtx, pageObj, () => {});
    const insideFills = insideCtx.ops.filter((o) => o.op === 'fillRect');
    assert.equal(bandStats.shadowSkips, 1, 'Interior band increments bandStats.shadowSkips');
    assert.equal(insideFills[0].shadowBlur, 0, 'Interior band skips blurred drop shadow');
    assert.deepEqual(
      { x: insideFills[0].x, y: insideFills[0].y, w: insideFills[0].w, h: insideFills[0].h },
      { x: 100, y: 120, w: 80, h: 60 },
      'Interior band fills only the clipped band rect'
    );

    // Band touching the page edge keeps the page shadow
    setPaintBand({ x: -10, y: 120, w: 80, h: 60 });
    const edgeCtx = makeRecorderCtx(1);
    drawImage(edgeCtx, pageObj, () => {});
    const edgeFills = edgeCtx.ops.filter((o) => o.op === 'fillRect');
    assert.equal(bandStats.shadowSkips, 1, 'Edge band does NOT skip shadow');
    assert.equal(edgeFills[0].shadowBlur, 12, 'Edge band retains page drop shadow');

    // Surface.drawScene(clip, filter) resets setPaintBand in finally and preserves TRAP 1 filter
    const { store, surface } = createHarness();
    store.add(structuredClone(pageObj), 'p');
    store.add({
      id: 'st_live', type: 'stroke', tool: 'pen', color: '#111', width: 4, effect: 'none',
      points: [{ x: 120, y: 140, p: 0.5 }, { x: 160, y: 140, p: 0.5 }],
      bbox: { x: 120, y: 140, w: 40, h: 0 }
    }, 'p');
    store.add({
      id: 'st_replay', type: 'stroke', tool: 'pen', color: '#e81123', width: 4, effect: 'none', audioId: 'trk1',
      points: [{ x: 120, y: 150, p: 0.5 }, { x: 160, y: 150, p: 0.5 }],
      bbox: { x: 120, y: 150, w: 40, h: 0 }
    }, 'p');
    const sceneCtx = makeRecorderCtx(1);
    sceneCtx.canvas = { width: 1200, height: 800 };
    const beforeSkips = bandStats.shadowSkips;
    surface.drawScene(sceneCtx, 1200, 800, () => {}, { x: 100, y: 120, w: 80, h: 60 }, (o) => o.audioId !== 'trk1');
    assert.equal(bandStats.shadowSkips, beforeSkips + 1, 'Surface.drawScene activates setPaintBand for band repaints');
    const strokeOps = sceneCtx.ops.filter((o) => o.op === 'stroke');
    assert.equal(strokeOps.length, 1, 'TRAP 1 filter skips active audio track stroke even in banded drawScene');
    // Confirm paintBand cleared in finally by drawing full page directly
    const fullCtx = makeRecorderCtx(1);
    drawImage(fullCtx, pageObj, () => {});
    assert.equal(fullCtx.ops.filter((o) => o.op === 'fillRect')[0].shadowBlur, 12, 'paintBand reset after drawScene finally');
  } finally {
    setPaintBand(null);
    bandStats.off = false;
    if (prevPath2D === undefined) delete globalThis.Path2D;
    else globalThis.Path2D = prevPath2D;
  }

  // 6b. Hardware #eraserRing layer + busy() guard + eraseSweep shape-band preservation
  const prevDoc = globalThis.document;
  const mockStrokeCtx = {
    lineWidth: 1,
    save() {},
    restore() {},
    beginPath() {},
    rect(x, y, w, h) { this._shape = { x, y, w, h }; },
    isPointInPath() { return false; },
    isPointInStroke(x, y) {
      const s = this._shape;
      if (!s) return false;
      const half = this.lineWidth / 2;
      return (Math.abs(x - s.x) <= half && y >= s.y - half && y <= s.y + s.h + half)
        || (Math.abs(x - (s.x + s.w)) <= half && y >= s.y - half && y <= s.y + s.h + half)
        || (Math.abs(y - s.y) <= half && x >= s.x - half && x <= s.x + s.w + half)
        || (Math.abs(y - (s.y + s.h)) <= half && x >= s.x - half && x <= s.x + s.w + half);
    }
  };
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? { getContext: () => mockStrokeCtx } : { style: {} })
  };

  try {
    const { app, store, surface, interaction, listeners, eraserRingEl, penGlowEl } = createHarness({
      eraserSize: 30,
      eraserMode: 'partial',
      eraseShapes: true,
      recordPointer: true
    });
    const bands = [];
    surface.invalidateBand = (b) => bands.push(b);

    app.tool = 'eraser';
    surface.dirty = false;
    interaction.onMove({ pointerId: 1, pointerType: 'mouse', button: -1, buttons: 0, pressure: 0, clientX: 340, clientY: 230 });
    assert.equal(eraserRingEl.hidden, false, 'Hovering with eraser shows compositor ring layer');
    assert.equal(eraserRingEl.style.width, '30px');
    assert.equal(eraserRingEl.style.transform, 'translate3d(325px,215px,0)');
    assert.equal(surface.dirty, false, 'Moving hover ring does NOT mark canvas dirty');

    // Canvas overlay no longer draws the eraser ring arc
    const overlayCtx = makeRecorderCtx(1);
    let arcCalls = 0;
    overlayCtx.arc = () => { arcCalls++; };
    interaction.drawOverlay(overlayCtx, surface);
    assert.equal(arcCalls, 0, 'drawOverlay does not paint eraser ring onto canvas');

    // Add a bare shape and erase across it to confirm erasedBoxes expands band AND busy() goes true mid-rub
    store.add({ id: 'sh_rub', type: 'shape', kind: 'rect', x: 100, y: 100, w: 140, h: 90, lineWidth: 3, rotation: 0 }, 'r');
    interaction.onDown({ pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, pressure: 0.5, clientX: 95, clientY: 130 });
    assert.equal(surface.busy(), true, 'surface.busy() is true while erasing with pointer down');
    interaction.onMove({ pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, pressure: 0.5, clientX: 112, clientY: 130 });
    for (const fn of listeners.get('pointerrawupdate') || []) {
      fn({ pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: 140, clientY: 135 });
    }
    assert.ok(eraserRingEl.style.transform.startsWith('translate3d('), 'pointerrawupdate repositions compositor ring');
    assert.equal(store.get('sh_rub'), undefined, 'Bare shape erased when eraseShapes is true');
    assert.ok(bands.some((b) => b.w >= 140 && b.h >= 90), 'eraseSweep preserves full erased shape bounds in invalidateBand');

    // Stuck-gesture timeout clears busy(), and mouse hover does not revive _heardAt
    interaction._heardAt = performance.now() - 1500;
    assert.equal(surface.busy(), false, 'Stale gesture stops holding warmFreeze after 1s');
    interaction.onUp({ pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, pressure: 0, clientX: 140, clientY: 135 });
    assert.equal(eraserRingEl.hidden, false, 'Mouse hover restores resting eraser ring after lift');

    // Touch erase hides ring on lift
    interaction.onDown({ pointerId: 2, pointerType: 'touch', button: 0, buttons: 1, pressure: 0.5, clientX: 200, clientY: 200 });
    assert.equal(eraserRingEl.hidden, false);
    interaction.onUp({ pointerId: 2, pointerType: 'touch', button: 0, buttons: 0, pressure: 0, clientX: 210, clientY: 200 });
    assert.equal(eraserRingEl.hidden, true, 'Touch eraser hides ring on pointerup');

    // Tool switch back to pen + pen tail hover shows ring & hides glow; returning to tip hides ring
    app.tool = 'pen';
    interaction.hideRing();
    interaction.onMove({ pointerId: 5, pointerType: 'pen', button: -1, buttons: 32, pressure: 0, clientX: 310, clientY: 420 });
    assert.equal(eraserRingEl.hidden, false, 'Pen tail hover shows eraser ring');
    assert.equal(penGlowEl.hidden, true, 'Pen tail hover hides pen glow');
    interaction.onMove({ pointerId: 5, pointerType: 'pen', button: -1, buttons: 0, pressure: 0, clientX: 320, clientY: 420 });
    assert.equal(eraserRingEl.hidden, true, 'Returning to pen tip hides eraser ring');
    assert.equal(penGlowEl.hidden, false, 'Returning to pen tip restores pen glow');

    // pointerleave and finishOnWindowBlur hide ring (two moves after pen clears Windows ghost-mouse filter)
    app.tool = 'eraser';
    interaction.onMove({ pointerId: 1, pointerType: 'mouse', button: -1, buttons: 0, pressure: 0, clientX: 290, clientY: 300 });
    interaction.onMove({ pointerId: 1, pointerType: 'mouse', button: -1, buttons: 0, pressure: 0, clientX: 310, clientY: 300 });
    assert.equal(eraserRingEl.hidden, false);
    for (const fn of listeners.get('pointerleave') || []) fn({ pointerType: 'mouse' });
    assert.equal(eraserRingEl.hidden, true, 'pointerleave hides eraser ring');

    interaction.onMove({ pointerId: 1, pointerType: 'mouse', button: -1, buttons: 0, pressure: 0, clientX: 320, clientY: 300 });
    assert.equal(eraserRingEl.hidden, false);
    interaction.finishOnWindowBlur();
    assert.equal(eraserRingEl.hidden, true, 'finishOnWindowBlur hides eraser ring');
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }

  // 6c. Split Workspace secondary pane allocates isolated .eraser-ring and cleans up on destroy()
  const prevDoc2 = globalThis.document;
  let ringRemoved = false;
  const splitParent = { querySelector: () => null, appendChild() {} };
  const mainRing = { id: 'eraserRing', hidden: true, style: { transform: '', width: '', height: '' } };
  globalThis.document = {
    getElementById: (id) => (id === 'eraserRing' ? mainRing : null),
    createElement: () => ({
      className: '',
      hidden: true,
      style: { transform: '', width: '', height: '' },
      parentNode: splitParent,
      remove() { ringRemoved = true; }
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
      {
        tool: 'eraser',
        settings: { eraserSize: 28, penHold: true, penButtonErases: true },
        ruler: { visible: false, snap: false },
        surface: leftSurface,
        store: new Store(),
        mouseInks: false,
        fingerInks: false,
        hideMenus() { return false; },
        setSelection() {},
        notePenSeen() {},
        syncUI() {}
      },
      { surface: leftSurface, canvas: leftCanvas }
    );
    leftInteraction.onMove({ pointerId: 8, pointerType: 'mouse', button: -1, buttons: 0, pressure: 0, clientX: 80, clientY: 90 });
    assert.ok(leftInteraction._ringEl && leftInteraction._ringEl !== mainRing, 'Split pane creates isolated .eraser-ring');
    assert.equal(leftInteraction._ringEl.className, 'eraser-ring');
    assert.equal(leftInteraction._ringEl.hidden, false);
    assert.equal(mainRing.hidden, true, 'Main #eraserRing remains untouched by split pane');
    assert.equal(typeof leftSurface.isBusy, 'function');
    leftInteraction.destroy();
    assert.equal(ringRemoved, true, 'Owned split-pane .eraser-ring removed on destroy');
    assert.equal(leftSurface.isBusy, null, 'surface.isBusy cleared on destroy');
  } finally {
    if (prevDoc2 === undefined) delete globalThis.document;
    else globalThis.document = prevDoc2;
  }

  // Confirm src/index.html & src/js/app.js wire #eraserRing and setTool hideRing
  const html = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
  assert.match(html, /<div id="eraserRing" hidden><\/div>/, 'src/index.html includes #eraserRing layer');
  const appJs = fs.readFileSync(path.join(ROOT, 'src/js/app.js'), 'utf8');
  assert.match(appJs, /tool\s*!==\s*'eraser'[\s\S]{0,120}hideRing\?\./, 'src/js/app.js hides ring when switching away from eraser');
});
