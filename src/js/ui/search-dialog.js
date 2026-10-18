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
    this.secBoards = null;
    this.secSettings = null;
    this.secDivider = null;
    this.emptyNotice = null;
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
      placeholder: t('Search boards, settings, pressure, tags, aliases...'),
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
    this.secBoards = h('div', { style: 'margin-top:14px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));margin-bottom:8px;' }, t('Board Name')),
      this.boardsContainer
    );

    // Light-colored subtle separator between sections
    this.secDivider = h('div', {
      class: 'search-section-divider',
      style: 'height:1px;background:var(--line,rgba(0,0,0,0.08));margin:16px 0;'
    });

    // Section 2: Settings
    this.settingsContainer = h('div', { class: 'search-section-settings' });
    this.secSettings = h('div', { style: 'margin-top:4px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));margin-bottom:8px;' }, t('Setting Name')),
      this.settingsContainer
    );

    // Empty state notice
    this.emptyNotice = h('div', {
      style: 'display:none;padding:32px 16px;text-align:center;font-size:13.5px;color:var(--text-2,rgba(128,128,128,0.8));font-style:italic;'
    }, t('No matching boards or settings found'));

    const scrollArea = h('div', {
      class: 'omni-search-scroll',
      style: 'overflow-y:auto;flex:1;padding-right:4px;margin-top:4px;display:flex;flex-direction:column;'
    }, this.secBoards, this.secDivider, this.secSettings, this.emptyNotice);

    const card = h('div', {
      class: 'omni-search-card',
      style: 'position:relative;width:580px;max-width:92vw;max-height:80vh;background:var(--surface,#ffffff);border-radius:20px;box-shadow:0 16px 40px rgba(0,0,0,0.22);border:1px solid var(--line,rgba(0,0,0,0.12));padding:18px 20px;display:flex;flex-direction:column;overflow:hidden;'
    }, header, scrollArea);

    this.el = h('div', {
      id: 'omniSearchModal',
      class: 'omni-search-backdrop',
      style: 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:10vh;'
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

  toggle(initialQuery = '') {
    if (this.visible) this.close();
    else this.open(initialQuery);
  }

  filter() {
    const q = (this.input.value || '').trim().toLowerCase();
    const boardCount = this.renderBoards(q);
    const settingCount = this.renderSettings(q);

    if (boardCount === 0 && settingCount === 0) {
      if (this.secBoards) this.secBoards.style.display = 'none';
      if (this.secDivider) this.secDivider.style.display = 'none';
      if (this.secSettings) this.secSettings.style.display = 'none';
      if (this.emptyNotice) this.emptyNotice.style.display = 'block';
    } else {
      if (this.emptyNotice) this.emptyNotice.style.display = 'none';
      if (this.secBoards) this.secBoards.style.display = boardCount > 0 ? 'block' : 'none';
      if (this.secSettings) this.secSettings.style.display = settingCount > 0 ? 'block' : 'none';
      if (this.secDivider) this.secDivider.style.display = (boardCount > 0 && settingCount > 0) ? 'block' : 'none';
    }
  }

  renderBoards(q) {
    if (!this.boardsContainer) return 0;
    this.boardsContainer.innerHTML = '';

    const currentDoc = this.app?.store?.doc;
    const currentId = currentDoc?.id;
    const tokens = q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];

    const matched = this.boardsList.filter((b) => {
      if (!tokens.length) return true;
      const titleStr = (b.name || b.title || '').toLowerCase();
      const aliasStr = Array.isArray(b.aliases) ? b.aliases.join(' ').toLowerCase() : '';
      const tagStr = Array.isArray(b.tags) ? b.tags.join(' ').toLowerCase() : '';
      const haystack = `${titleStr} ${aliasStr} ${tagStr}`;
      return tokens.every((tok) => haystack.includes(tok));
    }).slice(0, 10);

    if (matched.length === 0) return 0;

    for (const b of matched) {
      const isCurrent = b.id === currentId;
      const title = b.name || b.title || t('Untitled');
      const dateStr = b.updated ? new Date(b.updated).toLocaleDateString() : '';

      const tagPills = [];
      if (Array.isArray(b.tags)) {
        for (const tg of b.tags) {
          tagPills.push(h('span', {
            style: 'background:rgba(0,120,212,0.1);color:#0078d4;font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;margin-right:4px;'
          }, tg));
        }
      }
      if (Array.isArray(b.aliases)) {
        for (const al of b.aliases) {
          tagPills.push(h('span', {
            style: 'background:rgba(168,85,247,0.12);color:#9333ea;font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;margin-right:4px;'
          }, al));
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
        if (!isCurrent) {
          if (typeof this.app?.openBoardRef === 'function') {
            this.app.openBoardRef({ id: b.id, name: b.name || b.title });
          } else if (typeof this.app?.openBoard === 'function') {
            this.app.openBoard(b.id);
          }
        }
      });

      this.boardsContainer.appendChild(row);
    }

    return matched.length;
  }

  renderSettings(q) {
    if (!this.settingsContainer) return 0;
    this.settingsContainer.innerHTML = '';

    const app = this.app;
    const s = app?.settings || {};

    const settings = [
      {
        id: 'pressure',
        title: t('Pressure sensitivity'),
        desc: t('Vary ink width with how hard you press - within a stroke, not just between strokes'),
        type: 'toggle',
        get: () => s.pressure !== false,
        set: (v) => { s.pressure = v; app.saveSettings(); }
      },
      {
        id: 'scratchOut',
        title: t('Gesture Scratch-Out Eraser'),
        desc: t('Scribble back and forth over ink to erase it'),
        type: 'toggle',
        get: () => s.scratchOut !== false,
        set: (v) => {
          s.scratchOut = v;
          app.saveSettings();
          if (app.replayBar?.updateScratchUI) app.replayBar.updateScratchUI();
        }
      },
      {
        id: 'smoothCamera',
        title: t('Smooth Camera Easing'),
        desc: t('Animates pan and zoom transitions smoothly'),
        type: 'toggle',
        get: () => s.smoothCamera !== false && app?.surface?.cam?.glide !== false,
        set: (v) => {
          s.smoothCamera = v;
          if (app?.surface?.cam) app.surface.cam.glide = v;
          app.saveSettings();
        }
      },
      {
        id: 'inkToShape',
        title: t('Straighten shapes I draw'),
        desc: t('Hand-drawn circle, box or arrow snaps to a clean shape when you lift pen'),
        type: 'toggle',
        get: () => !!s.inkToShape,
        set: (v) => { s.inkToShape = v; app.saveSettings(); }
      },
      {
        id: 'penButtonErases',
        title: t('Pen side button rubs out'),
        desc: t('Hold stylus side button while drawing to erase'),
        type: 'toggle',
        get: () => s.penButtonErases !== false,
        set: (v) => { s.penButtonErases = v; app.saveSettings(); }
      },
      {
        id: 'inkWithMouse',
        title: t('Draw with the mouse'),
        desc: t('Choose whether mouse inks or pans canvas (Auto / Always / Never)'),
        type: 'choice',
        options: [['auto', t('Auto')], ['yes', t('Always')], ['no', t('Never')]],
        get: () => s.inkWithMouse || 'auto',
        set: (v) => { s.inkWithMouse = v; app.saveSettings(); }
      },
      {
        id: 'inkWithFinger',
        title: t('Draw with a finger'),
        desc: t('Choose whether finger inks or moves canvas (Auto / Always / Never)'),
        type: 'choice',
        options: [['auto', t('Auto')], ['yes', t('Always')], ['no', t('Never')]],
        get: () => s.inkWithFinger || 'auto',
        set: (v) => { s.inkWithFinger = v; app.saveSettings(); }
      },
      {
        id: 'inkPointer',
        title: t('Pointer while inking'),
        desc: t('Pen nib, Arrow or Crosshair pointer style'),
        type: 'choice',
        options: [['nib', t('Pen nib')], ['arrow', t('Arrow')], ['crosshair', t('Crosshair')]],
        get: () => s.inkPointer || 'nib',
        set: (v) => { s.inkPointer = v; app.saveSettings(); app.surface?.invalidate(); }
      },
      {
        id: 'rulerSnap',
        title: t('Ruler snapping'),
        desc: t('Snap drawn strokes and lines to the active ruler'),
        type: 'toggle',
        get: () => !!app?.ruler?.snap,
        set: (v) => { if (app?.ruler) app.ruler.snap = v; }
      },
      {
        id: 'theme',
        title: t('Theme'),
        desc: t('Application visual appearance (System / Light / Dark)'),
        type: 'choice',
        options: [['system', t('System')], ['light', t('Light')], ['dark', t('Dark')]],
        get: () => s.theme || 'system',
        set: (v) => { s.theme = v; app.saveSettings(); }
      },
      {
        id: 'mouseWheelMode',
        title: t('Mouse wheel action'),
        desc: t('Intelligent dual mode: wheel scrolls or zooms, while holding Ctrl switches to the other action.'),
        type: 'choice',
        options: [['scroll', t('Page scroll / Pan (Ctrl to zoom)')], ['zoom', t('Zoom in/out (Ctrl to scroll)')]],
        get: () => s.mouseWheelMode || (s.wheelZoom ? 'zoom' : 'scroll'),
        set: (v) => { s.mouseWheelMode = v; s.wheelZoom = (v === 'zoom'); app.saveSettings(); }
      },
      {
        id: 'enableHoverToolbar',
        title: t('Show quick actions on hover'),
        desc: t('Hovering over items shows the floating action menu (crop, duplicate, lock, delete) with Windows-style persistent focus.'),
        type: 'toggle',
        get: () => s.enableHoverToolbar !== false,
        set: (v) => { s.enableHoverToolbar = v; app.saveSettings(); }
      },
      {
        id: 'edgePan',
        title: t('Auto-pan at the edges'),
        desc: t('Scrolls canvas when pointer runs into window edge'),
        type: 'toggle',
        get: () => !!s.edgePan,
        set: (v) => { s.edgePan = v; app.saveSettings(); }
      },
      {
        id: 'returnToSelect',
        title: t('Return to select after drawing'),
        desc: t('Switches back to select tool immediately after lifting pen'),
        type: 'toggle',
        get: () => !!s.returnToSelect,
        set: (v) => { s.returnToSelect = v; app.saveSettings(); }
      },
      {
        id: 'showGroupOutlines',
        title: t('Outline grouped objects'),
        desc: t('Faint dashed ring around tied objects'),
        type: 'toggle',
        get: () => s.showGroupOutlines !== false,
        set: (v) => { s.showGroupOutlines = v; app.saveSettings(); app.surface?.invalidate(); }
      },
      {
        id: 'rightDragPans',
        title: t('Right-drag pans the canvas'),
        desc: t('Hold right mouse button and drag to pan canvas'),
        type: 'toggle',
        get: () => s.rightDragPans !== false,
        set: (v) => { s.rightDragPans = v; app.saveSettings(); }
      },
      {
        id: 'showToolKeys',
        title: t('Shortcut letters on toolbar'),
        desc: t('Shows key in corner of tool button (V, P, H, E)'),
        type: 'toggle',
        get: () => s.showToolKeys !== false,
        set: (v) => { s.showToolKeys = v; app.saveSettings(); }
      },
      {
        id: 'lowLatencyInk',
        title: t('Low-latency inking'),
        desc: t('Shaves lag off pen by skipping canvas buffering step'),
        type: 'toggle',
        get: () => !!s.lowLatencyInk,
        set: (v) => { s.lowLatencyInk = v; app.saveSettings(); app.toast(t('Takes effect next time GazBoard opens')); }
      },
      {
        id: 'inkTrail',
        title: t('Windows Ink trail (experimental)'),
        desc: t('Direct Windows Ink trail for low stylus latency'),
        type: 'toggle',
        get: () => !!s.inkTrail,
        set: (v) => { s.inkTrail = v; app.saveSettings(); app.inkTrail?.setEnabled(v); }
      },
      {
        id: 'boardsPage',
        title: t('My boards as a full page'),
        desc: t('Full page gallery with folder tiles vs simple list'),
        type: 'toggle',
        get: () => s.boardsPage !== false,
        set: (v) => { s.boardsPage = v; app.saveSettings(); }
      },
      {
        id: 'autosave',
        title: t('Autosave'),
        desc: t('Automatically save boards locally on this computer'),
        type: 'toggle',
        get: () => s.autosave !== false,
        set: (v) => { s.autosave = v; app.saveSettings(); }
      },
      {
        id: 'splitWorkspace',
        title: t('Split Study Workspace'),
        desc: t('Dual side-by-side view for PDF and active notes'),
        type: 'toggle',
        get: () => !!app?.splitWorkspace?.active,
        set: () => { app?.splitWorkspace?.toggle(); }
      },
      {
        id: 'replayBarDock',
        title: t('Replay Bar Dock Position'),
        desc: t('Dock floating toolbar to Top, Right, Bottom, or Left'),
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
      },
      {
        id: 'laserTrailDuration',
        title: t('Laser trail duration'),
        desc: t('How long the laser pointer trail lingers on screen (Instant, 300ms, 520ms, 1.2s, 2.5s, 5.0s, 10s)'),
        type: 'choice',
        options: [
          [0, t('Instant')],
          [300, '300ms'],
          [520, '520ms'],
          [1200, '1.2s'],
          [2500, '2.5s'],
          [5000, '5.0s'],
          [10000, '10s']
        ],
        get: () => s.laserTrailDuration ?? 520,
        set: (v) => { s.laserTrailDuration = v; app.saveSettings(); }
      },
      {
        id: 'penOpacity',
        title: t('Pen opacity'),
        desc: t('Allow drawing translucent pen strokes for layering effects'),
        type: 'toggle',
        get: () => s.penOpacityEnabled === true,
        set: (v) => { s.penOpacityEnabled = v; app.saveSettings(); }
      },
      {
        id: 'boardLinkThumb',
        title: t('Board link thumbnails'),
        desc: t('Show thumbnail picture previews on board link cards by default'),
        type: 'toggle',
        get: () => s.boardLinkThumb !== false,
        set: (v) => { s.boardLinkThumb = v; app.saveSettings(); app.surface?.invalidate(); }
      }
    ];

    const tokens = q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const matched = settings.filter((item) => {
      if (!tokens.length) return true;
      const haystack = `${item.id} ${item.title} ${item.desc}`.toLowerCase();
      return tokens.every((tok) => haystack.includes(tok));
    });

    if (matched.length === 0) return 0;

    for (const item of matched) {
      let control = null;
      if (item.type === 'toggle') {
        const checked = item.get();
        const toggleBtn = h('button', {
          style: `padding:4px 12px;border-radius:14px;border:none;cursor:pointer;font-size:11.5px;font-weight:600;background:${checked ? '#0078d4' : 'rgba(128,128,128,0.2)'};color:${checked ? '#ffffff' : 'inherit'};transition:background 0.15s;`
        }, checked ? t('ON') : t('OFF'));
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = !item.get();
          item.set(next);
          this.renderSettings(q);
        });
        control = toggleBtn;
      } else if (item.type === 'choice') {
        const curVal = item.get();
        const select = h('select', {
          style: 'padding:3px 8px;border-radius:10px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--desk,#f0f0f4);font-size:11.5px;font-weight:500;color:inherit;outline:none;'
        });
        for (const [val, label] of item.options) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = label;
          if (val === curVal) opt.selected = true;
          select.appendChild(opt);
        }
        select.addEventListener('change', (e) => {
          e.stopPropagation();
          item.set(select.value);
        });
        control = select;
      } else if (item.type === 'action') {
        const actBtn = h('button', {
          style: 'padding:4px 10px;border-radius:14px;border:1px solid var(--line,rgba(0,0,0,0.15));background:none;cursor:pointer;font-size:11.5px;font-weight:600;color:inherit;'
        }, item.actionLabel);
        actBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.run();
        });
        control = actBtn;
      }

      const row = h('div', {
        class: 'search-setting-row',
        style: 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;margin-bottom:4px;transition:background 0.12s;'
      },
        h('div', { style: 'display:flex;flex-direction:column;gap:2px;' },
          h('span', { style: 'font-weight:600;font-size:13px;' }, item.title),
          h('span', { style: 'font-size:11px;color:var(--text-2,rgba(128,128,128,0.8));' }, item.desc)
        ),
        control
      );

      row.addEventListener('mouseenter', () => { row.style.background = 'var(--desk,#f0f0f4)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      this.settingsContainer.appendChild(row);
    }

    return matched.length;
  }
}
