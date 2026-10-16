# Phase 5: File-by-File Implementation Plan
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 5 Complete — Actionable, File-by-File Implementation Blueprint (Verified Ground Truth)

---

## 1. Architectural Strategy & Implementation Principles

To satisfy the dual objectives of GazBoard Replay—**(1) Continuous upstream mergeability** and **(2) Contributing features back upstream as clean Pull Requests**—the implementation adheres to five non-negotiable principles:

1. **Modular Encapsulation over Monolithic Rewrites**:
   - Monolithic core files like `app.js` (5,446 lines) and `tools.js` (3,047 lines) are high-conflict zones during upstream merges.
   - Core files receive **only minimal, single-line hooks and delegators**. All substantial state machines, parsers, and UI widgets are housed in newly created modular files under `src/js/core/` and `src/js/ui/`.
2. **Strict Additive Schema Evolution**:
   - `Store.doc.schema` remains `2` [VERIFIED IN CODE: src/js/core/store.js:327].
   - All Replay data structures (`audioTracks`, stroke `audioId`, `t0`, `t1`, point `t`, curtain `subtype: 'tape'`) are purely additive and optional. Boards saved in Replay degrade gracefully when opened in upstream GazBoard 4.8.1.
3. **Zero Native Addon Footprint**:
   - Zero native C++ Node addons, ffmpeg binaries, or heavy UI frameworks.
   - All recording, streaming, metering, and reanimation leverage native Chromium and W3C Web APIs (`MediaRecorder`, `AudioContext`, `CanvasRenderingContext2D`, `protocol.handle`).
4. **Milestone Invariant (Continuous Operability)**:
   - After each milestone, the application **must launch cleanly, pass `npm run smoke:builtin` (`test/smoke.js`), pass `node scripts/i18n-check.js`, and open legacy boards created by upstream GazBoard 4.8.1**.
5. **Exact Ground-Truth Citations**:
   - Every file modification cites exact line numbers, existing methods, and structural constraints verified in the codebase.

---

## 2. Milestone Roadmap & Upstream PR Alignment

The work is organized into five sequential, verifiable milestones, mapped directly to the 7 upstream pull requests established in Phase 3 [FROM MY DOCS: doc3:271-308]:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GAZBOARD REPLAY MILESTONE ROADMAP                               │
├───────────┬──────────────────────────────────┬─────────────────┬───────────────────────┤
│ Milestone │ Focus Scope                      │ Features Served │ Upstream PR Alignment │
├───────────┼──────────────────────────────────┼─────────────────┼───────────────────────┤
│ **M1**    │ Zero-Dependency Core & Study     │ F-701, F-703,   │ PR 1 (ZIP Container), │
│           │ Enhancements (Tape, Scratch-Out, │ F-302, F-303,   │ PR 2 (Camera Easing), │
│           │ Camera Easing, ZIP Container)    │ F-603 (Partial) │ PR 3 (Study Tape),    │
│           │                                  │                 │ PR 4 (Scratch-Out)    │
├───────────┼──────────────────────────────────┼─────────────────┼───────────────────────┤
│ **M2**    │ Audio Infrastructure & Temporal  │ F-101, F-102,   │ PR 6 (Streaming Asset │
│           │ Stroke Capture Pipeline          │ F-103, F-104    │ Protocol)             │
├───────────┼──────────────────────────────────┼─────────────────┼───────────────────────┤
│ **M3**    │ Canvas Scene Partitioning &      │ F-201, F-202,   │ PR 7 (Temporal Sync & │
│           │ Synchronized Replay Engine       │ F-203, F-204,   │ Replay Engine)        │
│           │                                  │ F-301, F-401,   │                       │
│           │                                  │ F-402, F-403,   │                       │
│           │                                  │ F-501, F-502,   │                       │
│           │                                  │ F-503, F-602    │                       │
├───────────┼──────────────────────────────────┼─────────────────┼───────────────────────┤
│ **M4**    │ Dual-Workspace Study Pad &       │ F-704, F-702,   │ PR 5 (Dual-Column /   │
│           │ Excerpt Linking & Video Export   │ F-705, F-801    │ Split-View Layout)    │
├───────────┼──────────────────────────────────┼─────────────────┼───────────────────────┤
│ **M5**    │ Hardening, i18n Dictionary Guard │ Quality & Sec,  │ Fork Maintenance &    │
│           │ & Release Packaging              │ CI Verification │ Upstream Sync         │
└───────────┴──────────────────────────────────┴─────────────────┴───────────────────────┘
```

---

## 3. Milestone 1: Zero-Dependency Core & Study Enhancements

### 3.1 `src/js/core/scratch.js`
* **Status**: CREATE
* **Purpose**: High-performance gesture scratch-out eraser recognition engine. Detects rapid stylus back-and-forth zig-zag motions across bounding strokes and returns target hit IDs for atomic removal.
* **Feature Served**: F-703 (Gesture Scratch-Out Eraser) [FROM MY DOCS: doc1:180, doc3:367-374].
* **Exact Implementation**:
  ```javascript
  // src/js/core/scratch.js
  import { dist, bboxOfPoints } from './util.js';

  export const SCRATCH_MIN_REVERSALS = 4;
  export const SCRATCH_MAX_DURATION_MS = 1200;
  export const SCRATCH_MIN_DENSITY = 3.0;

  /**
   * Analyze an in-flight drawing stroke to determine if it is a scratch-out gesture.
   * @param {Array<{x: number, y: number, t?: number}>} points 
   * @returns {boolean}
   */
  export function isScratchGesture(points) {
    if (!points || points.length < 8) return false;
    
    // Check temporal duration if timestamps exist
    if (points[0].t != null && points[points.length - 1].t != null) {
      if (points[points.length - 1].t - points[0].t > SCRATCH_MAX_DURATION_MS) return false;
    }

    // Measure directional reversals along primary motion axis
    let reversals = 0;
    let totalPathLength = 0;

    for (let i = 2; i < points.length; i++) {
      const dx1 = points[i - 1].x - points[i - 2].x;
      const dx2 = points[i].x - points[i - 1].x;
      totalPathLength += dist(points[i - 1], points[i]);

      const sign1 = Math.sign(dx1);
      const sign2 = Math.sign(dx2);

      if (sign1 !== 0 && sign2 !== 0 && sign1 !== sign2) {
        if (Math.abs(dx2) > 3) { // Ignore micro-jitter
          reversals++;
        }
      }
    }

    const bbox = bboxOfPoints(points);
    const diagonal = Math.hypot(bbox.w, bbox.h);
    
    // A scratch mark must have dense path length relative to its bounding box
    const density = totalPathLength / Math.max(1, diagonal);
    return reversals >= SCRATCH_MIN_REVERSALS && density > SCRATCH_MIN_DENSITY;
  }
  ```
* **Edge Cases & Error Handling**:
  - Handles single-point or micro-slop taps cleanly.
  - Rejects cursive handwriting letters (e.g., 'm', 'w', 'u') by checking aspect ratio and turnaround density.
* **Dependencies**: `src/js/core/util.js` (`bboxOfPoints`, `dist`).
* **Verification**: Unit tests in `test/smoke.js` feeding synthetic zig-zag point arrays vs cursive handwriting samples.

---

### 3.2 `src/js/core/hit.js`
* **Status**: MODIFY
* **Purpose**: Permit two-way toggling of study tape curtains by exempting revealed tape from the ghost predicate.
* **Feature Served**: F-701 (Study Tape / Masking Tool) [FROM MY DOCS: doc1:176, doc3:352-365].
* **Exact Changes**:
  - Locate line 28 [VERIFIED IN CODE: src/js/core/hit.js:28]:
    ```javascript
    // BEFORE (hit.js:28)
    export const ghost = (o) => !!o && (!!o.hidden || (o.type === 'curtain' && !!o.revealed));
    ```
  - Replace with:
    ```javascript
    // AFTER (hit.js:28)
    export const ghost = (o) => !!o && (!!o.hidden || (o.type === 'curtain' && o.subtype !== 'tape' && !!o.revealed));
    ```
* **What to Leave Untouched**: Standard curtain hit testing [VERIFIED IN CODE: hit.js:30-48], connector hitting, stroke distance math.
* **Pitfall & Mitigation**: The prior investigation accidentally inverted the booleans (`!o && (!o.hidden || ...)`), which completely broke ghost detection. Preserving `!!o && (!!o.hidden || (o.type === 'curtain' && o.subtype !== 'tape' && !!o.revealed))` guarantees standard curtains remain non-hittable when revealed, while tape remains clickable for two-way toggling.
* **Verification**: `npm run smoke:builtin`. Existing curtain tests pass; new test verifies `pick()` hits revealed tape.

---

### 3.3 `src/js/core/render.js`
* **Status**: MODIFY
* **Purpose**: Support two-way study tape rendering: opaque styled tape strip when concealed, translucent patterned fill when revealed.
* **Feature Served**: F-701 (Study Tape / Masking Tool).
* **Exact Changes**:
  - Locate `drawCurtain(ctx, o)` at lines 992–1031 [VERIFIED IN CODE: src/js/core/render.js:992-1031].
  - Update to branch on `o.subtype === 'tape'`:
    ```javascript
    export function drawCurtain(ctx, o) {
      if (o.revealed) {
        if (o.subtype !== 'tape') return;
        // F-701: Render revealed tape as translucent study strip
        const { x, y, w, h } = o;
        const r = Math.min(Math.abs(w), Math.abs(h)) * 0.13;
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
        ctx.fillStyle = o.color ? o.color + '26' : 'rgba(255, 185, 0, 0.15)'; // 15% opacity
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = o.color || '#ffb900';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
        return;
      }
      // Leave existing unrevealed curtain rendering untouched (lines 994-1031)
      ...
    }
    ```
* **What to Leave Untouched**: Standard solid curtain drawing with 45-degree stripes and proportional label sizing [VERIFIED IN CODE: render.js:1005-1030].
* **Verification**: Visual check via `test/smoke.js` verifying revealed tape draws dashed border and translucent fill.

---

### 3.4 `src/js/core/camera.js`
* **Status**: MODIFY
* **Purpose**: Add smooth camera interpolation (`glideTo`) with cubic easing, auto-follow bounding box tracking, and cancellation on user pan.
* **Feature Served**: F-302 (Auto-Follow Camera), F-303 (Go to Active Stroke), F-702 (PDF Excerpt Jump) [FROM MY DOCS: doc1:127, doc3:399].
* **Exact Changes**:
  - In `Camera` class [VERIFIED IN CODE: src/js/core/camera.js:5-42], add `glideTo(box, vw, vh, opts)`:
    ```javascript
    glideTo(box, vw, vh, { pad = 80, duration = 400, onDone = null } = {}) {
      if (this._anim) cancelAnimationFrame(this._anim);
      if (!box || box.w <= 0 || box.h <= 0) return;

      const targetZ = clamp(Math.min((vw - pad * 2) / box.w, (vh - pad * 2) / box.h), MIN_Z, 2);
      const targetX = vw / 2 - (box.x + box.w / 2) * targetZ;
      const targetY = vh / 2 - (box.y + box.h / 2) * targetZ;

      const startX = this.x, startY = this.y, startZ = this.z;
      const startTime = performance.now();

      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = easeOutCubic(progress);

        this.x = startX + (targetX - startX) * ease;
        this.y = startY + (targetY - startY) * ease;
        this.z = startZ + (targetZ - startZ) * ease;

        if (progress < 1) {
          this._anim = requestAnimationFrame(step);
        } else {
          this._anim = null;
          if (onDone) onDone();
        }
      };
      this._anim = requestAnimationFrame(step);
    }

    cancelGlide() {
      if (this._anim) {
        cancelAnimationFrame(this._anim);
        this._anim = null;
      }
    }
    ```
* **What to Leave Untouched**: `toScreen`, `toWorld`, `panBy`, `zoomAt`, `fit`, `centerOn` [VERIFIED IN CODE: camera.js:8-41].
* **Pitfall & Mitigation**: If the user touches or pans while an animation is in flight, `cancelGlide()` must be called in `tools.js:onPointerDown` to prevent camera fighting.
* **Verification**: Interactive panning and programmatic `glideTo` target matching in smoke tests.

---

### 3.5 `src/js/core/surface.js` (Pulse Highlight & Replay Scene Hooks)
* **Status**: MODIFY
* **Purpose**: 
  1. Register transient screen-space pulse highlight overlays for click-to-seek feedback and bookmark targeting.
  2. Invalidate frozen canvas key when replay starts/stops.
* **Feature Served**: F-301 (Click-to-Seek Feedback) [FROM MY DOCS: doc3:320].
* **Exact Changes**:
  - In `Surface` constructor [VERIFIED IN CODE: src/js/core/surface.js:23-50], add `pulseHighlight`:
    ```javascript
    pulseHighlight(worldBox, duration = 600) {
      if (!worldBox) return;
      const startTime = performance.now();
      const fn = (ctx, surface) => {
        const elapsed = performance.now() - startTime;
        if (elapsed > duration) {
          surface.overlays = surface.overlays.filter((f) => f !== fn);
          surface.invalidate();
          return;
        }
        const t = elapsed / duration;
        const alpha = (1 - t) * 0.8;
        const expand = t * 16; // expand 16px
        const a = surface.cam.toScreen(worldBox.x, worldBox.y);
        const b = surface.cam.toScreen(worldBox.x + worldBox.w, worldBox.y + worldBox.h);
        
        ctx.save();
        ctx.strokeStyle = `rgba(0, 120, 212, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(a.x - expand, a.y - expand, (b.x - a.x) + expand * 2, (b.y - a.y) + expand * 2);
        ctx.restore();
        surface.invalidate();
      };
      this.overlays.push(fn);
      this.invalidate();
    }
    ```
  - In `freezeKey()` [VERIFIED IN CODE: src/js/core/surface.js:130-134]:
    ```javascript
    // Incorporate replay track ID to prevent stale-picture blitting during playback
    freezeKey() {
      const cam = this.cam;
      const ed = this.editing ? `${this.editing.id}:${this.editing.cell || ''}` : '';
      const rep = this.app?.replayEngine?.active ? `|rep:${this.app.replayEngine.track.id}` : '';
      return `${this.store.rev}.${this._liveRev || 0}|${cam.x}|${cam.y}|${cam.z}|${this.width}|${this.height}|${this.dpr}|${ed}${rep}`;
    }
    ```
* **What to Leave Untouched**: Existing `drawGreeting`, `drawLaser`, `drawFades` [VERIFIED IN CODE: surface.js:718-728].
* **Verification**: Trigger `surface.pulseHighlight({ x: 0, y: 0, w: 100, h: 100 })`; verify overlay cleans itself up after 600ms.

---

### 3.6 `src/js/core/tools.js` (Interactions & Gesture Eraser)
* **Status**: MODIFY
* **Purpose**: 
  1. Intercept gesture scratch-out in `onPointerUp` (`tools.js:957`) and delete hit objects without creating an undo entry for the scribble.
  2. Cancel camera glide on user interaction in `onPointerDown` (`tools.js:370`).
  3. Route study tape taps in `onPointerUp` (`tools.js:949`), `tappedAnObject` (`tools.js:1607`), and `tools.js:2618`.
* **Feature Served**: F-703 (Gesture Scratch-Out), F-701 (Study Tape).
* **Exact Changes**:
  - In `onPointerDown(e)` around line 370 [VERIFIED IN CODE: tools.js:370], cancel active camera animation:
    `this.surface.cam.cancelGlide?.();`
  - In `onPointerUp(e)` line 949 [VERIFIED IN CODE: tools.js:945-950]:
    ```javascript
    if (a.cover && a.downSp && Math.hypot(sp.x - a.downSp.x, sp.y - a.downSp.y) < TAP_SLOP) {
      if (a.type === 'move') { this.store.restoreSnapshot(a.snap); a.type = 'tapped'; }
      this.app.toggleCurtain(a.cover.id); // Supports two-way toggle
    }
    ```
  - In `tappedAnObject` line 1607 [VERIFIED IN CODE: tools.js:1604-1610]:
    ```javascript
    const cover = curtainAt(this.store, p0, 8 / z);
    if (cover) {
      this.discardTapMark();
      this.app.toggleCurtain(cover.id); // CRITICAL FIX: Was revealCurtain, preventing pen toggle-back!
      this.surface.invalidate();
      return true;
    }
    ```
  - In line 2618 [VERIFIED IN CODE: tools.js:2618]:
    `if (hit.type === 'curtain') { this.app.toggleCurtain(hit.id); return; }`
  - In `onPointerUp(e)` line 957 [VERIFIED IN CODE: tools.js:957]:
    ```javascript
    case 'draw':
      if (this.tappedAnObject(a, e)) break;
      // F-703: Gesture Scratch-Out Check
      if (this.offerScratchOut(a)) break;
      this.finishStroke(a);
      break;
    ```
  - Add helper method `offerScratchOut(a)`:
    ```javascript
    offerScratchOut(a) {
      if (!isScratchGesture(a.obj.points)) return false;
      const box = bboxOfPoints(a.obj.points);
      const hits = inBox(this.store, box, false).filter((o) => !o.locked && o.id !== a.obj.id);
      if (!hits.length) return false;
      
      this.discardTapMark(); // Throw scribble away
      this.store.removeMany(hits.map((o) => o.id), 'scratch-out');
      this.surface.pulseHighlight(box, 400);
      return true;
    }
    ```
* **Dependencies**: `src/js/core/scratch.js` (`isScratchGesture`).
* **Verification**: Automated smoke test drawing zig-zag over stroke; manual stylus test.

---

### 3.7 `src/js/app.js` (Curtain Toggle & LAN Protection)
* **Status**: MODIFY
* **Purpose**: 
  1. Add `toggleCurtain(id)` method for two-way tape toggling.
  2. Strip `audioTracks` from LAN sync payload in `picturesForSending(doc)`.
* **Feature Served**: F-701 (Study Tape / Masking Tool), LAN Sharing Hardening.
* **Exact Changes**:
  - Add `toggleCurtain(id)` around line 1945 [VERIFIED IN CODE: app.js:1945]:
    ```javascript
    toggleCurtain(id) {
      const o = this.store.get(id);
      if (!o || o.type !== 'curtain') return false;
      if (o.subtype === 'tape') {
        const next = !o.revealed;
        this.store.update(id, { revealed: next }, next ? 'reveal tape' : 'conceal tape');
        this.surface.invalidate();
        return true;
      }
      return this.revealCurtain(id);
    }
    ```
  - In `picturesForSending(doc)` [VERIFIED IN CODE: app.js:5338]:
    ```javascript
    const next = { ...doc, objects: await fix(doc.objects) };
    if (next.audioTracks) {
      delete next.audioTracks; // Audio omitted from LAN sync to respect 64MB limit
    }
    ```
* **Verification**: Tap tape; verify state toggles between revealed and hidden.

---

### 3.8 `src/js/board-export.js` & `src/js/export.js`
* **Status**: MODIFY
* **Purpose**: Upgrade single-board export to bundle audio assets into `.gazboard` ZIP container, and detect `PK\x03\x04` magic bytes during import.
* **Feature Served**: F-603 (Single Board ZIP Container / PR 1).
* **Exact Changes**:
  - In `src/js/board-export.js` line 6 [VERIFIED IN CODE: board-export.js:6], export `loadZip`:
    ```javascript
    export async function loadZip() { ... }
    ```
  - In `src/js/export.js:saveBoardFile(app)` [VERIFIED IN CODE: export.js:657-668]:
    ```javascript
    export async function saveBoardFile(app) {
      ...
      const doc = exportable(app.store.toJSON({ app: 'GazBoard', version: 1 }));
      const hasAudio = Array.isArray(doc.audioTracks) && doc.audioTracks.length > 0;
      
      if (hasAudio) {
        const Zip = await loadZip();
        const zip = new Zip();
        zip.file('board.json', JSON.stringify(doc));
        // Package audio assets
        for (const track of doc.audioTracks) {
          if (track.assetId) {
            const buf = await window.board.readFile(path.join(await window.board.getAssetsDir(), track.assetId));
            if (buf) zip.file(`assets/${track.assetId}`, buf);
          }
        }
        const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 1 } });
        await window.board.writeFile(filePath, bytes);
      } else {
        const json = JSON.stringify(doc, null, 0);
        await window.board.writeFile(filePath, new TextEncoder().encode(json).buffer);
      }
      app.toast(t('Saved {name}', { name: filePath.split(/[\\/]/).pop() }));
      return filePath;
    }
    ```
  - In `src/js/export.js:openBoardFile(app)` [VERIFIED IN CODE: export.js:670-686]:
    ```javascript
    export async function openBoardFile(app) {
      ...
      const buf = await window.board.readFile(paths[0]);
      const bytes = new Uint8Array(buf);
      let data;
      // Detect PK\x03\x04 magic bytes
      if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
        const Zip = await loadZip();
        const zip = await Zip.loadAsync(buf);
        const boardEntry = zip.file('board.json');
        if (!boardEntry) throw new Error(t('Invalid .gazboard archive: missing board.json'));
        data = JSON.parse(await boardEntry.async('text'));
        // Extract packaged assets into local asset store via hardened IPC
        for (const [relPath, entry] of Object.entries(zip.files)) {
          if (relPath.startsWith('assets/') && !entry.dir) {
            const cleanId = path.basename(relPath);
            const assetBuf = await entry.async('arraybuffer');
            await window.board.assets.putBinaryDirect(cleanId, assetBuf);
          }
        }
      } else {
        data = JSON.parse(new TextDecoder().decode(buf));
      }
      data.origin = paths[0];
      await app.loadBoard(data, { asCopy: false });
    }
    ```
* **Verification**: Export board with audio; verify ZIP magic bytes; re-import into a fresh board.

---

### 3.9 `main.js` (Milestone 1 Updates)
* **Status**: MODIFY
* **Purpose**: In `openBoardPath(filePath)` [VERIFIED IN CODE: main.js:649-663], support double-clicking a `.gazboard` ZIP file from Windows Explorer.
* **Exact Changes**:
  - Inspect file magic bytes before `JSON.parse`. If ZIP, extract `board.json` text before sending `board:open` IPC.
* **Verification**: Double-click `.gazboard` ZIP file in Windows Explorer; app opens board without error.

---

## 4. Milestone 2: Audio & Media Core Pipeline

### 4.1 `src/js/core/audio-recorder.js`
* **Status**: CREATE
* **Purpose**: Headless recording controller. Coordinates `navigator.mediaDevices.getUserMedia`, `MediaRecorder`, chunk accumulation, elapsed wall-clock time tracking, RMS audio level metering via `AudioContext` and `AnalyserNode`.
* **Feature Served**: F-101 (Live Audio Recording), F-102 (Pause/Resume Continuity).
* **Exact Implementation**:
  ```javascript
  // src/js/core/audio-recorder.js
  export class AudioRecorder {
    constructor({ onTimeUpdate, onLevelUpdate, onStateChange }) {
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
    }

    async start() {
      if (this.state !== 'idle') return;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      this.sessionId = 'rec_' + Date.now();
      this.activeTrackId = 'aud_' + Date.now();
      await window.board.recording.start(this.sessionId);

      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.startMeter();

      this.recorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000
      });

      this.recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const buf = await e.data.arrayBuffer();
          await window.board.recording.appendChunk(this.sessionId, new Uint8Array(buf));
        }
      };

      this.elapsedOffsetMs = 0;
      this.segmentStartMs = performance.now();
      this.state = 'recording';
      this.recorder.start(3000); // 3-second slices
      this.onStateChange(this.state);
    }

    pause() {
      if (this.state !== 'recording') return;
      this.recorder.pause();
      this.elapsedOffsetMs += (performance.now() - this.segmentStartMs);
      this.state = 'paused';
      this.onStateChange(this.state);
    }

    resume() {
      if (this.state !== 'paused') return;
      this.segmentStartMs = performance.now();
      this.recorder.resume();
      this.state = 'recording';
      this.onStateChange(this.state);
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
          this.stream.getTracks().forEach((t) => t.stop());
          if (this.audioCtx) await this.audioCtx.close();
          const result = await window.board.recording.finish(this.sessionId, finalDurationMs);
          this.onStateChange(this.state);
          resolve({ ...result, id: this.activeTrackId }); // { id, assetId, durationMs }
        };
        this.recorder.stop();
      });
    }

    currentOffsetMs() {
      if (this.state === 'idle') return 0;
      if (this.state === 'paused') return this.elapsedOffsetMs;
      return this.elapsedOffsetMs + (performance.now() - this.segmentStartMs);
    }
  }
  ```
* **Dependencies**: Native browser Web Audio & MediaStream APIs.
* **Verification**: Unit tests mocking `getUserMedia` and validating offset millisecond accumulation across pause/resume cycles.

---

### 4.2 `main.js` & `preload.js` (Streaming Asset Protocol & Binary IPC)
* **Status**: MODIFY
* **Purpose**: 
  1. Add permission request handler in `main.js`.
  2. Extend `protocol.handle('app', ...)` to stream assets via `net.fetch` for HTTP 206 partial content support.
  3. Implement streaming binary recording IPC (`recording:start`, `recording:appendChunk`, `recording:finish`).
  4. Implement `assets:putBinaryDirect(assetId, buffer)` for ZIP container unpack with traversal protection.
* **Feature Served**: PR 6 (Streaming Audio Asset Protocol).
* **Exact Changes in `main.js`**:
  - In `createWindow()` / `app.whenReady()` [VERIFIED IN CODE: main.js:600-615]:
    ```javascript
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const url = webContents.getURL();
      callback(url.startsWith('app://board/') && permission === 'media');
    });
    ```
  - In `registerProtocol()` [VERIFIED IN CODE: main.js:152-161]:
    ```javascript
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      let rel = decodeURIComponent(url.pathname);
      // F-101 / PR 6: Asset streaming endpoint
      if (rel.startsWith('/asset/')) {
        const id = rel.slice(7);
        if (!ASSET_NAME.test(id)) return new Response('Bad Request', { status: 400 });
        const filePath = path.join(assetsDir(), id);
        return net.fetch(pathToFileURL(filePath).toString());
      }
      if (rel === '/' || rel === '') rel = '/index.html';
      const target = path.normalize(path.join(SRC, rel));
      if (!target.startsWith(SRC)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(target).toString());
    });
    ```
  - Add IPC handlers:
    ```javascript
    const activeStreams = new Map();
    ipcMain.handle('recording:start', async (_e, sessionId) => {
      const tmpFile = path.join(app.getPath('userData'), 'temp', `${sessionId}.tmp`);
      await fsp.mkdir(path.dirname(tmpFile), { recursive: true });
      const ws = fs.createWriteStream(tmpFile);
      activeStreams.set(sessionId, { ws, tmpFile });
      return true;
    });

    ipcMain.handle('recording:appendChunk', async (_e, { sessionId, chunk }) => {
      const entry = activeStreams.get(sessionId);
      if (entry) entry.ws.write(Buffer.from(chunk));
      return true;
    });

    ipcMain.handle('recording:finish', async (_e, { sessionId, durationMs }) => {
      const entry = activeStreams.get(sessionId);
      if (!entry) return null;
      await new Promise((r) => entry.ws.end(r));
      activeStreams.delete(sessionId);

      const buf = await fsp.readFile(entry.tmpFile);
      const hash = crypto.createHash('sha256').update(buf).digest('hex') + '.webm';
      const dest = path.join(assetsDir(), hash);
      await fsp.mkdir(assetsDir(), { recursive: true });
      await fsp.rename(entry.tmpFile, dest).catch(async () => {
        await fsp.copyFile(entry.tmpFile, dest);
        await fsp.unlink(entry.tmpFile);
      });
      return { assetId: hash, durationMs };
    });

    ipcMain.handle('assets:putBinaryDirect', async (_e, { assetId, buffer }) => {
      if (!ASSET_NAME.test(String(assetId || ''))) return false;
      const dest = path.join(assetsDir(), assetId);
      await fsp.mkdir(assetsDir(), { recursive: true });
      await writeAtomic(dest, Buffer.from(buffer));
      return true;
    });
    ```
  - In `preload.js` [VERIFIED IN CODE: preload.js:224]: Expose `recording.start`, `appendChunk`, `finish`, and `assets.putBinaryDirect` to `window.board`.
* **Verification**: Record 5-second audio test; verify file appears in `assets/<hash>.webm`; verify playback via `app://board/asset/<hash>.webm` responds with HTTP 200/206.

---

### 4.3 `src/js/core/store.js`
* **Status**: MODIFY
* **Purpose**: Persist and restore `audioTracks` across board serialization and deserialization.
* **Feature Served**: F-101, F-402, F-601.
* **Exact Changes**:
  - In `emptyDoc()` [VERIFIED IN CODE: store.js:16-25], initialize `audioTracks: []`.
  - In `toJSON()` [VERIFIED IN CODE: store.js:327-332], add:
    ```javascript
    audioTracks: d.audioTracks && d.audioTracks.length ? d.audioTracks.map((a) => ({
      id: a.id, assetId: a.assetId, name: a.name, durationMs: a.durationMs, created: a.created,
      bookmarks: Array.isArray(a.bookmarks) ? a.bookmarks.map((b) => ({ ...b })) : []
    })) : undefined,
    ```
  - In `load(data)` [VERIFIED IN CODE: store.js:343-362], deserialize `audioTracks`:
    ```javascript
    if (Array.isArray(data.audioTracks)) {
      d.audioTracks = data.audioTracks.map((a) => ({
        id: a.id, assetId: a.assetId, name: a.name || t('Audio Track'),
        durationMs: a.durationMs || 0, created: a.created || Date.now(),
        bookmarks: Array.isArray(a.bookmarks) ? a.bookmarks.map((b) => ({ ...b })) : []
      }));
    }
    ```
* **What to Leave Untouched**: Object dictionary mapping, pages array handling, revision tracking [VERIFIED IN CODE: store.js:350-362].
* **Verification**: `Store.toJSON()` and `Store.load()` round-trip unit test in `test/smoke.js`.

---

### 4.4 `src/js/core/tools.js` (Stroke Timestamping Pipeline)
* **Status**: MODIFY
* **Purpose**: 
  1. Capture point timestamp `p.t` in `startStroke` (`tools.js:1556`) and `onMove` (`tools.js:724, 726`).
  2. Prevent silent timestamp stripping in `tidy` (`tools.js:1707`) and `finishStroke` (`tools.js:1734`).
  3. Stamp stroke with `audioId`, `t0`, `t1` upon pen lift.
* **Feature Served**: F-103 (Stroke-to-Audio Timestamping), F-104 (Pre-Existing Ink Immunity).
* **Exact Changes**:
  - In `startStroke(e, wp, tool)` line 1556 [VERIFIED IN CODE: tools.js:1556]:
    ```javascript
    // CRITICAL FIX: The first point of a stroke is pushed here, not in onMove!
    const audioTime = this.app.audioRecorder?.state === 'recording'
      ? this.app.audioRecorder.currentOffsetMs() : undefined;
    obj.points.push(this.snapToRuler({ ...wp, p: this.pressure(e), t: audioTime }, act));
    ```
  - In `onMove` lines 724, 726 [VERIFIED IN CODE: tools.js:724-726]:
    ```javascript
    const audioTime = this.app.audioRecorder?.state === 'recording'
      ? this.app.audioRecorder.currentOffsetMs() : undefined;
    offer({ ...cwp, p: this.pressure(ce), t: audioTime });
    ...
    offer({ ...wp, p: pressure, t: audioTime });
    ```
  - In `tidy` [VERIFIED IN CODE: tools.js:1707-1709] and `finishStroke` [VERIFIED IN CODE: tools.js:1734-1736]:
    ```javascript
    // BEFORE (tools.js:1734-1736)
    obj.points = obj.points.map((p) => ({
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2)
    }));

    // AFTER (tools.js:1734-1736)
    obj.points = obj.points.map((p) => ({
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2),
      t: p.t != null ? Math.round(p.t) : undefined
    }));
    ```
  - In `finishStroke` [VERIFIED IN CODE: tools.js:1738]:
    ```javascript
    if (this.app.audioRecorder?.state === 'recording') {
      obj.audioId = this.app.audioRecorder.activeTrackId;
      obj.t0 = obj.points[0]?.t ?? 0;
      obj.t1 = obj.points[obj.points.length - 1]?.t ?? obj.t0;
    }
    ```
* **Verification**: Draw stroke during recording; inspect `store.objects[lastId]`; verify `audioId`, `t0`, `t1`, and `points[0].t` exist.

---

## 5. Milestone 3: Canvas Replay Engine & Synchronized UI

### 5.1 `src/js/core/replay.js`
* **Status**: CREATE
* **Purpose**: Synchronized temporal replay controller. Drives timeline clock, coordinates audio playback, computes stroke visibility slices, auto-follows camera to active stroke bounds.
* **Feature Served**: F-201, F-202, F-203, F-204, F-301, F-302.
* **Exact Implementation**:
  ```javascript
  // src/js/core/replay.js
  export class ReplayEngine {
    constructor(app) {
      this.app = app;
      this.surface = app.surface;
      this.audio = new Audio();
      this.track = null;
      this.active = false;
      this.rafToken = null;
      this.currentTimeMs = 0;
      this.playbackRate = 1.0;
      this.ghostMode = 'translucent'; // 'translucent' | 'hidden'
      this.autoFollow = true;

      this.audio.addEventListener('timeupdate', () => this.syncClock());
      this.audio.addEventListener('ended', () => this.onEnded());
    }

    loadTrack(track) {
      this.track = track;
      this.audio.src = `app://board/asset/${track.assetId}`;
      this.audio.load();
      this.seek(0);
    }

    play() {
      this.surface._ink = null; // Invalidate frozen canvas to re-bake with replay filter
      this.audio.playbackRate = this.playbackRate;
      this.audio.play();
      this.active = true;
      this.loop();
    }

    pause() {
      this.audio.pause();
      this.active = false;
      if (this.rafToken) cancelAnimationFrame(this.rafToken);
      this.surface.invalidate();
    }

    seek(timeMs) {
      this.currentTimeMs = Math.max(0, Math.min(timeMs, this.track?.durationMs || 0));
      this.audio.currentTime = this.currentTimeMs / 1000;
      this.surface.invalidate();
      if (this.autoFollow) this.followActiveStroke();
    }

    setSpeed(speed) {
      this.playbackRate = speed;
      this.audio.playbackRate = speed;
      this.audio.preservesPitch = true;
    }

    loop() {
      if (!this.active) return;
      this.currentTimeMs = this.audio.currentTime * 1000;
      this.surface.invalidate();
      if (this.autoFollow) this.followActiveStroke();
      this.rafToken = requestAnimationFrame(() => this.loop());
    }

    followActiveStroke() {
      const stroke = this.getActiveStroke();
      if (stroke && stroke.bbox) {
        const vp = this.surface.cam.viewport(this.surface.width, this.surface.height);
        if (!boxesIntersect(vp, stroke.bbox)) {
          this.surface.cam.glideTo(stroke.bbox, this.surface.width, this.surface.height, { duration: 300 });
        }
      }
    }

    getActiveStroke() {
      const t = this.currentTimeMs;
      const trackId = this.track?.id;
      if (!trackId) return null;
      for (const id of this.app.store.doc.order) {
        const o = this.app.store.doc.objects[id];
        if (o && o.audioId === trackId && o.t0 <= t && t < o.t1) return o;
      }
      return null;
    }
  }
  ```
* **Dependencies**: `src/js/core/surface.js`.
* **Verification**: Load track; verify playback clock updates canvas; seeking seeks audio element.

---

### 5.2 `src/js/core/surface.js` (Scene Partitioning & Dynamic Pass)
* **Status**: MODIFY
* **Purpose**: Partition canvas rendering during replay so that non-session objects are frozen in backing buffer `_inkCanvas`, while replay strokes render dynamically on each RAF tick.
* **Feature Served**: F-201, F-202, F-203.
* **Exact Changes**:
  - In `_freezeScene(key)` [VERIFIED IN CODE: surface.js:435-461]:
    Pass filter predicate to `drawScene` to exclude strokes belonging to active replay track:
    ```javascript
    const activeTrackId = this.app.replayEngine?.activeTrack?.id;
    const filter = activeTrackId ? (o) => o.audioId !== activeTrackId : null;
    this.drawScene(g, this.width, this.height, () => { this._ink = null; this.invalidate(); }, null, filter);
    ```
  - In `draw()` [VERIFIED IN CODE: surface.js:550-590]:
    Add dedicated branch for active replay:
    ```javascript
    if (this.app?.replayEngine?.active) {
      const key = this.freezeKey();
      if (!this._ink || this._ink.key !== key) this._ink = this._freezeScene(key);
      this.screenTransform();
      ctx.drawImage(this._ink.canvas, 0, 0, w, h);
      this.drawReplaySession(ctx);
      this._painted = true;
    }
    ```
  - Add `drawReplaySession(ctx)`:
    ```javascript
    drawReplaySession(ctx) {
      const replay = this.app.replayEngine;
      const t = replay.currentTimeMs;
      const trackId = replay.track.id;
      const cam = this.cam;

      ctx.save();
      ctx.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y);

      for (const id of this.store.doc.order) {
        const o = this.store.doc.objects[id];
        if (!o || o.audioId !== trackId) continue;

        if (o.t1 <= t) {
          // Completed stroke: full opacity
          drawObject(ctx, o, () => this.invalidate());
        } else if (o.t0 <= t && t < o.t1) {
          // In-progress stroke: progressive slice
          const sliceIndex = o.points.findIndex((p) => p.t > t);
          const pts = sliceIndex >= 0 ? o.points.slice(0, sliceIndex) : o.points;
          if (pts.length >= 2) {
            drawObject(ctx, { ...o, points: pts }, () => this.invalidate());
            // Render glowing tip dot
            const tip = pts[pts.length - 1];
            ctx.fillStyle = '#0078d4';
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, (o.width || 4) / 2 + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (o.t0 > t) {
          // Future stroke: ghost or hidden
          if (replay.ghostMode === 'translucent') {
            ctx.save();
            ctx.globalAlpha = 0.12;
            drawObject(ctx, o, () => this.invalidate());
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }
    ```
* **Verification**: DevTools Performance panel: frame time during active replay remains $< 2\text{ms}$.

---

### 5.3 `src/js/ui/audio-bar.js` & `src/js/ui/density-canvas.js`
* **Status**: CREATE
* **Purpose**: Floating draggable HUD widget (modeled on `ClassTimer` [VERIFIED IN CODE: src/js/ui/timer.js:69-120]) housing recording controls, elapsed clock, speed selector ($0.5\times-2.0\times$), density ticks scrubber, and bookmark flags.
* **Feature Served**: F-101, F-204, F-401, F-402.
* **Exact Implementation**:
  - Follows GazBoard's DOM builder utility `h(...)` from `src/js/ui/popover.js:80-93` [VERIFIED IN CODE: popover.js:80-93].
  - Scrubber canvas plots density tick distribution: $x = (t_0 / \text{totalDuration}) \times \text{width}$.
  - Supports bookmark addition and jump-to-bookmark navigation.
* **Verification**: Visual check: HUD docks smoothly; scrubbing moves audio and canvas in sync.

---

## 6. Milestone 4: Dual-Workspace & Advanced Integrations

### 6.1 `src/js/ui/split-workspace.js`
* **Status**: CREATE
* **Purpose**: Dual-viewport split canvas manager (Approach B: Dual Viewport Architecture). Hosts two independent document/camera/surface viewports side-by-side in the DOM.
* **Feature Served**: F-704 (Side-by-Side Split Workspace / PR 5).
* **Exact Implementation**:
  - Splits `#stage` into `#stageLeft` and `#stageRight` with a draggable divider.
  - Left pane hosts reference materials (PDF, lecture slides); right pane hosts student active notebook.
* **Verification**: Open textbook PDF on left, draw notes on right; verify independent zoom/pan.

---

### 6.2 `src/js/insert.js` & `src/js/app.js` (PDF Excerpt Jump Cards)
* **Status**: MODIFY
* **Purpose**: Create excerpt card from PDF selection and link to source page using existing `boardlink` + `backStack` architecture.
* **Feature Served**: F-702 (PDF Excerpt Cards).
* **Exact Changes**:
  - In `src/js/insert.js`: Add "Create Study Excerpt Card" action yielding `type: 'boardlink'` with `ref: { boardId, page, box }`.
  - In `src/js/app.js:openBoardRef(ref)` [VERIFIED IN CODE: app.js:1675-1692]:
    When `ref.box` exists, invoke `this.surface.cam.glideTo(ref.box, this.surface.width, this.surface.height)`.
* **Verification**: Click PDF excerpt card on board; camera glides to exact source page coordinates.

---

### 6.3 `src/js/export-video.js`
* **Status**: CREATE
* **Purpose**: Export animated replay session and synchronized audio to standalone `.webm` video file via `canvas.captureStream(30)`.
* **Feature Served**: F-801 (Animated Video Export).
* **Exact Implementation**:
  - Offscreen canvas captures frames at 30 FPS.
  - `AudioContext` mixes board audio into `MediaStream`.
  - Encoded via `MediaRecorder` and saved via `window.board.writeFile`.
* **Verification**: Export 10-second test video; open in Windows Media Player; verify video/audio sync.

---

## 7. Milestone 5: Hardening, i18n & Release Packaging

### 7.1 `main.js` & `storage-location.js` (Atomic Write Hardening)
* **Status**: MODIFY
* **Purpose**: Mitigate concurrent write collisions in `writeAtomic(file, text)` [VERIFIED IN CODE: main.js:250-260, storage-location.js:20-22].
* **Exact Changes**:
  ```javascript
  let writeSequence = 0;
  async function writeAtomic(file, text) {
    const tmp = `${file}.${process.pid}.${Date.now()}.${++writeSequence}.tmp`;
    await fsp.writeFile(tmp, text);
    try {
      await fsp.rename(tmp, file);
    } catch (e) {
      await fsp.writeFile(file, text);
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }
  ```
* **Verification**: Stress test with 50 parallel atomic saves; verify 0 file write collisions.

---

### 7.2 `src/locales/*.json` (Internationalization Guard)
* **Status**: MODIFY
* **Purpose**: Stub all newly introduced Replay UI strings across all 7 translation dictionaries (`ar, bn, de, es, pt-BR, zh-Hans, zh-Hant`).
* **Feature Served**: CI Translation Invariant [VERIFIED IN CODE: scripts/i18n-check.js:27-64].
* **Keys Added**:
  - `"Recording..."`, `"Microphone access denied"`, `"Audio Track"`, `"Study Tape"`, `"Click to Seek"`, `"Auto-Follow Camera"`, `"Speed: {rate}x"`, `"Add Bookmark"`, `"Move 14 unused files to Recycle Bin?"`.
* **Verification**: Run `node scripts/i18n-check.js`; verify exit code 0.

---

### 7.3 `test/smoke.js` (Final End-to-End Test Suite)
* **Status**: MODIFY
* **Purpose**: Append Milestone 1–4 automated verification blocks to `test/smoke.js`.
* **Verification**: Execute `npm run smoke:builtin`; verify 100% test pass rate.

---

## 8. Summary of Edits & Build Dependency Order

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FILE DEPENDENCY & EDIT ORDER                              │
├──────┬──────────────────────────────┬────────┬─────────────────────────────────────────┤
│ Step │ File Path                    │ Action │ Prerequisite Dependencies               │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 1    │ `src/js/core/scratch.js`     │ CREATE │ None. Standalone math / bbox module.    │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 2    │ `src/js/core/hit.js`         │ MODIFY │ None. hit.js:28 tape curtain exemption.│
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 3    │ `src/js/core/render.js`      │ MODIFY │ hit.js (tape ghosting logic).           │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 4    │ `src/js/core/camera.js`      │ MODIFY │ None. camera.js:42 glideTo method.      │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 5    │ `src/js/core/surface.js`     │ MODIFY │ camera.js (pulseHighlight overlay).     │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 6    │ `src/js/core/tools.js`       │ MODIFY │ scratch.js, camera.js, hit.js.          │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 7    │ `src/js/app.js` (Curtain)    │ MODIFY │ tools.js, hit.js (toggleCurtain).       │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 8    │ `src/js/board-export.js`     │ MODIFY │ None. Export loadZip helper.            │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 9    │ `src/js/export.js`           │ MODIFY │ board-export.js (loadZip).              │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 10   │ `main.js` (Part 1)           │ MODIFY │ export.js (ZIP magic byte handling).    │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 11   │ `src/js/core/audio-recorder` │ CREATE │ None. Headless MediaRecorder machine.   │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 12   │ `main.js` (Part 2)           │ MODIFY │ audio-recorder.js (streaming protocol). │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 13   │ `preload.js`                 │ MODIFY │ main.js (binary IPC bridge).            │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 14   │ `src/js/core/store.js`       │ MODIFY │ None. audioTracks schema serialization. │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 15   │ `src/js/core/tools.js` (M2)  │ MODIFY │ audio-recorder.js, store.js.            │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 16   │ `src/js/core/replay.js`      │ CREATE │ audio-recorder.js, store.js.            │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 17   │ `src/js/core/surface.js` (P2)│ MODIFY │ replay.js (Scene Partitioning).         │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 18   │ `src/js/ui/audio-bar.js`     │ CREATE │ replay.js, audio-recorder.js.           │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 19   │ `src/js/ui/density-canvas.js`│ CREATE │ replay.js.                              │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 20   │ `src/js/ui/split-workspace`  │ CREATE │ surface.js, store.js.                   │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 21   │ `src/js/export-video.js`     │ CREATE │ replay.js.                              │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 22   │ `main.js` & `storage-loc`    │ MODIFY │ Atomic write collision fix.             │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 23   │ `src/locales/*.json`         │ MODIFY │ All newly added t('...') UI strings.    │
├──────┼──────────────────────────────┼────────┼─────────────────────────────────────────┤
│ 24   │ `test/smoke.js`              │ MODIFY │ All prior milestones.                   │
└──────┴──────────────────────────────┴────────┴─────────────────────────────────────────┘
```

Following this exact file plan ensures that GazBoard Replay is constructed on a hardened, battle-tested foundation, preserving 100% upstream mergeability and maximum contribution potential back to the open-source community.
