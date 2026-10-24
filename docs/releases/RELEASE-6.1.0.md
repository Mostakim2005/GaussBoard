# Release Dossier — GazBoard v6.1.0

> **Release Version**: `v6.1.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat: implement Phase 1 Engineering Workbench, Double-Layered Sidebar Ribbon & CAS Studio (v6.1.0)`  
> **Binary Deliverable**: [`releases/GazBoard-v6.1.0-Portable.exe`](../../releases/GazBoard-v6.1.0-Portable.exe) (108,194,316 bytes / 103.18 MiB)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,240 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps).

---

## 1. Executive Summary & Phase 1 Scope

Release **`v6.1.0`** initiates **Phase 1** of the Engineering, STEM Revision & EE Simulation Architecture roadmap defined in [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md).

It expands GazBoard into a specialized **Engineering & STEM Learning Workstation**, delivering a high-density, double-layered sidebar ribbon menu dockable to either screen edge, an in-app dynamic brand switcher (`GaussBoard` / `JazaBoard` / `GazBoard`), a natural language mathematical expression solver, and quick-insert stencils for industrial and circuit components.

---

## 2. Key Features & Subsystem Deliverables

### 2.1 Double-Layered Sidebar Ribbon Menu (`sidebar-ribbon.js`)
* **Dual-Layer Architecture**:
  * **Layer 1: Category Spine (76px Rail)**: Features the brand badge and vertical navigation across 7 core workbench categories:
    1. `Circuits & EE`: Electrical engineering stencils, Falstad netlist simulation, and multimeter probes.
    2. `Math & CAS`: Natural language mathematical solver, MathLive AST formula editor, and Windows Ink handwriting.
    3. `STEM Science`: Chemical equation balancing, stoichiometry explanation, interactive periodic table, and PhET simulation runner.
    4. `Study & FSRS`: Active-recall Study Tape occlusion, FSRS v5 retention rating (`Again`, `Hard`, `Good`, `Easy`), and AnkiConnect / `.apkg` synchronization.
    5. `ESL & Voice`: Technical engineering dictionary, collocations, grammar checks, and native zero-download Web Speech TTS.
    6. `Diagrams & PDF`: Visualization Studio, interactive Knowledge Graph view, and LiquidText-style elastic tether connectors.
    7. `Layout & Brand`: Left/Right docking position switch, Glassmorphism vs. Google Material styling, and dynamic brand name renamer.
  * **Layer 2: Tool Deck (270px Shelf)**: Contextual tool drawer providing interactive inputs, parameter chips, rate buttons, and live results.
* **Edge Latch Trigger**: A subtle edge latch button appears on the screen boundary when collapsed, allowing instant one-click expansion.
* **Global Access & Keyboard Shortcuts**:
  * Top bar button (`#btnSidebarRibbon`) with a lightning bolt icon (`Workbench`).
  * Dedicated keyboard hotkey: <kbd>Ctrl+B</kbd> (or <kbd>Cmd+B</kbd> on macOS).

### 2.2 Glassmorphism & Google Material Styling (`app.css`)
* **Glassmorphism Mode**: Semi-transparent frosted acrylic glass with `backdrop-filter: blur(18px) saturate(180%)`, crisp 1px translucent borders, and adaptive dark mode palettes.
* **Google Material Mode**: Solid surface styling conforming to Material 3 flat tokens for low-distraction environments.
* **Performance Guard**: Enforces `contain: paint;` to prevent canvas redraw penalties during rapid panning, zooming, and handwriting.
* **Inking Auto-Dimming**: Seamlessly dims to 18% opacity when writing or drawing with stylus/pen (`body.inking-active`), preventing visual interference.

### 2.3 Dynamic Brand Switcher (`GaussBoard` / `JazaBoard` / `GazBoard`)
* Conforms to Section 2.4 of Document 6: allows users to personalize application branding immediately via the Layout shelf or Settings.
* Persists to `localStorage('gazboard_custom_brand')` and updates window titles and header badges dynamically without requiring an app reload.

### 2.4 Natural Language Math Solver & Formula Cards
* Natural language evaluator supporting expressions such as `solve 3x + 12 = 0`, `parallel 10k 47k`, `sqrt(144) * 3`, and unit conversions.
* 1-click insertion of MathLive formula cards and trigger for native Windows Ink math handwriting input.

---

## 3. Verification & Test Ledger

| Test Suite | Command | Result | Verification Notes |
| :--- | :--- | :--- | :--- |
| **Base Regression Suite** | `node scripts/smoke.js` | **1,240 passed, 0 failed** | Complete suite passing across all canvas, inking, storage, link, and timer checks. |
| **Strict 100% i18n Parity** | `node scripts/i18n-check.js` | **1,878/1,878 translated** | 100% parity across all 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`) with 0 missing and 0 errors. |
| **Standalone Portable Build** | `npx electron-builder --win portable` | **Packaged successfully** | Produced version-stamped binary `releases/GazBoard-v6.1.0-Portable.exe`. |

---

## 4. Artifact & Deliverable Matrix

* **Portable Executable**: [`releases/GazBoard-v6.1.0-Portable.exe`](../../releases/GazBoard-v6.1.0-Portable.exe)
* **Master Architecture Index**: [`docs/INDEX.md`](../INDEX.md)
* **Bootstrap Specifications**: [`AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)
* **Releases Ledger**: [`docs/releases/RELEASES_INDEX.md`](RELEASES_INDEX.md)
* **Engineering Specification**: [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md)
