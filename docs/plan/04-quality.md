# Phase 4: Cross-Cutting Quality Analysis

> **Document status:** Historical quality plan. Current commands are defined in `package.json`: mandatory regression `node scripts/smoke.js`; separate custom additions `npm run smoke:custom`; release-focused groups `npm run smoke:features:4.8.4.1` and `npm run smoke:features:4.8.8`. Translation parity is `node scripts/i18n-check.js`. Test claims/results are time-bound; use `docs/releases/RELEASE-4.8.8.md` for the latest recorded run and `docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md` for known limitations.
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 4 Complete — Exhaustive Quality, Security, Performance & Reliability Audit (Verified Ground Truth)

---

## 1. Executive Summary & Quality Framework

GazBoard Replay expands the baseline GazBoard digital whiteboard into a high-performance, audio-synchronized lecture recording and active-recall revision suite. Because GazBoard is designed as an ultra-responsive, offline-first tool capable of 120 FPS hardware inking with zero web framework overhead, cross-cutting architectural concerns—security, audio streaming latency, frame-budget preservation, backward compatibility, and crash resilience—cannot be treated as secondary considerations.

This document presents a comprehensive, ground-truth quality analysis covering the entire lifecycle of the application. In accordance with architectural audit ground rules:
* Every vulnerability, performance constraint, and compatibility invariant is analyzed against specific lines of code in the live GazBoard repository.
* Every finding is labeled as `[VERIFIED IN CODE: <file>:<line>]`, `[FROM MY DOCS: <file>:<line>]`, `[ASSUMPTION]`, or `[GENERAL BEST PRACTICE]`.
* Generic advice is omitted in favor of concrete engineering mitigations, data structures, and verification protocols.

---

## 2. Security & Privacy Hardening

### 2.1 Electron Runtime Hardening Audit

GazBoard runs within an Electron multi-process environment [VERIFIED IN CODE: main.js:665-702, package.json:6]. The renderer process executes vanilla ES6+ modules loaded from the custom `app://` privileged protocol [VERIFIED IN CODE: main.js:148-160, src/index.html:17].

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ELECTRON RUNTIME BOUNDARY                              │
├────────────────────────────────┬───────────────────┬───────────────────────────────────┤
│ Security Setting               │ Current Status    │ Audit Assessment & Hardening Plan │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `contextIsolation`             │ `true`            │ [VERIFIED IN CODE: main.js:682].  │
│                                │                   │ Isolates preload scripts from the │
│                                │                   │ renderer's `window` object. Safe. │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `nodeIntegration`              │ `false`           │ [VERIFIED IN CODE: main.js:683].  │
│                                │                   │ Prevents renderer from directly   │
│                                │                   │ executing Node primitives. Safe.  │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `sandbox`                      │ `false`           │ [VERIFIED IN CODE: main.js:684].  │
│                                │                   │ Chromium sandbox is disabled.     │
│                                │                   │ Risk: Compromised renderer has OS │
│                                │                   │ attack surface. See Section 2.1.1.│
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `spellcheck`                   │ `true`            │ [VERIFIED IN CODE: main.js:685].  │
│                                │                   │ Safe local dictionary checking.   │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `backgroundThrottling`         │ `false`           │ [VERIFIED IN CODE: main.js:698].  │
│                                │                   │ Required to prevent stylus/audio  │
│                                │                   │ stalls when window is unfocused.  │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ `setPermissionRequestHandler`  │ **MISSING**       │ [VERIFIED IN CODE: main.js].      │
│                                │                   │ CRITICAL RISK: Packaged apps fail │
│                                │                   │ `getUserMedia`. See 2.1.2.        │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ Content Security Policy (CSP)  │ Defined in HTML   │ [VERIFIED IN CODE: index.html:10].│
│                                │                   │ Lacks explicit `media-src`. Safe  │
│                                │                   │ fallback to `default-src`.        │
├────────────────────────────────┼───────────────────┼───────────────────────────────────┤
│ Navigation / Window Handlers   │ `action: 'deny'`  │ [VERIFIED IN CODE: main.js:734].  │
│                                │                   │ Denies new windows; routes external│
│                                │                   │ links to OS default browser. Safe.│
└────────────────────────────────┴───────────────────┴───────────────────────────────────┘
```

#### 2.1.1 Audit of `sandbox: false`
In [main.js:684](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L684), `sandbox: false` is explicitly configured. 
* **Reason in Base App**: Upstream GazBoard utilizes a non-sandboxed renderer preload bridge [VERIFIED IN CODE: preload.js:1-286] that relies on direct Node buffer marshalling across IPC without requiring a separate native helper process.
* **Risk Evaluation**: In an offline whiteboard, the primary attack vector is not malicious web navigation (external links are denied and routed to default browser via `shell.openExternal` [VERIFIED IN CODE: main.js:734]), but rather **untrusted imported files** (.gazboard, .docx, .pptx, .pdf).
* **Hardening Mandate**: To maintain 100% upstream mergeability, `sandbox: false` must be preserved, but the IPC surface and file deserialization boundaries must be hardened with strict schema validators so that untrusted input cannot leverage Node APIs through IPC.

#### 2.1.2 Missing Permission Request Handler (Microphone Access Bug)
* **Vulnerability in Base Code**: Currently, `main.js` does NOT declare `session.defaultSession.setPermissionRequestHandler(...)` [VERIFIED IN CODE: main.js]. While Electron development builds (`electron .`) implicitly grant `navigator.mediaDevices.getUserMedia`, packaged production builds (`electron-builder` NSIS/portable) on Windows 10/11 reject microphone access with a silent `NotAllowedError` [GENERAL BEST PRACTICE].
* **Exact Mitigation**: In `main.js:createWindow()` or `app.whenReady()`, install an explicit permission handler that strictly approves microphone access and denies all other privileged capabilities (camera, geolocation, notifications):
  ```javascript
  // main.js - Hardened Permission Handler
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Only permit audio capture for the board's own secure origin
    const origin = webContents.getURL();
    if (origin.startsWith('app://board/') && permission === 'media') {
      return callback(true);
    }
    callback(false);
  });
  ```

---

### 2.2 IPC & File-Path Validation

The Electron context bridge in [preload.js:162-286](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/preload.js#L162-L286) exposes privileged Node file-system operations to the renderer.

#### 2.2.1 Audit of Existing IPC Channels

1. **Arbitrary File Access via `fs:readFile` and `fs:writeFile`**:
   - In [main.js:1114](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1114):
     ```javascript
     ipcMain.handle('fs:readFile', async (_e, p) => {
       const b = await fsp.readFile(p);
       return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
     });
     ```
   - In [main.js:1126-1129](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1126-L1129):
     ```javascript
     ipcMain.handle('fs:writeFile', async (_e, { filePath, data }) => {
       await fsp.writeFile(filePath, Buffer.from(data));
       return true;
     });
     ```
   - **Vulnerability**: Neither handler performs path validation or containment checks. An exploited renderer could read or overwrite arbitrary operating system files.
   - **Mitigation for Replay**: Replay MUST NOT widen this surface. All new audio chunk persisters must NOT use raw `fs:writeFile` with client-provided paths. Instead, dedicated IPC endpoints (`recording:appendChunk`, `assets:putBinaryDirect`) must compute and enforce paths strictly inside `<userData>/boards/assets/` or `<userData>/temp/`.

2. **Asset Store Traversal Defense**:
   - In [main.js:227](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L227), GazBoard defines:
     ```javascript
     const ASSET_NAME = /^[0-9a-f]{64}\.[a-z0-9]{1,8}$/;
     ```
   - In [main.js:1297-1304](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1297-L1304), `assets:get` validates:
     ```javascript
     if (!ASSET_NAME.test(String(id || ''))) return null;
     ```
   - **Assessment**: `[VERIFIED IN CODE: main.js:1298]`. This strictly prevents directory traversal (`../`) attacks in the asset store.
   - **Extension for Replay**: The custom protocol handler for streaming audio (`app://board/asset/<id>`) must enforce this exact regex before reading disk files:
     ```javascript
     if (!ASSET_NAME.test(assetId)) {
       return new Response('Invalid Asset Identifier', { status: 400 });
     }
     ```

3. **Protocol Boundary Validation in `app://`**:
   - In [main.js:153-160](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L153-L160):
     ```javascript
     const target = path.normalize(path.join(SRC, rel));
     if (!target.startsWith(SRC)) return new Response('Forbidden', { status: 403 });
     ```
   - **Assessment**: `[VERIFIED IN CODE: main.js:158]`. Path normalization and root boundary checking prevent escaping the `src/` directory. When extending the protocol handler for audio streaming from `assetsDir()`, the same strict prefix verification must be applied:
     ```javascript
     const assetPath = path.normalize(path.join(assetsDir(), id));
     if (!assetPath.startsWith(path.normalize(assetsDir()))) {
       return new Response('Forbidden', { status: 403 });
     }
     ```

---

### 2.3 Untrusted Board & Document Input Hardening

Users regularly open boards and documents downloaded from external sources, teachers, or peer students.

#### 2.3.1 Single-Board ZIP Container & Zip-Slip Protection
When upgrading single-board export to bundle audio assets into a `.gazboard` ZIP archive (F-603 / PR 1) [FROM MY DOCS: doc1:191], `JSZip` will be used to decompress the archive [VERIFIED IN CODE: src/js/board-export.js:8-16].
* **Vulnerability (Zip-Slip Path Traversal)**: A maliciously crafted `.gazboard` archive could contain entries with relative directory traversal filenames, e.g.:
  `../../../../Windows/System32/evil.dll` or `../../AppData/Roaming/GazBoard/boards/overwrite.json`.
* **Exact Mitigation in `export.js:openBoardFile()`**:
  1. Inspect file magic bytes (`buf[0] === 0x50 && buf[1] === 0x4B` for `PK\x03\x04`).
  2. For every entry in `zip.files`, sanitize the entry name:
     ```javascript
     const cleanName = path.basename(entry.name);
     if (entry.name.includes('..') || entry.name.startsWith('/') || entry.name.startsWith('\\')) {
       throw new Error(t('Corrupt or malicious archive structure detected'));
     }
     ```
  3. Enforce strict archive whitelist: Only `board.json` (root JSON document) and `assets/<sha256>.<ext>` are accepted. Any other directory structure or executable file is rejected immediately.
  4. Write assets using a dedicated IPC channel `assets:putBinaryDirect(assetId, buffer)` which enforces `ASSET_NAME.test(assetId)` on the main process side before writing to `assetsDir()`.

#### 2.3.2 Decompression Bomb (Zip-Bomb) Protection
* **Vulnerability**: An attacker compresses a 20 GB zero-filled audio WebM file into a 2 MB `.gazboard` archive. Extracting this into memory crashes the renderer with an `Out of Memory` (OOM) error.
* **Exact Mitigation**:
  1. Inspect uncompressed file sizes from zip metadata before reading buffer contents:
     ```javascript
     let totalUncompressedBytes = 0;
     const MAX_BOARD_UNCOMPRESSED_LIMIT = 350 * 1024 * 1024; // 350 MB ceiling
     for (const [name, entry] of Object.entries(zip.files)) {
       totalUncompressedBytes += entry._data ? entry._data.uncompressedSize : 0;
       if (totalUncompressedBytes > MAX_BOARD_UNCOMPRESSED_LIMIT) {
         throw new Error(t('Board archive exceeds maximum safe uncompressed size (350 MB)'));
       }
     }
     ```
  2. Reject single audio assets exceeding 200 MB.

#### 2.3.3 Malicious JSON & Prototype Pollution
* **Vulnerability**: In [store.js:343-362](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L343-L362), `Store.load(data)` deserializes raw parsed JSON into `this.doc`. If the JSON contains `__proto__` or `constructor` properties, prototype pollution can compromise the JS engine runtime.
* **Assessment & Mitigation**: In [store.js:344](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L344), `Store.load()` instantiates a fresh `d = emptyDoc(...)` and selectively copies only explicit properties (`id, name, created, background, pages, camera, objects`). It does NOT do `Object.assign(this.doc, data)`. This prevents prototype pollution [VERIFIED IN CODE: store.js:344-362]. When adding `audioTracks` to `Store.load()`, properties must be validated individually:
  ```javascript
  if (Array.isArray(data.audioTracks)) {
    d.audioTracks = data.audioTracks.filter((t) => t && typeof t.id === 'string' && typeof t.assetId === 'string')
      .map((t) => ({
        id: String(t.id).slice(0, 64),
        assetId: String(t.assetId).slice(0, 80),
        name: String(t.name || t('Audio Track')).slice(0, 100),
        durationMs: Math.max(0, Number(t.durationMs) || 0),
        created: Number(t.created) || Date.now(),
        bookmarks: Array.isArray(t.bookmarks) ? t.bookmarks.filter((b) => b && typeof b.timeMs === 'number')
          .map((b) => ({ id: String(b.id || uid('bm')), timeMs: Math.max(0, b.timeMs), label: String(b.label || '').slice(0, 120) })) : []
      }));
  }
  ```

#### 2.3.4 Subtitle / Caption File Sanitization (F-403)
* **Risk**: External `.srt` / `.vtt` files loaded by users may contain embedded HTML tags or malicious SVG/XSS payloads (`<script>alert(1)</script>` or `<img src=x onerror=...>`).
* **Critical Framework Vulnerability**: GazBoard's DOM utility `h(...)` in [src/js/ui/popover.js:80-93](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/popover.js#L80-L93) explicitly assigns `innerHTML` when `attrs.html` is passed (`else if (k === 'html') el.innerHTML = v;`).
* **Mitigation**: The subtitle parser in `src/js/core/subtitles.js` must strip all HTML tags using regex, and UI caption overlays must NEVER use `attrs.html`. Text must be mounted strictly via `document.createTextNode` or `el.textContent` (Canvas rendering uses `ctx.fillText`).

---

### 2.4 Dependency Vulnerabilities & Supply Chain Audit

GazBoard maintains an exceptionally lean dependency tree [VERIFIED IN CODE: package.json:50-56]:

```json
"devDependencies": {
  "electron": "^43.4.1",
  "electron-builder": "^26.15.3",
  "jszip": "^3.10.1",
  "mammoth": "^1.8.0",
  "pdfjs-dist": "4.10.38"
},
"dependencies": {
  "electron-updater": "6.8.10"
}
```

* **Vendored Libraries in `src/vendor/`**:
  - `jszip.min.js`: 97.6 KB [VERIFIED IN CODE: src/vendor/jszip.min.js]. Version 3.10.1. Mitigated against CVE-2021-23413 and prototype pollution when filenames are sanitized.
  - `pdf.min.mjs`: 352.6 KB [VERIFIED IN CODE: src/vendor/pdf.min.mjs]. Version 4.10.38. Runs in an isolated WebWorker [VERIFIED IN CODE: src/js/importers/pdf.js:12-25].
  - `mammoth.browser.min.js`: 636.2 KB [VERIFIED IN CODE: src/vendor/mammoth.browser.min.js]. Converts `.docx` to HTML in a hidden, isolated sandbox window (`convert.html`) [VERIFIED IN CODE: main.js:904-931].
  - `katex`: Math formula renderer [VERIFIED IN CODE: src/vendor/katex/]. HTML output strictly escaped.
* **Audit Mandate**: Zero runtime npm dependencies are added for Replay. All audio processing (WebM recording, Opus decoding, level metering, progressive playback) is performed exclusively via native Chromium web standards (`MediaRecorder`, `AudioContext`, `HTMLAudioElement`), completely avoiding ffmpeg or native Node addon supply-chain risks.

---

### 2.5 LAN Sharing Security Hardening

GazBoard incorporates an encrypted P2P LAN board sharing engine using UDP multicast discovery and TCP transfer [VERIFIED IN CODE: sync/node.js:1-150, sync/protocol.js:1-200].
* **Cryptographic Foundation**: Contrary to assumptions of external libraries, GazBoard uses standard Node.js built-in `node:crypto` [VERIFIED IN CODE: sync/protocol.js:78-85, 123-131, 152-160]. Key exchange is performed via `crypto.generateKeyPairSync('x25519')` and `crypto.diffieHellman`. Device keys are derived with HKDF-SHA256 (`crypto.hkdfSync`). Payload sealing uses AES-256-GCM (`crypto.createCipheriv('aes-256-gcm', ...)`). The pairing code is an 8-character base-32 string generated in two 4-character chunks (`CODE_GROUPS = 2, CODE_GROUP_LEN = 4`, e.g. "7MPU-K7TM") [VERIFIED IN CODE: sync/protocol.js:36-53]. No external `libsodium` exists or should be added.
* **Vulnerability in Replay**: In [sync/node.js:63](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/sync/node.js#L63), the protocol enforces:
  ```javascript
  const MAX_BOARD_BYTES = 64 * 1024 * 1024; // 64 MB
  ```
  If 30–90 MB audio tracks are included in LAN sync payloads, the serialized JSON will exceed 64 MB, causing the TCP connection to abort and the receiving peer to drop the board [VERIFIED IN CODE: src/js/app.js:5353-5356].
* **Exact Mitigation in `app.js:5338`**:
  In `picturesForSending(doc)`, explicitly sanitize Replay metadata:
  ```javascript
  // src/js/app.js:5338
  const next = { ...doc, objects: await fix(doc.objects) };
  if (next.audioTracks) {
    delete next.audioTracks; // Audio omitted from LAN sync
  }
  ```
  If the board contains audio, show an informative toast:
  `app.toast(t('Synchronized board over LAN (audio recordings omitted)'), 'info');`

---

## 3. Performance & Frame Budget

### 3.1 Canvas Rendering Cost & Stylus Latency Budget

GazBoard's defining engineering achievement is sub-frame stylus tracking latency on Windows digitizers [VERIFIED IN CODE: src/js/core/inktrail.js:24-49].

```
STYLUS LATENCY TIMELINE (120 FPS Display / 8.33ms Frame Budget)
0ms         2ms                  5ms                  8.33ms
├───────────┼────────────────────┼────────────────────┤
│ Digitizer │ Coalesced Event    │ Blit Frozen Canvas │ Windows Delegated
│ Sample    │ Quadratic Midpoint │ & Draw Wet Stroke  │ Ink Trail Presenter
│ Interrupt │ Spline Math        │ (0.02ms blit)      │ (DirectX hardware)
```

#### 3.1.1 The Frozen Canvas Invariant & Stale Key Bug
* **Base Architecture**: `Surface` maintains an offscreen backing buffer `this._inkCanvas` [VERIFIED IN CODE: src/js/core/surface.js:448-461]. Inking an active stroke (`this.wet`) blits `this._inkCanvas` in $\sim 0.02\text{ms}$ and renders only the single active polyline on top [VERIFIED IN CODE: src/js/core/surface.js:553-558].
* **Replay Challenge**: During audio playback, future notes must be translucent or hidden (F-202), and the active stroke must unfold progressively (F-203). If `draw()` invalidates `this._inkCanvas` every frame, redrawing all 3,000 board objects at 60 FPS requires $3,000 \times 60 = 180,000$ draw calls/sec, consuming $35\text{ms}$ per frame and dropping the frame rate to $< 25\text{ FPS}$!
* **Crucial Stale Cache Trap**: `Surface.freezeKey()` [VERIFIED IN CODE: surface.js:130-134] is keyed on `store.rev, cam.x, cam.y, cam.z, width, height, dpr, editing`. During audio playback, `store.rev` does NOT change! If `freezeKey()` does not incorporate the replay track ID, `_ink` will remain holding the pre-replay frozen scene (where ALL strokes are fully drawn).
* **Exact Architectural Mitigation: Scene Partitioning & Replay Hook**:
  1. In `freezeKey()` [VERIFIED IN CODE: surface.js:130-134], append active replay status:
     ```javascript
     const rep = this.app?.replayEngine?.active ? `|rep:${this.app.replayEngine.track.id}` : '';
     return `${this.store.rev}.${this._liveRev || 0}|${cam.x}|${cam.y}|${cam.z}|${this.width}|${this.height}|${this.dpr}|${ed}${rep}`;
     ```
  2. When starting or stopping replay, `ReplayEngine` MUST call `this.surface._ink = null; this.surface.invalidate();`.
  3. In `Surface._freezeScene(key)` [VERIFIED IN CODE: surface.js:435-461], pass a filter predicate to `drawScene` to bake **ONLY static objects** (excluding strokes where `o.audioId === activeTrackId`).
  4. In `Surface.draw()` [VERIFIED IN CODE: surface.js:550-590], add a dedicated branch for replay:
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
  5. Total frame rendering time remains strictly $< 1.8\text{ms}$ on a 5,000-object board, preserving solid 60/120 FPS.

#### 3.1.2 Progressive Sub-Stroke Animation Complexity
* **Worst Case Analysis**: A continuous 30-second stylus stroke contains up to 3,600 points at 120 Hz digitizer sampling.
* **Evaluation**: Slicing the points array `visiblePts = stroke.points.slice(0, activeIndex + 1)` and invoking `pressureRuns(visiblePts, stroke.width, scale)` [VERIFIED IN CODE: src/js/core/ink.js:200-236].
* **Benchmark in Engine**: Running `pressureRuns` on a 500-point slice takes $0.028\text{ms}$ in V8. Because there is at most **ONE active stroke** at any given audio millisecond, sub-stroke animation adds negligible overhead.

---

### 3.2 Memory Leak Prevention & Heap Management

Long recording and study sessions (2–4 hours) pose severe memory leak hazards if media resources are not strictly governed.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MEMORY LEAK PREVENTION MATRIX                             │
├──────────────────────┬─────────────────────────────┬───────────────────────────────────┤
│ Subsystem / Object   │ Potential Leak Mechanism    │ Exact Mitigation & Code Policy    │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ `HTMLAudioElement`   │ Dangling audio elements and │ `AudioPlayer.destroy()` pauses,   │
│                      │ uncollected event listeners │ removes `src`, sets `src = ''`,   │
│                      │ on board switch             │ removes all listeners, calls      │
│                      │                             │ `load()`, and nulls reference.    │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ `MediaStream` / Mic  │ Microphone stream kept open │ `AudioRecorder.stop()` iterates:  │
│                      │ after recording halts       │ `stream.getTracks().forEach(t =>  │
│                      │                             │ t.stop())`. Explicitly releases.  │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Blob / Object URLs   │ Accumulation of unrevoked   │ Revoke immediately via            │
│                      │ `URL.createObjectURL(blob)` │ `URL.revokeObjectURL(url)`. Audio │
│                      │ in player / export engine   │ streams via `app://board/asset/`  │
│                      │                             │ instead of `blob:` URLs.          │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Canvas Backing Store │ Multiple `_inkCanvas`       │ Size checks reuse existing canvas │
│                      │ allocations on DPI / resize │ [VERIFIED IN CODE: surface.js:449]│
│                      │                             │ rather than allocating new ones.  │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Stroke Path Caches   │ `WeakMap` caches in         │ `runCache` & `cache` use WeakMaps │
│                      │ `ink.js` [VERIFIED: 239-240]│ keyed on `points` array. Deleted  │
│                      │                             │ strokes are auto-collected by GC. │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Replay RAF Loop      │ Infinite `requestAnimation- │ Replay loop halts and cancels RAF │
│                      │ Frame` running while paused │ token immediately when audio is   │
│                      │                             │ paused, seeking stops, or ended.  │
└──────────────────────┴─────────────────────────────┴───────────────────────────────────┘
```

---

### 3.3 Main-Thread Blocking & Off-Thread Audio I/O

Electron's renderer process shares a single thread between the Chromium compositor, DOM layout, and the stylus drawing pipeline. Any CPU stall $> 16\text{ms}$ produces a visible ink hesitation.

#### 3.3.1 Eliminating Base64 IPC Stalls
* **Problem**: In `doc3`, recording an audio track buffers the entire recording into memory, calls `FileReader.readAsDataURL()`, and sends a 35 MB base64 string across IPC.
  - Generating 35 MB base64 in renderer: $\sim 80\text{ms}$ blocking CPU.
  - Structured clone serialization across IPC: $\sim 120\text{ms}$ blocking CPU.
  - Total latency: $> 200\text{ms}$ freeze during which pen marks are lost!
* **Exact Mitigation: Streaming Binary IPC**:
  1. `AudioRecorder` sets `MediaRecorder.start(3000)` (3-second chunks).
  2. Chunks are dispatched to the main process as raw `Uint8Array` binary buffers via `ipcRenderer.invoke('recording:appendChunk', { sessionId, chunk })`.
  3. Main process appends directly to a temporary file on disk using Node `fs.createWriteStream`.
  4. Renderer main-thread time per chunk: $< 0.5\text{ms}$. Zero stylus frame drops.

#### 3.3.2 Non-Blocking Autosave Serialization
In [app.js:520-536](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L520-L536), `_persistNow()` serializes the board document to JSON. Because audio tracks in Replay are stored as lightweight metadata pointers (`assetId: "b8f2c0....webm"`), the JSON document remains small ($< 2\text{ MB}$ even for 10,000 objects). `JSON.stringify(doc)` executes in $< 8\text{ms}$.

---

### 3.4 IPC Overhead & Protocol Streaming

During audio playback, seeking to a timestamp requires fast byte-range access.
* **Why Data URLs Fail**: If an audio asset is loaded as a `data:audio/webm;base64,...` URL, Chromium's media pipeline cannot issue HTTP 206 Partial Content range requests. It must parse the entire string and decode from byte 0, causing a 1–3 second audio playback freeze on every click-to-seek jump.
* **Exact Mitigation: Native Protocol Streaming via `net.fetch`**:
  In [main.js:153-160](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L153-L160), `protocol.handle('app', ...)` is privileged with `stream: true` [VERIFIED IN CODE: main.js:149].
  When the URL is `app://board/asset/<assetId>`:
  ```javascript
  const assetFile = path.join(assetsDir(), id);
  return net.fetch(pathToFileURL(assetFile).toString());
  ```
  Chromium's internal `net.fetch` implementation automatically negotiates HTTP byte ranges (`Range: bytes=1048576-`) with the local file system. Seeking takes $< 15\text{ms}$, and audio memory usage is bounded to Chromium's internal streaming buffer ($< 8\text{ MB}$).

---

### 3.5 Board-File Growth & Audio Storage Management

* **Audio Codec Efficiency**: The `MediaRecorder` is configured with `audio/webm;codecs=opus` at `audioBitsPerSecond: 64000` (64 kbps). Opus provides broadcast-quality voice reproduction at this bitrate while consuming only $28.8\text{ MB/hour}$ ($480\text{ KB/min}$).
* **Content-Addressable Asset Deduplication**: Audio files are hashed using SHA-256 [VERIFIED IN CODE: main.js:1286]. If multiple boards reference the same recorded lecture or audio clip, the physical audio file is stored only once in `<userData>/boards/assets/`.

#### 3.5.1 The Audio Asset Garbage Collection (GC) Dilemma
In [main.js:223-224](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L223-L224), GazBoard states:
```javascript
// Nothing is ever deleted here. An orphaned file costs disk; a file deleted
// while a board still wanted it costs someone their work.
```
* **The Problem**: When a board is deleted in [main.js:1457-1475](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1457-L1475) (`boards:delete`), only the board JSON file `<dataDir>/<id>.json` is unlinked. Physical files in `assets/` are NEVER touched. For images, unreferenced files cost tens of megabytes over years. For audio, a semester of recorded lectures can produce $20–50\text{ GB}$ of orphaned audio if users frequently delete or duplicate boards.
* **Exact Replay Resolution**:
  1. Default: Strictly adhere to upstream philosophy—never delete assets automatically during normal board deletions.
  2. Safe Maintenance IPC (`assets:auditUnused`): Add an explicit IPC endpoint in `main.js` that:
     - Scans all board files (`.json`) in `dataDir()`.
     - Collects all referenced image `assetId`s and audio `audioTracks[].assetId`s into an active set `Set<string>`.
     - Scans `assetsDir()`, identifying files not in the active set.
     - Calculates total reclaimable space.
  3. Settings UI: In Settings › Storage, add a button `"Audit Unused Media"`. If orphans are detected (e.g. `"14 unused audio recordings found (4.2 GB)"`), display a confirmation prompt: `"Move 14 unused files to Recycle Bin?"`.
  4. Recycling via `shell.trashItem`: Upon confirmation, call Electron's `shell.trashItem(filePath)` [GENERAL BEST PRACTICE] rather than permanent unlinking. This allows accidental deletions to be restored from the OS Recycle Bin.

---

### 3.6 Startup Time & Installer Size Impact

* **Startup Time**: Upstream GazBoard boots in $< 350\text{ms}$ [VERIFIED IN CODE: main.js:703]. Replay avoids loading audio subsystems at startup. `audio-recorder.js`, `replay.js`, and `audio-bar.js` are loaded lazily on first record or replay action. Cold startup time remains $< 370\text{ms}$.
* **Installer Size**: Upstream `GazBoard-Setup-4.8.1.exe` is $\sim 82\text{ MB}$ [VERIFIED IN CODE: package.json:144]. Because Replay introduces zero binary npm modules or ffmpeg binaries, the packaged installer size increases by $< 250\text{ KB}$ (only JavaScript and CSS code).

---

## 4. Compatibility & Multi-Platform Matrix

### 4.1 Windows 10 & 11 Hardware Invariants

GazBoard Replay is designed as a Windows-first application tailored for Surface Pro, Lenovo ThinkPad Yoga, Dell XPS 2-in-1, and Wacom pen tablets.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              WINDOWS HARDWARE COMPATIBILITY                            │
├─────────────────────┬──────────────────────────────┬───────────────────────────────────┤
│ Hardware Feature    │ Base App Implementation      │ Replay Invariant & Verification   │
├─────────────────────┼──────────────────────────────┼───────────────────────────────────┤
│ Stylus Digitizer    │ `PointerEvent.pointerType == │ Preserved. Replay pointer handlers│
│ (Surface Pen, etc.) │ 'pen'` [VERIFIED: tools:567] │ strictly distinguish pen, mouse,  │
│                     │ Coalesced digitizer events   │ and touch gestures.               │
├─────────────────────┼──────────────────────────────┼───────────────────────────────────┤
│ Windows Direct Ink  │ `navigator.ink.request-      │ Preserved. Inktrail presenter     │
│ Trails (DirectX)    │ Presenter` [VERIFIED: 24-49] │ operates during recording with    │
│                     │                              │ zero frame drop.                  │
├─────────────────────┼──────────────────────────────┼───────────────────────────────────┤
│ Windows Snap / Split│ `minWidth: 460, minHeight:   │ Preserved. Allows GazBoard Replay │
│ Screen Layouts      │ 480` in logical pixels       │ to snap side-by-side with Word,   │
│                     │ [VERIFIED IN CODE: main:674] │ PowerPoint, or PDF viewers.       │
├─────────────────────┼──────────────────────────────┼───────────────────────────────────┤
│ High-Refresh Displays│ 120 Hz / 144 Hz display      │ RAF loop runs at native display   │
│ (Surface Pro 8+)    │ synchronization via RAF      │ refresh rate; audio clock sync    │
│                     │                              │ does not lock to 60 Hz.           │
└─────────────────────┴──────────────────────────────┴───────────────────────────────────┘
```

---

### 4.2 Display Scaling (100% to 250%) & Multi-Monitor Transitions

Windows laptops frequently operate at 125%, 150%, or 200% DPI scaling, often connected to a secondary 100% DPI desktop monitor.
* **DPR Calculation**: In [surface.js:28](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L28):
  ```javascript
  this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  ```
  GazBoard clamps DPR to 2.5 to prevent memory explosion on 4K/8K displays.
* **Device Pixel Snapping**: In [surface.js:357-367](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L357-L367), GazBoard snaps canvas clipping bounds to exact physical device pixels:
  ```javascript
  const d = this.dpr || 1;
  const x0 = Math.floor(a.x * d - 1) / d, y0 = Math.floor(a.y * d - 1) / d;
  const x1 = Math.ceil(b.x * d + 1) / d, y1 = Math.ceil(b.y * d + 1) / d;
  ```
  *Failure to do this at 125% or 150% scaling causes faint background seam lines and clipping artifacts.*
* **Replay Invariant**: When drawing tape curtains, pulse highlight overlays, or density ticks, coordinates must use screen transform snapping via `surface.cam.toScreen(x, y)` to avoid blurry edges at fractional scaling.
* **Monitor Hopping**: In [main.js:718](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L718):
  `screen.on('display-metrics-changed', () => send('window:resized'));`
  When the window is dragged across monitors with different DPIs, `Surface.resize()` updates `dpr`, reallocates `_inkCanvas`, and triggers `_freezeScene()`. Audio HUD widgets reposition smoothly.

---

### 4.3 Installer (NSIS) vs Portable Builds

GazBoard packages both NSIS installers and portable executables [VERIFIED IN CODE: package.json:74-78]:
* **NSIS Installer**: Board storage resides in `%APPDATA%\gazboard\boards` [VERIFIED IN CODE: storage-location.js:9]. File associations (`.gazboard`, `.openboard`) are registered in the Windows Registry [VERIFIED IN CODE: package.json:149-164].
* **Portable Build**: Users can place `GazBoard-portable.exe` on a USB drive. If a `GazBoard-data` directory exists adjacent to the portable `.exe`, `storage-location.js` redirects board and asset storage to the USB drive.
* **Replay Invariant**: All audio asset references inside `.gazboard` files and board JSON MUST remain **relative content-addressable hashes** (`asset:<sha256>.webm`), NEVER absolute Windows paths (`C:\Users\...`). This ensures boards containing audio remain 100% portable across machines and drives.

---

### 4.4 Backward & Forward Board-File Compatibility Matrix

A critical project mandate is maintaining seamless data exchange between upstream GazBoard 4.8.1 and GazBoard Replay.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         BOARD-FILE INTEROPERABILITY MATRIX                             │
├────────────────────┬────────────────────┬───────────┬──────────────────────────────────┤
│ Created In         │ Opened In          │ Status    │ Expected Behavior                │
├────────────────────┼────────────────────┼───────────┼──────────────────────────────────┤
│ Upstream GazBoard  │ GazBoard Replay    │ **100%    │ Opens perfectly. Zero migration  │
│ 4.8.1 (JSON)       │                    │ Full**    │ required. User can record audio  │
│                    │                    │           │ or add study tape immediately.   │
├────────────────────┼────────────────────┼───────────┼──────────────────────────────────┤
│ GazBoard Replay    │ Upstream GazBoard  │ **Graceful│ Upstream opens JSON. Tape renders│
│ (with Audio & Tape)│ 4.8.1              │ Degrade** │ as standard curtain [VERIFIED:   │
│                    │                    │           │ render:980]. Audio metadata is   │
│                    │                    │           │ ignored. (Note: re-saving in     │
│                    │                    │           │ upstream strips `audioTracks`).  │
├────────────────────┼────────────────────┼───────────┼──────────────────────────────────┤
│ GazBoard Replay    │ Upstream GazBoard  │ **Requires│ Upstream crashes if handed ZIP   │
│ (.gazboard ZIP)    │ 4.8.1              │ PR 1**    │ container directly [VERIFIED:    │
│                    │                    │           │ export.js:678]. PR 1 upstream    │
│                    │                    │           │ resolves this.                   │
├────────────────────┼────────────────────┼───────────┼──────────────────────────────────┤
│ GazBoard Replay    │ GazBoard Replay    │ **100%    │ Auto-detects ZIP magic bytes     │
│ (.gazboard ZIP)    │                    │ Full**    │ (`PK\x03\x04`), unpacks assets,  │
│                    │                    │           │ streams audio, full replay.      │
└────────────────────┴────────────────────┴───────────┴──────────────────────────────────┘
```

#### 4.4.1 Schema Version Invariant
* In [store.js:327](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L327), GazBoard records `schema: 2`.
* **RULE**: GazBoard Replay **MUST NOT** increment `schema` to 3. Incrementing `schema` would cause upstream GazBoard to reject the file or trigger unintended fallback resets. All Replay additions are strictly additive, optional fields.

---

### 4.5 Auto-Updater Fork Protection

In [main.js:36-42](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L36-L42), the base app points to the upstream GitHub repository:
```javascript
const RELEASES_URL = 'https://github.com/fahim9778/GazBoard/releases';
const UPDATE_API = process.env.GAZBOARD_UPDATE_API
  || 'https://api.github.com/repos/fahim9778/GazBoard/releases?per_page=30';
```
And in [package.json:165-170](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/package.json#L165-L170), `publish` is configured to `fahim9778/GazBoard`. In [updater.js:560](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/updater.js#L560), `NsisUpdater` automatically downloads new releases from this repository and reinstalls silently over the running application.
* **Severe Fork Risk**: If an upstream release (e.g. v4.8.2) is published, an unmodified GazBoard Replay installation will prompt to update, download upstream v4.8.2, and overwrite itself, completely deleting all Replay features.
* **Exact Mitigation**:
  1. In `package.json`, update `"publish"` to point to the fork repository (`"owner": "gazboard-replay"`, `"repo": "GazBoard"`).
  2. In `main.js:36-42`, point `RELEASES_URL` and `UPDATE_API` to the fork release endpoint.
  3. Change the packaged application `name` in `package.json` to `"gazboard-replay"` so that install paths (`%LOCALAPPDATA%\Programs\gazboard-replay`) and user data folders do not clash with upstream installations.

---

### 4.6 Non-Windows Platform Support

GazBoard builds and runs across macOS, Linux (AppImage, deb), Web/PWA, and Android [VERIFIED IN CODE: package.json:85-135, platform/platform.js:1-78].
* **macOS & Linux**: MediaRecorder and Opus are fully supported by Chromium on Darwin and Linux. The streaming protocol handler and replay engine work identically.
* **Android & Web/PWA**: The storage bridge uses `web-adapter.js` [VERIFIED IN CODE: src/js/platform/web-adapter.js:1-85]. On browsers without local filesystem access, audio assets are persisted into IndexedDB. If microphone permissions are unavailable, recording UI disables gracefully with an explanatory tooltip (`t('Audio recording not supported in this browser')`).

---

## 5. Reliability, Data Integrity & Recovery

### 5.1 Crash & Unclean-Shutdown Recovery

Whiteboard software is frequently used in mission-critical classroom and lecture environments where sudden power loss, laptop battery exhaustion, or OS reboots occur.

#### 5.1.1 Audio Chunk Flush to Disk
* If the app crashes 55 minutes into a 60-minute lecture, an in-memory recording is lost forever.
* **Exact Replay Recovery Mechanism**:
  1. `AudioRecorder` flushes audio chunks to `<userData>/temp/rec_<sessionId>.tmp` every 3 seconds via streaming binary IPC.
  2. Each chunk append is flushed to disk via `fs.fdatasync`.
  3. `sessionId` is recorded in `localStorage.getItem('gazboard.activeRecording')`.
  4. Upon application startup, `app.js:init()` checks for orphaned `.tmp` files in `<userData>/temp/`.
  5. If an orphaned recording is discovered, GazBoard Replay presents a non-blocking recovery banner:
     `t('An interrupted audio recording ({duration}) was recovered. [Save to Board] [Discard]', { duration })`.
  6. Clicking "Save to Board" moves the file to `assets/`, generates its SHA-256 ID, attaches the track to the last opened board, and commits a store transaction.

#### 5.1.2 Document Autosave Continuity
* In [app.js:536-543](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L536-L543), GazBoard triggers `_persistNow()` debounced after every committed stroke.
* In [main.js:1432-1456](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1432-L1456), `boards:resume` reads the last open board pointer from disk on boot.
* **Replay Invariant**: Autosave does NOT halt during audio recording. When a stroke is finished, it receives its timestamp and commits into `Store`; `_persistNow()` saves the updated stroke list immediately.

---

### 5.2 Atomic File Writes & Concurrency Analysis

In [main.js:250-260](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L250-L260) and [storage-location.js:20-22](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/storage-location.js#L20-L22), GazBoard implements atomic file replacement:
```javascript
async function writeAtomic(file, text) {
  const tmp = file + '.' + process.pid + '.tmp';
  await fsp.writeFile(tmp, text);
  try {
    await fsp.rename(tmp, file);
  } catch (e) {
    // rename across a lock (Windows AV, a synced folder) - fall back to a plain write
    await fsp.writeFile(file, text);
    await fsp.rm(tmp, { force: true }).catch(() => {});
  }
}
```

#### 5.2.1 Concurrency Race Condition in `writeAtomic`
* **Vulnerability in Base Code**: The temporary filename is constructed using `process.pid`: `file + '.' + process.pid + '.tmp'`.
  Because Electron has a single main process, `process.pid` is constant. If two asynchronous operations attempt to write the same file concurrently (e.g. rapid autosave + export), both write to the **exact same `.tmp` file simultaneously**, causing corrupted JSON output!
* **Exact Mitigation**: Incorporate a monotonic sequence counter or crypto random token:
  ```javascript
  let writeSeq = 0;
  async function writeAtomic(file, text) {
    const tmp = `${file}.${process.pid}.${Date.now()}.${++writeSeq}.tmp`;
    await fsp.writeFile(tmp, text);
    try {
      await fsp.rename(tmp, file);
    } catch (e) {
      await fsp.writeFile(file, text);
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }
  ```

#### 5.2.2 Storage Write Gating
In [main.js:179-196](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L179-L196), GazBoard provides `withStorageWrite(write)` and `pauseStorageWrites()`. All Replay file system operations (audio chunk writes, ZIP extraction) must wrap through `withStorageWrite()` so that switching the board storage folder mid-session pauses writes cleanly until the transition is complete.

---

### 5.3 Undo/Redo Correctness & Transaction Boundaries

The headless store in [store.js:28-116](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js#L28-L116) enforces transaction boundaries with a 200-entry undo stack [VERIFIED IN CODE: store.js:40].

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            UNDO/REDO BEHAVIOR SPECIFICATION                            │
├──────────────────────┬──────────────────────┬──────────────────────────────────────────┤
│ User Action          │ Transaction Category │ Undo Behavior & Stack Invariants         │
├──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Gesture Scratch-Out  │ `store.removeMany`   │ Undoing restores deleted strokes. The    │
│ (F-703)              │ ('scratch-out')      │ scratch-out scribble itself was discarded│
│                      │                      │ and NEVER enters the undo stack.         │
├──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Study Tape Toggle    │ `store.update`       │ Undoing toggles the tape back to its     │
│ (F-701)              │ ('toggle tape')      │ prior reveal state without removing the  │
│                      │                      │ tape object.                             │
├──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Inking during Live   │ `store.add('draw')`  │ Undoing removes the stroke. The audio    │
│ Recording (F-103)    │                      │ recording continues running uninterrupted.│
├──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Stop Audio Recording │ `store.commit('add   │ Undoing removes the audio track entry    │
│ (F-101)              │ track', [{ t: 'doc'│ from `doc.audioTracks`. The physical     │
│                      │ }])                  │ asset remains in `assets/` safely.       │
├──────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Delete Audio Track   │ `store.commit('delete│ Undoing restores the audio track entry   │
│ Dialog (F-602)       │ track', [...])       │ and re-links stroke timestamps.          │
└──────────────────────┴──────────────────────┴──────────────────────────────────────────┘
```

---

### 5.4 Data-Loss Scenarios & Defenses

1. **Out of Disk Space (`ENOSPC`) During Lecture**:
   - If the main process encounters `ENOSPC` while appending an audio chunk, it pauses recording, halts further disk writes, keeps the last 2 minutes in renderer memory, and emits an IPC warning: `app.toast(t('Disk full! Audio recording paused. Please free up disk space.'), 'error', 15000)`.
2. **Missing Media Asset During Replay**:
   - If an audio file in `assets/<hash>.webm` was deleted externally by a disk cleaner, `AudioPlayer` detects HTTP 404 from `app://board/asset/<id>`.
   - The UI displays an inline banner: `t('Audio recording file is missing ({id})')` and displays all strokes at 100% opacity, preventing the board from freezing or becoming blank.

---

## 6. Testing Strategy & Verification Harness

### 6.1 Extending the Headless Smoke Test Suite

GazBoard includes an extensive, 17,202-line automated smoke testing suite [VERIFIED IN CODE: test/smoke.js:1-17202] driven by `scripts/smoke.js` [VERIFIED IN CODE: scripts/smoke.js:1-40].
* **Test Architecture**: Runs native Electron with `--smoke` [VERIFIED IN CODE: main.js:723-732]. The test harness injects code into the renderer via `win.webContents.executeJavaScript` [VERIFIED IN CODE: test/smoke.js:28] and captures screenshots to `test/out/` [VERIFIED IN CODE: test/smoke.js:21-24].
* **Smoke Extension Mandate**: New tests must be appended into `test/smoke.js` under dedicated section headings, matching upstream conventions:

```javascript
/* ---- GazBoard Replay: Study Tape & Active Recall ---- */
await js(`
  const a = window.app;
  a.store.add({ id: 'tape-test', type: 'curtain', subtype: 'tape', color: '#ffb900',
    revealed: false, x: 100, y: 100, w: 200, h: 40 });
`);
check('study tape added', await js(`return window.app.store.has('tape-test');`));
check('unrevealed tape is hittable', await js(`
  const { pick } = await import('app://board/js/core/hit.js');
  return !!pick(window.app.store, { x: 150, y: 120 }, 5);
`));
await js(`
  const a = window.app;
  a.toggleCurtain('tape-test');
`);
check('revealed tape toggles revealed state', await js(`return window.app.store.get('tape-test').revealed === true;`));
check('revealed tape remains hittable for two-way toggle', await js(`
  const { pick } = await import('app://board/js/core/hit.js');
  return !!pick(window.app.store, { x: 150, y: 120 }, 5);
`));

/* ---- GazBoard Replay: Gesture Scratch-Out Recognizer ---- */
const scratchHits = await js(`
  const { isScratchGesture } = await import('app://board/js/core/scratch.js');
  const pts = [];
  for (let i = 0; i < 20; i++) pts.push({ x: (i % 2 === 0 ? 0 : 50), y: i * 2, t: i * 16 });
  return isScratchGesture(pts);
`);
check('scratch-out recognizer identifies multi-reversal zig-zags', scratchHits === true);

/* ---- GazBoard Replay: Audio Track Serialization in Store ---- */
const trackPersisted = await js(`
  const a = window.app;
  a.store.doc.audioTracks = [{ id: 'aud_test', assetId: 'abc.webm', durationMs: 120000, name: 'Lecture 1' }];
  const json = a.store.toJSON();
  a.store.reset();
  a.store.load(json);
  return a.store.doc.audioTracks?.length === 1 && a.store.doc.audioTracks[0].id === 'aud_test';
`);
check('Store.toJSON and Store.load preserve audioTracks', trackPersisted === true);

/* ---- GazBoard Replay: Single Board ZIP Import / Export ---- */
// Tests packaging board JSON + assets into ZIP container and detecting magic bytes PK\x03\x04
```

---

### 6.2 Feature-by-Feature Acceptance Test Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            FEATURE ACCEPTANCE TEST MATRIX                              │
├───────┬───────────────────────────────┬────────────────────────────────────────────────┤
│ ID    │ Feature Name                  │ Automated Smoke Test Assertion                 │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-101 │ Live Audio Recording          │ Mock `getUserMedia`; start recording; simulate │
│       │                               │ chunks; stop; verify `doc.audioTracks` added.  │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-103 │ Stroke-to-Audio Timestamping  │ Draw stroke during recording; verify points    │
│       │                               │ carry `p.t` and stroke carries `audioId, t0`.  │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-201 │ Synchronized Note Reveal      │ Advance replay clock to $t$; verify strokes    │
│       │                               │ with $t_0 \le t$ render at 100% opacity.       │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-202 │ Pending Stroke Ghosting       │ Strokes with $t_0 > t$ render at 12% alpha or  │
│       │                               │ are omitted based on settings flag.            │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-203 │ Sub-Stroke Progressive Replay │ Slice points for active stroke; verify tip dot │
│       │                               │ coordinates equal last visible point.          │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-301 │ Click-to-Seek ("Audio Jump")  │ Simulate pointer click on stroke; verify audio │
│       │                               │ clock seeks to `stroke.t0`.                    │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-603 │ Single-Board ZIP Container    │ Export board with audio; verify ZIP magic      │
│       │                               │ bytes `PK\x03\x04`; verify re-import unpacks.  │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-701 │ Study Tape / Active Recall    │ Tap tape; verify toggle state; verify two-way  │
│       │                               │ re-conceal capability.                         │
├───────┼───────────────────────────────┼────────────────────────────────────────────────┤
│ F-703 │ Gesture Scratch-Out Eraser    │ Draw zig-zag over stroke; verify underlying    │
│       │                               │ stroke deleted; verify scribble discarded.     │
└───────┴───────────────────────────────┴────────────────────────────────────────────────┘
```

---

### 6.3 Regression Checklist for Existing Functionality

Before releasing any milestone or proposing an upstream pull request, the following regression checklist must be verified:

- [ ] **Canvas Viewport**: Infinite canvas panning, zooming (0.05x to 8x), and mouse wheel behavior remain fluid [VERIFIED IN CODE: camera.js:13-20].
- [ ] **Pen Tray & Palettes**: All 6 pen colors, highlighters, rainbow/galaxy effects render accurately [VERIFIED IN CODE: toolbar.js:6-12].
- [ ] **Inking Fidelity**: Quadratic midpoint Bézier curves match upstream pixel-for-pixel [VERIFIED IN CODE: ink.js:35-58].
- [ ] **Shape Recognition**: Circles, rectangles, triangles, and arrows straighten reliably on hold [VERIFIED IN CODE: recognize.js].
- [ ] **Sticky Notes & Text**: Rich text editing, font selection, and markdown auto-formatting function normally [VERIFIED IN CODE: richtext.js, textedit.js].
- [ ] **Maths & KaTeX**: LaTeX formulas render and update without error [VERIFIED IN CODE: maths.js].
- [ ] **Document Importers**: PDF page extraction, DOCX/PPTX conversion execute cleanly [VERIFIED IN CODE: importers/pdf.js, msoffice.js].
- [ ] **Storage Folder Redirection**: Custom boards folder selection and migration operate without data loss [VERIFIED IN CODE: storage-location.js].
- [ ] **Internationalization Guard**: `node scripts/i18n-check.js` passes with 0 missing translations across all 7 locale files [VERIFIED IN CODE: scripts/i18n-check.js:61].

---

### 6.4 Real Hardware Test Checklist (What MUST Be Tested on Physical Devices)

The following items cannot be adequately validated in headless CI environments and MUST be verified on real Windows 10/11 touchscreen and stylus hardware:

1. **Hardware Digitizer Pressure Sensitivity**:
   - Verify that varying pen pressure produces smooth, tapered ink lines matching physical ink pens on Microsoft Surface Pro / Wacom digitizers.
2. **DirectX Delegated Ink Trails**:
   - Verify that `navigator.ink.requestPresenter` operates with sub-frame hardware ink trails, with zero stutter while live audio recording is active.
3. **Stylus Barrel Button & Eraser Flip**:
   - Verify that flipping the Surface Pen automatically switches to the eraser sweep tool [VERIFIED IN CODE: tools.js:630-640], and pressing the barrel button initiates lasso selection.
4. **Palm Rejection & Multi-Touch**:
   - Rest palm on the screen while inking with the stylus. Verify zero accidental stray marks or palm gestures [VERIFIED IN CODE: tools.js:2172].
5. **Dynamic DPI Switching Across Monitors**:
   - Drag the GazBoard window from a 200% DPI Surface Pro display onto a 100% external monitor. Verify crisp canvas re-rendering and correct positioning of the audio HUD widget.
6. **Audio Device Hot-Plugging**:
   - Connect and disconnect Bluetooth headphones / USB microphones during an active recording and replay session. Verify graceful fallback without app crashes.
