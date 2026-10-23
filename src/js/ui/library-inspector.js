// library-inspector.js — Runtime Libraries & External Dependencies Inspector
import { t } from '../i18n.js';

let activeDialog = null;

export async function showLibraryInspector(app) {
  if (activeDialog) {
    activeDialog.focus();
    return;
  }

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

  const libraries = manifest?.libraries || [
    { id: 'katex', name: 'KaTeX', version: '0.16.21', category: 'Math & Formulas', status: 'ready', bundledInApp: true, bundledPath: 'src/vendor/katex/katex.min.js' },
    { id: 'pdfjs', name: 'PDF.js', version: '4.10.38', category: 'PDF Engine', status: 'ready', bundledInApp: true, bundledPath: 'src/vendor/pdf.min.mjs' },
    { id: 'jszip', name: 'JSZip', version: '3.10.1', category: 'Packaging & Compression', status: 'ready', bundledInApp: true, bundledPath: 'src/vendor/jszip.min.js' },
    { id: 'mammoth', name: 'Mammoth', version: '1.8.0', category: 'Document Conversion', status: 'ready', bundledInApp: true, bundledPath: 'src/vendor/mammoth.browser.min.js' },
    { id: 'mermaid', name: 'Mermaid.js', version: '10.9.1', category: 'Diagrams & Mind Maps', status: 'ready', bundledInApp: false, sharedPath: 'C:\\Users\\kazir\\Documents\\Antigravity\\CommonLibraries\\mermaid\\mermaid.min.js' },
    { id: 'chartjs', name: 'Chart.js', version: '4.4.7', category: 'Charts & Visualizations', status: 'ready', bundledInApp: false, sharedPath: 'C:\\Users\\kazir\\Documents\\Antigravity\\CommonLibraries\\chartjs\\chart.umd.min.js' },
    { id: 'pdf-lib', name: 'pdf-lib', version: '1.17.1', category: 'PDF Metadata & Vector Annotations', status: 'ready', bundledInApp: false, sharedPath: 'C:\\Users\\kazir\\Documents\\Antigravity\\CommonLibraries\\pdf-lib\\pdf-lib.min.js' }
  ];

  const rootPath = manifest?.rootPath || 'C:\\Users\\kazir\\Documents\\Antigravity\\CommonLibraries';

  const overlay = document.createElement('div');
  overlay.className = 'lib-inspector-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('Runtime Libraries & Dependencies'));

  const dialog = document.createElement('div');
  dialog.className = 'lib-inspector-dialog';
  dialog.tabIndex = -1;

  dialog.innerHTML = `
    <div class="lib-header">
      <div class="lib-title-group">
        <div class="lib-title">${t('Runtime Libraries & Dependencies')}</div>
        <div class="lib-subtitle">${t('Active engines, versions, and shared library locations on disk.')}</div>
      </div>
      <button class="lib-close-btn" aria-label="${t('Close')}">&times;</button>
    </div>
    <div class="lib-body">
      <div class="lib-location-banner">
        <span class="lib-location-label">${t('Shared Common Folder:')}</span>
        <code class="lib-location-path">${rootPath}</code>
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
            </tr>
          </thead>
          <tbody>
            ${libraries.map(lib => `
              <tr>
                <td class="lib-name-cell">
                  <strong>${lib.name}</strong>
                  <div class="lib-desc">${lib.description || ''}</div>
                </td>
                <td><span class="lib-cat-badge">${lib.category}</span></td>
                <td><code class="lib-ver-badge">v${lib.version}</code></td>
                <td>
                  <span class="lib-loc-tag ${lib.bundledInApp ? 'loc-bundled' : 'loc-shared'}">
                    ${lib.bundledInApp ? t('Bundled in App') : t('Shared Common')}
                  </span>
                  <div class="lib-path-hint" title="${lib.sharedPath || lib.bundledPath || ''}">
                    ${lib.sharedPath ? lib.sharedPath.replace(/.*\\\\CommonLibraries\\\\/, 'CommonLibraries\\\\') : (lib.bundledPath || '')}
                  </div>
                </td>
                <td>
                  <span class="lib-status-badge status-${lib.status || 'ready'}">
                    ${lib.status === 'ready' ? '✓ ' + t('Ready') : t('Available')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="lib-footer">
      <button class="tb-btn lib-btn-folder">${t('Open Shared Folder')}</button>
      <div class="spacer"></div>
      <button class="tb-btn primary lib-btn-done">${t('Done')}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  activeDialog = overlay;

  const close = () => {
    if (!activeDialog) return;
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    activeDialog = null;
    app.surface?.focus?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  document.addEventListener('keydown', onKeyDown);

  overlay.querySelector('.lib-close-btn').addEventListener('click', close);
  overlay.querySelector('.lib-btn-done').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('.lib-btn-folder').addEventListener('click', async () => {
    try {
      if (window.board?.openLibrariesFolder) {
        await window.board.openLibrariesFolder();
      } else {
        app.toast(t('Shared folder: {path}', { path: rootPath }));
      }
    } catch (e) {
      app.toast(t('Could not open folder'));
    }
  });

  dialog.focus();
}
