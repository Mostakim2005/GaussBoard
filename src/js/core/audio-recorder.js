export class AudioRecorder {
  constructor({ onTimeUpdate = null, onLevelUpdate = null, onStateChange = null } = {}) {
    this.onTimeUpdate = onTimeUpdate;
    this.onLevelUpdate = onLevelUpdate;
    this.onStateChange = onStateChange;
    this.state = 'idle'; // 'idle' | 'recording' | 'paused'
    this.stream = null;
    this.recorder = null;
    this.audioCtx = null;
    this.analyser = null;
    this.meterAnim = null;
    this.sessionId = null;
    this.activeTrackId = null;
    this.elapsedOffsetMs = 0;
    this.segmentStartMs = 0;
    this.chunkQueue = Promise.resolve();
    this.chunkError = null;
  }

  get recording() {
    return this.state === 'recording';
  }

  async start() {
    if (this.state !== 'idle') return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    this.sessionId = 'rec_' + Date.now();
    this.activeTrackId = 'aud_' + Date.now();
    if (window.board?.recording?.start) {
      await window.board.recording.start(this.sessionId);
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.startMeter();
    }

    this.recorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64000
    });

    this.chunkQueue = Promise.resolve();
    this.chunkError = null;
    this.recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size <= 0 || !window.board?.recording?.appendChunk) return;
      const sessionId = this.sessionId;
      this.chunkQueue = this.chunkQueue.then(async () => {
        const buf = await e.data.arrayBuffer();
        await window.board.recording.appendChunk(sessionId, new Uint8Array(buf));
      }).catch((error) => { this.chunkError ||= error; });
    };

    this.elapsedOffsetMs = 0;
    this.segmentStartMs = performance.now();
    this.state = 'recording';
    this.recorder.start(3000); // 3-second slices
    if (this.onStateChange) this.onStateChange(this.state);
  }

  pause() {
    if (this.state !== 'recording') return;
    this.recorder.pause();
    this.elapsedOffsetMs += (performance.now() - this.segmentStartMs);
    this.state = 'paused';
    if (this.onStateChange) this.onStateChange(this.state);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.segmentStartMs = performance.now();
    this.recorder.resume();
    this.state = 'recording';
    if (this.onStateChange) this.onStateChange(this.state);
  }

  async stop() {
    if (this.state === 'idle') return null;
    if (this.state === 'recording') {
      this.elapsedOffsetMs += (performance.now() - this.segmentStartMs);
    }
    this.state = 'idle';
    this.stopMeter();

    const finalDurationMs = Math.round(this.elapsedOffsetMs);

    return new Promise((resolve) => {
      this.recorder.onstop = async () => {
        try {
          // MediaRecorder dispatches its final dataavailable before onstop, but
          // arrayBuffer() and the IPC write are asynchronous. Serialize every
          // chunk and await the queue before closing/finalizing the asset.
          await this.chunkQueue;
          if (this.chunkError) throw this.chunkError;
          if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
          if (this.audioCtx) await this.audioCtx.close();
          let result = {};
          if (window.board?.recording?.finish) {
            result = await window.board.recording.finish(this.sessionId, finalDurationMs);
          }
          if (this.onStateChange) this.onStateChange(this.state);
          resolve({ ...result, id: this.activeTrackId, durationMs: finalDurationMs });
        } catch (error) {
          if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
          if (this.audioCtx) { try { await this.audioCtx.close(); } catch {} }
          if (this.onStateChange) this.onStateChange(this.state);
          resolve({ id: this.activeTrackId, durationMs: finalDurationMs, error });
        }
      };
      this.recorder.stop();
    });
  }

  currentOffsetMs() {
    if (this.state === 'idle') return 0;
    if (this.state === 'paused') return Math.round(this.elapsedOffsetMs);
    return Math.round(this.elapsedOffsetMs + (performance.now() - this.segmentStartMs));
  }

  startMeter() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const update = () => {
      if (!this.analyser || this.state !== 'recording') return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / Math.max(1, dataArray.length);
      const level = Math.min(1, avg / 128); // 0.0 to 1.0 RMS level
      if (this.onLevelUpdate) this.onLevelUpdate(level);
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentOffsetMs());
      this.meterAnim = requestAnimationFrame(update);
    };
    this.meterAnim = requestAnimationFrame(update);
  }

  stopMeter() {
    if (this.meterAnim) {
      cancelAnimationFrame(this.meterAnim);
      this.meterAnim = null;
    }
    if (this.onLevelUpdate) this.onLevelUpdate(0);
  }
}
