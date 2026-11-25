// library-inspector.js — Runtime Libraries Availability Checker & SharedLibraries Downloader
import { t } from '../i18n.js';

let activeDialog = null;

function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchManifest() {
  let manifest = null;
  try {
    if (window.board?.loadLibrariesManifest) {
      manifest = await window.board.loadLibrariesManifest();
    }
  } catch (e) {
    console.warn('[libraries] IPC load failed:', e);
  }
  if (!manifest) {
    try {
      const res = await fetch('vendor/libraries.json');
      if (res.ok) manifest = await res.json();
    } catch (e) {
      console.warn('[libraries] fetch vendor fallback failed:', e);
    }
  }
  return manifest;
}

/**
 * Checks if optional runtime libraries are missing on disk / offline cache.
 * Returns summary with missing ids without blocking UI.
 */
export async function checkMissingLibraries() {
  try {
    if (window.board?.checkLibraries) {
      return await window.board.checkLibraries();
    }
    const manifest = await fetchManifest();
    const libs = manifest?.libraries || [];
    const missing = libs.filter((l) => !l.bundledInApp && l.status !== 'ready' && l.downloadUrl);
    return {
      ok: true,
      rootPath: manifest?.rootPath || 'SharedLibraries',
      missingIds: missing.map((l) => l.id),
      missing,
      libraries: libs
    };
  } catch {
    return { ok: false, missingIds: [], missing: [], libraries: [] };
  }
}

/**
 * Startup check: if downloadable optional libraries are missing and user has not
 * suppressed startup checks, presents the library download window.
 */
export async function checkLibrariesOnStartup(app) {
  if (!app || window.board?.smoke || app.settings?.suppressLibraryPrompt) return null;
  const status = await checkMissingLibraries();
  if (!status?.ok || !status.missing?.length) return null;
  return promptMissingLibraries(app, {
    missingIds: status.missingIds,
    startupCheck: true
  });
}

/**
 * Opens the library inspector focused on missing / downloadable libraries and
 * resolves `true` if any download completed successfully.
 */
export function promptMissingLibraries(app, opts = {}) {
  return showLibraryInspector(app, { ...opts, promptMode: true });
}

export async function showLibraryInspector(app, opts = {}) {
  if (activeDialog) {
    activeDialog.focus();
    return false;
  }

  let manifest = await fetchManifest();
  let didDownload = false;
  let unsubProgress = null;

  const overlay = document.createElement('div');
  overlay.className = 'lib-inspector-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('Runtime Libraries & Dependencies'));

  const dialog = document.createElement('div');
  dialog.className = 'lib-inspector-dialog';
  dialog.tabIndex = -1;

  const renderContent = () => {
    const libraries = manifest?.libraries || [];
    const rootPath = manifest?.rootPath || 'SharedLibraries';
    const highlightSet = new Set(opts.highlightIds || []);
    const downloadableMissing = libraries.filter((l) => !l.available && l.status !== 'ready' && l.canDownload !== false && l.downloadUrl);
    const missingCount = downloadableMissing.length;

    const bannerHtml = missingCount > 0
      ? `<div class="lib-missing-banner">
          <div>
            <strong>${opts.reasonLibrary
              ? t('Required optional library is not installed locally.')
              : t('{n} optional runtime libraries are missing from SharedLibraries.', { n: missingCount })}</strong>
            <div class="lib-missing-sub">${t('Download once into your shared offline folder so all features work offline.')}</div>
          </div>
          <button class="tb-btn primary lib-btn-download-all">${t('Download Missing ({n})', { n: missingCount })}</button>
        </div>`
      : '';

    dialog.innerHTML = `
      <div class="lib-header">
        <div class="lib-title-group">
          <div class="lib-title">${opts.promptMode ? t('Optional Libraries & Downloads') : t('Runtime Libraries & Dependencies')}</div>
          <div class="lib-subtitle">${t('Shared offline engines, availability status, and one-click downloads.')}</div>
        </div>
        <button class="lib-close-btn" aria-label="${t('Close')}">&times;</button>
      </div>
      <div class="lib-body">
        ${bannerHtml}
        <div class="lib-progress-wrap" hidden>
          <div class="lib-progress-label"></div>
          <div class="lib-progress-track"><div class="lib-progress-fill"></div></div>
        </div>
        <div class="lib-location-banner">
          <span class="lib-location-label">${t('Shared Common Folder:')}</span>
          <code class="lib-location-path">${escHtml(rootPath)}</code>
        </div>
        <div class="lib-table-container">
          <table class="lib-table">
            <thead>
              <tr>
                <th>${t('Library')}</th>
                <th>${t('Category')}</th>
                <th>${t('Version')}</th>
                <th>${t('Location')}</th>
                <th>${t('Status')}</th>
                <th>${t('Action')}</th>
              </tr>
            </thead>
            <tbody>
              ${libraries.map((lib) => {
                const isReady = lib.available === true || lib.status === 'ready';
                const canDl = typeof lib.downloadUrl === 'string' && lib.downloadUrl.startsWith('https://');
                const rowHighlight = highlightSet.has(lib.id) ? ' class="lib-row-highlight"' : '';
                const locClass = lib.bundledInApp ? 'loc-bundled' : (isReady ? 'loc-shared' : 'loc-missing');
                const locText = lib.bundledInApp ? t('Bundled in App') : (isReady ? t('Shared Common') : t('Not Installed'));
                const pathHint = lib.sharedPath
                  ? String(lib.sharedPath).replace(/.*[\\/](SharedLibraries|CommonLibraries)[\\/]/i, '$1/')
                  : (lib.sharedRelPath || lib.bundledPath || '');
                return `
                  <tr${rowHighlight} data-lib-id="${escHtml(lib.id)}">
                    <td class="lib-name-cell">
                      <strong>${escHtml(lib.name)}</strong>${lib.sizeLabel ? ` <small class="lib-size-pill">${escHtml(lib.sizeLabel)}</small>` : ''}
                      <div class="lib-desc">${escHtml(lib.description || '')}</div>
                    </td>
                    <td><span class="lib-cat-badge">${escHtml(lib.category)}</span></td>
                    <td><code class="lib-ver-badge">v${escHtml(lib.version)}</code></td>
                    <td>
                      <span class="lib-loc-tag ${locClass}">${locText}</span>
                      <div class="lib-path-hint" title="${escHtml(lib.sharedPath || lib.bundledPath || '')}">${escHtml(pathHint)}</div>
                    </td>
                    <td>
                      <span class="lib-status-badge status-${isReady ? 'ready' : 'missing'}">
                        ${isReady ? '✓ ' + t('Ready') : '↓ ' + t('Missing')}
                      </span>
                    </td>
                    <td>
                      ${(!isReady && canDl && window.board?.downloadLibraries)
                        ? `<button class="tb-btn lib-btn-dl-one" data-dl-id="${escHtml(lib.id)}">${t('Download')}</button>`
                        : `<span class="lib-action-muted">${isReady ? '—' : t('Manual')}</span>`}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="lib-footer">
        <button class="tb-btn lib-btn-folder">${t('Open Shared Folder')}</button>
        <label class="lib-suppress-check">
          <input type="checkbox" id="libSuppressCheck" ${app?.settings?.suppressLibraryPrompt ? 'checked' : ''}>
          <span>${t("Don't ask on startup")}</span>
        </label>
        <div class="spacer"></div>
        <button class="tb-btn primary lib-btn-done">${t('Done')}</button>
      </div>
    `;
  };

  renderContent();
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  activeDialog = overlay;

  return new Promise((resolve) => {
    let closed = false;
    const finish = (ok) => {
      if (closed) return;
      closed = true;
      if (unsubProgress) { try { unsubProgress(); } catch {} unsubProgress = null; }
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      activeDialog = null;
      app?.surface?.focus?.();
      resolve(ok);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(didDownload);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const setBusyProgress = (busy, label = '', pct = 0) => {
      const wrap = dialog.querySelector('.lib-progress-wrap');
      const txt = dialog.querySelector('.lib-progress-label');
      const fill = dialog.querySelector('.lib-progress-fill');
      if (wrap) wrap.hidden = !busy;
      if (txt) txt.textContent = label;
      if (fill) fill.style.width = `${Math.max(5, Math.min(100, pct))}%`;
      for (const b of dialog.querySelectorAll('.lib-btn-dl-one, .lib-btn-download-all')) {
        b.disabled = busy;
      }
    };

    if (window.board?.onLibraryDownloadProgress) {
      unsubProgress = window.board.onLibraryDownloadProgress((p) => {
        if (!p) return;
        const pct = p.total ? Math.round((p.index / p.total) * 100) : 50;
        const msg = p.phase === 'error'
          ? t('Download failed: {name}', { name: p.name || p.id })
          : t('Downloading {name} ({i}/{total})…', { name: p.name || p.id, i: p.index || 1, total: p.total || 1 });
        setBusyProgress(true, msg, pct);
      });
    }

    const runDownload = async (ids) => {
      if (!window.board?.downloadLibraries) {
        app?.toast?.(t('Library downloads require network access in this runtime.'));
        return;
      }
      setBusyProgress(true, t('Downloading selected libraries…'), 10);
      try {
        const res = await window.board.downloadLibraries(ids);
        if (res?.manifest) manifest = res.manifest;
        else manifest = await fetchManifest();
        const okCount = (res?.results || []).filter((r) => r.ok).length;
        const failCount = (res?.results || []).filter((r) => !r.ok).length;
        if (okCount > 0) didDownload = true;
        renderContent();
        if (failCount > 0) {
          app?.toast?.(t('Downloaded {ok} library(ies); {fail} failed.', { ok: okCount, fail: failCount }));
        } else if (okCount > 0) {
          app?.toast?.(t('Downloaded {n} library(ies) cleanly.', { n: okCount }));
        }
      } catch (err) {
        app?.toast?.(err?.message || t('Download failed'));
      } finally {
        setBusyProgress(false);
      }
    };

    dialog.addEventListener('click', async (e) => {
      const btnClose = e.target.closest('.lib-close-btn, .lib-btn-done');
      if (btnClose) { finish(didDownload); return; }

      const btnFolder = e.target.closest('.lib-btn-folder');
      if (btnFolder) {
        try {
          if (window.board?.openLibrariesFolder) await window.board.openLibrariesFolder();
          else app?.toast?.(t('Shared folder: {path}', { path: manifest?.rootPath || 'SharedLibraries' }));
        } catch {
          app?.toast?.(t('Could not open folder'));
        }
        return;
      }

      const btnAll = e.target.closest('.lib-btn-download-all');
      if (btnAll) {
        const missingIds = (manifest?.libraries || [])
          .filter((l) => !l.available && l.status !== 'ready' && typeof l.downloadUrl === 'string')
          .map((l) => l.id);
        if (missingIds.length) await runDownload(missingIds);
        return;
      }

      const btnOne = e.target.closest('.lib-btn-dl-one');
      if (btnOne) {
        const id = btnOne.dataset.dlId;
        if (id) await runDownload([id]);
      }
    });

    dialog.addEventListener('change', (e) => {
      if (e.target?.id === 'libSuppressCheck' && app?.settings) {
        app.settings.suppressLibraryPrompt = !!e.target.checked;
        app.saveSettings?.();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(didDownload);
    });

    dialog.focus();
  });
}
