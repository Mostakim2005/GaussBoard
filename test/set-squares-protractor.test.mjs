import test from 'node:test';
import assert from 'node:assert/strict';
import { Interaction } from '../src/js/core/tools.js';

function createMockApp() {
  const ruler = { visible: true, x: 500, y: 500, angle: 0, length: 900, thickness: 78, snap: true, kind: 'ruler' };
  const settings = { rulerOpacity: 0.92, mouseRole: 'auto' };
  const cam = {
    x: 0, y: 0, z: 1,
    toScreen: (x, y) => ({ x, y }),
    toWorld: (x, y) => ({ x, y }),
    viewport: () => ({ x: 0, y: 0, w: 1000, h: 800 })
  };
  const canvas = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
  };
  const surface = {
    canvas,
    cam,
    overlays: [],
    invalidate: () => {},
    screenPoint: (e) => ({ x: e.clientX, y: e.clientY })
  };
  return {
    ruler,
    settings,
    surface,
    stylusKnown: true
  };
}

test('Set square geometry: 45° and 30°/60° corners and bounds', () => {
  const app = createMockApp();
  const interaction = new Interaction(app);

  app.ruler.kind = 'set45';
  app.ruler.triBase = 400;
  assert.equal(interaction.rulerIsTriangle, true);
  const corners45 = interaction.triCorners();
  assert.equal(corners45.length, 3);
  assert.equal(corners45[0].u, -200);
  assert.equal(corners45[0].v, 0); // right angle
  assert.equal(corners45[1].u, 200);
  assert.equal(corners45[1].v, 0);  // 45 deg corner
  assert.equal(corners45[2].u, -200);
  assert.equal(corners45[2].v, 400); // 45 deg upright

  app.ruler.kind = 'set60';
  app.ruler.triBase = 600;
  assert.equal(interaction.rulerIsTriangle, true);
  const corners60 = interaction.triCorners();
  const expectedH = 600 * Math.tan(Math.PI / 6);
  assert.ok(Math.abs(corners60[2].v - expectedH) < 1e-6);
});

test('Set square interior test & edge projection', () => {
  const app = createMockApp();
  const interaction = new Interaction(app);
  app.ruler.kind = 'set45';
  app.ruler.triBase = 400;

  // Inside point: centroid
  const insideDist = interaction.triInside(-100, 100);
  assert.ok(insideDist > 0, 'Centroid must be inside triangle');

  // Outside point: above base
  const outsideDist = interaction.triInside(0, -50);
  assert.ok(outsideDist < 0, 'Point above base must be outside');
});

test('TRAP 2 Invariant: triProject & protProject strictly preserve stroke timestamps p.t', () => {
  const app = createMockApp();
  const interaction = new Interaction(app);
  app.ruler.kind = 'set45';
  app.ruler.triBase = 400;

  const rawPointWithTime = { x: 500, y: 520, p: 0.65, t: 12345.67 };
  const projectedTri = interaction.triProject(rawPointWithTime, 'e0');
  assert.equal(projectedTri.t, 12345.67, 'triProject must preserve exact p.t timestamp for audio replay sync');
  assert.equal(projectedTri.p, 0.65, 'triProject must preserve pressure');

  app.ruler.kind = 'protractor';
  app.ruler.protR = 300;
  app.ruler.protArm = 45;
  const projectedProtArc = interaction.protProject(rawPointWithTime, 'pc');
  assert.equal(projectedProtArc.t, 12345.67, 'protProject arc must preserve exact p.t timestamp');
  const projectedProtArm = interaction.protProject(rawPointWithTime, 'pa');
  assert.equal(projectedProtArm.t, 12345.67, 'protProject arm must preserve exact p.t timestamp');
});

test('Protractor geometry and angle measurement', () => {
  const app = createMockApp();
  const interaction = new Interaction(app);
  app.ruler.kind = 'protractor';
  app.ruler.protR = 250;
  app.ruler.protArm = 90;

  assert.equal(interaction.rulerIsProtractor, true);
  const geom = interaction.protGeom();
  assert.equal(geom.R, 250);
  assert.equal(geom.armDeg, 90);
  assert.ok(Math.abs(geom.arm - Math.PI / 2) < 1e-6);

  // Aim arm to 30 degrees (wp in front of center: along = 100, perp = -57.73)
  interaction.aimProtArm({ x: 500 + 100, y: 500 - 57.73 }, false);
  assert.equal(app.ruler.protArm, 30);
});

test('Connector & Wire collision avoidance: snapToRuler bypasses snapping for connectors', () => {
  const app = createMockApp();
  const interaction = new Interaction(app);
  app.ruler.kind = 'set45';
  app.ruler.snap = true;

  const raw = { x: 500, y: 500, p: 0.5, t: 100 };
  const wireAction = { type: 'wire' };
  const connectAction = { type: 'connect' };
  const connectorAction = { type: 'connector' };

  assert.deepEqual(interaction.snapToRuler(raw, wireAction), raw, 'Wire routing must never snap to ruler');
  assert.deepEqual(interaction.snapToRuler(raw, connectAction), raw, 'Connector routing must never snap to ruler');
  assert.deepEqual(interaction.snapToRuler(raw, connectorAction), raw, 'Magnetic connector must never snap to ruler');
});
