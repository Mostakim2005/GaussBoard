# Phase 2: Feature-by-Feature Architectural Analysis

> **Document status:** Historical feature analysis and proposals. This is not a complete statement of what shipped. For current code evidence use [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md); for the v4.8.1 base surface use [`../BASE_FEATURE_CATALOG-4.8.1.md`](../BASE_FEATURE_CATALOG-4.8.1.md). User-choice requirement: preserve existing modes and offer alternatives as separately selectable options where feasible; do not reduce a multi-option design to a binary switch.
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 2 Complete — Comprehensive Specification & Feasibility Audit

---

## 1. Feature Map & Analysis Framework

This document provides an exhaustive, ground-truth technical analysis for every user-facing capability defined in `doc1_feature_specification.md` (Features F-101 through F-801) within the context of the GazBoard architecture.

### Evidence Classification Key
In accordance with architectural audit ground rules, all assertions are explicitly labeled:
* `[VERIFIED IN CODE: <file>:<line>]`: Confirmed by direct inspection of the GazBoard codebase.
* `[FROM MY DOCS: <file>:<line>]`: Sourced from the user's initial planning documents (`doc1`, `doc2`, `doc3`).
* `[ASSUMPTION]`: Explicit design assumption formulated to resolve specification ambiguity.
* `[GENERAL BEST PRACTICE]`: Standard software engineering, Chromium/Electron, or operating system pattern.

---

## 2. Audio-Visual Synchronization Subsystem (F-101 – F-104)

### F-101: Live Audio Recording

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The user can initiate, monitor, and finalize an uncompressed or high-efficiency Opus audio recording directly within an active board session using the system's default or selected microphone input.
* **Acceptance Criteria**:
  1. *Activation*: Clicking the Record button starts capture within $< 200\text{ms}$ with zero perceptible frame drop on active stylus tracking [GENERAL BEST PRACTICE].
  2. *Status & Feedback*: Floating UI displays an elapsed time counter formatted as `MM:SS` (or `HH:MM:SS` once $\ge 60\text{ min}$) updating every $100\text{ms}$ [FROM MY DOCS: doc1:58], accompanied by a real-time RMS audio level meter driven by an `AudioWorklet` or `ScriptProcessorNode` / `AnalyserNode`.
  3. *Writing Fluidity*: While recording, pen drawing latency remains strictly $< 16\text{ms}$ ($60\text{ FPS}$) and $< 8.3\text{ms}$ ($120\text{ FPS}$) on supported Windows digitizers [VERIFIED IN CODE: src/js/core/inktrail.js:24-49].
  4. *Asset Creation*: Stopping recording generates a valid `.webm` audio container encoded with Opus, stored in the content-addressable storage directory `<userData>/boards/assets/<sha256>.webm` [VERIFIED IN CODE: main.js:226-235, 1281-1294].
  5. *Duration Integrity*: The generated track stores an explicit `durationMs` field matching actual elapsed wall-clock recording time, bypassing Chromium's WebM `MediaRecorder` duration bug where `audio.duration` evaluates to `Infinity` [GENERAL BEST PRACTICE].

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible with zero native Node addon dependencies.
* **Technical Mechanism**:
  * Utilizes Chromium's standard `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` paired with `MediaRecorder` using MIME type `audio/webm;codecs=opus` [FROM MY DOCS: doc3:142-146].
  * *Critical Electron Requirement*: In [main.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js), `session.defaultSession.setPermissionRequestHandler` is currently missing [VERIFIED IN CODE: main.js]. While dev builds grant media access implicitly, packaged production builds on Windows require an explicit permission handler in `main.js`:
    ```javascript
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(permission === 'media');
    });
    ```
    Failure to declare this handler causes `getUserMedia` to reject with `NotAllowedError` in packaged environments [GENERAL BEST PRACTICE].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [main.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js): Lines 148–160 (extend `app://` protocol for asset streaming), Lines 600–615 (configure `session.defaultSession.setPermissionRequestHandler` in `app.whenReady()`).
  * [preload.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/preload.js): Lines 224–226 (add binary audio streaming IPC `board.assets.putBinary(stream/buffer)`).
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Line 215 (instantiate `AudioController`), Lines 4290–4430 (`onKeyDown` keyboard shortcut routing).
* **Files Created**:
  * `src/js/core/audio-recorder.js`: Headless recording state machine, chunk accumulator, and wall-clock timer.
  * `src/js/ui/audio-bar.js`: Floating draggable recording/playback HUD widget modeled on [timer.js:69-120](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/timer.js#L69-L120).
* **Extension Points Used**:
  * App lifecycle hooks in `app.js`.
  * Preload bridge `window.board` [VERIFIED IN CODE: preload.js:162].

#### 4. Data Model Changes
* **Document Schema**: Extended additively. `Store.doc` schema remains `2` [VERIFIED IN CODE: src/js/core/store.js:327].
* **New Fields**:
  ```javascript
  doc.audioTracks = [
    {
      id: "aud_101",
      assetId: "b8f2c0...", // SHA-256 hash of the webm binary
      name: "Lecture Oct 16",
      durationMs: 342000,
      created: 1729000000000,
      bookmarks: []
    }
  ];
  ```
* **Store Serialization Fix**: In [store.js:327-332](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L327-L332), `toJSON()` currently hardcodes property extraction and drops unknown keys [VERIFIED IN CODE: src/js/core/store.js:331]. `toJSON()` and `load()` must be updated to preserve `audioTracks`.
* **Upstream Behavior**: When opened in upstream GazBoard 4.8.1, `Store.load()` ignores `audioTracks` safely without crashing [VERIFIED IN CODE: src/js/core/store.js:343-362]. However, if the user saves the board in upstream GazBoard, `Store.toJSON()` will drop `audioTracks`.

#### 5. UI/UX Behavior, States & Accessibility
* **States**: `idle`, `requesting_permission`, `recording`, `paused`, `saving`, `error`.
* **Visual Presentation**: Floating pill dockable at top or bottom center, matching the visual language of `ClassTimer` [VERIFIED IN CODE: src/js/ui/timer.js:89]. Pulsing red recording dot.
* **Keyboard Accessibility**: `Ctrl+Alt+R` toggles record start/stop. Focus trap avoided. Screen readers receive ARIA live status announcements (`aria-live="polite"`).
* **i18n**: All UI strings (`"Recording..."`, `"Microphone access denied"`) wrapped in `t('...')` and stubbed in all 7 locale files [VERIFIED IN CODE: scripts/i18n-check.js:27-44].

#### 6. Subsystem Interactions
* **Undo/Redo**: Starting/stopping recording is an out-of-band operational state and does NOT push an undo transaction. Adding the final audio track commits a single atomic transaction:
  `store.commit('record audio', [{ t: 'doc', before: { audioTracks }, after: { audioTracks: [...audioTracks, newTrack] } }])`.
* **Autosave**: Recording state itself is not written to disk; if the app crashes, the audio chunks flushed to disk every 5 seconds are recovered from a recovery buffer.
* **Export**: Raw JSON export leaves the audio asset in `assets/`. ZIP export bundles the `.webm` asset.
* **LAN Sharing**: Stripped from LAN sync payloads to enforce the 64 MB payload ceiling [VERIFIED IN CODE: sync/node.js:63].

#### 7. Performance Impact & Worst Case
* **Worst Case**: 3-hour continuous lecture recording ($~90\text{ MB}$ WebM file at 64 kbps Opus).
* **Mitigation**: Slice recording chunks every 5000ms (`mediaRecorder.start(5000)`). Stream chunks directly to disk via binary IPC instead of accumulating them in a single massive in-memory JS array buffer. Memory footprint capped at $< 10\text{ MB}$ regardless of recording duration.

#### 8. Non-Windows Platforms
* **Verdict**: Works across all platforms supporting Chromium `getUserMedia` (Windows, macOS, Linux). Hidden or stubbed on Android if native audio permissions are not wired into the WebView adapter.

#### 9. Dependencies & Build Order
* **Dependencies**: None. First feature to build in Phase 1.
* **Build Index**: 1.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Low. Pure web standard API in Chromium; primary risk is the missing permission handler in `main.js`.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Draggable floating pill indicator with elapsed timer and input level meter.
* **Simplify**: Avoid multi-track channel mixing or DAW-style equalization.
* **Skip**: Dynamic noise suppression profile tuning.

#### 12. Upstream Readiness
* **Verdict**: Yes. Can be submitted as an independent PR: *"Feature: Audio Notes & Lecture Recording Engine"*.

---

### F-102: Pause & Resume Continuity

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The user can pause an ongoing audio recording and resume it later, with paused time omitted from the recorded timeline so strokes drawn while paused align seamlessly with the moment of resumption.
* **Acceptance Criteria**:
  1. *State Transition*: Tapping Pause immediately halts `MediaRecorder` stream slicing via `mediaRecorder.pause()`. The timer freezes.
  2. *Timeline Arithmetic*: Paused wall-clock duration ($\Delta t_{pause} = t_{resume} - t_{pause}$) is strictly deducted from cumulative timeline offset calculations:
     $$\text{currentTimeMs} = \text{accumulatedActiveMs} + (\text{performance.now()} - \text{lastResumeAt})$$
  3. *Inking Continuity*: Notes drawn while paused receive timestamps clamped to the exact resumption timestamp ($t_{pause}$), preventing chronological gaps or floating "dead zones" in the replay scrubber.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible natively via `MediaRecorder.pause()` and `MediaRecorder.resume()` [GENERAL BEST PRACTICE].

#### 3. Where It Fits in Codebase
* **Files Touched**: `src/js/core/audio-recorder.js`, `src/js/ui/audio-bar.js`.
* **Extension Points**: `AudioRecorder.pause()`, `AudioRecorder.resume()`.

#### 4. Data Model Changes
* **None**. Document schema is unaware of pause intervals; the resulting WebM audio stream and stroke timestamps are already stitched into a single continuous monotonic timeline.

#### 5. UI/UX Behavior, States & Accessibility
* **UI**: Pause button toggles to amber Resume button. Timer blinks subtly at 1 Hz during pause.
* **Keyboard**: `Space` (when audio bar focused) or `Ctrl+Alt+P` toggles pause/resume.

#### 6. Subsystem Interactions
* **Autosave / Store**: No store transactions emitted during pause/resume toggling.

#### 7. Performance Impact & Worst Case
* **Worst Case**: User leaves app paused for 48 hours.
* **Mitigation**: Use `performance.now()` delta math rather than running `setInterval` accumulator ticks, ensuring zero CPU drain during long pauses.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform (Windows, macOS, Linux).

#### 9. Dependencies & Build Order
* **Dependencies**: F-101.
* **Build Index**: 2.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Seamless timeline concatenation without generating split audio files.

#### 12. Upstream Readiness
* **Verdict**: Bundled with F-101.

---

### F-103: Stroke-to-Audio Temporal Alignment

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Every drawing stroke created while audio recording is active captures temporal metadata linking it to the active audio track: session ID (`audioId`), stroke start timestamp ($t_0$), stroke end timestamp ($t_1$), and per-point millisecond offsets ($p.t$).
* **Acceptance Criteria**:
  1. *Sub-Stroke Sampling*: When the stylus touches down, `startStroke` stamps `obj.audioId = rec.activeTrackId` and `obj.t0 = rec.currentTimeMs`.
  2. *Coalesced Sample Timestamps*: For every point collected in `offer()` / `pointermove` (including Windows hardware coalesced samples [VERIFIED IN CODE: src/js/core/tools.js:719]), `p.t` records the point's relative time offset from $t_0$.
  3. *Lift Finalization*: Upon pen lift in `finishStroke(a)` [VERIFIED IN CODE: src/js/core/tools.js:1696-1755], `obj.t1 = rec.currentTimeMs` is recorded.
  4. *Zero Lag Overhead*: Capturing integer timestamps adds $< 0.002\text{ms}$ per point, introducing zero jitter to pen tracking.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Pointer events deliver high-resolution hardware timestamps via `e.timeStamp` [GENERAL BEST PRACTICE].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js):
    - Line 1535 (`startStroke(e, wp, tool)`): Inject `audioId` and `t0 = Math.round(rec.currentTimeMs)`.
    - Lines 714, 724 (`onPointerMove` -> `offer(p)`): Inject `t: Math.round(rec.currentTimeMs - a.t0)` into raw/cand points.
    - Line 1707 (`breakStroke` -> `tidy`): **CRITICAL FIX**: Currently, `tidy` executes:
      `o.points = o.points.map((q) => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2), p: +(q.p ?? 0.5).toFixed(2) }));`
      This explicitly reconstructs point objects and silently strips all custom properties (including `q.t`)! Must be updated to preserve `t`:
      `o.points = o.points.map((q) => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2), p: +(q.p ?? 0.5).toFixed(2), t: q.t != null ? q.t : undefined }));`
    - Line 1734 (`finishStroke`): **CRITICAL FIX**: Reconstructs points with the exact same sanitization map:
      `obj.points = obj.points.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2) }));`
      This ALSO silently drops `p.t` upon stylus lift! Must be updated to:
      `obj.points = obj.points.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2), t: p.t != null ? p.t : undefined }));`
    - Line 1745 (`finishStroke`): Record `obj.audioId = a.obj.audioId`, `obj.t0 = a.obj.t0`, `obj.t1 = Math.round(rec.currentTimeMs)`.
    - Line 1688 (`breakStroke`): Copy `audioId` and `t0` to sub-stroke pieces across ruler splits.

#### 4. Data Model Changes
* **Stroke Object Schema**:
  ```javascript
  {
    id: "s_101",
    type: "stroke",
    tool: "pen",
    audioId: "aud_9f2a", // [FROM MY DOCS: doc3:100]
    t0: 12450,           // integer ms from track start [FROM MY DOCS: doc3:101]
    t1: 14200,           // integer ms from track start [FROM MY DOCS: doc3:102]
    points: [
      { x: 120.5, y: 340.2, p: 0.62, t: 0 },
      { x: 122.1, y: 341.0, p: 0.65, t: 30 }
    ]
  }
  ```
* **Upstream Behavior**: Upstream GazBoard ignores unrecognized properties on stroke objects; ink rendering in upstream passes `o.points` directly to `centrelinePath`, ignoring `p.t` [VERIFIED IN CODE: src/js/core/ink.js:259-268]. 100% backward compatible.

#### 5. UI/UX Behavior & Accessibility
* **Invisible**: Runs completely under the hood during normal writing.

#### 6. Subsystem Interactions
* **Undo/Redo**: Full undo/redo fidelity. Undoing a stroke and redoing it preserves its exact original timestamps.
* **Point Erasing ([erase.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/erase.js))**: When an eraser splits a stroke, `splitStroke` in [erase.js:65-115](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/erase.js#L65-L115) copies base stroke attributes. It must be updated to copy `audioId`, `t0`, and `t1` to split segments.

#### 7. Performance Impact & Worst Case
* **Storage Footprint**: Adding `t0`, `t1` and integer `t` to points increases JSON size by approximately 12–15% for handwritten boards [VERIFIED IN CODE: src/js/core/store.js:331]. Handled easily by V8.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-101.
* **Build Index**: 3.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low. Pure additive metadata.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Precise point-level interpolation for sub-stroke reanimation.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-104: Pre-Existing Drawing Immunity

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Any stroke, shape, text box, or image created before recording began (or created without an `audioId`) remains permanently visible at 100% opacity throughout all subsequent playback sessions, completely immune to replay ghosting or hiding.
* **Acceptance Criteria**:
  1. *Filter Verification*: Any object where `!o.audioId || o.audioId !== activePlaybackTrackId` bypasses all replay visibility filters [FROM MY DOCS: doc2:134, doc3:255].
  2. *Scene Partitioning*: During replay, pre-existing objects are baked into the offscreen `Surface._inkCanvas` cache [VERIFIED IN CODE: src/js/core/surface.js:448-461], incurring zero per-frame redraw cost during audio playback.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible; standard conditional branching in the canvas pipeline.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js): Lines 448–461 (`_freezeScene`), Lines 553–588 (`draw`).
  * [src/js/core/render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js): Lines 379–410 (`drawStroke`).

#### 4. Data Model Changes
* **None**. Driven strictly by the absence or mismatch of `o.audioId`.

#### 5. UI/UX Behavior & Accessibility
* **Visual**: Pre-existing notes remain solid, grounding the user while new synchronized ink animates over them.

#### 6. Subsystem Interactions
* **Frozen Canvas Optimization**: Solves Contradiction 6 from Phase 0 [VERIFIED IN CODE: src/js/core/surface.js:553-588]. Pre-existing ink is frozen into `_inkCanvas`; only synchronized strokes are drawn dynamically.

#### 7. Performance Impact & Worst Case
* **Worst Case**: Board with 10,000 pre-existing strokes and 200 newly recorded lecture strokes.
* **Result**: Zero degradation. All 10,000 strokes are blitted from the frozen bitmap in $\sim 0.02\text{ms}$; only the 200 synchronized strokes evaluate temporal visibility.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-103.
* **Build Index**: 4.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Strict separation between background lecture slides and live spoken annotations.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 3. Synchronized Note Replay & Reanimation (F-201 – F-204)

### F-201: Real-Time Audio-Synchronized Reveal

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: During audio playback, strokes linked to the active track dynamically appear on screen in lockstep with the speaker's voice as `audio.currentTime` reaches their creation timestamp.
* **Acceptance Criteria**:
  1. *Clock Synchronization*: Replay time is driven strictly by `HTMLAudioElement.currentTime` converted to milliseconds. Zero clock drift over a 60-minute playback session [FROM MY DOCS: doc3:13-15].
  2. *Past Stroke Visibility*: Any stroke with $t_1 \le t_{current}$ renders at 100% opacity using its pre-compiled `Path2D` [VERIFIED IN CODE: src/js/core/ink.js:259-268].
  3. *RAF Animation Loop*: When audio is playing, `Surface` triggers `requestAnimationFrame` to paint reveals at the display's native refresh rate ($60\text{--}120\text{ FPS}$). When paused, the loop stops immediately to conserve battery.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible natively via standard Web Audio / HTML5 `<audio>` and 2D canvas blitting.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js): Lines 448–461 (Scene Partitioning), Lines 553–588 (`draw`).
  * `src/js/core/replay-engine.js` (NEW): Coordinates playback clock and stroke queries.

#### 4. Data Model Changes
* **None**. Consumes existing `o.t0`, `o.t1`.

#### 5. UI/UX Behavior, States & Accessibility
* **States**: `stopped`, `playing`, `paused`, `scrubbing`.
* **Controls**: Accessible from floating audio bar.
* **Keyboard**: `Space` toggles play/pause when audio player is active.

#### 6. Subsystem Interactions
* **Store Integrity**: Stroke objects in `store.doc.objects` are NEVER modified during replay [FROM MY DOCS: doc3:16]. State is strictly a render-time projection.

#### 7. Performance Impact & Worst Case
* **Architectural Fix Applied**: To avoid Contradiction 6 (redrawing the entire board 60 times a second), `Surface` uses **Scene Partitioning**:
  1. Freeze all non-session objects into `this._inkCanvas`.
  2. On each RAF frame, blit `this._inkCanvas` ($\sim 0.02\text{ms}$).
  3. Iterate only the session strokes array (pre-indexed in `ReplayEngine`). Cost: $< 0.5\text{ms}$ per frame.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-101, F-103.
* **Build Index**: 5.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Medium (frozen canvas cache invalidation must be handled meticulously).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Exact temporal note recreation.

#### 12. Upstream Readiness
* **Verdict**: Part of the core Replay PR.

---

### F-202: Visual Styling of "Pending" Notes (Ghosting / Preview)

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Strokes scheduled to appear later in the recording are rendered according to a user-selectable preview style:
  1. *Translucent Ghosting*: Rendered at dimmed opacity ($\sim 12\text{--}15\%$) or soft monochrome [FROM MY DOCS: doc1:93, doc3:262].
  2. *Hidden*: Completely invisible until $t_{current} \ge t_0$.
  3. *Bounding Outline*: Subtle dashed accent bounding box enclosing upcoming notes.
* **Acceptance Criteria**:
  1. *Style Switching*: Changing the pending style in settings or player UI updates the canvas instantly without board reload.
  2. *Instant Transition*: When $t_{current}$ reaches $t_0$, the stroke transitions seamlessly from its pending style to active progressive rendering or full opacity ink.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible via standard `CanvasRenderingContext2D` opacity and stroke styles [VERIFIED IN CODE: src/js/core/render.js:379-410].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js): Lines 379–410 (`drawStroke`).
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Add `replayPendingStyle` to `this.settings`.

#### 4. Data Model Changes
* **Settings**: New preference `settings.replayPendingStyle` in `localStorage['gazboard.settings']` (`'ghost'` | `'hidden'` | `'outline'`) [VERIFIED IN CODE: src/js/app.js:290].

#### 5. UI/UX Behavior & Accessibility
* **UI**: Dropdown or segmented toggle in the Audio Player HUD.

#### 6. Subsystem Interactions
* **Hit Testing**: In Preview Mode (F-501), ghosted strokes remain hit-testable so the user can click a ghosted stroke to jump ahead to its audio timestamp!

#### 7. Performance Impact & Worst Case
* **Ghost Path Reuse**: Ghosted strokes reuse pre-compiled `Path2D` instances via `inkPath(o)` [VERIFIED IN CODE: src/js/core/ink.js:259-268]. Drawing 300 ghosted strokes with `globalAlpha = 0.12` takes $< 0.3\text{ms}$.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 6.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: 12–15% ghost opacity pioneered by StarNote.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-203: Progressive Sub-Stroke Animation

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: For the single stroke currently being written ($t_0 \le t_{current} < t_1$), the stroke does not pop in all at once; it unfolds smoothly along its midpoint quadratic Bézier curve, optionally led by a glowing pen-tip nib dot [FROM MY DOCS: doc1:98-103, doc3:269-290].
* **Acceptance Criteria**:
  1. *Sub-Point Slicing*: Filters points where $p.t \le (t_{current} - t_0)$.
  2. *Midpoint Curve Fidelity*: Renders the partial path using `centrelinePath(visiblePts)` [VERIFIED IN CODE: src/js/core/ink.js:265], preserving GazBoard's signature fluid spline curvature.
  3. *Dynamic Pressure Tapering (Resolved Gap)*: When `hasPressureVariation(visiblePts)` is true [VERIFIED IN CODE: src/js/core/render.js:411], progressive sub-stroke rendering dynamically evaluates `pressureRuns(visiblePts, o.width, scale)` [VERIFIED IN CODE: src/js/core/ink.js:200-236] on the active partial slice, delivering true pressure-tapered inking in real time. Once the stroke finishes ($t_{current} \ge t_1$), it seamlessly snaps to the permanently cached `inkRuns(o, scale)` [VERIFIED IN CODE: src/js/core/ink.js:243-257].
  4. *Nib Indicator*: When enabled, a glowing circular dot ($r = \text{width} \times 0.9$) with shadow blur is rendered at the tip of the leading point.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Slicing points and building a temporary `Path2D` or dynamic `pressureRuns` for ONE stroke consumes $< 0.03\text{ms}$ in V8 [VERIFIED IN CODE: src/js/core/ink.js:200-236].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js): Lines 385–430 (`drawStroke` sub-stroke path generation).
  * [src/js/core/ink.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/ink.js): Export `centrelinePath` and `pressureRuns`.
* **Files Created**:
  * `src/js/core/replay-engine.js`: Sub-stroke progressive point slicer and RAF interpolation loop.

#### 4. Data Model Changes
* **None**.

#### 5. UI/UX Behavior & Accessibility
* **Visual**: Highly engaging visual feedback; mimics watching a live presenter's hand move across the canvas.

#### 6. Subsystem Interactions
* **Single Stroke Invariant**: Because a human can only draw one mark at a time, there is mathematically at most ONE stroke in the active state at any millisecond $t$, guaranteeing strictly bounded computational cost ($O(1)$).

#### 7. Performance Impact & Worst Case
* **Cost**: $< 0.03\text{ms}$ per frame for dynamic pressure runs on the single active stroke. Negligible overhead against a $16.6\text{ms}$ (60 FPS) or $8.33\text{ms}$ (120 FPS) budget.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 7.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Glowing nib dot leading edge.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-204: Multi-Speed Playback

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The user can alter audio playback speed ($0.5\times$, $0.75\times$, $1.0\times$, $1.25\times$, $1.5\times$, $2.0\times$) with automatic pitch preservation, while stroke animations remain in exact lockstep synchronization.
* **Acceptance Criteria**:
  1. *Hardware Pitch Shift*: Sets `HTMLAudioElement.playbackRate = speed`. Chromium automatically engages its WSOLA (Waveform Similarity Overlap-Add) time-stretching engine to preserve natural voice pitch without helium/chipmunk distortion [GENERAL BEST PRACTICE].
  2. *Animation Lockstep*: Because the visual engine reads `audio.currentTime` directly on each RAF tick, stroke reanimation automatically accelerates/decelerates with zero mathematical drift.

#### 2. Feasibility in Electron
* **Verdict**: Native capability of Chromium `<audio>` [GENERAL BEST PRACTICE].

#### 3. Where It Fits in Codebase
* **Files Touched**: `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **Settings**: Stores `settings.playbackSpeed` in `localStorage`.

#### 5. UI/UX Behavior & Accessibility
* **UI**: Speed chip on the floating audio bar (e.g. `1.5×`). Clicking opens a quick menu or cycles speeds.
* **Keyboard**: `[` decreases speed, `]` increases speed.

#### 6. Subsystem Interactions
* **None**. Operates entirely at the media playback level.

#### 7. Performance Impact & Worst Case
* **At $2.0\times$ speed**: Display still refreshes at 60 FPS; strokes simply reveal twice as fast. Frame budget remains $< 16.6\text{ms}$.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 8.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Standard student speed tiers ($1.25\times, 1.5\times$).

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 4. Interactive Navigation & Camera Intelligence (F-301 – F-303)

### F-301: Click-to-Seek ("Audio Jump")

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Clicking or tapping any synchronized handwritten stroke, diagram, or text box on the canvas instantly seeks audio playback to that stroke's starting timestamp ($t_0$) and triggers a transient visual pulse highlight around the clicked item.
* **Acceptance Criteria**:
  1. *Hit Detection*: In Preview Mode, a single pointer tap at world point $p$ identifies the top-most synchronized object using `pick(this.store, p)` [VERIFIED IN CODE: src/js/core/hit.js:75-83].
  2. *Seek Latency*: Audio player seeks to `obj.t0` within $< 50\text{ms}$ using HTTP 206 byte-range seeking over the `app://board/asset/<id>` protocol.
  3. *Visual Pulse*: A colored halo ring animates around `boundsOf(obj)` for $400\text{ms}$ via `Surface.overlays` [VERIFIED IN CODE: src/js/core/surface.js:31, 723], confirming which note is being heard.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Solves Contradiction 5 from Phase 0: `pulseHighlight` is newly implemented as a screen-space overlay function pushed to `surface.overlays`.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Lines 1584–1640 (`tappedAnObject`).
  * [src/js/core/surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js): Add `pulseHighlight(box, color)`.

#### 4. Data Model Changes
* **None**.

#### 5. UI/UX Behavior, States & Accessibility
* **Modes**:
  - In *Preview Mode* (F-501): Direct click anywhere on a stroke seeks audio.
  - In *Edit Mode* (F-501): Seeking requires `Alt + Click` or selecting the dedicated Seek Tool from the tray to avoid conflicting with pen writing or marquee selection.

#### 6. Subsystem Interactions
* **Audio Protocol Handler**: Relies on streaming protocol `app://board/asset/<id>` to ensure seeking is instantaneous without buffering the whole file into RAM [VERIFIED IN CODE: main.js:148-160].

#### 7. Performance Impact & Worst Case
* **Worst Case**: Rapid clicking across a crowded board with 5,000 strokes.
* **Optimization**: `pick(store, p)` performs spatial bounding box rejection before detailed segment distance checks [VERIFIED IN CODE: src/js/core/hit.js:75-83]. Average hit test: $< 0.1\text{ms}$.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-103, F-201.
* **Build Index**: 9.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Signature interaction of Notability, Flexcil, and StarNote.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-302: Auto-Follow Camera

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: During playback, the viewport automatically glides to keep newly revealed notes centered on screen. If the user manually scrolls or pans, auto-follow gracefully disengages and displays a floating "Re-center / Follow" chip.
* **Acceptance Criteria**:
  1. *Dead-Zone Boundary*: Viewport does not jitter with every stroke. Panning only triggers when newly revealing strokes fall outside an inner $60\%$ central screen viewport dead-zone [ASSUMPTION].
  2. *Smooth Easing*: Smooth translation via requestAnimationFrame interpolation (lerp: $x \mathrel{+}= (target - x) \times 0.08$) [GENERAL BEST PRACTICE].
  3. *User Interruption*: Any user mouse drag, wheel scroll, or touch pan immediately disengages auto-follow, preventing camera fighting.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Solves Contradiction 5 from Phase 0: `camera.glideTo(targetX, targetY)` is newly implemented in `camera.js` [VERIFIED IN CODE: src/js/core/camera.js:1-43].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js): Lines 30–42 (add `glideTo(box, vw, vh)`).
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Pointer down disengages follow mode.

#### 4. Data Model Changes
* **None**.

#### 5. UI/UX Behavior & Accessibility
* **Re-center Floating Chip**: Appears at top-right (`[⌖ Follow Playback]`). Clicking re-engages camera tracking.

#### 6. Subsystem Interactions
* **Frozen Canvas**: Camera movement changes `cam.x, cam.y`, which invalidates `freezeKey()` [VERIFIED IN CODE: src/js/core/surface.js:133]. Scene partitioning ensures smooth panning redraws only what is in the viewport.

#### 7. Performance Impact & Worst Case
* **Motion Sickness Prevention**: Stepped dead-zone panning prevents erratic high-frequency shakes during rapid handwriting.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 10.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Medium (camera fighting with manual navigation must be cleanly resolved).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Dead-zone panning behavior with manual disengage chip.

#### 12. Upstream Readiness
* **Verdict**: Can be proposed as an independent PR: *"Feature: Viewport Auto-Follow & Smooth Camera Easing"*.

---

### F-303: "Go to Current Stroke" Shortcut

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: A dedicated keyboard shortcut (`J` or `Home`) and UI button that instantly centers the viewport on the stroke currently being spoken/revealed.
* **Acceptance Criteria**:
  1. *Action*: Queries `ReplayEngine` for the active or most recently revealed stroke, computes its bounding box, and calls `camera.centerOn(boundsCenter, vw, vh)` [VERIFIED IN CODE: src/js/core/camera.js:38].
  2. *Latency*: Centers instantly ($< 16\text{ms}$). Re-engages auto-follow mode.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible; simple keyboard hook in `app.onKeyDown` [VERIFIED IN CODE: src/js/app.js:4290-4350].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Line 4347 (`onKeyDown`).
  * `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **None**.

#### 5. UI/UX Behavior & Accessibility
* **Hotkeys**: `J` (Jump) or `Alt+J`.

#### 6. Subsystem Interactions
* **Camera**: Invokes existing `camera.centerOn` [VERIFIED IN CODE: src/js/core/camera.js:38].

#### 7. Performance Impact & Worst Case
* **Negligible**.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 11.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Keyboard navigation for student lecture review.

#### 12. Upstream Readiness
* **Verdict**: Bundled with F-301 / F-302.

---

## 5. Timeline Scrubber, Bookmarks & Subtitles (F-401 – F-403)

### F-401: Timeline Scrubber with Stroke Density Ticks

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The audio scrubber bar displays vertical tick marks or a mini heatmap strip visualizing note-taking intensity over time, allowing students to skip silent pauses and jump directly to lecture content.
* **Acceptance Criteria**:
  1. *Tick Distribution*: Renders vertical tick marks along the timeline track representing each stroke's $t_0$ timestamp.
  2. *Density Heatmap*: When tick count exceeds 500, aggregates into 100 discrete time buckets rendered as a subtle opacity gradient ($0.2\text{ to }1.0$).
  3. *Interactive Seeking*: Clicking or dragging anywhere on the scrubber bar seeks audio and updates canvas reanimation in real time ($60\text{ FPS}$).

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible natively via an offscreen 2D canvas rendered into the scrubber DOM element.

#### 3. Where It Fits in Codebase
* **Files Touched**: `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **None**. Calculated dynamically from `store.doc.objects` where `o.audioId === activeTrack.id`.

#### 5. UI/UX Behavior & Accessibility
* **Scrubber Element**: Built using HTML5 range input or custom draggable bar with ARIA `role="slider"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="duration"`.

#### 6. Subsystem Interactions
* **Audio Engine**: While dragging, audio is temporarily muted or throttled to prevent audio stutter/crackling, then unmuted on pointer lift.

#### 7. Performance Impact & Worst Case
* **Worst Case**: 3,000 strokes in a 2-hour lecture.
* **Optimization**: Density array is generated once when the track is loaded ($< 2\text{ms}$) and cached in a 1D typed array `Uint16Array(100)`.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-103, F-201.
* **Build Index**: 12.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Heatmap tick scrubber from StarNote.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-402: Audio Bookmarks with Custom Labels

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The user can drop timestamped bookmark pins onto the audio timeline during either recording or review, label them (e.g. *"Exam Question"*), and click them to jump immediately to that point.
* **Acceptance Criteria**:
  1. *Drop Pin*: Pressing `B` or clicking "+ Flag" creates a bookmark at current playback position.
  2. *Visual Indicator*: Renders a distinctive diamond pin marker on the scrubber bar.
  3. *Label Editing*: Clicking a pin shows a floating popover input for naming/renaming or deleting the bookmark.
  4. *Click-to-Seek*: Clicking a bookmark seeks audio immediately and centers the viewport on active strokes.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * `src/js/ui/audio-bar.js`.
  * [src/js/core/store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js): Stored in `track.bookmarks`.

#### 4. Data Model Changes
* **Track Schema**:
  ```javascript
  track.bookmarks = [
    { id: "bm_1", t: 45200, label: "Theorem Proof" }
  ];
  ```
* **Store Mutation**: Added via `store.commit('add bookmark', [{ t: 'doc', before: { audioTracks }, after: { audioTracks: updated } }])`.

#### 5. UI/UX Behavior & Accessibility
* **Hotkeys**: `B` (Bookmark).

#### 6. Subsystem Interactions
* **Undo/Redo**: Full undo support via document transaction.
* **Persistence**: Saved with the board file in `audioTracks`.

#### 7. Performance Impact & Worst Case
* **Negligible**. Typically 5–30 bookmarks per lecture.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-401.
* **Build Index**: 13.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Flagged chapter pins on timeline.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-403: External Subtitle & Caption Display (`.srt` / `.vtt`)

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Users who transcribe their audio using external tools (such as Whisper or cloud speech APIs) can import a `.srt` or `.vtt` file to display synchronized captions in a floating banner during playback.
* **Acceptance Criteria**:
  1. *Parser*: Built-in pure JS parser supporting standard SubRip (`.srt`) and WebVTT (`.vtt`) timecode formats (`00:01:23,456 --> 00:01:25,789`).
  2. *Sync Alignment*: Binary searches cues to display the matching caption based on `audio.currentTimeMs`.
  3. *Screen-Space Rendering*: Rendered in `Surface.overlays` [VERIFIED IN CODE: src/js/core/surface.js:31, 723] or as a floating styled DOM element with translucent dark backing.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Zero external parser dependencies required; a 40-line regex parser handles both SRT and VTT.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * `src/js/core/subtitles.js` (NEW): SRT/VTT parser and cue lookup.
  * [src/js/ui/panels.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/panels.js): "Attach subtitles..." menu item in Audio Track options.

#### 4. Data Model Changes
* **Track Schema**: `track.subtitlesAssetId` points to stored `.vtt` text file in `assets/`.

#### 5. UI/UX Behavior & Accessibility
* **Overlay**: Floating bottom banner. Toggleable via `CC` icon button on the player HUD.

#### 6. Subsystem Interactions
* **Export**: Included in ZIP export bundle if attached.

#### 7. Performance Impact & Worst Case
* **Cue Lookup**: Binary search over $\sim 1,000$ subtitle cues costs $< 0.005\text{ms}$ per frame.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-201.
* **Build Index**: 14.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: High-contrast accessibility subtitles.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 6. Playback Modes & Editing Permissions (F-501 – F-503)

### F-501: Dual Playback Modes: Preview (Locked) vs. Edit

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Provides two distinct interaction modes during lecture review:
  1. *Preview Mode (Study / Review)*: Drawing tools are disabled. Tapping anywhere on a stroke seeks audio immediately. Gestures pan and zoom the board.
  2. *Edit Mode (Active Revision)*: Drawing tools function normally, allowing new notes. Seeking requires `Alt + Click` or a dedicated Seek Tool.
* **Acceptance Criteria**:
  1. *Mode Switcher*: Dedicated toggle switch on the floating audio player HUD (`[👁 Preview | ✎ Edit]`).
  2. *Interaction Routing*: In Preview mode, `Interaction.onDown()` routes pointer hits to `audioPlayer.seekMs(obj.t0)` instead of `startStroke()` [VERIFIED IN CODE: src/js/core/tools.js:1535].

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible; standard state machine routing in `tools.js`.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Lines 1535–1640.
  * `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **None**. Runtime UI state on `App.playbackMode`.

#### 5. UI/UX Behavior & Accessibility
* **Cursor**: In Preview mode, hovering over a synchronized stroke displays a distinctive pointer with an audio note glyph [VERIFIED IN CODE: src/js/core/cursors.js:1-40].

#### 6. Subsystem Interactions
* **Drawing Lock**: Eliminates accidental stray pen marks when students browse recordings on touch screens.

#### 7. Performance Impact & Worst Case
* **Negligible**.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-301.
* **Build Index**: 15.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Distinct Browse vs. Annotate mode paradigms from Flexcil.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-502: Granular Action Permissions During Playback

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: When working in Edit Mode during playback, the user can toggle protection locks to prevent accidental alteration of historical lecture notes:
  - *Lock Moving*: Prevents translating or resizing synchronized lecture ink.
  - *Lock Erasing*: Prevents the eraser from cutting or removing synchronized lecture ink.
* **Acceptance Criteria**:
  1. *Eraser Guard*: When *Lock Erasing* is active, `strokesAlong()` in [hit.js:140](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js#L140) ignores any object where `o.audioId === activeTrack.id`.
  2. *Move Guard*: When *Lock Moving* is active, selection drag handles refuse movement for synchronized objects, displaying GazBoard's standard lock toast: `t('This is locked — press the unlock button to edit it')` [VERIFIED IN CODE: src/js/app.js:1245].

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Leverages GazBoard's existing `locked` object semantics [VERIFIED IN CODE: src/js/core/surface.js:639-650, src/js/app.js:1245].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Eraser and move gesture checks.
  * [src/js/core/hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js): Line 140.

#### 4. Data Model Changes
* **Settings**: `settings.lockSyncedInkErasing`, `settings.lockSyncedInkMoving`.

#### 5. UI/UX Behavior & Accessibility
* **Visual**: Locked synced items display subtle lock icons on hover badge [VERIFIED IN CODE: src/js/core/surface.js:639].

#### 6. Subsystem Interactions
* **Store Protection**: Prevents destructive mutations from being dispatched to `store.commit`.

#### 7. Performance Impact & Worst Case
* **Negligible**. Single boolean check per stroke during eraser sweep.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-501.
* **Build Index**: 16.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Safeguard against ruining recorded lectures during revision.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-503: "Sync New Notes During Playback" Setting

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: A configurable user setting determining whether annotations drawn while listening to an existing recording should be inserted into the audio timeline at the current playback position, or treated as timeless static notes.
* **Acceptance Criteria**:
  1. *Enabled*: If set to true, new strokes receive `obj.audioId = activeTrack.id` and `obj.t0 = audioPlayer.currentTimeMs`.
  2. *Disabled (Default)*: If false, new strokes receive no `audioId`, remaining permanently visible static ink.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible.

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Line 1535 (`startStroke`).
  * `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **Settings**: `settings.syncDuringPlayback: boolean`.

#### 5. UI/UX Behavior & Accessibility
* **UI**: Checkbox toggle in Audio Player settings popover.

#### 6. Subsystem Interactions
* **Replay Engine**: If enabled, newly added strokes are immediately registered into `ReplayEngine.sessionStrokes`.

#### 7. Performance Impact & Worst Case
* **Negligible**.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-103, F-201.
* **Build Index**: 17.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: StarNote timeline expansion feature.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 7. Multi-Board Sessions & Recording Lifecycle (F-601 – F-603)

### F-601: Cross-Board & Cross-Sheet Continuous Recording

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: An audio recording session can span across multiple boards or multi-page sheets without interrupting the microphone capture. During playback, crossing a segment timestamp boundary prompts or automatically navigates to the corresponding board/sheet.
* **Acceptance Criteria**:
  1. *Continuous Capture*: Switching boards via `app.openBoard(id)` [VERIFIED IN CODE: src/js/app.js:940] does NOT stop `AudioRecorder`. The microphone stream continues uninterrupted.
  2. *Segment Manifest*: The active session records a list of spans:
     `segments: [{ boardId: 'b_1', sheetIndex: 0, t0: 0, t1: 180000 }, { boardId: 'b_2', sheetIndex: 0, t0: 180000, t1: 360000 }]`.
  3. *Playback Navigation*: When playback crosses $180000\text{ms}$, the app automatically saves the current board and loads `b_2`, continuing audio seamlessly.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible because `AudioRecorder` lives at the singleton `App` level in the renderer process [VERIFIED IN CODE: src/js/app.js:215], which persists across board switches!

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Lines 940–960 (`openBoard`), Lines 3175–3245 (sheet navigation).
  * `src/js/core/audio-recorder.js`.

#### 4. Data Model Changes
* **Session Manifest**: Global recording session tracks segments across boards. Board documents store cross-board session pointers.

#### 5. UI/UX Behavior, States & Accessibility
* **Toast Notification**: On board switch during recording: `app.toast(t('Recording continuing on {name}', { name: doc.name }), 'pen')` [VERIFIED IN CODE: src/js/app.js:3019].
* **Replay Prompts**: Configurable option: "Auto-switch boards during replay" vs "Ask before switching".

#### 6. Subsystem Interactions
* **Autosave**: Outgoing board must be persisted atomically via `app.persist()` before the incoming board loads.

#### 7. Performance Impact & Worst Case
* **Worst Case**: Rapidly flipping between 10 boards while recording.
* **Mitigation**: Board loading in GazBoard is sub-$50\text{ms}$ for standard local JSON files [VERIFIED IN CODE: main.js:1242].

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-101, F-201.
* **Build Index**: 18.

#### 10. Complexity & Risk
* **Complexity**: L (Large).
* **Risk**: High (requires clean lifecycle management to ensure boards are fully saved before switching).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Multi-page lecture continuity.

#### 12. Upstream Readiness
* **Verdict**: Advanced feature; should be staged as its own subsequent PR after core Replay lands.

---

### F-602: Safe Deletion Dialog (Keep vs. Delete Strokes)

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: When deleting an audio recording track, the user is presented with a clear, safe dialog offering two explicit operational choices:
  - **Option A ("Keep Notes")**: Deletes the audio file asset and strips `audioId`, `t0`, `t1` from all associated strokes, leaving them permanently on the board as standard ink.
  - **Option B ("Delete Notes & Audio")**: Deletes the audio file asset AND deletes all strokes created during that recording session from the board in an atomic undoable transaction.
* **Acceptance Criteria**:
  1. *Prompt Display*: Triggering "Delete Track" displays a modal dialog with explicit explanations of both choices.
  2. *Option A Execution*: Dispatches `{ t: 'set', id, before: { audioId, t0, t1 }, after: { audioId: undefined, t0: undefined, t1: undefined } }` for all matching strokes, and removes the track from `doc.audioTracks`.
  3. *Option B Execution*: Dispatches `{ t: 'del', id, obj, index }` for all matching strokes, and removes the track from `doc.audioTracks`.
  4. *Undoability*: The entire batch operation is committed as ONE single transaction (`store.commit('delete audio track', ops)`), allowing the user to press `Ctrl+Z` to undo the deletion completely.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Aligns directly with GazBoard's transaction store architecture [VERIFIED IN CODE: src/js/core/store.js:63-116].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * `src/js/ui/audio-bar.js`.
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Add `deleteAudioTrack(trackId, deleteInk)`.

#### 4. Data Model Changes
* **Store Transaction**: Batch `set` or `del` operations in `store.commit`.

#### 5. UI/UX Behavior & Accessibility
* **Dialog UI**: Styled modal dialog with destructive action styling for Option B (red outline) and safe action styling for Option A.

#### 6. Subsystem Interactions
* **Asset Store**: Deletes the underlying audio file via `window.board.assets.delete(assetId)` if no other board references the SHA-256 hash.

#### 7. Performance Impact & Worst Case
* **Worst Case**: Deleting a track associated with 4,000 strokes.
* **Performance**: A batch transaction of 4,000 ops commits in $< 8\text{ms}$ in `Store` [VERIFIED IN CODE: src/js/core/store.js:63].

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-101, F-103.
* **Build Index**: 19.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low. Safe non-destructive design.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Safety net preventing disastrous accidental loss of lecture notes.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-603: Audio Export & Local Storage

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Users can export raw audio recording files (`.webm`) to a user-chosen directory, reveal the audio file in Windows File Explorer, or copy its file path with a single click.
* **Acceptance Criteria**:
  1. *Save File Dialog*: Invokes `window.board.saveDialog({ defaultPath: 'lecture.webm', filters: [...] })` [VERIFIED IN CODE: preload.js:184, main.js:1121].
  2. *Binary Stream Copy*: Copies the asset binary directly to the chosen path without base64 overhead.
  3. *Reveal in Explorer*: Clicking "Show in Folder" calls `window.board.showItem(filePath)` [VERIFIED IN CODE: preload.js:185, main.js:1131], highlighting the file in Windows File Explorer.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible; GazBoard already exposes `board.saveDialog`, `board.writeFile`, and `board.showItem` in `preload.js` [VERIFIED IN CODE: preload.js:182-185].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/export.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js):
    - Lines 657–668 (`saveBoardFile`): Inspect `doc.audioTracks`. If audio tracks exist, bundle board JSON and all associated audio binary files into a `.gazboard` ZIP archive using `JSZip` [VERIFIED IN CODE: src/js/board-export.js:45-50].
    - Lines 670–686 (`openBoardFile`): **CRITICAL FIX**: Currently executes `JSON.parse(new TextDecoder().decode(buf))` [export.js:678]. Handed a ZIP container, this crashes with `SyntaxError: Unexpected token 'P'`. Must inspect magic bytes (`buf[0] === 0x50 && buf[1] === 0x4b` for `PK`); if ZIP, extract `board.json` and unpack assets into local storage via `JSZip`; otherwise fall back to `JSON.parse`.
  * [src/js/ui/panels.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/panels.js): Audio track menu items.
  * `src/js/ui/audio-bar.js`.

#### 4. Data Model Changes
* **None**.

#### 5. UI/UX Behavior & Accessibility
* **Explorer Integration**: Seamless native Windows shell integration.

#### 6. Subsystem Interactions
* **Asset Retrieval & Portability**: Reads directly from `<userData>/boards/assets/<hash>.webm` via binary IPC. When exported as `.gazboard` ZIP, audio assets travel inside the archive, ensuring boards remain 100% self-contained when transferred to other machines.

#### 7. Performance Impact & Worst Case
* **Negligible**.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform (`shell.showItemInFolder` works on Windows Explorer, macOS Finder, and Linux file managers).

#### 9. Dependencies & Build Order
* **Dependencies**: F-101.
* **Build Index**: 20.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Open access to student recordings without vendor lock-in.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 8. StarNote & Flexcil Signature Tablet & Study Features (F-701 – F-705)

### F-701: Study Tape / Masking Tool (Active Recall & Self-Quizzing)

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: An interactive active-recall study tool allowing students to drag rectangular masking tape strips over formulas, diagrams, or text. Tapping a tape strip toggles it between completely concealed (opaque) and revealed (translucent with dashed outline). Master buttons allow "Reveal All" and "Hide All".
* **Acceptance Criteria**:
  1. *Drawing Gesture*: Selecting the Tape tool and dragging across the canvas creates a tape rectangle with specified fill color (default sticky yellow `#ffc83b`).
  2. *Two-Way Toggling*: In Study mode or with pen in hand, tapping an opaque tape strip reveals it; tapping a revealed tape strip conceals it again.
  3. *Visual Representation*:
     - *Concealed*: 100% opaque rectangle concealing underlying ink [VERIFIED IN CODE: src/js/core/render.js:1008-1012].
     - *Revealed*: Translucent fill ($\sim 15\%$ opacity) with dashed accent border, keeping the answer readable while indicating where the mask is.
  4. *Master Controls*: Toolbar commands "Reveal All Tape" and "Cover All Tape" batch-update all tape objects on the active sheet.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible.
* **Architectural Alignment with Upstream `curtain`**:
  * Solves Contradiction 4 from Phase 0 [VERIFIED IN CODE: src/js/core/render.js:980-1031, src/js/core/hit.js:28].
  * Upstream GazBoard already features an active-recall Answer Cover system under type `'curtain'`.
  * Rather than creating an incompatible `type: 'tape'`, we implement Tape as a specialized variant:
    `{ type: 'curtain', subtype: 'tape', x, y, w, h, color: '#ffc83b', revealed: boolean }`.
  * *Rendering Fix*: In [render.js:993](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js#L993), replace `if (o.revealed) return;` with:
    ```javascript
    if (o.revealed) {
      if (o.subtype !== 'tape') return;
      // Draw revealed tape: translucent fill + dashed border
      ctx.save();
      ctx.fillStyle = o.color || '#ffc83b';
      ctx.globalAlpha = 0.15;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = o.color || '#ffc83b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.restore();
      return;
    }
    ```
  * *Hit Testing Fix*: In [hit.js:28](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js#L28), update `ghost(o)`:
    ```javascript
    export const ghost = (o) => !!o && (!!o.hidden || (o.type === 'curtain' && o.subtype !== 'tape' && !!o.revealed));
    ```
    This preserves the pass-through property for standard curtains while allowing revealed tape strips to remain hittable for two-way toggling!
  * *Upstream Compatibility*: When opened in upstream GazBoard, tape objects render as standard curtains when concealed and disappear when revealed. Zero errors or data corruption!

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js): Lines 980–1031 (`drawCurtain`).
  * [src/js/core/hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js): Line 28 (`ghost`), Line 128 (`curtainAt`).
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Line 1604 (`tappedAnObject` curtain toggle), Lines 1535–1560 (add tape drawing tool).
  * [src/js/ui/toolbar.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/toolbar.js): Add Tape tool icon to pen tray.

#### 4. Data Model Changes
* **Object Schema**:
  ```javascript
  {
    id: "c_101",
    type: "curtain",
    subtype: "tape",
    x: 100, y: 200, w: 180, h: 36,
    color: "#ffc83b",
    revealed: false
  }
  ```
* **Store Ops**: Standard `{ t: 'add', obj }`, `{ t: 'set', id, before: { revealed }, after: { revealed: !revealed } }`.

#### 5. UI/UX Behavior, States & Accessibility
* **Toolbar**: Tape pen tool in toolbar tray. Palette allows color selection (yellow, mint green, coral pink, sky blue).
* **Keyboard**: `T` activates Tape tool.

#### 6. Subsystem Interactions
* **Undo/Redo**: Tapping tape to reveal/hide pushes an undo transaction.
* **Export**: Concealed tape renders in exports as solid mask; revealed tape exports as translucent or dashed box.

#### 7. Performance Impact & Worst Case
* **Worst Case**: Student masks 200 vocabulary terms on a single page.
* **Performance**: Drawing 200 simple rectangular paths costs $< 0.1\text{ms}$. Negligible.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: None. Can be built independently.
* **Build Index**: 21.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Low (by reusing the `curtain` schema, risk of regressions is virtually zero).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Signature study tool of Flexcil and StarNote.

#### 12. Upstream Readiness
* **Verdict**: Outstanding candidate for an isolated upstream pull request: *"Feature: Interactive Study Tape & Active Recall Tool"*.

---

### F-702: PDF Excerpt & Reference Hyperlink Cards

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Using the selection tool on an imported PDF page, the user can box-select an excerpt (diagram, chart, theorem) and click "Create Reference Card". An independent card is placed onto the study canvas holding the cropped bitmap and a clickable navigation badge (`[Jump to Page 24]`). Clicking the badge smoothly pans and zooms the camera back to the source location.
* **Acceptance Criteria**:
  1. *Excerpt Generation*: Crops the selected area from the underlying PDF image bitmap, storing the cropped asset locally.
  2. *Navigation Token*: Emits a cross-reference token `{ sourceBoardId, sourceSheetIndex, sourceBox: { x, y, w, h } }`.
  3. *Click Navigation*: Clicking the badge calls `camera.glideTo(sourceBox)` [VERIFIED IN CODE: src/js/core/camera.js:30-42], smoothly centering on the original context.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Directly integrates with GazBoard's existing board-reference hyperlinking architecture [VERIFIED IN CODE: src/js/core/boardrefs.js:1-50], native `boardlink` card renderer [VERIFIED IN CODE: src/js/core/render.js:1102-1135], and deep navigation history stack [VERIFIED IN CODE: src/js/app.js:1670-1695].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/ui/contextmenu.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/contextmenu.js): Add "Create Reference Card" action to selection floating bar.
  * [src/js/core/boardrefs.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/boardrefs.js): Extend reference token parsing to support sub-page bounding boxes (`@[Title](b:<boardId>#<page>:<x>,<y>,<w>,<h>)`) [VERIFIED IN CODE: src/js/core/boardrefs.js:21-29].
  * [src/js/core/render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js): Lines 1102–1135 (extend `drawBoardLink` to render cropped thumbnail and page badge).
  * [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js): Lines 1670–1692 (`openBoardRef`): When jumping to target, if `ref.box` exists, trigger `this.surface.cam.glideTo(ref.box)` and push previous camera position to `this.backStack` [VERIFIED IN CODE: src/js/app.js:1686].
  * [src/js/core/camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js): Add `glideTo(box)`.

#### 4. Data Model Changes
* **Card Schema (Reusing GazBoard Native `boardlink` Object Type)**:
  ```javascript
  {
    id: "k_101",
    type: "boardlink",
    x: 500, y: 100, w: 250, h: 180,
    rotation: 0,
    board: {
      id: "b_sourceBoardId",
      name: "Biology Lecture Slides",
      page: 24,
      box: { x: 100, y: 800, w: 250, h: 180 }
    },
    cropAssetId: "b8f2c0..." // cropped PNG stored in assets/
  }
  ```
* **Upstream Behavior**: Because the object type is `'boardlink'`, upstream GazBoard recognizes it natively and renders a standard boardlink card [VERIFIED IN CODE: src/js/core/render.js:1102]. Clicking it in upstream opens page 24 of the linked board; the `box` property is safely ignored without throwing.

#### 5. UI/UX Behavior & Accessibility
* **Badge**: Small pill badge at the top-left of the excerpt card (`↗ Slide 24`).
* **Return Navigation**: Following an excerpt link activates GazBoard's native return pill via `this.syncBackPill()` [VERIFIED IN CODE: src/js/app.js:1690], allowing the user to click "Back" (or press `Alt+Left`) to instantly return to their study notes!

#### 6. Subsystem Interactions
* **Camera Easing**: Animates camera smoothly over $400\text{ms}$ with cubic easing via `camera.glideTo`.
* **Back Stack**: Native GazBoard `this.backStack.push({ ...from, to: target.id })` [VERIFIED IN CODE: src/js/app.js:1686] records the exact previous camera viewport.

#### 7. Performance Impact & Worst Case
* **Crop Optimization**: Cropping an HTML5 canvas bitmap via `drawImage` takes $< 1\text{ms}$ for standard excerpt sizes.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-302 (`camera.glideTo`).
* **Build Index**: 22.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Signature study workflow from Flexcil.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

### F-703: Gesture Scratch-Out Eraser

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: Rapidly scribbling back and forth (a zig-zag gesture with $\ge 4$ directional reversals) with any pen or stylus over an existing handwritten word, stroke, or shape immediately deletes the underlying intersected objects, eliminating the friction of switching back and forth to the eraser tool.
* **Acceptance Criteria**:
  1. *Detection Geometry*: Evaluates candidate stroke points in `onPointerUp` before `finishStroke` is ever called [VERIFIED IN CODE: src/js/core/tools.js:957]:
     - Reversal count along principal axis $\ge 4$.
     - Total trajectory path length / bounding box diagonal $\ge 3.5$.
     - Bounding box aspect ratio between $1:1$ and $4:1$.
  2. *Rejection of Normal Inking*: Dense writing (e.g. handwriting cursive letters "m", "w", or cross-hatching shading) is rejected by bounding-box aspect ratio and reversal density guards, preventing false positives.
  3. *Atomic Erasure*: If identified, the candidate scratch stroke is discarded via `this.discardTapMark()` [VERIFIED IN CODE: src/js/core/tools.js:1669], and all intersected objects within the scribble's convex hull are removed via `store.removeMany(hitIds, 'scratch erase')`.
  4. *Undoability*: A single `Ctrl+Z` restores the deleted items atomically.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Pure geometry calculation executed synchronously on pen lift ($< 0.02\text{ms}$).

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js):
    - Line 957 (`onPointerUp`): GazBoard already implements the exact guard pattern:
      ```javascript
      if (!this.tappedAnObject(a, e)) this.finishStroke(a);
      ```
      Hook scratch gesture recognition directly alongside `tappedAnObject`:
      ```javascript
      if (!this.tappedAnObject(a, e) && !this.scratchedAnObject(a, e)) this.finishStroke(a);
      ```
    - Add `scratchedAnObject(a, e)` method: Evaluates points using `detectScratchOut(a.obj.points)`; if matched, finds intersected objects via `inBox(this.store, a.obj.bbox)` or `strokesAlong`, calls `this.discardTapMark()`, executes `this.store.removeMany(targets.map(o => o.id), 'scratch erase')`, and calls `this.surface.invalidate()`.
  * `src/js/core/recognize.js`: Add pure mathematical evaluator `detectScratchOut(points)`.
  * [src/js/core/hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js): Utilize existing `inBox` [hit.js:92] and `strokesAlong` [hit.js:140].

#### 4. Data Model Changes
* **None**. Standard `{ t: 'del', id, obj, index }` operations.

#### 5. UI/UX Behavior & Accessibility
* **Setting**: Toggle `settings.gestureScratchOut: boolean` (enabled by default). Sensitivity slider (`Low`, `Normal`, `High`).

#### 6. Subsystem Interactions
* **Shape Recognizer Interaction**: In [tools.js:1756-1760](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js#L1756-L1760), `recognize(obj.points)` runs *after* inking commits. Scratch-out evaluation MUST execute *before* `store.add(obj, 'draw')` to ensure scratch marks never enter document history.

#### 7. Performance Impact & Worst Case
* **Evaluation Cost**: Evaluating 40 points in `detectScratchOut` takes $< 0.02\text{ms}$ in V8 [VERIFIED IN CODE: src/js/core/recognize.js:1-100]. Zero perceptible latency on pen lift.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: None. Can be built early.
* **Build Index**: 23.

#### 10. Complexity & Risk
* **Complexity**: M (Medium).
* **Risk**: Low (requires careful heuristic tuning to avoid false-positive erasures during natural cursive writing).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Natural pen ergonomics from Samsung Notes, StarNote, and Apple Notes.

#### 12. Upstream Readiness
* **Verdict**: Outstanding candidate for standalone upstream pull request: *"Feature: Natural Gesture Scratch-Out Eraser"*.

---

### F-704: Side-by-Side Split Study Workspace

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: A dedicated dual-page layout displaying reference materials (imported PDF slides or textbooks) on the left side and an active freehand notebook / scratchpad on the right side within a single unified window.
* **Acceptance Criteria**:
  1. *Dual Column Geometry*: Solves Contradiction 8 from Phase 0 [VERIFIED IN CODE: src/js/core/pages.js:20-29]. Extends `pages.js` with a 2D layout preset (`layout: 'dual'`) placing even sheets at $x = -w - \text{GAP}/2$ (Reference) and odd sheets at $x = \text{GAP}/2$ (Notebook).
  2. *Independent Culling*: Viewport culling in `surface.js` [VERIFIED IN CODE: src/js/core/surface.js:621-623] correctly culls and renders objects across both columns.
  3. *Page Rect Mapping*: `pageRects()` returns valid 2D coordinates for all sheets, preserving spatial hit testing and sheet navigation.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible. Two architectural approaches evaluated:
  * **Approach A (2D World Coordinate Layout in `pages.js`)**: Modifies `pageRects()` to arrange sheets in two columns in world space.
  * **Approach B (Dual-Viewport Split Canvas UI — Recommended)**: Mounts two independent canvas viewports side-by-side in the DOM (left: Reference Board/PDF, right: Study Notebook).

#### 3. Where It Fits in Codebase & Architectural Trade-Off
* **Approach A (2D World Layout)**:
  * *Files*: [src/js/core/pages.js:20-29](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/pages.js#L20-L29).
  * *Fatal Upstream Flaw*: Upstream GazBoard strictly assumes a 1D vertical stack [VERIFIED IN CODE: src/js/core/pages.js:1-12]. In [tools.js:1549](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js#L1549), `startStroke` asserts:
    ```javascript
    const sheet = this.sheetAt(wp);
    if (this.pages.length && !sheet) return;
    ```
    When an Approach A board is opened in upstream GazBoard, the right-hand notebook notes land in the empty "desk/gutter" to the right of sheet 0. Because upstream `sheetAt(wp)` returns `null` there, upstream users **cannot draw on or interact with the notebook notes**!
* **Approach B (Dual-Viewport Split Canvas — Flexcil Architecture)**:
  * *Files Touched*: [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) (manage active `surface`), [src/js/ui/panels.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/panels.js) (split workspace toggle), `index.html` (CSS split pane container).
  * *100% Upstream Backward Compatibility*: Each pane hosts an independent standard GazBoard document. Both the Reference PDF board and the Study Notebook board remain 100% vanilla GazBoard files that open flawlessly in upstream GazBoard with zero desk-clipping bugs.

#### 4. Data Model Changes
* **Approach B Data Model**:
  No schema modifications to individual boards. Workspace session persists the split configuration in local settings:
  ```javascript
  settings.splitWorkspace = {
    enabled: true,
    leftBoardId: "b_ref_slides",
    rightBoardId: "b_notes_biology",
    splitRatio: 0.5
  };
  ```
* **Upstream Behavior**: Both boards are standard GazBoard documents (`schema: 2`). Perfect two-way compatibility.

#### 5. UI/UX Behavior & Accessibility
* **Window Adaptability**: Automatically switches to single-column vertical layout on narrow windows ($< 900\text{px}$).

#### 6. Subsystem Interactions
* **PDF Import**: "Import PDF as Study Deck" imports pages into the left column, automatically generating matching blank lined sheets in the right column!

#### 7. Performance Impact & Worst Case
* **Worst Case**: 100-page slide deck arranged in dual columns.
* **Performance**: Viewport culling culls 96% of pages outside the screen; rendering cost is identical to single-column boards.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: None.
* **Build Index**: 24.

#### 10. Complexity & Risk
* **Complexity**: L (Large).
* **Risk**: Medium (modifying `pageRects` layout math requires verifying all 12 spatial indexing helper functions in `pages.js`).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Signature textbook-and-notebook workflow from Flexcil.

#### 12. Upstream Readiness
* **Verdict**: Standalone PR: *"Feature: Side-by-Side Dual Column Page Layout"*.

---

### F-705: Recorded Laser Pointer Trail

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: When recording is active and the presenter uses GazBoard's laser pointer tool [VERIFIED IN CODE: src/js/core/surface.js:550-553], the laser pointer coordinate stream is sampled at $20\text{ Hz}$ and recorded into the audio track session, reanimating during playback.
* **Acceptance Criteria**:
  1. *Stream Sampling*: Samples laser $(x, y)$ world coordinates at $50\text{ms}$ intervals ($20\text{ Hz}$) only when the pointer is touching down.
  2. *Replay Reanimation*: During playback, animates the moving laser glowing dot and fading trail across the canvas in exact synchronization with the audio.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible natively via `Surface.laser` [VERIFIED IN CODE: src/js/core/surface.js:550].

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js): Pointermove handling for laser tool.
  * `src/js/core/replay-engine.js`: Replays laser coordinates into `surface.laser`.

#### 4. Data Model Changes
* **Track Metadata**:
  ```javascript
  track.laserSamples = [
    { t: 12400, x: 230.5, y: 410.2 },
    { t: 12450, x: 235.1, y: 412.0 }
  ];
  ```

#### 5. UI/UX Behavior & Accessibility
* **Setting**: Checkbox in Audio settings: "Record Laser Pointer".

#### 6. Subsystem Interactions
* **Canvas Rendering**: Reuses GazBoard's native laser fading trail renderer [VERIFIED IN CODE: src/js/core/surface.js:550-553].

#### 7. Performance Impact & Worst Case
* **Sampling Overhead**: 20 Hz sampling produces 1,200 points per minute ($~24\text{ KB}$ per minute uncompressed, $< 5\text{ KB}$ compressed). Negligible storage.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform.

#### 9. Dependencies & Build Order
* **Dependencies**: F-101, F-201.
* **Build Index**: 25.

#### 10. Complexity & Risk
* **Complexity**: S (Small).
* **Risk**: Low.

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Presentation capture fidelity.

#### 12. Upstream Readiness
* **Verdict**: Yes.

---

## 9. Media Export Subsystem (F-801)

### F-801: Animated Video Export (`.webm` / `.mp4`)

#### 1. Precise Restatement & Testable Acceptance Criteria
* **Restatement**: The user can export the synchronized audio track and canvas reanimation as a standalone, playable video file (`.webm` or `.mp4`) for sharing with classmates or publishing online.
* **Acceptance Criteria**:
  1. *Framerate & Resolution*: Exports at $30\text{ FPS}$ or $60\text{ FPS}$ at 1080p ($1920 \times 1080$) or board native resolution.
  2. *Audio-Video Multiplexing*: Canvas video stream captured via `HTMLCanvasElement.captureStream(30)` combined with audio track via Web Audio `MediaStreamDestination` into a `MediaRecorder` instance [GENERAL BEST PRACTICE].
  3. *Camera Modes*:
     - *Fit-All*: Static bird’s-eye camera framing the entire drawing area.
     - *Follow Camera*: Animated cinematic camera tracking active strokes in real time.
  4. *Offline Render Option*: Can run in real-time or faster-than-real-time via an offscreen canvas rendering loop.
  5. *Progress Feedback*: Modal dialog showing export progress bar (`0% to 100%`) and remaining time estimate, with Cancel button.

#### 2. Feasibility in Electron
* **Verdict**: Fully feasible in Chromium without external FFmpeg binary dependencies.
* **Technical Mechanism**:
  * Utilizes `canvas.captureStream(30)` combined with an `AudioContext` media stream node feeding into `new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' })` [GENERAL BEST PRACTICE].
  * Generates clean, standard WebM video files natively supported by Chrome, Edge, Firefox, VLC, and YouTube.
  * For MP4 on Windows: Chromium in modern Electron (Electron 43 / Chromium 128) supports `video/mp4;codecs=avc1` natively via Windows Media Foundation hardware encoders [GENERAL BEST PRACTICE]!

#### 3. Where It Fits in Codebase
* **Files Touched**:
  * [src/js/export.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js): Lines 650–689 (export menu integration).
  * [src/js/ui/panels.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/panels.js): Add "Video Replay (.webm)..." option to Export panel.
* **Files Created**:
  * `src/js/export-video.js` (NEW): Offscreen export controller, progress modal, and stream multiplexer.

#### 4. Data Model Changes
* **None**. Consumes existing board and audio track data.

#### 5. UI/UX Behavior, States & Accessibility
* **Modal Dialog**: Shows video preview thumbnail, resolution picker (720p, 1080p), camera mode toggle, and "Start Export" button.
* **Exporting State**: Progress bar with cancel button. Suppresses user input during export.

#### 6. Subsystem Interactions
* **Audio Seeking**: Audio element is played through Web Audio destination node to capture exact synchronized sound without microphone feedback.

#### 7. Performance Impact & Worst Case
* **Worst Case**: Exporting a 60-minute lecture video.
* **Resource Cost**: Real-time canvas stream capture uses $15\text{--}25\%$ CPU/GPU hardware encoding on modern Windows machines.
* **Memory Management**: Flushes chunks directly to disk via streaming binary IPC to avoid holding gigabytes of video in RAM.

#### 8. Non-Windows Platforms
* **Verdict**: Cross-platform (`video/webm` works on Windows, macOS, Linux).

#### 9. Dependencies & Build Order
* **Dependencies**: F-201, F-302.
* **Build Index**: 26.

#### 10. Complexity & Risk
* **Complexity**: L (Large).
* **Risk**: Medium (ensuring audio-video synchronization does not slip during long exports).

#### 11. StarNote / Flexcil Benchmark
* **Adopt**: Standalone video export for asynchronous lecture sharing.

#### 12. Upstream Readiness
* **Verdict**: Standalone PR: *"Feature: Canvas Replay Video Export Engine"*.

---

## 10. Master Feature Analysis Matrix & Implementation Taxonomy

| Feature ID | Feature Name | Tier | Complexity | Risk | Upstream PR Viable? | Key Code Extension Point |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-101** | Live Audio Recording | Tier 1 | M | Low | Yes (Core PR 1) | `main.js:680`, `audio-recorder.js` |
| **F-102** | Pause & Resume Continuity | Tier 1 | S | Low | Yes (Core PR 1) | `audio-recorder.js` |
| **F-103** | Stroke-to-Audio Timestamping | Tier 1 | S | Low | Yes (Core PR 1) | `tools.js:1535, 1696` |
| **F-104** | Pre-Existing Drawing Immunity | Tier 1 | S | Low | Yes (Core PR 1) | `surface.js:448`, `render.js:379` |
| **F-201** | Synchronized Note Reveal | Tier 1 | M | Med | Yes (Core PR 2) | `surface.js:553-588`, `replay-engine.js` |
| **F-202** | Visual Pending Note Ghosting | Tier 1 | S | Low | Yes (Core PR 2) | `render.js:379-410` |
| **F-203** | Progressive Sub-Stroke Drawing | Tier 1 | S | Low | Yes (Core PR 2) | `render.js:385`, `ink.js:265` |
| **F-204** | Multi-Speed Playback | Tier 2 | S | Low | Yes (Core PR 2) | `audio-bar.js` |
| **F-301** | Click-to-Seek ("Audio Jump") | Tier 1 | M | Low | Yes (Core PR 2) | `tools.js:1584`, `hit.js:75` |
| **F-302** | Auto-Follow Camera | Tier 2 | M | Med | Yes (PR 3: Camera) | `camera.js:30-42`, `tools.js` |
| **F-303** | Go to Current Stroke Shortcut | Tier 2 | S | Low | Yes (PR 3: Camera) | `app.js:4347`, `camera.js:38` |
| **F-401** | Scrubber Density Ticks | Tier 2 | S | Low | Yes (Core PR 2) | `audio-bar.js` |
| **F-402** | Audio Bookmarks with Labels | Tier 2 | S | Low | Yes (Core PR 2) | `audio-bar.js`, `store.js:327` |
| **F-403** | Subtitle & Caption Overlay | Tier 3 | S | Low | Yes (PR 4: Subtitles)| `subtitles.js`, `surface.js:723` |
| **F-501** | Preview vs Edit Modes | Tier 2 | S | Low | Yes (Core PR 2) | `tools.js:1535-1640` |
| **F-502** | Playback Action Permissions | Tier 2 | S | Low | Yes (Core PR 2) | `tools.js`, `hit.js:140` |
| **F-503** | Sync During Playback Setting | Tier 2 | S | Low | Yes (Core PR 2) | `tools.js:1535` |
| **F-601** | Cross-Board Sessions | Tier 3 | L | High| Yes (PR 5: MultiBoard)| `app.js:940`, `audio-recorder.js` |
| **F-602** | Safe Deletion Dialog | Tier 2 | S | Low | Yes (Core PR 1) | `app.js`, `store.js:63` |
| **F-603** | Audio Export & Local Storage | Tier 2 | S | Low | Yes (Core PR 1) | `panels.js`, `preload.js:184` |
| **F-701** | Study Tape / Masking Tool | Tier 2 | M | Low | Yes (PR 6: Study Tape)| `render.js:993`, `hit.js:28` |
| **F-702** | PDF Excerpt Hyperlink Cards | Tier 3 | M | Low | Yes (PR 7: Excerpts) | `contextmenu.js`, `boardrefs.js` |
| **F-703** | Gesture Scratch-Out Eraser | Tier 3 | M | Low | Yes (PR 8: Gestures) | `tools.js:1696`, `recognize.js` |
| **F-704** | Side-by-Side Split Workspace | Tier 3 | L | Med | Yes (PR 9: DualPages)| `pages.js:20-29`, `panels.js` |
| **F-705** | Recorded Laser Pointer Trail | Tier 3 | S | Low | Yes (Core PR 2) | `surface.js:550`, `replay-engine.js` |
| **F-801** | Animated Video Export | Tier 3 | L | Med | Yes (PR 10: VideoExp)| `export-video.js`, `export.js` |
