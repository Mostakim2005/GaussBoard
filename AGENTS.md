# Agent Operating Instructions — GazBoard Replay (OpenCode Workspace)

> **MANDATORY INSTRUCTIONS FOR ALL AI CODING AGENTS (Antigravity, Codex, OpenCode, DeepSeek Harness, Cursor, Claude Code, Copilot)**:
> This repository is strictly structured using a **Progressive Information Architecture (PIA)** to prevent context-window exhaustion and regression errors.
> You MUST follow this multi-step protocol on EVERY turn before writing code or modifying files.

---

## 1. Instruction Triage & Prompt Engineer Intent Gate

Before executing or writing any code, triage the instruction:

### Path A: Fast Path (Direct Execution)
- **Criteria**: Small single-line edits, direct follow-up bug fixes, routine terminal commands, or tasks running under an already agreed plan/guideline.
- **Behavior**: State a 1-sentence rephrased understanding and proceed directly with execution.

### Path B: Intent Confirmation Gate (New, Multi-Step, or Complex Instructions)
- **Criteria**: Any new task, multi-step pipeline, architectural shift, ambiguous request, or complex instruction where user intent scope must be verified.
- **Mandatory Behavioral Rules**:
  1. **Analyze the Instruction, NOT the Code**: Think like an expert prompt engineer. Evaluate the user's prompt for scope, edge cases, and ambiguities.
  2. **Present ONLY a Pure Intent Rephrase**: Output **strictly your concise understanding of what the user wants and nothing else**.
  3. **Zero Premature Work**: Do NOT output code snippets, file diffs, architecture plans, speculative solutions, or deep technical analyses at this stage.
  4. **Wait for Approval**: Stop and wait for the user to reply with "OK", "proceed", or modified parameters.
  5. **Execute Only After Confirmation**: Once the user approves or clarifies, proceed to analyze the problem, formulate the plan, and execute.

---

## 2. Mandatory Post-Change Protocol: Documentation & Git Commits

Whenever modifying code, program files, databases, executables (`.exe`), mobile packages (`.apk`), scripts, or project configurations:

After **EVERY** bug fix, feature addition, tweak, or code change:
1. **Mandatory Documentation Update**:
   - Immediately update the relevant project documentation (Architecture in `docs/layers/`, Feature Map in `docs/FEATURES.md`, or Bug Log in `docs/BUGS.md`) before reporting completion.
2. **Mandatory Git Commit**:
   - Create a clean local git commit staging the modified files and documentation updates.
3. **Mandatory Commit Explanation**:
   - In your final response, provide a clear commit summary containing:
     - **Commit Title & Hash**: Concise imperative title.
     - **Rationale**: Why the change was necessary.
     - **Affected Files & Anchors**: Specific files and line ranges modified.
     - **Verification Performed**: Exact commands or tests run (e.g., `smoke.js`, `i18n-check.js`).

---

## 3. Mandatory Entrypoint & Context Routing Protocol (PIA)

1. **Do NOT Read the Entire `docs/` Folder**:
   - Ingesting all documentation will consume over 100,000 tokens of your context and degrade reasoning.
2. **First Step — Read `AI_BOOTSTRAP.md`**:
   - Read [`AI_BOOTSTRAP.md`](AI_BOOTSTRAP.md) at the root to understand the core stack, data schemas (`Store`, `doc`), and the 6 Golden Invariants.
3. **Second Step — Locate Feature in `docs/INDEX.md`**:
   - Open [`docs/INDEX.md`](docs/INDEX.md) (Master Table of Contents).
   - Find the row corresponding to the user's requested feature or task.
4. **Third Step — Read ONLY the Designated Layer Dossier**:
   - Open **ONLY** the single relevant file in `docs/layers/`:
     - Audio, Replay, Bookmarks $\rightarrow$ [`docs/layers/01-audio-and-replay.md`](docs/layers/01-audio-and-replay.md)
     - Inking, Pens, Scratch-out Eraser $\rightarrow$ [`docs/layers/02-inking-and-gestures.md`](docs/layers/02-inking-and-gestures.md)
     - Canvas, Study Tape, Image Annotation $\rightarrow$ [`docs/layers/03-canvas-and-study-tape.md`](docs/layers/03-canvas-and-study-tape.md)
     - Arrowheads, Lines, Custom Templates $\rightarrow$ [`docs/layers/04-geometry-and-templates.md`](docs/layers/04-geometry-and-templates.md)
     - PDF Background Mode, Page Margins $\rightarrow$ [`docs/layers/05-pdf-and-pagemargins.md`](docs/layers/05-pdf-and-pagemargins.md)
     - Split Workspace, Markdown, board links, excerpts, OmniSearch, UI $\rightarrow$ [`docs/layers/06-workspace-and-ui.md`](docs/layers/06-workspace-and-ui.md)
     - Video Export & Audio Stitching $\rightarrow$ [`docs/layers/07-video-export.md`](docs/layers/07-video-export.md)
     - Multi-Layer System (On Standby) $\rightarrow$ [`docs/DEVELOPER_HANDOVER.md`](docs/DEVELOPER_HANDOVER.md) (§6)
5. **Fourth Step — Edit ONLY the Specified Files**:
   - For a focused feature task, touch only the files listed in that layer dossier. For a user-requested cross-subsystem audit, security review, or documentation refresh, route each affected subsystem independently and make only changes supported by source evidence.
   - **Documentation-only exception:** if the user explicitly requests a documentation refresh across the project, inspect and update only the project-authored Markdown files that match the requested subject and each file's purpose. Use [`docs/INDEX.md`](docs/INDEX.md) for routing; do not bulk-ingest or indiscriminately rewrite `docs/`.

---

## 4. The 6 Non-Negotiable Invariants (Never Break)

1. **Scene Partitioning During Audio Replay**:
   - Base canvas drawing passes MUST exclude active audio session strokes: `(o) => o.audioId !== activeTrackId`. Replay strokes render exclusively in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**:
   - Point generators, smoothing passes, and curve fitters in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio synchronization.
3. **Finite Audio Duration Safeguard**:
   - For in-app recordings, never rely on `audio.duration` without checking `isFinite()`; retain elapsed wall-clock `track.durationMs`. For imported audio, use finite metadata when available and leave duration unknown when unavailable rather than guessing.
4. **100% Internationalization (i18n) Parity**:
   - Every user-facing UI string must be wrapped in `t('...')` and present across all 7 locale dictionaries (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
5. **Zero Extra Native Dependencies**:
   - Do not introduce npm packages that require C/C++ compilation (`node-gyp`). All algorithms must remain pure portable JavaScript.
6. **Study Tape and Answer Cover Toggle**:
   - Both study tape (`subtype: 'tape'`) and rectangular answer covers (`subtype !== 'tape'`) persist on the board and toggle concealed/revealed on tap. Revealed covers remain hittable as faint outlines; attached content follows the cover state.

---

## 5. Mandatory Verification Checklist

Before reporting completion to the user, run these verification commands in PowerShell:

```powershell
# 1. Custom / New Features Smoke Test:
node scripts/smoke.js --new-features

# 2. Strict 100% translation coverage check:
node scripts/i18n-check.js
```
