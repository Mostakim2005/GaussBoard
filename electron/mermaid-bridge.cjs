'use strict';

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { resolveEcosystemRegistry } = require('./global-resources.cjs');

const activeWatchers = new Map();

function findMermaidManagerExecutable() {
  if (process.env.MERMAID_MANAGER_EXE && fs.existsSync(process.env.MERMAID_MANAGER_EXE)) {
    return process.env.MERMAID_MANAGER_EXE;
  }
  const reg = resolveEcosystemRegistry();
  const regExe = reg?.data?.apps?.mermaidManager?.executable;
  if (regExe && fs.existsSync(regExe)) return regExe;

  const home = os.homedir();
  const candidates = [
    path.join(home, 'Documents', 'Agentic Harness', 'Mermaid Manager', 'drawio-desktop', 'dist', 'win-unpacked', 'MermaidApp.exe'),
    path.join(home, 'AppData', 'Local', 'Programs', 'MermaidApp', 'MermaidApp.exe'),
    path.join(home, '.local', 'bin', 'drawio.exe'),
    path.join(home, '.local', 'bin', 'cli-anything-drawio.exe')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function openInMermaidManager({ id, code, onUpdated, shellOpenPath }) {
  const safeId = String(id || 'diag').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'diag';
  const tempPath = path.join(os.tmpdir(), `gaussboard_diag_${safeId}.mmd`);
  // Strictly UTF-8 without BOM (Mermaid Manager TRAP 1)
  await fsp.writeFile(tempPath, String(code || ''), { encoding: 'utf8' });

  const prev = activeWatchers.get(safeId);
  if (prev) {
    try { prev.close(); } catch {}
    activeWatchers.delete(safeId);
  }

  let debounce = null;
  const watcher = fs.watch(tempPath, () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      try {
        const updated = await fsp.readFile(tempPath, 'utf8');
        onUpdated?.({ id: safeId, code: updated.replace(/^\uFEFF/, ''), tempPath });
      } catch {}
    }, 180);
  });
  activeWatchers.set(safeId, watcher);

  const exe = findMermaidManagerExecutable();
  if (exe) {
    cp.spawn(exe, [tempPath], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, mode: 'mermaid-manager', executable: exe, tempPath };
  }
  if (typeof shellOpenPath === 'function') {
    await shellOpenPath(tempPath);
    return { ok: true, mode: 'os-default', tempPath };
  }
  return { ok: true, mode: 'temp-only', tempPath };
}

function closeAllWatchers() {
  for (const [, w] of activeWatchers) {
    try { w.close(); } catch {}
  }
  activeWatchers.clear();
}

module.exports = {
  findMermaidManagerExecutable,
  openInMermaidManager,
  closeAllWatchers
};
