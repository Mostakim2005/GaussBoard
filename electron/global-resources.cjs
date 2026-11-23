'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Zero-context global shared libraries discovery order:
 * 1. Explicit env override: LOCAL_COMMON_LIBRARIES or SHARED_LIBRARIES_DIR
 * 2. Standard cross-app user paths: %LOCALAPPDATA%/SharedLibraries, ~/.local/share/common-libraries
 * 3. Machine-wide Windows path: C:/ProgramData/LocalEcosystem/CommonLibraries
 * 4. Legacy fallback: ~/Documents/Antigravity/CommonLibraries
 */
function candidateCommonLibrariesDirs() {
  const dirs = [];
  if (process.env.LOCAL_COMMON_LIBRARIES) dirs.push(process.env.LOCAL_COMMON_LIBRARIES);
  if (process.env.SHARED_LIBRARIES_DIR) dirs.push(process.env.SHARED_LIBRARIES_DIR);
  if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'SharedLibraries'));
  dirs.push(path.join(os.homedir(), '.local', 'share', 'common-libraries'));
  if (process.platform === 'win32') {
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    dirs.push(path.join(programData, 'LocalEcosystem', 'CommonLibraries'));
  }
  dirs.push(path.join(os.homedir(), 'Documents', 'Antigravity', 'CommonLibraries'));
  return [...new Set(dirs.map((d) => path.resolve(d)))];
}

function resolveCommonLibrariesDir() {
  const candidates = candidateCommonLibrariesDirs();
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'libraries.json'))) return dir;
  }
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  // Prefer standard zero-context user path when none exist yet
  return process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'SharedLibraries')
    : path.join(os.homedir(), '.local', 'share', 'common-libraries');
}

function resolveEcosystemRegistry() {
  const candidates = [
    process.env.LOCAL_ECOSYSTEM_REGISTRY,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'SharedLibraries', 'ecosystem-registry.json') : null,
    path.join(os.homedir(), '.local', 'share', 'ecosystem-registry.json'),
    process.platform === 'win32'
      ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'LocalEcosystem', 'ecosystem-registry.json')
      : null
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return { path: file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
      }
    } catch {}
  }
  return null;
}

function resolveEcosystemSecrets(registryResult) {
  const reg = registryResult || resolveEcosystemRegistry();
  const candidates = [
    process.env.LOCAL_ECOSYSTEM_SECRETS,
    reg?.data?.paths?.secretsFile,
    path.join(os.homedir(), '.local', 'share', 'ecosystem-secrets.json')
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return { path: file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
      }
    } catch {}
  }
  return null;
}

module.exports = {
  candidateCommonLibrariesDirs,
  resolveCommonLibrariesDir,
  resolveEcosystemRegistry,
  resolveEcosystemSecrets
};
