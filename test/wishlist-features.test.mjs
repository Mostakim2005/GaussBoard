import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { Store, boundsOf } from '../src/js/core/store.js';
import { translateObject, scaleObject } from '../src/js/core/transform.js';
import { normalizeKnot, splineBounds, hitSpline, translateSpline, scaleSpline, splineSvg, splineHandleScreenMap } from '../src/js/core/splines.js';
import { shapeRoughSvg } from '../src/js/core/sketchy.js';
import { splitStroke } from '../src/js/core/erase.js';
import { hitObject } from '../src/js/core/hit.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryManager = require(path.join(ROOT, 'electron', 'library-manager.cjs'));

test('SharedLibraries manager resolves moved vendor libraries from shared dir and flags missing ones', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-libmgr-'));
  const prev = process.env.LOCAL_COMMON_LIBRARIES;
  try {
    fs.mkdirSync(path.join(tmp, 'mermaid'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'mermaid', 'mermaid.min.js'), '// mermaid mock');
    fs.writeFileSync(path.join(tmp, 'libraries.json'), JSON.stringify({ manifestVersion: '1.1.0', libraries: [] }));
    process.env.LOCAL_COMMON_LIBRARIES = tmp;

    const resolved = libraryManager.resolveSharedLibraryFile('mermaid.min.js');
    assert.ok(resolved && resolved.endsWith(path.join('mermaid', 'mermaid.min.js')));
    assert.equal(libraryManager.resolveSharedLibraryFile('../etc/passwd'), null);

    const status = libraryManager.checkLibraryAvailability(path.join(ROOT, 'src'));
    assert.equal(status.ok, true);
    const mermaid = status.libraries.find((l) => l.id === 'mermaid');
    const roughjs = status.libraries.find((l) => l.id === 'roughjs');
    assert.equal(mermaid?.status, 'ready');
    assert.equal(mermaid?.bundledInApp, false);
    assert.equal(roughjs?.status, 'missing');
    assert.equal(roughjs?.canDownload, true);
    assert.equal(libraryManager.isAllowedDownloadUrl('https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js'), true);
    assert.equal(libraryManager.isAllowedDownloadUrl('http://evil.example.com/a.js'), false);
  } finally {
    if (prev === undefined) delete process.env.LOCAL_COMMON_LIBRARIES;
    else process.env.LOCAL_COMMON_LIBRARIES = prev;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Editable Bezier Spline geometry, hit testing, transforms, handles, and SVG export', () => {
  const sp = {
    id: 'sp_1',
    type: 'spline',
    closed: false,
    stroke: '#0078d4',
    fill: 'none',
    lineWidth: 4,
    rotation: 0,
    knots: [
      normalizeKnot({ x: 0, y: 0, hOut: { x: 40, y: -30 } }),
      normalizeKnot({ x: 120, y: 0, hIn: { x: 80, y: 30 } })
    ]
  };
  const b = splineBounds(sp);
  assert.ok(b.w >= 120 && b.h > 10);
  assert.equal(hitObject(sp, { x: 0, y: 0 }, 8), true);
  assert.equal(hitObject(sp, { x: 500, y: 500 }, 8), false);

  translateObject(sp, 50, 25);
  assert.equal(sp.knots[0].x, 50);
  assert.equal(sp.knots[0].hOut.x, 90);

  scaleObject(sp, 2, 1, 50, 25);
  assert.equal(sp.knots[1].x, 50 + 240);

  const cam = { toScreen: (x, y) => ({ x, y }) };
  const handles = splineHandleScreenMap(sp, cam);
  assert.ok(handles['sk:0'] && handles['so:0'] && handles['si:1']);

  const svg = splineSvg(sp);
  assert.match(svg, /^<path d="M50\.0 25\.0 C/);
});

test('Sketchy Rough.js SVG generator is deterministic per roughSeed and preserves arrow heads', () => {
  const shape = {
    id: 'sh_rough',
    type: 'shape',
    kind: 'rect',
    x: 20, y: 30, w: 120, h: 80,
    stroke: '#201f1e', fill: '#ffd94a', lineWidth: 3,
    rough: true, roughSeed: 424242, roughness: 1.4
  };
  const s1 = shapeRoughSvg(shape);
  const s2 = shapeRoughSvg(shape);
  const s3 = shapeRoughSvg({ ...shape, roughSeed: 99999 });
  assert.equal(s1, s2, 'Same seed must render identically across slices');
  assert.notEqual(s1, s3, 'Distinct seed must produce distinct sketch variations');
  assert.match(s1, /fill="#ffd94a"/);
});

test('Whiteout stroke splits via partial eraser while preserving p.t timestamps (TRAP 2)', () => {
  const whiteout = {
    id: 'w_1',
    type: 'stroke',
    tool: 'whiteout',
    effect: 'whiteout',
    color: 'paper',
    width: 28,
    points: [
      { x: 0, y: 10, p: 0.5, t: 100 },
      { x: 50, y: 10, p: 0.5, t: 200 },
      { x: 100, y: 10, p: 0.5, t: 300 },
      { x: 150, y: 10, p: 0.5, t: 400 }
    ],
    bbox: { x: 0, y: 10, w: 150, h: 0 },
    rotation: 0
  };
  const pieces = splitStroke(whiteout, { x: 75, y: 0 }, { x: 75, y: 20 }, 12);
  assert.ok(Array.isArray(pieces) && pieces.length === 2, 'Whiteout stroke must split cleanly');
  for (const part of pieces) {
    assert.equal(part.effect, 'whiteout');
    assert.ok(part.points.every((pt) => Number.isFinite(pt.t)), 'Erased whiteout must retain p.t timestamps');
  }
});

test('App command source delegates pane commands cleanly and pauses Multi-Layer Stack', () => {
  const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'js', 'app.js'), 'utf8');
  const toolsSrc = fs.readFileSync(path.join(ROOT, 'src', 'js', 'core', 'tools.js'), 'utf8');
  const productDoc = fs.readFileSync(path.join(ROOT, 'docs', 'PRODUCT.md'), 'utf8');
  assert.match(appSrc, /activePane\(\)/);
  assert.match(appSrc, /checkLibrariesOnStartup\(/);
  assert.match(toolsSrc, /drawCompass\(ctx\)/);
  assert.match(toolsSrc, /startVerticalSpace\(wp\)/);
  assert.match(toolsSrc, /finishSplineDraft\(/);
  assert.ok(!productDoc.includes('drawDraftingTools'), 'Doc drift D3 must be resolved');
});
