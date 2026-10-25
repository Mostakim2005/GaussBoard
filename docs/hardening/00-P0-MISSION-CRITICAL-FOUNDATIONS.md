# GazBoard Hardening Dossier — Priority 0 (P0): Mission-Critical Foundations

> **Target Audience**: AI Coding Agent / Core Systems Engineer  
> **Status**: Ready for Sequential Execution  
> **Hardening Tier**: **`P0 — Zero Tolerance / Mission Critical`**  
> **Objective**: Bulletproof the 5 foundational subsystems whose failure causes data loss, canvas drawing lockups, handwriting destruction, or violation of the 6 Golden Invariants.
> **Audit status (v6.9.2, 2026-10-25)**: **Executed and audited against live source** — 35 findings logged, 33 fixed, 2 open (one mitigated in-scope item and one out-of-scope verification note). Finding-level record, verification and manual test list: [`AUDIT_LOG.md`](AUDIT_LOG.md). The methods below were treated as input suggestions; several real defects (including a replay pass painting over concealed covers and eraser fragments losing their timestamps) were found beyond the dossier's predicted failure modes.

---

## Executive Overview of P0 Subsystems

The P0 tier comprises the fundamental pillars of GazBoard Replay:
1. **Dual Split Study Workspace (`F-108`)**: Independent viewport and store virtualization.
2. **Audio-Ink Timestamp Synchronization (`F-103`)**: High-precision temporal anchoring of vector strokes.
3. **Dynamic Canvas Replay Engine & Scene Partitioning (`F-104`)**: Golden Invariant #1 dual-pass canvas separation.
4. **StarNote Scratch-Out Eraser Classifier (`F-101`)**: Kinematic gesture discrimination with cursive handwriting protection.
5. **Active-Recall Study Tape & Answer Covers (`F-102`)**: Golden Invariant #6 persistent concealment state machines.

---

## 1. Feature Deep-Dive: Dual Split Study Workspace (`F-108`)

### 1.1 What the Feature Is
Enables users to mount a secondary study/reference board alongside the active scratch canvas in either vertical (side-by-side) or horizontal (top-to-bottom) split orientation. Both panes support simultaneous independent inking, panning, zooming, selecting, and cross-pane dragging of visual excerpts.

### 1.2 Implementation Mechanics & Data Structures
- **Host & Reparenting**: Handled by `SplitWorkspace` in [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js#L13-L60). When enabled via `.enable()`, it wraps the primary canvas in a flexbox layout, creates a secondary `#leftPane`, and mounts an independent `Surface`, `Store`, and `Interaction` dispatcher.
- **Isolated State**:
  - `this.leftStore` (independent `Store` holding `doc.objects` for the reference board)
  - `this.leftSurface` (independent `Surface` with its own camera, render loop, and dirty flags)
  - `this.leftInteraction` (independent tool event processor)
  - `this.leftNib` (independent cursor indicator element `#inkNibLeft`)
- **Focus Lease Tracking**: Uses pointer coordinates to dynamically update `activeSurfaceId` between `'main'` and `'left'`.

### 1.3 Primary Code Files & Key Locations
- [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js):
  - `SplitWorkspace` class constructor (Lines 13–46)
  - `enable()` layout mounting & canvas reparenting (Lines 58–145)
  - `disable()` cleanup & restoration of primary canvas DOM hierarchy (Lines 150–210)
  - `onPointerDown()` / `onPointerMove()` focus routing (Lines 310–380)
  - Excerpt drag-and-drop listener across panes (Lines 420–490)
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js):
  - Multi-canvas event listener isolation and independent resize observers (Lines 76–98)
- [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js):
  - Keyboard shortcut routing (<kbd>Ctrl+Z</kbd>, <kbd>Ctrl+Y</kbd>) directed to the active pane store (Lines 840–890)

### 1.4 Interacting Files & Blast Radius
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Transaction commits and spatial indexing.
- [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js): Pointer capturing and stylus pressure handling.
- [`src/js/core/excerpts.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/excerpts.js): Serialization of cross-board excerpt transfers.

### 1.5 Specific Failure Modes & Line-Level Fragility
1. **Focus Bleed on Undo/Redo**: If the user draws on the left pane, then taps a button in the right pane and presses <kbd>Ctrl+Z</kbd>, an unhardened app undoes an action on the right board instead of the left.
   - *Fragile Point*: [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js#L860) must inspect `splitWorkspace.activePane` before dispatching `app.store.undo()`.
2. **DOM Reparenting Hierarchy Corruption**: In `SplitWorkspace.disable()`, if `this.originalCanvasParent` has been mutated or destroyed, restoring the primary canvas throws a DOM `NotFoundError`.
   - *Fragile Point*: [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js#L165).
3. **Deep Object Reference Mutation on Excerpt Drag**: Dragging an excerpt card from left to right without `JSON.parse(JSON.stringify(card))` shares object memory references. Mutating the card on the right silently corrupts the left board's saved state.

### 1.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Explicit Deep Clone on Cross-Pane Excerpt Transfer
// Location: src/js/ui/split-workspace.js around Line 450
handleExcerptDrop(targetStore, sourceCard) {
  if (!targetStore || !sourceCard) return;
  // Prevent shared memory reference
  const clonedCard = JSON.parse(JSON.stringify(sourceCard));
  clonedCard.id = targetStore.generateId();
  clonedCard.created = Date.now();
  targetStore.add(clonedCard);
  targetStore.commit();
}
```

---

## 2. Feature Deep-Dive: Audio-Ink Timestamp Synchronization (`F-103`)

### 2.1 What the Feature Is
Captures real-time audio from microphone input or imported audio tracks while embedding relative millisecond timestamps ($p.t$) into every point of every vector stroke drawn while recording is active. Enables StarNote-style dynamic synchronized playback.

### 2.2 Implementation Mechanics & Data Structures
- **Clock Origin**: Relative wall-clock epoch: $p.t = \text{now}() - t_{\text{start}}$, where $t_{\text{start}}$ is the precise start time of the audio track session.
- **Stroke Schema**: Every point in `stroke.points` contains `[x, y, pressure, t]`.
- **Golden Invariant #2**: All curve-fitting, Catmull-Rom interpolation, Douglas-Peucker simplification, and smoothing algorithms MUST preserve `p.t` on every generated vertex.
- **Track Metadata**: Stored in `doc.audioTracks` array with schema:
  `{ id, name, assetId, durationMs, created, bookmarks: [{ id, timeMs, label }] }`.

### 2.3 Primary Code Files & Key Locations
- [`src/js/core/audio-recorder.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/audio-recorder.js):
  - `startRecording()` wall-clock baseline initialization (Lines 45–70)
  - `stopRecording()` blob serialization and duration normalization (Lines 110–145)
- [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js):
  - Pointer down/move/up event listeners attaching timestamps (Lines 185–225)
  - `smoothPoints()` Catmull-Rom curve generator with timestamp interpolation (Lines 520–585)
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js):
  - `doc.audioTracks` JSON serialization and validation (Lines 310–350)

### 2.4 Interacting Files & Blast Radius
- [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js): Consumes `p.t` for temporal playback slicing.
- [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js): Uses `p.t` to synchronize video frames with audio buffers.
- [`src/js/ui/density-canvas.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/density-canvas.js): Bins `p.t` into 1D density histogram waveforms.

### 2.5 Specific Failure Modes & Line-Level Fragility
1. **Timestamp Stripping During Curve Fitting**: A careless curve-simplification algorithm that only generates `{ x, y }` points discards `p.t`. When replayed, the stroke fails to appear or pops on at $t = 0$.
   - *Fragile Point*: [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js#L542). Timestamp must be linearly interpolated:
     $$p_{\text{mid}}.t = p_1.t + \alpha (p_2.t - p_1.t)$$
2. **Clock Drift on Tab Sleep**: When the browser tab is minimized or backgrounded, `setInterval` or `requestAnimationFrame` throttles, causing wall-clock time to advance while audio playback stalls.
3. **Non-Finite Audio Duration**: WebM audio recordings produced by `MediaRecorder` frequently have `duration = Infinity` until fully decoded.
   - *Invariant #3 Safeguard*: Never read `audio.duration` without `isFinite()`. Fall back immediately to `track.durationMs`.

### 2.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Point Timestamp Interpolation Guard
// Location: src/js/core/tools.js around Line 545
function interpolatePoint(p1, p2, ratio) {
  const p = {
    x: p1.x + (p2.x - p1.x) * ratio,
    y: p1.y + (p2.y - p1.y) * ratio,
    pressure: p1.pressure != null ? p1.pressure + ((p2.pressure || 0.5) - p1.pressure) * ratio : 0.5
  };
  // Invariant #2: Mandatory timestamp preservation
  if (p1.t != null && p2.t != null) {
    p.t = Math.round(p1.t + (p2.t - p1.t) * ratio);
  } else if (p1.t != null) {
    p.t = p1.t;
  }
  return p;
}
```

---

## 3. Feature Deep-Dive: Dynamic Canvas Replay Engine & Scene Partitioning (`F-104`)

### 3.1 What the Feature Is
Executes sub-millisecond synchronized reanimation of recorded board sessions during audio playback. Uses **Golden Invariant #1 (Scene Partitioning)** to ensure recorded strokes do not double-render against the base canvas, applying neon glow blooming to active strokes and ghosting to future strokes.

### 3.2 Implementation Mechanics & Data Structures
- **Invariant #1 Scene Partitioning Filter**:
  ```javascript
  const replayFilter = (o) => o.audioId !== activeTrackId;
  ```
  Base canvas passes render only static strokes. The dynamic replay pass (`Surface.drawReplaySession()`) renders:
  1. Past strokes: Rendered at 100% normal stroke style + 450ms bloom decay (`#00e5ff`).
  2. Active stroke: Rendered up to current point $p.t \le t_{\text{curr}}$ with electric cyan glow (`shadowBlur: 14`).
  3. Future strokes: Rendered as ghost ink (`globalAlpha: 0.38` or hidden based on user settings).
- **Temporal Slicing**: Binary search (`binarySearchStrokePoints`) retrieves the exact sub-stroke slice for current audio timestamp.

### 3.3 Primary Code Files & Key Locations
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js):
  - Invariant #1 filter creation in `drawScene()` (Lines 545–548, 583–586, 744–747, 778–781)
  - `drawReplaySession()` overlay pass (Lines 915–998)
- [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js):
  - `ReplayEngine` class constructor & audio event wiring (Lines 8–49)
  - `syncClock()` high-precision delta time synchronization (Lines 110–155)
  - `seek()` and pending seek queue (Lines 180–220)
- [`src/js/core/replay-clock.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay-clock.js):
  - LRU revision cache (`replayStrokesForTrack`) (Lines 35–85)

### 3.4 Interacting Files & Blast Radius
- [`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js): Scrubber bar position and playback speed dispatch.
- [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js): Offscreen canvas render pump using the identical replay filter.
- [`src/js/core/camera.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/camera.js): Replay camera auto-follow spring easing.

### 3.5 Specific Failure Modes & Line-Level Fragility
1. **Scene Filter Bypass**: If a new inking feature adds an extra drawing pass to `surface.js` without forwarding `replayFilter`, session strokes double-render with distorted opacity.
   - *Fragile Point*: [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js#L592).
2. **Audio Element Stall Desync**: When seeking rapidly, `audio.currentTime` does not update immediately while `requestAnimationFrame` continues, leading to clock jump jitter.
   - *Fragile Point*: [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js#L32-L43).
3. **High-Frequency GC Pressure**: Allocating sliced point arrays on every 60 FPS animation frame for multi-thousand point strokes causes browser garbage collection stutter.

### 3.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Enforce Invariant #1 in All Render Loops
// Location: src/js/core/surface.js around Line 545
function getActiveReplayFilter(app) {
  const isReplay = app?.replayEngine?.active || (app?.audioBar?.visible && app?.replayEngine?.track);
  const activeTrackId = isReplay ? app.replayEngine.track?.id : null;
  if (!activeTrackId) return null;
  // Invariant #1: Strictly isolate active track strokes
  return (object) => object.audioId !== activeTrackId;
}
```

---

## 4. Feature Deep-Dive: StarNote Scratch-Out Eraser Classifier (`F-101`)

### 4.1 What the Feature Is
A zero-button gestural eraser. When the user rapidly scribbles back and forth over any drawing or text note with their pen, the gesture classifier recognizes the scratch kinematic pattern and automatically deletes the covered objects, pushing an atomic undo action.

### 4.2 Implementation Mechanics & Data Structures
- **Resampling**: Normalizes raw digitizer pointer inputs into equidistant 3px spatial segments (`resampleScratchPoints()`) to make gesture detection hardware-independent (60Hz mouse vs 240Hz stylus).
- **Kinematic Multi-Criteria Rule**:
  1. Sharp Reversal Turns: $\ge 5$ reversals along four projected axes ($X, Y, X+Y, X-Y$).
  2. Stroke Density: $\frac{\text{Arc Length}}{\text{BBox Diagonal}} \ge 3.5$ (scribbles retrace densely).
  3. Net Progress: $\frac{\text{Displacement}}{\text{Arc Length}} \le 0.35$ (writing moves forward; scratching stays in place).
  4. Spatial Overlap Ratio: $\ge 0.25$ on the dominant reversal axis to strictly prevent erasing cursive letters like `w`, `m`, or digits `2`, `3`.

### 4.3 Primary Code Files & Key Locations
- [`src/js/core/scratch.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scratch.js):
  - Constants `SCRATCH_MIN_REVERSALS`, `SCRATCH_MIN_DENSITY`, `SCRATCH_MAX_NET_PROGRESS` (Lines 3–6)
  - `resampleScratchPoints()` 3px distance filter (Lines 9–35)
  - `isScratchGesture()` kinematic classifier (Lines 37–130)
- [`src/js/core/erase.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/erase.js):
  - `eraseStrokesInBox()` spatial collision query and atomic deletion (Lines 40–95)
- [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js):
  - Pointer up gesture check before committing stroke to store (Lines 290–330)

### 4.4 Interacting Files & Blast Radius
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Pushes atomic transaction so single <kbd>Ctrl+Z</kbd> restores all erased strokes.
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js): Triggers instant dirty redraw.
- [`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js): Scribble eraser sensitivity settings (`low`, `medium`, `high`).

### 4.5 Specific Failure Modes & Line-Level Fragility
1. **False-Positive Handwriting Erasure**: Fast handwriting with sharp loops or rapid cross-outs can cross the reversal threshold if spatial overlap is ignored.
   - *Fragile Point*: [`src/js/core/scratch.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scratch.js#L95-L115).
2. **Atomic Undo Collapse**: If `eraseStrokesInBox()` deletes 10 strokes across 10 individual `store.delete()` calls without a batch transaction, the user must press <kbd>Ctrl+Z</kbd> 10 times to recover their note.
3. **Digitizer Spike Jitter**: High-DPI digitizers can report zero-distance duplicate points that create division-by-zero or `NaN` in angle derivations.

### 4.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Atomic Batch Undo for Scratch Eraser
// Location: src/js/core/erase.js around Line 65
export function eraseStrokesInBoxAtomic(store, bbox) {
  const hits = store.queryBox(bbox);
  if (!hits.length) return false;
  
  // Begin atomic transaction so 1 Ctrl+Z restores everything
  store.beginTransaction('scratch_erase');
  try {
    for (const obj of hits) {
      if (obj.locked) continue;
      store.delete(obj.id);
    }
  } finally {
    store.commitTransaction();
  }
  return true;
}
```

---

## 5. Feature Deep-Dive: Active-Recall Study Tape & Answer Covers (`F-102`)

### 5.1 What the Feature Is
Interactive visual study blinds designed for active recall. Freehand tape (`subtype: 'tape'`) or rectangular covers mask equations, terms, or diagram regions. Direct tapping on a mask toggles it between **Concealed** (neon hatched stripes) and **Revealed** (faint dashed boundary outline).

### 5.2 Implementation Mechanics & Data Structures
- **Golden Invariant #6**: Masks persist in document state (`doc.objects`) across save, load, and export.
- **Concealment State**: Controlled by `o.concealed !== false` (defaults to concealed).
- **Hatched Pattern**: Computed in `render.js` using diagonal stripes ($45^\circ$) with spacing calibrated to stroke width.
- **Hit-Testability of Revealed Covers**: When revealed, the mask does not disappear from the spatial index; it draws a subtle dashed boundary outline and remains 100% hittable so users can tap it to re-conceal.
- **Child Annotation Linking**: Any notes or arrows created over a cover inherit `o.parentCoverId` and follow the cover's visibility.

### 5.3 Primary Code Files & Key Locations
- [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js):
  - `drawStudyTape()` and diagonal neon hatching shader (Lines 1205–1330)
- [`src/js/core/hit.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/hit.js):
  - Polygon and bounding box hit-testing for revealed/concealed covers (Lines 80–125)
- [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js):
  - Direct pointer tap event listener toggling `o.concealed = !o.concealed` (Lines 410–445)
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js):
  - Object schema validation preserving `subtype: 'tape'` and `concealed` flag (Lines 210–250)

### 5.4 Interacting Files & Blast Radius
- [`src/js/ui/study-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/study-runner.js): Iterates active study covers during review sessions.
- [`src/js/anki-export.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/anki-export.js): Generates Image Occlusion cards from study covers.
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js): Canvas dirty invalidation on toggle.

### 5.5 Specific Failure Modes & Line-Level Fragility
1. **Revealed Cover Unhittable**: If `hit.js` skips objects where `concealed === false`, users can reveal a cover once but can never re-conceal it.
   - *Invariant #6 Violation*: [`src/js/core/hit.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/hit.js#L92).
2. **Pattern Scale Distortion**: When zooming the canvas ($0.1\text{x}$ to $5.0\text{x}$), if the hatching line spacing is defined in screen pixels instead of world coordinates, tape stripes become solid blocks of color or disappear.
3. **Child Annotation Orphan Leak**: If a study cover is deleted, child annotations linked by `parentCoverId` remain hidden permanently if their visibility state is not restored.

### 5.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Enforce Invariant #6 Hit-Testing & Orphan Cleanup
// Location: src/js/core/hit.js around Line 95
export function hitTestCoverObject(obj, worldX, worldY, hitSlop = 6) {
  if (obj.type !== 'cover' && obj.subtype !== 'tape') return false;
  // Invariant #6: Hittable in BOTH concealed and revealed states
  if (obj.subtype === 'tape' && Array.isArray(obj.points)) {
    return hitTestPolyline(obj.points, worldX, worldY, (obj.width || 24) * 0.5 + hitSlop);
  }
  return pointInBox(worldX, worldY, boundsOf(obj), hitSlop);
}
```

---

## 6. Execution Verification Commands

After implementing hardening in this tier, execute these commands to guarantee zero regressions:

```powershell
# 1. Verify all new features and P0 invariants pass:
node scripts/smoke.js --new-features

# 2. Strict translation verification (must remain 2,238 / 2,238 keys):
node scripts/i18n-check.js
```
