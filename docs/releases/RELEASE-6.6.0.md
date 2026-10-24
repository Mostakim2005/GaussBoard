# Release Dossier — GazBoard v6.6.0

> **Release Version**: `v6.6.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(stem): Phase 6 Lateral & Quality-of-Life Suite (v6.6.0)`  
> **Binary Deliverable**: [`releases/GazBoard-v6.6.0-Portable.exe`](../../releases/GazBoard-v6.6.0-Portable.exe) (`113,060,623 bytes` / `107.82 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,244 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps, Study Tape persistence).

---

## 1. Executive Summary & Version 6.6.0 Scope

Release **`v6.6.0`** delivers a comprehensive suite of **Lateral Features & Quality-of-Life (QoL) Enhancements** inspired by leading professional and paid tools (Desmos, GeoGebra, MolView, PyMOL, ChemDraw, EveryCircuit, Multisim, Ptable, Hemingway, and Anki/RemNote), refining the engineering notebook architecture across all 5 implemented phases:

1. **Desmos/GeoGebra Dual-Function & Trace Mode (`src/js/ui/function-grapher.js`)**:
   - **Multi-Function Comparison Overlay**: Allows simultaneous comparison curve $g(x)$ (e.g. `cos(x)`, `2*x - 1`) plotted alongside $f(x)$ in vivid magenta (`#ec4899`).
   - **Live Curve Trace Crosshair**: Real-time crosshair cursor snapping to the function curve with dynamic glassmorphic coordinate badge callouts `(x, y)`.
   - **Automated Roots & Extrema Detection**: Numerical detection of $x$-intercept roots ($y = 0$) and local extrema ($dy/dx = 0$), rendered as emerald green target rings (`#10b981`) and purple extrema pins (`#a855f7`).

2. **MolView/PyMOL 3D Molecular Measurement & Custom Importer (`src/js/ui/molecule-viewer.js`)**:
   - **Interactive Atom Measurement Tool**:
     - Click 1 atom: highlights selected atom with a pulsing electric cyan ring.
     - Click 2 atoms: calculates 3D Euclidean bond distance $d = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2} \times 0.038\,\text{Å}$, rendering a dashed cyan measurement line with a floating distance pill badge.
     - Click 3 atoms: calculates 3D bond angle $\theta^\circ = \arccos\left(\frac{\mathbf{u}\cdot\mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|}\right)$ at the vertex atom in degrees.
   - **Custom PDB / XYZ Coordinate Importer**: `[📂 Import PDB / XYZ]` modal parsing arbitrary molecular coordinate lines, auto-centering at origin, and automatically detecting covalent bonds.

3. **EveryCircuit/Multisim Live DC Potentiometer & Wattage Dissipation (`src/js/ui/circuit-workbench.js`, `src/js/core/circuit-sim.js`)**:
   - **Live DC Voltage Slider**: Dynamic DC voltage control ($0\text{V} - 30\text{V}$) in the workbench header that adjusts running simulation rails in real time without pausing or resetting netlists.
   - **Digital Multimeter Power Mode & Overheat Alarm**: Added `W` (Wattage) mode to the DMM dial measuring instantaneous branch power dissipation ($P = V \times I$), featuring an automatic flashing thermal overload badge (`🔥 OVERHEAT`) when power exceeds $120\text{W}$.

4. **Ptable/ChemDraw Bohr Orbitals & Chemical Molar Mass Calculator (`src/js/ui/periodic-table.js`, `src/js/core/scientific-math.js`)**:
   - **Bohr Shell Concentric Orbitals**: Interactive concentric SVG energy level rings showing electron occupancy across $K, L, M, N\dots$ shells for all elements.
   - **Formula Molar Mass & Stoichiometry Calculator**: Pure JS recursive descent chemical formula parser evaluating formula weights (e.g. `Ca(OH)2` $\to 74.092\text{ g/mol}$, `CuSO4*5H2O` $\to 249.677\text{ g/mol}$) and mass percentage breakdowns with 1-click clipboard and whiteboard stamp.

5. **Hemingway Readability Engine & 1-Click Auto-Fix (`src/js/core/technical-linter.js`)**:
   - **Flesch-Kincaid Readability Scoring**: Computes Flesch Reading Ease score ($0-100$) and US Grade Level for notes.
   - **1-Click "Fix All" Transformation**: `TechnicalLinter.fixAll(text)` automatically replaces verbose phrases and typos cleanly.

6. **Anki/RemNote Active Recall Scorecard & Whiteboard Stamp (`src/js/ui/study-runner.js`)**:
   - **Session Completion Scorecard**: Displays total reviewed count, retention accuracy percentage ($\frac{\text{Good}+\text{Easy}}{\text{Total}}\times 100\%$), rating distribution, and `[📸 Stamp Scorecard]` button creating a permanent revision log on the canvas.

---

## 2. Invariant & Verification Audit

| Requirement | Target | Achieved Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **Full Smoke Test Suite** | 100% Pass Rate | **1,244 Passed, 0 Failed** | `node scripts/smoke.js` |
| **Strict Translation Parity** | 100% across all 7 locales | **2,061 / 2,061 keys (100%)** | `node scripts/i18n-check.js` |
| **Zero Native Addons** | Pure JS / Portable | **0 C++ Native Modules** | Audit check (`package.json`) |
| **Content Security Policy** | No `eval` / `new Function` | **Safe AST Parsing** | Content-Security-Policy compliance |
| **Stroke Timestamp Preservation** | Preserve `p.t` | **Verified** | `Store.add` / `tools.js` invariants |
| **Binary Deliverable** | Versioned Portable Binary | **GazBoard-v6.6.0-Portable.exe** (107.82 MiB) | `releases/` directory |
