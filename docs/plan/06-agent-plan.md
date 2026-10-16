# Phase 6: AI Agent Execution Plan & Guardrail Architecture
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 6 Complete — Autonomous Agent Execution Instructions & Guardrails (Verified Ground Truth)

---

## 1. Architectural Strategy & Agent Execution Philosophy

This document turns the implementation plan into an autonomous execution roadmap designed specifically for an AI coding agent operating in agentic mode. In an offline-first, performance-critical desktop application like GazBoard (executing 120 FPS hardware canvas inking with zero web framework overhead), an uncontrolled coding agent poses severe architectural risks:
1. **Silent Refactoring**: Reformatting or restructuring massive, fragile files like `app.js` (5,446 lines) or `tools.js` (3,047 lines), making future merges from upstream impossible.
2. **Invented APIs & Hallucinations**: Calling nonexistent convenience functions (e.g., `camera.panTo()`, `surface.pulseHighlight()`, `assets.put()` returning a string) instead of adhering to actual repository interfaces.
3. **Property Stripping & Data Loss**: Accidentally omitting custom metadata properties during point/stroke normalization (e.g., `tools.js:1707, 1734` stripping `point.t`).
4. **Supply Chain Contamination**: Introducing heavy external npm dependencies for features that can and must be implemented using native Web / Node primitives.
5. **CI Invariant Breakage**: Adding unquoted or dynamic strings to `t(...)` without updating the 7 language dictionaries in `src/locales/`, causing `scripts/i18n-check.js` to fail.

### 1.1 Core Execution Invariants
Every agent task executed under this plan MUST maintain four invariants:
- **Continuous Operability**: At the conclusion of *every single task*, the application must launch cleanly (`npm start`), pass the built-in smoke tests (`npm run smoke:builtin`), and pass the translation audit (`node scripts/i18n-check.js`).
- **Additive Schema Evolution**: `Store.doc.schema` remains `2` [VERIFIED IN CODE: src/js/core/store.js:327]. No breaking alterations to the document tree are permitted.
- **Zero Runtime Dependencies**: No entries may be added to `"dependencies"` in `package.json` [VERIFIED IN CODE: package.json:50-56]. All audio, video, layout, and gesture features rely exclusively on native Web APIs (`MediaRecorder`, `AudioContext`, `HTMLCanvasElement`, `CanvasRenderingContext2D`) and native Node modules (`node:crypto`, `node:fs/promises`, `node:path`).
- **Upstream Merge Isolation**: Core files receive only minimal single-line hooks. Complex state logic is placed in newly created modular files under `src/js/core/` and `src/js/ui/`.

---

## 2. Hard Guardrails for the Coding Agent

### 2.1 "DO NOT TOUCH" File Inventory
The agent is strictly prohibited from modifying the following files without explicit user sign-off. These files represent delicate, stable subsystems where automated edits are prone to introducing regressions or security bypasses:

| File Path | Subsystem | Reason for Prohibition |
|:---|:---|:---|
| `sync/protocol.js` | LAN Sync Wire Protocol | Contains hand-rolled pairing code generation (8-char base-32) and native `node:crypto` key agreement [VERIFIED IN CODE: sync/protocol.js:1-55]. Modifying breaks wire compatibility. |
| `sync/node.js` | LAN Socket Engine | Low-level TCP socket pooling, firewall negotiation, and chunked frame marshalling [VERIFIED IN CODE: sync/node.js:1-60]. |
| `sync/firewall.js` | Windows Firewall Helper | Uses PowerShell commands to configure inbound firewall rules [VERIFIED IN CODE: sync/firewall.js]. High security risk if touched. |
| `sync/desktop.js` | LAN Desktop Bridge | Connects renderer IPC to sync server. Stable interface. |
| `soffice.js` | LibreOffice CLI Bridge | Headless conversion bridge for `.docx`, `.pptx`, `.odt` files. Stable. |
| `msoffice.js` | COM Automation Bridge | Windows ActiveX/COM script for local Office rendering. Fragile native integration. |
| `src/js/core/geometry.js` | Geometric Math Engine | Contains polygon clipping, bezier curve evaluations, and matrix math. Highly sensitive to numerical precision errors. |
| `src/js/core/util.js` | Core Utilities | `uid()`, `dist()`, `clamp()`, `pointInPolygon()`, `bboxOfPoints()` [VERIFIED IN CODE: src/js/core/util.js:1-120]. Do not rewrite or alter existing methods. |
| `scripts/i18n-extract.js` | Translation String Extractor | AST regex scanner that enforces single plain string literals for `t('...')` [VERIFIED IN CODE: scripts/i18n-extract.js:15-19, 40-42]. Do not alter extraction rules. |
| `scripts/i18n-check.js` | CI Translation Gate | Verifies all 7 translation dictionaries match extracted keys [VERIFIED IN CODE: scripts/i18n-check.js:27-44]. Must never be weakened or bypassed. |

### 2.2 Rules for Dependencies
1. **Runtime Dependencies (`dependencies`)**: STRICTLY FORBIDDEN. The `dependencies` object in `package.json` must remain empty or nonexistent. No libraries such as `lodash`, `ffmpeg.js`, `recordrtc`, `libsodium`, `react`, or `zustand` may be introduced.
2. **Development Dependencies (`devDependencies`)**: May only be modified if explicitly required for build/packaging tooling (e.g., configuring `electron-builder`), subject to user approval. Existing packages (`jszip: ^3.10.1`, `mammoth: ^1.8.0`, `pdfjs-dist: 4.10.38`) must be reused [VERIFIED IN CODE: package.json:51-56].

### 2.3 When the Agent MUST Stop and Ask
The agent must halt execution, revert pending uncommitted changes, and present a concise explanation to the user if any of the following occur:
1. **Existing Test Failure**: A pre-existing test in `test/smoke.js` or `test/storage-location.test.js` fails, and the failure cannot be resolved without changing the test's original assertions.
2. **Schema Incompatibility**: A proposed feature requires modifying the structure of `Store.doc.schema = 2` or alters existing object properties (`points`, `type`, `color`, `width`, `bbox`, `rotation`, `locked`, `hidden`, `revealed`).
3. **Native Node Addon Requirement**: A requirement appears to demand compiling a C++ addon or bundling external binary executables (e.g. `ffmpeg.exe`).
4. **Performance Degradation**: Frame render time in `Surface.draw()` exceeds $8\text{ ms}$ on a board with 1,000 objects.
5. **Ambiguous User Specification**: Conflicting behavioral requirements between `doc1_feature_specification.md` and the existing codebase.

### 2.4 Preventing Scope Creep & Silent Refactors
1. **Diff Budget Constraint**: In monolithic files (`app.js`, `tools.js`, `surface.js`, `render.js`, `main.js`), the agent must NOT modify more than 50 lines in a single task unless explicitly authorized.
2. **No Formatting Passes**: Never run automated formatters (Prettier, ESLint `--fix`) across existing legacy code. Modifying whitespace or variable names in untouched functions corrupts `git blame` and generates catastrophic conflicts during upstream merges.
3. **Strict Function Addition Boundary**: New application logic must reside in dedicated modules (`src/js/core/scratch.js`, `src/js/core/replay.js`, `src/js/core/audio-recorder.js`, `src/js/ui/audio-bar.js`, etc.). Monolithic files may only contain delegator invocations.

---

## 3. Standardized Agent Task-Prompt Template

The user can copy-paste the following standardized prompt template into each agent session to enforce boundaries and ensure reproducible execution:

```markdown
### Task Execution Directive: GazBoard Replay

**Target Task**: [INSERT TASK ID, e.g., Task 1.1: Scratch Gesture Recognizer]
**Target Files to CREATE**: [INSERT PATHS or "None"]
**Target Files to MODIFY**: [INSERT PATHS or "None"]
**DO NOT TOUCH Files**: `sync/*`, `soffice.js`, `msoffice.js`, `src/js/core/geometry.js`, `src/js/core/util.js`, `scripts/i18n-*.js`

#### 1. Context & Architectural Constraints
- Base App Version: GazBoard 4.8.1 (Electron 43.4.1, Vanilla ES6+ modules).
- Reference Implementation Blueprint: `docs/plan/05-file-plan.md` Section [INSERT SECTION].
- Schema Invariant: `Store.doc.schema` must remain `2`. All new data properties must be additive and optional.
- Dependency Invariant: Absolutely ZERO new packages in `dependencies`. Native Web/Node APIs only.
- i18n Rule: Any user-facing string must use `t('Literal String with {placeholder}')`. No string concatenation or template literals. If new strings are added, stub them into all 7 locales in `src/locales/*.json`.

#### 2. Exact Technical Ground Truth
[INSERT SPECIFIC CODE CITATIONS, LINE NUMBERS, AND PITFALL WARNINGS FOR THIS TASK]

#### 3. Scope of Changes
[INSERT BULLET POINTS OF PRECISE CHANGES TO BE MADE]

#### 4. Verification & Done-Criteria
Before declaring complete, you MUST execute and pass:
1. `node scripts/i18n-check.js` (Must exit 0 with 0 missing strings across all 7 locales).
2. [INSERT TASK-SPECIFIC VERIFICATION COMMAND, e.g. `npm run smoke:builtin`].
3. `git diff --stat` (Verify no untouched files or formatting churn).

#### 5. Stop Conditions
Stop immediately and ask if:
- Any pre-existing test in `test/smoke.js` fails.
- You feel tempted to refactor surrounding code in existing files.
- A native addon or external npm dependency appears necessary.
```

---

## 4. Granular, Ordered Task List

The work is organized into 27 discrete, single-session tasks across the 5 architectural milestones. Each task is self-contained, verifiable, and leaves the application fully functional.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         GAZBOARD REPLAY TASK FLOW DIAGRAM                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  M1: CORE ENHANCEMENTS                                                                 │
│  [Task 1.1: scratch.js] ──> [Task 1.2: hit.js] ──> [Task 1.3: render.js]               │
│         │                                                  │                           │
│         v                                                  v                           │
│  [Task 1.4: camera.js] ──> [Task 1.5: surface.js] ──> [Task 1.6: Tape Toggle]          │
│         │                                                  │                           │
│         v                                                  v                           │
│  [Task 1.7: Scratch Tool] ──> [Task 1.8: ZIP Export] ──> [Task 1.9: ZIP Import]        │
│         │                                                                              │
│         v                                                                              │
│  [Task 1.10: M1 Verification & PR 1-4 Commit Boundary]                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  M2: AUDIO INFRASTRUCTURE                                                              │
│  [Task 2.1: audio-recorder.js] ──> [Task 2.2: Protocol Stream]                         │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 2.3: Binary IPC] ──────────> [Task 2.4: Store Schema]                           │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 2.5: Stroke Timestamps] ───> [Task 2.6: LAN Sync Strip]                         │
│         │                                                                              │
│         v                                                                              │
│  [Task 2.7: M2 Verification & PR 6 Commit Boundary]                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  M3: REPLAY ENGINE & HUD                                                               │
│  [Task 3.1: replay.js] ──> [Task 3.2: Scene Partitioning]                             │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 3.3: Click-to-Seek] ───────> [Task 3.4: AudioBar HUD]                          │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 3.5: Density Scrubber] ────> [Task 3.6: Safe Subtitles]                         │
│         │                                                                              │
│         v                                                                              │
│  [Task 3.7: M3 Verification & PR 7 Commit Boundary]                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  M4: DUAL-WORKSPACE & EXPORT                                                           │
│  [Task 4.1: split-workspace.js] ──> [Task 4.2: PDF Excerpt Cards]                      │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 4.3: video-export.js] ─────> [Task 4.4: M4 Verification & PR 5 Commit Boundary] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  M5: HARDENING & RELEASE                                                               │
│  [Task 5.1: Atomic Write Fix] ────> [Task 5.2: Update URL]                             │
│         │                                  │                                           │
│         v                                  v                                           │
│  [Task 5.3: i18n Dictionary Guard] > [Task 5.4: Test Suite & PR Packaging]             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Milestone 1: Zero-Dependency Core & Study Enhancements

#### Task 1.1: Gesture Scratch-Out Recognition Module
* **Target File**: `src/js/core/scratch.js` (CREATE)
* **Goal**: Implement purely mathematical recognition for rapid stylus zig-zag motions across strokes.
* **Code Ground Truth**: Imports `dist` and `bboxOfPoints` from `src/js/core/util.js` [VERIFIED IN CODE: src/js/core/util.js:12, 114].
* **Exact Implementation**:
  - Export constants: `SCRATCH_MIN_REVERSALS = 4`, `SCRATCH_MAX_DURATION_MS = 1200`, `SCRATCH_MIN_DENSITY = 3.0`.
  - Export `isScratchGesture(points)` analyzing directional sign reversals along the dominant motion axis, verifying turnaround density relative to bounding box diagonal.
* **Done-Criteria**:
  - Module passes standalone Node import test without syntax or import errors.
  - Returns `true` for synthetic 5-peak zig-zag arrays; returns `false` for linear strokes, circles, and cursive writing samples.
* **Verification Command**: `node -e "import('./src/js/core/scratch.js').then(m => console.log('scratch module ok'))"`

---

#### Task 1.2: Hit-Testing & Ghost Exemption for Study Tape
* **Target File**: `src/js/core/hit.js` (MODIFY)
* **Goal**: Exempt revealed tape from the ghost predicate so it remains clickable for two-way toggling.
* **Code Ground Truth**:
  - Line 28 defines `ghost(o)` [VERIFIED IN CODE: src/js/core/hit.js:28]:
    `export const ghost = (o) => !!o && (!!o.hidden || (o.type === 'curtain' && !!o.revealed));`
  - CRITICAL PITFALL: Do NOT invert the boolean operators. The double-bang `!!` are assertions, not negations.
* **Exact Changes**:
  - Modify `hit.js:28` to:
    ```javascript
    export const ghost = (o) => !!o && (!!o.hidden || (o.type === 'curtain' && o.subtype !== 'tape' && !!o.revealed));
    ```
* **Done-Criteria**:
  - `ghost({ type: 'curtain', revealed: true })` returns `true`.
  - `ghost({ type: 'curtain', subtype: 'tape', revealed: true })` returns `false`.
  - `ghost({ type: 'curtain', subtype: 'tape', hidden: true })` returns `true`.
* **Verification Command**: `node scripts/smoke.js --builtin`

---

#### Task 1.3: Study Tape Rendering & Style Differentiation
* **Target File**: `src/js/core/render.js` (MODIFY)
* **Goal**: Render revealed tape as a translucent, dashed study strip while preserving classic opaque rendering for unrevealed tape and standard curtains.
* **Code Ground Truth**:
  - `drawCurtain(ctx, o)` is located at lines 992–1031 [VERIFIED IN CODE: src/js/core/render.js:992-1031].
  - Unrevealed curtains render solid fill with 45-degree diagonal stripes and centered label text [VERIFIED IN CODE: render.js:1005-1030].
* **Exact Changes**:
  - At line 993, replace early return `if (o.revealed) return;` with:
    ```javascript
    if (o.revealed) {
      if (o.subtype !== 'tape') return;
      const { x, y, w, h } = o;
      const r = Math.min(Math.abs(w), Math.abs(h)) * 0.13;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
      ctx.fillStyle = o.color ? o.color + '26' : 'rgba(255, 185, 0, 0.15)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = o.color || '#ffb900';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ```
* **Done-Criteria**:
  - Standard curtains disappear when revealed.
  - Tape curtains with `revealed: true` render translucent fill with dashed stroke.
  - Standard curtain stripes and labels remain completely untouched.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.4: Smooth Camera Easing & Glide Animation
* **Target File**: `src/js/core/camera.js` (MODIFY)
* **Goal**: Add cubic ease-out camera interpolation (`glideTo`) and gesture cancellation (`cancelGlide`) to the `Camera` class.
* **Code Ground Truth**:
  - `Camera` class is defined in lines 5–42 [VERIFIED IN CODE: src/js/core/camera.js:5-42].
  - Existing methods: `toScreen`, `toWorld`, `panBy`, `zoomAt`, `viewport`, `fit`, `centerOn`, `toJSON`, `load`.
  - Zero dependencies outside `clamp` [VERIFIED IN CODE: camera.js:1].
* **Exact Changes**:
  - Implement `glideTo(box, vw, vh, { pad = 80, duration = 400, onDone = null } = {})` utilizing cubic ease-out `1 - Math.pow(1 - t, 3)` via `requestAnimationFrame`.
  - Implement `cancelGlide()` cancelling `this._anim` if active.
* **Done-Criteria**:
  - Calling `cam.glideTo(...)` smoothly animates `cam.x, cam.y, cam.z` to center on `box` within 400ms.
  - Calling `cam.cancelGlide()` halts animation instantly at current intermediate coordinates.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.5: Surface Pulse Highlight Overlay Engine
* **Target File**: `src/js/core/surface.js` (MODIFY)
* **Goal**: Implement transient pulsing bounding box overlays in `Surface.pulseHighlight` for click-to-seek feedback and bookmark targeting.
* **Code Ground Truth**:
  - `Surface` maintains an `overlays` array drawn in `draw()` [VERIFIED IN CODE: src/js/core/surface.js:31, 723].
  - Method `drawLaser` and `drawFades` operate on screen coordinates [VERIFIED IN CODE: surface.js:718-728].
* **Exact Changes**:
  - Add `pulseHighlight(worldBox, duration = 600)` to `Surface`:
    Converts `worldBox` to screen space via `this.cam.toScreen`, renders expanding translucent blue rectangle, and removes itself from `this.overlays` once elapsed time exceeds duration.
* **Done-Criteria**:
  - `surface.pulseHighlight({ x: 10, y: 10, w: 100, h: 100 })` adds an overlay function.
  - After 600ms, the function is removed and canvas is invalidated.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.6: Two-Way Study Tape Toggle Routing
* **Target Files**: `src/js/app.js` (MODIFY), `src/js/core/tools.js` (MODIFY)
* **Goal**: Allow tapping an already-revealed tape curtain to conceal it again, while keeping standard curtain behavior intact.
* **Code Ground Truth**:
  - In `app.js:1947`, `revealCurtain(id)` returns `false` if `o.revealed` is already true [VERIFIED IN CODE: src/js/app.js:1947].
  - In `tools.js:1607`, `tappedAnObject` calls `this.app.revealCurtain(cover.id)` [VERIFIED IN CODE: src/js/core/tools.js:1607].
  - In `tools.js:949` and `tools.js:2618`, click handlers call `revealCurtain` [VERIFIED IN CODE: tools.js:949, 2618].
* **Exact Changes**:
  - In `app.js`: Add `toggleCurtain(id)`. If `o.subtype === 'tape'`, toggles `revealed: !o.revealed` via `store.update` with label `reveal tape` or `conceal tape`. For standard curtains, falls back to `this.revealCurtain(id)`.
  - In `tools.js`: Replace calls to `this.app.revealCurtain` with `this.app.toggleCurtain` at lines 949, 1607, and 2618.
  - In `tools.js:370`: Call `this.surface.cam.cancelGlide?.()` on pointer down to cancel camera glide on user interaction.
* **Done-Criteria**:
  - Pen tap on unrevealed tape reveals it.
  - Pen tap on revealed tape conceals it.
  - Pen tap on standard curtain reveals it; subsequent tap does nothing.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.7: Stylus Scratch-Out Eraser Integration
* **Target File**: `src/js/core/tools.js` (MODIFY)
* **Goal**: Intercept stylus scratch gestures on pointer lift and delete covered objects atomically without polluting the undo log with the scribble.
* **Code Ground Truth**:
  - In `tools.js:957` (`onPointerUp`), drawing strokes branch on `if (!this.tappedAnObject(a, e)) this.finishStroke(a);` [VERIFIED IN CODE: src/js/core/tools.js:957].
  - Intercepting BEFORE `finishStroke` avoids committing the scribble to `store.add` [VERIFIED IN CODE: tools.js:1745].
* **Exact Changes**:
  - Import `isScratchGesture` from `./scratch.js`.
  - In `tools.js:957`, insert `if (this.offerScratchOut(a)) break;` before `this.finishStroke(a)`.
  - Add helper `offerScratchOut(a)`:
    Checks `isScratchGesture(a.obj.points)`. If true, finds intersecting non-locked objects via `inBox(this.store, box, false)`, calls `this.discardTapMark()`, executes `this.store.removeMany(ids, 'scratch-out')`, and triggers `this.surface.pulseHighlight(box, 400)`.
* **Done-Criteria**:
  - Rapid zig-zag over three ink strokes removes them and triggers a blue pulse.
  - No stroke scribble is left behind; single Undo restores all deleted strokes together.
  - Normal handwriting (words, loops, underlines) is not recognized as scratch and commits normally.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.8: Media Board ZIP Container Export Engine
* **Target Files**: `src/js/board-export.js` (MODIFY), `src/js/export.js` (MODIFY)
* **Goal**: Export `.gazboard` files containing media assets as standard ZIP archives containing `board.json` and `assets/*`, while preserving plain JSON for boards without audio.
* **Code Ground Truth**:
  - `loadZip()` in `src/js/board-export.js:6` dynamically imports `jszip` [VERIFIED IN CODE: board-export.js:6].
  - `saveBoardFile(app)` in `src/js/export.js:657-668` saves board as plain UTF-8 JSON [VERIFIED IN CODE: export.js:657-668].
* **Exact Changes**:
  - Export `loadZip` from `src/js/board-export.js`.
  - In `src/js/export.js:saveBoardFile`:
    If `doc.audioTracks?.length > 0`, instantiate `Zip`, add `board.json`, bundle binary audio files from `assets/` directory via `window.board.readFile`, compress with `DEFLATE: level 1`, and write via `window.board.writeFile`.
* **Done-Criteria**:
  - Board with audio exports as a valid ZIP archive containing `board.json` and audio files.
  - Board without audio exports as plain JSON UTF-8 file (100% backward compatible with upstream).
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.9: ZIP Container Import & Windows Explorer Association
* **Target Files**: `src/js/export.js` (MODIFY), `main.js` (MODIFY)
* **Goal**: Detect `PK\x03\x04` ZIP magic bytes on board open, extract `board.json`, and unpack bundled assets into the local asset store.
* **Code Ground Truth**:
  - `openBoardFile` in `src/js/export.js:677-678` unconditionally executes `JSON.parse(new TextDecoder().decode(buf))` [VERIFIED IN CODE: export.js:677-678].
  - `main.js:649-663` handles double-clicking a board file from Windows Explorer [VERIFIED IN CODE: main.js:649-663].
* **Exact Changes**:
  - In `src/js/export.js:openBoardFile`: Inspect first 4 bytes of `buf`. If `0x50, 0x4B, 0x03, 0x04`, use `loadZip()` to unpack `board.json` and write each `assets/*` entry to the local asset store using sanitized filenames (`path.basename`).
  - In `main.js`: Update `openBoardPath` with matching magic byte check before reading JSON.
* **Done-Criteria**:
  - Opening a `.gazboard` ZIP archive extracts audio into local assets and loads canvas correctly.
  - Opening a legacy upstream `.gazboard` JSON file continues to work without modification.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 1.10: Milestone 1 Verification, Smoke Test & Upstream PR Boundaries
* **Target File**: `test/smoke.js` (MODIFY)
* **Goal**: Validate all Milestone 1 features via automated smoke checks and prepare clean git commit boundaries for Upstream PR 1 (ZIP Container), PR 2 (Camera Easing), PR 3 (Study Tape), and PR 4 (Scratch Eraser).
* **Exact Changes**:
  - Add test block to `test/smoke.js` verifying `isScratchGesture`, `ghost` on tape, and `glideTo`.
* **Done-Criteria**:
  - `npm run smoke:builtin` passes 100%.
  - `node scripts/i18n-check.js` passes with 0 errors.
  - Clean git commit history established per Section 5.
* **Verification Command**: `npm run smoke:builtin && node scripts/i18n-check.js`

---

### Milestone 2: Audio & Media Core Pipeline

#### Task 2.1: Headless AudioRecorder Machine
* **Target File**: `src/js/core/audio-recorder.js` (CREATE)
* **Goal**: Implement headless audio recording controller wrapping `navigator.mediaDevices.getUserMedia` and `MediaRecorder` with RMS audio level metering via `AudioContext`.
* **Code Ground Truth**:
  - Uses native W3C `MediaRecorder` with `audio/webm;codecs=opus` at 64 kbps.
  - Uses `AnalyserNode` with `fftSize = 64` for 60 FPS microphone level visualization.
* **Exact Implementation**:
  - Class `AudioRecorder` with states `'idle' | 'recording' | 'paused'`.
  - Methods: `start()`, `pause()`, `resume()`, `stop()`, `currentOffsetMs()`.
  - Slices audio chunks every 3,000ms and sends via IPC to main process.
  - Accumulates elapsed wall-clock milliseconds across pause/resume cycles.
* **Done-Criteria**:
  - Pause/resume accumulates milliseconds accurately without drift.
  - Meter callbacks provide normalized values between 0.0 and 1.0.
* **Verification Command**: `node -e "import('./src/js/core/audio-recorder.js').then(() => console.log('recorder ok'))"`

---

#### Task 2.2: Streaming Protocol Handler & Permission Bridge
* **Target File**: `main.js` (MODIFY)
* **Goal**: Extend `protocol.handle('app', ...)` to stream audio assets via `net.fetch(pathToFileURL(...))` and install explicit microphone permission handler.
* **Code Ground Truth**:
  - `main.js:152-161` handles `app://` protocol via `net.fetch` [VERIFIED IN CODE: main.js:152-161].
  - `main.js` currently lacks `session.defaultSession.setPermissionRequestHandler` [VERIFIED IN CODE: main.js].
* **Exact Changes**:
  - In `main.js:app.whenReady()`:
    ```javascript
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(webContents.getURL().startsWith('app://board/') && permission === 'media');
    });
    ```
  - In `protocol.handle('app')`: Route `/asset/<id>` requests to `assetsDir()/<id>` via `net.fetch(pathToFileURL(filePath).toString())`, strictly validating `id` against `ASSET_NAME = /^[a-f0-9]{64}\.[a-z0-9]+$/i`.
* **Done-Criteria**:
  - Packaged app permits microphone access on `navigator.mediaDevices.getUserMedia`.
  - Audio element loading `app://board/asset/<hash>.webm` responds with HTTP 206 Partial Content when seeking.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 2.3: Streaming Binary IPC Handlers
* **Target Files**: `main.js` (MODIFY), `preload.js` (MODIFY)
* **Goal**: Stream audio recording chunks directly to disk in the main process, avoiding base64 IPC overhead and memory duplication.
* **Code Ground Truth**:
  - `preload.js:220-285` exposes `window.board` methods [VERIFIED IN CODE: preload.js:220-285].
* **Exact Changes**:
  - In `main.js`: Register IPC handlers `recording:start`, `recording:appendChunk`, `recording:finish`, and `assets:putBinaryDirect`.
  - `recording:appendChunk` writes binary chunks directly to temporary stream.
  - `recording:finish` computes SHA-256 hash, renames temp file to `assets/<hash>.webm`, and returns `{ assetId: hash, durationMs }`.
  - In `preload.js`: Expose `window.board.recording` and `window.board.assets.putBinaryDirect`.
* **Done-Criteria**:
  - 1-hour recording can stream chunks without growing renderer heap.
  - Audio file is correctly hashed and placed in `assetsDir()`.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 2.4: Store Schema Serialization for AudioTracks
* **Target File**: `src/js/core/store.js` (MODIFY)
* **Goal**: Persist and deserialize `audioTracks` array across board saves and loads without modifying schema version 2.
* **Code Ground Truth**:
  - `emptyDoc()` at lines 16–25 initializes document defaults [VERIFIED IN CODE: src/js/core/store.js:16-25].
  - `toJSON()` at lines 327–332 explicitly maps properties and drops unlisted fields [VERIFIED IN CODE: store.js:327-332].
  - `load(data)` at lines 343–362 initializes fresh doc and copies recognized fields [VERIFIED IN CODE: store.js:343-362].
* **Exact Changes**:
  - In `emptyDoc()`: Add `audioTracks: []`.
  - In `toJSON()`: Map `audioTracks` if present, including `id, assetId, name, durationMs, created, bookmarks`.
  - In `load(data)`: Restore `audioTracks` array if present.
* **Done-Criteria**:
  - `store.toJSON()` includes `audioTracks`.
  - `store.load()` correctly restores `audioTracks`.
  - Upstream board files without `audioTracks` load with `audioTracks: []`.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 2.5: Stroke Temporal Timestamping Pipeline
* **Target File**: `src/js/core/tools.js` (MODIFY)
* **Goal**: Capture millisecond timestamp `p.t` for every stroke point during recording, prevent stripping in compression, and stamp stroke bounds (`audioId`, `t0`, `t1`).
* **Code Ground Truth**:
  - In `tools.js:1556`, first point is pushed in `startStroke` [VERIFIED IN CODE: src/js/core/tools.js:1556]. Must capture `p.t` here!
  - In `tools.js:724, 726`, intermediate points are generated in `onMove` [VERIFIED IN CODE: tools.js:724-726].
  - In `tools.js:1707` (`tidy`) and `tools.js:1734` (`finishStroke`), point properties are stripped to `x, y, p` [VERIFIED IN CODE: tools.js:1707, 1734]. Must preserve `t: p.t != null ? Math.round(p.t) : undefined`.
* **Exact Changes**:
  - In `startStroke` and `onMove`: Attach `t: currentAudioTime` to each point if recording is active.
  - In `tidy` and `finishStroke`: Preserve `t` during point mapping.
  - In `finishStroke`: Attach `audioId, t0, t1` to stroke object.
* **Done-Criteria**:
  - Strokes drawn while recording retain `p.t` on all points, plus `audioId, t0, t1`.
  - Strokes drawn while idle omit `audioId, t0, t1` and `p.t` (zero file overhead).
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 2.6: LAN Sharing Audio Payload Stripping
* **Target File**: `src/js/app.js` (MODIFY)
* **Goal**: Prevent multi-megabyte audio tracks from being broadcast over LAN peer sync, preserving the 64MB sync message limit.
* **Code Ground Truth**:
  - In `app.js:5338`, `picturesForSending(doc)` sanitizes document for LAN sync [VERIFIED IN CODE: src/js/app.js:5338].
* **Exact Changes**:
  - In `picturesForSending(doc)`: Delete `audioTracks` from sync payload before serialization.
* **Done-Criteria**:
  - LAN sync sends ink strokes and images but omits heavy audio tracks.
* **Verification Command**: `npm run test:sync`

---

#### Task 2.7: Milestone 2 Verification, Smoke Test & Upstream PR 6 Boundary
* **Target File**: `test/smoke.js` (MODIFY)
* **Goal**: Validate recording, timestamping, and audio asset protocol handling; commit PR 6 boundary.
* **Done-Criteria**:
  - `npm run smoke:builtin` passes 100%.
  - `node scripts/i18n-check.js` passes with 0 errors.
  - Commit boundary established for PR 6.
* **Verification Command**: `npm run smoke:builtin`

---

### Milestone 3: Canvas Replay Engine & Synchronized UI

#### Task 3.1: Synchronized Replay Engine Core
* **Target File**: `src/js/core/replay.js` (CREATE)
* **Goal**: Implement timeline replay controller driving audio playback, timeline clock, playback rates ($0.5\times-2.0\times$), and ghost modes.
* **Exact Implementation**:
  - Class `ReplayEngine` wrapping HTML5 `<audio>` element.
  - Methods: `loadTrack(track)`, `play()`, `pause()`, `seek(timeMs)`, `setSpeed(speed)`, `getActiveStroke()`.
  - Animation loop via `requestAnimationFrame` syncing canvas redraws to audio clock.
* **Done-Criteria**:
  - Replay engine coordinates playback clock and invalidates surface.
  - Speed changes maintain audio pitch (`preservesPitch = true`).
* **Verification Command**: `node -e "import('./src/js/core/replay.js').then(() => console.log('replay ok'))"`

---

#### Task 3.2: Scene Partitioning & Dynamic Replay Pass
* **Target File**: `src/js/core/surface.js` (MODIFY)
* **Goal**: Partition canvas rendering during replay: freeze background strokes into `_inkCanvas` while rendering active session strokes dynamically on each RAF tick.
* **Code Ground Truth**:
  - `_freezeScene()` renders all objects into offscreen canvas [VERIFIED IN CODE: src/js/core/surface.js:435-461].
  - `freezeKey()` blits frozen canvas if key matches [VERIFIED IN CODE: surface.js:130-134].
* **Exact Changes**:
  - In `freezeKey()`: Incorporate replay track ID to force re-baking when replay mode changes.
  - In `_freezeScene()`: Filter out strokes belonging to active replay track.
  - In `draw()`: If replay is active, blit frozen background, then call `drawReplaySession(ctx)`.
  - In `drawReplaySession(ctx)`: Render past strokes at 100% opacity, current stroke with partial point slice and glowing tip dot, and future strokes at 12% opacity (ghost mode) or hidden.
* **Done-Criteria**:
  - Playback renders progressive ink drawing smoothly without redrawing entire canvas.
  - Frame render time during playback is $< 2\text{ms}$.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 3.3: Interactive Click-to-Seek & Auto-Follow Camera
* **Target Files**: `src/js/core/tools.js` (MODIFY), `src/js/core/replay.js` (MODIFY)
* **Goal**: Clicking any ink stroke with audio timestamp seeks replay to that stroke's `t0` and glides camera to follow stroke bounds.
* **Code Ground Truth**:
  - In `tools.js:1612`, click handling checks for links [VERIFIED IN CODE: src/js/core/tools.js:1612].
* **Exact Changes**:
  - In `tools.js:tappedAnObject`: If replay track is loaded and tapped object has `o.audioId === activeTrack.id`, call `app.replayEngine.seek(o.t0)`, trigger `surface.pulseHighlight(o.bbox)`, and return `true`.
  - In `replay.js`: If `autoFollow` is enabled, call `surface.cam.glideTo(stroke.bbox)` whenever active stroke moves outside viewport.
* **Done-Criteria**:
  - Clicking a stroke seeks audio to exact timestamp and pulses blue highlight.
  - Camera glides to keep active in-flight strokes visible.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 3.4: Floating Draggable AudioBar HUD Widget
* **Target File**: `src/js/ui/audio-bar.js` (CREATE)
* **Goal**: Create floating draggable HUD bar (modeled on `ClassTimer` [VERIFIED IN CODE: src/js/ui/timer.js:69-120]) housing recording/replay controls, elapsed time, speed menu, and bookmark controls.
* **Exact Implementation**:
  - Constructed using DOM builder `h(...)` from `src/js/ui/popover.js:80-93`.
  - Draggable across `#stage` with position clamped to viewport.
  - Includes recording indicator, play/pause button, time display, speed toggle ($0.5\times, 1.0\times, 1.25\times, 1.5\times, 2.0\times$), and bookmark flag button.
* **Done-Criteria**:
  - Widget floats above canvas without interfering with canvas pointer events.
  - Responsive to recording state and replay playback.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 3.5: Timeline Stroke Density Waveform Canvas
* **Target File**: `src/js/ui/density-canvas.js` (CREATE)
* **Goal**: Render miniature scrubber bar plotting stroke density ticks across lecture duration and interactive bookmark pins.
* **Exact Implementation**:
  - Offscreen 2D canvas rendered into scrubber track.
  - Density ticks calculated as $x = (t_0 / \text{totalDuration}) \times \text{width}$.
  - Clicking scrubber seeks replay engine immediately.
* **Done-Criteria**:
  - Visual density peaks correspond to active writing intervals.
  - Clicking seeks audio and canvas accurately.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 3.6: Subtitle & Transcript Safe Display Engine
* **Target Files**: `src/js/ui/subtitles.js` (CREATE), `src/js/ui/popover.js` (AUDIT)
* **Goal**: Parse `.vtt` / `.srt` subtitle files and display synchronized transcript captions using safe text nodes (preventing XSS).
* **Code Ground Truth**:
  - `popover.js:84` assigns `el.innerHTML = v` if `k === 'html'` [VERIFIED IN CODE: src/js/ui/popover.js:84].
  - To prevent XSS, transcript text must use `document.createTextNode` or `el.textContent`.
* **Exact Changes**:
  - In `subtitles.js`: Simple regex parser for VTT/SRT cues `{ startMs, endMs, text }`.
  - Display container created with `document.createElement('div')` and text updated via `textContent`.
* **Done-Criteria**:
  - Subtitle cues sync with audio playback.
  - Malicious HTML tags in captions (e.g. `<img src=x onerror=alert(1)>`) render harmlessly as literal text.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 3.7: Milestone 3 Verification, Performance Benchmark & Upstream PR 7 Boundary
* **Target File**: `test/smoke.js` (MODIFY)
* **Goal**: Validate complete replay lifecycle, verify frame budgets ($\le 8\text{ms}$), and establish commit boundary for PR 7.
* **Done-Criteria**:
  - Full smoke test passes.
  - Replay benchmark verifies 60 FPS maintained.
* **Verification Command**: `npm run smoke:builtin`

---

### Milestone 4: Dual-Workspace & Advanced Integrations

#### Task 4.1: Split-View Dual Workspace Layout
* **Target File**: `src/js/ui/split-workspace.js` (CREATE)
* **Goal**: Implement dual-viewport workspace manager hosting two independent document/camera viewports side-by-side with a draggable divider.
* **Exact Implementation**:
  - Splits `#stage` into `#stageLeft` and `#stageRight` with interactive vertical divider.
  - Left pane hosts reference materials (PDF, lecture slides); right pane hosts student notes.
* **Done-Criteria**:
  - Pan and zoom on left pane does not alter camera on right pane.
  - Divider drag smoothly resizes viewports.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 4.2: PDF Excerpt Card Deep-Linking
* **Target Files**: `src/js/insert.js` (MODIFY), `src/js/app.js` (MODIFY)
* **Goal**: Extract selection from PDF as a visual excerpt card on the whiteboard and deep-link back to the source document page with camera glide.
* **Code Ground Truth**:
  - `openBoardRef(ref)` in `src/js/app.js:1670-1692` supports board jumping and `backStack` [VERIFIED IN CODE: src/js/app.js:1670-1692].
* **Exact Changes**:
  - In `src/js/insert.js`: Add "Create Study Excerpt Card" action creating object `{ type: 'boardlink', ref: { boardId, page, box } }`.
  - In `src/js/app.js:openBoardRef`: If `ref.box` exists, glide camera to `ref.box`.
* **Done-Criteria**:
  - Tapping excerpt card opens reference board and smoothly glides camera to exact source coordinates.
  - Back button (`app.goBack()`) returns to student notes.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 4.3: Animated Video Export Engine
* **Target File**: `src/js/export-video.js` (CREATE)
* **Goal**: Export whiteboard replay session and synchronized audio to a standalone `.webm` video file via `canvas.captureStream(30)`.
* **Exact Implementation**:
  - Renders replay frames to offscreen canvas at 30 FPS.
  - Feeds canvas stream and mixed audio stream to `MediaRecorder`.
  - Saves final video via `window.board.writeFile`.
* **Done-Criteria**:
  - Exported `.webm` video plays in standard media players with video and audio in sync.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 4.4: Milestone 4 Verification, Smoke Test & Upstream PR 5 Boundary
* **Target File**: `test/smoke.js` (MODIFY)
* **Goal**: Validate split-view workspace and PDF deep-linking; commit PR 5 boundary.
* **Done-Criteria**:
  - `npm run smoke:builtin` passes 100%.
  - Commit boundary established for PR 5.
* **Verification Command**: `npm run smoke:builtin`

---

### Milestone 5: Hardening, i18n & Release Packaging

#### Task 5.1: Atomic Write Hardening for Windows File Locking
* **Target Files**: `main.js` (MODIFY), `storage-location.js` (MODIFY)
* **Goal**: Eliminate concurrent write collisions in `writeAtomic(file, text)` by incorporating a unique sequence counter.
* **Code Ground Truth**:
  - `writeAtomic` in `main.js:250-260` uses `file + '.' + process.pid + '.tmp'` [VERIFIED IN CODE: main.js:250-260].
  - `storage-location.js:20-22` uses identical pattern [VERIFIED IN CODE: storage-location.js:20-22].
* **Exact Changes**:
  - Introduce module-scoped `let writeSequence = 0;` and use `${file}.${process.pid}.${Date.now()}.${++writeSequence}.tmp`.
* **Done-Criteria**:
  - 50 concurrent saves execute without collisions or `EBUSY` errors.
* **Verification Command**: `npm run test:storage`

---

#### Task 5.2: Fork Update Endpoint Redirection
* **Target File**: `main.js` (MODIFY)
* **Goal**: Redirect the auto-updater URLs away from upstream repository to the GazBoard Replay release repository.
* **Code Ground Truth**:
  - Lines 36–41 define `RELEASES_URL` and `UPDATE_API` pointing to `fahim9778/GazBoard` [VERIFIED IN CODE: main.js:36-41].
* **Exact Changes**:
  - Update URLs to point to the fork repository releases.
* **Done-Criteria**:
  - Updater checks fork releases; does not overwrite fork with upstream 4.8.1.
* **Verification Command**: `npm run smoke:builtin`

---

#### Task 5.3: Internationalization Dictionary Coverage
* **Target Files**: `src/locales/*.json` (MODIFY)
* **Goal**: Ensure all newly introduced Replay UI strings are translated or stubbed across all 7 supported languages (`ar, bn, de, es, pt-BR, zh-Hans, zh-Hant`).
* **Code Ground Truth**:
  - Checked by `scripts/i18n-check.js` [VERIFIED IN CODE: scripts/i18n-check.js:27-44].
* **Exact Changes**:
  - Add all new strings from `audio-bar.js`, `subtitles.js`, etc., to all 7 JSON dictionary files.
* **Done-Criteria**:
  - `node scripts/i18n-check.js` exits with code 0 and reports 0 missing keys.
* **Verification Command**: `node scripts/i18n-check.js`

---

#### Task 5.4: Comprehensive Smoke Test Suite Consolidation
* **Target File**: `test/smoke.js` (MODIFY)
* **Goal**: Consolidate automated tests for all 26 Replay features into `test/smoke.js`.
* **Done-Criteria**:
  - `npm run test:all` executes cleanly.
* **Verification Command**: `npm run test:all`

---

#### Task 5.5: Final Windows Release Build Packaging
* **Target File**: `package.json` (MODIFY)
* **Goal**: Package production Windows NSIS installer and portable `.exe` using `electron-builder`.
* **Done-Criteria**:
  - Build succeeds producing valid installer in `dist/`.
* **Verification Command**: `npm run dist:win`

---

## 5. Commit Boundaries & Rollback Architecture

### 5.1 Git Commit Strategy Mapped to Upstream PRs
To keep the fork continuously synchronized with upstream while preparing clean, reviewable PRs for the original author, git branches and commits must follow strict boundaries:

| Milestone & PR | Target Branch | Commit Message Conventional Format | Files Included |
|:---|:---|:---|:---|
| **PR 1**: ZIP Container | `feat/zip-container` | `feat(export): support .gazboard zip container with bundled assets` | `board-export.js`, `export.js`, `main.js` |
| **PR 2**: Camera Easing | `feat/camera-easing` | `feat(camera): add smooth cubic glideTo easing and pulse overlays` | `camera.js`, `surface.js` |
| **PR 3**: Study Tape | `feat/study-tape` | `feat(study): add two-way toggleable study tape curtains` | `hit.js`, `render.js`, `tools.js`, `app.js` |
| **PR 4**: Scratch-Out Eraser | `feat/scratch-eraser` | `feat(eraser): add natural gesture scratch-out stroke removal` | `scratch.js`, `tools.js` |
| **PR 5**: Split Workspace | `feat/split-workspace` | `feat(ui): add dual-column split study pad workspace` | `split-workspace.js`, `insert.js`, `app.js` |
| **PR 6**: Streaming Protocol | `feat/streaming-protocol` | `feat(protocol): stream media assets via net.fetch with range requests` | `main.js`, `preload.js` |
| **PR 7**: Replay Engine | `feat/replay-engine` | `feat(replay): synchronized audio recording and canvas stroke playback` | `audio-recorder.js`, `replay.js`, `store.js`, `audio-bar.js`, `density-canvas.js` |
| **Fork Maintenance** | `main` | `chore(fork): update release endpoints, atomic write, and locales` | `main.js`, `storage-location.js`, `locales/*.json` |

### 5.2 Rollback Protocols
If an agent session introduces unexpected test failures, performance drops, or scope creep:
1. **Immediate Task Rollback**:
   ```bash
   git checkout -- .
   git clean -fd
   ```
2. **Milestone Checkpoint Rollback**:
   Each milestone conclusion is tagged with `git tag checkpoint-m<N>`. If an entire milestone needs reversal:
   ```bash
   git reset --hard checkpoint-m<N-1>
   ```

---

## 6. AI Agent Failure Modes & Detection Playbook

The table below lists the most common failure modes exhibited by AI coding agents on this specific repository, along with concrete detection techniques and prevention rules:

| Failure Mode | How It Manifests in GazBoard | Concrete Detection Technique | Prevention Rule |
|:---|:---|:---|:---|
| **1. Invented APIs** | Agent calls `cam.panTo()`, `surface.pulseHighlight()`, or expects `assets.put()` to return a string ID. | AST scan / grep for symbol against baseline repo: `git grep "panTo"` returns 0 in baseline. | Never assume a convenience method exists. Consult Phase 5 plan for exact method names. |
| **2. Partial Refactors** | Agent introduces `toggleCurtain` in `app.js` but leaves `tools.js:1607` calling old `revealCurtain`. | Search call sites: `git grep "revealCurtain"` to ensure all relevant user interaction points were updated. | Search every reference before and after renaming or adding wrapper methods. |
| **3. Property Stripping** | In `tools.js:1707` (`tidy`) or `tools.js:1734`, agent forgets to map `t: p.t`, wiping all stroke timestamps upon pen lift. | Automated assertion in `test/smoke.js`: verify `o.points[0].t !== undefined` on recorded strokes. | When mapping `points`, always preserve `t: p.t != null ? Math.round(p.t) : undefined`. |
| **4. Inverted Boolean Logic** | In `hit.js:28`, agent misinterprets double bangs `!!o` and writes `!o && (!o.hidden || ...)`, breaking ghosting. | Smoke test `npm run smoke:builtin` fails curtain reveal tests immediately. | Check `hit.js:28` carefully: `!!o && (!!o.hidden || (o.type === 'curtain' && o.subtype !== 'tape' && !!o.revealed))`. |
| **5. Modifying Tests to Pass** | Agent breaks an invariant, causing a test in `test/smoke.js` to fail, then edits the test assertion to hide the failure. | Check git diff on test files: `git diff test/` must only show *additive* test cases. | Modifying pre-existing test assertions is strictly forbidden without user approval. |
| **6. i18n CI Breakage** | Agent calls `t('New UI String')` but fails to add the key to all 7 language dictionaries in `src/locales/*.json`. | Run `node scripts/i18n-check.js`. It immediately flags missing keys with exit code 1. | Run `node scripts/i18n-check.js` at the end of every task. Stub missing keys into all 7 locales. |
| **7. XSS via innerHTML** | Agent passes transcript text to `popover.js:h('div', { html: caption })`, triggering `el.innerHTML = v`. | Static check for `{ html: ... }` in UI widgets. | Always use child text strings: `h('div', {}, captionText)`. |
| **8. Memory Duplication** | Agent uses base64 data URLs for audio recording chunks instead of binary IPC streaming. | Heap snapshot inspection during recording; audit IPC channels in `preload.js`. | Only binary `Uint8Array` / `Buffer` across IPC. |
