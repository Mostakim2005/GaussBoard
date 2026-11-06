# Release Dossier — GazBoard v6.3.0

> **Release Version**: `v6.3.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(stem): implement Phase 3 STEM Engines, Interactive Simulations & Scientific UI/UX (v6.3.0)`  
> **Binary Deliverable**: `GazBoard-v6.3.0-Portable.exe`  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,240 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps, Study Tape persistence).

---

## 1. Executive Summary & Phase 3 Scope

Release **`v6.3.0`** delivers **Phase 3** of the Engineering, STEM Revision & EE Simulation Architecture roadmap defined in [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md).

It establishes an interactive **Grades 11–12 STEM & Scientific Simulation Suite** within GazBoard:
1. **Chemical Equation Balancer & Stoichiometry Engine**: Pure JavaScript Gaussian elimination matrix solver, IUPAC atomic weights, molar mass calculator, reaction classifier, and 1-click canvas card stamping.
2. **Interactive Periodic Table Dock & Element Inspector**: High-density vector SVG/HTML5 grid of all 118 chemical elements (H to Og), category color filters, live search, electron configurations, and element tile cards.
3. **Offline PhET Interactive Simulation Runner**: Sandboxed HTML5 Canvas 2D interactive physical and electrical simulations (Ohm's Law circuit construction, projectile kinematics, wave interference ripples), real-time parameter sliders, and 1-click frame snapshot to whiteboard canvas.
4. **STEM Formula Encyclopedia & Variable Solver**: Physics and engineering formula catalog with automatic single-variable algebraic solving and step-by-step derivations.
5. **Offline Technical Dictionary & Pronunciation Popover**: Curated engineering definitions, IPA phonetics, technical collocations, and zero-download native Web Speech TTS.

---

## 2. Key Features & Subsystem Deliverables

### 2.1 Chemical Equation Balancer & Stoichiometry Engine (`src/js/core/chemistry.js`)
* **Matrix Balancer Algorithm**:
  * Implements exact rational Gaussian elimination with fraction arithmetic ($O(N^3)$ complexity, sub-millisecond execution).
  * Automatically parses complex multi-character elements, nested parentheses (e.g. $\text{Fe}_2(\text{SO}_4)_3$, $\text{Ca}(\text{OH})_2$), and multi-reactant systems (e.g. $\text{KMnO}_4 + \text{HCl} \rightarrow \text{KCl} + \text{MnCl}_2 + \text{H}_2\text{O} + \text{Cl}_2$).
* **Stoichiometry & Reaction Classification**:
  * Calculates exact molar masses ($g/mol$) using the standard IUPAC atomic weights table.
  * Classifies reaction types: *Synthesis / Combination*, *Decomposition*, *Hydrocarbon Combustion*, *Single Replacement*, *Double Replacement*, *Acid-Base Neutralization*, and *Redox*.
* **1-Click Card Stamping**:
  * Button `[📌 Insert Reaction Card to Canvas]` places a structured chemical reaction summary directly onto the whiteboard canvas.

### 2.2 Interactive Periodic Table Dock (`src/js/ui/periodic-table.js`)
* **118-Element Interactive Grid**:
  * Vector grid covering all 7 periods and 18 groups, plus Lanthanides and Actinides.
  * Color-coded category filters (Alkali, Alkaline Earth, Transition, Metalloid, Nonmetal, Halogen, Noble Gas).
  * Real-time search filter by element symbol, name, or atomic number.
* **Element Dossier & Tile Stamp**:
  * Displays atomic number, symbol, name, atomic weight, series, electron configuration, Pauling electronegativity, group, and period.
  * `[📌 Insert Element Tile to Canvas]` stamps an element card onto the canvas.

### 2.3 Offline PhET Simulation Runner Modal (`src/js/ui/phet-runner.js`)
* **Interactive HTML5 Physics & Circuit Labs**:
  * *Ohm's Law & Circuit Lab*: Adjust Voltage (0.5–15 V) and Resistance (10–1000 $\Omega$), with live yellow current electron flow dots, multimeter readouts ($I$ in mA, $P$ in W).
  * *Projectile Motion Kinematics*: Adjustable launch angle ($10^\circ–85^\circ$), muzzle velocity ($5–50\text{ m/s}$), animated parabolic flight, and live readouts of maximum height, range, and flight time.
  * *Wave Interference & Superposition*: Two-source wave ripples with adjustable frequency and constructive/destructive interference patterns.
* **Canvas Snapshot Capture**:
  * Button `[📸 Capture Snapshot to Board]` exports the simulation canvas to a high-resolution PNG and embeds it directly onto the board for immediate pen annotation.

### 2.4 STEM Formula Encyclopedia & Solver (`src/js/core/formula-graph.js`)
* **Formula Knowledge Base**:
  * Kinematics ($v = u + at$, $s = ut + \frac{1}{2}at^2$), Dynamics ($F = ma$, $W = Fd$), Circuits ($V = IR$, $P = VI$), Energy ($E_k = \frac{1}{2}mv^2$), and Waves ($v = f\lambda$).
  * Automatic single-variable algebraic solver and LaTeX formula card stamping.

### 2.5 Offline Technical Dictionary & Voice Popover (`src/js/ui/dictionary-popover.js`)
* **Curated Engineering Lexicon**:
  * Core technical definitions across electrical, chemical, and physical engineering.
  * IPA phonetic transcription, grammatical category, and high-frequency collocations.
* **Native Windows Speech Synthesis**:
  * Zero-download text-to-speech using native `window.speechSynthesis` with speech rate tuning.

---

## 3. Verification & Quality Assurance

1. **Automated Regression Smoke Test**:
   - `node scripts/smoke.js`
   - **Result**: `1240 passed, 0 failed` across all canvas drawing, gesture recognition, audio sync, audio replay, study tape, and storage suites.
2. **Strict 100% Internationalization (i18n) Parity**:
   - `node scripts/i18n-check.js`
   - **Result**: **1,954 / 1,954 translated, 0 missing, 0 errors** across all 7 supported locales (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
3. **Binary Packaging Verification (Rule 5 Protocol)**:
   - Standalone portable binary: `GazBoard-v6.3.0-Portable.exe`.
   - Zero-installation, runs out of the box with zero registry pollution.

---

## 4. Key Changed Files

| File | Subsystem | Modifications |
| :--- | :--- | :--- |
| `src/js/core/chemistry.js` | Chemistry Engine | Gaussian elimination equation balancer, IUPAC atomic weights, molar mass calculator, reaction classifier. |
| `src/js/ui/periodic-table.js` | UI / Periodic Table | 118-element periodic table modal, search/category filter, element inspector, canvas tile stamp. |
| `src/js/ui/phet-runner.js` | UI / PhET Runner | Sandboxed Canvas 2D simulation runner (Ohm's Law, Projectile, Waves), parameter sliders, frame capture. |
| `src/js/core/formula-graph.js` | Physics & Math | Formula encyclopedia, variable algebraic solver, LaTeX formula card inserter. |
| `src/js/ui/dictionary-popover.js` | ESL / Dictionary | Technical vocabulary database, IPA phonetics, native Web Speech TTS, definition card stamp. |
| `src/js/ui/sidebar-ribbon.js` | Workbench Ribbon | Connected equation balancer, reaction stamp, periodic table, PhET runner, and dictionary lookup. |
| `src/css/app.css` | Styling | Added Section 56: Periodic table grid, element cells, PhET runner canvas, sliders, and dictionary popover. |
| `src/js/app.js` | Core Application | Wired `periodicTableModal`, `phetRunnerModal`, `dictionaryPopover`, and shortcut methods. |
| `src/locales/*.json` | i18n | Added 44 translation keys across Arabic, Bengali, German, Spanish, Portuguese, and Chinese. |
| `package.json` | Project Config | Bumped version to `6.3.0`. |
