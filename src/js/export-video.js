// Animated Video Export Engine.
// Multiplexes canvas reanimation and audio track into standalone .webm video files.

import { Surface } from './core/surface.js';
import { t } from './i18n.js';

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
    const sf = new Surface(canvas, this.app.store, { app: this.app });
    sf.resize(width, height);

    // Audio element
    const audio = new Audio();
    audio.src = `app://board/asset/${track.assetId}`;
    audio.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      audio.oncanplaythrough = res;
      audio.onerror = rej;
      audio.load();
    });

    const durationMs = track.durationMs || (audio.duration * 1000) || 1000;

    // Setup Web Audio routing to capture audio stream without microphone bleed
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaElementSource(audio);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    // Capture canvas video stream
    const videoStream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!videoStream) {
      audioCtx.close().catch(() => {});
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
    const rec = new MediaRecorder(combinedStream, {
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

    rec.start(1000); // 1-second chunks
    await audio.play();

    // Replay render loop driven by audio playback clock
    const frameInterval = 1000 / fps;
    const renderLoop = async () => {
      if (this.cancelled || audio.ended || (audio.currentTime * 1000 >= durationMs)) {
        audio.pause();
        if (rec.state !== 'inactive') rec.stop();
        return;
      }

      // Synchronize clock and redraw offscreen canvas
      const curMs = audio.currentTime * 1000;
      if (this.app.replayEngine) {
        this.app.replayEngine.currentTimeMs = curMs;
      }
      sf.draw();

      if (onProgress) {
        onProgress(Math.min(1.0, curMs / durationMs));
      }

      setTimeout(renderLoop, frameInterval);
    };

    renderLoop();

    const blob = await completionPromise;
    return { blob, durationMs };
  }
}

/**
 * High-level helper to trigger export dialog and save video file.
 */
export async function exportVideoFile(app, track = null) {
  const chosenTrack = track || (app.store.doc.audioTracks && app.store.doc.audioTracks[0]);
  if (!chosenTrack) {
    app.toast(t('No audio track to export'));
    return null;
  }

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
    const { blob } = await exporter.exportReplayVideo({
      track: chosenTrack,
      onProgress: (pct) => {
        const rounded = Math.round(pct * 100);
        progress?.update(pct, t('Exporting replay video ({pct}%)...', { pct: rounded }));
      }
    });

    if (exporter.cancelled) return null;

    const buf = await blob.arrayBuffer();
    await window.board.writeFile(filePath, buf);
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
}
