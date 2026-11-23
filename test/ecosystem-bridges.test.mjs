import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
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

test('Phase 1 M11-01/M11-03: resolveObsidianVaultDir reads apps.obsidian.vaultPath and deepLinkFromArgv extracts valid links', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-reg-vault-'));
  const prevReg = process.env.LOCAL_ECOSYSTEM_REGISTRY;
  const prevVault = process.env.OBSIDIAN_VAULT_DIR;
  try {
    const vaultDir = path.join(tmp, 'NihonVault');
    fs.mkdirSync(vaultDir, { recursive: true });
    const regFile = path.join(tmp, 'ecosystem-registry.json');
    fs.writeFileSync(regFile, JSON.stringify({
      schemaVersion: 2,
      apps: { obsidian: { vaultPath: vaultDir, whiteboardsSubfolder: 'Whiteboards' } }
    }), 'utf8');

    delete process.env.OBSIDIAN_VAULT_DIR;
    process.env.LOCAL_ECOSYSTEM_REGISTRY = regFile;
    assert.equal(triarchyBridge.resolveObsidianVaultDir(), vaultDir);

    assert.deepEqual(
      triarchyBridge.deepLinkFromArgv(['GaussBoard.exe', '--flag', 'gaussboard://open?board=b_99&obj=o_7&page=3']),
      { boardId: 'b_99', objId: 'o_7', page: 3 }
    );
    assert.deepEqual(
      triarchyBridge.deepLinkFromArgv(['GaussBoard.exe', 'gazboard://board/legacy_5?obj=x2']),
      { boardId: 'legacy_5', objId: 'x2', page: null }
    );
    assert.equal(triarchyBridge.deepLinkFromArgv(['GaussBoard.exe', 'gaussboard://open?board=../bad']), null);
  } finally {
    if (prevReg === undefined) delete process.env.LOCAL_ECOSYSTEM_REGISTRY;
    else process.env.LOCAL_ECOSYSTEM_REGISTRY = prevReg;
    if (prevVault === undefined) delete process.env.OBSIDIAN_VAULT_DIR;
    else process.env.OBSIDIAN_VAULT_DIR = prevVault;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Phase 1 M11-03: syncToObsidianVault sends >40KB Markdown over HTTP (:27125 contract) without Origin header', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-obs-http-'));
  const prevReg = process.env.LOCAL_ECOSYSTEM_REGISTRY;
  const prevSecrets = process.env.LOCAL_ECOSYSTEM_SECRETS;
  const prevUrl = process.env.OBSIDIAN_AGENT_MANAGER_URL;
  const prevToken = process.env.OBSIDIAN_AGENT_MANAGER_TOKEN;
  const prevVault = process.env.OBSIDIAN_VAULT_DIR;

  let received = null;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      received = {
        method: req.method,
        url: req.url,
        auth: req.headers.authorization,
        origin: req.headers.origin,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, vaultPath: received.body.path, created: true }));
    });
  });

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const apiUrl = `http://127.0.0.1:${addr.port}`;

    const regFile = path.join(tmp, 'ecosystem-registry.json');
    const secFile = path.join(tmp, 'ecosystem-secrets.json');
    fs.writeFileSync(regFile, JSON.stringify({
      schemaVersion: 2,
      paths: { secretsFile: secFile },
      services: { obsidianAgentManager: { url: apiUrl } },
      apps: { obsidian: { vaultPath: tmp, whiteboardsSubfolder: 'Whiteboards' } }
    }), 'utf8');
    fs.writeFileSync(secFile, JSON.stringify({
      tokens: { obsidianAgentManager: 'test-token-123' }
    }), 'utf8');

    delete process.env.OBSIDIAN_AGENT_MANAGER_URL;
    delete process.env.OBSIDIAN_AGENT_MANAGER_TOKEN;
    delete process.env.OBSIDIAN_VAULT_DIR;
    process.env.LOCAL_ECOSYSTEM_REGISTRY = regFile;
    process.env.LOCAL_ECOSYSTEM_SECRETS = secFile;

    const largeContent = '# Large Board\n' + 'A'.repeat(42 * 1024);
    const res = await triarchyBridge.syncToObsidianVault({
      filename: 'LargeBoard.md',
      content: largeContent
    });

    assert.equal(res.ok, true);
    assert.equal(res.mode, 'obsidian-agent-manager');
    assert.equal(res.vaultRel, 'Whiteboards/LargeBoard.md');
    assert.ok(received);
    assert.equal(received.method, 'POST');
    assert.equal(received.url, '/note/create');
    assert.equal(received.auth, 'Bearer test-token-123');
    assert.equal(received.origin, undefined);
    assert.equal(received.body.path, 'Whiteboards/LargeBoard.md');
    assert.equal(received.body.overwrite, true);
    assert.equal(received.body.content, largeContent);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (prevReg === undefined) delete process.env.LOCAL_ECOSYSTEM_REGISTRY;
    else process.env.LOCAL_ECOSYSTEM_REGISTRY = prevReg;
    if (prevSecrets === undefined) delete process.env.LOCAL_ECOSYSTEM_SECRETS;
    else process.env.LOCAL_ECOSYSTEM_SECRETS = prevSecrets;
    if (prevUrl === undefined) delete process.env.OBSIDIAN_AGENT_MANAGER_URL;
    else process.env.OBSIDIAN_AGENT_MANAGER_URL = prevUrl;
    if (prevToken === undefined) delete process.env.OBSIDIAN_AGENT_MANAGER_TOKEN;
    else process.env.OBSIDIAN_AGENT_MANAGER_TOKEN = prevToken;
    if (prevVault === undefined) delete process.env.OBSIDIAN_VAULT_DIR;
    else process.env.OBSIDIAN_VAULT_DIR = prevVault;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Phase 1 M11-03: syncToObsidianVault falls back to atomic UTF-8 (no BOM) vault write when HTTP is offline or for .canvas', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-obs-disk-'));
  const prevReg = process.env.LOCAL_ECOSYSTEM_REGISTRY;
  const prevSecrets = process.env.LOCAL_ECOSYSTEM_SECRETS;
  const prevUrl = process.env.OBSIDIAN_AGENT_MANAGER_URL;
  const prevToken = process.env.OBSIDIAN_AGENT_MANAGER_TOKEN;
  const prevVault = process.env.OBSIDIAN_VAULT_DIR;

  try {
    const regFile = path.join(tmp, 'ecosystem-registry.json');
    fs.writeFileSync(regFile, JSON.stringify({
      schemaVersion: 2,
      services: { obsidianAgentManager: { url: 'http://127.0.0.1:1' } },
      apps: { obsidian: { vaultPath: tmp, whiteboardsSubfolder: 'Whiteboards' } }
    }), 'utf8');

    delete process.env.OBSIDIAN_VAULT_DIR;
    process.env.LOCAL_ECOSYSTEM_REGISTRY = regFile;
    process.env.OBSIDIAN_AGENT_MANAGER_URL = 'http://127.0.0.1:1';
    process.env.OBSIDIAN_AGENT_MANAGER_TOKEN = 'offline-token';

    const largeMd = '# Offline Fallback\n' + 'B'.repeat(42 * 1024);
    const mdRes = await triarchyBridge.syncToObsidianVault({ filename: 'OfflineLarge.md', content: largeMd });
    assert.equal(mdRes.ok, true);
    assert.equal(mdRes.mode, 'vault-file');
    const mdRaw = fs.readFileSync(mdRes.path);
    assert.notEqual(mdRaw[0], 0xEF, 'Vault fallback file must not contain UTF-8 BOM');
    assert.equal(mdRaw.toString('utf8'), largeMd);

    const canvasBody = JSON.stringify({ nodes: [], edges: [] });
    const canvasRes = await triarchyBridge.syncToObsidianVault({ filename: 'Board.canvas', content: canvasBody });
    assert.equal(canvasRes.ok, true);
    assert.equal(canvasRes.mode, 'vault-file');
    assert.equal(fs.readFileSync(canvasRes.path, 'utf8'), canvasBody);
  } finally {
    if (prevReg === undefined) delete process.env.LOCAL_ECOSYSTEM_REGISTRY;
    else process.env.LOCAL_ECOSYSTEM_REGISTRY = prevReg;
    if (prevSecrets === undefined) delete process.env.LOCAL_ECOSYSTEM_SECRETS;
    else process.env.LOCAL_ECOSYSTEM_SECRETS = prevSecrets;
    if (prevUrl === undefined) delete process.env.OBSIDIAN_AGENT_MANAGER_URL;
    else process.env.OBSIDIAN_AGENT_MANAGER_URL = prevUrl;
    if (prevToken === undefined) delete process.env.OBSIDIAN_AGENT_MANAGER_TOKEN;
    else process.env.OBSIDIAN_AGENT_MANAGER_TOKEN = prevToken;
    if (prevVault === undefined) delete process.env.OBSIDIAN_VAULT_DIR;
    else process.env.OBSIDIAN_VAULT_DIR = prevVault;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Phase 1 M11-03 & M11-02: findFfmpegExecutable reads registry toolchains.ffmpeg and visualization-dialog enforces i18n/cleanup', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-ffmpeg-'));
  const prevReg = process.env.LOCAL_ECOSYSTEM_REGISTRY;
  const prevFfmpeg = process.env.GAUSSBOARD_FFMPEG;
  try {
    const fakeFfmpeg = path.join(tmp, 'ffmpeg-custom.exe');
    fs.writeFileSync(fakeFfmpeg, '');
    const regFile = path.join(tmp, 'ecosystem-registry.json');
    fs.writeFileSync(regFile, JSON.stringify({
      schemaVersion: 2,
      toolchains: { ffmpeg: fakeFfmpeg }
    }), 'utf8');

    delete process.env.GAUSSBOARD_FFMPEG;
    process.env.LOCAL_ECOSYSTEM_REGISTRY = regFile;
    assert.equal(mediaBridge.findFfmpegExecutable(), fakeFfmpeg);
  } finally {
    if (prevReg === undefined) delete process.env.LOCAL_ECOSYSTEM_REGISTRY;
    else process.env.LOCAL_ECOSYSTEM_REGISTRY = prevReg;
    if (prevFfmpeg === undefined) delete process.env.GAUSSBOARD_FFMPEG;
    else process.env.GAUSSBOARD_FFMPEG = prevFfmpeg;
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const vizSrc = fs.readFileSync(path.join(ROOT, 'src', 'js', 'ui', 'visualization-dialog.js'), 'utf8');
  assert.ok(vizSrc.includes("t('Edit in Mermaid Manager')"), 'visualization-dialog must translate Edit in Mermaid Manager');
  assert.ok(vizSrc.includes('#vizCodeTextarea'), 'visualization-dialog must target #vizCodeTextarea on Mermaid update');
  assert.ok(!vizSrc.includes('#vizCodeInput'), 'visualization-dialog must not reference nonexistent #vizCodeInput');
  assert.ok(vizSrc.includes('this._unsubMermaidMgr()'), 'visualization-dialog must clean up _unsubMermaidMgr listener');
});

