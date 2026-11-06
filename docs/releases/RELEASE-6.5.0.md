# Release Dossier — GazBoard v6.5.0

> **Release Version**: `v6.5.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(stem): Phase 5 3D Molecular Viewer, Function Grapher & Symbolic CAS Suite (v6.5.0)`  
> **Binary Deliverable**: `GazBoard-v6.5.0-Portable.exe` (`113,051,207 bytes` / `107.81 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,244 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps, Study Tape persistence).

---

## 1. Executive Summary & Phase 5 Scope

Release **`v6.5.0`** marks the completion of **Phase 5** (the final phase) of the Engineering, STEM Revision, and EE Simulation architecture roadmap defined in [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md) and [`docs/ENGINEERING_NOTEBOOK_IMPLEMENTATION_GUIDE.md`](../ENGINEERING_NOTEBOOK_IMPLEMENTATION_GUIDE.md).

It establishes an integrated scientific computing, 3D molecular visualization, and technical writing suite inside GazBoard:
1. **Interactive 3D Molecular Structure Viewer & Crystallography Dock (`src/js/ui/molecule-viewer.js`)**:
   - 3D ball-and-stick, space-filling (Van der Waals), and wireframe representations.
   - Standard CPK atom coloring (Carbon, Hydrogen, Oxygen, Nitrogen, Chlorine, Sodium, Sulfur, Phosphorus).
   - Mouse orbit rotation, panning, and zoom with continuous auto-spin mode.
   - Curated Grade 11–12 STEM molecule models: Water ($H_2O$), Methane ($CH_4$), Benzene ($C_6H_6$), Ethanol ($C_2H_5OH$), Caffeine ($C_8H_{10}N_4O_2$), and Sodium Chloride ($NaCl$) crystal lattice.
   - 1-Click `[📸 Stamp to Canvas]` capturing 3D views as whiteboard images while preserving stroke timestamps (`p.t`).
2. **Dynamic 2D Function Grapher & Calculus Visualizer (`src/js/ui/function-grapher.js`)**:
   - Cartesian coordinate plotting engine with real-time panning and zoom.
   - Compiles and evaluates single-variable functions $f(x)$, polynomials, trigonometric expressions, exponentials, and rational curves.
   - Differential calculus visualizer: draggable tangent line slider with numeric readouts for tangent point $x_0$, $f(x_0)$, and exact instantaneous derivative slope $m = f'(x_0)$.
   - Integral calculus visualizer: shaded area under curve $\int_{a}^{b} f(x)\,dx$ with interactive $[a, b]$ interval sliders and trapezoidal Riemann summation.
   - 1-Click `[📸 Stamp to Board]` embedding the graph into the whiteboard canvas.
3. **Symbolic CAS & Reactive Variable Binding (`src/js/core/scientific-math.js`)**:
   - Linear equation solver ($ax + b = c \implies x = \frac{c - b}{a}$).
   - Symbolic polynomial and elementary differentiation ($\frac{d}{dx} x^n = n x^{n-1}$, $\sin(x) \to \cos(x)$, $e^x \to e^x$, $\ln(x) \to \frac{1}{x}$).
   - Quadratic root factoring ($ax^2 + bx + c = 0$) with discriminant $\Delta = b^2 - 4ac$ classification (real distinct roots or complex conjugate pairs).
   - Reactive notebook variables (`notebookVars.set('V', 24)`, `notebookVars.evaluate('V / R')`).
4. **Lightweight Offline ESL & Technical Writing Linter (`src/js/core/technical-linter.js`)**:
   - Offline rule-based engine analyzing engineering prose.
   - Detects passive voice constructions ("was measured by"), wordy redundancies ("in order to" $\to$ "to", "due to the fact that" $\to$ "because"), duplicate consecutive words ("the the"), and technical misspellings.
5. **Bundled Offline Vendor Libraries (`src/vendor/` and `CommonLibraries/`)**:
   - Bundled zero-install libraries: `3Dmol-min.js`, `function-plot.js`, `math.min.js`, and `nerdamer/` (`nerdamer.core.js`, `Calculus.js`, `Algebra.js`, `Solve.js`).

---

## 2. Key Subsystems & Architecture

### 2.1 3D Molecular Structure Viewer
* **Painter's Algorithm 3D Projection**: Pure HTML5 Canvas 2D / 3D depth-sorted rendering without heavy WebGL context overhead. Rotates atoms and bonds with 3D matrix projection $P(x, y, z) = \left(cx + \frac{x \cdot S}{z + D}, cy + \frac{y \cdot S}{z + D}\right)$.
* **CPK Atom Palette**: Carbon (`#334155`), Hydrogen (`#f8fafc`), Oxygen (`#ef4444`), Nitrogen (`#3b82f6`), Chlorine (`#22c55e`), Sodium (`#8b5cf6`), Sulfur (`#eab308`), Phosphorus (`#f97316`).
* **Shortcut**: Accessible via ribbon STEM shelf or <kbd>Ctrl+Shift+M</kbd>.

### 2.2 2D Calculus Function Grapher
* **Symmetric Difference Derivative**:
  $$f'(x_0) \approx \frac{f(x_0 + h) - f(x_0 - h)}{2h}, \quad h = 10^{-4}$$
* **Trapezoidal Definite Integration**:
  $$\int_{a}^{b} f(x)\,dx \approx \frac{b - a}{2N} \sum_{k=1}^{N} \left(f(x_{k-1}) + f(x_k)\right), \quad N = 200$$
* **Shortcut**: Accessible via ribbon Math shelf or <kbd>Ctrl+Shift+G</kbd>.

### 2.3 Technical Writing & ESL Linter
* Integrated directly into the Sidebar Ribbon ESL shelf with real-time feedback pills and advice badges.

---

## 3. Verification & Quality Assurance

1. **Automated Regression Smoke Test**:
   - `node scripts/smoke.js`
   - **Result**: `1244 passed, 0 failed` (1,240 baseline + 4 Phase 5 assertions).
2. **Strict 100% Internationalization (i18n) Parity**:
   - `node scripts/i18n-check.js`
   - **Result**: **2,030 / 2,030 translated, 0 missing, 0 leftover, 0 errors** across all 7 supported locales (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
3. **Binary Packaging Verification (Rule 5 Protocol)**:
   - Standalone portable binary: `releases/GazBoard-v6.5.0-Portable.exe`.
   - Zero-installation, self-contained single-file portable executable.

---

## 4. Key Changed Files

| File | Subsystem | Modifications |
| :--- | :--- | :--- |
| `src/js/ui/molecule-viewer.js` | STEM 3D Molecular | 3D Ball & Stick, VDW, Wireframe molecular viewer, CPK coloring, 6 STEM presets, whiteboard stamp. |
| `src/js/ui/function-grapher.js` | Math / Calculus | 2D Cartesian grapher, tangent line derivative visualizer, definite integral shading, whiteboard stamp. |
| `src/js/core/technical-linter.js` | ESL / Writing | Rule-based linter for passive voice, wordiness, duplicate words, and engineering spelling slips. |
| `src/js/core/scientific-math.js` | Math Engine | `SymbolicCAS` linear solver, derivatives, quadratic factoring, and `NotebookVariables` binding. |
| `src/js/ui/sidebar-ribbon.js` | Workbench Ribbon | Connected Molecule Viewer, Function Grapher, CAS solver, and Technical Linter to double-layered shelves. |
| `src/js/app.js` | Core Application | Integrated modals, helper methods, and shortcuts <kbd>Ctrl+Shift+M</kbd> and <kbd>Ctrl+Shift+G</kbd>. |
| `src/css/app.css` | Styling | Added Section 58 for Molecule Viewer and Function Grapher modals and canvases. |
| `src/vendor/*` | Offline Libraries | Bundled `3Dmol-min.js`, `function-plot.js`, `math.min.js`, and `nerdamer/`. |
| `src/locales/*.json` | i18n | Added 38 new translation keys across all 7 locales (2,030/2,030 parity). |
| `package.json` | Project Config | Bumped version to `6.5.0`. |
