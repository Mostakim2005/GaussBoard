// Animated Video Export Engine.
// Multiplexes canvas reanimation and audio track into standalone .webm video files.

import { Surface } from './core/surface.js';
import { t } from './i18n.js';
import { isDarkBoard } from './core/render.js';
import { boundsOf } from './core/store.js';
import { boxesIntersect } from './core/util.js';
import { h } from './ui/popover.js';

export const VIDEO_EXPORT_PRESETS = Object.freeze({
  '720p30': Object.freeze({ width: 1280, height: 720, fps: 30 }),
  '1080p30': Object.freeze({ width: 1920, height: 1080, fps: 30 }),
  '1080p60': Object.freeze({ width: 1920, height: 1080, fps: 60 })
});

function waitForAudioReady(audio, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      audio.removeEventListener('canplaythrough', ready);
      audio.removeEventListener('error', failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(audio.error || new Error('Audio could not be loaded')); };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timeout'));
    }, timeoutMs);
    audio.addEventListener('canplaythrough', ready, { once: true });
    audio.addEventListener('error', failed, { once: true });
    audio.load();
  });
}

function durationForTrack(track, audio) {
  if (Number.isFinite(track.durationMs) && track.durationMs > 0) return track.durationMs;
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return 0;
}

export class VideoExporter {
  constructor(app) {
    this.app = app;
    this.cancelled = false;
    this.recorder = null;
  }

  cancel() {
    this.cancelled = true;
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop(); } catch {}
    }
  }

  /**
   * Export an audio track and canvas replay session to a video Blob.
   * @param {object} opts
   * @param {object} opts.track
   * @param {number} [opts.width]   Video width in pixels (default: 1920)
   * @param {number} [opts.height]  Video height in pixels (default: 1080)
   * @param {number} [opts.fps]     Target framerate (default: 30)
   * @param {(pct: number) => void} [opts.onProgress] Callback with 0.0 - 1.0 progress
   * @returns {Promise<{ blob: Blob, durationMs: number }>}
   */
  async exportReplayVideo({ track, width = 1920, height = 1080, fps = 30, onProgress = null } = {}) {
    if (!track) throw new Error('No audio track specified for video export');
    this.cancelled = false;

    // Create offscreen render canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Dedicated offscreen surface instance
    const sf = new Surface(canvas, this.app.store, { app: this.app, ephemeral: true });
    sf.resize(width, height);
    const replayClock = { track, currentTimeMs: 0, ghostMode: 'none' };

    // Auto-frame offscreen camera to encompass all notes recorded with this audio track
    const objs = this.app?.store?.doc?.objects || {};
    const trackStrokes = Object.values(objs).filter((o) => o && o.audioId === track.id);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of trackStrokes) {
      const b = s.bbox || boundsOf(s);
      if (b) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
    }
    if (minX < maxX) {
      const bw = Math.max(10, maxX - minX), bh = Math.max(10, maxY - minY);
      const pad = Math.max(48, Math.max(bw, bh) * 0.15);
      const box = { x: minX - pad, y: minY - pad, w: bw + pad * 2, h: bh + pad * 2 };
      const scale = Math.min(width / box.w, height / box.h);
      sf.cam.z = Math.max(0.3, Math.min(scale, 2.0));
      sf.cam.x = (width - box.w * sf.cam.z) / 2 - box.x * sf.cam.z;
      sf.cam.y = (height - box.h * sf.cam.z) / 2 - box.y * sf.cam.z;
    } else if (this.app?.surface?.cam) {
      sf.cam.x = this.app.surface.cam.x;
      sf.cam.y = this.app.surface.cam.y;
      sf.cam.z = this.app.surface.cam.z;
    }

    // Audio element
    const audio = new Audio();
    audio.src = `app://board/asset/${track.assetId}`;
    audio.crossOrigin = 'anonymous';
    let audioCtx = null;
    let source = null;
    let videoStream = null;
    let rec = null;
    try {
    await waitForAudioReady(audio);
    const durationMs = durationForTrack(track, audio);
    if (!durationMs) throw new Error('Could not determine audio duration');

    // Setup Web Audio routing to capture audio stream without microphone bleed
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    source = audioCtx.createMediaElementSource(audio);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    // Capture canvas video stream
    videoStream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!videoStream) {
      throw new Error('Canvas captureStream not supported in this environment');
    }

    const combinedTracks = [
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ];
    const combinedStream = new MediaStream(combinedTracks);

    // Choose preferred video container
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const chunks = [];
    rec = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 4000000 // 4 Mbps high-definition target
    });
    this.recorder = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const completionPromise = new Promise((resolve, reject) => {
      rec.onstop = () => {
        audioCtx.close().catch(() => {});
        if (this.cancelled) {
          reject(new Error('Export cancelled by user'));
        } else {
          resolve(new Blob(chunks, { type: mimeType }));
        }
      };
      rec.onerror = (err) => {
        audioCtx.close().catch(() => {});
        reject(err);
      };
    });

    rec.start(250); // 250ms chunk slicing for reliable video data
    await audio.play();

    // Replay render loop driven by audio playback clock
    const frameInterval = 1000 / fps;
    const ctx = canvas.getContext('2d');
    const videoTrack = videoStream.getVideoTracks()[0];

    const renderLoop = async () => {
      if (this.cancelled || audio.ended || (audio.currentTime * 1000 >= durationMs)) {
        audio.pause();
        try { rec.requestData(); } catch {}
        // Give recorder brief moment to finalize final chunk
        setTimeout(() => {
          if (rec.state !== 'inactive') rec.stop();
        }, 150);
        return;
      }

      // Synchronize clock and redraw offscreen canvas
      const curMs = audio.currentTime * 1000;
      replayClock.currentTimeMs = curMs;

      // Deterministically render solid background, base scene, and synchronized replay session
      ctx.save();
      ctx.fillStyle = isDarkBoard() ? '#1f1e1d' : '#f5f4f2';
      ctx.fillRect(0, 0, width, height);
      sf.drawScene(ctx, width, height, () => {}, null, (o) => o.audioId !== track.id);
      sf.drawReplaySession(ctx, replayClock);
      ctx.restore();

      if (videoTrack?.requestFrame) {
        try { videoTrack.requestFrame(); } catch {}
      }

      if (onProgress) {
        onProgress(Math.min(1.0, curMs / durationMs));
      }

      setTimeout(renderLoop, frameInterval);
    };

    renderLoop();

    const blob = await completionPromise;
    return { blob, durationMs };
    } finally {
      if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch {} }
      try { source?.disconnect(); } catch {}
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      videoStream?.getTracks().forEach((streamTrack) => streamTrack.stop());
      sf.destroy();
      audioCtx?.close().catch(() => {});
    }
  }

  /**
   * Sequentially stitches multiple recordings and stroke sessions into a single WebM video.
   */
  async exportStitchedReplayVideo({ tracks, width = 1920, height = 1080, fps = 30, onProgress = null } = {}) {
    if (!tracks || !tracks.length) throw new Error('No audio tracks specified for video export');
    if (tracks.length === 1) return this.exportReplayVideo({ track: tracks[0], width, height, fps, onProgress });

    this.cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const sf = new Surface(canvas, this.app.store, { app: this.app, ephemeral: true });
    sf.resize(width, height);
    let videoStream = null;
    let audioCtx = null;
    let rec = null;
    let activeAudio = null;
    let activeSource = null;
    const replayClock = { track: null, currentTimeMs: 0, ghostMode: 'none' };
    try {
    videoStream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!videoStream) throw new Error('Canvas captureStream not supported in this environment');

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();

    const combinedTracks = [
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ];
    const combinedStream = new MediaStream(combinedTracks);

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const chunks = [];
    rec = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 4000000
    });
    this.recorder = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const completionPromise = new Promise((resolve, reject) => {
      rec.onstop = () => {
        audioCtx.close().catch(() => {});
        if (this.cancelled) reject(new Error('Export cancelled by user'));
        else resolve(new Blob(chunks, { type: mimeType }));
      };
      rec.onerror = (err) => {
        audioCtx.close().catch(() => {});
        reject(err);
      };
    });

    rec.start(250);

    const totalDurationMs = tracks.reduce((sum, tr) => sum + (Number.isFinite(tr.durationMs) && tr.durationMs > 0 ? tr.durationMs : 0), 0);
    let cumulativeElapsedMs = 0;
    const frameInterval = 1000 / fps;
    const ctx = canvas.getContext('2d');
    const videoTrack = videoStream.getVideoTracks()[0];

    const frameTrack = (track) => {
      const objs = this.app?.store?.doc?.objects || {};
      const trackStrokes = Object.values(objs).filter((o) => o && o.audioId === track.id);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of trackStrokes) {
        const b = s.bbox || boundsOf(s);
        if (b) {
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.w);
          maxY = Math.max(maxY, b.y + b.h);
        }
      }
      if (minX < maxX) {
        const bw = Math.max(10, maxX - minX), bh = Math.max(10, maxY - minY);
        const pad = Math.max(48, Math.max(bw, bh) * 0.15);
        const box = { x: minX - pad, y: minY - pad, w: bw + pad * 2, h: bh + pad * 2 };
        const scale = Math.min(width / box.w, height / box.h);
        sf.cam.z = Math.max(0.3, Math.min(scale, 2.0));
        sf.cam.x = (width - box.w * sf.cam.z) / 2 - box.x * sf.cam.z;
        sf.cam.y = (height - box.h * sf.cam.z) / 2 - box.y * sf.cam.z;
      }
    };

    for (let i = 0; i < tracks.length; i++) {
      if (this.cancelled) break;
      const track = tracks[i];
      replayClock.track = track;
      replayClock.currentTimeMs = 0;
      frameTrack(track);

      const audio = new Audio();
      activeAudio = audio;
      audio.src = `app://board/asset/${track.assetId}`;
      audio.crossOrigin = 'anonymous';

      await waitForAudioReady(audio);

      const trackDur = durationForTrack(track, audio);
      if (!trackDur) throw new Error('Could not determine audio duration');

      const source = audioCtx.createMediaElementSource(audio);
      activeSource = source;
      source.connect(dest);
      await audio.play();

      await new Promise((done) => {
        const checkDone = () => {
          if (this.cancelled || audio.ended || (audio.currentTime * 1000 >= trackDur)) {
            audio.pause();
            try { source.disconnect(); } catch {}
            cumulativeElapsedMs += trackDur;
            audio.removeAttribute('src');
            audio.load();
            activeAudio = null;
            activeSource = null;
            done();
            return;
          }

          const curMs = audio.currentTime * 1000;
          replayClock.currentTimeMs = curMs;

          ctx.save();
          ctx.fillStyle = isDarkBoard() ? '#1f1e1d' : '#f5f4f2';
          ctx.fillRect(0, 0, width, height);
          sf.drawScene(ctx, width, height, () => {}, null, (o) => o.audioId !== track.id);
          sf.drawReplaySession(ctx, replayClock);
          ctx.restore();

          if (videoTrack?.requestFrame) {
            try { videoTrack.requestFrame(); } catch {}
          }

          if (onProgress) {
            onProgress(totalDurationMs > 0 ? Math.min(1.0, (cumulativeElapsedMs + curMs) / totalDurationMs) : 0);
          }

          setTimeout(checkDone, frameInterval);
        };
        checkDone();
      });
    }

    try { rec.requestData(); } catch {}
    setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
    }, 200);

    const blob = await completionPromise;
    return { blob, durationMs: cumulativeElapsedMs };
    } finally {
      if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch {} }
      try { activeSource?.disconnect(); } catch {}
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.removeAttribute('src');
        activeAudio.load();
      }
      videoStream?.getTracks().forEach((streamTrack) => streamTrack.stop());
      sf.destroy();
      audioCtx?.close().catch(() => {});
    }
  }
}

export async function pickRecordingsForVideoExport(app, trackOverride = null) {
  const tracks = (trackOverride || app.store?.doc?.audioTracks || []).map((t, idx) => ({ ...t, originalIndex: idx }));
  if (!tracks.length) {
    app.toast(t('No audio track to export'));
    return null;
  }

  return new Promise((resolve) => {
    let items = [...tracks];
    const selectedIds = new Set(tracks.map((t) => t.id));
    let stitchTogether = tracks.length > 1;

    const overlay = h('div', {
      id: 'videoExportModal',
      style: 'position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;'
    });

    const card = h('div', {
      style: 'background:var(--surface);border:1px solid var(--stroke);border-radius:14px;padding:20px;width:min(480px,90vw);box-shadow:var(--shadow-3);display:flex;flex-direction:column;gap:14px;'
    });

    const titleRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
      h('h3', { style: 'margin:0;font-size:16px;font-weight:700;' }, t('Export Video (Select Recordings)')),
      h('button', {
        style: 'background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-2);',
        onclick: () => { overlay.remove(); resolve(null); }
      }, '✕')
    );

    const desc = h('p', { style: 'margin:0;font-size:12.5px;color:var(--text-2);' },
      t('Choose which recordings to export. Use ▲ and ▼ to set the playback order.')
    );

    const preset = h('select', { 'aria-label': t('Video quality'), style: 'padding:7px 9px;border-radius:7px;background:var(--surface-2);color:var(--text);border:1px solid var(--stroke)' },
      h('option', { value: '720p30' }, '720p · 30 fps'),
      h('option', { value: '1080p30' }, '1080p · 30 fps'),
      h('option', { value: '1080p60' }, '1080p · 60 fps'));
    preset.value = '1080p30';

    const listContainer = h('div', {
      style: 'display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;border:1px solid var(--stroke);border-radius:8px;padding:8px;'
    });

    const renderList = () => {
      listContainer.innerHTML = '';
      items.forEach((item, idx) => {
        const isChecked = selectedIds.has(item.id);
        const formatTime = (ms) => {
          const s = Math.round((ms || 0) / 1000);
          const m = Math.floor(s / 60);
          return `${m}:${String(s % 60).padStart(2, '0')}`;
        };

        const chk = h('input', { type: 'checkbox', style: 'cursor:pointer;' });
        chk.checked = isChecked;
        chk.onchange = () => {
          if (chk.checked) selectedIds.add(item.id);
          else selectedIds.delete(item.id);
          renderList();
        };

        const nameLabel = h('span', { style: 'flex:1;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' },
          item.name || t('Recording {n}', { n: idx + 1 })
        );
        const durLabel = h('span', { style: 'font-size:12px;color:var(--text-2);margin-right:8px;' },
          formatTime(item.durationMs)
        );

        const btnUp = h('button', {
          class: 'btn', style: 'padding:2px 6px;font-size:10px;',
          disabled: idx === 0,
          onclick: () => {
            const temp = items[idx];
            items[idx] = items[idx - 1];
            items[idx - 1] = temp;
            renderList();
          }
        }, '▲');

        const btnDown = h('button', {
          class: 'btn', style: 'padding:2px 6px;font-size:10px;',
          disabled: idx === items.length - 1,
          onclick: () => {
            const temp = items[idx];
            items[idx] = items[idx + 1];
            items[idx + 1] = temp;
            renderList();
          }
        }, '▼');

        const row = h('div', {
          style: 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;background:var(--surface-2);'
        }, chk, nameLabel, durLabel, btnUp, btnDown);

        listContainer.appendChild(row);
      });
    };

    renderList();

    const stitchRow = h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:2px;' });
    const stitchChk = h('input', { type: 'checkbox' });
    stitchChk.checked = stitchTogether;
    stitchChk.onchange = () => { stitchTogether = stitchChk.checked; };
    stitchRow.appendChild(stitchChk);
    stitchRow.appendChild(h('span', {}, t('Stitch selected recordings into one combined video')));

    const actionRow = h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:8px;' });
    const btnCancel = h('button', { class: 'btn', onclick: () => { overlay.remove(); resolve(null); } }, t('Cancel'));
    const btnExport = h('button', { class: 'btn primary' }, t('Export Video'));
    btnExport.onclick = () => {
      const chosen = items.filter((it) => selectedIds.has(it.id));
      if (!chosen.length) {
        app.toast(t('Select at least one recording'));
        return;
      }
      overlay.remove();
      resolve({ tracks: chosen, stitch: stitchTogether, video: { ...VIDEO_EXPORT_PRESETS[preset.value] } });
    };

    actionRow.appendChild(btnCancel);
    actionRow.appendChild(btnExport);

    card.appendChild(titleRow);
    card.appendChild(desc);
    card.appendChild(h('label', { style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px' },
      t('Video quality'), preset));
    card.appendChild(listContainer);
    if (tracks.length > 1) card.appendChild(stitchRow);
    card.appendChild(actionRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

/**
 * High-level helper to trigger export dialog and save video file.
 */
export async function exportVideoFile(app, track = null) {
  let selectedTracks = [];
  let shouldStitch = true;
  let video = VIDEO_EXPORT_PRESETS['1080p30'];

  const picked = await pickRecordingsForVideoExport(app, track ? [track] : null);
  if (!picked) return null;
  selectedTracks = picked.tracks;
  shouldStitch = track ? false : picked.stitch;
  video = picked.video || video;

  if (!selectedTracks.length) return null;

  if (shouldStitch || selectedTracks.length === 1) {
    const filePath = await window.board.saveDialog({
      title: t('Save a copy'),
      defaultPath: `${app.store.doc.name || 'Board'}-replay.webm`,
      filters: [{ name: 'WebM Video', extensions: ['webm'] }]
    });
    if (!filePath) return null;

    const exporter = new VideoExporter(app);
    let progress = null;
    if (typeof app.showProgress === 'function') {
      progress = app.showProgress(t('Export Video (WebM)'), t('Exporting replay video ({pct}%)...', { pct: 0 }));
      const card = document.getElementById('overlayCard');
      if (card) {
        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn';
        btnCancel.style.marginTop = '12px';
        btnCancel.textContent = t('Cancel');
        btnCancel.onclick = () => {
          exporter.cancel();
          progress.close();
        };
        card.appendChild(btnCancel);
      }
    }

    try {
      const { blob } = await exporter.exportStitchedReplayVideo({
        tracks: selectedTracks,
        ...video,
        onProgress: (pct) => {
          const rounded = Math.round(pct * 100);
          progress?.update(pct, t('Exporting replay video ({pct}%)...', { pct: rounded }));
        }
      });

      if (exporter.cancelled) return null;

      const buf = await blob.arrayBuffer();
      await window.board.writeFile(filePath, new Uint8Array(buf));
      progress?.close();
      app.toast(t('Saved {name}', { name: filePath.split(/[\\/]/).pop() }));
      return filePath;
    } catch (err) {
      progress?.close();
      if (!exporter.cancelled) {
        app.toast(err.message || 'Export failed');
      }
      return null;
    }
  } else {
    // Export each track separately
    for (let i = 0; i < selectedTracks.length; i++) {
      const tr = selectedTracks[i];
      const safeName = (tr.name || `Recording-${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filePath = await window.board.saveDialog({
        title: t('Save {name}', { name: tr.name || 'Recording' }),
        defaultPath: `${app.store.doc.name || 'Board'}-${safeName}.webm`,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }]
      });
      if (!filePath) continue;

      const exporter = new VideoExporter(app);
      let progress = null;
      if (typeof app.showProgress === 'function') {
        progress = app.showProgress(t('Export Video (WebM)'), t('Exporting {name} ({pct}%)...', { name: tr.name || '', pct: 0 }));
      }

      try {
        const { blob } = await exporter.exportReplayVideo({
          track: tr,
          ...video,
          onProgress: (pct) => {
            const rounded = Math.round(pct * 100);
            progress?.update(pct, t('Exporting {name} ({pct}%)...', { name: tr.name || '', pct: rounded }));
          }
        });
        if (!exporter.cancelled) {
          const buf = await blob.arrayBuffer();
          await window.board.writeFile(filePath, new Uint8Array(buf));
          progress?.close();
          app.toast(t('Saved {name}', { name: filePath.split(/[\\/]/).pop() }));
        }
      } catch (err) {
        progress?.close();
        if (!exporter.cancelled) app.toast(err.message || 'Export failed');
      }
    }
    return true;
  }
}

