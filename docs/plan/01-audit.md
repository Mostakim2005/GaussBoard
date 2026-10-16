# Phase 1: Base Application Technical Audit
**Project**: GazBoard Replay (Windows-first fork of GazBoard)  
**Target Repository**: `https://github.com/fahim9778/GazBoard`  
**Base App Version**: 4.8.1 (`package.json` [VERIFIED IN CODE: package.json:4])  
**Date**: October 2026  
**Status**: Plan Phase 1 Complete — Architectural & Security Audit

---

## 1. Architecture Map

GazBoard employs a decoupled, multi-process Electron architecture comprising an un-sandboxed Node.js Main Process and an unprivileged, vanilla JavaScript Chromium Renderer Process.

### 1.1 Process Model & High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ELECTRON MAIN PROCESS                                  │
│  main.js | storage-location.js | msoffice.js | soffice.js | updater.js | sync/node.js  │
│                                                                                        │
│  • App Lifecycle & Single Instance Lock (main.js:1544)                                 │
│  • Window Management (createWindow, convertWithHiddenWindow, printHtmlToPdf)          │
│  • Privileged app:// Protocol Server (main.js:148-160)                                 │
│  • Atomic File System I/O & Storage Redirection (main.js:250-265, storage-location.js) │
│  • Content-Addressable Asset Store: userData/boards/assets/ (main.js:1281-1304)        │
│  • Encrypted P2P LAN Transport: UDP multicast discovery + TCP AES-GCM (sync/node.js)   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ IPC Bridge (contextBridge via preload.js)
                                            │ window.board { readFile, writeFile, ... }
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                             CHROMIUM RENDERER PROCESS                                  │
│  src/index.html | src/js/app.js (Vanilla ES6+ Modules - Zero External UI Frameworks)    │
│                                                                                        │
│  ┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ UI & DOM Layer (src/js/ui/)             │  │ Canvas Viewport Engine              │  │
│  │ • toolbar.js (data-driven pen tray)     │  │ • surface.js (60-120 FPS RAF loop)  │  │
│  │ • panels.js (boards, canvas, export)    │  │ • camera.js (world-to-screen matrix)│  │
│  │ • timer.js (floating widgets)           │  │ • inktrail.js (Windows Ink presenter)│ │
│  └────────────────────┬────────────────────┘  └──────────────────┬──────────────────┘  │
│                       │                                          │                     │
│  ┌────────────────────▼────────────────────┐  ┌──────────────────▼──────────────────┐  │
│  │ Input & Tools (src/js/core/tools.js)    │  │ Canvas 2D Pipeline (core/render.js) │  │
│  │ • Coalesced hardware stylus events      │  │ • Quadratic midpoint curves (ink.js)│  │
│  │ • Pressure run quantisation (ink.js)    │  │ • Offscreen frozen cache (this._ink)│  │
│  │ • Gesture & shape recognition           │  │ • Screen-space overlays (overlays)  │  │
│  └────────────────────┬────────────────────┘  └──────────────────┬──────────────────┘  │
│                       │                                          │                     │
│  ┌────────────────────▼──────────────────────────────────────────▼──────────────────┐  │
│  │ Headless Transaction Store (src/js/core/store.js)                                │  │
│  │ • Operations: { t: 'add' | 'del' | 'set' | 'order' | 'doc' }                    │  │
│  │ • Undo / Redo Stacks (max 200) | Append-Only Replication Log (max 5000)          │  │
│  │ • Document Structure: doc.objects (dict by ID), doc.pages (vertical strip)      │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Preload Bridge & IPC Surface (`window.board`)
The interface between the Electron main process and renderer process is strictly isolated via `contextBridge.exposeInMainWorld('board', { ... })` in [preload.js:162-286](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/preload.js#L162-L286):

| Namespace / Method | Channel / Mechanism | Purpose | Input / Output Signatures |
| :--- | :--- | :--- | :--- |
| `board.info()` | `ipcRenderer.invoke('app:info')` | App version and host OS metadata [VERIFIED IN CODE: preload.js:163] | `() => Promise<{ version, platform, arch }>` |
| `board.readFile(p)` | `ipcRenderer.invoke('fs:readFile', p)` | Raw binary file read [VERIFIED IN CODE: preload.js:171, main.js:1114] | `(p: string) => Promise<ArrayBuffer>` |
| `board.writeFile(p, data)` | `ipcRenderer.invoke('fs:writeFile', ...)` | Raw binary file write [VERIFIED IN CODE: preload.js:182, main.js:1126] | `(filePath: string, data: ArrayBuffer) => Promise<boolean>` |
| `board.openDialog(opts)` | `ipcRenderer.invoke('dialog:open', opts)` | Native system open dialog [VERIFIED IN CODE: preload.js:183, main.js:1116] | `(opts: object) => Promise<string[]>` |
| `board.saveDialog(opts)` | `ipcRenderer.invoke('dialog:save', opts)` | Native system save dialog [VERIFIED IN CODE: preload.js:184, main.js:1121] | `(opts: object) => Promise<string \| null>` |
| `board.showItem(p)` | `ipcRenderer.invoke('shell:showItem', p)` | Highlight item in Explorer / Finder [VERIFIED IN CODE: preload.js:185, main.js:1131] | `(p: string) => void` |
| `board.openBoardsFolder()` | `ipcRenderer.invoke('shell:openBoards')` | Open boards storage directory [VERIFIED IN CODE: preload.js:186, main.js:1143] | `() => Promise<boolean>` |
| `board.storage.*` | `storage:get`, `choose`, `apply`, `reset`, etc. | Board folder migration and redirection [VERIFIED IN CODE: preload.js:187-199] | Get/set custom storage paths |
| `board.boards.list()` | `ipcRenderer.invoke('boards:list')` | Enumerate all `.json` boards [VERIFIED IN CODE: preload.js:212, main.js:1228] | `() => Promise<Array<{ id, name, modified, objects, thumb }>>` |
| `board.boards.load(id)` | `ipcRenderer.invoke('boards:load', id)` | Read single board document JSON [VERIFIED IN CODE: preload.js:213, main.js:1242] | `(id: string) => Promise<object \| null>` |
| `board.boards.save(payload)`| `ipcRenderer.invoke('boards:save', payload)`| Atomic board JSON persistence [VERIFIED IN CODE: preload.js:214, main.js:1249] | `(payload: { id, json, setLast? }) => Promise<boolean>` |
| `board.boards.remove(id)` | `ipcRenderer.invoke('boards:delete', id)` | Delete board JSON from disk [VERIFIED IN CODE: preload.js:215, main.js:1309] | `(id: string) => Promise<boolean>` |
| `board.boards.last()` | `ipcRenderer.invoke('boards:last')` | Read last active board pointer [VERIFIED IN CODE: preload.js:216, main.js:1316] | `() => Promise<string \| null>` |
| `board.boards.resume()` | `ipcRenderer.invoke('boards:resume')` | Get startup board payload [VERIFIED IN CODE: preload.js:218, main.js:1320] | `() => Promise<object \| null>` |
| `board.assets.put(dataUrl)` | `ipcRenderer.invoke('assets:put', dataUrl)` | SHA-256 deduplicated asset write [VERIFIED IN CODE: preload.js:224, main.js:1281] | `(dataUrl: string) => Promise<{ id: string } \| null>` |
| `board.assets.get(id)` | `ipcRenderer.invoke('assets:get', id)` | Read asset binary as data: URL [VERIFIED IN CODE: preload.js:225, main.js:1297] | `(id: string) => Promise<string \| null>` |
| `board.assets.have(ids)` | `ipcRenderer.invoke('assets:have', ids)` | Check existence of asset hashes [VERIFIED IN CODE: preload.js:226, main.js:1306] | `(ids: string[]) => Promise<Record<string, boolean>>` |
| `board.sync.*` | `sync:state`, `start`, `pairWith`, `send`, etc. | Encrypted LAN board transmission [VERIFIED IN CODE: preload.js:233-268] | P2P pairing, discovery, and file transfer |
| `board.importToPdf(f, opts)`| `ipcRenderer.invoke('import:toPdf', ...)` | Word/PowerPoint conversion to PDF [VERIFIED IN CODE: preload.js:270, main.js:952] | `(filePath: string, opts: object) => Promise<ArrayBuffer>` |
| `board.exportPdf(payload)` | `ipcRenderer.invoke('export:pdf', payload)` | Headless printToPDF window render [VERIFIED IN CODE: preload.js:273, main.js:933] | `(payload: { pages, widthMm, heightMm }) => Promise<ArrayBuffer>` |

---

### 1.3 Module Structure in `src/`
The renderer code is organized modularly under `src/js/` with clear functional boundaries:

```
src/js/
├── app.js                 # Central Application Controller (5,446 lines, 265 KB)
├── export.js              # Vector/Bitmap/PDF Exporters (PNG, SVG, PDF, .gazboard)
├── board-export.js        # Multi-board batch export container (ZIP packaging via JSZip)
├── i18n.js                # Internationalization runtime (locale resolution, t() translation)
├── insert.js              # Document, image, and template insertion workflows
├── templates.js           # Built-in board templates (grids, lined paper, planners)
├── errors.js              # Global window error capture and diagnostic logging
├── fontpack.js            # Custom cursive/handwriting font decoders
│
├── core/                  # Headless Core Engine (No DOM dependencies)
│   ├── store.js           # Transaction Store, Op Log, Undo/Redo, Serialisation
│   ├── surface.js         # Canvas 2D Lifecycle, RAF draw loop, Offscreen Freeze Cache
│   ├── camera.js          # Viewport 2D Transformation Matrix (toScreen, toWorld, zoomAt)
│   ├── render.js          # Canvas 2D scene graph painter (strokes, shapes, text, tables)
│   ├── ink.js             # Midpoint Bézier paths, pressure quantization runs
│   ├── inktrail.js        # Direct integration with Windows Delegated Ink Trails
│   ├── tools.js           # PointerEvent coordinator (pen, mouse, eraser, lasso, selection)
│   ├── hit.js             # Spatial collision tests (point-in-box, segment distance, lasso)
│   ├── erase.js           # Point-erasing algorithm (swept capsule stroke splitting)
│   ├── recognize.js       # Geometric shape recognition (resample, loop angle detection)
│   ├── pages.js           # Vertical multi-page sheet geometry & coordinate mapping
│   ├── richtext.js        # RichText editor state, markdown runs, selection bounding boxes
│   ├── maths.js           # LaTeX/Math rendering engine
│   ├── connectors.js      # Smart connector line routing and anchor snapping
│   ├── boardrefs.js       # Cross-board hyperlink tokens (@[Board](b:id#page))
│   └── util.js            # Geometry math, box union/intersection, uid generators
│
├── ui/                    # UI Components & DOM Floating Panels
│   ├── toolbar.js         # Interactive floating pen tray and tool dock
│   ├── panels.js          # Slide-out sidebar panels (Boards, Canvas, Export, Settings)
│   ├── timer.js           # Floating stopwatch & countdown timer widget
│   ├── contextmenu.js     # Floating contextual selection action menu
│   ├── textedit.js        # Inline floating textarea for notes and canvas text
│   ├── mathedit.js        # Inline LaTeX formula editor dialog
│   ├── boardpicker.js     # Modal board selection dialog
│   ├── pagepicker.js      # Sheet thumbnail navigation strip
│   ├── palettes.js        # Color swatches and stroke width picker popups
│   └── icons.js           # Inline SVG icon asset catalog
│
├── platform/              # Platform Compatibility Adapters
│   ├── platform.js        # Environment capability detection (Electron vs Web vs Android)
│   ├── android-adapter.js # Android WebView native bridge shim
│   ├── web-adapter.js     # Browser PWA storage and clipboard fallbacks
│   └── update-manager.js  # Client-side GitHub release update coordinator
│
└── importers/             # Document Importers
    ├── pdf.js             # PDF.js page rendering to canvas bitmaps
    ├── pptx.js            # Built-in pure JS OOXML PowerPoint slide unpacker
    ├── slideanim.js       # PowerPoint slide animation sequencing parser
    └── slidemedia.js      # Embedded media extraction from Office presentations
```

---

### 1.4 Canvas Rendering Pipeline
GazBoard implements a custom 2D rendering pipeline designed to minimize CPU draw overhead during high-frequency pen interactions:

```
                  ┌─────────────────────────────────────┐
                  │    PointerEvent (Pen / Mouse)       │
                  │  tools.js (coalesced hardware pts)  │
                  └──────────────────┬──────────────────┘
                                     │
                 Is stroke active? (this.wet = obj)
                                     │
           ┌─────────────────────────┴─────────────────────────┐
     [YES: Drawing]                                      [NO: Idle / Navigating]
           │                                                   │
┌──────────▼──────────────────────────┐             ┌──────────▼────────────────────────┐
│ Blit Frozen Offscreen Canvas Buffer │             │ Evaluate freezeKey():             │
│ ctx.drawImage(this._ink.canvas)     │             │ rev.liveRev|cam.x|cam.y|cam.z|w|h │
│ (Cost: ~0.02ms) [surface.js:557]    │             └──────────┬────────────────────────┘
└──────────┬──────────────────────────┘                        │
           │                                      Matches existing _ink.key?
┌──────────▼──────────────────────────┐             ┌──────────┴──────────┐
│ Render ONLY Active Stroke (_drawWet)│       [YES: Cache Valid]    [NO: Cache Miss / Invalidation]
│ • Quadratic midpoint Bézier curves  │             │                     │
│ • Pressure-quantized runs (ink.js)  │  ┌──────────▼───────────┐   ┌─────▼─────────────────────┐
│ • Windows Ink Trail (DirectX API)   │  │ Blit this._ink.canvas│   │ Full drawScene() Pass:    │
└──────────┬──────────────────────────┘  │ (Cost: ~0.02ms)      │   │ • Viewport culling        │
           │                             └──────────┬───────────┘   │ • Background & paper grid │
           │                                        │               │ • drawObject dispatch:    │
           │                                        │               │   strokes, shapes, text,  │
           │                                        │               │   curtains, images, math  │
           │                                        │               │ • Bake into this._ink     │
           │                                        │               └─────┬─────────────────────┘
           │                                        │                     │
           └─────────────────────────┬──────────────┴─────────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │  Screen-Space Overlay Pass:     │
                    │  surface.overlays (CSS pixels)  │
                    │  • Selection handles            │
                    │  • Laser pointer trail (fade)   │
                    │  • Hover badges & drag hints    │
                    └─────────────────────────────────┘
```

**Key Execution Rules**:
1. **The Frozen Canvas Optimization**: In [surface.js:553-588](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L553-L588), committed items are baked into `this._inkCanvas`. When inking, GazBoard simply blits this pre-rendered bitmap and paints only the in-progress stroke on top via `_drawWet()`.
2. **Viewport Culling**: In [surface.js:621-623](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js#L621-L623), the camera viewport bounds are computed with a 64px safety padding (`cam.viewport(w, h)`). Objects outside this bounding box bypass `drawObject()`.
3. **Screen-Space Overlays**: Transient visual effects (selection boxes, laser trails, subtitles, pulse rings) execute in `this.overlays` [VERIFIED IN CODE: src/js/core/surface.js:31, 723]. They are rendered in CSS pixel screen space *after* world transforms are restored, completely avoiding board state invalidation.

---

### 1.5 Document Store, Op-Log & Persistence Pipeline

#### 1.5.1 Op-Based Transaction System (`Store`)
Mutations in [store.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/store.js) never alter `this.doc` directly. All changes pass through atomic operation objects:
* `add`: Insert object `{ t: 'add', obj, index? }`
* `del`: Remove object `{ t: 'del', id, obj, index }`
* `set`: Update properties `{ t: 'set', id, before, after }`
* `order`: Reorder z-index `{ t: 'order', before: [...], after: [...] }`
* `doc`: Document-level metadata changes `{ t: 'doc', before: {...}, after: {...} }`

`commit(label, ops)` calculates inverses for undo, pushes the transaction to `undoStack`, logs ops to `this.log`, increments `this.rev`, and invokes change listeners (`this.emit('change')`) [VERIFIED IN CODE: src/js/core/store.js:103-117].

#### 1.5.2 Atomic Persistence & Content-Addressable Asset Store

```
   Store.toJSON() [in memory]
             │
             ▼
   app.externaliseAssets(doc) [src/js/app.js:578]
   • Inspects doc.objects for 'image' items
   • Hashes image base64 data to SHA-256
   • Stores image into userData/boards/assets/<hash>.<ext>
   • Replaces image.src with 'asset:<hash>.<ext>'
             │
             ▼
   IPC: boards:save -> withStorageWrite() [main.js:1249]
   • Serializes JSON string
   • Writes to temporary file: <id>.json.tmp.<pid>
   • Atomic filesystem rename: renameSync(tmp, <id>.json)
   • Simultaneously updates last-board.json pointer [main.js:1272]
```

---

### 1.6 Import & Export Pipeline

GazBoard provides a multi-format document interchange pipeline:

```
DOCUMENT IMPORT PIPELINE:
  PDF Files (*.pdf) ──────────────► src/js/importers/pdf.js (pdfjs-dist) ──► Canvas Bitmaps
  Word (*.docx) / PPTX (*.pptx) ──► msoffice.js (Windows COM Automation)  ──┐
                                 ► soffice.js (LibreOffice CLI fallback)   ─┼─► Headless PDF ──► pdf.js ──► Bitmaps
                                 ► convertWithHiddenWindow (built-in HTML) ─┘

DOCUMENT EXPORT PIPELINE:
  Active Board ──► export.js:saveBoardFile() ──────► Raw JSON Text File (*.gazboard)
  Library Boards ► board-export.js:exportBoards() ──► JSZip Archive (*.zip) if >1 board
  Vector Export ─► export.js:renderSVG() ──────────► Scalable Vector Graphics (*.svg)
  Bitmap Export ─► export.js:renderPNG() ──────────► Full/Area Resolution PNG (*.png)
  Print to PDF ──► main.js:exportPdf() ────────────► webContents.printToPDF (*.pdf)
```

1. **Document Import Pipeline**:
   * **PDF**: Handled entirely in the renderer via `pdfjs-dist` [VERIFIED IN CODE: src/js/importers/pdf.js:1-85]. Pages are rendered to offscreen canvas bitmaps and inserted as `type: 'image'` objects.
   * **Microsoft Office Documents (`.docx`, `.pptx`)**:
     - *Priority 1 (Windows)*: Native Microsoft Office COM automation via PowerShell in [msoffice.js:43-97](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/msoffice.js#L43-L97). Converts files cleanly to PDF via Word/PowerPoint COM objects.
     - *Priority 2 (Cross-Platform CLI)*: LibreOffice headless CLI in [soffice.js:34-60](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/soffice.js#L34-L60).
     - *Priority 3 (Built-in Fallback)*: Headless BrowserWindow [main.js:904-931](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L904-L931) running Mammoth.js for `.docx` and a custom pure-JS OOXML unpacker [src/js/importers/pptx.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/importers/pptx.js) for `.pptx`, printed via `win.webContents.printToPDF()`.
2. **Export Pipeline**:
   * **Single Board Export (`.gazboard`)**: In [export.js:664-665](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js#L664-L665), single boards are serialized as **raw UTF-8 JSON text**. Images are inlined as base64 data URLs via `exportable(doc)`.
   * **Batch Library Export**: In [board-export.js:45-50](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/board-export.js#L45-L50), `JSZip` is dynamically loaded ONLY when exporting two or more boards into a `.zip` archive.
   * **Vector (SVG) & Bitmap (PNG)**: In [export.js:160-350](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/export.js#L160-L350), SVG exporter constructs clean XML path markup, handling ink midpoint curves, shapes, text, and curtains.
   * **PDF Export**: In [main.js:933-950](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L933-L950), sheets are rasterized and passed to Electron's native `printToPDF`.

---

### 1.7 Settings Architecture

GazBoard maintains application preferences synchronously on the client side:
* **Storage Layer**: Settings are stored in the browser's `localStorage` under key `'gazboard.settings'` (with backward-compatible fallback to `'openboard.settings'`) [VERIFIED IN CODE: src/js/app.js:290, 331].
* **State Management**: Instantiated on startup in `App.loadSettings()` [app.js:285-330]. Settings include UI theme (`dark`, `light`, `system`), pen palettes, stroke width presets, auto-save interval (`saveCeiling`), group outline display, and language selection.
* **IPC Decoupling**: Because settings live directly in `localStorage` in the renderer, reading and modifying configuration never requires IPC hops or main-process coordination.
* **Replay Integration**: All Replay-specific preferences (such as `defaultPendingStyle`, `playbackSpeed`, `autoFollowDeadZone`, `syncDuringPlayback`, `gestureScratchOutSensitivity`) can be added directly into `this.settings` without modifying main-process schemas.

---

### 1.8 Build & Packaging Architecture (`electron-builder`)

Desktop distribution is configured declaratively in `package.json` [VERIFIED IN CODE: package.json:57-120]:
* **Application Metadata**: AppId `com.theboringcode.gazboard`, ProductName `GazBoard`, License `MIT`.
* **Packaging File Filter**:
  ```json
  "files": [
    "main.js", "storage-location.js", "preload.js", "soffice.js", "msoffice.js",
    "src/**/*", "!src/package.json", "sync/**/*", "package.json",
    "!test/out/**", "updater.js", "zsync.js"
  ]
  ```
  *Significance*: `electron-builder` strictly packages only the files listed above. All non-desktop platform files (`android/`, `packaging/linux`, `test/`, `scripts/`) are **automatically excluded** from the final Windows installer and portable executable. Keeping these platform files in the repository imposes zero size or performance cost on Windows releases.
* **Target Platforms**:
  - **Windows**: `nsis` (customizable installer) and `portable` executable (`icon: src/assets/icon.ico`).
  - **macOS**: `dmg` and `zip` for both `arm64` and `x64` (`LSMinimumSystemVersion: 11.0`).
  - **Linux**: `AppImage` and `deb` (`category: Office`).

---

### 1.9 CI Workflows & Test Automation Pipeline

GazBoard maintains a strict continuous integration and test verification pipeline:
* **GitHub Actions Workflow (`.github/workflows/smoke.yml`)**:
  - Triggers on push to `main` and pull requests touching `src/**`, `test/**`, `scripts/**`, `main.js`, `preload.js`, or `package*.json`.
  - Runs on `ubuntu-latest` with Node.js 22 [VERIFIED IN CODE: .github/workflows/smoke.yml:15-21].
  - Executes `npm ci` followed by `npm run smoke:builtin` [VERIFIED IN CODE: .github/workflows/smoke.yml:23-24].
* **Cross-Platform Smoke Test Harness (`scripts/smoke.js`)**:
  - In [scripts/smoke.js:25-33](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/scripts/smoke.js#L25-L33), automatically detects headless Linux CI environments and executes under `xvfb-run -a electron . --smoke --no-sandbox`. On Windows and macOS, it executes native Electron directly.
* **Comprehensive Test Suite (`test/smoke.js`)**:
  - A 17,202-line automated test suite executed inside the Electron main process, injecting and asserting JavaScript directly in `mainWindow` via `webContents.executeJavaScript` [VERIFIED IN CODE: main.js:729].
  - Tests verify pen tracking, coalesced points, quadratic ink splines, pressure quantisation, undo/redo stacks, atomic persistence, PDF/Office import, curtain cover/reveal, board-linking tokens, and localization dictionary completeness via `scripts/i18n-check.js` [VERIFIED IN CODE: test/smoke.js:15093-15094].

---

## 2. Electron Security Posture

An exhaustive security audit of GazBoard's Electron architecture reveals both strong defenses and critical IPC exposure surfaces:

### 2.1 Security Configuration Matrix

| Security Feature | Implementation Status | Code Citation | Technical Evaluation & Risk |
| :--- | :--- | :--- | :--- |
| **`contextIsolation`** | **ENABLED** | [main.js:682](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L682) | Strong. Renderer JavaScript cannot access Node.js runtime or Electron internals directly. |
| **`nodeIntegration`** | **DISABLED** | [main.js:683](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L683) | Strong. `require()`, `process`, and `Buffer` are inaccessible in renderer window context. |
| **`sandbox`** | **DISABLED (`sandbox: false`)** | [main.js:684](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L684) | Moderate Risk. Chromium renderer sandbox is disabled to permit preload.js to invoke Node `crypto` and clipboard APIs. |
| **Content Security Policy (CSP)** | **PARTIAL / MIXED** | [src/index.html:10](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/index.html#L10) | Strong on main window: `script-src 'self' app: 'wasm-unsafe-eval'`. No unsafe-eval for JS.<br>**CRITICAL VULNERABILITY**: `src/convert.html` has **NO CSP**! |
| **Custom Protocol (`app://`)** | **PRIVILEGED & FILTERED** | [main.js:148-160](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L148-L160) | Strong. Registered with standard privileges. `registerProtocol` normalizes path and blocks traversal outside `SRC` directory. |
| **External Navigation & Windows** | **OPEN / PERMISSIVE** | [main.js:734](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L734) | **VULNERABILITY**: `setWindowOpenHandler` passes any URL directly to `shell.openExternal(url)` without scheme validation! |
| **IPC File System Validation** | **UNRESTRICTED / NO SANDBOX**| [main.js:1114, 1126](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1114) | **CRITICAL VULNERABILITY**: `fs:readFile` and `fs:writeFile` accept arbitrary paths across the user's entire drive. |

### 2.2 Deep Vulnerability Analysis

1. **Arbitrary File Read/Write via IPC**:
   In [main.js:1114, 1126-1129](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L1114), `fs:readFile` and `fs:writeFile` execute raw Node `fs/promises` calls without checking whether target paths reside within `userData` or board directories. Any script executing in the renderer could theoretically read or overwrite arbitrary user files.
2. **Hidden Conversion Window XSS Vector**:
   In [main.js:904-931](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L904-L931), `convertWithHiddenWindow` opens `app://board/convert.html` with `preload.js` loaded and `sandbox: false`. `convert.html` has **no CSP header** and assigns converted Office document contents to `root.innerHTML` [VERIFIED IN CODE: src/convert.html:57, 66]. A maliciously crafted `.docx` or `.pptx` containing script payloads could execute inside `convert.html`, obtain the full `window.board` bridge, and invoke unrestricted `writeFile`.
3. **Unvalidated `shell.openExternal`**:
   In [main.js:734](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js#L734):
   ```javascript
   mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
   ```
   Unlike `shell:openExternal` IPC which validates against `RELEASES_URL` [VERIFIED IN CODE: main.js:1157], `setWindowOpenHandler` contains zero scheme validation. If a user clicks a malicious markdown hyperlink formatted with a dangerous protocol (e.g. `ms-msdt:`, `file:`, or executable protocol handlers), `shell.openExternal` will launch it on Windows.
4. **Electron Version & Supply Chain**:
   * `package.json` specifies `"electron": "^43.4.1"` [VERIFIED IN CODE: package.json:51].
   * `package-lock.json` pins `electron` at `43.5.0` [VERIFIED IN CODE: package-lock.json].
   * *Analysis*: Electron 43.x represents an ultra-modern Chromium baseline (Chromium 128+). No known public CVEs currently affect this version, but standard Electron hardening must be maintained.
5. **Missing Media Device Permission Handler**:
   In [main.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/main.js), `session.defaultSession.setPermissionRequestHandler` is completely absent. While Electron's development mode allows media requests, in packaged Windows builds or restricted enterprise environments, `navigator.mediaDevices.getUserMedia` for microphone audio recording can fail silently or be denied without an explicit handler granting `'media'` permissions.

---

## 3. Performance Baseline & Bottlenecks

### 3.1 Startup Path
The application launch sequence follows a deterministic, local-first initialization:
1. `main.js`: Resolves storage directory via `storage-location.js`, checks `--smoke` flags, loads window coordinates from `last-board.json`, and loads `app://board/index.html` [VERIFIED IN CODE: main.js:665-705].
2. `src/js/i18n.js`: Top-level `await setLanguage(resolveLanguage())` loads dictionary JSON before other modules initialize [VERIFIED IN CODE: src/js/i18n.js:121].
3. `src/js/app.js`: Instantiates `Store`, `Surface`, `Tools`, `Panels`, and calls `restoreLastBoard()` [VERIFIED IN CODE: src/js/app.js:215, 681].
4. `restoreLastBoard()` queries IPC `boards:last`, loads board JSON, calls `app.resolveAssets(data)` to restore images, populates `this.store.load(data)`, and triggers `surface.warmFreeze()` on `requestIdleCallback` [VERIFIED IN CODE: src/js/app.js:500, 681-710].

### 3.2 Rendering Performance on Large Boards
* **Drawing Latency**: Normal handwriting costs $< 0.05\text{ms}$ per move because it paints solely into the wet layer on top of the frozen canvas [VERIFIED IN CODE: src/js/core/surface.js:557-558].
* **Lift Invalidation Bottleneck**: When a stroke is finished, `finishStroke` calls `surface.extendFreeze(obj)` [VERIFIED IN CODE: src/js/core/tools.js:1740]. `extendFreeze` attempts to paint only the new stroke into the frozen canvas offscreen without a full redraw [VERIFIED IN CODE: src/js/core/surface.js:170-188]. However, if an eraser or move tool is used, the whole board must re-render (`repaintAll()`), which scales linearly ($O(N)$) with object count.
* **Hit Testing Complexity**: In [hit.js:75-83](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/hit.js#L75-L83), `pick(store, p)` iterates backwards through `store.doc.order`. For strokes, it iterates through point segments checking `distToSegment` [VERIFIED IN CODE: src/js/core/hit.js:45]. For boards with $> 5,000$ strokes, un-indexed hit testing during rapid scrubbing could cause noticeable UI latency.

### 3.3 Memory & Autosave Characteristics
* **Memory Pressure from Base64**: Bitmaps in memory (`store.objects[].src`) are held as base64 data URLs. A board with 20 imported slide images can consume 150–250 MB of renderer heap space.
* **Autosave Throttling**:
  * In [app.js:480-484](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js#L480-L484), `onGestureEnd()` triggers saving when a gesture finishes if `performance.now() - this._lastSaveAt > App.SAVE_CEILING` (default ceiling: 15 seconds).
  * `_persistNow()` stringifies the entire document on the renderer main thread (`JSON.stringify(doc)`), and transmits the payload as a string to the main process [VERIFIED IN CODE: src/js/app.js:536]. While string serialization was optimized to prevent blocking structured clone algorithms, stringifying a 40 MB document during active audio recording could still introduce brief frame drops.

---

## 4. Technical Debt & Fragile Areas Touchpoints

| File / Component | Lines / Size | Fragility Rationale & Risk to Replay Features |
| :--- | :--- | :--- |
| [src/js/app.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/app.js) | 5,446 lines (265 KB) | **Monolithic Controller**: Manages everything from board lifecycle, gestures, saving, asset externalization, to LAN sync UI. Adding audio player controls directly into `app.js` will exacerbate architectural coupling. |
| [src/js/core/tools.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/tools.js) | 3,180 lines (142 KB) | **High Interaction Complexity**: Handles coalesced stylus points, Windows Ink trails, touch pan, eraser splitting, and shape recognition. Injecting stroke timestamping ($t_0, t_1$) and scratch-out gestures must be isolated to avoid regressing pen latency. |
| [src/js/ui/panels.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/ui/panels.js) | 3,420 lines (160 KB) | **Monolithic DOM Management**: Constructs all sidebar settings, export menus, and board lists using manual string templating. Audio playback controls must be encapsulated in a clean standalone module (`audioplayer.js`). |
| [src/js/core/surface.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/surface.js) | 1,023 lines (46 KB) | **Frozen Canvas Caching**: The freeze mechanism does not account for continuous audio clock changes. Modifying `Surface.draw()` without breaking `_freezeScene()` requires careful layering. |
| [sync/node.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/sync/node.js) | 1,251 lines (59 KB) | **LAN Sync Hard Limits**: Enforces 64 MB maximum board payload (`MAX_BOARD_BYTES`). Adding audio tracks without strip/omit logic will crash LAN board transfer. |
| [scripts/i18n-check.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/scripts/i18n-check.js) | 65 lines | **Strict Translation Guard**: Verifies that every English string in `t('...')` exists across all 7 locales (`bn`, `zh-Hans`, `zh-Hant`, `ar`, `es`, `pt-BR`, `de`). Adding new UI strings will break tests unless properly stubbed or translated. |

---

## 5. Platform-Specific Code Inventory

To ensure upstream mergeability and prevent breaking non-Windows platforms, every platform-specific subsystem has been audited:

| Platform Component | Location | Description & Operating System | Keep / Gate / Exclude Verdict | Technical Rationale & Implementation Guard |
| :--- | :--- | :--- | :--- | :--- |
| **Microsoft Office COM** | [msoffice.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/msoffice.js) | Spawns PowerShell COM automation for Word/PowerPoint conversion. **Windows only**. | **KEEP & GATE** | Core Windows feature. Already gated by `process.platform === 'win32'` [VERIFIED IN CODE: msoffice.js:107]. Keep untouched. |
| **Windows Ink Trails** | [src/js/core/inktrail.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/src/js/core/inktrail.js) | DirectX Delegated Ink Trails API (`navigator.ink`). **Windows only**. | **KEEP & GATE** | Gated cleanly by `inkTrailSupported()` checking `/Windows/i.test(navigator.userAgent)` [VERIFIED IN CODE: inktrail.js:28]. Keep untouched. |
| **Windows Firewall** | [sync/firewall.js](file:///C:/Users/kazir/.gemini/antigravity/scratch/GazBoard/sync/firewall.js) | UAC PowerShell netsh rules for UDP/TCP sync ports. **Windows only**. | **KEEP & GATE** | Already isolated and loaded on-demand via `sync:firewall:*` [VERIFIED IN CODE: main.js:1385]. Keep untouched. |
| **Android WebView Bridge** | `android/`, `src/js/platform/android-*.js` | Native Java/Kotlin Android app and WebView adapter. | **KEEP** | Do NOT touch or delete. Upstream GazBoard actively supports Android. Must remain buildable. |
| **Web PWA Platform** | `src/js/platform/web-*.js`, `src/sw.js` | Cloudflare Worker / Vercel web whiteboard build. | **KEEP** | Do NOT delete. Gated cleanly by `platform.isWeb` [VERIFIED IN CODE: src/js/platform/platform.js:12]. |
| **Linux Packaging & xvfb**| `packaging/linux/`, `scripts/smoke.js` | AppImage/deb packaging and xvfb-run headless runner. | **KEEP** | Required for CI GitHub Actions (`smoke.yml` runs on `ubuntu-latest` with xvfb) [VERIFIED IN CODE: .github/workflows/smoke.yml:15]. |
| **macOS DMG & Builder** | `package.json` (`build.mac`) | Apple Silicon / Intel DMG target configuration. | **KEEP** | Standard electron-builder configuration. Keep untouched. |

---

## 6. Contribution Conventions & Quality Standards

To achieve the goal of contributing GazBoard Replay features back upstream, all newly authored code must adhere strictly to GazBoard's established architectural patterns:

### 6.1 Code Style & Formatting Rules
* **No Transpilation / Zero Build Step in Renderer**: Pure modern JavaScript ES6+ modules (`import`/`export`, `async`/`await`, `WeakMap`, `Path2D`). No TypeScript, no Babel, no Webpack/Vite bundlers for desktop code [VERIFIED IN CODE: src/index.html:17, 87].
* **Syntax Conventions**:
  * Indentation: Strictly 2 spaces (no tabs).
  * Quotes: Single quotes `'...'` for strings, backticks `` `...` `` for templates.
  * Semicolons: Explicit semicolons terminating statements.
  * Compact Guards: Idiomatic compact guards (e.g. `if (!o) return;`).
* **Rich Inline Rationale Comments**: GazBoard features extensive, narrative code comments explaining *why* an architectural choice was made, documenting edge cases, hardware oddities, and OS bugs (e.g. `tools.js:719`, `main.js:670-674`, `surface.js:570-585`). New code must include detailed rationale comments.

### 6.2 Architectural Extension Conventions
* **Additive, Non-Destructive Store Ops**: State mutations must pass through `store.commit(label, ops)`. Existing document properties (`objects`, `pages`, `camera`) must never be repurposed.
* **Separation of Headless Core vs UI**: Core logic (audio recorder, timestamp calculation, gesture recognizers) belongs in `src/js/core/`. Visual floating bars and controls belong in `src/js/ui/`.
* **Localization Rigor (`i18n.js`)**:
  * Every user-facing string must be wrapped in `t('Exact English Sentence')` [VERIFIED IN CODE: src/js/i18n.js:82].
  * Any new string added to the code must be mirrored into all seven locale files (`src/locales/{ar,bn,de,es,pt-BR,zh-Hans,zh-Hant}.json`) to pass `node scripts/i18n-check.js` [VERIFIED IN CODE: scripts/i18n-check.js:27-44].

### 6.3 Testing & CI Verification
* **Smoke Suite Integrity**: Any change must pass `npm run smoke:builtin` (`test/smoke.js`) on both Windows and headless Linux runners (`xvfb-run`) [VERIFIED IN CODE: scripts/smoke.js:31-33, .github/workflows/smoke.yml:24].
* **Regression Standard**: A board saved by upstream GazBoard 4.8.1 must open seamlessly in GazBoard Replay, and a board saved in Replay must degrade gracefully when opened in upstream GazBoard without data loss.
