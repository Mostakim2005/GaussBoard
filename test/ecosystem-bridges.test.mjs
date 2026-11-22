import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { generateMarkdownSidecar } from '../src/js/core/markdown-sidecar.js';
import { searchSubtitleCues } from '../src/js/ui/subtitles.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const globalResources = require(path.join(ROOT, 'electron', 'global-resources.cjs'));
const mermaidBridge = require(path.join(ROOT, 'electron', 'mermaid-bridge.cjs'));
const mediaBridge = require(path.join(ROOT, 'electron', 'media-bridge.cjs'));
const triarchyBridge = require(path.join(ROOT, 'electron', 'triarchy-bridge.cjs'));

test('Patch 07: global shared libraries resolver honors env override and prunes dead vendor SW entries', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-libs-'));
  try {
    fs.writeFileSync(path.join(tmp, 'libraries.json'), '{"libraries":[]}');
    process.env.LOCAL_COMMON_LIBRARIES = tmp;
    assert.equal(globalResources.resolveCommonLibrariesDir(), path.resolve(tmp));
  } finally {
    delete process.env.LOCAL_COMMON_LIBRARIES;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const sw = fs.readFileSync(path.join(ROOT, 'src', 'sw.js'), 'utf8');
  assert.ok(!sw.includes('./vendor/3Dmol-min.js'));
  assert.ok(!sw.includes('./vendor/nerdamer/nerdamer.core.js'));
  assert.ok(!sw.includes('./vendor/math.min.js'));
  assert.ok(!sw.includes('./vendor/function-plot.js'));
});

test('Patch 08: mermaid-bridge writes UTF-8 without BOM', async () => {
  const res = await mermaidBridge.openInMermaidManager({ id: 'unit_test', code: 'flowchart TD\nA-->B' });
  assert.equal(res.ok, true);
  const raw = fs.readFileSync(res.tempPath);
  assert.notEqual(raw[0], 0xEF, 'Must not write UTF-8 BOM (Mermaid Manager TRAP 1)');
  mermaidBridge.closeAllWatchers();
  fs.rmSync(res.tempPath, { force: true });
});

test('Patch 10: media-bridge finds sibling .srt and searchSubtitleCues filters cues', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-media-'));
  try {
    const vid = path.join(tmp, 'lecture01.mp4');
    const srt = path.join(tmp, 'lecture01.srt');
    fs.writeFileSync(vid, '');
    fs.writeFileSync(srt, '1\n00:00:01,000 --> 00:00:03,000\nKirchhoff Voltage Law\n');
    const found = await mediaBridge.findSiblingSubtitle(vid);
    assert.ok(found && found.ext === '.srt');
    assert.match(found.text, /Kirchhoff/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const hits = searchSubtitleCues([{ start: 0, end: 1000, text: 'Maxwell Equations' }, { start: 1000, end: 2000, text: 'Ohm Law' }], 'maxwell');
  assert.equal(hits.length, 1);
});

test('Patch 11: triarchy deep-link parser & Obsidian Markdown sidecar frontmatter', () => {
  const p1 = triarchyBridge.parseGaussBoardDeepLink('gaussboard://open?board=b_123&obj=o_45&page=2');
  assert.deepEqual(p1, { boardId: 'b_123', objId: 'o_45', page: 2 });
  const p2 = triarchyBridge.parseGaussBoardDeepLink('gazboard://board/legacy_9?obj=x1');
  assert.deepEqual(p2, { boardId: 'legacy_9', objId: 'x1', page: null });
  assert.equal(triarchyBridge.parseGaussBoardDeepLink('gaussboard://open?board=../evil'), null);

  const md = generateMarkdownSidecar({ id: 'b_123', objects: {} }, 'Circuits 101');
  assert.ok(md.includes('source_app: gaussboard'));
  assert.ok(md.includes('board_id: "b_123"'));
  assert.ok(md.includes('deep_link: "gaussboard://open?board=b_123"'));
});

test('Patch 09: cas-sympy finds Python via ecosystem registry & libraries manifest resolves unbundled engines', () => {
  const casSympy = require(path.join(ROOT, 'electron', 'cas-sympy.cjs'));
  const py = casSympy.findPythonExecutable();
  assert.ok(py, 'Python executable must be resolved');
  if (process.platform === 'win32' && py.includes('\\') && fs.existsSync(py)) {
    assert.ok(fs.existsSync(py), `Resolved Python executable must exist on disk: ${py}`);
  }

  const commonDir = globalResources.resolveCommonLibrariesDir();
  const commonPath = path.join(commonDir, 'libraries.json');
  const manifestPath = fs.existsSync(commonPath) ? commonPath : path.join(ROOT, 'src', 'vendor', 'libraries.json');
  assert.ok(fs.existsSync(manifestPath), `Manifest must exist at ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const unbundledIds = ['3dmol', 'nerdamer', 'function-plot', 'mathjs', 'tesseract', 'fontkit'];
  for (const id of unbundledIds) {
    const lib = manifest.libraries.find(l => l.id === id);
    assert.ok(lib, `Library ${id} must exist in manifest`);
    assert.equal(lib.bundledInApp, false, `Library ${id} must have bundledInApp: false`);
    if (fs.existsSync(commonPath)) {
      assert.ok(lib.sharedPath && fs.existsSync(lib.sharedPath), `Library ${id} sharedPath must exist on disk`);
    }
  }
});

