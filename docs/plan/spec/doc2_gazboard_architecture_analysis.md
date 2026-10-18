# Document 2: GazBoard Architectural & Codebase Analysis

> **Document status:** Historical architecture analysis. Validate all file and behavior claims against current source; the current version map is [`../../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) and the v4.8.1 source map is [`../../BASE_FEATURE_CATALOG-4.8.1.md`](../../BASE_FEATURE_CATALOG-4.8.1.md).

This document provides a deep architectural analysis of [fahim9778/GazBoard](https://github.com/fahim9778/GazBoard). It breaks down how GazBoard is engineered today—its languages, rendering pipeline, document store, interaction model, and storage subsystem—and establishes a direct technical mapping between GazBoard's current code components and the target feature set defined in Document 1.

---

## 1. System Overview & Technology Stack

GazBoard is architected as a lightweight, zero-cloud desktop application running on **Electron (Chromium + Node.js)** on Windows. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                           │
│  main.js | storage-location.js | msoffice.js / soffice.js | sync/      │
│  • Window management, atomic file I/O, asset storage, LAN crypto sync   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC Bridge (preload.js)
┌───────────────────────────────────▼────────────────────────────────────┐
│                      RENDERER PROCESS (Canvas 2D)                      │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ UI & Controls (src/ui) │  │ Canvas & Camera View (surface.js)    │  │
│  │ • toolbar.js           │  │ • 60-120 FPS RAF draw loop           │  │
│  │ • palettes.js          │  │ • Frozen canvas offscreen cache      │  │
│  │ • timer.js (floating)  │  │ • Viewport camera (Camera.js)        │  │
│  └───────────┬────────────┘  └──────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼────────────┐  ┌──────────────────▼───────────────────┐  │
│  │ Interaction (tools.js) │  │ 2D Render Engine (render.js, ink.js) │  │
│  │ • PointerEvents        │  │ • Quadratic midpoint curves          │  │
│  │ • Coalesced pen events │  │ • Pressure run quantisation          │  │
│  │ • Windows ink trails   │  │ • Rich text, math, shapes, images    │  │
│  └───────────┬────────────┘  └──────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼──────────────────────────────────▼───────────────────┐  │
│  │              Transaction Document Store (store.js)               │  │
│  │ • Op log ({ t: 'add'|'del'|'set'|'order'|'doc' }), Undo/Redo     │  │
│  │ • doc.objects (dict by id), doc.order (z-order), doc.pages       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technical Pillars:
1. **Language**: Pure modern JavaScript (ES6+ Modules, `async/await`, `WeakMap`, `Path2D`). No TypeScript compilation step, no JSX, and zero runtime UI frameworks (no React, Vue, or Angular).
2. **Rendering Engine**: Native HTML5 Canvas 2D (`CanvasRenderingContext2D`). It avoids heavy canvas libraries (such as Fabric.js or Pixi.js), implementing its own custom scene graph, camera transformation matrix, and culling algorithms.
3. **Input Pipeline**: Native W3C `PointerEvent` API leveraging Windows stylus hardware features (`e.pointerType === 'pen'`, `e.pressure`, and `e.getCoalescedEvents()`).
4. **Latency Optimization**: Direct integration with Windows 10/11's **DirectX Delegated Ink Trails** ([inktrail.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/inktrail.js)) via `navigator.ink.requestPresenter`.

---

## 2. Deep Dive: GazBoard Subsystems

### 2.1 The Document Model & Op Log ([store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js))
GazBoard’s central state is managed by the `Store` class:
* **Document Schema (`doc`)**:
  ```javascript
  {
    id: "b_605ba...",
    name: "Lecture Notes",
    schema: 2,
    created: 1729000000000,
    modified: 1729000000000,
    background: { color: "#ffffff", pattern: "grid", patternColor: "#c8c6c4" },
    pages: [],                    // [] = infinite canvas; [{w, h}, ...] = multi-sheet pad
    camera: { x: 0, y: 0, z: 1 }, // Viewport translation and zoom factor
    objects: {                    // Keyed dictionary of all items by ID
      "s_101": { id: "s_101", type: "stroke", tool: "pen", points: [...], ... },
      "n_102": { id: "n_102", type: "note", text: "...", ... }
    },
    order: ["s_101", "n_102"]     // Strict z-order array (back to front)
  }
  ```
* **Op-Based Transaction System**:
  * Every mutation goes through an operation `{ t: 'add' | 'del' | 'set' | 'order' | 'doc' }`.
  * `commit(label, ops)` computes inverses, pushes transactions to `undoStack`, logs ops to `this.log`, and triggers subscriptions (`this.emit('change')`).
  * `this.rev`: An integer revision counter bumped on every mutation. The renderer uses `rev` to instantly detect whether cached frames are valid without deep comparisons.

### 2.2 The Canvas & View Subsystem ([surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js))
* **High-DPI Management**: Dynamically scales backing canvas buffer by `window.devicePixelRatio` (capped at 2.5×) to guarantee crisp text and ink on 4K/Retina displays.
* **Camera Transform ([camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js))**: Translates world coordinates $(X_w, Y_w)$ to screen pixels $(X_s, Y_s)$ via $X_s = X_w \cdot z + x$ and $Y_s = Y_w \cdot z + y$.
* **The "Frozen Canvas" Cache Optimization**:
  * Redrawing thousands of ink strokes every frame would cause lag when writing.
  * `Surface` creates an offscreen canvas (`this._ink`). When objects are committed, they are baked into the frozen canvas.
  * While the user is drawing, only the active in-progress stroke (`this.wet`) is rendered on top of the frozen bitmap.
  * Moving the camera or modifying objects invalidates the freeze cache (`invalidate()` / `repaintAll()`).
* **Overlay Layer**:
  * `this.overlays`: Array of callbacks `fn(ctx, surface)` drawn in screen space after all board elements are painted.
  * This is where temporary UI visual elements (selection handles, laser pointer trails, group outlines) are drawn without polluting board data.

### 2.3 Ink Geometry & Smoothing ([ink.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/ink.js))
* **Single Pathdown Midpoint Curves**:
  * Instead of offsetting an outline into a complex polygon, GazBoard draws strokes down a single centreline using `Path2D.quadraticCurveTo` passing through point midpoints:
    ```javascript
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      path.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ```
  * *Why this matters*: Midpoint quadratic curves stay strictly within their control triangle, eliminating loops, barbs, or spikes. A single `ctx.stroke()` composites highlighters once, eliminating overlap darkening.
* **Pressure Variation via Quantised Runs**:
  * For pressure-sensitive pens, strokes are segmented into discrete runs (`pressureRuns`) of similar widths (5 distinct quantised steps). Each run overlaps by one point with round caps to create a smooth, continuous taper without performance degradation.
  * Results are cached in `WeakMap` objects keyed to the points array.

### 2.4 Rendering Routines ([render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js))
* `drawObject(ctx, o)`: Central dispatch table handling `'stroke'`, `'shape'`, `'note'`, `'text'`, `'image'`, `'table'`, and `'connector'`.
* `drawStroke(ctx, o)`: Evaluates pressure runs, applies styles (solid color, rainbow, galaxy effect, highlighter blend mode `'multiply'`), and executes `ctx.stroke()`.
* Spatial bounds: `boundsOf(o)` and `worldBounds(o)` compute tight axis-aligned bounding boxes used for viewport culling and hit-testing.

### 2.5 Gesture Handling & Tool Coordination ([tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js))
* **Coalesced Stylus Points**: On 240Hz+ digitizers (Surface Pen, Wacom), Chromium sends multiple hardware samples per pointer event. `tools.js:719` consumes `e.getCoalescedEvents()` to record every micro-movement without skipping points.
* **Separation of Stylus and Mouse**: The app automatically detects when a stylus touches the screen. From then on, stylus input inks, while mouse input pans and selects.
* **Stroke Lifecycle**:
  1. `startStroke(e, wp, tool)`: Allocates stroke object with unique ID `uid('s')`, initializes empty `points` array, sets `this.surface.wet = obj`.
  2. `pointermove`: Gathers points, checks minimum distance (~1.2px), updates bounding box, calls `sendInkTrail()` for Windows hardware ink trail.
  3. `finishStroke(a)`: Rounds point coordinates to 2 decimal places, clears `surface.wet`, commits stroke to `Store` via `this.store.add(obj, 'draw')`, and calls `surface.extendFreeze(obj)` so the rest of the board doesn't re-render.
* **Spatial Hit Testing ([hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js))**: Fast point-to-box and point-to-polyline distance calculations determining which object sits beneath a stylus or mouse click.

### 2.6 Storage & Asset Pipeline ([storage-location.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/storage-location.js), [preload.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/preload.js))
* **Atomic JSON Storage**: Boards are written to disk using a temporary file write followed by an atomic rename to prevent corruption during unexpected shutdowns.
* **Asset Deduplication (`assets/`)**: Bitmaps (images, PDF page renders) are SHA-256 hashed and stored in a shared `assets/<hash>` directory. The board document only references `'asset:' + hash`.
* **Export Pipeline ([export.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js), [board-export.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/board-export.js))**: Supports PNG, SVG, PDF (via hidden headless Chromium window), and `.gazboard` ZIP bundles via `JSZip`.

---

## 3. Component Mapping: Relating Features to GazBoard Codebase

The following matrix maps every feature defined in Document 1 directly to GazBoard's architectural components, identifying the exact files to modify and the existing architectural mechanisms to utilize:

| Feature from Document 1 | GazBoard Files Involved | Existing Architectural Hooks & Integration Points |
| :--- | :--- | :--- |
| **F-101 / F-102: Audio Recording & Pause/Resume** | `src/js/core/audio.js` *(new)*, [app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) | Standard Chromium `MediaRecorder` API; lifecycle managed by `App`. |
| **F-103: Stroke-to-Audio Timestamping** | [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) (lines 1535–1559, 1696–1745) | `startStroke` sets `audioId` and `t0`; `finishStroke` sets `t1`; pointer samples collect `p.t`. 100% backward-compatible with [store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js). |
| **F-104: Pre-Existing Drawing Immunity** | [render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js), [store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js) | Objects without an `audioId` bypass the replay filter and render normally. |
| **F-201 / F-202: Note Replay & Pending Ghosting** | [render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js) (`drawStroke`), [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) | Compare `audio.currentTime` with `o.t0`. Future strokes render with `ctx.globalAlpha = 0.12`. |
| **F-203: Progressive Sub-Stroke Animation** | [ink.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/ink.js) (`centrelinePath`), [render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js) | Slice `o.points` where `p.t <= currentTime` and draw partial `Path2D`. Render glowing tip. |
| **F-204: Multi-Speed Playback** | `src/js/ui/audioplayer.js` *(new)* | HTMLAudioElement `.playbackRate = speed`; the audio clock automatically drives the canvas. |
| **F-301: Click-to-Seek ("Audio Jump")** | [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) (`pointerdown`), [hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js) | Intercept click with `hitTest(wp)`. Read `o.t0`, seek audio, and trigger pulse in `surface.overlays`. |
| **F-302 / F-303: Auto-Follow Camera & Go to Stroke** | [camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js), [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) | Use `camera.panTo(bounds)` with lerp easing on new stroke reveals. Disengage on user pan. |
| **F-401 / F-402: Scrubber Density Ticks & Bookmarks** | `src/js/ui/audioplayer.js` *(new)* | Read all strokes with `audioId`, sort by `t0`, plot density ticks on canvas strip. Save bookmarks in `doc.audioTracks`. |
| **F-403: Subtitle Overlay (.srt / .vtt)** | [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) (`overlays`) | Register overlay renderer `drawSubtitles(ctx, surface)` displaying active cue in screen space. |
| **F-501 / F-502: Preview/Edit Modes & Permissions** | [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js), [app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) | In Preview mode, `tools.js` suppresses inking and handles clicks as seeks. In Edit mode, guard `add`, `move`, `erase`. |
| **F-601: Multi-Board Sessions** | [app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) (`loadBoard`), `store.js` | Session records segments `{ boardId, t0, t1 }`. When audio time crosses boundary, call `app.loadBoard()`. |
| **F-602: Keep vs. Delete Strokes Dialog** | [store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js), [app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) | Batch transaction: either `store.updateMany` stripping `audioId`, or `store.remove` all matching IDs. |
| **F-701: Study Tape / Masking Tool** | [render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js), [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) | New object type `'tape'` `{ id, type: 'tape', x, y, w, h, color, revealed }`. Click toggles `revealed`. |
| **F-702: PDF Excerpt Hyperlink Cards** | [render.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js), [boardrefs.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/boardrefs.js) | New object type `'excerpt'` or card with link badge; clicking badge calls `camera.panTo(sourceBox)`. |
| **F-703: Gesture Scratch-Out Eraser** | [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) (`finishStroke`), [hit.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js) | Analyze stroke bounding box aspect ratio and reversal count ($N \ge 4$ sharp turns). Erase intersected objects. |
| **F-704: Side-by-Side Split Study Workspace** | [pages.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/pages.js), [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) | Dual-sheet preset in `pages.js` (Reference sheet + Notebook sheet placed horizontally). |
| **F-705: Recorded Laser Pointer Trail** | [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) (`this.laser`) | Throttled sampling (~20 Hz) into session track; replayed on `surface.laser` during playback. |
| **F-801: Animated Video Export** | [export.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js), `main.js` | Offscreen canvas capturing frames via `canvas.captureStream(30)` combined with audio track into `MediaRecorder`. |

---

## 4. Key Architectural Strengths & Seams in GazBoard

1. **Clean Separation of Concerns**:
   * Rendering logic is completely decoupled from gesture tracking and file persistence. Adding visual replay effects never requires modifying stored object data.
2. **The Overlay Seam (`surface.overlays`)**:
   * GazBoard already has a built-in mechanism for drawing transient, screen-space UI elements on top of the canvas (used by laser trails, selection outlines, and drag hints). We can leverage this seam for subtitle banners, location pulse rings, and pending stroke highlights without touching document state.
3. **Content-Addressable Asset Store**:
   * Audio recordings (typically 5–30 MB per lecture) can be stored directly through GazBoard’s existing asset pipeline (`board.assets.put(dataUrl)`), keeping board JSON files fast and compact.
4. **Native Windows Audio Capabilities in Electron**:
   * Because GazBoard on Windows runs Chromium with local system privileges, microphone recording, audio decoding, and Web Audio pipelines are accessible with maximum performance and zero sandboxing friction.
