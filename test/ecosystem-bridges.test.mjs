import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { generateMarkdownSidecar } from '../src/js/core/markdown-sidecar.js';
import { searchSubtitleCues } from '../src/js/ui/subtitles.js';
import { syncBoardToAnki, generatePracticeEngineBank } from '../src/js/core/anki.js';
import { prepareLocalVideoSource } from '../src/js/insert.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const globalResources = require(path.join(ROOT, 'electron', 'global-resources.cjs'));
const mermaidBridge = require(path.join(ROOT, 'electron', 'mermaid-bridge.cjs'));
const mediaBridge = require(path.join(ROOT, 'electron', 'media-bridge.cjs'));
const triarchyBridge = require(path.join(ROOT, 'electron', 'triarchy-bridge.cjs'));
const cliExport = require(path.join(ROOT, 'electron', 'cli-export.cjs'));

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

test('Phase 2 M12-01: syncBoardToAnki deduplicates via ankiNoteId/updateNoteFields and generates Practice Engine bank', async () => {
  const actions = [];
  const storedNotes = new Map();
  let nextId = 1700000001;

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      actions.push(payload.action);
      let result = null;
      if (payload.action === 'version') {
        result = 6;
      } else if (payload.action === 'createDeck') {
        result = 1;
      } else if (payload.action === 'notesInfo') {
        result = (payload.params?.notes || []).map((id) => (storedNotes.has(id) ? { noteId: id, ...storedNotes.get(id) } : {}));
      } else if (payload.action === 'findNotes') {
        result = [];
      } else if (payload.action === 'addNotes') {
        assert.equal(payload.params.notes.every((n) => n.options?.allowDuplicate === false), true);
        result = payload.params.notes.map((n) => {
          const id = nextId++;
          storedNotes.set(id, n);
          return id;
        });
      } else if (payload.action === 'updateNoteFields') {
        const note = payload.params.note;
        assert.ok(storedNotes.has(note.id));
        storedNotes.set(note.id, { ...storedNotes.get(note.id), fields: note.fields });
        result = null;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result, error: null }));
    });
  });

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;

    const c1 = { id: 'cov_1', type: 'curtain', subtype: 'tape', label: 'KVL', x: 10, y: 10, w: 100, h: 40 };
    const c2 = { id: 'cov_2', type: 'curtain', label: 'Thevenin', x: 20, y: 80, w: 120, h: 60 };
    const t2 = { id: 'txt_2', type: 'text', attachedTo: 'cov_2', text: 'Replace sources with short/open' };
    const objects = [c1, c2, t2];
    const app = {
      store: {
        doc: { id: 'b_ee_202', name: 'EE 202' },
        objects,
        update(id, patch) {
          const target = objects.find((o) => o.id === id);
          if (target) Object.assign(target, patch);
        }
      }
    };

    const first = await syncBoardToAnki(app, { url });
    assert.equal(first.ok, true);
    assert.equal(first.created, 2);
    assert.equal(first.updated, 0);
    assert.equal(first.count, 2);
    assert.equal(c1.ankiNoteId, 1700000001);
    assert.equal(c2.ankiNoteId, 1700000002);
    assert.ok(c1.xrefId && c2.xrefId);

    actions.length = 0;
    c1.label = 'KVL Updated';
    const second = await syncBoardToAnki(app, { url });
    assert.equal(second.ok, true);
    assert.equal(second.created, 0);
    assert.equal(second.updated, 2);
    assert.equal(second.count, 2);
    assert.ok(!actions.includes('addNotes'), 'Re-sync must not call addNotes when ankiNoteId exists');
    assert.ok(actions.includes('notesInfo'));
    assert.ok(actions.includes('updateNoteFields'));
    assert.equal(storedNotes.get(1700000001).fields.Front, 'KVL Updated');

    const bank = generatePracticeEngineBank(app);
    assert.equal(bank.count, 2);
    assert.match(bank.markdown, /source_app: gaussboard/);
    assert.match(bank.markdown, /anki_note_ids: \[1700000001, 1700000002\]/);
    assert.match(bank.markdown, /> \[!question\] Type:: Conceptual/);
    assert.match(bank.markdown, /> > \[!answer\]/);
    assert.match(bank.markdown, /gaussboard:\/\/open\?board=b_ee_202&obj=cov_1/);
    assert.match(bank.markdown, /<!--pe-meta: id=gb_cov_1 .* ankiId=1700000001/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Phase 2 M11-02: prepareLocalVideoSource remuxes .mkv and resolves sibling subtitles from original path', async () => {
  const calls = [];
  const mockBoardApi = {
    async remuxToMp4(p) {
      calls.push({ fn: 'remuxToMp4', p });
      return { ok: true, mp4Path: 'C:\\Temp\\gaussboard_remux_abc123.mp4', cached: false };
    },
    async findSiblingSubtitle(p) {
      calls.push({ fn: 'findSiblingSubtitle', p });
      return { path: 'D:\\Lectures\\L01.srt', ext: '.srt', text: '1\n00:00:00,000 --> 00:00:02,000\nWelcome\n' };
    }
  };

  const prepared = await prepareLocalVideoSource('D:\\Lectures\\L01.mkv', { boardApi: mockBoardApi });
  assert.equal(prepared.remuxed, true);
  assert.equal(prepared.originalPath, 'D:\\Lectures\\L01.mkv');
  assert.equal(prepared.url, 'file:///C:/Temp/gaussboard_remux_abc123.mp4');
  assert.match(prepared.subtitlesText, /Welcome/);
  assert.deepEqual(calls, [
    { fn: 'remuxToMp4', p: 'D:\\Lectures\\L01.mkv' },
    { fn: 'findSiblingSubtitle', p: 'D:\\Lectures\\L01.mkv' }
  ]);
});

function buildDeflatedZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const compressed = zlib.deflateRawSync(raw);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    localParts.push(local, compressed);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }

  const cdBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

test('Phase 2 M12-02: headless CLI inspects ZIP/JSON boards and exports Markdown + JSON Canvas with --json contract', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-cli-'));
  try {
    const sampleDoc = {
      id: 'b_cli_7',
      name: 'Signals & Systems',
      pages: [{ id: 'p1' }, { id: 'p2' }],
      tags: ['ee301'],
      audioTracks: [{ id: 'aud_1', name: 'Lecture 1', durationMs: 45000 }],
      objects: {
        n1: { id: 'n1', type: 'note', text: 'Fourier Transform #laplace', x: 10, y: 20, w: 220, h: 120 },
        c1: { id: 'c1', type: 'curtain', subtype: 'tape', label: 'H(s)', x: 50, y: 180, w: 100, h: 40 }
      }
    };

    const zipPath = path.join(tmp, 'signals.gaussboard');
    fs.writeFileSync(zipPath, buildDeflatedZip([
      { name: 'board.json', data: JSON.stringify(sampleDoc) },
      { name: 'assets/img_1.png', data: Buffer.from([137, 80, 78, 71]) }
    ]));

    const runCapture = async (argv) => {
      let out = '';
      let err = '';
      const code = await cliExport.runCli(argv, {
        stdout: { write: (s) => { out += s; } },
        stderr: { write: (s) => { err += s; } }
      });
      return { code, out, err };
    };

    const insp = await runCapture(['node', 'cli-export.cjs', '--inspect', '--input', zipPath, '--json']);
    assert.equal(insp.code, 0);
    assert.equal(insp.err, '');
    const inspJson = JSON.parse(insp.out.trim());
    assert.equal(inspJson.ok, true);
    assert.equal(inspJson.data.id, 'b_cli_7');
    assert.equal(inspJson.data.format, 'zip');
    assert.equal(inspJson.data.pageCount, 2);
    assert.equal(inspJson.data.objectCount, 2);
    assert.equal(inspJson.data.studyCardCount, 1);
    assert.equal(inspJson.data.audioTrackCount, 1);
    assert.deepEqual(inspJson.data.assets, ['img_1.png']);

    const mdOut = path.join(tmp, 'signals.md');
    const mdRes = await runCapture(['node', 'cli-export.cjs', '--export-md', zipPath, '--out', mdOut, '--json']);
    assert.equal(mdRes.code, 0);
    const mdJson = JSON.parse(mdRes.out.trim());
    assert.equal(mdJson.ok, true);
    const mdBytes = fs.readFileSync(mdOut);
    assert.notEqual(mdBytes[0], 0xEF);
    assert.match(mdBytes.toString('utf8'), /Fourier Transform #laplace/);

    const canvasOut = path.join(tmp, 'signals.canvas');
    const canvasRes = await runCapture(['node', 'cli-export.cjs', '--export-canvas', zipPath, '--out', canvasOut, '--json']);
    assert.equal(canvasRes.code, 0);
    const canvasObj = JSON.parse(fs.readFileSync(canvasOut, 'utf8'));
    assert.equal(canvasObj.nodes.length, 1);
    assert.equal(canvasObj.nodes[0].text, 'Fourier Transform #laplace');

    const missing = await runCapture(['node', 'cli-export.cjs', '--inspect', path.join(tmp, 'missing.gaussboard'), '--json']);
    assert.equal(missing.code, 2);
    const missingJson = JSON.parse(missing.out.trim());
    assert.equal(missingJson.ok, false);
    assert.equal(missingJson.code, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

