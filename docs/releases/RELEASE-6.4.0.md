# Release Dossier — GazBoard v6.4.0

> **Release Version**: `v6.4.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(circuits): implement Phase 4 Realistic 2D/2.5D Industrial Circuit Simulation & Headless MNA Engine (v6.4.0)`  
> **Binary Deliverable**: [`releases/GazBoard-v6.4.0-Portable.exe`](../../releases/GazBoard-v6.4.0-Portable.exe) (`108,231,694 bytes` / `103.22 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,240 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps, Study Tape persistence).

---

## 1. Executive Summary & Phase 4 Scope

Release **`v6.4.0`** delivers **Phase 4** of the Engineering, STEM Revision & EE Simulation Architecture roadmap defined in [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md).

It establishes an interactive **Realistic 2D/2.5D Industrial Circuit Simulation & Headless Engine** within GazBoard:
1. **Headless Circuit Simulation Engine (`src/js/core/circuit-sim.js`)**:
   - Modified Nodal Analysis (MNA) and multi-pass event-driven potential propagation.
   - Solves 3-Phase AC (400V 50Hz L1/L2/L3), Single-Phase AC (230V 50Hz), and Regulated DC (24V DC / 12V DC) power networks.
   - Accurately models electro-mechanical dynamics: contactor armature pull-in, auxiliary self-holding latches, thermal overload $I^2 t$ trip curves, and 3-phase induction motor mechanical inertia with slip, torque, and single-phasing stall detection.
2. **Interactive 2.5D Industrial Workbench Modal (`src/js/ui/circuit-workbench.js`)**:
   - Perforated steel DIN-rail mounting bench with high-resolution vector representations of industrial hardware:
     - 3-Phase Miniature Circuit Breakers (`QF`: toggle switch [ON]/[OFF], rated trip currents).
     - Modular AC Contactors (`KM`: moving red/slate armature plunger, A1-A2 coil, 1-2, 3-4, 5-6 main NO poles, 13-14 aux NO, 21-22 aux NC).
     - Thermal Overload Relays (`FR`: bimetal heaters, 95-96 NC control trip, 97-98 NO alarm signaling, red test slide, blue manual reset plunger).
     - Industrial Pushbutton Stations (`SB`: green Start [I] NO 3-4, red Stop [O] NC 1-2, mushroom Emergency Stop).
     - 3-Phase Induction Motors (`M`: dynamic rotating cooling fan / shaft displaying RPM and direction).
     - Pilot Indicator Lights (`HL`: Green Run, Yellow Trip, with radial luminous glow).
   - Magnetic terminal port snapping (18px radius) and smooth cubic Bézier spline wire routing.
   - Live animated current electron flow particles ($v \propto I$).
3. **Interactive Digital Multimeter (DMM) & Virtual Test Instruments**:
   - Handheld DMM with rotary mode selector (`V~`, `V=`, `A~`, `A=`, `Ω`, `CONT`).
   - Draggable Red and Black probe leads that snap onto any terminal lugs.
   - Real-time 7-segment digital LCD readout with engineering units.
   - Procedural Web Audio API continuity buzzer tone (2000 Hz) when resistance $< 10\,\Omega$.
4. **Virtual Dual-Trace Waveform Oscilloscope**:
   - Collapsible bottom drawer monitoring sinusoidal AC voltages in real time.
5. **Procedural Web Audio API Sound Synthesizer**:
   - Zero-download, offline acoustic feedback: metallic contactor clack, circuit breaker snap, tactile pushbutton click, and multimeter beep.
6. **Relay Ladder Logic (RLL) & Mermaid Builder (`src/js/core/diagram-builder.js`)**:
   - Standard industrial ladder logic rungs (DOL starter, forward-reverse interlocks, star-delta timers, safety loops).
   - 1-Click insertion of Markdown ladder rungs and Bill of Materials (BOM) onto whiteboard canvas.

---

## 2. Key Features & Subsystem Deliverables

### 2.1 Headless Circuit Simulation Engine (`src/js/core/circuit-sim.js`)
* **Nodal Voltage Propagation**:
  * Multi-pass iterative solver propagating instantaneous potentials and RMS voltages across closed switches, auxiliary contacts, and external wires.
  * Detects open-circuit, short-circuit, and overload conditions.
* **Dynamic Machine Models**:
  * 3-Phase Induction Motor computes rotational speed $\omega(t)$ towards 1440 RPM under balanced 3-phase excitation; detects phase loss resulting in single-phasing stall and overcurrent.
* **Standard Industrial Presets**:
  * `Preset 1: Direct-On-Line (DOL) Motor Starter` with auxiliary contact `KM1:13-14` latching across Start PB `SB2:3-4`.
  * `Preset 2: Forward-Reverse Interlock Starter` featuring dual contactors `KM1` and `KM2` with electrical cross-interlock.
  * `Preset 3: Empty Breadboard` for custom point-to-point industrial wiring.

### 2.2 2.5D Industrial Workbench Modal (`src/js/ui/circuit-workbench.js`)
* **Workbench Interaction**:
  * Pulling a wire from any terminal lug draws a dynamic cubic Bézier spline with realistic gravity sag.
  * Wire color coding standard: Brown (L1), Black (L2), Grey (L3), Blue (Neutral), Green/Yellow (PE Earth), Red (Control/DC+).
  * Right-clicking any terminal lug instantly disconnects all attached wires.
  * Interactive controls: clicking breaker flips lever; pressing Start PB engages contactor coil with audible click; pressing FR1 Test trips protection circuit; pressing Reset button clears fault.
* **Whiteboard Integration & Invariant Continuity**:
  * `[📸 Stamp to Whiteboard]` captures the active simulated circuit and stamps it as a high-resolution PNG image on the GazBoard canvas, preserving millisecond timestamps (`p.t`) for seamless audio replay.
  * `[📋 Export BOM & Ladder]` exports complete Bill of Materials and ladder logic diagrams into the clipboard and canvas notes.

---

## 3. Verification & Quality Assurance

1. **Automated Regression Smoke Test**:
   - `node scripts/smoke.js`
   - **Result**: `1240 passed, 0 failed` across all canvas drawing, gesture recognition, audio sync, audio replay, study tape, and storage suites.
2. **Strict 100% Internationalization (i18n) Parity**:
   - `node scripts/i18n-check.js`
   - **Result**: **1,993 / 1,993 translated, 0 missing, 0 errors** across all 7 supported locales (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
3. **Binary Packaging Verification (Rule 5 Protocol)**:
   - Standalone portable binary: [`releases/GazBoard-v6.4.0-Portable.exe`](../../releases/GazBoard-v6.4.0-Portable.exe) (`108,231,694 bytes`).
   - Zero-installation, runs out of the box with zero registry writes or elevation.

---

## 4. Key Changed Files

| File | Subsystem | Modifications |
| :--- | :--- | :--- |
| `src/js/core/circuit-sim.js` | Circuit Engine | Headless Modified Nodal Analysis (MNA), electro-mechanical relay logic, motor model, Web Audio synth. |
| `src/js/ui/circuit-workbench.js` | UI / Workbench | 2.5D industrial workbench modal, magnetic terminal snapping, wire routing, DMM HUD, oscilloscope. |
| `src/js/core/diagram-builder.js` | Diagramming / Ladder | Industrial Relay Ladder Logic (RLL) catalog and visual Mermaid form assistant. |
| `src/js/ui/sidebar-ribbon.js` | Workbench Ribbon | Connected 2.5D simulation workbench, presets selector, multimeter HUD, and ladder logic inserter. |
| `src/css/app.css` | Styling | Added Section 57: Perforated workbench backplate, DIN-rails, DMM HUD, LCD styling, oscilloscope drawer. |
| `src/js/app.js` | Core Application | Integrated `CircuitWorkbenchModal`, exposed `openCircuitWorkbench()`, and bound shortcut `Ctrl+Shift+E`. |
| `src/locales/*.json` | i18n | Added 41 new translation keys and cleaned leftovers across all 7 locales (1,993/1,993 parity). |
| `package.json` | Project Config | Bumped version to `6.4.0`. |
