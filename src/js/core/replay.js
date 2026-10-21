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
    this.followMode = ['viewport', 'center', 'dead-zone'].includes(this.app?.settings?.replayCameraMode)
      ? this.app.settings.replayCameraMode : 'viewport';
    this.pendingSeekMs = null;
    this.loadGeneration = 0;
    this.playGeneration = 0;
    this.lastError = null;
    this._centerFollowAt = null;
    if (this.audio) {
      this.audio.addEventListener('timeupdate', () => this.syncClock());
      this.audio.addEventListener('ended', () => this.onEnded());
      this.audio.addEventListener('loadedmetadata', () => this.applyPendingSeek());
      this.audio.addEventListener('canplay', () => this.applyPendingSeek());
      this.audio.addEventListener('seeked', () => {
        if (!this.audio) return;
        if (this.pendingSeekMs != null) {
          const targetSeconds = this.pendingSeekMs / 1000;
          if (Math.abs(this.audio.currentTime - targetSeconds) < 0.05) this.pendingSeekMs = null;
          else { this.applyPendingSeek(); return; }
        }
        this.currentTimeMs = this.audio.currentTime * 1000;
        this.playStartPerfMs = performance.now();
        this.playStartTimeMs = this.currentTimeMs;
        this.surface?.invalidate();
      });
      this.audio.addEventListener('error', () => {
        this.lastError = new Error('The selected audio could not be loaded.');
        this.pause();
      });
    }
  }

  loadTrack(track) {
    const generation = ++this.loadGeneration;
    this.pause();
    this._centerFollowAt = null;
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
    if (this.pendingSeekMs != null && this.audio) {
      const seekReady = await this.waitForPendingSeek(request);
      if (!seekReady || request !== this.playGeneration) return false;
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

  waitForPendingSeek(request) {
    const audio = this.audio;
    const target = this.pendingSeekMs;
    if (!audio || target == null) return Promise.resolve(true);
    if (typeof audio.addEventListener !== 'function' || typeof audio.removeEventListener !== 'function') {
      return Promise.resolve(true);
    }
    const atTarget = () => this.pendingSeekMs == null && !audio.seeking
      && Math.abs((audio.currentTime || 0) * 1000 - target) < 50;
    if (atTarget()) return Promise.resolve(true);

    return new Promise((resolve) => {
      let timer = null;
      const events = ['loadedmetadata', 'canplay', 'seeked', 'error'];
      const finish = (ok) => {
        if (timer != null) clearTimeout(timer);
        for (const event of events) audio.removeEventListener(event, check);
        resolve(ok);
      };
      const check = (event) => {
        if (request !== this.playGeneration || audio !== this.audio) return finish(false);
        if (event?.type === 'error') return finish(false);
        if (this.pendingSeekMs != null) this.applyPendingSeek();
        if (atTarget()) finish(true);
      };
      for (const event of events) audio.addEventListener(event, check);
      timer = setTimeout(() => finish(atTarget()), 3000);
      check();
    });
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
      // Keep the requested clock authoritative until Chromium confirms the
      // seek. Otherwise the next animation frame can replace a failed/pending
      // seek with the media element's old currentTime.
      this.pendingSeekMs = clamped;
      if (this.audio.readyState >= 1) this.applyPendingSeek(clamped);
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
      const targetSeconds = target / 1000;
      if (Math.abs((this.audio.currentTime || 0) - targetSeconds) < 0.025 && !this.audio.seeking) {
        this.pendingSeekMs = null;
        return true;
      }
      this.pendingSeekMs = target;
      this.audio.currentTime = targetSeconds;
      // Some media backends do not dispatch `seeked` for a no-op seek. Keep a
      // small tolerance check for that case without losing asynchronous seeks.
      if (!this.audio.seeking && Math.abs(this.audio.currentTime - targetSeconds) < 0.025) {
        this.pendingSeekMs = null;
        return true;
      }
      queueMicrotask(() => {
        if (this.audio && !this.audio.seeking && Math.abs(this.audio.currentTime - targetSeconds) < 0.025
          && this.pendingSeekMs === target) this.pendingSeekMs = null;
      });
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

  setCameraMode(mode) {
    if (!['viewport', 'center', 'dead-zone'].includes(mode)) return;
    this.followMode = mode;
    this._centerFollowAt = null;
    this._replayFollowTarget = null;
    this.surface?.cam?.cancelGlide?.();
    if (this.autoFollow) this.followActiveStroke();
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
    if (this.pendingSeekMs != null) {
      this.currentTimeMs = this.pendingSeekMs;
    } else if (this.audio && !this.audio.paused && Number.isFinite(this.audio.currentTime)) {
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

  getActivePoint(stroke = this.getActiveStroke()) {
    const points = stroke?.points;
    if (!Array.isArray(points) || !points.length) return null;
    let point = points[0];
    for (const candidate of points) {
      if (candidate.t == null || candidate.t <= this.currentTimeMs) point = candidate;
      else break;
    }
    return Number.isFinite(point?.x) && Number.isFinite(point?.y) ? point : null;
  }

  followActiveStroke() {
    const stroke = this.getActiveStroke();
    const box = stroke?.bbox || (stroke ? boundsOf(stroke) : null);
    if (box && this.surface?.cam && this.followMode === 'viewport') {
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
      return;
    }
    const point = this.getActivePoint(stroke);
    const cam = this.surface?.cam;
    if (!point || !cam) return;
    cam.cancelGlide?.();
    this._replayFollowTarget = stroke?.id || null;
    const screen = cam.toScreen(point.x, point.y);
    const width = this.surface.width, height = this.surface.height;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = this._centerFollowAt == null ? 16 : Math.max(1, now - this._centerFollowAt);
    this._centerFollowAt = now;
    let dx = 0, dy = 0;
    if (this.followMode === 'center') {
      dx = width / 2 - screen.x;
      dy = height / 2 - screen.y;
    } else {
      // A 40% x 40% central dead zone mirrors the user's sketched frame:
      // leave the camera still until the animated point reaches its edge.
      const left = width * 0.3, right = width * 0.7;
      const top = height * 0.3, bottom = height * 0.7;
      if (screen.x < left) dx = left - screen.x;
      else if (screen.x > right) dx = right - screen.x;
      if (screen.y < top) dy = top - screen.y;
      else if (screen.y > bottom) dy = bottom - screen.y;
    }
    if (dx || dy) {
      if (this.followMode === 'center') {
        // Smooth center-follow across playback frames so sampled point jitter
        // does not translate directly into a shaky camera.
        const blend = 1 - Math.exp(-elapsed / 180);
        const moveX = Math.abs(dx) < 0.75 ? 0 : dx * blend;
        const moveY = Math.abs(dy) < 0.75 ? 0 : dy * blend;
        if (moveX || moveY) cam.panBy(moveX, moveY);
      } else {
        cam.panBy(dx, dy);
      }
      this.surface.invalidate();
    }
  }
}
