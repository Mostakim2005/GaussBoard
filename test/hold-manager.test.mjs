import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldGestureManager } from '../src/js/core/hold-manager.js';

function createMockApp() {
  const settings = { holdGestureMode: 'radial' };
  const app = {
    settings,
    viewMode: false,
    saveSettings: () => {},
    circuitWorkbench: {
      isOpen: false,
      hitComponent: (wp) => (wp.x === 100 && wp.y === 100 ? { id: 'resistor-1' } : null)
    }
  };
  const interaction = {
    hitCover: (wp) => (wp.x === 200 && wp.y === 200 ? { id: 'cover-1' } : null)
  };
  return { app, interaction };
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
