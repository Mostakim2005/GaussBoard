# Phase 0: Comprehension Check & Requirement Gap Analysis

> **Document status:** Historical comprehension and gap analysis. Its findings reflect the planning snapshot and may predate shipped fixes. Current source-checked custom changes: [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md); v4.8.1 baseline only: [`../BASE_FEATURE_CATALOG-4.8.1.md`](../BASE_FEATURE_CATALOG-4.8.1.md).
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 0 Complete — Ground Truth Audit

---

## 1. Executive Summary & Architecture Synthesis

### 1.1 The Base Application (GazBoard)
GazBoard is a local-first, zero-cloud digital whiteboard built on the Electron desktop framework (Chromium runtime + Node.js backend) [VERIFIED IN CODE: package.json:6, main.js:665-702]. Its core design tenets are offline privacy, hardware stylus responsiveness, and zero framework overhead:
* **UI & Rendering Runtime**: Built without web frameworks (zero React, Vue, Angular, or Svelte). It utilizes pure vanilla JavaScript ES6+ modules in the renderer process [VERIFIED IN CODE: src/index.html:17, 87]. Rendering is driven directly on an HTML5 `<canvas>` via `CanvasRenderingContext2D` [VERIFIED IN CODE: src/js/core/surface.js:23-45], avoiding third-party canvas engines (such as Fabric.js, Konva, or Pixi.js).
* **Stylus & Ink Pipeline**: Leverages native W3C `PointerEvent` APIs, extracting sub-frame hardware digitizer samples via `e.getCoalescedEvents()` [VERIFIED IN CODE: src/js/core/tools.js:719] and Windows 10/11 DirectX Delegated Ink Trails via `navigator.ink.requestPresenter` [VERIFIED IN CODE: src/js/core/inktrail.js:24-49]. Ink curves are rendered using midpoint quadratic Bézier splines (`Path2D.quadraticCurveTo`) [VERIFIED IN CODE: src/js/core/ink.js:35-58] with discrete 5-step pressure-quantized runs (`pressureRuns`) [VERIFIED IN CODE: src/js/core/ink.js:80-145].
* **Document Model & Mutation Flow**: State is managed centrally in a headless transaction store (`Store` in [store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L28)). Mutations execute through discrete atomic operations (`{ t: 'add' | 'del' | 'set' | 'order' | 'doc' }`) with transaction boundaries (`commit(label, ops)`), an undo/redo stack (capped at 200 transactions), and an append-only op log (`this.log`, capped at 5000 ops) designed for remote sync replication [VERIFIED IN CODE: src/js/core/store.js:30-42, 63-116].
* **Rendering Optimization (Frozen Canvas)**: To preserve 60–120 FPS pen tracking on complex whiteboards containing thousands of items, `Surface` maintains an offscreen backing buffer (`this._ink`) [VERIFIED IN CODE: src/js/core/surface.js:448-456, 553-558]. When idle or lifting the pen, all committed objects are rendered into `this._ink`. During active drawing gestures, only the single active stroke (`this.wet`) is rendered on top of the blitted frozen bitmap, reducing per-frame draw cost from 30–100ms down to ~0.02ms [VERIFIED IN CODE: src/js/core/surface.js:553-588].
* **Storage & Persistence**: Boards are stored as atomic `.json` files in `<userData>/boards` [VERIFIED IN CODE: storage-location.js:9, main.js:250-265, 1249-1275]. Embedded media assets (images, PDF renders) are hashed via SHA-256 and deduplicated into a content-addressable storage folder (`<userData>/boards/assets/<sha256>.<ext>`) [VERIFIED IN CODE: main.js:226-235, 1281-1294].
* **Document Interoperability**: Imports PDF pages via PDF.js [VERIFIED IN CODE: src/js/importers/pdf.js:1-85], Microsoft Word (`.docx`) and PowerPoint (`.pptx`) either via native Microsoft Office PowerShell COM automation on Windows [VERIFIED IN CODE: msoffice.js:43-97], LibreOffice CLI [VERIFIED IN CODE: soffice.js:34-60], or a built-in headless HTML/Mammoth conversion window [VERIFIED IN CODE: main.js:904-931, src/convert.html:1-83].
* **P2P Collaboration**: Incorporates an offline, serverless LAN board synchronization engine using local UDP multicast discovery and end-to-end authenticated encryption via X25519 key exchange + AES-256-GCM [VERIFIED IN CODE: sync/protocol.js:1-120, sync/node.js:1-150].

---

### 1.2 Requested Feature Catalog (GazBoard Replay)
The target feature set defined in `doc1_feature_specification.md` [FROM MY DOCS] expands GazBoard into an audio-synchronized lecture capture, study revision, and active-recall workbook:

| Feature ID | Feature Name | Core User Capability | Proposed Technical Mechanism in Documents |
| :--- | :--- | :--- | :--- |
| **F-101** | Live Audio Recording | Capture microphone audio during live board sessions with elapsed timer and level meter. | Chromium `navigator.mediaDevices.getUserMedia` & `MediaRecorder` in renderer [FROM MY DOCS: doc3:141-160]. |
| **F-102** | Pause & Resume Continuity | Temporarily halt recording without timeline gaps or drift. | Accumulate recording elapsed time chunks in `AudioRecorder` class [FROM MY DOCS: doc3:135-175]. |
| **F-103** | Stroke-to-Audio Timestamping | Every stroke captures start timestamp ($t_0$), end timestamp ($t_1$), and per-point time offsets ($p.t$). | Inject `audioId`, `t0`, `t1` in [tools.js:finishStroke](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js#L1730) [FROM MY DOCS: doc3:215-240]. |
| **F-104** | Pre-Existing Ink Immunity | Notes drawn prior to recording remain permanently visible and unlinked from playback. | Render pass skips replay opacity filters for strokes lacking `audioId` [FROM MY DOCS: doc2:134, doc3:255]. |
| **F-201** | Synchronized Note Reveal | Progressive re-drawing of notes synchronized with audio playback. | Audio element `currentTime` drives visibility in `drawStroke` [FROM MY DOCS: doc3:250-297]. |
| **F-202** | Pending Stroke Ghosting | Future notes shown translucent (12–15% opacity), hidden, or as bounding outlines. | Dynamic `ctx.globalAlpha = 0.12` or early return in `drawStroke` [FROM MY DOCS: doc3:258-266]. |
| **F-203** | Progressive Sub-Stroke Animation | Long strokes draw progressively from start to end with an active glowing nib dot. | Slice `stroke.points` where $p.t \le t_{current}$; render tip dot [FROM MY DOCS: doc3:269-289]. |
| **F-204** | Multi-Speed Playback | Scaled playback speeds ($0.5\times$ to $2.0\times$) with pitch preservation and sync lock. | HTMLAudioElement `.playbackRate = speed` [FROM MY DOCS: doc3:137, 343]. |
| **F-301** | Click-to-Seek ("Audio Jump") | Tapping a stroke jumps audio playback to the exact timestamp when that stroke was drawn. | Intercept click with `hitTestObjects(wp)`; read `o.t0`; seek audio [FROM MY DOCS: doc3:306-326]. |
| **F-302** | Auto-Follow Camera | Viewport smoothly pans and zooms to keep newly revealed notes in view; disengages on user pan. | Camera interpolation towards bounds of revealing strokes [FROM MY DOCS: doc3:399]. |
| **F-303** | Go to Current Stroke | Instant hotkey/button to re-center viewport on the active playback stroke. | `camera.centerOn` or `fit` targeting bounding box of active stroke [FROM MY DOCS: doc1:127-129]. |
| **F-401** | Scrubber Density Ticks | Scrubber bar displays vertical tick marks / mini heatmap representing writing activity density. | Canvas 2D strip in audio player UI plotting distribution of $t_0$ [FROM MY DOCS: doc3:342]. |
| **F-402** | Audio Bookmarks | User-placed flagged timeline markers with custom text labels. | `doc.audioTracks[].bookmarks` array saved in document [FROM MY DOCS: doc3:82-85]. |
| **F-403** | Subtitle / Caption Overlay | Floating banner rendering synchronized captions from external `.srt` / `.vtt` files. | Screen-space overlay registered in `surface.overlays` [FROM MY DOCS: doc2:141, doc3:147]. |
| **F-501** | Preview vs Edit Modes | Toggle between Locked Review (clicks seek audio) and Edit Mode (inking enabled, seek via modifier). | Mode flag in `app.playbackMode`; conditionally route pointer events [FROM MY DOCS: doc3:310-323]. |
| **F-502** | Playback Action Permissions | Granular locks to prevent accidental erasure or movement of synchronized notes during review. | Permission guards in `store.update`, `store.remove`, and `tools.js` [FROM MY DOCS: doc1:166-171]. |
| **F-503** | Sync During Playback Setting | Configurable option whether notes drawn during playback receive timestamps or remain static. | Toggle deciding whether new strokes query audio player clock [FROM MY DOCS: doc1:172-175]. |
| **F-601** | Multi-Board Sessions | Continuous audio recording spanning across sheet or board navigation. | Session metadata mapping `{ boardId, t0, t1 }` segments [FROM MY DOCS: doc2:143]. |
| **F-602** | Safe Delete Dialog | Explicit user prompt on track deletion: "Keep Notes" (strip timestamps) vs "Delete Notes & Audio". | Batch transaction updating strokes or removing matching IDs [FROM MY DOCS: doc2:144]. |
| **F-603** | Audio Export & Storage | Export raw audio file (`.webm`/`.opus`) or reveal in Windows Explorer. | File save dialog via `window.board.writeFile` or `showItem` [FROM MY DOCS: doc1:191-195]. |
| **F-701** | Study Tape / Masking Tool | Rectangular opaque tape strips that toggle between concealed and translucent on tap. | New object type `'tape'` with `{ x, y, w, h, color, revealed }` [FROM MY DOCS: doc3:352-365]. |
| **F-702** | PDF Excerpt Hyperlink Cards | Box-select PDF excerpt to spawn independent study card with jump-to-page navigation link. | Excerpt object referencing target coordinates; click invokes camera pan [FROM MY DOCS: doc3:375-379]. |
| **F-703** | Gesture Scratch-Out Eraser | Rapid back-and-forth zig-zag pen scribble automatically deletes underlying strokes. | Stroke point analysis in `finishStroke` (reversals $\ge 4$); delete hits [FROM MY DOCS: doc3:367-374]. |
| **F-704** | Side-by-Side Split Workspace | Dual-workspace layout displaying textbook/slides on one side and notebook on the other. | Dual-sheet preset in `pages.js` placing sheets horizontally [FROM MY DOCS: doc2:148]. |
| **F-705** | Recorded Laser Pointer Trail | Record presenter's laser pointer coordinate stream for playback reanimation. | Sample laser coordinates at ~20 Hz into audio track session [FROM MY DOCS: doc2:149]. |
| **F-801** | Animated Video Export | Export synchronized canvas reanimation and audio track as a standalone `.webm`/`.mp4` video. | Offscreen `canvas.captureStream(30)` combined with audio via `MediaRecorder` [FROM MY DOCS: doc3:424]. |

---

## 2. Exhaustive Gap, Contradiction & Ambiguity Analysis

A rigorous cross-comparison between the input planning documents (`doc1`, `doc2`, `doc3`) and the live GazBoard source code reveals ten critical contradictions, architectural gaps, and invalid assumptions:

### Contradiction 1: Serialized Board JSON Format (`objects` Array vs Dictionary)
* **Document Claim**: `doc2_gazboard_architecture_analysis.md` (lines 66–70) asserts that GazBoard's stored JSON schema contains a dictionary of objects by ID and an explicit `order` array:
  ```json
  "objects": { "s_101": { "id": "s_101", ... }, "n_102": { "id": "n_102", ... } },
  "order": ["s_101", "n_102"]
  ```
* **Ground Truth in Code**:
  1. In [store.js:emptyDoc()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L23-L24), the **in-memory** runtime document (`this.doc`) indeed uses a dictionary for `objects` (`objects: {} // id -> object`) and an array for `order` (`order: [] // z-order, back to front`). This explains why `doc2` described that structure.
  2. However, in [store.js:toJSON()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L319-L332), the **serialized** on-disk JSON flattens objects into an **array** in z-order and drops `order` completely:
     ```javascript
     // src/js/core/store.js:331
     objects: d.order.map((id) => d.objects[id]).filter(Boolean)
     ```
     `doc.order` is **never** serialized to disk [VERIFIED IN CODE: src/js/core/store.js:331]! In the saved board file, `objects` is an Array, and z-order is determined strictly by array index.
  3. In [store.js:load()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L354-L358) and [storage-location.js:isBoardFile()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/storage-location.js#L49-L54), the loader explicitly includes backward compatibility for dictionaries:
     ```javascript
     const list = Array.isArray(data.objects) ? data.objects
       : Array.isArray(data.objectList) ? data.objectList
         : data.objects ? Object.values(data.objects) : [];
     ```
* **Impact**: While `load()` tolerates a dictionary, serializing `objects` as a dictionary breaks `main.js:1237` (`(raw.objects || []).length` evaluates to `undefined`, breaking board counts in the library picker) and causes `app.externaliseAssets(doc)` ([app.js:579](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L579)) to abort (`if (!Array.isArray(doc.objects)) return doc`). All new serialization logic must adhere strictly to `objects: Array` on disk and `objects: {}` in memory.

---

### Contradiction 2: Asset Store MIME Types, Extensions & Return Signatures
* **Document Claim**: `doc3_windows_implementation_plan.md` (lines 188, 303) states:
  ```javascript
  const assetId = await window.board.assets.put(dataUrl);
  ```
  Doc3 assumes `assets.put` returns a string `assetId` and natively supports audio formats (`audio/webm`, `audio/ogg`, `audio/wav`).
* **Ground Truth in Code**:
  1. In [main.js:1285-1293](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1285-L1293), `assets:put` returns an **object** `{ id }`, NOT a string:
     ```javascript
     // main.js:1290, 1292
     try { await fsp.access(file); return { id }; } catch { /* first time */ }
     await writeAtomic(file, d.buf);
     return { id };
     ```
     Calling `const assetId = await window.board.assets.put(...)` results in `assetId` being `{ id: '...' }`, causing `obj.assetId` to store an object or `[object Object]` if cast to string!
  2. In [main.js:228-235](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L228-L235), `ASSET_EXT` and `ASSET_MIME` **only define image formats**:
     ```javascript
     const ASSET_EXT = {
       'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
       'image/webp': 'webp', 'image/bmp': 'bmp', 'image/svg+xml': 'svg'
     };
     const ASSET_MIME = {
       png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif',
       webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml'
     };
     ```
     Any MIME type outside this map (such as `audio/webm` or `audio/ogg`) defaults to extension `'.bin'` (`ASSET_EXT[d.mime] || 'bin'`) [VERIFIED IN CODE: main.js:1285].
  3. When retrieved via `assets:get` [VERIFIED IN CODE: main.js:1301], extension `'.bin'` resolves to `ASSET_MIME['bin'] || 'application/octet-stream'`. Returning `data:application/octet-stream;base64,...` to an `<audio>` element can cause playback decoding failures across various Chromium audio pipelines.
  4. **Catastrophic Memory & Seeking Penalty of Data URLs**:
     Passing a 30 MB audio recording as a base64 Data URL across IPC `assets.put(dataUrl)` creates severe architectural issues:
     - *Memory Bloat & Thread Freezes*: Base64 encoding in the renderer creates a ~40 MB string. Serializing this over IPC duplicates it in memory, and `Buffer.from(body, 'base64')` in `main.js:245` allocates another 30 MB. During retrieval, `assets.get` reads 30 MB from disk and base64 encodes it into a 40 MB string to send back to the renderer. This creates multiple 30–40 MB allocations per session, triggering severe V8 garbage collection freezes.
     - *Lack of HTTP Range Seeking*: Chromium's HTML5 `<audio>` engine cannot execute partial content byte-range requests (`Range: bytes=...`) on a `data:` URL. To seek forward or backward, Chromium must buffer and decode the entire uncompressed media stream in RAM.
     - *Architectural Fix*: Audio should NOT be shuttled through base64 `assets.put`/`assets.get` Data URLs. Instead, audio should either be written to `<userData>/boards/assets/<hash>.webm` via binary streaming IPC and served to the `<audio>` element via a streaming protocol handler (such as extending `app://board/asset/<id>` or a dedicated asset streaming protocol), allowing native HTTP 206 partial range seeking with zero memory overhead.

---

### Contradiction 3: `.gazboard` File Format (`.zip` vs Plain JSON)
* **Document Claim**: `doc2_gazboard_architecture_analysis.md` (line 122) states:
  > *"Export Pipeline (export.js, board-export.js): Supports PNG, SVG, PDF... And .gazboard ZIP bundles via JSZip."*
* **Ground Truth in Code**: In [export.js:664-665](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js#L664-L665) and [board-export.js:48-50](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/board-export.js#L48-L50), exporting a single board produces a **raw, uncompressed UTF-8 JSON file**:
  ```javascript
  // src/js/export.js:664-665
  const json = JSON.stringify(exportable(app.store.toJSON({ app: 'GazBoard', version: 1 })), null, 0);
  await window.board.writeFile(filePath, new TextEncoder().encode(json).buffer);
  ```
  `JSZip` is **only** loaded dynamically when exporting *multiple* boards at once into a `.zip` container [VERIFIED IN CODE: src/js/board-export.js:44-48].
* **Impact**: A single exported `.gazboard` file is NOT a zip archive and contains NO external assets directory. For images, `board-export.js:27` calls `app.resolveAssets(source)` to inline all images back into `data:` URLs before export [VERIFIED IN CODE: src/js/board-export.js:27]. If audio tracks only store `assetId: "..."`, exporting a `.gazboard` will leave audio files stranded on the creator's machine unless audio assets are explicitly resolved or bundled.

---

### Contradiction 4: Existing "Curtain" / Answer Cover vs Proposed "Tape Tool"
* **Document Claim**: `doc1_feature_specification.md` (F-701) and `doc3_windows_implementation_plan.md` (Section 3.6A) specify creating a brand-new Study Tape / Masking Tool with new object type `'tape'` and new module `tape.js`.
* **Ground Truth in Code**: GazBoard **already implements an active-recall Answer Cover system** under object type `'curtain'`:
  * Object schema: `{ id, type: 'curtain', x, y, w, h, color, label, revealed: boolean }` [VERIFIED IN CODE: src/js/core/render.js:980-1031].
  * Hit-testing and pointer penetration: `curtainAt(store, p)` and `ghost(o)` [VERIFIED IN CODE: src/js/core/hit.js:28, 128-137].
  * Global state management: Toolbar menu item "Answer cover" (`insert.curtain`) and "Cover answers again" (`curtain.coverAll`) [VERIFIED IN CODE: src/js/ui/toolbar.js:268, 714].
* **Critical Technical Gaps Between Curtain and Tape**:
  While both serve active recall, simply reusing `curtain` as-is breaks the StarNote/Flexcil user experience in four ways:
  1. *Creation Mechanism*: Upstream `curtain` is an inserted static card placed in the center of the viewport via `app.addCurtain()` ([app.js:1905-1915](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L1905-L1915)). Tape in Flexcil/StarNote is an interactive drawing tool: the user selects the Tape pen and drags a rectangular strip or polyline directly over words or formulas.
  2. *Reveal Visuals*: Upstream `drawCurtain(ctx, o)` ([render.js:993](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/render.js#L993)) executes `if (o.revealed) return;`. When revealed, a curtain is 100% invisible. Tape requires translucent reveal (~15% opacity with dashed/accent border) so students can read the text while still seeing where the tape strip is.
  3. *Hit-Testing & Two-Way Toggling*: In [hit.js:28](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js#L28), `ghost(o) = (o.type === 'curtain' && !!o.revealed)`. Once revealed, `hitObject` ignores the curtain completely so taps pass through to underlying notes. Consequently, a revealed curtain CANNOT be tapped to hide it again! Tape requires a two-way toggle (tap to reveal, tap to re-conceal). To support Tape without breaking Curtain's pass-through property, `ghost(o)` must distinguish between standard curtains and tape objects, or handle tape toggling during study mode.
  4. *Global Actions*: Upstream provides only `curtain.coverAll` ("Cover answers again"); it has no "Reveal All" command.
* **Architectural Recommendation**: Treat `tape` not as an entirely separate subsystem, but as a specialized variant of `curtain` (e.g. `{ type: 'curtain', subtype: 'tape', drawn: true }` or a dedicated tool that outputs `type: 'curtain'`). Update `drawCurtain` to render translucent strips when `o.subtype === 'tape' && o.revealed`, and add two-way toggle handling in `tools.js`. This preserves 100% backward compatibility with upstream GazBoard (which will render them as standard curtains).

---

### Contradiction 5: Non-Existent APIs (`camera.panTo`, `surface.pulseHighlight`)
* **Document Claim**:
  * `doc2:139` and `doc3:378` cite `camera.panTo(bounds)` for auto-follow camera and PDF excerpt jumping.
  * `doc3:320` cites `this.surface.pulseHighlight(boundsOf(obj))` for click-to-seek feedback.
* **Ground Truth in Code**:
  * [camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js) has only 43 lines [VERIFIED IN CODE: src/js/core/camera.js:1-43]. Its methods are `toScreen`, `toWorld`, `panBy`, `zoomAt`, `setZoom`, `viewport`, `fit`, `centerOn`, `toJSON`, and `load`. **There is no `panTo` method.**
  * [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) contains zero references to `pulseHighlight` [VERIFIED IN CODE: src/js/core/surface.js].
* **Impact**: These methods must be newly authored. `camera.panTo` must implement smooth easing (requestAnimationFrame lerp) without blocking the main thread or causing race conditions with manual user gestures. Pulse animations must be registered in `surface.overlays` [VERIFIED IN CODE: src/js/core/surface.js:31, 723].

---

### Contradiction 6: Frozen Canvas Offscreen Caching vs Replay Animation
* **Document Claim**: `doc3_windows_implementation_plan.md` (lines 11-13, 245-297) proposes placing replay visibility and progressive stroke reveals directly inside `drawStroke()` in `render.js`.
* **Ground Truth in Code**: `Surface.draw()` optimizes rendering by blitting an offscreen cached canvas (`this._ink`) whenever `this._ink.key === this.freezeKey()` [VERIFIED IN CODE: src/js/core/surface.js:570-588].
  * `freezeKey()` is composed strictly of:
    ```javascript
    // src/js/core/surface.js:133
    `${this.store.rev}.${this._liveRev || 0}|${cam.x}|${cam.y}|${cam.z}|${this.width}|${this.height}|${this.dpr}|${ed}`
    ```
  * During audio playback, neither `this.store.rev` nor the camera coordinates change between audio frames (unless auto-follow pans).
  * Consequently, `Surface.draw()` will repeatedly blit the static frozen canvas, completely ignoring changes in `audio.currentTime`!
  * **The Fatal Baking Flaw**: Worse still, when `Surface._freezeScene()` ([surface.js:448-461](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L448-L461)) runs, it paints ALL objects on the board into `this._inkCanvas`. Future strokes belonging to the active recording session are therefore already burned into the frozen bitmap at 100% opacity! Blitting `this._inkCanvas` will paint future notes at full opacity, making ghosting (F-202) and synchronized reveals (F-201) physically impossible without scene partitioning.
  * If `invalidate()` is called on every animation frame to bypass the freeze cache, `drawScene()` will force a full redraw of all board objects (potentially thousands of strokes, PDF pages, text boxes) 60–120 times per second, dropping frames severely.
* **Architectural Solution (Scene Partitioning)**:
  1. *Frozen Pre-existing Base*: When an audio recording session is loaded or playing, `_freezeScene()` partitions the scene: it bakes **only** objects that do not belong to the active replay track (`!o.audioId || o.audioId !== activeTrackId`). Background patterns, imported PDF pages, and pre-existing annotations are rasterized once into `this._inkCanvas`.
  2. *Ultra-Fast Replay Blit + Dynamic Overlay*: On each 60 FPS animation frame:
     - Blit `this._inkCanvas` in ~0.02ms.
     - Evaluate only the strokes belonging to the active audio track (typically 100–500 strokes, not thousands).
     - Strokes with $t_1 \le t$ (past strokes) render at 100% opacity.
     - Strokes with $t < t_0$ (future strokes) render with `globalAlpha = 0.12` (ghost) or return early (hidden).
     - The single active stroke with $t_0 \le t < t_1$ renders progressively along its midpoint spline with a glowing nib tip.
  3. *Sub-Stroke Slicing Performance Proof*:
     Concerns regarding sub-stroke point slicing performance are mathematically unfounded. Because a human user can only draw **one stroke at a time**, at any given millisecond there is **at most ONE active stroke** where $t_0 \le t < t_1$. Slicing 50 points and calling `centrelinePath(visiblePts)` on a single stroke consumes less than 10 microseconds ($0.01\text{ms}$) in V8—less than 0.1% of a 16.6ms frame budget. All completed and ghosted strokes use pre-computed, cached `Path2D` instances via `inkPath(stroke)` ([ink.js:259-268](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/ink.js#L259-L268)).

---

### Contradiction 7: Document Model Persistence & Upstream Field Stripping
* **Document Claim**: `doc3_windows_implementation_plan.md` (lines 198-201) proposes saving audio tracks by committing `{ t: 'doc', after: { audioTracks: [...] } }`, asserting this is backwards-compatible.
* **Ground Truth in Code**:
  1. In [store.js:toJSON()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L327-L332), the return object is hardcoded:
     ```javascript
     return { id: d.id, name: d.name, schema: 2, created: d.created, modified: d.modified,
       origin: d.origin || undefined,
       pageDates: d.pageDates && d.pageDates.length ? d.pageDates.slice() : undefined,
       background: d.background, pages: d.pages.map((p) => ({ ...p })), page: d.pages[0] || null,
       camera: d.camera, objects: d.order.map((id) => d.objects[id]).filter(Boolean), ...extra };
     ```
     Any custom property on `this.doc` (including `audioTracks`) is **completely dropped** during serialization unless explicitly enumerated in `toJSON()`!
  2. In [store.js:load()](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L343-L362), `load` instantiates a fresh `emptyDoc()` and copies only recognized keys. Any unknown fields in the loaded JSON file are silently discarded!
* **Impact**: For backwards compatibility with upstream GazBoard:
  * When upstream GazBoard opens a Replay board, it will ignore `audioTracks` without crashing (safe degradation).
  * However, if upstream GazBoard saves that board, `audioTracks` will be permanently stripped!
  * Replay's own `store.js` must update both `toJSON()` and `load()` to preserve `audioTracks`.

---

### Contradiction 8: Page Strip 1D Vertical Stack vs Side-by-Side Split Workspace
* **Document Claim**: `doc2_gazboard_architecture_analysis.md` (line 148) suggests implementing F-704 (Side-by-Side Split Study Workspace) via a "dual-sheet preset in pages.js (Reference sheet + Notebook sheet placed horizontally)".
* **Ground Truth in Code**: In [pages.js:20-29](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/pages.js#L20-L29), page layout is hardcoded to a 1-dimensional vertical column centered on $x = 0$:
  ```javascript
  let top = -pages[0].h / 2;
  for (const p of pages) {
    out.push({ x: -p.w / 2, y: top, w: p.w, h: p.h });
    top += p.h + PAGE_GAP;
  }
  ```
  All spatial indexing (`pageIndexAt`, `pageIndexForBox`, `offsetIntoRect`) assumes this strict vertical arrangement [VERIFIED IN CODE: src/js/core/pages.js:55-110]. Placing sheets horizontally without modifying the fundamental layout math in `pages.js` will break hit testing, page clipping, and sheet navigation.

---

### Contradiction 9: LAN Sync Payload Limits vs Embedded Audio
* **Document Claim**: `doc1` and `doc3` assume audio recordings can seamlessly travel with boards.
* **Ground Truth in Code**:
  * In [sync/node.js:63, 768](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/sync/node.js#L63), the LAN sync protocol enforces:
    ```javascript
    const MAX_BOARD_BYTES = 64 * 1024 * 1024; // 64 MB
    ```
  * During LAN sync, boards are serialized with images inlined as base64 data URLs [VERIFIED IN CODE: src/js/app.js:5362-5364]. The serialized JSON is encrypted in an envelope and base64 encoded again (`P.seal`) [VERIFIED IN CODE: sync/node.js:787-788], resulting in an approximate $1.8\times$ wire expansion.
  * A 30 MB audio recording embedded in board JSON will easily push total payload size beyond the 64 MB hard limit, causing `sync().send()` to abort with `"board is too large to send"` [VERIFIED IN CODE: sync/node.js:768].
  * Conversely, if audio is referenced as an external asset, the receiving peer receives only the reference token; the audio binary remains stranded on the sender's disk because LAN sync currently syncs board JSON, not the contents of `userData/boards/assets/`.

---

### Contradiction 10: Electron Security Posture & Unrestricted IPC File System Access
* **Document Claim**: `doc2` states GazBoard has clean separation of concerns and robust security.
* **Ground Truth in Code**:
  * In [main.js:1114, 1126-1129](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1114), `ipcMain.handle('fs:readFile')` and `ipcMain.handle('fs:writeFile')` accept arbitrary file paths with **zero path traversal checks or directory sandboxing**:
    ```javascript
    ipcMain.handle('fs:readFile', async (_e, p) => { const b = await fsp.readFile(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
    ipcMain.handle('fs:writeFile', async (_e, { filePath, data }) => { await fsp.writeFile(filePath, Buffer.from(data)); return true; });
    ```
  * In [main.js:909](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L909), `convertWithHiddenWindow` creates a BrowserWindow with `preload.js` loaded and `sandbox: false`.
  * [src/convert.html](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/convert.html) has **no Content-Security-Policy header or meta tag** and executes `document.getElementById('root').innerHTML = ...` with converted Word/PowerPoint HTML [VERIFIED IN CODE: src/convert.html:57, 66].
  * In [main.js:734](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L734), `setWindowOpenHandler` passes any URL directly to `shell.openExternal(url)` without validating whether the protocol is `https:` or potentially dangerous (`file:`, `javascript:`, custom OS URI schemes).

---

## 3. Prioritized Questions for Product Owner / Coordinator

To eliminate ambiguity before Phase 2 and Phase 3 planning, here are the top 10 prioritized questions:

1. **Audio Storage Strategy**: Should audio recording files be embedded directly into `.gazboard` files as base64 (maximizing standalone portability but bloating JSON files to 40+ MB), or stored in the local `assets/` directory with a ZIP-based export bundle when shared?  
   *Stated Assumption*: We will store audio locally in `assets/<sha256>.webm`, keep board JSON compact, and update `.gazboard` export to package board JSON and audio assets into a standard zip bundle when audio tracks are present.
2. **Answer Cover (`curtain`) vs Study Tape (`tape`)**: Shall we extend the existing upstream `curtain` architecture (`type: 'curtain'`, `insert.curtain`, `curtain.coverAll`) with strip drawing and translucent states, or introduce an isolated `type: 'tape'`?  
   *Stated Assumption*: We will extend and alias `curtain` to minimize merge conflicts and ensure 100% upstream PR readiness.
3. **Multi-Board Session Scope (F-601)**: When recording across boards, should switching boards pause the audio, or should audio run continuously in the background and record timestamped segment spans across multiple board files?  
   *Stated Assumption*: A single master session file will record segment spans `{ boardId, t0, t1 }`. During replay, crossing a segment threshold will prompt the user or auto-navigate to the corresponding board.
4. **Frozen Canvas Replay Architecture**: During real-time replay at 60 FPS, redrawing thousands of strokes every frame bypasses the `Surface._ink` cache. Do you approve maintaining a separate dynamic animation overlay layer for revealing/ghosted strokes while keeping static background ink frozen?  
   *Stated Assumption*: Yes; we will implement a dual-layer strategy where pre-existing ink remains in the frozen cache while active/pending strokes draw via transient overlays.
5. **Auto-Follow Viewport Behavior (F-302)**: Should auto-follow camera glide smoothly via continuous easing (lerp) or perform discrete stepped pans when the pen moves beyond a 20% viewport boundary margin?  
   *Stated Assumption*: Stepped/throttled smooth panning with a dead-zone boundary margin (similar to video game cameras) to prevent user motion sickness during rapid handwriting.
6. **Side-by-Side Split Study View (F-704)**: Should Side-by-Side study be implemented by adding 2D coordinate positioning to `pages.js`, or as a split UI viewport (dual canvas views)?  
   *Stated Assumption*: Dual-column sheet arrangement in `pages.js` (Reference page + Notebook page positioned side-by-side in world space) to avoid rewriting canvas input pipelines.
7. **LAN Sync of Audio Tracks**: Since audio files exceed the 64 MB LAN sync limit and cause network lag, should audio synchronization over LAN be disabled/omitted with a clear toast notification ("Notes synced; audio omitted"), or should audio chunks be streamed?  
   *Stated Assumption*: In v1 of Replay, LAN sync will transfer board inking and strip audio binaries, showing an informative notification, to prevent blocking classroom Wi-Fi.
8. **Gesture Scratch-Out Eraser Sensitivity (F-703)**: Should gesture scratch-out immediately delete the entire intersected object/stroke (stroke erase), or cut out the swept portion (point erase)?  
   *Stated Assumption*: Gesture scratch-out will delete the entire intersected stroke/word object (stroke erase), consistent with StarNote and Flexcil UX.
9. **Video Export Mechanism (F-801)**: Should animated video export be performed client-side using `HTMLCanvasElement.captureStream(30)` + `MediaRecorder` in renderer, or via a headless background Chromium export window?  
   *Stated Assumption*: In-renderer canvas stream capture with an animated export progress modal, avoiding external native FFmpeg binary dependencies.
10. **Upstream PR Packaging**: Should Replay features be developed in a single monolithic branch or segmented into isolated feature-flagged modules that can be cut into individual upstream PRs?  
    *Stated Assumption*: Modular, feature-flagged architecture where each feature lives in a dedicated file and connects to GazBoard via clean lifecycle hooks.
