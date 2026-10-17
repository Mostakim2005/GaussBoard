import { boxesIntersect } from './util.js';

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
    this.autoFollow = true;
    if (this.audio) {
      this.audio.addEventListener('timeupdate', () => this.syncClock());
      this.audio.addEventListener('ended', () => this.onEnded());
    }
  }

  loadTrack(track) {
    this.track = track;
    this.audioBuffer = null;
    if (track?.assetId && this.audio) {
      this.audio.src = `app://board/asset/${track.assetId}`;
      this.audio.load();
    }
    if (track?.assetId && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      try {
        fetch(`app://board/asset/${track.assetId}`)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            return ctx.decodeAudioData(buf).then((decoded) => {
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

  play() {
    const dur = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    if ((dur > 0 && this.currentTimeMs >= dur - 150) || (this.audio && this.audio.ended)) {
      this.seek(0);
    }
    if (this.surface) {
      this.surface._ink = null;
      this.surface.invalidate();
    }
    this.playStartPerfMs = performance.now();
    this.playStartTimeMs = this.currentTimeMs;
    if (this.audio) {
      this.audio.playbackRate = this.playbackRate;
      this.audio.preservesPitch = true;
      this.audio.play().catch(() => {});
    }
    this.active = true;
    this.loop();
  }

  pause() {
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
    const max = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0) || (this.audio?.duration ? this.audio.duration * 1000 : 0);
    const clamped = Math.min(Math.max(0, timeMs), max);
    this.currentTimeMs = clamped;
    this.playStartPerfMs = performance.now();
    this.playStartTimeMs = clamped;
    if (this.audio) {
      try {
        this.audio.currentTime = this.currentTimeMs / 1000;
      } catch {}
    }
    if (this.surface) {
      this.surface._ink = null;
      this.surface.invalidate();
    }
    if (this.autoFollow) this.followActiveStroke();
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

  syncClock() {
    if (this.audio && !this.audio.paused && this.audio.currentTime > 0) {
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
    if (this.audio && !this.audio.paused && this.audio.currentTime > 0) {
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
    if (stroke?.bbox && this.surface?.cam) {
      const vp = this.surface.cam.viewport(this.surface.width, this.surface.height);
      if (!boxesIntersect(vp, stroke.bbox)) {
        this.surface.cam.glideTo(stroke.bbox, this.surface.width, this.surface.height, { duration: 300 });
      }
    }
  }
}
