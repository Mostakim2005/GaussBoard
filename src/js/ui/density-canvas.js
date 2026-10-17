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
  }

  wireEvents() {
    if (!this.canvas) return;
    let dragging = false;

    const seekAt = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const duration = this.track?.durationMs || 1;
      const t = (x / Math.max(1, rect.width)) * duration;
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

  update({ track = null, objects = null, currentTimeMs = null } = {}) {
    if (track !== null) this.track = track;
    if (objects !== null) this.objects = objects;
    if (currentTimeMs !== null) this.currentTimeMs = currentTimeMs;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Background track
    ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const duration = this.track?.durationMs || 0;
    if (duration <= 0) return;

    // Collect all timestamps for active track
    const trackId = this.track.id;
    const timestamps = [];
    if (this.objects) {
      const list = Array.isArray(this.objects) ? this.objects : Object.values(this.objects);
      for (const o of list) {
        if (o && o.audioId === trackId && o.t0 != null) {
          timestamps.push(o.t0);
        }
      }
    }

    // Density visualization: ticks vs heatmap aggregation
    if (timestamps.length > 500) {
      const numBuckets = Math.min(100, Math.floor(w));
      const buckets = new Uint16Array(numBuckets);
      for (const t of timestamps) {
        const b = Math.min(numBuckets - 1, Math.floor((t / duration) * numBuckets));
        if (b >= 0) buckets[b]++;
      }
      let maxCount = 1;
      for (let i = 0; i < numBuckets; i++) {
        if (buckets[i] > maxCount) maxCount = buckets[i];
      }
      const bw = w / numBuckets;
      for (let i = 0; i < numBuckets; i++) {
        if (!buckets[i]) continue;
        const alpha = 0.2 + (buckets[i] / maxCount) * 0.75;
        ctx.fillStyle = `rgba(0, 120, 212, ${alpha.toFixed(2)})`;
        ctx.fillRect(i * bw, 0, Math.ceil(bw), h);
      }
    } else if (timestamps.length > 0) {
      ctx.fillStyle = 'rgba(0, 120, 212, 0.45)';
      for (const t of timestamps) {
        const x = Math.round((t / duration) * w);
        ctx.fillRect(x - 0.5, 2, 1.5, h - 4);
      }
    }

    // Render bookmarks (gold diamonds)
    if (Array.isArray(this.track.bookmarks)) {
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

    // Render playhead scrubber needle and head
    const px = Math.max(0, Math.min(w, (this.currentTimeMs / duration) * w));
    ctx.fillStyle = '#0078d4';
    ctx.fillRect(px - 1, 0, 2, h);

    ctx.beginPath();
    ctx.arc(px, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
