# Agent Operating Instructions — GazBoard Replay

> **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS (Antigravity, Cursor, Claude Code, Windsurf, Copilot)**:
> This repository is strictly structured using a **Progressive Information Architecture (PIA)** to prevent context-window exhaustion and regression errors.
> You MUST follow this multi-step protocol on EVERY turn before writing code or modifying files.

---

## 1. Mandatory Entrypoint & Context Routing Protocol

1. **Do NOT Read the Entire `docs/` Folder**:
   * Ingesting all documentation will consume over 100,000 tokens of your context and degrade reasoning.
2. **First Step — Read `AI_BOOTSTRAP.md`**:
   * Read [`AI_BOOTSTRAP.md`](AI_BOOTSTRAP.md) at the root to understand the core stack, data schemas (`Store`, `doc`), and the 6 Golden Invariants.
3. **Second Step — Locate Feature in `docs/INDEX.md`**:
   * Open [`docs/INDEX.md`](docs/INDEX.md) (Master Table of Contents).
   * Find the row corresponding to the user's requested feature or task.
4. **Third Step — Read ONLY the Designated Layer Dossier**:
   * Open **ONLY** the single relevant file in `docs/layers/`:
     * Audio, Replay, Bookmarks $\rightarrow$ [`docs/layers/01-audio-and-replay.md`](docs/layers/01-audio-and-replay.md)
     * Inking, Pens, Scratch-out Eraser $\rightarrow$ [`docs/layers/02-inking-and-gestures.md`](docs/layers/02-inking-and-gestures.md)
     * Canvas, Study Tape, Image Annotation $\rightarrow$ [`docs/layers/03-canvas-and-study-tape.md`](docs/layers/03-canvas-and-study-tape.md)
     * Arrowheads, Lines, Custom Templates $\rightarrow$ [`docs/layers/04-geometry-and-templates.md`](docs/layers/04-geometry-and-templates.md)
     * PDF Background Mode, Page Margins $\rightarrow$ [`docs/layers/05-pdf-and-pagemargins.md`](docs/layers/05-pdf-and-pagemargins.md)
     * Split Workspace, Markdown, board links, excerpts, OmniSearch, UI $\rightarrow$ [`docs/layers/06-workspace-and-ui.md`](docs/layers/06-workspace-and-ui.md)
     * Video Export & Audio Stitching $\rightarrow$ [`docs/layers/07-video-export.md`](docs/layers/07-video-export.md)
     * Multi-Layer System (On Standby) $\rightarrow$ [`docs/DEVELOPER_HANDOVER.md`](docs/DEVELOPER_HANDOVER.md) (§6)
5. **Fourth Step — Edit ONLY the Specified Files**:
   * For a focused feature task, touch only the files listed in that layer dossier. For a user-requested cross-subsystem audit, security review, or documentation refresh, route each affected subsystem independently and make only changes supported by source evidence.
   * **Documentation-only exception:** if the user explicitly requests a documentation refresh across the project, inspect and update only the project-authored Markdown files that match the requested subject and each file's purpose. Use [`docs/INDEX.md`](docs/INDEX.md) for routing; do not bulk-ingest or indiscriminately rewrite `docs/`.
   * The v4.8.1 base catalog and cumulative custom-feature record are separate: [`docs/BASE_FEATURE_CATALOG-4.8.1.md`](docs/BASE_FEATURE_CATALOG-4.8.1.md) and [`docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md).

## 1A. Current Documentation Map

The current release and source snapshot are recorded in `package.json`, `docs/INDEX.md`, and `docs/DEVELOPER_HANDOVER.md`; verify them at the start of each task. Current split-workspace, Markdown, board-link and excerpt behavior is routed through `docs/layers/06-workspace-and-ui.md`; v5.1.0 implementation and checks are recorded in `docs/releases/RELEASE-5.1.0.md`. `docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md` is historical, and `docs/BASE_FEATURE_CATALOG-4.8.1.md` describes baseline-only behavior. Historical plans document intent, not current implementation. Preserve user choices as additive selectable options where practical, and record effects on other subsystems.

---

## 2. The 6 Non-Negotiable Invariants (Never Break)

1. **Scene Partitioning During Audio Replay**:
   * Base canvas drawing passes MUST exclude active audio session strokes: `(o) => o.audioId !== activeTrackId`. Replay strokes render exclusively in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**:
   * Point generators, smoothing passes, and curve fitters in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio synchronization.
3. **Finite Audio Duration Safeguard**:
   * For in-app recordings, never rely on `audio.duration` without checking `isFinite()`; retain elapsed wall-clock `track.durationMs`. For imported audio, use finite metadata when available and leave duration unknown when unavailable rather than guessing.
4. **100% Internationalization (i18n) Parity**:
   * Every user-facing UI string must be wrapped in `t('...')` and present across all 7 locale dictionaries (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
5. **Zero Extra Native Dependencies**:
   * Do not introduce npm packages that require C/C++ compilation (`node-gyp`). All algorithms must remain pure portable JavaScript.
6. **Study Tape and Answer Cover Toggle**:
   * Both study tape (`subtype: 'tape'`) and rectangular answer covers (`subtype !== 'tape'`) persist on the board and toggle concealed/revealed on tap. Revealed covers remain hittable as faint outlines; attached content follows the cover state. The Study Tape drawing tool is available from the ribbon and Add/tools menus.

---

## 3. Mandatory Verification Checklist

Before reporting completion to the user, run these verification commands in PowerShell:

```powershell
# 1. Custom / New Features Smoke Test (Active Directive: skip base tests, test new features):
node scripts/smoke.js --new-features

# 2. Strict 100% translation coverage check (report the actual current count):
node scripts/i18n-check.js
```
