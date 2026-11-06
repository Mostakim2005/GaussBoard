# Release Dossier — GazBoard v6.7.0

> **Release Version**: `v6.7.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(stem): Phase 7 STEM Powerhouse (v6.7.0)`  
> **Binary Deliverable**: `GazBoard-v6.7.0-Portable.exe` (`113,075,190 bytes` / `107.84 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity across 7 locales, 0 native C++ dependencies, preserved `p.t` stroke timestamps, finite audio safeguard, scene partitioning during audio replay, Study Tape toggle persistence).

---

## 1. Executive Summary & Version 6.7.0 Scope

Release **`v6.7.0` (Phase 7 — STEM Powerhouse)** elevates GazBoard into an offline scientific, electronic, and chemical workstation. Taking architectural inspiration from Falstad Circuit Simulator, ChemDraw, MolView, Desmos 3D, and PhET Interactive Simulations, all simulation engines and visualizers are built in pure, portable JavaScript with zero external native binaries:

1. **Falstad-Style Analog, Digital & Semiconductor Circuit Simulator (`src/js/core/circuit-sim.js`, `src/js/ui/circuit-workbench.js`)**:
   - **Discrete Semiconductors**: BJT NPN (`bjt_npn`), BJT PNP (`bjt_pnp`), MOSFET N-Channel (`mosfet_n`), MOSFET P-Channel (`mosfet_p`), Silicon Diodes (`diode`), Zener Diodes (`zener_diode`), and Light Emitting Diodes (`led`) with dynamic optical emission glow.
   - **Analog Integrated Circuits**: LM741 Operational Amplifier (`opamp`) with rail saturation modeling ($V_{\text{out}} = \text{clamp}(A_{\text{OL}}(V_+ - V_-), V_{\text{ee}}, V_{\text{cc}})$), and NE555 Precision Timer IC (`timer_555`) with astable oscillation state machine.
   - **Digital Logic Gates**: Full Boolean logic gate palette (AND, OR, NOT, NAND, NOR, XOR, XNOR) with 5V TTL logic thresholds, JK flip-flop / D flip-flop state elements, and 7-segment LED display (`display_7seg`) with BCD decoding.
   - **Reactive & Passive Components**: Inductors ($L$) with back-EMF calculation ($V_L = L \frac{di}{dt}$), Capacitors ($C$) with displacement charge ($I_C = C \frac{dv}{dt}$).
   - **5 New Functional Industrial Presets**:
     1. `NE555 LED Flasher / Astable Multivibrator`
     2. `LM741 Inverting Operational Amplifier`
     3. `BJT Common Emitter Amplifier`
     4. `Digital 1-Bit Half / Full Logic Adder`
     5. `Diode Full-Wave Bridge Rectifier with Filter Capacitor`
   - **Terminal Hitbox & Probe Engine**: Registered terminal hitboxes (`B, C, E`, `G, D, S`, `IN+, IN-, V+, V-, OUT`, pins 1–8 for 555) with live DMM multimeter voltage/power readouts and dual-channel virtual oscilloscope.

2. **2D Chemical Structure Drawing & SMILES 2D/3D Parser (`src/js/ui/chemical-sketcher.js`)**:
   - **Interactive 2D Chemical Canvas**: Pure canvas drawing engine supporting single, double, triple, and wedged stereobonds.
   - **Heteroatom Palette & Ring Stamps**: Elements C, H, O, N, P, S, Cl, Br, F, I; Benzene, Cyclopentane, and Cyclohexane instant stamps.
   - **Pure JavaScript SMILES Parser**: Parses chemical notations into 2D molecular graphs with automated branch and ring closure detection (e.g. Aspirin, Caffeine, Paracetamol, Ibuprofen, Benzene).
   - **VSEPR 3D Coordinate Generator**: Evaluates 2D connectivity matrices into 3D Cartesian coordinates.
   - **1-Click Bridges**: `[🌐 View in 3D]` bridging into `MoleculeViewerModal` and `[📸 Stamp 2D Structure]` stamping directly to the whiteboard. Accessible via ribbon STEM menu or <kbd>Ctrl+Shift+K</kbd>.

3. **3D Surface Function Grapher & Polar Calculus Visualizer (`src/js/ui/function-grapher.js`)**:
   - **3D Cartesian Surface Graphing**: $z = f(x, y)$ surface rendering with mouse orbit rotation (azimuth $\phi$ and elevation $\theta$), mouse wheel zoom, altitude color mapping (gradient blue-to-red based on $z$ elevation), and painter's algorithm depth-sorting.
   - **Polar Curve Graphing**: $r = f(\theta)$ polar plotting with polar grid concentric rings, radial angle radians, and automatic domain evaluation.
   - **Unified Multi-Mode Header**: Seamless tab navigation across `📈 2D Cartesian`, `🌐 3D Surface`, and `⭕ Polar`.

4. **Pre-built Physics Simulations & 2D Rigid Sandbox (`src/js/ui/phet-runner.js`)**:
   - **Geometrical Optics Ray Tracing**: Thin convex lens with adjustable focal length ($f$), object distance ($d_o$), and height ($h_o$); live real-time ray tracing (parallel ray passing through focal point, chief ray passing through optical center) and real/virtual image formation rendering.
   - **Coulomb Electric Field & Dipole Vector Lines**: Positive and negative point charges with interactive drag-and-drop; calculates Coulomb superposition field vectors $\mathbf{E} = \sum \frac{k q_i}{r_i^2} \hat{\mathbf{r}}_i$ with color-coded electric potential gradient field arrows.
   - **2D Momentum & Elastic/Inelastic Collision Lab**: Two colliding masses with adjustable velocity vectors, mass values, and coefficient of restitution $e \in [0, 1]$; real-time momentum and kinetic energy readouts ($p = m_1 v_1 + m_2 v_2$).
   - **2D Rigid-Body Physics Gravity Sandbox**: Multiple particles with Newtonian gravity, restitution bouncing, boundary containment, and interactive drag-and-throw impulse vectors.

---

## 2. Invariant & Verification Audit

| Requirement | Target | Achieved Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **Full Smoke Test Suite** | 100% Pass Rate | **1,248 Passed, 0 Failed** | `node scripts/smoke.js` |
| **Strict Translation Parity** | 100% across all 7 locales | **2,093 / 2,093 keys (100%)** | `node scripts/i18n-check.js` |
| **Zero Native Addons** | Pure JS / Portable | **0 C++ Native Modules** | Audit check (`package.json`) |
| **Content Security Policy** | No `eval` / `new Function` | **Safe AST Parsing** | Content-Security-Policy compliance |
| **Stroke Timestamp Preservation** | Preserve `p.t` | **Verified** | `Store.add` / `tools.js` invariants |
| **Binary Deliverable** | Versioned Portable Binary | **GazBoard-v6.7.0-Portable.exe** | `releases/` directory |

---

## 3. Deliverable Matrix

| Deliverable | Path | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Portable Binary** | `GazBoard-v6.7.0-Portable.exe` | Win32 Binary | Zero-install standalone executable with all Phase 1–7 STEM capabilities bundled. |
| **Circuit Engine** | [`src/js/core/circuit-sim.js`](../../src/js/core/circuit-sim.js) | Core Module | Semiconductor, 555 timer, opamp, and logic gate SPICE-like simulation engine. |
| **Circuit Workbench** | [`src/js/ui/circuit-workbench.js`](../../src/js/ui/circuit-workbench.js) | UI Component | Virtual breadboard, probe router, and schematic renderer. |
| **Chemical Sketcher** | [`src/js/ui/chemical-sketcher.js`](../../src/js/ui/chemical-sketcher.js) | UI Component | 2D structure drawing, bond palette, and SMILES 2D/3D parser. |
| **Function Grapher** | [`src/js/ui/function-grapher.js`](../../src/js/ui/function-grapher.js) | UI Component | 2D, 3D surface, and polar function plotting modal. |
| **Physics Lab** | [`src/js/ui/phet-runner.js`](../../src/js/ui/phet-runner.js) | UI Component | Optics, Coulomb field, collisions, and rigid-body mechanics presets. |
