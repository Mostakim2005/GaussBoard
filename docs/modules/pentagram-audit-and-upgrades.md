# GaussBoard: Modules 11–14 Audit & Pentagram Integration Roadmap

> **1-Line Summary:** Source-verified Modules 11–14 architecture, CLI/automation, OSS leverage (`ngspice-wasm` dual solver), and 5-app Pentagram + `RAG Manager` (`:27130`) integration plan for `GaussBoard` (`Mostakim2005/GaussBoard` @ `b50afa9`).

## 1. Unified Pentagram Decisions Locked for This Repo
* **Master Standard:** `C:\Users\kazir\Documents\Agentic Harness\Index & Flowcharts\ECOSYSTEM_INTEGRATION_CONTRACT.md` (`v2.0.0`, `2026-11-23`).
* **Upstream-Friendly Separation:** Keep upstream-shared core lines in `main.js` minimal-diff so `fahim9778/GazBoard` commits continue to cherry-pick cleanly; isolate all GaussBoard-custom IPC handlers, circuit engines, and Pentagram/`RAG Manager` integrations inside `electron/*.cjs` and `src/js/core/*`.
* **Dual Circuit Simulation (Keep & Upgrade):** Retain `src/js/core/circuit-sim.js` (`solveMNA`) as the instant real-time interactive simulator (industrial contactors, 3-phase motors, DMM, acoustic synth) **and** add **`ngspice-wasm`** as a switchable SPICE engine mode (`mna-live` vs `ngspice-spice`) plus `.cir` netlist export / TI `TINA` handoff.
* **Hybrid CAS Locked (`Charlie 2`):** Retain `electron/cas-sympy.cjs` (shared OS Python 3.15 + SymPy 1.14.0 via `ecosystem-registry.json`) with automatic pure-JS fallback (`src/js/core/scientific-math.js`).
* **Zero-Context Discovery & Auth:** Resolve ports/paths from `%USERPROFILE%\.local\share\ecosystem-registry.json` (`LOCAL_ECOSYSTEM_REGISTRY`), shared assets from `%LOCALAPPDATA%\SharedLibraries` (`LOCAL_COMMON_LIBRARIES`), and Bearer tokens from `%USERPROFILE%\.local\share\ecosystem-secrets.json` (`LOCAL_ECOSYSTEM_SECRETS`).

---

## 2. Modules 11–14 Findings Summary (Source-Verified)

| ID | Module | Severity | Target Anchors | Finding & Concrete Upgrade |
| :--- | :--- | :--- | :--- | :--- |
| `M11-01` | Module 11 | High *(Phase 1 Done)* | `electron/triarchy-bridge.cjs` -> `resolveObsidianVaultDir`, `parseGaussBoardDeepLink`, `deepLinkFromArgv`; `main.js` -> `registerDeepLinkSchemes`, `openDeepLink`, `second-instance`; `preload.js` -> `onDeepLink`; `src/js/app.js` -> `focusObjectById`, `openBoardRef`; `package.json` -> `build.protocols` | **Broken registry path & dead `gaussboard://` deep links (Fixed in Phase 1):** Updated `resolveObsidianVaultDir` to read `reg?.data?.apps?.obsidian?.vaultPath`, registered `gaussboard` / `gazboard` schemes in `package.json` + `main.js`, and wired `board:deepLink` through `preload.js` to `openBoardRef` / `focusObjectById`. |
| `M11-02` | Module 11 | High *(Phase 2 Partial -> Media Done)* | `preload.js` -> `syncToObsidian`, `findSiblingSubtitle`, `remuxToMp4`; `src/js/insert.js` -> `prepareLocalVideoSource`, `insertVideoFromPath`; `src/js/ui/video-dialog.js`; `src/js/ui/visualization-dialog.js` -> `render`, `bindHeaderAndFooter`, `close` | **Orphaned IPC bridges & listener/i18n gaps:** Phase 1 fixed `visualization-dialog.js` i18n and `_unsubMermaidMgr` cleanup. Phase 2 wired `findSiblingSubtitle` and `remuxToMp4` via `prepareLocalVideoSource` into video drag/drop (`dropPaths` / `insertVideoFromPath`), `openVideoInsertDialog`, and `VideoPlayerDialog`. Remaining (Phase 4): wire `syncToObsidian` into board export/auto-sync. |
| `M11-03` | Module 11 | Medium *(Phase 1 Done)* | `electron/global-resources.cjs` -> `resolveEcosystemSecrets`; `electron/triarchy-bridge.cjs` -> `resolveObsidianApiConfig`, `postObsidianAgentManagerNote`, `syncToObsidianVault`; `electron/media-bridge.cjs` -> `findFfmpegExecutable` | **32K Windows argv risk & missing registry FFmpeg (Fixed in Phase 1):** Replaced `--content` CLI argv with `Obsidian Agent Manager` HTTP `POST /note/create` (`:27125`, `Authorization: Bearer` via `resolveEcosystemSecrets`, no `Origin` header) + atomic UTF-8 disk fallback, and wired `toolchains.ffmpeg` lookup in `findFfmpegExecutable()`. |
| `M12-01` | Module 12 | High *(Phase 2 Done)* | `electron/global-resources.cjs` -> `getEcosystemServices`; `preload.js` -> `getEcosystemServices`; `src/js/core/anki.js` -> `resolveAnkiConnectUrl`, `ensureCardXrefId`, `syncBoardToAnki`, `generatePracticeEngineBank`, `exportBoardToPracticeBank`; `src/js/ui/sidebar-ribbon.js` | **Duplicate Anki cards & hardcoded URL (Fixed in Phase 2):** `syncBoardToAnki` now resolves AnkiConnect URL via `getEcosystemServices`, verifies existing `ankiNoteId` (`notesInfo`) or `xref:<id>` tag (`findNotes`), calls `updateNoteFields` on re-sync (`allowDuplicate: false` for new notes), persists `ankiNoteId`/`xrefId` on cover objects, and exports `Practice Engine` `.md` banks. |
| `M12-02` | Module 12 | Medium *(Phase 2 Done)* | `electron/cli-export.cjs` -> `hasCliFlags`, `readBoardArchive`, `inspectBoard`, `runCli`; `main.js` -> `isHeadlessCli` | **Headless `--json` CLI surface (Implemented in Phase 2):** Added `electron/cli-export.cjs` supporting `--inspect`, `--export-md`, `--export-canvas`, `--input`, `--out`, and `--json` (with `0`/`1`/`2`/`3` exit codes and pure-Node/JSZip `.gaussboard` support) before single-instance lock in `main.js`. |
| `M13-01` | Module 13 | High | `src/js/core/circuit-sim.js` -> `solveMNA`, `stepSim`; `%LOCALAPPDATA%\SharedLibraries` | **Dual circuit solver (`MNA Live` + `ngspice-wasm`):** Keep `circuit-sim.js` (`solveMNA`) for instant interactive relay/motor simulation and integrate **`ngspice-wasm`** (`eelab-dev/EEcircuit` / `z-wasm/ngspice-wasm` stored in `SharedLibraries` to keep PWA `<15 MB`) with a `SolverMode` switch, SPICE `.cir` netlist export, and TI `TINA` launch hook. |
| `M13-02` | Module 13 | Medium | `src/js/core/markdown-sidecar.js` -> `generateMarkdownSidecar`; `src/js/core/fsrs.js` | **Canonical frontmatter & `ts-fsrs` / `.apkg` alignment:** Extend `generateMarkdownSidecar` with `ECOSYSTEM_INTEGRATION_CONTRACT.md` v2.0.0 fields (`xref_id`, `updated_at`, `source_uri`, `anki_note_ids`, `diagram_paths`) while keeping existing keys intact; evaluate `sql.js` (WASM) in `SharedLibraries` for true `.apkg` export alongside `Practice Engine` Markdown banks. |
| `M14-01` | Module 14 | High | `src/js/app.js`; `src/js/insert.js`; `src/js/ui/subtitles.js`; `electron/triarchy-bridge.cjs` | **Complete 5-App Pentagram + `RAG Manager` (`:27130`) Loop:** Wire `syncToObsidian` (`Nihon/Whiteboards/` `.md` + `.canvas` via `:27125` live / disk fallback), emit `POST http://127.0.0.1:27130/v1/ingest/event` on save/audio stop, add in-app **"Search Ecosystem (`RAG Manager`)"** drawer (`E:\Books`, `Nihon`, Mermaid, DeepTutor), wire `findSiblingSubtitle` + `remuxToMp4` on video attach, and add **"Send to DeepTutor (:8001)"** + **"Transcribe via Groq Whisper / RAG Manager"**. |
| `M14-02` | Module 14 | Medium | `src/js/ui/visualization-dialog.js`; `src/js/ui/panels.js`; `src/locales/*.json` | **UI/UX Ecosystem Ripple:** Wrap `'Edit in Mermaid Manager'` and all new bridge/SPICE/RAG UI labels in `t('...')` across all 7 locales (TRAP 4), add `SolverMode` selector + Show/Hide SPICE plot drawer, and surface Pentagram service health indicators (`RAG :27130`, `Obsidian :27125`, `Anki :8765`, `DeepTutor :8001`, `MermaidApp`) in Settings. |

---

## 3. Dependency-Ordered Execution Phases (Module 15)

```mermaid
flowchart LR
    classDef p1 fill:#b91c1c,stroke:#7f1d1d,color:#ffffff
    classDef p2 fill:#0f766e,stroke:#115e59,color:#ffffff
    classDef p3 fill:#1d4ed8,stroke:#1e3a8a,color:#ffffff
    classDef p4 fill:#7c3aed,stroke:#4c1d95,color:#ffffff

    P1["Phase 1: Bridge Fixes & Deep Links<br/>Fix apps.obsidian.vaultPath, >32K sync,<br/>wire gaussboard://, i18n + listener leak"]:::p1 --> P2["Phase 2: Headless CLI & Anki Idempotency<br/>ankiNoteId updateNoteFields, headless --json,<br/>media subtitles/MKV remux wiring"]:::p2
    P2 --> P3["Phase 3: Dual Circuit & UI Polish<br/>Add ngspice-wasm toggle + SPICE netlist,<br/>Service health pills, 7-locale parity"]:::p3
    P3 --> P4["Phase 4: RAG Manager & Pentagram Sync<br/>POST :27130 ingest event, Search Ecosystem drawer,<br/>Obsidian :27125 + DeepTutor :8001 + Whisper"]:::p4

    subgraph Legend["Legend (Color Guide)"]
        L1["Red = Bug & Protocol Fixes"]:::p1
        L2["Teal = CLI & Anki Deduplication"]:::p2
        L3["Blue = Dual SPICE & UI Ripple"]:::p3
        L4["Purple = RAG Manager & Pentagram"]:::p4
    end
```

1. **Phase 1 — Existing Bridge Bugs & `gaussboard://` Deep Links *(Completed)*:**
   - Fixed `reg?.data?.apps?.obsidian?.vaultPath` in `electron/triarchy-bridge.cjs -> resolveObsidianVaultDir`; resolved `ffmpeg` via `ecosystem-registry.json` (`toolchains.ffmpeg`) in `electron/media-bridge.cjs -> findFfmpegExecutable`.
   - Added `resolveEcosystemSecrets` in `electron/global-resources.cjs` and replaced `--content <string>` CLI arg in `syncToObsidianVault` with `Obsidian Agent Manager` HTTP (`POST http://127.0.0.1:27125/note/create` via `postObsidianAgentManagerNote` with Bearer token, no `Origin` header) and atomic UTF-8 disk fallback so >32 KB boards never hit Windows argv limits.
   - Registered `gaussboard` / `gazboard` protocols in `package.json -> build.protocols` and `main.js` (`registerDeepLinkSchemes`, `openDeepLink`, `second-instance`, `open-url`, initial `process.argv`), dispatched via `preload.js -> onDeepLink` to `src/js/app.js -> openBoardRef` / `focusObjectById` to jump directly to `boardId`, `objId`, and `page`.
   - Wrapped `'Edit in Mermaid Manager'` in `t('Edit in Mermaid Manager')` across all 7 locales, fixed `#vizCodeTextarea` lookup, and ensured `this._unsubMermaidMgr` cleanup in `VisualizationDialog`.
2. **Phase 2 — Anki Deduplication, Headless `--json` CLI & Media Bridges *(Completed)*:**
   - Tracked `obj.ankiNoteId` + `xref_id` in `src/js/core/anki.js -> syncBoardToAnki`; added `notesInfo` / `findNotes` + `updateNoteFields` deduplication (`allowDuplicate: false`), read `services.ankiConnect.url` via `getEcosystemServices` IPC, fixed occlusion crop coordinate lookup (`obj.*`), and added `Practice Engine` bank (`.md`) export (`generatePracticeEngineBank` / `exportBoardToPracticeBank` + ribbon button).
   - Wired `findSiblingSubtitle` + `remuxToMp4` via `src/js/insert.js -> prepareLocalVideoSource` / `insertVideoFromPath` into `dropPaths`, `openVideoInsertDialog`, and `VideoPlayerDialog`.
   - Added headless CLI module (`electron/cli-export.cjs`, invoked early in `main.js` before `requestSingleInstanceLock` when `--inspect`, `--export-md`, `--export-canvas`, `--help-cli` are present) emitting `--json` with `0`/`1`/`2`/`3` exit codes.
3. **Phase 3 — Dual Circuit Simulator (`MNA Live` + `ngspice-wasm`) & UI Ripple:**
   - Keep `src/js/core/circuit-sim.js` untouched as default `MNA Live` mode; add `src/js/core/spice-engine.js` + SharedLibraries `ngspice-wasm` loader (`<15 MB` PWA budget preserved) with `SolverMode` switch, AC/transient waveform plot panel, `.cir` netlist export, and optional TI `TINA` launcher.
   - Keep `main.js` upstream-minimal; add Pentagram service health indicators and collapsible Advanced SPICE/Sync drawers.
4. **Phase 4 — `RAG Manager` (`:27130`) & Full Pentagram Synchronization:**
   - Extend `generateMarkdownSidecar` frontmatter with `xref_id`, `updated_at`, `source_uri`, `anki_note_ids`, `diagram_paths`.
   - Wire **"Sync Board to Obsidian + RAG Manager"** (auto-sync option on save) emitting `POST http://127.0.0.1:27130/v1/ingest/event` with board sidecar, `.canvas`, exported page PNGs (for `embeddinggemma-2:440m`), and audio/subtitle transcripts (Groq Whisper v3 fallback).
   - Add in-app **"Search Ecosystem (`RAG Manager`)"** and **"Ask / Quiz in DeepTutor (`:8001`)"** panel actions.

## 4. Verification Checklist
* `node scripts/smoke.js --new-features` (24/24 passing)
* `node scripts/i18n-check.js` (100% parity across all 7 locales)
* `node --test test/ecosystem-bridges.test.mjs test/phase5-obsidian-and-graph.test.mjs test/p1-hardening.test.mjs`
* `node --test test/android-*.test.js`
* Manual/automated verification: `gaussboard://open?board=<id>&obj=<objId>&page=2` focuses/opens target object; second Anki sync updates existing `ankiNoteId` with zero duplicate notes; switching circuit solver between `MNA Live` and `ngspice-wasm` preserves relay/motor simulation.
