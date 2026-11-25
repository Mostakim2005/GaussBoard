'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { isPathWithin } = require('../src/js/platform/path-security.cjs');
const { resolveCommonLibrariesDir } = require('./global-resources.cjs');

const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
  'unpkg.com'
]);

/**
 * Fallback relative locations inside %LOCALAPPDATA%\SharedLibraries when
 * manifest paths use generic or legacy locations.
 */
const VENDOR_TO_SHARED_REL = {
  'mermaid.min.js': 'mermaid/mermaid.min.js',
  'chart.umd.min.js': 'chartjs/chart.umd.min.js',
  'pdf-lib.min.js': 'pdf-lib/pdf-lib.min.js',
  'rough.js': 'roughjs/rough.js',
  'rough.min.js': 'roughjs/rough.js',
  'mammoth.browser.min.js': 'mammoth/mammoth.browser.min.js',
  'jszip.min.js': 'jszip/jszip.min.js',
  'pdf.min.mjs': 'pdfjs/pdf.min.mjs',
  'pdf.worker.min.mjs': 'pdfjs/pdf.worker.min.mjs',
  'pdf_viewer.mjs': 'pdfjs/pdf_viewer.mjs',
  '3Dmol-min.js': '3dmol/3Dmol-min.js',
  'function-plot.js': 'function-plot/function-plot.js',
  'math.min.js': 'mathjs/math.min.js',
  'fontkit.umd.min.js': 'fontkit/fontkit.umd.min.js',
  'mp4-muxer.mjs': 'mp4-muxer/mp4-muxer.mjs',
  'nerdamer/nerdamer.core.js': 'nerdamer/nerdamer.core.js',
  'tesseract/tesseract.min.js': 'tesseract/tesseract.min.js'
};

function isAllowedDownloadUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' && ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return null;
}

/**
 * Merge local repo catalog with global SharedLibraries manifest so new
 * downloadable libraries (like roughjs) appear alongside user-installed entries.
 */
function loadMergedManifest(srcRoot) {
  const sharedDir = resolveCommonLibrariesDir();
  const commonPath = path.join(sharedDir, 'libraries.json');
  const localPath = path.join(srcRoot, 'vendor', 'libraries.json');
  const common = readJsonSafe(commonPath);
  const local = readJsonSafe(localPath);
  const base = common || local;
  if (!base) return null;

  const byId = new Map();
  const order = [];
  for (const lib of common?.libraries || []) {
    if (!lib?.id) continue;
    byId.set(lib.id, { ...lib });
    order.push(lib.id);
  }
  for (const lib of local?.libraries || []) {
    if (!lib?.id) continue;
    if (byId.has(lib.id)) {
      const existing = byId.get(lib.id);
      byId.set(lib.id, {
        ...lib,
        ...existing,
        downloadUrl: existing.downloadUrl || lib.downloadUrl || null,
        sharedRelPath: existing.sharedRelPath || lib.sharedRelPath || null,
        sizeLabel: existing.sizeLabel || lib.sizeLabel || null,
        optional: existing.optional ?? lib.optional ?? true
      });
    } else {
      byId.set(lib.id, { ...lib });
      order.push(lib.id);
    }
  }

  const rootDir = path.dirname(srcRoot);
  const libraries = order.map((id) => {
    const lib = { ...byId.get(id) };
    const sharedRel = lib.sharedRelPath || VENDOR_TO_SHARED_REL[(lib.bundledPath || '').replace(/^src\/vendor\//, '')] || null;
    const candidateShared = lib.sharedPath && !/^[A-Za-z]:\\/.test(lib.sharedPath)
      ? path.join(sharedDir, lib.sharedPath)
      : (sharedRel ? path.join(sharedDir, sharedRel) : lib.sharedPath);
    const actualSharedPath = (lib.sharedPath && fs.existsSync(lib.sharedPath))
      ? lib.sharedPath
      : (candidateShared && fs.existsSync(candidateShared) ? candidateShared : (candidateShared || lib.sharedPath || null));
    const sharedExists = !!(actualSharedPath && fs.existsSync(actualSharedPath));
    const bundledFull = lib.bundledPath ? path.join(rootDir, lib.bundledPath) : null;
    const bundledExists = !!(bundledFull && fs.existsSync(bundledFull));

    lib.sharedRelPath = sharedRel;
    lib.sharedPath = actualSharedPath;
    lib.sharedExists = sharedExists;
    lib.bundledExists = bundledExists;
    lib.bundledInApp = bundledExists;
    lib.canDownload = isAllowedDownloadUrl(lib.downloadUrl);
    lib.available = bundledExists || sharedExists;
    lib.status = lib.available ? 'ready' : 'missing';
    return lib;
  });

  return {
    ...base,
    rootPath: sharedDir,
    libraries
  };
}

/**
 * Resolve a /shared-lib/<rel> or /vendor/<rel> request safely inside SharedLibraries.
 */
function resolveSharedLibraryFile(relPath) {
  const cleanRel = String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/');
  if (!cleanRel || cleanRel.includes('..')) return null;
  const sharedDir = resolveCommonLibrariesDir();
  const mappedRel = VENDOR_TO_SHARED_REL[cleanRel] || cleanRel;
  for (const candidateRel of [cleanRel, mappedRel]) {
    const target = path.resolve(sharedDir, candidateRel);
    if (isPathWithin(sharedDir, target) && fs.existsSync(target) && fs.statSync(target).isFile()) {
      return target;
    }
  }
  return null;
}

/**
 * Inspect manifest and summarize ready vs missing optional libraries.
 */
function checkLibraryAvailability(srcRoot) {
  const manifest = loadMergedManifest(srcRoot);
  if (!manifest) return { ok: false, rootPath: resolveCommonLibrariesDir(), missing: [], ready: [], libraries: [] };
  const missing = manifest.libraries.filter((l) => !l.available && l.canDownload);
  const ready = manifest.libraries.filter((l) => l.available);
  return {
    ok: true,
    rootPath: manifest.rootPath,
    missingIds: missing.map((l) => l.id),
    missing,
    ready,
    libraries: manifest.libraries
  };
}

/**
 * Download requested libraries from allowlisted HTTPS CDN URLs directly into SharedLibraries.
 */
async function downloadLibraries(srcRoot, ids = [], onProgress = null) {
  const manifest = loadMergedManifest(srcRoot);
  if (!manifest) return { ok: false, error: 'Manifest unavailable', results: [] };
  const sharedDir = manifest.rootPath || resolveCommonLibrariesDir();
  await fsp.mkdir(sharedDir, { recursive: true });

  const wantedSet = new Set(Array.isArray(ids) && ids.length ? ids : manifest.libraries.filter((l) => !l.available && l.canDownload).map((l) => l.id));
  const targets = manifest.libraries.filter((l) => wantedSet.has(l.id));
  const results = [];

  for (let idx = 0; idx < targets.length; idx++) {
    const lib = targets[idx];
    if (!isAllowedDownloadUrl(lib.downloadUrl)) {
      results.push({ id: lib.id, ok: false, error: 'No verified download URL configured' });
      continue;
    }
    const rel = lib.sharedRelPath || `${lib.id}/${path.basename(new URL(lib.downloadUrl).pathname)}`;
    const dest = path.resolve(sharedDir, rel);
    if (!isPathWithin(sharedDir, dest)) {
      results.push({ id: lib.id, ok: false, error: 'Unsafe destination path' });
      continue;
    }
    try {
      if (typeof onProgress === 'function') {
        onProgress({ id: lib.id, name: lib.name, index: idx + 1, total: targets.length, phase: 'downloading' });
      }
      const res = await fetch(lib.downloadUrl, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ctype = (res.headers.get('content-type') || '').toLowerCase();
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new Error('Empty payload');
      if (ctype.includes('text/html')) throw new Error('Unexpected HTML response instead of library payload');
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmp, buf);
      await fsp.rename(tmp, dest);
      results.push({ id: lib.id, ok: true, path: dest, bytes: buf.length });
      if (typeof onProgress === 'function') {
        onProgress({ id: lib.id, name: lib.name, index: idx + 1, total: targets.length, phase: 'done', bytes: buf.length });
      }
    } catch (err) {
      results.push({ id: lib.id, ok: false, error: err?.message || 'Download failed' });
      if (typeof onProgress === 'function') {
        onProgress({ id: lib.id, name: lib.name, index: idx + 1, total: targets.length, phase: 'error', error: err?.message });
      }
    }
  }

  // Persist updated shared libraries index (UTF-8 without BOM) when downloads succeeded
  if (results.some((r) => r.ok)) {
    try {
      const commonManifestPath = path.join(sharedDir, 'libraries.json');
      const existing = readJsonSafe(commonManifestPath) || {
        manifestVersion: manifest.manifestVersion || '1.1.0',
        rootPath: sharedDir,
        libraries: []
      };
      const mergedList = Array.isArray(existing.libraries) ? [...existing.libraries] : [];
      for (const r of results) {
        if (!r.ok) continue;
        const srcEntry = targets.find((t) => t.id === r.id);
        const idx = mergedList.findIndex((x) => x && x.id === r.id);
        const updatedEntry = {
          ...(idx >= 0 ? mergedList[idx] : srcEntry),
          sharedPath: r.path,
          sharedRelPath: srcEntry?.sharedRelPath || undefined,
          status: 'ready'
        };
        delete updatedEntry.sharedExists;
        delete updatedEntry.bundledExists;
        delete updatedEntry.available;
        delete updatedEntry.canDownload;
        if (idx >= 0) mergedList[idx] = updatedEntry;
        else mergedList.push(updatedEntry);
      }
      existing.rootPath = sharedDir;
      existing.updatedAt = new Date().toISOString();
      existing.libraries = mergedList;
      const tmpJson = `${commonManifestPath}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmpJson, JSON.stringify(existing, null, 2), 'utf8');
      await fsp.rename(tmpJson, commonManifestPath);
    } catch {}
  }

  return {
    ok: results.every((r) => r.ok),
    manifest: loadMergedManifest(srcRoot),
    results
  };
}

module.exports = {
  ALLOWED_DOWNLOAD_HOSTS,
  VENDOR_TO_SHARED_REL,
  isAllowedDownloadUrl,
  loadMergedManifest,
  resolveSharedLibraryFile,
  checkLibraryAvailability,
  downloadLibraries
};
