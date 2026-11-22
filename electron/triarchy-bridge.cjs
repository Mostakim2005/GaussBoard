'use strict';

const cp = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { resolveEcosystemRegistry } = require('./global-resources.cjs');

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function findObsidianCli() {
  if (process.env.OBSIDIAN_CLI_EXE && fs.existsSync(process.env.OBSIDIAN_CLI_EXE)) {
    return process.env.OBSIDIAN_CLI_EXE;
  }
  const localBin = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'cli-anything-obsidian.exe' : 'cli-anything-obsidian');
  if (fs.existsSync(localBin)) return localBin;
  return null;
}

function resolveObsidianVaultDir() {
  if (process.env.OBSIDIAN_VAULT_DIR && fs.existsSync(process.env.OBSIDIAN_VAULT_DIR)) {
    return process.env.OBSIDIAN_VAULT_DIR;
  }
  const reg = resolveEcosystemRegistry();
  const regVault = reg?.data?.obsidian?.vaultPath;
  if (regVault && fs.existsSync(regVault)) return regVault;

  const nihon = path.join(os.homedir(), 'Documents', 'Obsidian Vaults', 'Nihon');
  if (fs.existsSync(nihon)) return nihon;
  return null;
}

/**
 * Parse gaussboard://open?board=<id>&obj=<objId>&page=<n> or legacy gazboard://board/<id>?obj=<objId>
 */
function parseGaussBoardDeepLink(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ''));
    if (u.protocol !== 'gaussboard:' && u.protocol !== 'gazboard:') return null;
    let boardId = u.searchParams.get('board') || '';
    if (!boardId && u.hostname === 'board') {
      boardId = u.pathname.replace(/^\/+/, '').split('/')[0] || '';
    }
    if (!SAFE_ID.test(boardId)) return null;
    const objId = u.searchParams.get('obj') || null;
    const pageRaw = u.searchParams.get('page');
    const page = pageRaw && /^\d+$/.test(pageRaw) ? Number.parseInt(pageRaw, 10) : null;
    return {
      boardId,
      objId: objId && SAFE_ID.test(objId) ? objId : null,
      page
    };
  } catch {
    return null;
  }
}

/**
 * Sync an interoperable Markdown sidecar or .canvas file into the Obsidian vault
 * (Whiteboards/<filename>), preferring cli-anything-obsidian with atomic disk fallback.
 */
async function syncToObsidianVault({ filename, content, subfolder = 'Whiteboards' }) {
  const safeName = path.basename(String(filename || 'Board.md')).replace(/[<>:"/\\|?*]/g, '_');
  const safeSub = String(subfolder || 'Whiteboards').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Whiteboards';
  const vaultRel = `${safeSub}/${safeName}`;
  const cli = findObsidianCli();

  if (cli && safeName.endsWith('.md')) {
    const viaCli = await new Promise((resolve) => {
      const child = cp.execFile(cli, ['vault', 'update', vaultRel, '--content', String(content || '')], { timeout: 10000 }, (err) => {
        resolve(!err);
      });
      child.on('error', () => resolve(false));
    });
    if (viaCli) return { ok: true, mode: 'cli-anything-obsidian', vaultRel };
  }

  const vaultDir = resolveObsidianVaultDir();
  if (!vaultDir) return { ok: false, error: 'Obsidian vault not found' };

  const targetDir = path.join(vaultDir, safeSub);
  await fsp.mkdir(targetDir, { recursive: true });
  const dest = path.join(targetDir, safeName);
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, String(content || ''), 'utf8');
  await fsp.rename(tmp, dest);
  return { ok: true, mode: 'vault-file', path: dest, vaultRel };
}

module.exports = {
  findObsidianCli,
  resolveObsidianVaultDir,
  parseGaussBoardDeepLink,
  syncToObsidianVault
};
