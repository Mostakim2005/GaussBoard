// Unified In-Note Command & Search Dialog.
// Allows searching both Boards (by name, alias, tag) and Settings (with inline toggles) in real-time.

import { h } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';

export class SearchDialog {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.input = null;
    this.boardsContainer = null;
    this.settingsContainer = null;
    this.visible = false;
    this.boardsList = [];
  }

  async loadBoards() {
    try {
      if (window.board?.boards?.list) {
        this.boardsList = await window.board.boards.list();
      }
    } catch {
      this.boardsList = [];
    }
  }

  build() {
    if (this.el) return;

    this.input = h('input', {
      type: 'text',
      class: 'omni-search-input',
      placeholder: t('Search boards, settings, tags, aliases...'),
      style: 'width:100%;box-sizing:border-box;padding:12px 16px 12px 42px;border:none;background:var(--desk,#f5f5f7);border-radius:12px;font-size:15px;color:var(--text,#111111);outline:none;'
    });

    const searchIcon = h('span', {
      style: 'position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-2,rgba(128,128,128,0.7));display:flex;pointer-events:none;',
      html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    });

    const closeBtn = h('button', {
      class: 'btn-close-search',
      title: t('Close'),
      style: 'background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:var(--text-2,rgba(128,128,128,0.8));display:flex;',
      html: icon('close', 18)
    });
    closeBtn.addEventListener('click', () => this.close());

    const header = h('div', {
      style: 'position:relative;display:flex;align-items:center;gap:8px;padding-bottom:14px;border-bottom:1px solid var(--line,rgba(0,0,0,0.08));'
    }, h('div', { style: 'position:relative;flex:1;' }, searchIcon, this.input), closeBtn);

    // Section 1: Boards
    this.boardsContainer = h('div', { class: 'search-section-boards' });
    const secBoards = h('div', { style: 'margin-top:14px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));margin-bottom:8px;' }, t('Board Name')),
      this.boardsContainer
    );

    // Section 2: Settings
    this.settingsContainer = h('div', { class: 'search-section-settings' });
    const secSettings = h('div', { style: 'margin-top:18px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));margin-bottom:8px;' }, t('Setting Name')),
      this.settingsContainer
    );

    const card = h('div', {
      class: 'omni-search-card',
      style: 'position:relative;width:560px;max-width:92vw;max-height:80vh;background:var(--surface,#ffffff);border-radius:20px;box-shadow:0 16px 40px rgba(0,0,0,0.22);border:1px solid var(--line,rgba(0,0,0,0.12));padding:18px 20px;display:flex;flex-direction:column;overflow:hidden;'
    }, header, h('div', { style: 'overflow-y:auto;flex:1;padding-right:4px;margin-top:4px;' }, secBoards, secSettings));

    this.el = h('div', {
      id: 'omniSearchModal',
      class: 'omni-search-backdrop',
      style: 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:12vh;'
    }, card);

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    document.body.appendChild(this.el);
  }

  async open(initialQuery = '') {
    this.build();
    await this.loadBoards();
    this.visible = true;
    this.el.style.display = 'flex';
    this.input.value = initialQuery;
    this.filter();
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    if (this.el) this.el.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.close();
    else this.open();
  }

  filter() {
    const q = (this.input.value || '').trim().toLowerCase();
    this.renderBoards(q);
    this.renderSettings(q);
  }

  renderBoards(q) {
    if (!this.boardsContainer) return;
    this.boardsContainer.innerHTML = '';

    const currentDoc = this.app?.store?.doc;
    const currentId = currentDoc?.id;

    // Filter board list by title, tags, and aliases
    const matched = this.boardsList.filter((b) => {
      if (!q) return true;
      const titleMatch = (b.name || b.title || '').toLowerCase().includes(q);
      const aliasMatch = Array.isArray(b.aliases) && b.aliases.some((a) => a.toLowerCase().includes(q));
      const tagMatch = Array.isArray(b.tags) && b.tags.some((t) => t.toLowerCase().includes(q));
      return titleMatch || aliasMatch || tagMatch;
    }).slice(0, 8); // top 8

    if (matched.length === 0) {
      this.boardsContainer.appendChild(h('div', {
        style: 'padding:8px 12px;font-size:13px;color:var(--text-2,rgba(128,128,128,0.8));font-style:italic;'
      }, t('No matching boards')));
      return;
    }

    for (const b of matched) {
      const isCurrent = b.id === currentId;
      const title = b.name || b.title || t('Untitled');
      const dateStr = b.updated ? new Date(b.updated).toLocaleDateString() : '';

      const tagPills = [];
      if (Array.isArray(b.tags)) {
        for (const tg of b.tags) {
          tagPills.push(h('span', {
            style: 'background:rgba(0,120,212,0.1);color:#0078d4;font-size:11px;font-weight:600;padding:2px 6px;border-radius:10px;margin-right:4px;'
          }, tg));
        }
      }

      const row = h('div', {
        class: 'search-board-row',
        style: `display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;background:${isCurrent ? 'rgba(0,120,212,0.08)' : 'transparent'};transition:background 0.12s;`
      },
        h('div', { style: 'display:flex;flex-direction:column;gap:2px;' },
          h('div', { style: 'display:flex;align-items:center;gap:6px;' },
            h('span', { style: 'font-weight:600;font-size:13.5px;' }, title),
            isCurrent ? h('span', { style: 'font-size:10.5px;padding:1px 5px;background:#0078d4;color:#fff;border-radius:6px;' }, t('Current')) : ''
          ),
          h('div', { style: 'display:flex;align-items:center;' }, ...tagPills)
        ),
        h('span', { style: 'font-size:11.5px;color:var(--text-2,rgba(128,128,128,0.8));' }, dateStr)
      );

      row.addEventListener('mouseenter', () => { row.style.background = 'var(--desk,#f0f0f4)'; });
      row.addEventListener('mouseleave', () => { row.style.background = isCurrent ? 'rgba(0,120,212,0.08)' : 'transparent'; });
      row.addEventListener('click', () => {
        this.close();
        if (!isCurrent && this.app?.openBoard) {
          this.app.openBoard(b.id);
        }
      });

      this.boardsContainer.appendChild(row);
    }
  }

  renderSettings(q) {
    if (!this.settingsContainer) return;
    this.settingsContainer.innerHTML = '';

    const app = this.app;
    const settings = [
      {
        id: 'smoothCamera',
        title: t('Smooth Camera Easing'),
        desc: t('Animates pan and zoom transitions smoothly'),
        type: 'toggle',
        get: () => app?.surface?.cam?.glide !== false,
        set: (v) => { if (app?.surface?.cam) app.surface.cam.glide = v; }
      },
      {
        id: 'scratchOut',
        title: t('Scratch-Out Eraser Gesture'),
        desc: t('Scribble back and forth to erase ink beneath'),
        type: 'toggle',
        get: () => true,
        set: () => { app?.toast(t('Scratch-Out Eraser is permanently active.')); }
      },
      {
        id: 'splitWorkspace',
        title: t('Split Study Workspace'),
        desc: t('Toggle dual side-by-side view for notes and reference'),
        type: 'toggle',
        get: () => !!app?.splitWorkspace?.active,
        set: () => { app?.splitWorkspace?.toggle(); }
      },
      {
        id: 'replayBarDock',
        title: t('Replay Bar Dock Position'),
        desc: t('Dock floating toolbar to Top, Bottom, Left or Right'),
        type: 'action',
        actionLabel: t('Rotate Dock'),
        run: () => {
          if (!app?.replayBar) return;
          const order = ['top', 'right', 'bottom', 'left'];
          const next = order[(order.indexOf(app.replayBar.dock) + 1) % order.length];
          app.replayBar.setDock(next);
          app.toast(t('Docked to {dock}', { dock: next }));
        }
      },
      {
        id: 'exportVideo',
        title: t('Export Replay Video (WebM)'),
        desc: t('Export animated canvas notes & audio track to video'),
        type: 'action',
        actionLabel: t('Export'),
        run: () => {
          this.close();
          import('../export-video.js').then((m) => m.exportVideoFile(app));
        }
      }
    ];

    const matched = settings.filter((s) => {
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    });

    if (matched.length === 0) {
      this.settingsContainer.appendChild(h('div', {
        style: 'padding:8px 12px;font-size:13px;color:var(--text-2,rgba(128,128,128,0.8));font-style:italic;'
      }, t('No matching settings')));
      return;
    }

    for (const s of matched) {
      let control = null;
      if (s.type === 'toggle') {
        const checked = s.get();
        const toggleBtn = h('button', {
          style: `padding:4px 10px;border-radius:14px;border:none;cursor:pointer;font-size:11.5px;font-weight:600;background:${checked ? '#0078d4' : 'rgba(128,128,128,0.2)'};color:${checked ? '#ffffff' : 'inherit'};transition:background 0.15s;`
        }, checked ? t('ON') : t('OFF'));
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = !s.get();
          s.set(next);
          this.renderSettings(q);
        });
        control = toggleBtn;
      } else if (s.type === 'action') {
        const actBtn = h('button', {
          style: 'padding:4px 10px;border-radius:14px;border:1px solid var(--line,rgba(0,0,0,0.15));background:none;cursor:pointer;font-size:11.5px;font-weight:600;color:inherit;'
        }, s.actionLabel);
        actBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          s.run();
        });
        control = actBtn;
      }

      const row = h('div', {
        class: 'search-setting-row',
        style: 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;margin-bottom:4px;transition:background 0.12s;'
      },
        h('div', { style: 'display:flex;flex-direction:column;gap:2px;' },
          h('span', { style: 'font-weight:600;font-size:13px;' }, s.title),
          h('span', { style: 'font-size:11px;color:var(--text-2,rgba(128,128,128,0.8));' }, s.desc)
        ),
        control
      );

      row.addEventListener('mouseenter', () => { row.style.background = 'var(--desk,#f0f0f4)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      this.settingsContainer.appendChild(row);
    }
  }
}
