<div align="center">
  
# GaussBoard

**The Offline Electrical Engineering & STEM Digital Workstation**

[![Downloads](https://img.shields.io/github/downloads/Mostakim2005/GaussBoard/total?label=downloads&color=0078d4)](https://github.com/Mostakim2005/GaussBoard/releases)
[![Stars](https://img.shields.io/github/stars/Mostakim2005/GaussBoard?style=flat)](https://github.com/Mostakim2005/GaussBoard/stargazers)
[![Latest release](https://img.shields.io/github/v/release/Mostakim2005/GaussBoard?label=latest&color=107c10)](https://github.com/Mostakim2005/GaussBoard/releases/latest)
[![License](https://img.shields.io/github/license/Mostakim2005/GaussBoard)](LICENSE)

### ⏬ [**Download Latest Stable Release (Windows, Linux, macOS, Android)**](https://github.com/Mostakim2005/GaussBoard/releases/latest)

</div>

![GaussBoard Inking, Audio Sync, and Specialized STEM Tools](Screenshots/gazboardpens.png)

---

## ⚡ Dedication & Engineering Vision

**GaussBoard** is named in honor of **Carl Friedrich Gauss** (1777–1855), the *"Prince of Mathematicians,"* whose foundational discoveries in electromagnetic field theory (Gauss's law, Gaussian flux surfaces), complex analysis, and computational mathematics anchor modern electrical engineering.

GaussBoard is built specifically for **electrical engineering students, circuit designers, and STEM researchers** who require more than a generic digital whiteboard. It pairs a zero-lag, pressure-sensitive infinite canvas with an intensive suite of specialized engineering tools—ranging from synchronized audio-ink lecture recording to a real-time MNA circuit simulator, 2D/3D calculus graphing, symbolic CAS, and active-recall study tape.

> [!NOTE]
> **Intentional "Feature Creep" & Active Development Notice:**  
> GaussBoard intentionally packs in extensive capabilities that might look like "feature creep" to users seeking an ordinary sketchbook, but are essential power tools for engineering coursework and technical analysis. Because GaussBoard integrates dozens of advanced experimental features, many subsystems are actively evolving, not yet fully battle-tested, and may contain bugs. Continuous updates, optimizations, and feature enhancements are in active progress.

> [!TIP]
> **Looking for a Clean, Minimalist Whiteboard?**  
> GaussBoard is an intentionally divergent, highly specialized engineering tool. If you are looking for a simple, lightweight, distraction-free whiteboard for ordinary drawing, brainstorming, or non-STEM notes without the heavy engineering toolchain, **we strongly recommend checking out the official upstream project:**  
> 👉 [**GazBoard by MD. Fakhruddin Gazzali (theBoringCodes)**](https://github.com/fahim9778/GazBoard) — an elegant, offline rebuild of the classic Microsoft Whiteboard 21.x experience. Full upstream acknowledgments, separation context, and licenses are detailed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

---

## 🚀 Key Feature Highlights

### 1. 🎙️ Synchronized Audio-Ink Lecture Recording & Replay
* **Millisecond Stroke Sync:** Record audio while writing or sketching; pen strokes capture exact timestamps (`p.t`), preserving every nuance of your explanation.
* **Waveform Scrubber & Navigation:** Scrub through recordings with an interactive waveform visualizer, 5s/10s/15s/30s quick skips, and named bookmarks.
* **Camera Follow & Replay Isolation:** Automatically pans and zooms the viewport to follow writing during replay, with dynamic overlay passes that keep base canvas ink pristine.
* **Writing vs. Reading Modes:** Switch to Read-only review or continue adding timestamped ink into existing recording sessions.

### 2. ⚡ MNA Circuit Simulation & EE Workbench
* **Headless MNA Solver:** Real-time Modified Nodal Analysis circuit engine supporting discrete semiconductors, diodes, transistors, and 555 timers.
* **Industrial Motor Starter Presets:** Authentic ladder logic with Direct-On-Line (DOL) and Forward-Reverse starters featuring contactor latching and interlocks.
* **Meters & Instrumentation:** Live Digital Multimeter (DMM) continuity testing with audible feedback and virtual oscilloscope signal viewing.
* **Schematic & Wire Routing:** Orthogonal 90° wiring with magnetic snap terminals and automatic Bill of Materials (BOM) generation.

### 3. 📐 Math Studio, Symbolic CAS & 2D/3D Grapher
* **Offline Math Typesetting:** Integrated KaTeX editor with palettes for Calculus, Linear Algebra, Greek symbols, Physics constants, and matrix builders.
* **Symbolic CAS:** Offline computer algebra system for symbolic differentiation, polynomial factorization, quadratic solving, and equation evaluation.
* **2D & 3D Function Plotter:** Graph Cartesian \(y = f(x)\), 3D surfaces \(z = f(x, y)\), and polar curves \(r = f(\theta)\) with interactive tangent line tracking and Riemann sum visual approximations.

### 4. 🗂️ Active Recall & Study Tape
* **Study Tape:** Freehand masking tape that covers formulas and answers, toggling between concealed and revealed on tap.
* **Answer Covers:** Rectangular occlusion covers that persist on the board, remaining hittable as faint outlines for flashcard-like active recall.
* **Study Runner Modal:** Step-by-step active recall review runner designed for self-quizzing and exam preparation.

### 5. 🪟 Split Workspace (Dual Board Study)
* **Side-by-Side Dual Panes:** Open two independent boards simultaneously (e.g., lecture slides or textbook reference on the left, active problem solving on the right).
* **Independent State:** Separate cameras, undo/redo stacks, and text editors with clean focus-lease management to prevent cross-pane edits.

### 6. 🕸️ Knowledge Interop & Obsidian Graph
* **JSON Canvas 1.0:** Bidirectional import and export for the open JSON Canvas standard.
* **Obsidian Markdown Sidecar:** Automatically exports accompanying Markdown files with YAML frontmatter, tags, and KaTeX math blocks on save.
* **Force-Directed Knowledge Graph:** Visualize connections, documents, and concepts across your board library in an interactive force-directed graph.

### 7. 📄 Multi-Page Document Importers
* **Supported Formats:** Direct import and page picking for `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.xlsx`, and `.txt`.
* **High-Fidelity Page Annotation:** Renders pages as independent movable objects with selectable resolution (Standard 144 dpi, High 216 dpi, Maximum 300 dpi).
* **Eraser Safety:** Pen eraser only erases ink, never harming or altering the underlying imported document pages.

### 8. 🔒 100% Offline, Zero Cloud, & Local Encrypted LAN Sync
* **No Account & No Cloud:** Everything runs and saves locally in your chosen boards folder (`.gazboard` format). No telemetry, no cloud subscriptions.
* **Device-to-Device LAN Handoff:** Securely transfer boards directly over local Wi-Fi using X25519 key exchange and AES-256-GCM encryption with one-time pairing codes.

---

## 💾 Downloads & Installation

| Platform | Package | Notes |
|---|---|---|
| **Windows 10 / 11 (Portable)** | `GaussBoard-*-portable.exe` | **Recommended.** Portable zero-install binary. Keeps all data in a local folder. |
| **Windows 10 / 11 (Installer)** | `GaussBoard-Setup-*.exe` | Standard Windows NSIS installer. |
| **Android** | `GaussBoard-*-android-v*.apk` | Standalone offline APK for Android tablets and foldables. |
| **macOS (Apple Silicon)** | `GaussBoard-*-arm64.dmg` | Native build for Apple M1/M2/M3/M4 chips. |
| **macOS (Intel)** | `GaussBoard-*.dmg` | Native build for x64 Intel Macs. |
| **Linux (AppImage)** | `GaussBoard-*.AppImage` | Portable Linux executable (`chmod +x`). |
| **Linux (Debian / Ubuntu)** | `gaussboard_*_amd64.deb` | `sudo apt install ./gaussboard_*.deb` |

> [!NOTE]
> **Unsigned Binaries Notice:**  
> Binaries are built directly from open source via automated GitHub Actions and are not signed with paid commercial certificates. Windows Defender SmartScreen may display *"Windows protected your PC"* (click **More info → Run anyway**). On macOS, open **System Settings → Privacy & Security** and click **Open Anyway** on first launch.

---

## 🛠️ Building & Developing Locally

```bash
# Clone the repository
git clone https://github.com/Mostakim2005/GaussBoard.git
cd GaussBoard

# Install dependencies (pulls Electron runtime — libraries are vendored locally)
npm install

# Start the application
npm start

# Run with developer tools open
npm run dev
```

### Verification & Testing
```bash
# Run the active features smoke test suite (24/24 core capabilities)
npm run smoke:new

# Run the strict 100% i18n parity check across all 7 locales
node scripts/i18n-check.js

# Run the complete regression test suite
npm run smoke
```

### Packaging Binaries
```bash
npm run dist:win     # Windows portable .exe and NSIS installer
npm run dist:mac     # macOS .dmg and .zip
npm run dist:linux   # Linux AppImage and .deb
```

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `P` / `H` / `E` | Select Pen / Highlighter / Eraser |
| `V` / `L` | Marquee Select / Lasso Select |
| `N` / `T` / `S` | Sticky Note / Text Box / Shape Tool |
| `Space` + drag | Pan canvas |
| `Ctrl` + Scroll / Pinch | Zoom in and out |
| `Ctrl` + `0` / `Ctrl` + `Shift` + `F` | Reset zoom (100%) / Fit board to screen |
| `Ctrl` + `Z` / `Ctrl` + `Y` | Undo / Redo |
| `Ctrl` + `Shift` + `G` | 2D/3D Function Grapher & Calculus |
| `Ctrl` + `Shift` + `R` | Active Study Session & Recall Runner |
| `Alt` + `G` | Knowledge Graph View |
| `Alt` + `T` | Document Navigator & Table of Contents |
| `Ctrl` + `R` | Toggle interactive on-screen ruler |
| `Ctrl` + `N` / `O` / `S` | New board / Open board / Save a copy |

---

## 🏛️ System Architecture

```
main.js              Electron main process: IPC, window lifecycle, native dialogs, atomic storage
preload.js           Secure context bridge exposing window.board (contextIsolation active)
src/js/core/
  store.js           Document state, op-log engine, and checkpoint / applyRemote seam
  surface.js         Canvas 2D render loop, viewport culling, and replay overlay pass
  ink.js             Pressure ink engine, midpoint Bezier fitting, and p.t timestamp capture
  circuit-sim.js     Headless MNA solver, semiconductor models, 555 timer, and motor starters
  scientific-math.js Offline CAS evaluator, quadratic solver, and LaTeX conversion
  replay.js          Timestamped audio-ink synchronization and playback engine
  tools.js           Pointer state machine (stylus inks, mouse points) and gesture classifier
sync/                Offline peer-to-peer Wi-Fi handoff (UDP 53319 discovery + TCP 53318 transport)
```

For comprehensive engineering specifications, consult the project documentation suite:
* [`docs/PRODUCT.md`](docs/PRODUCT.md) — Source of truth for product intent and feature catalog.
* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Subsystem mechanics, Mermaid diagrams, and extension recipes.
* [`docs/DECISIONS_AND_TRAPS.md`](docs/DECISIONS_AND_TRAPS.md) — Architectural pivot history, design decisions, and invariant traps.

---

## 📜 Licensing, Heritage & Attribution

* **Maintainer & Lead:** Kazi S. Mostakim ([@Mostakim2005](https://github.com/Mostakim2005)) · [kazi.s.mostakim@gmail.com](mailto:kazi.s.mostakim@gmail.com)
* **Upstream Project:** Originated as a fork of [GazBoard](https://github.com/fahim9778/GazBoard) by MD. Fakhruddin Gazzali ([theBoringCodes](https://github.com/theBoringCodes)), used under the MIT license.
* **Third-Party Notices:** Full license texts for all bundled open-source components and upstream credits are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
* **AI & Agent Collaborative Engineering:** Developed, audited, and hardened across agent harnesses: Google Antigravity (powered by Gemini 3.8 Flash & Gemini 4 Argon), Claude Opus & Sonnet, OpenCode, DeepSeek v4.1 Flash, and Codex.

*GaussBoard is an independent open-source project and is not affiliated with or endorsed by Microsoft.*
