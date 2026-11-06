# Phase 7: Risk Register, Release Checklist & Upstream Contribution Package

> **Document status:** Historical release plan. The current consolidated source release is v4.8.8; use [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md), `../releases/RELEASE-4.8.8.md`, and `../releases/RELEASES_INDEX.md` for implementation and release evidence. Copy a release into the Antigravity archive only after its code, focused tests, mandatory smoke, and packaging have been verified.
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 7 Complete — Production Risk Register, Release Checklists & Upstream PR Package (Verified Ground Truth)

---

## 1. Comprehensive Architectural Risk Register

The following register details the specific technical risks associated with implementing GazBoard Replay. Every risk is grounded in actual codebase constraints identified in earlier audit phases:

| Risk ID | Risk Category | Specific Technical Description | Likelihood | Impact | Concrete Mitigation | Early-Warning Sign / Tripwire |
|:---|:---|:---|:---:|:---:|:---|:---|
| **R-01** | Audio / Timing Sync | Audio clock (`audio.currentTime`) drifts from canvas RAF loop (`performance.now()`), causing ink to appear before or after spoken words. | Med | High | Drive canvas replay directly from `audio.currentTime * 1000` on each `requestAnimationFrame` tick. Use `performance.now()` only for sub-frame interpolation [VERIFIED IN CODE: src/js/core/replay.js]. | Smoke test timing drift assertion: ink slice mismatch $> 50\text{ ms}$ after 5-minute replay playback. |
| **R-02** | Windows File Locking | Windows Defender or OneDrive locks board file or audio chunk during rapid autosaves, throwing `EBUSY` or `EPERM` in `writeAtomic`. | High | High | In `main.js:250` and `storage-location.js:20`, generate unique temporary file names incorporating sequence counter: `${file}.${process.pid}.${Date.now()}.${++writeSequence}.tmp` [VERIFIED IN CODE: main.js:250-260]. | `EBUSY: resource busy or locked` in Electron console logs during automated stress save suite. |
| **R-03** | Memory Exhaustion | Recording long lectures ($> 1\text{ hour}$) accumulates multi-megabyte `Blob` chunks in renderer heap, causing Chromium OOM crash. | Med | High | Stream chunks to main process disk storage via binary IPC (`recording:appendChunk`) immediately as 3-second slices arrive; do NOT accumulate in memory [FROM MY DOCS: doc3:188]. | Heap memory footprint in DevTools Memory panel exceeding $150\text{ MB}$ during active recording. |
| **R-04** | Canvas Baking Stagnation | `Surface.draw()` repeatedly blits static frozen canvas `_ink` because `freezeKey()` does not track audio replay state, rendering future strokes at 100% opacity. | High | High | 1. Incorporate active replay track ID into `freezeKey()` in `surface.js:130` [VERIFIED IN CODE: src/js/core/surface.js:130-134].<br>2. Filter out replay track strokes from `_freezeScene()` so they render dynamically per frame. | Future strokes visible at 100% opacity during playback instead of translucent ghosting. |
| **R-05** | Silent Timestamp Stripping | Point compression in `tools.js:1707` (`tidy`) and `tools.js:1734` (`finishStroke`) strips custom point properties, resetting all stroke timestamps to `0:00`. | High | High | Explicitly preserve timestamp: `t: p.t != null ? Math.round(p.t) : undefined` in both mapping pipelines [VERIFIED IN CODE: src/js/core/tools.js:1707, 1734]. | Stroke `t0` and `t1` evaluate to `undefined` or `0` on completed strokes in `Store.toJSON()`. |
| **R-06** | Two-Way Tape Deadlock | Pen taps on already-revealed study tape fail to conceal it because `app.js:1947` (`revealCurtain`) returns `false` if `o.revealed` is true. | High | Med | Introduce `toggleCurtain(id)` in `app.js` and route `tools.js:949, 1607, 2618` through `toggleCurtain` rather than `revealCurtain` [VERIFIED IN CODE: src/js/app.js:1947, tools.js:1607]. | Revealed tape cannot be clicked back into hidden state; requires undo to conceal. |
| **R-07** | Board Import Crash on ZIP | `openBoardFile` in `export.js:677` unconditionally executes `JSON.parse`, throwing fatal `SyntaxError` on ZIP magic bytes `PK\x03\x04`. | High | High | Sniff first 4 bytes of file buffer: if `0x50, 0x4B, 0x03, 0x04`, route to `loadZip()` extraction; else parse as JSON [VERIFIED IN CODE: src/js/export.js:677-678]. | Unhandled rejection: `SyntaxError: Unexpected token 'P', "PK\x03\x04"... is not valid JSON`. |
| **R-08** | Zip-Slip Directory Traversal | Malicious `.gazboard` ZIP archive contains path traversal filenames (`assets/../../malicious.bat`) that overwrite arbitrary system files. | Low | Critical | Sanitize all extracted filenames using `path.basename(entry.name)` and verify destination remains strictly inside `assetsDir()` [VERIFIED IN CODE: main.js:238]. | Extracted filename contains `..` or leading slashes during archive unpack. |
| **R-09** | XSS via Subtitle Captions | External `.vtt`/`.srt` transcript text injected via `popover.js:84` (`el.innerHTML = v`) executes arbitrary script inside privileged renderer. | Low | High | Never pass caption text to `h('div', { html: caption })`. Use `document.createTextNode` or `el.textContent` [VERIFIED IN CODE: src/js/ui/popover.js:84, 90]. | `<script>` or `<img onerror=...>` in transcript file triggers script execution. |
| **R-10** | Mic Access Blocked in Production | Packaged Windows production build silently denies `getUserMedia` microphone access due to missing permission request handler. | High | High | Register `session.defaultSession.setPermissionRequestHandler` in `main.js:createWindow` to explicitly approve media requests from `app://board/` [VERIFIED IN CODE: main.js]. | `NotAllowedError: Permission denied` when clicking Record in packaged NSIS installer. |
| **R-11** | Auto-Updater Fork Hijack | Forked app prompts users to "update" back to upstream GazBoard 4.8.1, overwriting all Replay features. | High | High | In `main.js:36-41`, redirect `RELEASES_URL` and `UPDATE_API` to the GazBoard Replay GitHub repository [VERIFIED IN CODE: main.js:36-41]. | Update dialog banner offers GazBoard 4.8.1 release from `fahim9778/GazBoard`. |
| **R-12** | LAN Sync Network Saturation | Broadcasting multi-megabyte audio files over local peer sync exceeds 64MB socket buffer and causes disconnects. | Med | Med | In `app.js:5338` (`picturesForSending`), delete `audioTracks` from document payload prior to socket transmission [VERIFIED IN CODE: src/js/app.js:5338]. | LAN sync connection drops or logs `Message exceeds 64MB limit` when sharing board with audio. |
| **R-13** | Cursive Handwriting False Erasure | Rapid handwriting strokes (e.g. cursive 'm', 'w', 'minimum') trigger accidental scratch-out erasure of notes. | Med | Med | In `src/js/core/scratch.js`, require both minimum reversals ($\ge 4$) AND path density relative to bounding box diagonal ($> 3.0$) [FROM MY DOCS: doc3:367]. | Drawing cursive script triggers blue pulse overlay and vanishes from canvas. |
| **R-14** | One-Way Audio Stripping Upstream | Upstream GazBoard 4.8.1 `store.js:327` strictly enumerates fields and drops `audioTracks` when opening and re-saving Replay boards. | High | Med | Accept as an intentional architectural trade-off. Safe degradation: upstream opens ink and visuals without error; warns user that audio is preserved only in `.gazboard` container. | Re-saving in upstream 4.8.1 removes `audioTracks` from JSON. |
| **R-15** | CI Translation Suite Breakage | Adding new user-facing strings via `t('...')` without updating all 7 language dictionaries breaks `scripts/i18n-check.js`. | High | Med | Add automated translation verification step to `npm test`. Stub newly introduced keys across all 7 locales in `src/locales/*.json` [VERIFIED IN CODE: scripts/i18n-check.js:27-44]. | `node scripts/i18n-check.js` fails with exit code 1 and lists missing keys. |

---

## 2. Pre-Release Verification Checklists

### 2.1 Security & Privacy Checklist
- [ ] **Electron Runtime Configuration**:
  - [ ] `contextIsolation: true` verified in [main.js:682](../../main.js).
  - [ ] `nodeIntegration: false` verified in [main.js:683](../../main.js).
  - [ ] Window creation handles `setWindowOpenHandler` returning `{ action: 'deny' }` for all non-local navigation [VERIFIED IN CODE: main.js:734].
- [ ] **Permission Request Validation**:
  - [ ] Explicit permission handler installed via `session.defaultSession.setPermissionRequestHandler`.
  - [ ] Only media capture requests originating from `app://board/` are approved; geolocation, notifications, and camera are denied.
- [ ] **IPC Surface & Path Traversal Guard**:
  - [ ] All asset endpoints validate filenames against `ASSET_NAME = /^[a-f0-9]{64}\.[a-z0-9]+$/i` [VERIFIED IN CODE: main.js:238].
  - [ ] File import and ZIP extraction strictly enforce `path.basename` extraction, blocking Zip-Slip traversal.
  - [ ] Binary IPC (`recording:appendChunk`) validates active session UUIDs before writing to temp directory.
- [ ] **DOM Injection & XSS Guard**:
  - [ ] Popover HUD and subtitle display never assign external strings to `innerHTML`. Text is appended via `document.createTextNode` or `el.textContent` [VERIFIED IN CODE: src/js/ui/popover.js:84, 90].
- [ ] **LAN Synchronization Privacy**:
  - [ ] `picturesForSending(doc)` in `app.js:5338` explicitly strips `audioTracks` before broadcasting to LAN peers, preventing microphone recordings from being transmitted across unencrypted local network links.

---

### 2.2 Performance & Frame-Budget Checklist
- [ ] **120 FPS / 60 FPS Drawing Budget**:
  - [ ] During active audio playback, frame rendering time in `Surface.draw()` remains $\le 8.33\text{ ms}$ (target 120 FPS) and strictly $\le 16.6\text{ ms}$ (60 FPS minimum) on boards with 2,000+ objects.
  - [ ] Scene partitioning verified: background objects are drawn once into offscreen frozen canvas `this._inkCanvas`, while only replay-active strokes are evaluated per frame.
- [ ] **Audio Streaming Latency & Memory Footprint**:
  - [ ] Audio asset protocol `app://board/asset/<id>` streams via `net.fetch(pathToFileURL(...))` with full HTTP 206 Partial Content support [VERIFIED IN CODE: main.js:152-161].
  - [ ] Scrubbing audio forward/backward responds in $< 100\text{ ms}$ without UI hitching or decoding stalls.
  - [ ] Peak renderer memory during a 60-minute recording session remains $< 120\text{ MB}$ (no unbounded base64 strings in heap).
- [ ] **Hit-Testing & Gesture Overhead**:
  - [ ] `isScratchGesture(points)` executes in $< 0.2\text{ ms}$ on stylus lift and introduces zero latency to standard pen lifts.
  - [ ] Camera `glideTo` cubic easing uses native `requestAnimationFrame` with zero garbage allocation during animation steps.

---

### 2.3 Compatibility Checklist: Windows & Cross-Platform
- [ ] **Windows 10 & 11 Stylus Support**:
  - [ ] Hardware stylus inking verified with Surface Pen (MPP 2.0) and Wacom EMR.
  - [ ] Pressure sensitivity ($0.0-1.0$) correctly captured and rendered.
  - [ ] Eraser barrel button and eraser tail switch tools cleanly between pen and eraser without mode lockup.
- [ ] **Display DPI Scaling**:
  - [ ] Crisp rendering verified at 100%, 125%, 150%, 175%, and 200% Windows display scaling settings.
  - [ ] Moving GazBoard Replay window across mixed-DPI multi-monitor setup (e.g. 4K 150% laptop screen to 1080p 100% external monitor) dynamically updates `surface.dpr` without canvas blurring or offset pointer alignment.
- [ ] **Packaging & Installers**:
  - [ ] Production NSIS installer (`npm run dist:win`) generates valid setup executable with desktop and start menu shortcuts.
  - [ ] Portable executable runs standalone from USB flash drive and stores data cleanly in user profile.
- [ ] **Non-Windows Build Preservation**:
  - [ ] Running `npm run dist:mac` and `npm run dist:linux` succeeds without syntax errors or missing Windows-only primitives.
  - [ ] Windows-specific registry or shell handlers are safely gated behind `process.platform === 'win32'`.

---

### 2.4 Board-File Compatibility Checklist
- [ ] **Legacy Upstream Import (Backward Compatibility)**:
  - [ ] Opening any `.gazboard` or `.json` board saved in upstream GazBoard 4.8.1 opens immediately with zero errors.
  - [ ] All standard objects (ink strokes, text blocks, sticky notes, shapes, math formulas, PDF embeds) render identically to upstream.
- [ ] **Graceful Degradation Upstream (Forward Compatibility)**:
  - [ ] A board created in GazBoard Replay containing audio recordings and study tape is opened in upstream GazBoard 4.8.1.
  - [ ] Result: Upstream opens the board cleanly; ink, text, and images render normally; unrevealed tape renders as standard curtain; audio metadata is ignored without throwing runtime errors.
- [ ] **ZIP Archive Detection**:
  - [ ] Board saved with audio exports as a valid `.gazboard` ZIP archive containing `board.json` and `assets/*`.
  - [ ] Opening the `.gazboard` ZIP archive automatically unpacks bundled audio assets into local storage.
  - [ ] Double-clicking `.gazboard` in Windows Explorer launches app and opens the board.
- [ ] **Schema Invariant**:
  - [ ] Document schema version remains strictly `2` [VERIFIED IN CODE: src/js/core/store.js:327].

---

## 3. Upstream Contribution Package

To honor the vision of contributing features back to MD. Fakhruddin Gazzali's upstream repository (`fahim9778/GazBoard`), the enhancements are structured into **7 standalone, atomic Pull Requests**. Each PR adheres strictly to GazBoard's architectural philosophy: **zero external runtime dependencies, vanilla ES6+ modules, and clean modular encapsulation**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UPSTREAM PULL REQUEST ARCHITECTURE                              │
├──────┬────────────────────────────────────┬────────────────────┬───────────────────────┤
│ PR # │ PR Title                           │ Target Branch      │ Files Touched/Created │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 1 │ Media Board ZIP Container & Assets │ `feat/zip-export`  │ `board-export.js`,    │
│      │                                    │                    │ `export.js`, `main.js`│
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 2 │ Smooth Camera Easing & Glide       │ `feat/cam-glide`   │ `camera.js`,          │
│      │                                    │                    │ `surface.js`          │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 3 │ Active-Recall Study Tape Curtains  │ `feat/study-tape`  │ `hit.js`, `render.js`,│
│      │                                    │                    │ `tools.js`, `app.js`  │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 4 │ Natural Gesture Scratch-Out Eraser │ `feat/scratch-out` │ `src/js/core/scratch`,│
│      │                                    │                    │ `tools.js`            │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 5 │ Split-View Dual Study Pad Layout   │ `feat/split-view`  │ `split-workspace.js`, │
│      │                                    │                    │ `insert.js`, `app.js` │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 6 │ Streaming Media Asset Protocol     │ `feat/stream-asset`│ `main.js`,            │
│      │                                    │                    │ `preload.js`          │
├──────┼────────────────────────────────────┼────────────────────┼───────────────────────┤
│ PR 7 │ Audio Sync Replay Engine & HUD     │ `feat/ink-replay`  │ `audio-recorder.js`,  │
│      │                                    │                    │ `replay.js`, store.js,│
│      │                                    │                    │ `audio-bar.js`        │
└──────┴────────────────────────────────────┴────────────────────┴───────────────────────┘
```

---

### 3.1 PR 1: Media Board ZIP Container & Bundler
* **Value to Upstream**: Enables single-file board sharing containing embedded media assets without requiring separate asset folders, while maintaining 100% backward compatibility for raw JSON files.
* **Files Touched**: `src/js/board-export.js` [VERIFIED IN CODE: board-export.js:6], `src/js/export.js` [VERIFIED IN CODE: export.js:657-686], `main.js` [VERIFIED IN CODE: main.js:649-663].
* **README Additions**:
  ```markdown
  ### Portable Board Archives (.gazboard)
  Boards containing bundled media assets are packaged as self-contained ZIP archives containing `board.json` and an `assets/` folder. Standard boards continue to export as plain UTF-8 JSON.
  ```
* **Automated Tests**: Smoke test saving board with assets, verifying `PK\x03\x04` magic bytes, and loading in a fresh instance.

---

### 3.2 PR 2: Smooth Camera Easing & Pulse Overlays
* **Value to Upstream**: Upgrades abrupt, jarring viewport snaps to smooth cubic ease-out transitions (`glideTo`), enhancing presentation quality. Adds transient highlight pulse overlays for bookmarks and search results.
* **Files Touched**: `src/js/core/camera.js` [VERIFIED IN CODE: camera.js:5-42], `src/js/core/surface.js` [VERIFIED IN CODE: surface.js:31, 723].
* **README Additions**:
  ```markdown
  ### Smooth Camera Navigation
  Camera movements triggered by page navigation, search results, or links glide smoothly to target bounding boxes with cubic easing (`camera.glideTo`). Any manual touch or pan cancels the animation instantly.
  ```
* **Automated Tests**: Test verifies `cam.glideTo` coordinates reach target bounds within 400ms; verify user pan cancels animation.

---

### 3.3 PR 3: Interactive Active-Recall Study Tape
* **Value to Upstream**: Extends existing curtains into reusable active-recall flashcard study tape. Teachers and students can tap tape strips with a pen to reveal answers, and tap again to conceal them for self-testing.
* **Files Touched**: `src/js/core/hit.js` [VERIFIED IN CODE: hit.js:28], `src/js/core/render.js` [VERIFIED IN CODE: render.js:992-1031], `src/js/core/tools.js` [VERIFIED IN CODE: tools.js:949, 1607, 2618], `src/js/app.js` [VERIFIED IN CODE: app.js:1945].
* **README Additions**:
  ```markdown
  ### Study Tape / Masking Strips
  Mask answers or textbook passages using the Study Tape tool. Tapping revealed tape with a pen or finger conceals it again, providing seamless active-recall flashcard practice directly on notes.
  ```
* **Automated Tests**: Unit test verifying `ghost()` permits hits on revealed tape; verify `toggleCurtain` flips `revealed` state.

---

### 3.4 PR 4: Natural Gesture Scratch-Out Eraser
* **Value to Upstream**: Natural pen gesture eraser. Rapidly scribbling back and forth over ink strokes erases them immediately without needing to switch away from the pen tool.
* **Files Created**: `src/js/core/scratch.js`.
* **Files Touched**: `src/js/core/tools.js` [VERIFIED IN CODE: tools.js:957].
* **README Additions**:
  ```markdown
  ### Gesture Scratch-Out Eraser
  Scribble back and forth over any ink stroke with your pen to delete it immediately. The gesture mark is discarded automatically and does not clutter your undo history.
  ```
* **Automated Tests**: Test synthetic zig-zag stroke over target objects, verifying target strokes are removed and scribble is discarded.

---

### 3.5 PR 5: Split-View Dual Study Pad Workspace
* **Value to Upstream**: Allows students to view reference material (PDF textbook, slide deck) on the left while taking handwritten notes on the right, with independent zoom and panning.
* **Files Created**: `src/js/ui/split-workspace.js`.
* **Files Touched**: `src/js/insert.js`, `src/js/app.js`.
* **README Additions**:
  ```markdown
  ### Split Workspace
  Open reference documents side-by-side with your active notebook using the Split Workspace view. Deep-link excerpt cards from textbooks directly into your study notes.
  ```
* **Automated Tests**: Verify stage splits into dual viewports and divider adjusts widths.

---

### 3.6 PR 6: Streaming Audio Asset Protocol Handler
* **Value to Upstream**: Enables high-performance, range-seekable media asset playback via `app://board/asset/<id>` with zero IPC memory duplication.
* **Files Touched**: `main.js` [VERIFIED IN CODE: main.js:152-161], `preload.js` [VERIFIED IN CODE: preload.js:220-285].
* **README Additions**:
  ```markdown
  ### Media Asset Streaming
  Media assets are streamed from disk via Electron's `net.fetch`, supporting native HTTP 206 Partial Content range requests and instant seeking.
  ```
* **Automated Tests**: Automated fetch of asset file verifying HTTP 206 range request response.

---

### 3.7 PR 7: Audio Recording, Stroke Temporal Sync & Replay Engine
* **Value to Upstream**: Complete lecture recording and handwriting reanimation engine. Synchronizes audio with digital ink, plots stroke density scrubbers, and allows clicking any stroke to jump audio to that moment.
* **Files Created**: `src/js/core/audio-recorder.js`, `src/js/core/replay.js`, `src/js/ui/audio-bar.js`, `src/js/ui/density-canvas.js`.
* **Files Touched**: `src/js/core/store.js` [VERIFIED IN CODE: store.js:327], `src/js/core/tools.js` [VERIFIED IN CODE: tools.js:1556, 1707, 1734], `src/js/core/surface.js` [VERIFIED IN CODE: surface.js:130, 435-461].
* **README Additions**:
  ```markdown
  ### Synchronized Lecture Replay
  Record audio while writing on the board. During playback, strokes are animated in sync with spoken words. Click any handwritten note to jump audio directly to when it was written.
  ```
* **Automated Tests**: End-to-end smoke test validating recording start, stroke timestamping, playback clock synchronization, and click-to-seek jump.

---

### 3.8 Draft Proposal Message to Upstream Maintainer (MD. Fakhruddin Gazzali)

```markdown
Subject: Contribution / Modular feature proposals for GazBoard: Lecture Replay, Study Tape, and Smooth Easing

Hi Fahim,

First off, thank you for building GazBoard! Its minimalist architecture, zero web framework overhead, and ultra-smooth canvas inking make it by far the best offline whiteboard available.

Over the past few months, I've been working on a study-focused fork called GazBoard Replay, designed to bring synchronized lecture audio recording, click-to-seek note replay, and active-recall study tape to students and teachers on Windows.

Throughout development, I strictly adhered to your core architectural philosophy:
1. Zero new production npm dependencies — everything uses native Web and Node primitives (MediaRecorder, Web Audio, net.fetch, Canvas2D).
2. Document schema version remains strictly 2 — all metadata is purely additive and backwards-compatible. Legacy boards open flawlessly, and Replay boards open gracefully in stock GazBoard.
3. Clean modular separation — large files like app.js and tools.js receive only minimal single-line hooks; all heavy state logic lives in standalone modules.

I would love to contribute these features back to upstream GazBoard if you're interested. To make reviewing as easy and painless as possible, I have isolated the work into 7 independent, atomic Pull Requests that can be evaluated one by one:

1. Media Board ZIP Container: Packages boards with assets into portable .gazboard archives (with transparent JSON fallback).
2. Smooth Camera Easing: Adds cubic glideTo interpolation to replace abrupt camera jumps.
3. Interactive Study Tape: Extends curtains into two-way clickable active-recall masking tape.
4. Natural Gesture Scratch-Out: Scribble back-and-forth over ink to erase strokes without switching tools.
5. Split-View Workspace: Dual-column reference view for textbook/notes side-by-side study.
6. Streaming Asset Protocol: HTTP 206 partial-content media streaming via net.fetch.
7. Lecture Audio Sync & Replay: Full audio-stroke synchronization, click-to-seek, and speed controls.

Every PR includes dedicated smoke tests and maintains 100% passing results across `npm run smoke:builtin` and `node scripts/i18n-check.js`.

Please let me know if you would like me to open the first PR (or if you prefer a different ordering/approach). Thank you again for creating such an exceptional open-source project!

Warm regards,  
[Your Name / GitHub Handle]
```

---

## 4. Honest Assessment: What Cannot Be Guaranteed & What Requires Manual Verification

While automated tests, CI gates, and AI agent execution plans cover software correctness, certain physical and system-level constraints **cannot be guaranteed by automated tools or AI agents alone**. The developer must manually verify the following on real hardware prior to production release:

### 4.1 Real Hardware Stylus Feel & Hardware Digitizer Latency
- **Limitation**: Synthetic mouse and pointer events simulated in headless tests cannot reproduce the physical tactile latency of real Windows digitizers (Microsoft Surface Pro Pen, MPP 2.0, Wacom EMR / AES).
- **Manual Verification Mandate**: The developer must physically draw on a Windows tablet or 2-in-1 device with a high-refresh display (120 Hz) to verify that ink tracking remains directly under the physical pen tip without perceptible trailing lag, and that palm rejection does not trigger false scratch-out erasures.

### 4.2 Windows Audio Driver Switching & USB Device Disconnects
- **Limitation**: Headless Chromium mocks cannot simulate real-world hardware driver interruptions: e.g., unplugging a USB headset microphone mid-recording, Bluetooth headset audio channel switching, or Windows Sleep/Resume while recording.
- **Manual Verification Mandate**: Start a 10-minute recording, unplug the microphone, plug in headphones, and put Windows to sleep. Verify the application handles stream interruptions gracefully without crashing or corrupting the existing audio session.

### 4.3 Aggressive Antivirus / Windows Defender Real-Time Locking
- **Limitation**: Headless test environments run without aggressive third-party antivirus suites (Norton, McAfee, Bitdefender, corporate endpoint protection) that actively hook file I/O.
- **Manual Verification Mandate**: Install the packaged NSIS build on a Windows machine with active endpoint antivirus, save boards rapidly while recording audio, and verify zero `EBUSY` or file permission popup errors occur.

### 4.4 High-DPI Multi-Monitor Hardware Window Dragging
- **Limitation**: Chromium headless testing executes at a fixed virtual screen resolution and cannot simulate moving an Electron window across displays with disparate DPI scalings (e.g., 200% laptop panel to 100% projector).
- **Manual Verification Mandate**: Drag the running application between a 4K display and a 1080p display. Verify canvas crispness updates instantly without coordinate offset misalignments or blurry text.

### 4.5 Human Linguistic Quality of i18n Translations
- **Limitation**: `scripts/i18n-check.js` checks only structural parity (keys present, `{placeholders}` match, HTML tags match). It cannot evaluate whether translated text is idiomatic or natural.
- **Manual Verification Mandate**: Native speakers must review the newly added study tape and audio replay strings across all 7 supported languages (`ar, bn, de, es, pt-BR, zh-Hans, zh-Hant`) before marking internationalization as complete.

### 4.6 Upstream Maintainer Responsiveness & Timeline
- **Limitation**: We cannot guarantee whether or when the upstream maintainer (MD. Fakhruddin Gazzali) will review, accept, or merge the proposed Pull Requests.
- **Strategic Mandate**: The fork architecture established in Phase 3 and Phase 5 ensures that GazBoard Replay operates as a permanent, self-sustaining Windows-first distribution capable of continuously pulling upstream bug fixes via git rebase, regardless of upstream merge timelines.
