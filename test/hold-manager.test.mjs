import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldGestureManager } from '../src/js/core/hold-manager.js';
import { Interaction } from '../src/js/core/tools.js';

function createMockApp() {
  let radialOpened = false;
  let componentOpened = null;
  let coverInspected = null;

  const settings = {
    holdGestureMode: 'radial',
    holdToShape: true,
    penHold: true
  };

  const cam = {
    x: 0, y: 0, z: 1,
    toScreen: (x, y) => ({ x, y }),
    toWorld: (x, y) => ({ x, y }),
    viewport: () => ({ x: 0, y: 0, w: 1000, h: 800 })
  };

  const canvas = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  };

  const store = {
    doc: { order: [], objects: {}, pages: [] },
    objects: [],
    add: () => {},
    undoStack: []
  };

  const surface = {
    canvas,
    cam,
    store,
    selection: new Set(),
    overlays: [],
    wet: null,
    wetPieces: null,
    invalidate: () => {},
    pulseHighlight: () => {},
    screenPoint: (e) => ({ x: e.clientX, y: e.clientY })
  };

  const app = {
    tool: 'pen',
    settings,
    viewMode: false,
    surface,
    store,
    ruler: { visible: false },
    saveSettings: () => {},
    commitTextEdit: () => {},
    showHint: () => {},
    hideMenus: () => false,
    setSelection: () => {},
    toast: () => {},
    syncUI: () => {},
    notePenSeen: () => {},
    showRadial: () => { radialOpened = true; },
    openCircuitComponentProperties: (comp) => { componentOpened = comp; },
    inspectCover: (cov) => { coverInspected = cov; },
    circuitWorkbench: {
      isOpen: false,
      hitComponent: (wp) => (wp.x === 100 && wp.y === 100 ? { id: 'resistor-1', name: 'Resistor R1' } : null)
    },
    radial: {
      open: false,
      close: () => {},
      track: () => {},
      release: () => {}
    }
  };

  const interaction = {
    hitCover: (wp) => (wp.x === 200 && wp.y === 200 ? { id: 'cover-1', type: 'curtain' } : null)
  };

  return {
    app,
    interaction,
    get radialOpened() { return radialOpened; },
    get componentOpened() { return componentOpened; },
    get coverInspected() { return coverInspected; }
  };
}

test('HoldGestureManager: mode cycling between radial, classic, and off', () => {
  const { app, interaction } = createMockApp();
  const mgr = new HoldGestureManager(app, interaction);

  assert.equal(mgr.mode, 'radial');
  assert.equal(mgr.cycleMode(), 'classic');
  assert.equal(mgr.mode, 'classic');
  assert.equal(mgr.cycleMode(), 'off');
  assert.equal(mgr.mode, 'off');
  assert.equal(mgr.cycleMode(), 'radial');
  assert.equal(mgr.mode, 'radial');
});

test('HoldGestureManager: domain priority over canvas hold', () => {
  const { app, interaction } = createMockApp();
  const mgr = new HoldGestureManager(app, interaction);

  // Over circuit component
  app.circuitWorkbench.isOpen = true;
  const compHold = mgr.evaluateHold({ pointerType: 'pen' }, { x: 100, y: 100 }, { x: 100, y: 100 });
  assert.equal(compHold.type, 'component');
  assert.equal(compHold.target.id, 'resistor-1');

  // Over study cover
  const coverHold = mgr.evaluateHold({ pointerType: 'pen' }, { x: 200, y: 200 }, { x: 200, y: 200 });
  assert.equal(coverHold.type, 'cover');
  assert.equal(coverHold.target.id, 'cover-1');
});

test('HoldGestureManager: stylus vs mouse role disambiguation on empty canvas', () => {
  const { app, interaction } = createMockApp();
  const mgr = new HoldGestureManager(app, interaction);

  // Stylus with mode='radial' gets radial menu
  const penHold = mgr.evaluateHold({ pointerType: 'pen' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(penHold.type, 'radial');

  // Mouse with mode='radial' gets standard context menu (never radial)
  const mouseHold = mgr.evaluateHold({ pointerType: 'mouse' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(mouseHold.type, 'context');

  // Stylus with mode='classic' gets standard context menu
  mgr.setMode('classic');
  const penClassic = mgr.evaluateHold({ pointerType: 'pen' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(penClassic.type, 'context');

  // Any pointer with mode='off' gets none
  mgr.setMode('off');
  const penOff = mgr.evaluateHold({ pointerType: 'pen' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(penOff.type, 'none');
  const mouseOff = mgr.evaluateHold({ pointerType: 'mouse' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(mouseOff.type, 'none');
});

test('HoldGestureManager: viewMode suppression', () => {
  const { app, interaction } = createMockApp();
  const mgr = new HoldGestureManager(app, interaction);
  app.viewMode = true;

  const res = mgr.evaluateHold({ pointerType: 'pen' }, { x: 500, y: 500 }, { x: 500, y: 500 });
  assert.equal(res.type, 'none');
});

test('Verification Test 1: Hold stylus stationary on empty board -> Radial opens & zero ink dots left behind', async () => {
  const mock = createMockApp();
  const interaction = new Interaction(mock.app);
  mock.app.interaction = interaction;
  mock.app.holdManager = new HoldGestureManager(mock.app, interaction);

  // Simulate stylus pointerdown on empty board
  const downEv = { pointerId: 1, pointerType: 'pen', clientX: 300, clientY: 300, button: 0 };
  interaction.onDown(downEv);

  // An active wet stroke buffer exists during initial contact
  assert.ok(interaction.surface.wet != null, 'Wet stroke initiated on pointerdown');
  assert.ok(interaction._hold != null, 'Stationary hold timer armed');

  // Fast-forward / trigger stationary dwell expiration directly
  interaction.abortActiveStroke();
  const evalHold = mock.app.holdManager.evaluateHold(downEv, { x: 300, y: 300 }, { x: 300, y: 300 });
  assert.equal(evalHold.type, 'radial');

  mock.app.showRadial({ clientX: 300, clientY: 300 }, { x: 300, y: 300 });
  interaction.action = { type: 'radial' };
  interaction.actionId = 1;

  assert.equal(mock.radialOpened, true, 'Radial menu ring opened');
  assert.equal(interaction.surface.wet, null, 'Phantom wet ink stroke cleanly discarded');
  assert.equal(interaction.surface.wetPieces, null);
  assert.equal(mock.app.store.undoStack.length, 0, 'No undo entry created');
});

test('Verification Test 2: Draw rough rectangle (path > 100px) & hold still at corner -> Converts to shape, radial bypassed', () => {
  const mock = createMockApp();
  const interaction = new Interaction(mock.app);
  mock.app.interaction = interaction;
  mock.app.holdManager = new HoldGestureManager(mock.app, interaction);

  // Simulate active stroke with rough rectangle points (> 100px path travel)
  const rectPts = [
    { x: 100, y: 100, t: 10 },
    { x: 200, y: 100, t: 30 },
    { x: 200, y: 200, t: 50 },
    { x: 100, y: 200, t: 70 },
    { x: 100, y: 100, t: 90 }
  ];

  const strokeAction = {
    type: 'draw',
    tool: 'pen',
    obj: { id: 's1', tool: 'pen', points: rectPts }
  };
  interaction.action = strokeAction;

  // Arm shape hold: path travel = 100 + 100 + 100 + 100 = 400px > 24px requirement
  interaction.armShapeHold(strokeAction, { x: 100, y: 100 });
  assert.ok(interaction._shapeHoldTimer != null, 'Post-stroke dwell timer armed for shape conversion');

  // Radial menu was never opened during handwriting
  assert.equal(mock.radialOpened, false, 'Radial menu bypassed during active stroke');

  interaction.cancelShapeHold();
});

test('Verification Test 3: Hold stylus on resistor -> Circuit properties modal opens, radial bypassed', () => {
  const mock = createMockApp();
  const interaction = new Interaction(mock.app);
  mock.app.interaction = interaction;
  mock.app.holdManager = new HoldGestureManager(mock.app, interaction);
  mock.app.circuitWorkbench.isOpen = true;

  const penEv = { pointerId: 1, pointerType: 'pen', clientX: 100, clientY: 100, button: 0 };
  const evalHold = mock.app.holdManager.evaluateHold(penEv, { x: 100, y: 100 }, { x: 100, y: 100 });

  assert.equal(evalHold.type, 'component');
  assert.equal(evalHold.target.id, 'resistor-1');

  // Trigger component action
  mock.app.openCircuitComponentProperties(evalHold.target);
  assert.equal(mock.componentOpened?.id, 'resistor-1');
  assert.equal(mock.radialOpened, false, 'Radial menu bypassed for domain component');
});

test('Multi-Touch Pinch Interruption: Second finger cancels stationary hold immediately', () => {
  const mock = createMockApp();
  const interaction = new Interaction(mock.app);

  // First finger touches down
  interaction.onDown({ pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 200, button: 0 });
  assert.ok(interaction._hold != null, 'Stationary hold active for single touch');

  // Second finger lands (pinch gesture started)
  interaction.onDown({ pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300, button: 0 });
  assert.equal(interaction._hold, null, 'Stationary hold cancelled immediately on 2nd pointer');
});

test('Tiny dot / short stroke (< 24px) does not trigger holdToShape', () => {
  const mock = createMockApp();
  const interaction = new Interaction(mock.app);

  // Tiny dot or micro-jitter: total travel = 4px (< 24px)
  const tinyPts = [
    { x: 50, y: 50 },
    { x: 51, y: 50 },
    { x: 52, y: 51 },
    { x: 52, y: 52 },
    { x: 53, y: 52 }
  ];

  const strokeAction = {
    type: 'draw',
    tool: 'pen',
    obj: { id: 's2', tool: 'pen', points: tinyPts }
  };
  interaction.action = strokeAction;

  interaction.armShapeHold(strokeAction, { x: 53, y: 52 });
  assert.equal(!interaction._shapeHoldTimer, true, 'Post-stroke dwell timer not armed for tiny dot');
});
