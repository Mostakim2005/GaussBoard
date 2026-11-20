import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('main.js allows app:// mic permissions and serves HTTP 206 ranges on /asset/', () => {
  const src = read('main.js');
  assert.match(src, /setPermissionRequestHandler/);
  assert.match(src, /setPermissionCheckHandler/);
  assert.ok(src.includes("url.startsWith('app://')"));
  assert.match(src, /serveAssetWithRange/);
  assert.match(src, /status:\s*206/);
  assert.match(src, /'Accept-Ranges':\s*'bytes'/);
});

test('contextmenu.js uses html attribute for highlighter icon and updates crop box dimensions', () => {
  const src = read('src/js/ui/contextmenu.js');
  assert.doesNotMatch(src, /h\([^)]*,\s*icon\('highlighter'/);
  assert.match(src, /html:\s*icon\('highlighter',\s*15\)/);
  assert.match(src, /imgObj\.w\s*=\s*Math\.max\(10,\s*curCrop\.sw\s*\*\s*fullW\)/);
  assert.match(src, /imgObj\.h\s*=\s*Math\.max\(10,\s*curCrop\.sh\s*\*\s*fullH\)/);
});

test('pdf.js defaults to JPEG compression while honoring explicit PNG type', () => {
  const src = read('src/js/importers/pdf.js');
  assert.ok(src.includes("const format = type || 'image/jpeg'"));
  assert.ok(src.includes("format === 'image/png' ? undefined"));
});

test('Study Tape uses distinct tape width swatches and readable revealed opacity (TRAP 6)', () => {
  const toolbar = read('src/js/ui/toolbar.js');
  const render = read('src/js/core/render.js');
  assert.match(toolbar, /tapeWidthRow/);
  assert.ok(render.includes('rgba(168, 85, 247, 0.12)'));
  assert.ok(render.includes('setLineDash([6, 5])'));
});

test('video-dialog.js uses single-step inline bookmark form instead of double prompt()', () => {
  const src = read('src/js/ui/video-dialog.js');
  assert.match(src, /vid-bm-inline-form/);
  assert.ok(!src.includes("prompt(t('Enter timestamp"));
});

test('app.js preserves excerpt metadata on paste and prioritizes ungroup on Ctrl+Shift+G', () => {
  const src = read('src/js/app.js');
  assert.match(src, /holdingExcerpt/);
  assert.match(src, /this\.surface\?\.selection\?\.size > 0/);
  assert.ok(!src.includes('window.board?.saveFile'));
});

test('markdown-sidecar.js and library-inspector.js contain no dead saveFile or local Windows paths', () => {
  const sidecar = read('src/js/core/markdown-sidecar.js');
  const libInsp = read('src/js/ui/library-inspector.js');
  assert.ok(!sidecar.includes('window.board?.saveFile'));
  assert.doesNotMatch(libInsp, /C:\\Users\\kazir/i);
});

test('sidebar-ribbon.js and pdf-sidebar.js prefer app.askText over blocking window.prompt()', () => {
  const ribbon = read('src/js/ui/sidebar-ribbon.js');
  const pdfSide = read('src/js/ui/pdf-sidebar.js');
  assert.match(ribbon, /await this\.app\.askText\(/);
  assert.match(pdfSide, /await this\.app\.askText\(/);
});

test('dataview.js escapes column headers and sidebar-ribbon.js escapes HTML output', () => {
  const dv = read('src/js/core/dataview.js');
  const ribbon = read('src/js/ui/sidebar-ribbon.js');
  assert.ok(dv.includes('escapeHtml(String(col).toUpperCase())'));
  assert.match(ribbon, /function escapeHtml\(/);
});

test('ChromeManager coordinates left drawers and Zen Mode, and PdfSidebarDrawer uses theme tokens', () => {
  const cm = read('src/js/ui/chrome-manager.js');
  const pdfSide = read('src/js/ui/pdf-sidebar.js');
  const sw = read('src/sw.js');
  assert.match(cm, /toggleZenMode/);
  assert.match(cm, /notifyLeftOpen/);
  assert.ok(!pdfSide.includes('rgba(18,22,28,0.92)'));
  assert.ok(sw.includes('./js/ui/chrome-manager.js'));
});

test('video-dialog.js wires subtitles.js and anki.js exports valid TSV format', () => {
  const vid = read('src/js/ui/video-dialog.js');
  const anki = read('src/js/core/anki.js');
  assert.ok(vid.includes("from './subtitles.js'"));
  assert.match(vid, /findActiveCue/);
  assert.ok(anki.includes("format: 'anki-tsv'"));
});
