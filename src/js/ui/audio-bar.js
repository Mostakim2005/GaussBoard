// Floating draggable AudioBar HUD.
// Houses playback controls, elapsed/total clock, speed selector, density scrubber, and bookmarks.

import { h } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';
import { DensityCanvas } from './density-canvas.js';

export function formatTime(ms) {
  if (!(ms > 0)) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class AudioBar {
  /**
   * @param {object} app Main application instance
   * @param {HTMLElement} [host] Host container to float over (defaults to #stage or body)
   */
  constructor(app, host = null) {
    this.app = app;
    this.host = host || (typeof document !== 'undefined' ? document.getElementById('stage') || document.body : null);
    this.track = null;
    this.el = null;
    this.box = { x: 24, y: 72 };
    this.speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    this.speedIdx = 2; // 1.0x
    this.skipIntervals = [5, 10, 15, 30];
    this.skipIdx = 1; // 10s default
    this._interval = null;
    this._lastPlayActive = null;
    this._sessionMenuEl = null;

    this.density = new DensityCanvas({
      width: 220,
      height: 24,
      onSeek: (ms) => this.seek(ms),
      onBookmarkRenamed: (bm) => {
        if (this.app?.store) {
          this.app.store.commit?.('rename bookmark', []);
        }
      }
    });
  }

  get visible() {
    return !!(this.el && this.el.style.display !== 'none');
  }

  open(track) {
    if (!track) return;
    this.track = track;
    if (!this.el) this.build();
    if (this.host && this.el.parentNode !== this.host) {
      this.host.appendChild(this.el);
    }
    this.el.style.display = 'flex';
    this.place();

    if (this.app?.replayEngine) {
      this.app.replayEngine.loadTrack(track);
    }

    this.startClock();
    this.syncUI();
  }

  setWaveformBuffer(buf) {
    if (this.density) {
      this.density.setAudioBuffer(buf);
    }
  }

  close() {
    if (this.app?.replayEngine?.active) {
      this.app.replayEngine.pause();
    }
    this.stopClock();
    this.closeSessionMenu();
    if (this.el) {
      this.el.style.display = 'none';
    }
    if (this.app?.surface) {
      this.app.surface._ink = null;
      this.app.surface.invalidate();
    }
  }

  toggle(track) {
    if (this.visible && this.track?.id === track?.id) {
      this.close();
    } else {
      this.open(track);
    }
  }

  seek(ms) {
    if (this.app?.replayEngine) {
      this.app.replayEngine.seek(ms);
    }
    this.syncUI();
  }

  async togglePlay() {
    const replay = this.app?.replayEngine;
    if (!replay) return;
    try {
      if (replay.active) {
        replay.pause();
      } else {
        await replay.play();
      }
    } catch (e) {
      console.warn('Playback error:', e);
    }
    this.syncUI();
  }

  get skipSeconds() {
    return this.skipIntervals[this.skipIdx];
  }

  cycleSkip() {
    this.skipIdx = (this.skipIdx + 1) % this.skipIntervals.length;
    this.syncUI();
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % this.speeds.length;
    const spd = this.speeds[this.speedIdx];
    if (this.app?.replayEngine) {
      this.app.replayEngine.setSpeed(spd);
    }
    this.syncUI();
  }

  toggleGhostMode() {
    const replay = this.app?.replayEngine;
    if (!replay) return;
    const next = replay.ghostMode === 'translucent' ? 'hidden' : 'translucent';
    replay.setGhostMode(next);
    this.syncUI();
  }

  addBookmark() {
    const replay = this.app?.replayEngine;
    if (!replay || !this.track) return;
    const tMs = Math.round(replay.currentTimeMs);
    if (!Array.isArray(this.track.bookmarks)) {
      this.track.bookmarks = [];
    }
    this.track.bookmarks.push({
      id: 'bm_' + Date.now(),
      t: tMs,
      name: ''
    });
    // Persist bookmark in store document
    if (this.app?.store) {
      this.app.store.commit?.('add bookmark', []);
    }
    this.syncUI();
  }

  startClock() {
    this.stopClock();
    this._interval = setInterval(() => this.syncUI(), 100);
  }

  stopClock() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  closeSessionMenu() {
    if (this._sessionMenuEl) {
      this._sessionMenuEl.remove();
      this._sessionMenuEl = null;
    }
  }

  openSkipMenu() {
    const existing = document.getElementById('abSkipMenu');
    if (existing) { existing.remove(); return; }
    const menu = h('div', {
      id: 'abSkipMenu',
      style: 'position:absolute;bottom:calc(100% + 8px);left:60px;z-index:1020;background:var(--surface,#1f2328);color:var(--text,#ffffff);border:1px solid var(--line,rgba(255,255,255,0.15));border-radius:12px;padding:6px;display:flex;gap:6px;box-shadow:0 6px 20px rgba(0,0,0,0.35);user-select:none;'
    });
    for (let i = 0; i < this.skipIntervals.length; i++) {
      const sec = this.skipIntervals[i];
      const isCur = i === this.skipIdx;
      const b = h('button', {
        style: `padding:4px 8px;border-radius:8px;border:none;cursor:pointer;font-size:11.5px;font-weight:700;background:${isCur ? 'var(--accent,#0078d4)' : 'rgba(128,128,128,0.15)'};color:${isCur ? '#ffffff' : 'inherit'};`,
        onclick: (ev) => {
          ev.stopPropagation();
          this.skipIdx = i;
          this.syncUI();
          menu.remove();
        }
      }, `${sec}s`);
      menu.appendChild(b);
    }
    const dismiss = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        window.removeEventListener('pointerdown', dismiss);
      }
    };
    window.addEventListener('pointerdown', dismiss);
    this.el?.appendChild(menu);
  }

  insertTrackIntoNote(tr) {
    if (!tr) return;
    const cam = this.app?.surface?.cam;
    const view = cam ? cam.viewport(this.app.surface.width, this.app.surface.height) : { x: 0, y: 0, w: 800, h: 600 };
    const audioObj = {
      id: 'aud_' + Date.now(),
      type: 'audio',
      trackId: tr.id,
      assetId: tr.assetId,
      name: tr.name || 'Audio Recording',
      durationMs: tr.durationMs || 0,
      x: Math.round(view.x + view.w / 2 - 130),
      y: Math.round(view.y + view.h / 2 - 36),
      w: 260,
      h: 72,
      rotation: 0
    };
    if (this.app?.store) {
      this.app.store.addMany([audioObj], 'insert audio card');
      this.app.setSelection([audioObj.id]);
      this.app.toast(t('Recording inserted onto board'));
    }
    this.closeSessionMenu();
  }

  async exportTrackAudio(tr) {
    if (!tr) return;
    let objectUrl = null;
    try {
      const url = `app://board/asset/${tr.assetId}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Audio download failed (${resp.status})`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `${tr.name || 'recording'}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser time to start the download before releasing its URL.
      setTimeout(() => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, 1000);
      objectUrl = null;
      this.app.toast(t('Exported audio recording'));
    } catch (e) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      this.app.toast(t('Export audio error: ') + e.message);
    }
    this.closeSessionMenu();
  }

  renameTrack(tr) {
    if (!tr) return;
    const newName = prompt(t('Rename recording:'), tr.name || '');
    if (newName && newName.trim()) {
      tr.name = newName.trim();
      if (this.app?.store) this.app.store.commit('rename recording', []);
      this.syncUI();
      this.closeSessionMenu();
      this.toggleSessionMenu();
    }
  }

  deleteTrack(tr) {
    if (!tr) return;
    if (confirm(t('Delete recording "{name}"?', { name: tr.name || 'recording' }))) {
      const list = this.app?.store?.doc?.audioTracks || [];
      const idx = list.findIndex((t) => t.id === tr.id);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (this.track?.id === tr.id) {
          this.close();
          if (list.length > 0) this.open(list[0]);
        }
        if (this.app?.store) this.app.store.commit('delete recording', []);
        this.syncUI();
        this.closeSessionMenu();
      }
    }
  }

  showTrackContextMenu(tr, anchorEl) {
    const existing = document.getElementById('abTrackMenu');
    if (existing) existing.remove();

    const rect = anchorEl.getBoundingClientRect();
    const menu = h('div', {
      id: 'abTrackMenu',
      style: `position:fixed;top:${rect.bottom + 4}px;left:${Math.max(10, rect.right - 210)}px;z-index:9999;background:var(--surface,#1f2328);color:var(--text,#ffffff);border:1px solid var(--line,rgba(255,255,255,0.18));border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.38);padding:6px;min-width:210px;display:flex;flex-direction:column;gap:4px;user-select:none;`
    });

    const item = (label, iconStr, action, danger = false) => {
      const row = h('div', {
        style: `display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500;color:${danger ? '#ff5252' : 'inherit'};`,
        html: `<span>${iconStr}</span><span>${label}</span>`
      });
      row.addEventListener('mouseenter', () => { row.style.background = danger ? 'rgba(255,82,82,0.15)' : 'rgba(128,128,128,0.15)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
      row.addEventListener('click', (ev) => {
        ev.stopPropagation();
        menu.remove();
        action();
      });
      return row;
    };

    menu.appendChild(item(t('Insert the recording into the note'), '🎙️➕', () => this.insertTrackIntoNote(tr)));
    menu.appendChild(item(t('Export audio'), '🎧', () => this.exportTrackAudio(tr)));
    menu.appendChild(item(t('Rename'), '✏️', () => this.renameTrack(tr)));
    menu.appendChild(item(t('Delete'), '❌', () => this.deleteTrack(tr), true));

    const dismiss = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchorEl) {
        menu.remove();
        window.removeEventListener('pointerdown', dismiss);
      }
    };
    window.addEventListener('pointerdown', dismiss);
    document.body.appendChild(menu);
  }

  toggleSessionMenu() {
    if (this._sessionMenuEl) {
      this.closeSessionMenu();
      return;
    }
    const tracks = this.app?.store?.doc?.audioTracks || [];
    if (!tracks.length) return;

    const panel = h('div', {
      class: 'ab-session-dropdown',
      style: 'position:absolute;bottom:calc(100% + 10px);left:12px;z-index:1020;background:var(--surface,#1f2328);color:var(--text,#ffffff);border:1px solid var(--line,rgba(255,255,255,0.15));border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,0.38);padding:14px;min-width:270px;display:flex;flex-direction:column;gap:10px;user-select:none;'
    });

    // Header matching Image 5
    const headRow = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line,rgba(255,255,255,0.1));padding-bottom:8px;'
    },
      h('span', { style: 'font-weight:700;font-size:14px;' }, t('Recording')),
      h('button', {
        style: 'background:none;border:none;color:inherit;opacity:0.7;cursor:pointer;padding:2px 6px;font-size:14px;font-weight:600;',
        onclick: (e) => { e.stopPropagation(); this.closeSessionMenu(); }
      }, '✕')
    );
    panel.appendChild(headRow);

    // Audio-Ink Sync toggle
    const syncSw = h('input', { type: 'checkbox', checked: this.app?.settings?.audioInkSync !== false });
    syncSw.addEventListener('change', () => {
      if (this.app?.settings) {
        this.app.settings.audioInkSync = syncSw.checked;
        this.app.saveSettings();
      }
    });
    const syncRow = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding:4px 0;'
    },
      h('span', { style: 'font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;' },
        t('Audio-Ink Sync'),
        h('span', { title: t('Sync handwritten strokes with audio playback timestamps'), style: 'opacity:0.6;cursor:help;font-size:11px;' }, 'ⓘ')
      ),
      h('label', { class: 'toggle', style: 'margin:0;' }, syncSw)
    );
    panel.appendChild(syncRow);

    // List of recordings
    const listWrap = h('div', {
      style: 'display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;'
    });

    for (const [idx, tr] of tracks.entries()) {
      const isCur = tr.id === this.track?.id;
      const durStr = formatTime(tr.durationMs || 0);
      const dateStr = tr.created ? new Date(tr.created).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

      const dotBtn = h('button', {
        class: 'ab-row-menu-btn',
        title: t('Recording options'),
        style: 'background:none;border:none;cursor:pointer;padding:4px 6px;border-radius:6px;color:inherit;opacity:0.75;font-weight:700;font-size:13px;',
        html: '•••'
      });
      dotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showTrackContextMenu(tr, dotBtn);
      });

      const row = h('div', {
        class: `ab-session-row ${isCur ? 'active' : ''}`,
        style: `display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;background:${isCur ? 'rgba(0,229,255,0.12)' : 'rgba(128,128,128,0.06)'};border:1px solid ${isCur ? 'rgba(0,229,255,0.4)' : 'transparent'};`
      });

      const infoCol = h('div', {
        style: 'display:flex;flex-direction:column;gap:2px;flex:1;'
      },
        h('span', { style: `font-size:12.5px;font-weight:${isCur ? '700' : '600'};color:${isCur ? '#00e5ff' : 'inherit'};` }, tr.name || `Recording ${idx + 1}`),
        h('span', { style: 'font-size:11px;opacity:0.6;font-variant-numeric:tabular-nums;' }, `${durStr}${dateStr ? '  ' + dateStr : ''}`)
      );
      infoCol.addEventListener('click', (e) => {
        e.stopPropagation();
        this.open(tr);
        this.closeSessionMenu();
      });

      row.appendChild(infoCol);
      row.appendChild(dotBtn);
      listWrap.appendChild(row);
    }
    panel.appendChild(listWrap);

    const onDismiss = (e) => {
      const trackMenu = document.getElementById('abTrackMenu');
      if (trackMenu && trackMenu.contains(e.target)) return;
      if (!panel.contains(e.target) && e.target !== this.btnSession) {
        this.closeSessionMenu();
        window.removeEventListener('pointerdown', onDismiss);
      }
    };
    window.addEventListener('pointerdown', onDismiss);

    this.el.appendChild(panel);
    this._sessionMenuEl = panel;
  }

  build() {
    if (typeof document === 'undefined') return;

    this.btnRewind10 = h('button', {
      class: 'ab-btn ab-rw',
      title: `Rewind ${this.skipSeconds}s`,
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;color:inherit;pointer-events:auto;',
      html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>'
    });
    this.btnRewind10.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = this.app?.replayEngine?.currentTimeMs || 0;
      this.seek(cur - this.skipSeconds * 1000);
    });

    this.btnSkipStep = h('button', {
      class: 'ab-btn ab-skip-step',
      title: 'Click to cycle skip duration (5s, 10s, 15s, 30s) — Right-click for options',
      style: 'background:rgba(128,128,128,0.12);border:none;cursor:pointer;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:700;color:inherit;margin:0 2px;pointer-events:auto;'
    }, `${this.skipSeconds}s`);
    this.btnSkipStep.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleSkip();
    });
    this.btnSkipStep.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSkipMenu();
    });

    this.btnPlay = h('button', {
      class: 'ab-btn ab-play',
      title: 'Play / Pause',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;color:inherit;pointer-events:auto;'
    });
    this.btnPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.btnForward10 = h('button', {
      class: 'ab-btn ab-ff',
      title: `Forward ${this.skipSeconds}s`,
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;color:inherit;pointer-events:auto;',
      html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>'
    });
    this.btnForward10.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = this.app?.replayEngine?.currentTimeMs || 0;
      this.seek(cur + this.skipSeconds * 1000);
    });

    this.lblTime = h('span', {
      class: 'ab-time',
      style: 'font-variant-numeric:tabular-nums;font-size:12px;font-weight:600;min-width:88px;text-align:center;'
    }, '00:00 / 00:00');

    this.btnSpeed = h('button', {
      class: 'ab-btn ab-speed',
      title: 'Speed',
      style: 'background:rgba(128,128,128,0.12);border:none;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;color:inherit;pointer-events:auto;'
    }, '1.0×');
    this.btnSpeed.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleSpeed();
    });

    this.btnBookmark = h('button', {
      class: 'ab-btn ab-bm',
      title: 'Bookmark',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;pointer-events:auto;',
      html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
    });
    this.btnBookmark.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addBookmark();
    });

    this.btnGhost = h('button', {
      class: 'ab-btn ab-ghost',
      title: 'Ghost / Hidden Preview',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;pointer-events:auto;',
      html: icon('eye', 18)
    });
    this.btnGhost.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGhostMode();
    });

    this.btnClose = h('button', {
      class: 'ab-btn ab-close',
      title: t('Close'),
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;pointer-events:auto;',
      html: icon('close', 18)
    });
    this.btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    const dragHandle = h('span', {
      class: 'ab-drag',
      title: 'Drag AudioBar',
      style: 'cursor:grab;display:flex;align-items:center;padding:0 2px;color:rgba(128,128,128,0.7);',
      html: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>'
    });

    const scrubberWrap = h('div', {
      class: 'ab-scrubber',
      style: 'display:flex;align-items:center;position:relative;'
    }, this.density.canvas || '');

    this.btnSession = h('button', {
      class: 'ab-session-btn',
      title: 'Switch Recording Session',
      style: 'background:rgba(128,128,128,0.12);border:none;cursor:pointer;padding:3px 8px;border-radius:12px;font-size:11.5px;font-weight:600;color:inherit;outline:none;display:none;align-items:center;gap:4px;max-width:140px;pointer-events:auto;',
      html: '<span>🎙️</span><span class="ab-session-label">Session</span><span style="font-size:9px;opacity:0.6;">▼</span>'
    });
    this.btnSession.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSessionMenu();
    });

    this.el = h('div', {
      id: 'audioBar',
      class: 'audio-bar-hud',
      style: 'position:absolute;z-index:1000;display:flex;align-items:center;gap:8px;padding:6px 14px;background:var(--surface,#ffffff);color:var(--text,#111111);border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,0.18);user-select:none;font-size:13px;font-family:inherit;'
    }, dragHandle, this.btnSession, this.btnRewind10, this.btnSkipStep, this.btnPlay, this.btnForward10, this.lblTime, scrubberWrap, this.btnSpeed, this.btnBookmark, this.btnGhost, this.btnClose);

    this.wireDragging(dragHandle);

    this.wireDragging(dragHandle);
  }

  wireDragging(handle) {
    if (!handle) return;
    let startX = 0, startY = 0, initialX = 0, initialY = 0;
    let dragging = false;

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.box.x = initialX + dx;
      this.box.y = initialY + dy;
      this.place();
    };

    const onPointerUp = () => {
      dragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = this.box.x;
      initialY = this.box.y;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  place() {
    if (!this.el) return;
    const hw = this.host?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const hh = this.host?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    const ew = this.el.offsetWidth || 440;
    const eh = this.el.offsetHeight || 40;

    this.box.x = Math.max(10, Math.min(hw - ew - 10, this.box.x));
    this.box.y = Math.max(10, Math.min(hh - eh - 10, this.box.y));

    this.el.style.left = `${this.box.x}px`;
    this.el.style.top = `${this.box.y}px`;
  }

  syncUI() {
    if (!this.el || !this.visible) return;
    const replay = this.app?.replayEngine;
    const cur = replay?.currentTimeMs || 0;
    const dur = this.track?.durationMs || 0;

    const timeText = `${formatTime(cur)} / ${formatTime(dur)}`;
    if (this.lblTime.textContent !== timeText) {
      this.lblTime.textContent = timeText;
    }

    const isPlaying = !!replay?.active;
    if (this._lastPlayActive !== isPlaying) {
      this._lastPlayActive = isPlaying;
      this.btnPlay.innerHTML = icon(isPlaying ? 'pause' : 'play', 18);
      const svg = this.btnPlay.querySelector('svg');
      if (svg) svg.style.pointerEvents = 'none';
    }

    const speedText = `${this.speeds[this.speedIdx]}×`;
    if (this.btnSpeed.textContent !== speedText) {
      this.btnSpeed.textContent = speedText;
    }

    const skipText = `${this.skipSeconds}s`;
    if (this.btnSkipStep && this.btnSkipStep.textContent !== skipText) {
      this.btnSkipStep.textContent = skipText;
      if (this.btnRewind10) this.btnRewind10.title = `Rewind ${this.skipSeconds}s`;
      if (this.btnForward10) this.btnForward10.title = `Forward ${this.skipSeconds}s`;
    }

    const tracks = this.app?.store?.doc?.audioTracks || [];
    if (this.btnSession) {
      if (tracks.length > 1) {
        this.btnSession.style.display = 'inline-flex';
        const curIdx = tracks.findIndex((t) => t.id === this.track?.id);
        const name = this.track?.name || `Session ${curIdx >= 0 ? curIdx + 1 : 1}`;
        const lbl = this.btnSession.querySelector('.ab-session-label');
        if (lbl && lbl.textContent !== name) {
          lbl.textContent = name;
        }
      } else {
        this.btnSession.style.display = 'none';
      }
    }

    if (replay) {
      this.btnGhost.style.opacity = replay.ghostMode === 'translucent' ? '1.0' : '0.4';
    }

    this.density.update({
      track: this.track,
      objects: this.app?.store?.doc?.objects,
      currentTimeMs: cur,
      audioBuffer: replay?.audioBuffer
    });
  }
}

