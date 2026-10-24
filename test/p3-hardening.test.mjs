import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ACADEMIC_LEXICON, AcademicDictionaryModal } from '../src/js/ui/academic-dictionary.js';
import { TechnicalLinter, applyAcademicTone, calculateReadability, calculateAcademicStyleScore } from '../src/js/core/technical-linter.js';
import { ELEMENTS_DATA, getBohrShells } from '../src/js/ui/periodic-table.js';
import { calculateMolarMass } from '../src/js/core/scientific-math.js';
import { parseFormula, calculateMolarMass as calcMolarMassChem } from '../src/js/core/chemistry.js';
import { Surface } from '../src/js/core/surface.js';

test('P3 Hardening — 1. Academic Dictionary TTS safety and stampCard viewport calculation', () => {
  // Verify database integrity
  assert.ok(Object.keys(ACADEMIC_LEXICON).length >= 50);
  assert.ok(ACADEMIC_LEXICON.analyze);
  assert.ok(Array.isArray(ACADEMIC_LEXICON.analyze.synonyms));

  // Mock app and store for stampCard
  let addedObject = null;
  const mockApp = {
    surface: {
      width: 1024,
      height: 768,
      cam: {
        viewport(w, h) {
          return { x: 100, y: 150, w, h };
        }
      }
    },
    store: {
      add(obj, desc) {
        addedObject = obj;
      }
    },
    toast() {}
  };

  const modal = new AcademicDictionaryModal(mockApp);
  modal.stampCard(ACADEMIC_LEXICON.analyze);

  assert.ok(addedObject, 'Note card was stamped to store');
  assert.equal(typeof addedObject.x, 'number');
  assert.equal(typeof addedObject.y, 'number');
  assert.ok(!Number.isNaN(addedObject.x), 'x coordinate is finite and not NaN');
  assert.ok(!Number.isNaN(addedObject.y), 'y coordinate is finite and not NaN');
  assert.equal(addedObject.x, (100 + 1024 / 2) - 180);
  assert.equal(addedObject.y, (150 + 768 / 2) - 120);
});

test('P3 Hardening — 2. Technical Linter & Academic Tone protects LaTeX equations and code blocks', () => {
  // Text with embedded LaTeX equation and inline code
  const textWithMath = 'We compute $\\int_{0}^{1} f(x) dx$ in order to verify that $\\big( x \\big)$ is big.';
  const issues = TechnicalLinter.lint(textWithMath);

  // Issues should only detect "in order to" and the outer "big", never inside math equations
  const mathIssues = issues.filter((i) => i.match.includes('\\int') || i.match.includes('\\big'));
  assert.equal(mathIssues.length, 0, 'No false positives detected inside LaTeX equations');

  // Academic tone replacement should not mangle LaTeX math \big(
  const elevated = applyAcademicTone(textWithMath);
  assert.ok(elevated.includes('$\\big( x \\big)$'), 'LaTeX $\\big( x \\big)$ was preserved intact without tone corruption');
  assert.ok(!elevated.includes('\\substantial('), 'LaTeX \\big( was not transformed to \\substantial(');

  // Flesch readability should calculate finite grade and score
  const readRes = calculateReadability(textWithMath);
  assert.ok(Number.isFinite(readRes.score));
  assert.ok(Number.isFinite(readRes.grade));
  assert.ok(readRes.words > 0);
  assert.ok(readRes.sentences > 0);
});

test('P3 Hardening — 3. Readability & Style Scoring handles zero words and edge cases cleanly', () => {
  const emptyRes = calculateReadability('');
  assert.equal(emptyRes.score, 100);
  assert.equal(emptyRes.words, 0);

  const punctOnly = calculateReadability('... ??? !!!');
  assert.equal(punctOnly.score, 100);

  const styleEmpty = calculateAcademicStyleScore('');
  assert.equal(styleEmpty.score, 100);
  assert.equal(styleEmpty.rating, 'Exemplary');
});

test('P3 Hardening — 4. Periodic Table contains all 118 elements and Bohr shells handles edge cases', () => {
  assert.equal(ELEMENTS_DATA.length, 118, 'Periodic table contains exactly 118 elements');
  assert.equal(ELEMENTS_DATA[0].s, 'H');
  assert.equal(ELEMENTS_DATA[117].s, 'Og');
  assert.equal(ELEMENTS_DATA[117].z, 118);

  // Bohr shells edge cases
  assert.deepEqual(getBohrShells(0), [0]);
  assert.deepEqual(getBohrShells(-5), [0]);
  assert.deepEqual(getBohrShells(1), [1]);
  assert.deepEqual(getBohrShells(26), [2, 8, 14, 2]);
  assert.ok(Array.isArray(getBohrShells(118)));
});

test('P3 Hardening — 5. Chemical Formula & Molar Mass handles hydration symbols and invalid brackets', () => {
  // Standard hydration dot (middle dot · and bullet • and *)
  const res1 = calculateMolarMass('CuSO4*5H2O');
  assert.equal(res1.ok, true);
  assert.ok(Math.abs(res1.molarMass - 249.68) < 0.2);

  const res2 = calculateMolarMass('CuSO4·5H2O');
  assert.equal(res2.ok, true);
  assert.equal(res2.molarMass, res1.molarMass);

  const res3 = calculateMolarMass('CuSO4•5H2O');
  assert.equal(res3.ok, true);
  assert.equal(res3.molarMass, res1.molarMass);

  // Unbalanced brackets should fail gracefully without throwing uncaught exceptions
  const errRes1 = calculateMolarMass('Ca(OH');
  assert.equal(errRes1.ok, false);

  const errRes2 = calculateMolarMass('CaOH)2');
  assert.equal(errRes2.ok, false);

  const errRes3 = calculateMolarMass('Ca[OH)2');
  assert.equal(errRes3.ok, false);

  // Chemistry module parseFormula
  const chemCounts = parseFormula('CuSO4·5H2O');
  assert.equal(chemCounts.Cu, 1);
  assert.equal(chemCounts.S, 1);
  assert.equal(chemCounts.O, 9); // 4 + 5
  assert.equal(chemCounts.H, 10); // 5 * 2

  // Unbalanced paren in chemistry parseFormula
  const brokenCounts = parseFormula('CaOH)2');
  assert.ok(typeof brokenCounts === 'object');
});

test('P3 Hardening — 6. Laser Trail Duration correctly respects custom setting life in Surface', () => {
  assert.equal(Surface.LASER_LIFE, 520);

  const surfaceCtx = {
    laser: [],
    app: {
      settings: {
        laserTrailDuration: 2500
      }
    }
  };

  const now = performance.now();
  surfaceCtx.laser = [
    { x: 10, y: 10, t: now - 1000 },
    { x: 20, y: 20, t: now - 500 }
  ];

  // With duration = 2500ms, points 1000ms old must NOT be pruned
  Surface.prototype.pruneLaser.call(surfaceCtx);
  assert.equal(surfaceCtx.laser.length, 2, 'Points under 2500ms are preserved');

  // With duration = 300ms, points 500ms and 1000ms old must be pruned
  surfaceCtx.app.settings.laserTrailDuration = 300;
  Surface.prototype.pruneLaser.call(surfaceCtx);
  assert.equal(surfaceCtx.laser.length, 0, 'Points over 300ms are pruned');
});
