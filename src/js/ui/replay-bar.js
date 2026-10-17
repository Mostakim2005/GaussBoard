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
      audio: true,
      tape: true,
      split: true,
      video: true,
      scratch: true
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
      style: 'cursor:grab;display:flex;align-items:center;justify-content:center;padding:4px 6px;color:var(--text-2,rgba(128,128,128,0.8));user-select:none;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>'
    });
    handle.addEventListener('dblclick', () => {
      this.setOrientation(this.orientation === 'horizontal' ? 'vertical' : 'horizontal');
    });
    this.wireDragging(handle);

    // 1. Audio Record / Replay Button
    this.btnAudio = h('button', {
      class: 'rb-btn rb-audio',
      title: 'Audio Record & Replay HUD (Click to record or playback notes)',
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:600;color:inherit;transition:background 0.15s;'
    }, h('span', { class: 'rb-dot', style: 'width:10px;height:10px;border-radius:50%;background:#e81123;display:inline-block;' }),
       h('span', { class: 'rb-label' }, 'Audio'));

    this.btnAudio.addEventListener('click', () => this.handleAudioClick());

    // 2. Masking / Study Tape Button
    this.btnTape = h('button', {
      class: 'rb-btn rb-tape',
      title: 'Study Tape (Place permanent toggleable answer covers \u2014 tap to reveal/hide)',
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><line x1="7" y1="7" x2="7" y2="17"/><line x1="17" y1="7" x2="17" y2="17"/></svg><span>Tape</span>'
    });
    this.btnTape.addEventListener('click', () => {
      if (typeof this.app.addTape === 'function') {
        this.app.addTape();
      } else if (typeof this.app.addCurtain === 'function') {
        this.app.addCurtain('tape');
      }
      this.app.toast(t('Study Tape placed! Tap it to toggle reveal on and off.'));
    });

    // 3. Split Study Workspace Button
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

    // 4. Video Export Button
    this.btnVideo = h('button', {
      class: 'rb-btn rb-video',
      title: 'Export Replay Video (WebM animated video export with progress & cancel)',
      style: 'display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:18px;font-size:12.5px;font-weight:500;color:inherit;transition:background 0.15s;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg><span>Video</span>'
    });
    this.btnVideo.addEventListener('click', () => {
      exportVideoFile(this.app);
    });

    // 5. Scratch-Out Info Button
    this.btnScratch = h('button', {
      class: 'rb-btn rb-scratch',
      title: 'Gesture Scratch-Out Eraser (Scribble back-and-forth over ink to erase \u2014 works with Pen, Mouse & Touch)',
      style: 'display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:18px;font-size:12px;color:var(--text-2,rgba(128,128,128,0.85));',
      html: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    });
    this.btnScratch.addEventListener('click', () => {
      this.app.toast(t('Scratch-Out Eraser is active! Scribble zig-zag over any stroke with pen, mouse, or finger to erase it.'));
    });

    // 6. Dock & Settings Cog Menu
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
    }, handle, this.btnAudio, this.btnTape, this.btnSplit, this.btnVideo, this.btnScratch, this.btnMenu);

    this.updateVisibility();
  }

  updateVisibility() {
    if (this.btnAudio) this.btnAudio.style.display = this.visibleTools.audio ? 'flex' : 'none';
    if (this.btnTape) this.btnTape.style.display = this.visibleTools.tape ? 'flex' : 'none';
    if (this.btnSplit) this.btnSplit.style.display = this.visibleTools.split ? 'flex' : 'none';
    if (this.btnVideo) this.btnVideo.style.display = this.visibleTools.video ? 'flex' : 'none';
    if (this.btnScratch) this.btnScratch.style.display = this.visibleTools.scratch ? 'flex' : 'none';
  }

  async handleAudioClick() {
    const rec = this.app.audioRecorder;
    if (rec && rec.state === 'recording') {
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

    // Not recording: if board has audio tracks, open AudioBar with latest
    const tracks = this.app.store.doc.audioTracks || [];
    if (tracks.length > 0) {
      if (this.app.audioBar?.visible) {
        this.app.audioBar.close();
      } else {
        this.app.audioBar?.open(tracks[tracks.length - 1]);
      }
      return;
    }

    // No tracks on board: prompt to start recording
    const startNow = confirm(t('No audio recordings on this board. Start recording audio now?'));
    if (startNow && rec) {
      try {
        await rec.start();
        this.app.toast(t('Recording audio... Write notes to sync them with your voice!'));
        this.syncAudioState();
      } catch (err) {
        this.app.toast(t('Microphone access denied: ') + err.message);
      }
    }
  }

  syncAudioState() {
    const rec = this.app.audioRecorder;
    const isRec = rec && rec.state === 'recording';
    if (!this.btnAudio) return;
    const dot = this.btnAudio.querySelector('.rb-dot');
    const label = this.btnAudio.querySelector('.rb-label');
    if (dot) {
      dot.style.background = isRec ? '#e81123' : '#0078d4';
      dot.style.animation = isRec ? 'pulse 1.2s infinite' : 'none';
    }
    if (label) {
      label.textContent = isRec ? 'Stop Rec' : 'Audio';
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

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.pos.x = Math.max(10, Math.min(window.innerWidth - 60, initialX + dx));
      this.pos.y = Math.max(10, Math.min(window.innerHeight - 60, initialY + dy));
      this.dock = 'free';
      this.applyPosition();
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      this.saveState();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.el.getBoundingClientRect();
      this.pos.x = rect.left;
      this.pos.y = rect.top;
      initialX = this.pos.x;
      initialY = this.pos.y;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }
}
