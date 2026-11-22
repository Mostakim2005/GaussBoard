import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderInlineMarkdown, isMarkdown } from '../src/js/core/markdown.js';
import { evalMathExpression, NotebookVariables, SymbolicCAS } from '../src/js/core/scientific-math.js';
import { balanceChemicalEquation } from '../src/js/core/chemistry.js';
import { DataviewEngine } from '../src/js/core/dataview.js';
import { repeat, State, Rating } from '../src/js/core/fsrs.js';
import { Store } from '../src/js/core/store.js';
import { exportToJsonCanvas, importFromJsonCanvas } from '../src/js/core/json-canvas.js';
import { generateMarkdownSidecar } from '../src/js/core/markdown-sidecar.js';
import { runsToHtml } from '../src/js/core/richtext.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Patch 01: security hardening in sync/node.js, convert.html, diagrams.js, video-dialog.js, pptx.js', () => {
  const syncNode = read('sync/node.js');
  assert.match(syncNode, /envelope\?\.aad\?\.kind !== 'board'/);
  assert.match(syncNode, /envelope\?\.aad\?\.kind !== 'still-paired'/);
  assert.match(syncNode, /envelope\?\.aad\?\.kind === 'unpair'/);

  const convertHtml = read('src/convert.html');
  assert.match(convertHtml, /Content-Security-Policy/);
  assert.match(convertHtml, /desktop-convert\.js/);

  const diagrams = read('src/js/core/diagrams.js');
  assert.match(diagrams, /securityLevel:\s*'strict'/);

  const videoDialog = read('src/js/ui/video-dialog.js');
  assert.match(videoDialog, /e\.origin !== 'https:\/\/www\.youtube-nocookie\.com'/);
  assert.ok(!videoDialog.includes("}), '*');"));

  const pptx = read('src/js/importers/pptx.js');
  assert.match(pptx, /function safeHexColor/);
  assert.match(pptx, /function safeFontFamily/);
});

test('Patch 02: atomic writes, LRU imgCache, loadBoard generation guard, SVG crop export', () => {
  const mainJs = read('main.js');
  assert.match(mainJs, /await fh\.sync\(\)/);
  assert.match(mainJs, /ws\.on\('error'/);

  const renderJs = read('src/js/core/render.js');
  assert.match(renderJs, /MAX_IMG_CACHE/);
  assert.match(renderJs, /export function pruneImageCache/);

  const exportJs = read('src/js/export.js');
  assert.match(exportJs, /clampImageCrop\(o\.crop/);

  const html = runsToHtml([{ t: 'hi', color: 'red" onload="alert(1)' }]);
  assert.ok(!html.includes('onload="alert(1)"'));
});

test('Patch 03: markdown recursion guard & ReDoS safety', () => {
  const deep = '<u>'.repeat(80) + 'safe' + '</u>'.repeat(80);
  assert.doesNotThrow(() => renderInlineMarkdown(deep));

  const t0 = Date.now();
  isMarkdown('['.repeat(50000));
  assert.ok(Date.now() - t0 < 500, 'isMarkdown must not suffer quadratic ReDoS');
});

test('Patch 03: scientific-math supports nth root, log2, nested frac, reactive NotebookVariables, and fast determinant', () => {
  const r1 = evalMathExpression('\\sqrt[3]{27}');
  assert.equal(r1.ok, true);
  assert.ok(Math.abs(r1.numeric - 3) < 1e-6);

  const r2 = evalMathExpression('\\log_{2}(8)');
  assert.equal(r2.ok, true);
  assert.ok(Math.abs(r2.numeric - 3) < 1e-6);

  const r3 = evalMathExpression('\\frac{1}{\\frac{1}{4}}');
  assert.equal(r3.ok, true);
  assert.ok(Math.abs(r3.numeric - 4) < 1e-6);

  const nv = new NotebookVariables();
  nv.set('x', 5);
  nv.set('y', 'x * 3');
  nv.resolveAll();
  assert.equal(nv.get('y'), 15);
  nv.set('x', 10);
  nv.resolveAll();
  assert.equal(nv.get('y'), 30, 'dependent formula must recompute when source variable changes');

  const id10 = Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => (r === c ? 2 : 0)));
  const detRes = SymbolicCAS.matrixDeterminant(id10);
  assert.equal(detRes.ok, true);
  assert.equal(detRes.determinant ?? detRes.result ?? detRes.value, 1024);
});

test('Patch 03: chemistry rejects impossible equations, dataview supports FROM & rejects unknown WHERE', () => {
  assert.throws(() => balanceChemicalEquation('H2 -> O2'));

  const items = [
    { id: '1', type: 'note', text: 'Signal #ee', tags: ['#ee'] },
    { id: '2', type: 'note', text: 'Cells #bio', tags: ['#bio'] }
  ];
  const fromRes = DataviewEngine.execute('TABLE text\nFROM #ee', items);
  assert.equal(fromRes.ok, true);
  assert.equal(fromRes.count, 1);

  const badWhere = DataviewEngine.execute('TABLE text\nWHERE ??? invalid ???', items);
  assert.equal(badWhere.ok, false);
});

test('Patch 03: fsrs Relearning graduation preserves stability; Store.load filters null & __proto__', () => {
  const lapsed = { state: State.Relearning, difficulty: 5, stability: 12.5, reps: 4, lapses: 1, lastReview: Date.now() - 60000 };
  const next = repeat(lapsed, Rating.Good);
  assert.equal(next.state, State.Review);
  assert.equal(next.stability, 12.5);

  const s = new Store();
  s.load({
    id: 'b1',
    name: 'Test',
    objects: [null, { id: '__proto__', type: 'text' }, { id: 'ok1', type: 'text', text: 'hi' }, { id: 'ok1', type: 'text', text: 'dup' }]
  });
  assert.deepEqual(s.doc.order, ['ok1']);
});

test('Patch 03: json-canvas supports Array objects, rect kind, and rejects javascript: URLs; markdown-sidecar fixes page & title', () => {
  const exported = exportToJsonCanvas({
    objects: [
      { id: 'g1', type: 'shape', kind: 'rect', x: 0, y: 0, w: 100, h: 100, text: 'Group' }
    ]
  });
  assert.equal(exported.nodes.length, 1);
  assert.equal(exported.nodes[0].type, 'group');

  const imported = importFromJsonCanvas({
    nodes: [
      { id: 'l1', type: 'link', url: 'javascript:alert(1)', x: 0, y: 0, width: 100, height: 100 },
      { id: 'grp1', type: 'group', label: 'G', x: 0, y: 0, width: 100, height: 100 }
    ],
    edges: []
  });
  const vals = Object.values(imported.objects);
  assert.equal(vals.find((o) => o.type === 'video').url, '');
  assert.equal(vals.find((o) => o.type === 'shape').kind, 'rect');

  const md = generateMarkdownSidecar({
    objects: {
      e1: { type: 'image', isExcerpt: true, excerptSource: { boardName: 'Lecture 1', page: 2 } }
    }
  }, 'Board "A"');
  assert.ok(md.includes('(Page 2)'));
  assert.ok(md.includes('title: "Board \\"A\\""'));
});

test('Patch 04 & 05: index.html CSP/viewport/aria-live, app.css ctxbar & a11y rules, modal-a11y.js', () => {
  const html = read('src/index.html');
  assert.ok(html.includes('http://127.0.0.1:8765'));
  assert.ok(!html.includes('user-scalable=no'));
  assert.match(html, /id="toasts"[^>]*aria-live="polite"/);

  const css = read('src/css/app.css');
  assert.match(css, /#ctxbar\.show\.obsidian-toolbar/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const a11y = read('src/js/ui/modal-a11y.js');
  assert.match(a11y, /export function bindModalA11y/);
});
