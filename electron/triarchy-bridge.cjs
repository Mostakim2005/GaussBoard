'use strict';

const fs = require('fs');
const fsp = fs.promises;
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { resolveEcosystemRegistry, resolveEcosystemSecrets, getEcosystemServices } = require('./global-resources.cjs');
const { findMermaidManagerExecutable } = require('./mermaid-bridge.cjs');
const { getSpiceRuntimeStatus } = require('./spice-bridge.cjs');

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
  const regVault = reg?.data?.apps?.obsidian?.vaultPath || reg?.data?.obsidian?.vaultPath;
  if (regVault && fs.existsSync(regVault)) return regVault;

  const nihon = path.join(os.homedir(), 'Documents', 'Obsidian Vaults', 'Nihon');
  if (fs.existsSync(nihon)) return nihon;
  return null;
}

function resolveObsidianApiConfig() {
  const reg = resolveEcosystemRegistry();
  const secrets = resolveEcosystemSecrets(reg);
  const rawUrl = process.env.OBSIDIAN_AGENT_MANAGER_URL
    || reg?.data?.services?.obsidianAgentManager?.url
    || reg?.data?.services?.obsidianRestApi?.url
    || 'http://127.0.0.1:27125';
  const url = String(rawUrl).replace(/\/+$/, '');
  const token = process.env.OBSIDIAN_AGENT_MANAGER_TOKEN
    || secrets?.data?.tokens?.obsidianAgentManager
    || secrets?.data?.tokens?.obsidianRestApi
    || null;
  return { url, token };
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

function deepLinkFromArgv(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (/^(gaussboard|gazboard):\/\//i.test(arg)) {
      const parsed = parseGaussBoardDeepLink(arg);
      if (parsed) return parsed;
    }
  }
  return null;
}

function postObsidianAgentManagerNote({ vaultRel, content, apiUrl, token, timeoutMs = 4000 }) {
  return new Promise((resolve) => {
    if (!apiUrl || !token) {
      resolve({ ok: false });
      return;
    }
    let endpoint;
    try {
      endpoint = new URL('/note/create', `${String(apiUrl).replace(/\/+$/, '')}/`);
    } catch {
      resolve({ ok: false });
      return;
    }
    const host = endpoint.hostname.toLowerCase();
    if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && host !== '[::1]') {
      resolve({ ok: false });
      return;
    }

    const payload = JSON.stringify({
      path: vaultRel,
      content: String(content || ''),
      overwrite: true
    });
    const transport = endpoint.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const req = transport.request(
      endpoint,
      {
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload, 'utf8'),
          Authorization: `Bearer ${token}`
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            done({ ok: false });
            return;
          }
          let parsed = null;
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            done({ ok: false });
            return;
          }
          if (parsed?.ok === false || parsed?.error) {
            done({ ok: false });
            return;
          }
          done({ ok: true, mode: 'obsidian-agent-manager', vaultRel, response: parsed });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      done({ ok: false });
    });
    req.on('error', () => done({ ok: false }));
    req.write(payload, 'utf8');
    req.end();
  });
}

/**
 * Sync an interoperable Markdown sidecar or .canvas file into the Obsidian vault
 * (Whiteboards/<filename>), preferring Obsidian Agent Manager HTTP (:27125) for .md
 * with atomic UTF-8 disk write fallback (never passing full content on CLI argv).
 */
async function syncToObsidianVault({ filename, content, subfolder, apiUrl, token } = {}) {
  const reg = resolveEcosystemRegistry();
  const defaultSub = reg?.data?.apps?.obsidian?.whiteboardsSubfolder || 'Whiteboards';
  const safeName = path.basename(String(filename || 'Board.md')).replace(/[<>:"/\\|?*]/g, '_');
  const safeSub = String(subfolder || defaultSub).replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Whiteboards';
  const vaultRel = `${safeSub}/${safeName}`;

  if (safeName.endsWith('.md')) {
    const api = resolveObsidianApiConfig();
    const res = await postObsidianAgentManagerNote({
      vaultRel,
      content,
      apiUrl: apiUrl || api.url,
      token: token || api.token
    });
    if (res.ok) return { ok: true, mode: 'obsidian-agent-manager', vaultRel };
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

function probeLoopbackHttp(rawUrl, { method = 'GET', pathSuffix = '/', body = null, timeoutMs = 1200 } = {}) {
  return new Promise((resolve) => {
    let endpoint;
    try {
      endpoint = new URL(pathSuffix, `${String(rawUrl || '').replace(/\/+$/, '')}/`);
    } catch {
      resolve({ online: false, url: String(rawUrl || '') });
      return;
    }
    const host = endpoint.hostname.toLowerCase();
    if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && host !== '[::1]') {
      resolve({ online: false, url: endpoint.origin });
      return;
    }

    const transport = endpoint.protocol === 'https:' ? https : http;
    const headers = {};
    if (body != null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    }
    let settled = false;
    const done = (resObj) => {
      if (settled) return;
      settled = true;
      resolve(resObj);
    };

    const req = transport.request(
      endpoint,
      { method, timeout: timeoutMs, headers },
      (res) => {
        res.resume();
        const online = res.statusCode >= 200 && res.statusCode < 500;
        done({ online, status: res.statusCode, url: endpoint.origin });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      done({ online: false, url: endpoint.origin });
    });
    req.on('error', () => done({ online: false, url: endpoint.origin }));
    if (body != null) req.write(body, 'utf8');
    req.end();
  });
}

async function checkEcosystemHealth({ servicesOverride } = {}) {
  const services = servicesOverride || getEcosystemServices();
  const [ragManager, obsidianAgentManager, ankiConnect, deepTutor] = await Promise.all([
    probeLoopbackHttp(services.ragManager?.url, { method: 'GET', pathSuffix: '/health' }),
    probeLoopbackHttp(services.obsidianAgentManager?.url, { method: 'GET', pathSuffix: '/' }),
    probeLoopbackHttp(services.ankiConnect?.url, {
      method: 'POST',
      pathSuffix: '/',
      body: JSON.stringify({ action: 'version', version: 6 })
    }),
    probeLoopbackHttp(services.deepTutor?.url, { method: 'GET', pathSuffix: '/health' })
  ]);

  const mermaidExe = findMermaidManagerExecutable();
  const spiceStatus = getSpiceRuntimeStatus();

  return {
    checkedAt: new Date().toISOString(),
    services: {
      ragManager,
      obsidianAgentManager,
      ankiConnect,
      deepTutor,
      mermaidManager: { online: !!mermaidExe, path: mermaidExe || null },
      ngspiceWasm: { online: !!spiceStatus.ngspice?.available, path: spiceStatus.ngspice?.entryPath || null },
      tinaTi: { online: !!spiceStatus.tina?.available, path: spiceStatus.tina?.executable || null }
    }
  };
}

module.exports = {
  findObsidianCli,
  resolveObsidianVaultDir,
  resolveObsidianApiConfig,
  parseGaussBoardDeepLink,
  deepLinkFromArgv,
  syncToObsidianVault,
  checkEcosystemHealth
};
