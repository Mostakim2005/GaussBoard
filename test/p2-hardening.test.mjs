import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ChemicalSketcherModal } from '../src/js/ui/chemical-sketcher.js';
import { NotebookVariables, evaluateNotebookVariables, SymbolicCAS } from '../src/js/core/scientific-math.js';
import { DataviewEngine } from '../src/js/core/dataview.js';
import { Rating, State, createEmptyCard, repeat } from '../src/js/core/fsrs.js';
import { StudyRunner } from '../src/js/ui/study-runner.js';
import { CircuitWorkbenchModal } from '../src/js/ui/circuit-workbench.js';
import { FunctionGrapherModal } from '../src/js/ui/function-grapher.js';

test('P2 Hardening — 1. Chemical Sketcher SMILES parser & viewport-centered stamping', () => {
  let stampedObj = null;
  const mockApp = {
    surface: {
      canvas: { width: 1200, height: 800 },
      cam: {
        viewport(w, h) {
          return { x: 200, y: 100, w, h };
        }
      },
      redraw() {}
    },
    store: {
      add(obj) {
        stampedObj = obj;
      }
    },
    toast() {}
  };

  const sketcher = new ChemicalSketcherModal(mockApp);

  // 1a. Test single-digit ring closure (Benzene: c1ccccc1)
  sketcher.parseSMILES('c1ccccc1');
  assert.equal(sketcher.atoms.length, 6, 'Benzene has 6 carbon atoms');
  // 5 backbone bonds + 1 ring closure bond = 6 bonds
  assert.equal(sketcher.bonds.length, 6, 'Benzene has 6 bonds including ring closure');

  // 1b. Test multi-digit ring closure (%10 .. %99)
  // C%10CCCC%10 is cyclopentane via %10 ring closure
  sketcher.parseSMILES('C%10CCCC%10');
  assert.equal(sketcher.atoms.length, 5, 'Cyclopentane has 5 atoms');
  assert.equal(sketcher.bonds.length, 5, 'Ring %10 closure formed the 5th bond');
  const closureBond = sketcher.bonds.find((b) => (b.a === 4 && b.b === 0) || (b.a === 0 && b.b === 4));
  assert.ok(closureBond, 'Ring closure bond between atom 0 and 4 exists');

  // 1c. Test stampToCanvas centers card using cam.viewport(sw, sh)
  sketcher.canvas = {
    toDataURL() { return 'data:image/png;base64,mock'; }
  };
  sketcher.stampToCanvas();

  assert.ok(stampedObj, '2D chemical structure was stamped');
  assert.equal(stampedObj.type, 'image');
  assert.equal(stampedObj.w, 360);
  assert.equal(stampedObj.h, 260);
  // Center: x = vp.x (200) + vp.w (1200) / 2 - 360 / 2 = 200 + 600 - 180 = 620
  // y = vp.y (100) + vp.h (800) / 2 - 260 / 2 = 100 + 400 - 130 = 370
  assert.equal(stampedObj.x, 620);
  assert.equal(stampedObj.y, 370);
});

test('P2 Hardening — 2. Notebook Variables DAG dependency evaluation & cycle detection', () => {
  // 2a. Linear DAG evaluation
  const linearVars = {
    V_supply: 24,
    R_total: 'R1 + R2',
    R1: 4,
    R2: 8,
    I_load: 'V_supply / R_total'
  };

  const dagResult = evaluateNotebookVariables(linearVars);
  assert.ok(dagResult.ok, 'Linear DAG evaluated without errors');
  assert.equal(dagResult.values.R_total, 12);
  assert.equal(dagResult.values.I_load, 2);

  // 2b. Cyclic dependency detection (no infinite loops or stack overflows)
  const cyclicVars = {
    a: 'b + 1',
    b: 'c * 2',
    c: 'a - 3',
    independent: 42
  };

  const cycleResult = evaluateNotebookVariables(cyclicVars);
  assert.equal(cycleResult.ok, false, 'Cycle correctly reported as not ok');
  assert.ok(cycleResult.errors.a.includes('Cyclic dependency'), 'Variable a flagged with cycle');
  assert.ok(cycleResult.errors.b.includes('Cyclic dependency'), 'Variable b flagged with cycle');
  assert.ok(cycleResult.errors.c.includes('Cyclic dependency'), 'Variable c flagged with cycle');
  // Independent variable must still resolve cleanly
  assert.equal(cycleResult.values.independent, 42, 'Independent variable resolved despite cycles elsewhere');

  // 2c. NotebookVariables reactive instance
  const nb = new NotebookVariables();
  nb.set('x', 5);
  nb.set('y', 'x * 3');
  const res = nb.resolveAll();
  assert.ok(res.ok);
  assert.equal(nb.get('y'), 15);
  const evalRes = nb.evaluate('x + y');
  assert.ok(evalRes.ok);
  assert.equal(evalRes.numeric, 20);
});

test('P2 Hardening — 3. Symbolic CAS solver & differentiator', () => {
  // Linear equation solver
  const sol1 = SymbolicCAS.solveLinear('2x + 8 = 16');
  assert.ok(sol1);
  assert.equal(sol1.root, 4);

  const sol2 = SymbolicCAS.solveLinear('5x - 15 = 0');
  assert.ok(sol2);
  assert.equal(sol2.root, 3);

  // Symbolic differentiator
  assert.equal(SymbolicCAS.differentiate('x^3'), '3x^{2}');
  assert.equal(SymbolicCAS.differentiate('2x^4'), '8x^{3}');
  assert.equal(SymbolicCAS.differentiate('sin(x)'), '\\cos(x)');
  assert.equal(SymbolicCAS.differentiate('cos(x)'), '-\\sin(x)');
  assert.equal(SymbolicCAS.differentiate('exp(x)'), 'e^x');
});

test('P2 Hardening — 4. Dataview prototype pollution guard & infix CONTAINS / AND queries', () => {
  const dummyItem = {
    id: 'note_1',
    type: 'curtain',
    subtype: 'tape',
    tags: ['#exam', '#biology'],
    text: 'Review cell respiration #exam',
    card: { stability: 4.2 }
  };

  // 4a. Prototype pollution prevention
  assert.equal(DataviewEngine.resolveField(dummyItem, '__proto__'), '');
  assert.equal(DataviewEngine.resolveField(dummyItem, 'prototype'), '');
  assert.equal(DataviewEngine.resolveField(dummyItem, 'constructor'), '');
  assert.equal(DataviewEngine.resolveField(dummyItem, 'card.__proto__.polluted'), '');

  // 4b. Nested valid field resolution
  assert.equal(DataviewEngine.resolveField(dummyItem, 'card.stability'), 4.2);

  // 4c. Infix CONTAINS clause
  assert.ok(DataviewEngine.evaluateCondition('tags CONTAINS "biology"', dummyItem));
  assert.ok(DataviewEngine.evaluateCondition('tags CONTAINS exam', dummyItem));
  assert.ok(!DataviewEngine.evaluateCondition('tags CONTAINS "physics"', dummyItem));

  // 4d. Multi-clause conjunction (AND)
  assert.ok(DataviewEngine.evaluateCondition('type = "curtain" AND tags CONTAINS "exam"', dummyItem));
  assert.ok(!DataviewEngine.evaluateCondition('type = "note" AND tags CONTAINS "exam"', dummyItem));

  // 4e. Full query execution
  const store = { doc: { objects: { n1: dummyItem, n2: { id: 'note_2', type: 'text', tags: ['#physics'] } } } };
  const queryRes = DataviewEngine.execute('TABLE id, type\nWHERE type = "curtain" AND tags CONTAINS "exam"', store);
  assert.ok(queryRes.ok);
  assert.equal(queryRes.count, 1);
  assert.equal(queryRes.rows[0][0], 'note_1');
});

test('P2 Hardening — 5. FSRS v5 numerical stability & scheduled days sanity clamps', () => {
  const emptyCard = createEmptyCard();

  // Test repeat under normal Good rating
  const reviewCard = repeat(emptyCard, Rating.Good);
  assert.ok(Number.isFinite(reviewCard.stability));
  assert.ok(Number.isFinite(reviewCard.scheduled_days));
  assert.ok(Number.isFinite(reviewCard.due));
  assert.ok(reviewCard.stability >= 0.01);
  assert.ok(reviewCard.scheduled_days >= 10 / 1440);

  // Test repeat with corrupted/NaN initial stability
  const corruptedCard = {
    ...emptyCard,
    stability: NaN,
    state: State.Review,
    last_review: Date.now() - 365 * 86400 * 1000 // 1 year ago
  };

  const recoveredCard = repeat(corruptedCard, Rating.Again);
  assert.ok(Number.isFinite(recoveredCard.stability), 'Stability recovered from NaN to finite number');
  assert.ok(recoveredCard.stability >= 0.01);
  assert.ok(Number.isFinite(recoveredCard.due), 'Due timestamp is finite');
  assert.ok(recoveredCard.scheduled_days >= 0.0069, 'Scheduled days clamped to minimum review interval');
});

test('P2 Hardening — 6. Study Runner occlusion reset on session stop (Invariant #6)', () => {
  const tape1 = { id: 'curtain_1', type: 'curtain', subtype: 'tape', revealed: false, fsrs: null };
  const tape2 = { id: 'curtain_2', type: 'curtain', subtype: 'box', revealed: false, fsrs: null };

  const mockStore = {
    objects: [tape1, tape2],
    doc: {
      objects: {
        c1: tape1,
        c2: tape2
      }
    }
  };

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const mockEl = () => ({
    className: '',
    innerHTML: '',
    style: { width: '', setProperty() {} },
    querySelector: () => mockEl(),
    querySelectorAll: () => [],
    appendChild() {},
    addEventListener() {},
    remove() {}
  });

  globalThis.document = {
    createElement: () => mockEl(),
    body: { appendChild() {} }
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {}
  };

  try {
    const mockApp = {
      store: mockStore,
      surface: {
        invalidate() {}
      },
      toast() {}
    };

    const runner = new StudyRunner(mockApp);

    // Start study runner
    const started = runner.start({ onlyDue: false });
    assert.ok(started, 'Runner started with collected study cards');

    // Switch to hideOne mode (reveals all non-target cards)
    runner.toggleOcclusionMode();
    assert.equal(runner.occlusionMode, 'hideOne');
    assert.equal(tape2.revealed, true, 'In hideOne mode, surrounding card tape2 is revealed');

    // Stop study runner
    runner.stop();
    assert.equal(runner.active, false, 'Runner is inactive');

    // Invariant #6 check: All occlusions must be restored to concealed state
    assert.equal(tape1.revealed, false, 'tape1 restored to concealed (revealed: false)');
    assert.equal(tape2.revealed, false, 'tape2 restored to concealed (revealed: false)');
  } finally {
    if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window; else globalThis.window = prevWin;
  }
});

test('P2 Hardening — 7. Circuit Workbench & Function Grapher viewport-centered stamping (Invariant #2 p.t)', () => {
  let stampedObj = null;
  const mockApp = {
    surface: {
      canvas: { width: 1400, height: 900 },
      cam: {
        viewport(w, h) {
          return { x: 300, y: 150, w, h };
        }
      },
      render() {}
    },
    store: {
      add(obj) {
        stampedObj = obj;
      }
    },
    toast() {},
    saveSoon() {}
  };

  // 7a. Function Grapher stamping
  const grapher = new FunctionGrapherModal(mockApp);
  grapher.canvas = {
    toDataURL() { return 'data:image/png;base64,graph'; }
  };
  grapher.stampToCanvas();

  assert.ok(stampedObj, 'Function graph was stamped');
  assert.equal(stampedObj.type, 'image');
  assert.equal(stampedObj.w, 520);
  assert.equal(stampedObj.h, 360);
  // Center: x = 300 + 1400/2 - 520/2 = 300 + 700 - 260 = 740
  // y = 150 + 900/2 - 360/2 = 150 + 450 - 180 = 420
  assert.equal(stampedObj.x, 740);
  assert.equal(stampedObj.y, 420);
  assert.ok(Number.isFinite(stampedObj.t), 'Invariant #2: p.t timestamp preserved');

  // 7b. Circuit Workbench stamping
  stampedObj = null;
  const circuit = new CircuitWorkbenchModal(mockApp);
  circuit.canvas = {
    toDataURL() { return 'data:image/png;base64,circuit'; }
  };
  circuit.stampToWhiteboard();

  assert.ok(stampedObj, 'Circuit workbench snapshot stamped');
  assert.equal(stampedObj.type, 'image');
  assert.equal(stampedObj.w, 700);
  assert.equal(stampedObj.h, 400);
  // Center: x = 300 + 1400/2 - 700/2 = 300 + 700 - 350 = 650
  // y = 150 + 900/2 - 400/2 = 150 + 450 - 200 = 400
  assert.equal(stampedObj.x, 650);
  assert.equal(stampedObj.y, 400);
  assert.ok(Number.isFinite(stampedObj.t), 'Invariant #2: p.t timestamp preserved');
});
