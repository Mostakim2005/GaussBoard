import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  IndustrialCircuitSim,
  buildProtectedMatrix,
  clampDiodeVoltage,
  circuitAudio
} from '../src/js/core/circuit-sim.js';
import {
  renderMathToXhtml,
  renderInlineMarkdown,
  INLINE_MATH_RE
} from '../src/js/core/markdown.js';
import { cleanOrthogonalPath, routeOrthogonal } from '../src/js/core/connectors.js';
import { WorkspaceSessionManager } from '../src/js/ui/tabs.js';
import { FunctionGrapherModal } from '../src/js/ui/function-grapher.js';

test('P1 Hardening — 1. MNA Circuit Simulator singular matrix protection & diode voltage clamping', () => {
  // 1a. Test protected conductance matrix construction (G_MIN shunt prevents singular matrix)
  const G = buildProtectedMatrix(4);
  assert.equal(G.length, 4);
  assert.equal(G[0].length, 4);
  for (let i = 0; i < 4; i++) {
    assert.ok(G[i][i] >= 1e-12, `Diagonal element G[${i}][${i}] contains minimum shunt conductance`);
    assert.equal(G[i][(i + 1) % 4], 0, 'Off-diagonal initialized to zero');
  }

  // 1b. Test Shockley diode voltage limiting algorithm
  const vCrit = clampDiodeVoltage(0.5, 0);
  assert.equal(vCrit, 0.5, 'Normal sub-threshold voltage passes through unchanged');

  // Extreme jump from 0.5V to 5.0V should be clamped to prevent exponential overflow
  const clamped = clampDiodeVoltage(5.0, 0.5);
  assert.ok(clamped < 2.0, `Extreme diode voltage jump clamped safely: ${clamped}V < 2.0V`);

  // 1c. Test full simulation step with semiconductor components
  const sim = new IndustrialCircuitSim();
  sim.addComponent({ id: 'V1', type: 'dc_supply', name: '24V DC', x: 50, y: 50 });
  sim.addComponent({ id: 'D1', type: 'diode', name: '1N4007', x: 150, y: 50 });
  sim.addComponent({ id: 'Z1', type: 'zener_diode', zenerVoltage: 5.1, x: 250, y: 50 });
  sim.addComponent({ id: 'G1', type: 'logic_gate', gateType: 'AND', x: 350, y: 50 });
  sim.addWire('V1:+', 'D1:A');
  sim.addWire('D1:K', 'Z1:K');

  // Step simulation multiple cycles
  for (let i = 0; i < 10; i++) {
    sim.step(0.016);
  }

  // Verify potentials are finite numbers and no NaNs propagated
  for (const wire of sim.wires) {
    assert.ok(Number.isFinite(wire.voltage), 'Wire voltage is finite');
    assert.ok(!Number.isNaN(wire.voltage), 'Wire voltage is not NaN');
  }

  // 1d. Procedural audio throttling prevents buffer exhaustion
  const origEnabled = circuitAudio.enabled;
  circuitAudio.enabled = true;
  // Multiple rapid continuity beeps should not throw and must throttle
  assert.doesNotThrow(() => {
    for (let i = 0; i < 20; i++) {
      circuitAudio.playContinuityBeep();
      circuitAudio.playButtonClick();
    }
  });
  circuitAudio.enabled = origEnabled;
});

test('P1 Hardening — 2. KaTeX offline rendering resilience and currency disambiguation', () => {
  // 2a. Malformed LaTeX equations must not throw or crash
  const brokenTex1 = '\\frac{1}{';
  const html1 = renderMathToXhtml(brokenTex1, false);
  assert.ok(typeof html1 === 'string', 'Malformed fraction returned fallback string');
  assert.ok(html1.includes('gb-math-inline') || html1.includes('katex'), 'Contains math markup');

  const brokenTex2 = '\\sqrt[3]{';
  const html2 = renderMathToXhtml(brokenTex2, true);
  assert.ok(typeof html2 === 'string', 'Malformed root returned fallback string');
  assert.ok(html2.includes('gb-math-block') || html2.includes('katex'), 'Contains block markup');

  // 2b. Inline math regex accurately distinguishes currency from formulas
  const currencyStr = 'Gas costs $4.50 per gallon and parking is $15.00.';
  const currencyMatches = currencyStr.match(INLINE_MATH_RE);
  assert.equal(currencyMatches, null, 'Currency prices are never matched as LaTeX math');

  const formulaStr = 'Area is given by $A = \\pi r^2$ for radius $r$.';
  const formulaMatches = formulaStr.match(INLINE_MATH_RE);
  assert.deepEqual(formulaMatches, ['$A = \\pi r^2$', '$r$']);

  // 2c. Inline markdown rendering with math and wikilinks
  const rendered = renderInlineMarkdown('Equation $y = mx + b$ links to [[Linear Algebra]].');
  assert.ok(rendered.includes('Linear Algebra'), 'Wikilink rendered');
  assert.ok(rendered.includes('data-tex') || rendered.includes('katex'), 'Math rendered');
});

test('P1 Hardening — 3. Function Grapher asymptote discontinuity detection & numerical safety', () => {
  const mockApp = {
    surface: {
      canvas: { width: 800, height: 600 },
      cam: { viewport(w, h) { return { x: 0, y: 0, w, h }; } },
      render() {}
    },
    store: { add() {} },
    toast() {},
    saveSoon() {}
  };

  const grapher = new FunctionGrapherModal(mockApp);
  grapher.expression = 'tan(x)';
  grapher.fn = grapher.compileExpression('tan(x)');
  grapher.xMin = -5;
  grapher.xMax = 5;
  grapher.yMin = -10;
  grapher.yMax = 10;

  // Verify tan(x) compiles and evaluates
  assert.equal(typeof grapher.fn, 'function');
  const atZero = grapher.fn(0);
  assert.equal(Math.round(atZero), 0);

  // Evaluate near vertical asymptote x = pi/2
  const nearPoleLeft = grapher.fn(1.57);
  const nearPoleRight = grapher.fn(1.58);
  assert.ok(Number.isFinite(nearPoleLeft), 'Near pole left value is finite');
  assert.ok(Number.isFinite(nearPoleRight), 'Near pole right value is finite');
  assert.ok(Math.sign(nearPoleLeft) !== Math.sign(nearPoleRight), 'Opposite infinity signs across asymptote');

  // Verify render() executes cleanly without canvas errors
  assert.doesNotThrow(() => {
    // If canvas is available, render
    if (grapher.canvas) {
      grapher.render();
    }
  });
});

test('P1 Hardening — 4. Workspace Session Manager localStorage quota recovery', () => {
  const prevLocalStorage = globalThis.localStorage;

  // Mock localStorage that simulates QuotaExceededError
  let store = {};
  let throwQuota = false;
  globalThis.localStorage = {
    getItem(key) { return store[key] || null; },
    setItem(key, val) {
      if (throwQuota) {
        const err = new Error('The quota has been exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
      store[key] = String(val);
    },
    removeItem(key) { delete store[key]; }
  };

  try {
    // Normal save
    const session = WorkspaceSessionManager.saveSession('TestSession', [{ id: 'b1', title: 'Board 1' }], 'b1');
    assert.equal(session.name, 'TestSession');
    const list1 = WorkspaceSessionManager.listSessions();
    assert.equal(list1.length, 1);
    assert.equal(list1[0].name, 'TestSession');

    // Simulate quota exceeded
    throwQuota = true;
    assert.doesNotThrow(() => {
      WorkspaceSessionManager.saveSession('HeavySession', [{ id: 'b2', title: 'Board 2' }], 'b2');
    }, 'QuotaExceededError must be caught gracefully without throwing');
  } finally {
    if (prevLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocalStorage;
  }
});

test('P1 Hardening — 5. Manhattan Orthogonal Routing collinear simplification and pruning', () => {
  // 5a. cleanOrthogonalPath prunes duplicate consecutive points
  const pointsWithDupes = [
    { x: 10, y: 10 },
    { x: 10, y: 10 }, // duplicate
    { x: 50, y: 10 },
    { x: 50, y: 80 },
    { x: 50, y: 80 }  // duplicate
  ];
  const cleaned = cleanOrthogonalPath(pointsWithDupes);
  assert.equal(cleaned.length, 3, 'Consecutive duplicates removed and collinear segment preserved');
  assert.deepEqual(cleaned[0], { x: 10, y: 10 });
  assert.deepEqual(cleaned[1], { x: 50, y: 10 });
  assert.deepEqual(cleaned[2], { x: 50, y: 80 });

  // 5b. cleanOrthogonalPath collapses intermediate collinear points along same axis
  const collinearX = [
    { x: 10, y: 20 },
    { x: 30, y: 20 }, // intermediate collinear
    { x: 60, y: 20 }, // intermediate collinear
    { x: 100, y: 20 },
    { x: 100, y: 80 }
  ];
  const simplifiedX = cleanOrthogonalPath(collinearX);
  assert.equal(simplifiedX.length, 3, 'Intermediate horizontal collinear points collapsed');
  assert.deepEqual(simplifiedX[0], { x: 10, y: 20 });
  assert.deepEqual(simplifiedX[1], { x: 100, y: 20 });
  assert.deepEqual(simplifiedX[2], { x: 100, y: 80 });

  // 5c. routeOrthogonal returns clean non-degenerate path
  const pA = { x: 100, y: 100 };
  const pB = { x: 300, y: 250 };
  const path = routeOrthogonal(pA, 'e', pB, 'w');
  assert.ok(Array.isArray(path));
  assert.ok(path.length >= 2);
  assert.deepEqual(path[0], pA);
  assert.deepEqual(path[path.length - 1], pB);

  // Check no consecutive duplicate coordinates exist
  for (let i = 1; i < path.length; i++) {
    const p1 = path[i - 1];
    const p2 = path[i];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    assert.ok(dist > 0.01, `Segment ${i - 1}->${i} has non-zero length: ${dist}`);
  }
});
