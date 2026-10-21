// Floating, draggable, dockable Replay & Study Toolbar HUD.
// Provides instant one-click access to Audio Recording & Replay, Study Tape, Split Workspace, and Video Export.

import { h } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';
import { exportVideoFile } from '../export-video.js';

export class ReplayBar {
  /**
   * @param {object} app Main application instance
   */
  constructor(app) {
    this.app = app;
    this.el = null;
    this.dock = 'top'; // 'top' | 'bottom' | 'left' | 'right' | 'free'
    this.orientation = 'horizontal'; // 'horizontal' | 'vertical'
    this.collapsed = false;
    this.pos = { x: 80, y: 16 };
    this.visibleTools = {
      overview: true,
      search: true,
      audio: true,
      playbar: true,
      tape: true,
      split: true,
      video: true,
      scratch: true,
      markdown: true,
      pagemargin: true
    };

    this.loadState();
    this.build();
    this.mount();
  }

  loadState() {
    try {
      const raw = localStorage.getItem('gazboard.replayBar');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.dock) this.dock = saved.dock;
        if (saved.orientation) this.orientation = saved.orientation;
        if (saved.pos) this.pos = saved.pos;
        if (saved.collapsed != null) this.collapsed = saved.collapsed;
        if (saved.visibleTools) Object.assign(this.visibleTools, saved.visibleTools);
      }
    } catch {}
  }

  saveState() {
    try {
      localStorage.setItem('gazboard.replayBar', JSON.stringify({
        dock: this.dock,
        orientation: this.orientation,
        pos: this.pos,
        collapsed: this.collapsed,
        visibleTools: this.visibleTools
      }));
    } catch {}
  }

  get visible() {
    return !!(this.el && this.el.style.display !== 'none');
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }

  show() {
    if (this.el) this.el.style.display = 'flex';
  }

  mount() {
    if (typeof document === 'undefined') return;
    const stage = document.getElementById('stage') || document.body;
    if (this.el && !this.el.parentNode) {
      stage.appendChild(this.el);
    }
    this.applyPosition();
  }

  applyPosition() {
    if (!this.el) return;
    this.el.className = `replay-bar-hud dock-${this.dock} orient-${this.orientation} ${this.collapsed ? 'collapsed' : ''}`;
    this.el.style.flexDirection = this.orientation === 'vertical' ? 'column' : 'row';

    if (this.dock === 'top') {
      this.el.style.left = '50%';
      this.el.style.transform = 'translateX(-50%)';
      this.el.style.top = '14px';
      this.el.style.bottom = 'auto';
      this.el.style.right = 'auto';
    } else if (this.dock === 'bottom') {
      this.el.style.left = '50%';
      this.el.style.transform = 'translateX(-50%)';
      this.el.style.bottom = '80px';
      this.el.style.top = 'auto';
      this.el.style.right = 'auto';
    } else if (this.dock === 'left') {
      this.el.style.left = '16px';
      this.el.style.top = '50%';
      this.el.style.transform = 'translateY(-50%)';
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    } else if (this.dock === 'right') {
      this.el.style.right = '16px';
      this.el.style.left = 'auto';
      this.el.style.top = '50%';
      this.el.style.transform = 'translateY(-50%)';
      this.el.style.bottom = 'auto';
    } else {
      // free float
      this.el.style.left = `${this.pos.x}px`;
      this.el.style.top = `${this.pos.y}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
      this.el.style.transform = 'none';
    }
  }

  setDock(dock) {
    this.dock = dock;
    if (dock === 'left' || dock === 'right') {
      this.orientation = 'vertical';
    } else if (dock === 'top' || dock === 'bottom') {
      this.orientation = 'horizontal';
    }
    this.applyPosition();
    this.saveState();
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this.applyPosition();
    this.saveState();
  }

  build() {
    if (typeof document === 'undefined') return;

    // Drag / Grip Handle
    const handle = h('div', {
      class: 'rb-handle',
      title: 'Drag to move \u2014 Double-click to rotate',
      style: 'cursor:grab;display:flex;align-items:center;justify-content:center;padding:4px 6px;color:var(--text-2,rgba(128,128,128,0.8));user-select:none;touch-action:none;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>'
    });
    handle.addEventListener('dblclick', () => {
      this.setOrientation(this.orientation === 'horizontal' ? 'vertical' : 'horizontal');
    });
    this.wireDragging(handle);

    // 1. Audio Record / Replay Button
    // 1. Note Overview Drawer Button (Image 2)
    this.btnOverview = h('button', {
      class: 'rb-btn rb-overview',
      title: t('Note Overview (Browse document previews, tags, aliases)'),
      style: 'display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:600;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Notes</span>'
    });
    this.btnOverview.addEventListener('click', () => {
      this.app.toggleNoteOverview?.();
    });

    // 2. Search Dialog Button (Command Palette per sketch)
    this.btnSearch = h('button', {
      class: 'rb-btn rb-search',
      title: t('Search (Boards & Settings Ctrl+F)'),
      style: 'display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:18px;color:inherit;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    });
    this.btnSearch.addEventListener('click', () => {
      this.app.toggleSearchDialog?.();
    });

    // 3. Audio Record Button (with Red Neon Outline during recording)
    this.btnAudio = h('button', {
      class: 'rb-btn rb-audio',
      title: t('Record Audio (Click to start/stop syncing notes with voice)'),
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:600;color:inherit;transition:all 0.2s;'
    }, h('span', { class: 'rb-dot', style: 'width:9px;height:9px;border-radius:50%;background:#e81123;display:inline-block;' }),
       h('span', { class: 'rb-label' }, t('Record')));

    this.btnAudio.addEventListener('click', () => this.handleAudioClick());

    // 4. Audio Playback HUD Toggle
    this.btnPlayBar = h('button', {
      class: 'rb-btn rb-playbar',
      title: t('Audio Playback Bar (Listen and scrub synced strokes)'),
      style: 'display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Replay</span>'
    });
    this.btnPlayBar.addEventListener('click', () => {
      const tracks = this.app.store?.doc?.audioTracks || [];
      if (tracks.length > 0) {
        if (this.app.audioBar?.visible) {
          this.app.audioBar.close();
        } else {
          this.app.audioBar?.open(tracks[tracks.length - 1]);
        }
      } else {
        this.app.toast(t('No recordings on this board. Click Record first!'));
      }
    });

    this.btnMode = h('button', {
      class: 'rb-btn rb-mode', type: 'button',
      title: t('Switch between Reading mode and Writing mode'),
      'aria-pressed': String(!!this.app.readingMode),
      style: 'display:flex;align-items:center;gap:5px;background:rgba(128,128,128,0.12);border:0;cursor:pointer;padding:6px 9px;border-radius:18px;font-size:11.5px;font-weight:700;color:inherit;'
    });
    this.btnMode.addEventListener('click', () => this.app.toggleReadingMode?.());
    this.syncReadingMode();

    // 5. Masking / Study Tape Button
    this.btnTape = h('button', {
      class: 'rb-btn rb-tape',
      title: t('Study Tape (Draw freehand marker tape over notes \u2014 tap to reveal/hide)'),
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:all 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><line x1="7" y1="7" x2="7" y2="17"/><line x1="17" y1="7" x2="17" y2="17"/></svg><span>Tape</span>'
    });
    this.btnTape.addEventListener('click', () => {
      if (this.app.tool === 'tape') {
        this.app.setTool('pen');
        this.btnTape.style.background = 'none';
        this.btnTape.style.color = 'inherit';
        this.app.toast(t('Returned to Pen tool'));
      } else {
        this.app.setTool('tape');
        this.btnTape.style.background = 'rgba(168, 85, 247, 0.2)';
        this.btnTape.style.color = '#a855f7';
        this.app.toast(t('Study Tape active! Draw over notes to conceal them. Tap any tape to toggle reveal.'));
      }
    });

    // 6. Split Study Workspace Button
    this.btnSplit = h('button', {
      class: 'rb-btn rb-split',
      title: 'Split Study Workspace (Dual side-by-side view for PDF and active notes)',
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg><span>Split</span>'
    });
    this.btnSplit.addEventListener('click', () => {
      if (this.app.splitWorkspace) {
        this.app.splitWorkspace.toggle();
        const active = this.app.splitWorkspace.active;
        this.btnSplit.style.background = active ? 'var(--accent,#0078d4)' : 'none';
        this.btnSplit.style.color = active ? '#ffffff' : 'inherit';
        this.app.toast(active ? t('Split study pad active') : t('Returned to single canvas'));
      }
    });

    // Markdown Note Button
    this.btnMarkdown = h('button', {
      class: 'rb-btn rb-markdown',
      title: t('Insert Markdown note (Obsidian format with tags, wikilinks, and math)'),
      style: 'display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:600;color:inherit;transition:background 0.15s;',
      html: '<span style="font-family:monospace;font-weight:900;font-size:12px;border:1px solid currentColor;border-radius:4px;padding:0 3px;line-height:1.1;">M↓</span><span>Markdown</span>'
    });
    this.btnMarkdown.addEventListener('click', () => {
      this.app.insertMarkdownCard?.();
    });

    // Page Margin Button
    this.btnPageMargin = h('button', {
      class: 'rb-btn rb-pagemargin',
      title: t('Adjust Page Margins (Set printable/writable page margins)'),
      style: 'display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" stroke-dasharray="2 2"/></svg><span>Margin</span>'
    });
    this.btnPageMargin.addEventListener('click', () => {
      this.app.openPageMarginDialog?.();
    });

    // 7. Video Export Button
    this.btnVideo = h('button', {
      class: 'rb-btn rb-video',
      title: 'Export Replay Video (WebM animated video export with progress & cancel)',
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg><span>Video</span>'
    });
    this.btnVideo.addEventListener('click', () => {
      exportVideoFile(this.app);
    });

    // 8. Scratch-Out Toggle Button
    this.btnScratch = h('button', {
      class: 'rb-btn rb-scratch',
      title: t('Gesture Scratch-Out Eraser (Click to toggle on/off, right-click for settings)'),
      style: 'display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:18px;font-size:12px;color:var(--text-2,rgba(128,128,128,0.85));transition:all 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15l4-5 4 6 4-7 5 6"/><path d="M19 19l-4-4"/></svg>'
    });
    const updateScratchUI = () => {
      const active = this.app.settings?.scratchOut !== false;
      this.btnScratch.style.background = active ? 'rgba(0,120,212,0.14)' : 'none';
      this.btnScratch.style.color = active ? '#0078d4' : 'var(--text-2,rgba(128,128,128,0.45))';
      this.btnScratch.title = active
        ? t('Scratch-Out Eraser: ON (Click to toggle, right-click for settings & targets)')
        : t('Scratch-Out Eraser: OFF (Click to toggle, right-click for settings & targets)');
    };
    this.btnScratch.addEventListener('click', () => {
      this.app.settings.scratchOut = !(this.app.settings?.scratchOut !== false);
      this.app.saveSettings();
      updateScratchUI();
      this.app.toast(this.app.settings.scratchOut ? t('Scratch-Out Eraser enabled') : t('Scratch-Out Eraser disabled'));
    });
    this.btnScratch.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.app?.panels?.settings?.();
    });
    setTimeout(updateScratchUI, 100);

    // 9. Dock & Settings Cog Menu
    this.btnMenu = h('button', {
      class: 'rb-btn rb-menu',
      title: 'Replay Bar Settings (Docking, Orientation & Tool Visibility)',
      style: 'display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:inherit;',
      html: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    });
    this.btnMenu.addEventListener('click', (e) => this.openMenu(e));

    // Outer Container
    this.el = h('div', {
      id: 'replayBar',
      class: 'replay-bar-hud',
      style: 'position:absolute;z-index:9000;display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--surface,#ffffff);color:var(--text,#111111);border:1px solid var(--line,rgba(0,0,0,0.14));border-radius:30px;box-shadow:0 6px 20px rgba(0,0,0,0.18);font-family:inherit;font-size:13px;backdrop-filter:blur(8px);'
    }, handle, this.btnOverview, this.btnSearch, this.btnAudio, this.btnPlayBar, this.btnMode, this.btnTape, this.btnSplit, this.btnMarkdown, this.btnPageMargin, this.btnVideo, this.btnScratch, this.btnMenu);

    this.updateVisibility();
  }

  updateVisibility() {
    if (this.btnOverview) this.btnOverview.style.display = this.visibleTools.overview ? 'flex' : 'none';
    if (this.btnSearch) this.btnSearch.style.display = this.visibleTools.search ? 'flex' : 'none';
    if (this.btnAudio) this.btnAudio.style.display = this.visibleTools.audio ? 'flex' : 'none';
    if (this.btnPlayBar) this.btnPlayBar.style.display = this.visibleTools.playbar ? 'flex' : 'none';
    if (this.btnMode) this.btnMode.style.display = 'flex';
    if (this.btnTape) this.btnTape.style.display = this.visibleTools.tape ? 'flex' : 'none';
    if (this.btnSplit) this.btnSplit.style.display = this.visibleTools.split ? 'flex' : 'none';
    if (this.btnVideo) this.btnVideo.style.display = this.visibleTools.video ? 'flex' : 'none';
    if (this.btnScratch) this.btnScratch.style.display = this.visibleTools.scratch ? 'flex' : 'none';
    if (this.btnMarkdown) this.btnMarkdown.style.display = this.visibleTools.markdown !== false ? 'flex' : 'none';
    if (this.btnPageMargin) this.btnPageMargin.style.display = this.visibleTools.pagemargin !== false ? 'flex' : 'none';
  }

  syncReadingMode() {
    if (!this.btnMode) return;
    const reading = !!this.app.readingMode;
    this.btnMode.textContent = reading ? t('Reading mode') : t('Writing mode');
    this.btnMode.setAttribute('aria-pressed', String(reading));
    this.btnMode.title = reading ? t('Reading mode: edits are paused; click to write') : t('Writing mode: editing is enabled; click to read');
    this.btnMode.style.color = reading ? '#0078d4' : 'inherit';
  }

  async handleAudioClick() {
    const rec = this.app.audioRecorder;
    if (!rec) return;

    if (rec.state === 'recording') {
      // Currently recording: stop and add track
      this.app.toast(t('Saving audio recording...'));
      const res = await rec.stop();
      if (res && res.assetId) {
        const track = {
          id: res.id,
          assetId: res.assetId,
          name: `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          durationMs: res.durationMs,
          created: Date.now(),
          bookmarks: []
        };
        if (!Array.isArray(this.app.store.doc.audioTracks)) this.app.store.doc.audioTracks = [];
        this.app.store.doc.audioTracks.push(track);
        this.app.store.commit('record audio', []);
        this.app.audioBar?.open(track);
        this.app.toast(t('Recording saved and loaded into AudioBar!'));
      }
      this.syncAudioState();
      return;
    }

    // Not recording: start recording immediately
    try {
      await rec.start();
      this.app.toast(t('Recording audio... Write notes to sync them with your voice!'));
      this.syncAudioState();
    } catch (err) {
      this.app.toast(t('Microphone access denied: ') + err.message);
    }
  }

  syncAudioState() {
    const rec = this.app.audioRecorder;
    const isRec = rec && rec.state === 'recording';
    if (!this.btnAudio) return;

    const dot = this.btnAudio.querySelector('.rb-dot');
    const label = this.btnAudio.querySelector('.rb-label');

    if (isRec) {
      this.btnAudio.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(255,23,68,0.12);color:#ff1744;border:1.5px solid #ff1744;border-radius:20px;padding:4px 12px;font-family:monospace;font-weight:700;font-size:12.5px;box-shadow:0 0 12px rgba(255,23,68,0.75), inset 0 0 6px rgba(255,23,68,0.4);cursor:pointer;animation:pulse 1.4s infinite alternate;';
      if (dot) {
        dot.style.background = '#ff1744';
        dot.style.animation = 'pulse 1s infinite';
      }
      if (!this._recTimer) {
        this._recTimer = setInterval(() => {
          if (rec.state === 'recording') {
            const ms = rec.currentOffsetMs ? rec.currentOffsetMs() : 0;
            const sec = Math.floor(ms / 1000);
            const m = String(Math.floor(sec / 60)).padStart(2, '0');
            const s = String(sec % 60).padStart(2, '0');
            if (label) label.textContent = `${m}:${s}`;
          }
        }, 200);
      }
    } else {
      if (this._recTimer) {
        clearInterval(this._recTimer);
        this._recTimer = null;
      }
      this.btnAudio.style.cssText = 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:600;color:inherit;transition:all 0.2s;';
      if (dot) {
        dot.style.background = '#e81123';
        dot.style.animation = 'none';
      }
      if (label) {
        label.textContent = t('Record');
      }
    }
  }

  openMenu(e) {
    e.stopPropagation();
    const existing = document.getElementById('replayBarMenu');
    if (existing) { existing.remove(); return; }

    const menu = h('div', {
      id: 'replayBarMenu',
      style: 'position:absolute;z-index:9999;background:var(--surface,#ffffff);color:var(--text,#111111);border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,0.22);padding:10px 14px;font-size:12.5px;min-width:210px;'
    });

    // Positioning helper
    const rect = this.btnMenu.getBoundingClientRect();
    menu.style.left = `${Math.min(window.innerWidth - 230, Math.max(10, rect.left))}px`;
    menu.style.top = `${rect.bottom + 8}px`;

    const section = (title) => h('div', { style: 'font-weight:700;font-size:11.5px;color:var(--text-2,rgba(128,128,128,0.9));margin:8px 0 4px;text-transform:uppercase;letter-spacing:0.5px;' }, title);

    const dockRow = h('div', { style: 'display:flex;gap:4px;margin-bottom:6px;' });
    for (const d of ['top', 'bottom', 'left', 'right', 'free']) {
      const b = h('button', {
        class: 'btn' + (this.dock === d ? ' primary' : ''),
        style: 'flex:1;padding:3px 6px;font-size:11px;text-transform:capitalize;',
        onclick: () => { this.setDock(d); menu.remove(); }
      }, d);
      dockRow.appendChild(b);
    }

    const orientRow = h('div', { style: 'display:flex;gap:4px;margin-bottom:6px;' });
    for (const o of ['horizontal', 'vertical']) {
      const b = h('button', {
        class: 'btn' + (this.orientation === o ? ' primary' : ''),
        style: 'flex:1;padding:3px 6px;font-size:11px;text-transform:capitalize;',
        onclick: () => { this.setOrientation(o); menu.remove(); }
      }, o);
      orientRow.appendChild(b);
    }

    const toolToggle = (key, name) => {
      const row = h('label', { style: 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;cursor:pointer;' },
        h('span', {}, name),
        h('input', {
          type: 'checkbox',
          checked: this.visibleTools[key] !== false,
          onchange: (ev) => {
            this.visibleTools[key] = ev.target.checked;
            this.updateVisibility();
            this.saveState();
          }
        })
      );
      return row;
    };

    menu.appendChild(section(t('Dock Position')));
    menu.appendChild(dockRow);
    menu.appendChild(section(t('Orientation')));
    menu.appendChild(orientRow);
    menu.appendChild(section(t('Visible Tools')));
    menu.appendChild(toolToggle('audio', t('Audio (Record & Replay)')));
    menu.appendChild(toolToggle('tape', t('Study Tape')));
    menu.appendChild(toolToggle('split', t('Split Workspace')));
    menu.appendChild(toolToggle('video', t('Export Video')));
    menu.appendChild(toolToggle('scratch', t('Scratch Eraser Info')));
    menu.appendChild(toolToggle('markdown', t('Markdown Note')));
    menu.appendChild(toolToggle('pagemargin', t('Page Margins')));

    const closeHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== this.btnMenu) {
        menu.remove();
        window.removeEventListener('pointerdown', closeHandler);
      }
    };
    setTimeout(() => window.addEventListener('pointerdown', closeHandler), 0);

    document.body.appendChild(menu);
  }

  wireDragging(handle) {
    if (!handle) return;
    let startX = 0, startY = 0, initialX = 0, initialY = 0;
    let dragging = false;
    let movedPastThreshold = false;

    const onPointerMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!movedPastThreshold) {
        if (Math.hypot(dx, dy) < 6) return;
        movedPastThreshold = true;
        dragging = true;
        this.dock = 'free';
      }
      this.pos.x = Math.max(10, Math.min(window.innerWidth - 60, initialX + dx));
      this.pos.y = Math.max(10, Math.min(window.innerHeight - 60, initialY + dy));
      this.applyPosition();
    };

    const onPointerUp = (e) => {
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      if (dragging) {
        dragging = false;
        this.saveState();
      }
      movedPastThreshold = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch {}
      dragging = false;
      movedPastThreshold = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.el.getBoundingClientRect();
      this.pos.x = rect.left;
      this.pos.y = rect.top;
      initialX = this.pos.x;
      initialY = this.pos.y;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });
  }
}
