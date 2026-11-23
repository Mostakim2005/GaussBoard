'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const { resolveCommonLibrariesDir, resolveEcosystemRegistry } = require('./global-resources.cjs');

function resolveNgspiceWasmPath() {
  if (process.env.GAUSSBOARD_NGSPICE_WASM && fs.existsSync(process.env.GAUSSBOARD_NGSPICE_WASM)) {
    return {
      available: true,
      entryPath: process.env.GAUSSBOARD_NGSPICE_WASM,
      sharedDir: resolveCommonLibrariesDir()
    };
  }

  const sharedDir = resolveCommonLibrariesDir();
  const manifestPath = path.join(sharedDir, 'libraries.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const entry = Array.isArray(manifest?.libraries)
        ? manifest.libraries.find((l) => l && l.id === 'ngspice-wasm')
        : null;
      if (entry?.sharedPath && fs.existsSync(entry.sharedPath)) {
        return { available: true, entryPath: entry.sharedPath, sharedDir };
      }
    } catch {}
  }

  const baseDir = path.join(sharedDir, 'ngspice-wasm');
  const candidates = ['eecircuit-engine.mjs', 'ngspice.mjs', 'ngspice.js', 'index.mjs', 'spice.js'];
  for (const name of candidates) {
    const candidate = path.join(baseDir, name);
    if (fs.existsSync(candidate)) {
      return { available: true, entryPath: candidate, sharedDir };
    }
  }

  return { available: false, entryPath: null, sharedDir };
}

function resolveTinaExecutable() {
  if (process.env.TINA_TI_EXE && fs.existsSync(process.env.TINA_TI_EXE)) {
    return process.env.TINA_TI_EXE;
  }
  const reg = resolveEcosystemRegistry();
  const regExe = reg?.data?.apps?.tinaTi?.executable;
  if (typeof regExe === 'string' && regExe && fs.existsSync(regExe)) {
    return regExe;
  }
  return null;
}

function getSpiceRuntimeStatus() {
  const ngspice = resolveNgspiceWasmPath();
  const tinaExe = resolveTinaExecutable();
  return {
    ngspice,
    tina: {
      available: !!tinaExe,
      executable: tinaExe
    }
  };
}

async function launchTinaTi({ netlist, filePath, filename = 'gaussboard_circuit.cir' } = {}) {
  let cirPath = filePath && fs.existsSync(filePath) ? filePath : null;
  if (!cirPath && typeof netlist === 'string' && netlist.trim()) {
    const base = path.basename(String(filename || 'gaussboard_circuit.cir')).replace(/[<>:"/\\|?*]/g, '_');
    const safeName = base.toLowerCase().endsWith('.cir') ? base : `${base}.cir`;
    cirPath = path.join(os.tmpdir(), safeName);
    const tmp = `${cirPath}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmp, netlist, 'utf8');
    await fsp.rename(tmp, cirPath);
  }

  const exe = resolveTinaExecutable();
  if (!exe) {
    return { ok: false, error: 'TI TINA executable not found', cirPath };
  }

  try {
    const child = cp.spawn(exe, cirPath ? [cirPath] : [], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true, executable: exe, cirPath };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to launch TI TINA', cirPath };
  }
}

module.exports = {
  resolveNgspiceWasmPath,
  resolveTinaExecutable,
  getSpiceRuntimeStatus,
  launchTinaTi
};
