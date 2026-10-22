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

  showBookmarkCard(bm, clientX) {
    if (!bm || !this.canvas) return;
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
    const host = this.canvas.parentElement || (typeof document !== 'undefined' ? document.body : null);
    if (!host) return;

    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'density-bm-tooltip';
      this.tooltipEl.style.cssText = 'position:absolute;z-index:1020;bottom:calc(100% + 6px);transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--surface,#1f2328);color:var(--text,#ffffff);border:1px solid rgba(255,185,0,0.55);border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,0.35);font-size:11.5px;font-weight:600;white-space:nowrap;user-select:none;pointer-events:auto;';

      this.tooltipEl.addEventListener('mouseenter', () => {
        if (this._hideTimeout) {
          clearTimeout(this._hideTimeout);
          this._hideTimeout = null;
        }
      });
      this.tooltipEl.addEventListener('mouseleave', () => {
        this.hideBookmarkCard(200);
      });
      host.appendChild(this.tooltipEl);
    }

    const rect = this.canvas.getBoundingClientRect();
    const duration = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    const bx = duration > 0 ? (bm.t / duration) * rect.width : (clientX - rect.left);
    this.tooltipEl.style.left = `${Math.round(bx)}px`;

    const sec = Math.floor(bm.t / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    this.tooltipEl.innerHTML = '';
    this.tooltipEl.style.flexDirection = 'column';
    this.tooltipEl.style.alignItems = 'flex-start';

    const label = document.createElement('span');
    label.style.cssText = 'display:flex;align-items:center;gap:4px;color:#ffb900;';
    const icon = document.createElement('span');
    icon.textContent = '🔖';
    const labelText = document.createElement('span');
    labelText.style.cssText = 'color:inherit;font-variant-numeric:tabular-nums;';
    label.append(icon, labelText);
    const updateLabel = () => {
      labelText.textContent = `${timeStr}${bm.name ? ` · ${bm.name}` : ''}`;
    };
    updateLabel();

    const btnJump = document.createElement('button');
    btnJump.className = 'density-bm-jump-btn';
    btnJump.style.cssText = 'background:#ffb900;color:#000000;border:none;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;';
    btnJump.textContent = 'Jump';
    btnJump.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (this.onSeek) this.onSeek(Math.round(bm.t));
      this.hideBookmarkCard(0);
    });

    const btnName = document.createElement('button');
    btnName.className = 'density-bm-name-btn';
    btnName.style.cssText = 'background:none;border:none;color:inherit;opacity:0.8;cursor:pointer;padding:2px 4px;font-size:11px;display:inline-flex;align-items:center;';
    btnName.innerHTML = '✏️';
    btnName.title = 'Name bookmark';

    const editWrap = document.createElement('div');
    editWrap.className = 'density-bm-edit-wrap';
    editWrap.style.cssText = 'display:none;align-items:center;gap:4px;margin-top:4px;';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = bm.name || '';
    nameInput.placeholder = 'Bookmark name...';
    nameInput.style.cssText = 'padding:2px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);background:rgba(0,0,0,0.3);color:inherit;font-size:11px;width:120px;outline:none;';
    const btnSave = document.createElement('button');
    btnSave.textContent = 'Save';
    btnSave.style.cssText = 'background:#ffb900;color:#000;border:none;border-radius:6px;padding:2px 6px;font-size:10.5px;font-weight:700;cursor:pointer;';

    const saveName = (ev) => {
      ev.stopPropagation();
      bm.name = nameInput.value.trim();
      updateLabel();
      editWrap.style.display = 'none';
      if (this.onBookmarkRenamed) this.onBookmarkRenamed(bm);
    };

    btnSave.addEventListener('click', saveName);
    nameInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') saveName(ev);
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        nameInput.value = bm.name || '';
        editWrap.style.display = 'none';
      }
    });

    btnName.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = editWrap.style.display === 'none';
      editWrap.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) setTimeout(() => nameInput.focus(), 50);
    });

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
    topRow.appendChild(label);
    topRow.appendChild(btnJump);
    topRow.appendChild(btnName);

    this.tooltipEl.appendChild(topRow);
    editWrap.appendChild(nameInput);
    editWrap.appendChild(btnSave);
    this.tooltipEl.appendChild(editWrap);

    this.tooltipEl.style.display = 'flex';
  }

  hideBookmarkCard(delay = 250) {
    if (this._hideTimeout) clearTimeout(this._hideTimeout);
    if (delay <= 0) {
      if (this.tooltipEl) this.tooltipEl.style.display = 'none';
      return;
    }
    this._hideTimeout = setTimeout(() => {
      if (this.tooltipEl) this.tooltipEl.style.display = 'none';
      this._hideTimeout = null;
    }, delay);
  }

  bookmarkAt(clientX) {
    if (!this.canvas || !Array.isArray(this.track?.bookmarks)) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const duration = this.track?.durationMs || (this.audioBuffer?.duration ? this.audioBuffer.duration * 1000 : 0);
    if (duration <= 0) return null;
    const x = clientX - rect.left;
    for (const bm of this.track.bookmarks) {
      if (bm.t != null) {
        const bx = (bm.t / duration) * rect.width;
        if (Math.abs(x - bx) <= 7) return bm;
      }
    }
    return null;
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

    this.canvas.addEventListener('pointermove', (e) => {
      if (dragging) return;
      const bm = this.bookmarkAt(e.clientX);
      if (bm) {
        this.canvas.style.cursor = 'pointer';
        this.showBookmarkCard(bm, e.clientX);
      } else {
        this.canvas.style.cursor = 'ew-resize';
        this.hideBookmarkCard(250);
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      if (!dragging) this.hideBookmarkCard(300);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const bm = this.bookmarkAt(e.clientX);
      if (bm) {
        if (this.onSeek) this.onSeek(Math.round(bm.t));
        this.hideBookmarkCard(0);
        return;
      }
      dragging = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      seekAt(e);

      const onMove = (ev) => {
        if (!dragging) return;
        ev.preventDefault();
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
