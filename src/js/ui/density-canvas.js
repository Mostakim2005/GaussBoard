// Timeline stroke density scrubber canvas.
// Plots stroke density ticks / intensity heatmap and bookmark pins across lecture duration.

export class DensityCanvas {
  /**
   * @param {object} opts
   * @param {number} [opts.width]   Display width in CSS pixels
   * @param {number} [opts.height]  Display height in CSS pixels
   * @param {(timeMs: number) => void} [opts.onSeek] Callback when user seeks by click/drag
   */
  constructor({ width = 240, height = 24, onSeek = null } = {}) {
    this.width = width;
    this.height = height;
    this.onSeek = onSeek;
    this.track = null;
    this.objects = null;
    this.currentTimeMs = 0;

    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.className = 'density-canvas';
      this.canvas.style.cssText = `width:${width}px;height:${height}px;cursor:pointer;border-radius:4px;display:block;touch-action:none;`;
      this.ctx = this.canvas.getContext('2d');
      this.wireEvents();
    }
    this.audioBuffer = null;
    this.waveformPeaks = null;
  }

  setAudioBuffer(buf) {
    if (!buf) return;
    this.audioBuffer = buf;
    const channel = buf.getChannelData(0);
    const numBars = 60;
    const step = Math.floor(channel.length / numBars);
    const peaks = new Float32Array(numBars);
    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j += 10) {
        const val = Math.abs(channel[start + j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }
    this.waveformPeaks = peaks;
    this.render();
  }

  wireEvents() {
    if (!this.canvas) return;
    let dragging = false;

    const seekAt = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const duration = (this.track?.durationMs > 0 ? this.track.durationMs : null)
        || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : null)
        || 0;
      if (duration <= 0) return;
      const t = (x / rect.width) * duration;
      if (this.onSeek) this.onSeek(Math.round(t));
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      seekAt(e);

      const onMove = (ev) => {
        if (!dragging) return;
        seekAt(ev);
      };

      const onUp = (ev) => {
        dragging = false;
        try { this.canvas.releasePointerCapture(ev.pointerId); } catch {}
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  update({ track = null, objects = null, currentTimeMs = null, audioBuffer = null } = {}) {
    if (track !== null) this.track = track;
    if (objects !== null) this.objects = objects;
    if (currentTimeMs !== null) this.currentTimeMs = currentTimeMs;
    if (audioBuffer !== null && audioBuffer !== this.audioBuffer) this.setAudioBuffer(audioBuffer);
    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const duration = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    if (duration <= 0) {
      // Empty placeholder track
      ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
      ctx.fillRect(0, h / 2 - 2, w, 4);
      return;
    }

    const px = Math.max(0, Math.min(w, (this.currentTimeMs / duration) * w));

    if (this.waveformPeaks && this.waveformPeaks.length > 0) {
      // Render audio waveform bars
      const numBars = this.waveformPeaks.length;
      const barWidth = 2.5;
      const spacing = (w - (numBars * barWidth)) / Math.max(1, numBars - 1);

      for (let i = 0; i < numBars; i++) {
        const bx = i * (barWidth + spacing);
        const peak = Math.max(0.12, Math.min(1.0, this.waveformPeaks[i] * 1.8));
        const barH = Math.max(4, Math.round(peak * (h - 4)));
        const by = Math.round((h - barH) / 2);

        // Pink for elapsed, light translucent gray for future
        ctx.fillStyle = bx <= px ? '#e91e63' : 'rgba(128, 128, 128, 0.3)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bx, by, barWidth, barH, 1.5);
        } else {
          ctx.rect(bx, by, barWidth, barH);
        }
        ctx.fill();
      }
    } else {
      // Background track with pink elapsed progress
      ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
      ctx.fillRect(0, h / 2 - 2, w, 4);

      ctx.fillStyle = '#e91e63';
      ctx.fillRect(0, h / 2 - 2, px, 4);

      // Collect all stroke timestamps for active track
      const trackId = this.track?.id;
      if (this.objects && trackId) {
        const list = Array.isArray(this.objects) ? this.objects : Object.values(this.objects);
        ctx.fillStyle = 'rgba(233, 30, 99, 0.55)';
        for (const o of list) {
          if (o && o.audioId === trackId && o.t0 != null) {
            const x = Math.round((o.t0 / duration) * w);
            ctx.fillRect(x - 0.5, 2, 1.5, h - 4);
          }
        }
      }
    }

    // Render bookmarks (gold diamonds)
    if (Array.isArray(this.track?.bookmarks)) {
      ctx.fillStyle = '#ffb900';
      for (const bm of this.track.bookmarks) {
        if (bm.t != null) {
          const bx = Math.round((bm.t / duration) * w);
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.lineTo(bx + 3.5, 5);
          ctx.lineTo(bx, 10);
          ctx.lineTo(bx - 3.5, 5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Render playhead scrubber knob
    ctx.fillStyle = '#e91e63';
    ctx.shadowColor = 'rgba(233, 30, 99, 0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(px, h / 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
