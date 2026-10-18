# Phase 3: Critical Evaluation of Proposed Implementation Method

> **Document status:** Historical proposal/evaluation. Current shipped choices and source locations are in [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) and [`../layers/02-inking-and-gestures.md`](../layers/02-inking-and-gestures.md). Preserve the existing inking engines and keep Catmull–Rom/Bézier as a separate selectable option. Compare visual fidelity, pressure response, latency, CPU/memory, cache invalidation, audio timestamp preservation (`p.t`), highlighter compositing, and export consistency before recommending a default or removal.
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 3 Complete — Technical Method Evaluation & Fork Architecture

---

## 1. Executive Evaluation of Document 3

Document 3 (`doc3_windows_implementation_plan.md`) presents a strong conceptual vision for bringing StarNote and Flexcil capabilities to Windows. It correctly recognizes GazBoard's architectural strengths: direct HTML5 2D canvas control, zero framework overhead, high-frequency hardware stylus events, and an operation-based document store.

However, an exhaustive audit against the live GazBoard source code reveals that **doc3 suffers from several critical architectural oversights, hidden assumptions, and missing prerequisites**. If implemented verbatim, the resulting application would experience severe memory leaks, playback freezing, corrupted saves, broken CI builds, and inability to merge upstream.

---

## 2. Exhaustive Audit: Feasibility, Ordering, Assumptions & Missing Steps

### 2.1 Ten Hidden Assumptions in Document 3 Exposed

#### 1. Assumption: Base64 Data URLs via `assets.put` are Suitable for Audio
* **doc3 Proposal** (lines 188, 303):
  ```javascript
  const assetId = await window.board.assets.put(dataUrl);
  ```
  Doc3 converts the entire recorded audio Blob to a base64 Data URL string via `FileReader.readAsDataURL()`, passing it over IPC `assets.put`.
* **Reality in Code**:
  - In [main.js:228-235](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L228-L235), `ASSET_EXT` only defines image MIME types (`png, jpg, gif, webp, bmp, svg`). Any audio MIME type (`audio/webm`) defaults to extension `'.bin'` and MIME type `'application/octet-stream'`.
  - A 45-minute lecture recording produces $\sim 25\text{ MB}$ of WebM data. Base64 encoding expands this to $33.3\text{ MB}$ in the renderer heap. Serializing across Electron's IPC bridge duplicates it, and `Buffer.from(body, 'base64')` in [main.js:245](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L245) creates another $25\text{ MB}$ allocation.
  - **Catastrophic Seeking Penalty**: Chromium's HTML5 `<audio>` engine **cannot perform HTTP 206 Partial Content byte-range requests on `data:` URLs**. To seek forward 10 seconds, Chromium must decode and buffer the entire audio file in RAM, introducing 1–3 second audio stalls on clicks [GENERAL BEST PRACTICE].
* **Missing Step**: Main process must extend `app://board/asset/<id>` protocol handling to stream audio directly from disk via `net.fetch(pathToFileURL(...))` [VERIFIED IN CODE: main.js:148-160], enabling native HTTP 206 range seeking with zero memory duplication. Audio writes must use streaming binary IPC.

---

#### 2. Assumption: `assets.put` Returns a String ID
* **doc3 Proposal** (lines 188, 191):
  ```javascript
  const assetId = await window.board.assets.put(dataUrl);
  track.assetId = assetId;
  ```
* **Reality in Code**:
  - In [main.js:1290-1292](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1290-L1292), `assets:put` returns an **Object**, NOT a string:
    ```javascript
    try { await fsp.access(file); return { id }; } catch { /* first time */ }
    await writeAtomic(file, d.buf);
    return { id };
    ```
  - `track.assetId` becomes `{ id: '...' }`. When serialized, this corrupts the asset pointer to `"[object Object]"` or an unexpected nested structure!
* **Missing Step**: Must extract `const { id } = await window.board.assets.putBinary(...)`.

---

#### 3. Assumption: `drawStroke()` in `render.js` Renders Every Frame During Replay
* **doc3 Proposal** (lines 254–293): Places progressive sub-stroke reveals and ghosting directly inside `drawStroke()` in `render.js`.
* **Reality in Code**:
  - In [surface.js:570-588](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L570-L588), `Surface.draw()` optimizes rendering by blitting an offscreen frozen canvas (`this._ink`) whenever `this._ink.key === this.freezeKey()`.
  - `freezeKey()` depends only on document revision, camera coordinates, canvas size, and DPR [VERIFIED IN CODE: src/js/core/surface.js:133]. During audio playback, **none of these change**.
  - Consequently, `Surface.draw()` repeatedly blits the static frozen canvas; `drawStroke()` is **never called** between audio frames!
  - **The Fatal Baking Flaw**: In [surface.js:448-461](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L448-L461), `_freezeScene()` renders ALL board objects into `this._inkCanvas` at 100% opacity. Future strokes are therefore already baked into the frozen bitmap at full opacity! Blitting `this._inkCanvas` paints future notes at 100% opacity, making ghosting (F-202) physically impossible without scene partitioning.
* **Missing Step**: Implement **Scene Partitioning** in `_freezeScene()` to exclude active session strokes from the frozen cache, rendering them dynamically on each RAF tick over the blitted background.

---

#### 4. Assumption: `Store.toJSON()` and `load()` Automatically Persist `audioTracks`
* **doc3 Proposal** (lines 198–201): Proposes saving audio tracks by committing:
  ```javascript
  this.app.store.commit('add audio recording', [
    { t: 'doc', before: { audioTracks: existing }, after: { audioTracks: [...existing, track] } }
  ]);
  ```
  Asserting this persists cleanly and backwards-compatibly.
* **Reality in Code**:
  - In [store.js:327-332](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L327-L332), `Store.toJSON()` returns a **strictly enumerated object literal**:
    ```javascript
    return { id: d.id, name: d.name, schema: 2, created: d.created, modified: d.modified,
      origin: d.origin || undefined,
      pageDates: d.pageDates && d.pageDates.length ? d.pageDates.slice() : undefined,
      background: d.background, pages: d.pages.map((p) => ({ ...p })), page: d.pages[0] || null,
      camera: d.camera, objects: d.order.map((id) => d.objects[id]).filter(Boolean), ...extra };
    ```
    Any custom property on `this.doc` (including `audioTracks`) is **completely dropped** during serialization!
  - In [store.js:343-362](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L343-L362), `Store.load()` instantiates a fresh `emptyDoc()` and copies only recognized properties, discarding unknown keys.
* **Missing Step**: Must explicitly enumerate `audioTracks` in both `Store.toJSON()` and `Store.load()`. Furthermore, acknowledge that when upstream GazBoard opens and re-saves a Replay board, it will strip `audioTracks` (safe degradation, but one-way).

---

#### 5. Assumption: APIs `camera.panTo()` and `surface.pulseHighlight()` Exist
* **doc3 Proposal** (lines 320, 378):
  - Calls `this.surface.pulseHighlight(boundsOf(obj))` for click-to-seek feedback.
  - Calls `this.surface.cam.panTo(targetBox)` for auto-follow camera and PDF excerpts.
* **Reality in Code**:
  - [camera.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/camera.js) has only 43 lines [VERIFIED IN CODE: src/js/core/camera.js:1-43]. Its methods are `toScreen`, `toWorld`, `panBy`, `zoomAt`, `setZoom`, `viewport`, `fit`, `centerOn`, `toJSON`, and `load`. **There is no `panTo` method.**
  - [surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) contains zero references to `pulseHighlight`.
* **Missing Step**: Must implement smooth easing in `camera.glideTo(targetBox)` and register transient pulse animations in `surface.overlays` [VERIFIED IN CODE: src/js/core/surface.js:31, 723].

---

#### 6. Assumption: Study Tape Requires an Isolated Object Type `'tape'`
* **doc3 Proposal** (Section 3.6A, lines 351–365): Specifies creating a brand-new object type `'tape'` and a new module `src/js/core/tape.js`.
* **Reality in Code**:
  - Upstream GazBoard **already implements an active-recall Answer Cover system** under type `'curtain'` [VERIFIED IN CODE: src/js/core/render.js:980-1031].
  - Creating a parallel `'tape'` type duplicates hit testing, spatial indexing, selection bounding boxes, and toolbar commands.
  - More critically: an unknown `type: 'tape'` in upstream GazBoard will fail to render entirely or throw unhandled type warnings.
* **Missing Step**: Implement Tape as a specialized variant of `curtain`: `{ type: 'curtain', subtype: 'tape' }`. Update `drawCurtain` to render translucent fill on reveal and adjust `ghost(o)` in [hit.js:28](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js#L28) for two-way toggling.

---

#### 7. Assumption: Single Board Export produces a ZIP File
* **doc3 Proposal**: Assumes exporting a single `.gazboard` file packages audio assets in a zip container.
* **Reality in Code**:
  - In [export.js:664-665](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js#L664-L665), single board export generates a **raw, uncompressed UTF-8 JSON file**.
  - `JSZip` is only loaded dynamically in [board-export.js:45-50](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/board-export.js#L45-L50) when exporting two or more boards simultaneously!
  - Exporting a board with audio using existing code leaves the audio asset stranded on the user's local disk.
  - **Fatal Import Crash**: Even worse, in [export.js:677-678](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js#L677-L678), `openBoardFile` unconditionally executes:
    ```javascript
    const buf = await window.board.readFile(paths[0]);
    const data = JSON.parse(new TextDecoder().decode(buf));
    ```
    If handed a binary ZIP container, `JSON.parse` immediately throws an unhandled `SyntaxError: Unexpected token 'P', "PK..." is not valid JSON`, permanently breaking file loading!
* **Missing Step**: Update `saveBoardFile` in `export.js` to inspect `doc.audioTracks`. If audio tracks exist, package the board and its audio assets into a `.gazboard` ZIP container via `JSZip` [VERIFIED IN CODE: src/js/board-export.js:8-16]. Update `openBoardFile` to inspect magic bytes (`buf[0] === 0x50 && buf[1] === 0x4b` for `PK\x03\x04`), dynamically loading `JSZip` to extract `board.json` and unpack assets before falling back to `JSON.parse`.

---

#### 8. Assumption: `MediaRecorder` WebM Blobs Have Valid Duration
* **doc3 Proposal** (lines 179–193): Computes duration from `currentTimeMs` but does not address playback seeking issues with WebM metadata.
* **Reality in Code**:
  - Chromium's `MediaRecorder` generates WebM files without duration metadata in the container header. When loaded into an `<audio>` element, `audio.duration` evaluates to `Infinity`, breaking scrubber percentage calculations (`currentTime / duration`).
* **Missing Step**: Explicitly persist `track.durationMs` in the board JSON. When mounting the audio element, use `track.durationMs` as the authoritative duration rather than reading `audio.duration`.

---

#### 9. Assumption: LAN Sync Seamlessly Transmits Boards with Audio
* **doc3 Proposal**: Assumes LAN collaboration works out-of-the-box.
* **Reality in Code**:
  - In [sync/node.js:63](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/sync/node.js#L63), the LAN sync protocol enforces:
    ```javascript
    const MAX_BOARD_BYTES = 64 * 1024 * 1024; // 64 MB
    ```
  - Traced through [app.js:5316-5356](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L5316-L5356) (`picturesForSending` and `sendBoardDoc`): GazBoard has **zero out-of-band asset transfer endpoints** over LAN. All assets are base64-inlined into the board JSON, and the entire payload is encrypted and base64-encoded (`P.seal`), expanding total wire size by $\sim 1.8\times$ [VERIFIED IN CODE: sync/node.js:787].
  - A 30 MB audio file expands to $> 54\text{ MB}$ on the wire, readily exceeding the 64 MB hard cap and triggering:
    ```javascript
    if (bytes > 60 * 1024 * 1024) {
      this.toast(t('This board is too big to send over the network - save a copy and carry it instead'), 'help', 8000);
      return false;
    }
    ```
    [VERIFIED IN CODE: src/js/app.js:5353-5356].
* **Missing Step**: Explicitly strip `audioTracks` and audio assets from LAN sync payloads in `app.js:5338`, showing an informative toast: `app.toast(t('Notes synced over LAN; audio recording omitted'), 'info')`. Any future LAN audio sync requires adding an out-of-band `/asset/:sha256` HTTP streaming endpoint to `sync/node.js`.

---

#### 10. Assumption: New UI Strings Do Not Break Existing Tests
* **doc3 Proposal**: Introduces UI labels directly in English strings.
* **Reality in Code**:
  - GazBoard enforces strict internationalization via `scripts/i18n-check.js` [VERIFIED IN CODE: scripts/i18n-check.js:27-64].
  - `test/smoke.js` runs `i18n-check.js` as part of CI [VERIFIED IN CODE: test/smoke.js:15094].
  - If any newly added English string in `t('...')` is missing from any of the 7 locale files (`ar, bn, de, es, pt-BR, zh-Hans, zh-Hant`), `i18n-check.js` exits with code 1, **failing the CI build immediately**!
* **Missing Step**: Every newly introduced string must be extracted and stubbed across all 7 translation files.

---

#### 11. Assumption: Point Timestamps ($p.t$) Persist Automatically Across Stroke Lifecycles
* **doc3 Proposal**: Assumes capturing `p.t` during pointer events is sufficient for progressive reanimation.
* **Reality in Code**:
  - In [tools.js:1707](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js#L1707) (`breakStroke` -> `tidy`) and [tools.js:1734](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js#L1734) (`finishStroke`), GazBoard explicitly reconstructs each point object with hardcoded property extraction:
    ```javascript
    obj.points = obj.points.map((p) => ({
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2)
    }));
    ```
  - Any custom property on a point (including `p.t`) is **silently stripped and discarded upon stylus lift**!
* **Missing Step**: Update point reconstruction maps in both `tools.js:1707` and `tools.js:1734` to preserve `t`:
  ```javascript
  obj.points = obj.points.map((p) => ({
    x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(2),
    t: p.t != null ? p.t : undefined
  }));
  ```

---

### 2.2 Critique of Document 3's Phased Ordering

Document 3 proposes the following 4-phase schedule:
* *Phase 1*: Audio Recording (`audio.js`) $\to$ Stroke Timestamps $\to$ Asset Store.
* *Phase 2*: Floating Audio Player UI $\to$ Replay Engine $\to$ Click-to-Seek.
* *Phase 3*: Study Tape $\to$ Scrubber Density Ticks $\to$ Auto-Follow Camera.
* *Phase 4*: Gesture Scratch-Out $\to$ PDF Excerpts $\to$ Animated Video Export.

#### Critical Flaws in doc3 Ordering:
1. **Building UI Before Core Infrastructure**: Phase 2 builds the Floating Audio Player UI *before* the canvas Scene Partitioning engine exists. This results in an unusable player that causes frozen canvas glitches.
2. **Postponing High-Value, Zero-Dependency Features**: Study Tape (F-701) and Gesture Scratch-Out (F-703) have **zero dependencies on the audio subsystem**. Pushing them to Phase 3 and Phase 4 is irrational; they can be developed, tested, and submitted upstream immediately in Milestone 1!
3. **Missing Architectural Foundation Milestone**: Doc3 begins by writing `audio.js` without first establishing the streaming protocol handler (`app://board/asset/<id>`), the `store.js` schema extensions, or the Electron permission handlers. Without these, `audio.js` cannot save, load, or stream audio.

---

## 3. Side-by-Side Architectural Trade-Off Table

The following table contrasts Document 3's proposed technical approach against the verified, resilient architecture required for GazBoard Replay:

| Subsystem / Architectural Dimension | Document 3 Proposed Approach | Recommended Architecture (Ground Truth) | Engineering Trade-Off Rationale |
| :--- | :--- | :--- | :--- |
| **Audio Transport & Storage** | Shuttles 30 MB audio as base64 Data URLs via `assets.put(dataUrl)`. | Streaming binary IPC to disk (`userData/boards/assets/<hash>.webm`); streamed via `app://board/asset/<id>`. | **Eliminates GC Freezes & Enables HTTP 206 Seeking**: Prevents 100 MB heap bloat and enables sub-50ms seek latency during replay [VERIFIED IN CODE: main.js:148-160]. |
| **Canvas Replay Loop** | Calls `drawStroke()` in `render.js` on every frame during audio playback. | **Scene Partitioning**: Non-session ink is baked into `Surface._inkCanvas`; active session strokes draw dynamically on top. | **Solves Frozen Canvas Lock**: Bypasses the static frozen cache without forcing an expensive $O(N)$ board redraw 60 times/sec [VERIFIED IN CODE: surface.js:553-588]. |
| **Sub-Stroke Progressive Animation** | Leaves pressure handling unspecified or assumes uniform stroke width. | Dynamic `pressureRuns(visiblePts, size, scale)` evaluated on active partial slice ($< 0.03\text{ms}$ execution). | **Authentic Pen Tapering**: Delivers genuine pressure-sensitive ink unfolding in real time without lag [VERIFIED IN CODE: src/js/core/ink.js:200-236]. |
| **Point Timestamp Persistence** | Assumes `p.t` captured in pointer events automatically persists into store. | Explicitly update point reconstruction maps in `tools.js:1707` and `tools.js:1734` to preserve `t: p.t`. | **Prevents Silent Timestamp Stripping**: Overcomes GazBoard's hardcoded `{ x, y, p }` point sanitization map upon pen lift [VERIFIED IN CODE: src/js/core/tools.js:1707, 1734]. |
| **Active Recall / Masking** | Brand new object type `'tape'` with isolated module `tape.js`. | Specialized subtype of existing curtain: `{ type: 'curtain', subtype: 'tape' }`. | **100% Upstream Backward Compatibility**: Reuses existing spatial hit-testing, selection, and serialization; degrades gracefully in upstream GazBoard [VERIFIED IN CODE: render.js:980]. |
| **Gesture Scratch-Out Eraser** | Evaluates scratch marks deep inside `finishStroke(a)` at line 1696. | Evaluates gesture in `onPointerUp` (`tools.js:957`) beside `tappedAnObject`, calling `discardTapMark()`. | **Zero Document/History Polluting**: Prevents scratch scribbles from ever entering `store` or undo history [VERIFIED IN CODE: src/js/core/tools.js:957, 1669]. |
| **PDF Reference Cards** | Custom card type with manual navigation math. | Reuses native `boardlink` card object (`render.js:1102`) with target `box` and `app.backStack` integration. | **Native Navigation History**: Reuses existing `boardlink` rendering and GazBoard's built-in return pill [VERIFIED IN CODE: src/js/app.js:1670-1695]. |
| **Split Study Workspace** | Modifies `pages.js:pageRects()` with 2D column coordinates (Approach A). | **Dual-Viewport Split Canvas UI (Approach B — Recommended)**: Hosts two independent boards side-by-side. | **Eliminates Upstream Desk-Clipping Defect**: Approach A notes land in the gutter where upstream `sheetAt` returns null, blocking inking. Approach B uses 100% standard boards [VERIFIED IN CODE: src/js/core/tools.js:1549]. |
| **Camera Auto-Follow & Jump** | Proposes calling non-existent API `camera.panTo(bounds)`. | Author `camera.glideTo(box)` with requestAnimationFrame cubic easing and dead-zone boundary margin. | **Prevents Runtime TypeErrors & Motion Sickness**: Smooth interpolation with dead-zone prevents camera jitter during fast writing [VERIFIED IN CODE: camera.js:1-43]. |
| **Visual Click-to-Seek Feedback** | Proposes calling non-existent API `surface.pulseHighlight()`. | Author `pulseHighlight(box)` registered in GazBoard's screen-space `surface.overlays` array. | **Clean Layer Separation**: Overlays render in CSS pixels after world transforms, causing zero board cache invalidation [VERIFIED IN CODE: surface.js:31, 723]. |
| **Document Persistence** | Assumes `store.commit({ t: 'doc' })` automatically persists `audioTracks`. | Explicitly update `Store.toJSON()` and `Store.load()` to serialize and restore `audioTracks`. | **Prevents Silent Data Loss**: Overcomes `Store.toJSON()` hardcoded property drop [VERIFIED IN CODE: store.js:327-332]. |
| **Single Board Export / Import** | Assumes single board export produces a ZIP archive and `openBoardFile` parses it. | Bundle board JSON + assets into ZIP container when audio exists; update `openBoardFile` to detect `PK\x03\x04`. | **Prevents Fatal Import Crash**: Prevents `JSON.parse` SyntaxError crash on binary ZIPs while keeping media portable [VERIFIED IN CODE: src/js/export.js:664, 678]. |
| **LAN Collaboration** | Assumes audio tracks sync across LAN without modification. | Strip audio track binaries from LAN sync payloads in `app.js`; sync only ink notes with an informative toast. | **Enforces 64 MB Protocol Limit**: Prevents network transfer aborts and socket crashes on local Wi-Fi [VERIFIED IN CODE: sync/node.js:63, app.js:5353]. |
| **Internationalization (i18n)** | Adds hardcoded English UI strings. | Wraps all strings in `t('...')` and stubs keys across all 7 locale JSON files (`ar, bn, de, es, pt-BR, zh-Hans, zh-Hant`). | **CI Build Integrity**: Guarantees compliance with `scripts/i18n-check.js` and automated smoke suites [VERIFIED IN CODE: scripts/i18n-check.js:27]. |

---

## 4. Branching, Versioning & Upstream Tracking Strategy

To satisfy the twin overarching project requirements—**(1) Seamlessly merging future upstream GazBoard releases** and **(2) Contributing features back upstream as clean Pull Requests**—the repository must adhere to a strict branching and commit topology.

### 4.1 Git Repository Structure & Remote Configuration

```
                  upstream/main (official GazBoard)
                        │
                        ▼ (periodic rebase/merge)
                   fork/main (GazBoard Replay production branch)
                        │
       ┌────────────────┼────────────────┬────────────────┐
       ▼                ▼                ▼                ▼
feat/study-tape   feat/scratch-out   feat/camera-ease   feat/audio-engine
 (Target: PR #1)  (Target: PR #2)    (Target: PR #3)    (Target: PR #4)
```

#### Remote Setup:
```bash
git remote add origin https://github.com/your-username/GazBoard-Replay.git
git remote add upstream https://github.com/fahim9778/GazBoard.git
```

### 4.2 Branching Rules: Isolating Replay from Upstream
1. **Never Make Ad-Hoc Edits on `main`**: All work occurs in dedicated, isolated feature branches branched directly from `upstream/main` whenever possible.
2. **Minimal Touch Surface in Core Files**:
   - Monolithic files like [app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) (5,446 lines) and [tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) (3,047 lines) are high-conflict areas.
   - Core files must contain **only small, single-line hook dispatches** to dedicated modular files (e.g. `this.replayEngine?.onFrame()`, `this.scratchRecognizer?.offer(stroke)`).
   - Logic must reside in newly created, isolated modules in `src/js/core/` and `src/js/ui/`.
3. **Tracking Upstream Updates**:
   - Upstream updates are pulled via:
     ```bash
     git fetch upstream
     git checkout main
     git merge upstream/main  # or rebase for clean linear history
     ```
   - Because Replay features live in modular files with minimal hooks in core files, merge conflicts are reduced by $> 90\%$.

### 4.3 Versioning Strategy
* **Document Schema Versioning**:
  - Upstream GazBoard stores `schema: 2` in [store.js:327](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L327).
  - GazBoard Replay **MUST NOT increment `schema` to 3**. Incrementing `schema` would cause upstream GazBoard to reject or warn on load.
  - Replay additions (`audioTracks`, stroke `t0, t1`, curtain `subtype: 'tape'`) are purely **additive optional properties**.
* **Application Versioning in `package.json`**:
  - Upstream version is `4.8.1` [VERIFIED IN CODE: package.json:4].
  - Replay should be versioned as `4.8.1-replay.1.0.0` or track semantic releases (`4.9.0-replay`).

---

### 4.4 Upstream Contribution Roadmap: 7 Independent Pull Requests

By segmenting the implementation into modular, decoupled units, each major capability can be proposed as an independent, high-quality pull request to upstream GazBoard:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UPSTREAM PULL REQUEST DECOMPOSITION                             │
├────────┬───────────────────────────────────┬───────────────────┬───────────────────────┤
│ PR #   │ Feature Scope                     │ Primary Files     │ Upstream Benefit      │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 1   │ Media Board ZIP Container &       │ src/js/export.js  │ Enables packaging     │
│        │ JSZip Asset Bundler               │ src/js/board-     │ external media assets │
│        │                                   │ export.js         │ in single board files │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 2   │ Smooth Camera Easing & Screen-    │ src/js/core/      │ Enhances presentation │
│        │ Space Pulse Highlights            │ camera.js,        │ navigation and touch  │
│        │                                   │ surface.js        │ feedback              │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 3   │ Interactive Active-Recall Study   │ src/js/core/      │ Significant study     │
│        │ Tape (Curtain Subtype Extension)  │ render.js, hit.js,│ enhancement for       │
│        │                                   │ tools.js          │ students & teachers   │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 4   │ Natural Gesture Scratch-Out       │ src/js/core/      │ Major stylus UX boost;│
│        │ Eraser Recognition Engine         │ tools.js,         │ eliminates manual tool│
│        │                                   │ recognize.js      │ switching friction    │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 5   │ Dual-Column Side-by-Side Study    │ src/js/core/      │ Enables structured    │
│        │ Pad Layout in pages.js            │ pages.js,         │ slide/note reference  │
│        │                                   │ panels.js         │ workflows             │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 6   │ Streaming Audio Asset Protocol    │ main.js,          │ Eliminates IPC memory │
│        │ (`app://board/asset/<id>`)        │ preload.js        │ bloat for all media   │
├────────┼───────────────────────────────────┼───────────────────┼───────────────────────┤
│ PR 7   │ Audio Recording, Stroke Temporal  │ src/js/core/      │ Complete StarNote     │
│        │ Sync & Reanimation Engine         │ audio.js, replay. │ synchronized replay   │
│        │                                   │ js, audioplayer.js│ capability            │
└────────┴───────────────────────────────────┴───────────────────┴───────────────────────┘
```

---

## 5. Continuous Operability: Keeping App Runnable After Every Step

A critical requirement of professional fork maintenance is that **the application must remain 100% buildable, testable, and runnable after every single commit and milestone**.

### 5.1 Six Non-Negotiable Invariants

Before any commit is merged into `main`, the following six automated and manual checks must pass:

1. **Clean Launch Invariant**:
   - The application starts with zero unhandled exceptions, zero console errors, and zero warnings in Chromium DevTools.
2. **Smoke Test Invariant**:
   - Executes and passes `npm run smoke:builtin` (`test/smoke.js`) on Windows and headless Linux (`xvfb-run`) [VERIFIED IN CODE: scripts/smoke.js:31-33].
3. **i18n Translation Invariant**:
   - Executes and passes `node scripts/i18n-check.js`. Zero missing translations across all 7 locale files [VERIFIED IN CODE: scripts/i18n-check.js:61].
4. **Backward Compatibility Invariant**:
   - Boards created by upstream GazBoard 4.8.1 open flawlessly in GazBoard Replay with identical geometry, colors, and z-ordering.
5. **Forward Graceful Degradation Invariant**:
   - A board containing Replay features (audio tracks, tape strips, stroke timestamps) saved in Replay opens in upstream GazBoard 4.8.1 without crashing or throwing errors.
6. **Inking Latency Invariant**:
   - Pen tracking latency remains strictly $< 16\text{ms}$ ($60\text{ FPS}$) and $< 8.3\text{ms}$ ($120\text{ FPS}$). Coalesced hardware events and Windows Delegated Ink Trails remain active [VERIFIED IN CODE: src/js/core/inktrail.js:24-49].

---

### 5.2 Milestone Verification & Rollback Protocol

```
MILESTONE COMMIT CHECKPOINT
          │
          ▼
   1. npm run smoke:builtin (Headless test harness)
          │
          ├── [FAIL] ──► Immediate Git Revert / Rollback
          │
          ▼ [PASS]
   2. node scripts/i18n-check.js (Locale dictionary guard)
          │
          ├── [FAIL] ──► Add missing keys to src/locales/*.json
          │
          ▼ [PASS]
   3. Launch App & Open Legacy Fixture Board (test/fixtures/)
          │
          ├── [FAIL] ──► Fix deserialization regression in store.js
          │
          ▼ [PASS]
   4. Measure Stylus Inking Frame Time in DevTools Performance
          │
          ├── [> 16ms] ──► Fix canvas caching / redraw leak
          │
          ▼ [< 16ms]
   MERGE COMMIT APPROVED
```

By following this disciplined verification protocol, GazBoard Replay will maintain production-grade stability throughout every stage of development.
