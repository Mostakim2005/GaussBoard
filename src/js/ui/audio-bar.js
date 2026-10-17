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
    this._interval = null;

    this.density = new DensityCanvas({
      width: 220,
      height: 24,
      onSeek: (ms) => this.seek(ms)
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

  close() {
    if (this.app?.replayEngine?.active) {
      this.app.replayEngine.pause();
    }
    this.stopClock();
    if (this.el) {
      this.el.style.display = 'none';
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

  togglePlay() {
    const replay = this.app?.replayEngine;
    if (!replay) return;
    if (replay.active) {
      replay.pause();
    } else {
      replay.play();
    }
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

  build() {
    if (typeof document === 'undefined') return;

    this.btnPlay = h('button', {
      class: 'ab-btn ab-play',
      title: 'Play / Pause',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;color:inherit;'
    });
    this.btnPlay.addEventListener('click', () => this.togglePlay());

    this.lblTime = h('span', {
      class: 'ab-time',
      style: 'font-variant-numeric:tabular-nums;font-size:12px;font-weight:500;min-width:88px;text-align:center;'
    }, '00:00 / 00:00');

    this.btnSpeed = h('button', {
      class: 'ab-btn ab-speed',
      title: 'Speed',
      style: 'background:rgba(128,128,128,0.12);border:none;cursor:pointer;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;color:inherit;'
    }, '1.0×');
    this.btnSpeed.addEventListener('click', () => this.cycleSpeed());

    this.btnBookmark = h('button', {
      class: 'ab-btn ab-bm',
      title: 'Bookmark',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;',
      html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
    });
    this.btnBookmark.addEventListener('click', () => this.addBookmark());

    this.btnGhost = h('button', {
      class: 'ab-btn ab-ghost',
      title: 'Ghost / Hidden Preview',
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;',
      html: icon('eye', 18)
    });
    this.btnGhost.addEventListener('click', () => this.toggleGhostMode());

    this.btnClose = h('button', {
      class: 'ab-btn ab-close',
      title: t('Close'),
      style: 'background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:inherit;',
      html: icon('close', 18)
    });
    this.btnClose.addEventListener('click', () => this.close());

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

    this.el = h('div', {
      id: 'audioBar',
      class: 'audio-bar-hud',
      style: 'position:absolute;z-index:1000;display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--surface,#ffffff);color:var(--text,#111111);border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,0.18);user-select:none;font-size:13px;font-family:inherit;'
    }, dragHandle, this.btnPlay, this.lblTime, scrubberWrap, this.btnSpeed, this.btnBookmark, this.btnGhost, this.btnClose);

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

    this.lblTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
    this.btnPlay.innerHTML = icon(replay?.active ? 'pause' : 'play', 18);
    this.btnSpeed.textContent = `${this.speeds[this.speedIdx]}×`;

    if (replay) {
      this.btnGhost.style.opacity = replay.ghostMode === 'translucent' ? '1.0' : '0.4';
    }

    this.density.update({
      track: this.track,
      objects: this.app?.store?.doc?.objects,
      currentTimeMs: cur
    });
  }
}
