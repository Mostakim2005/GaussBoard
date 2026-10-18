import { boxesIntersect } from './util.js';
import { boundsOf } from './store.js';

export class ReplayEngine {
  constructor(app = null) {
    this.app = app;
    this.surface = app?.surface || null;
    this.audio = typeof Audio !== 'undefined' ? new Audio() : null;
    this.track = null;
    this.active = false;
    this.rafToken = null;
    this.currentTimeMs = 0;
    this.playbackRate = 1.0;
    this.ghostMode = 'translucent'; // 'translucent' | 'hidden'
    this.autoFollow = this.app?.settings?.replayCameraFollow !== false;
    this.pendingSeekMs = null;
    this.loadGeneration = 0;
    this.playGeneration = 0;
    this.lastError = null;
    if (this.audio) {
      this.audio.addEventListener('timeupdate', () => this.syncClock());
      this.audio.addEventListener('ended', () => this.onEnded());
      this.audio.addEventListener('loadedmetadata', () => this.applyPendingSeek());
      this.audio.addEventListener('error', () => {
        this.lastError = new Error('The selected audio could not be loaded.');
        this.pause();
      });
    }
  }

  loadTrack(track) {
    const generation = ++this.loadGeneration;
    this.pause();
    this.track = track;
    this.audioBuffer = null;
    this.lastError = null;
    this.pendingSeekMs = 0;
    if (this.audio) {
      this.audio.removeAttribute?.('src');
      if (track?.assetId) {
      this.audio.src = `app://board/asset/${track.assetId}`;
      this.audio.load();
      }
    }
    if (track?.assetId && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      try {
        fetch(`app://board/asset/${track.assetId}`)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            if (generation !== this.loadGeneration) return;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            return ctx.decodeAudioData(buf).then((decoded) => {
              if (generation !== this.loadGeneration) { try { ctx.close(); } catch {} return; }
              this.audioBuffer = decoded;
              if (this.track && (!this.track.durationMs || this.track.durationMs <= 0)) {
                this.track.durationMs = Math.round(decoded.duration * 1000);
              }
              if (this.app?.audioBar?.setWaveformBuffer) {
                this.app.audioBar.setWaveformBuffer(decoded);
              }
              if (this.app?.audioBar?.syncUI) {
                this.app.audioBar.syncUI();
              }
              try { ctx.close(); } catch {}
            });
          })
          .catch(() => {});
      } catch {}
    }
    this.seek(0);
  }

  async play() {
    if (!this.track) return false;
    const request = ++this.playGeneration;
    const dur = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    if ((dur > 0 && this.currentTimeMs >= dur - 150) || (this.audio && this.audio.ended)) {
      this.seek(0);
    }
    if (this.surface) {
      this.surface._ink = null;
      this.surface.invalidate();
    }
    this.lastError = null;
    if (this.audio) {
      this.audio.playbackRate = this.playbackRate;
      this.audio.preservesPitch = true;
      try {
        // Wait for Chromium to accept the play request before reporting an
        // active replay. Previously the rejected promise was swallowed while
        // the UI kept showing Pause and the animation clock kept moving.
        await this.audio.play();
        if (request !== this.playGeneration || this.audio.paused) return false;
      } catch (error) {
        this.lastError = error;
        this.active = false;
        if (this.surface) this.surface.invalidate();
        throw error;
      }
    }
    this.app?.setReadingMode?.(true, { silent: true });
    this.playStartPerfMs = performance.now();
    this.playStartTimeMs = this.currentTimeMs;
    this.active = true;
    this.loop();
    return true;
  }

  pause() {
    this.playGeneration++;
    if (this.audio) {
      try { this.audio.pause(); } catch {}
    }
    this.active = false;
    if (this.rafToken) cancelAnimationFrame(this.rafToken);
    this.rafToken = null;
    if (this.surface) {
      this.surface._ink = null;
      this.surface.invalidate();
    }
  }

  seek(timeMs) {
    const mediaDuration = Number.isFinite(this.audio?.duration) ? this.audio.duration * 1000 : 0;
    const max = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0) || mediaDuration;
    const clamped = Math.min(Math.max(0, Number(timeMs) || 0), max || Infinity);
    this.currentTimeMs = clamped;
    this.playStartPerfMs = performance.now();
    this.playStartTimeMs = clamped;
    if (this.audio) {
      if (this.audio.readyState >= 1) this.applyPendingSeek(clamped);
      else this.pendingSeekMs = clamped;
    }
    if (this.surface) {
      this.surface._ink = null;
      this.surface.invalidate();
    }
    if (this.autoFollow) this.followActiveStroke();
  }

  applyPendingSeek(timeMs = this.pendingSeekMs) {
    if (timeMs == null || !this.audio || this.audio.readyState < 1) return false;
    try {
      const durationMs = Number.isFinite(this.audio.duration) ? this.audio.duration * 1000 : (this.track?.durationMs || 0);
      const target = Math.min(Math.max(0, timeMs), durationMs || Infinity);
      this.audio.currentTime = target / 1000;
      this.pendingSeekMs = null;
      return true;
    } catch {
      // Keep the requested position until metadata/seekable ranges are ready.
      this.pendingSeekMs = timeMs;
      return false;
    }
  }

  setSpeed(speed) {
    this.playbackRate = speed;
    this.playStartPerfMs = performance.now();
    this.playStartTimeMs = this.currentTimeMs;
    if (this.audio) {
      this.audio.playbackRate = speed;
      this.audio.preservesPitch = true;
    }
  }

  setGhostMode(mode) {
    if (mode !== 'translucent' && mode !== 'hidden') return;
    this.ghostMode = mode;
    if (this.surface) this.surface.invalidate();
  }

  setCameraFollow(enabled) {
    this.autoFollow = !!enabled;
    if (!this.autoFollow) {
      this._replayFollowTarget = null;
      this.surface?.cam?.cancelGlide?.();
    }
    else this.followActiveStroke();
    this.surface?.invalidate();
  }

  syncClock() {
    if (this.audio && !this.audio.paused && Number.isFinite(this.audio.currentTime)) {
      this.currentTimeMs = this.audio.currentTime * 1000;
      this.playStartPerfMs = performance.now();
      this.playStartTimeMs = this.currentTimeMs;
    }
    if (this.surface) this.surface.invalidate();
  }

  onEnded() {
    this.pause();
    this.currentTimeMs = this.track?.durationMs || this.currentTimeMs;
    if (this.surface) this.surface.invalidate();
  }

  loop() {
    if (!this.active) return;
    const dur = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    if (this.audio && !this.audio.paused && Number.isFinite(this.audio.currentTime)) {
      this.currentTimeMs = this.audio.currentTime * 1000;
      this.playStartPerfMs = performance.now();
      this.playStartTimeMs = this.currentTimeMs;
    } else {
      const elapsed = (performance.now() - (this.playStartPerfMs || performance.now())) * this.playbackRate;
      this.currentTimeMs = (this.playStartTimeMs || 0) + elapsed;
    }

    if (dur > 0 && this.currentTimeMs >= dur) {
      this.currentTimeMs = dur;
      this.onEnded();
      return;
    }

    if (this.surface) this.surface.invalidate();
    if (this.autoFollow) this.followActiveStroke();
    this.rafToken = requestAnimationFrame(() => this.loop());
  }

  getActiveStroke() {
    const doc = this.app?.store?.doc;
    if (!this.track?.id || !doc?.order) return null;
    for (const id of doc.order) {
      const o = doc.objects[id];
      if (o && o.audioId === this.track.id && o.t0 <= this.currentTimeMs && this.currentTimeMs < o.t1) return o;
    }
    return null;
  }

  followActiveStroke() {
    const stroke = this.getActiveStroke();
    const box = stroke?.bbox || (stroke ? boundsOf(stroke) : null);
    if (box && this.surface?.cam) {
      const cam = this.surface.cam;
      if (this._replayFollowTarget === stroke.id && cam._anim) return;
      const vp = cam.viewport(this.surface.width, this.surface.height);
      if (boxesIntersect(vp, box)) { this._replayFollowTarget = null; return; }
      this._replayFollowTarget = stroke.id;
      cam.glideTo(box, this.surface.width, this.surface.height, {
        duration: 300,
        onStep: () => this.surface?.invalidate(),
        onDone: () => { this._replayFollowTarget = null; }
      });
    }
  }
}
