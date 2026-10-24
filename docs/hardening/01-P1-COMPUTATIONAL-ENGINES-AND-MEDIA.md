# GazBoard Hardening Dossier — Priority 1 (P1): Computational Engines & Media Pipelines

> **Target Audience**: AI Coding Agent / Core Systems Engineer  
> **Status**: Ready for Sequential Execution (Execute directly following P0)  
> **Hardening Tier**: **`P1 — High Hardening Priority`**  
> **Objective**: Hardening high-complexity computational engines, differential numerical solvers, asynchronous media export pipelines, and AST parsing engines.

---

## Executive Overview of P1 Subsystems

The P1 tier contains computationally intensive engines with wide cross-subsystem blast radiuses:
1. **Headless MNA Circuit Simulator Engine (`F-133`)**: Sparse conductance matrix solver.
2. **Discrete Semiconductor & 555 Timer Simulation (`F-137`)**: Non-linear companion models.
3. **Multi-Session Stitched WebM Video Exporter (`F-110`)**: Asynchronous multi-track Web Audio stitching.
4. **Direct Client-Side MP4 Video Muxing (`F-139`)**: WebCodecs encoding and pure JS container muxing.
5. **Obsidian Markdown Engine & KaTeX Typesetting (`F-107`, `F-129`)**: Markdown syntax tokenizer and KaTeX math renderer.
6. **Dynamic 2D Calculus Function Grapher (`F-135`)**: Recursive descent AST evaluator and Riemann definite integration.
7. **Multi-Tab Bar & Session Persistence (`F-127`, `F-139`)**: LRU tab state serialization and lease locking.
8. **Manhattan 90° Orthogonal Elbow Routing (`F-139`)**: Collision-avoiding schematic connectors.

---

## 1. Feature Deep-Dive: Headless MNA Circuit Simulator & Semiconductors (`F-133`, `F-137`)

### 1.1 What the Feature Is
An offline circuit simulation workstation simulating industrial automation circuits, relay ladder logic, and discrete analog/digital electronics. It models BJT transistors (NPN/PNP), MOSFETs (N/P), diodes, Zener breakdown, LM741 Op-Amps, NE555 timers, and digital logic gates using Modified Nodal Analysis (MNA).

### 1.2 Implementation Mechanics & Data Structures
- **Matrix Formulation**: Formulates and solves the matrix system:
  $$\begin{bmatrix} \mathbf{G} & \mathbf{B} \\ \mathbf{C} & \mathbf{D} \end{bmatrix} \begin{bmatrix} \mathbf{v} \\ \mathbf{j} \end{bmatrix} = \begin{bmatrix} \mathbf{i} \\ \mathbf{e} \end{bmatrix}$$
  where $\mathbf{G}$ is the node conductance matrix, $\mathbf{B}/\mathbf{C}$ are independent voltage source connections, $\mathbf{v}$ are unknown node voltages, and $\mathbf{j}$ are branch currents.
- **Companion Models & Newton-Raphson**: Non-linear semiconductors are linearized into companion conductances ($g_{\text{eq}}$) and parallel current sources ($I_{\text{eq}}$) updated iteratively until $\|V^{(k+1)} - V^{(k)}\| < \epsilon$.
- **Time Stepping**: Discrete time integration ($\Delta t = 50\,\mu\text{s}$) models capacitor charging ($I = C \frac{dV}{dt}$) and inductor flux ($V = L \frac{dI}{dt}$).

### 1.3 Primary Code Files & Key Locations
- [`src/js/core/circuit-sim.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/circuit-sim.js):
  - `IndustrialCircuitSim` class definition (Lines 163–250)
  - `step(dt)` simulation loop & state updates (Lines 253–350)
  - Non-linear semiconductor diode/transistor companion evaluation (Lines 420–580)
  - NE555 timer internal comparator and flip-flop state machine (Lines 620–695)
  - Relay Ladder Logic (RLL) and motor contactor logic (Lines 700–850)
- [`src/js/ui/circuit-workbench.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/circuit-workbench.js):
  - 2.5D interactive canvas renderer & electron animation loop (Lines 95–180)
  - Digital Multimeter (DMM) voltage/current/wattage probe hit-testing (Lines 220–290)
  - Dual-trace oscilloscope buffer sampling (Lines 340–410)

### 1.4 Interacting Files & Blast Radius
- [`src/js/core/diagram-builder.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/diagram-builder.js): Bill of Materials (BOM) export.
- [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js): Modal shortcut <kbd>Ctrl+Shift+E</kbd>.
- Web Audio API context for relay clicks and continuity buzzer.

### 1.5 Specific Failure Modes & Line-Level Fragility
1. **Singular Conductance Matrix**: An ungrounded circuit node or an isolated floating wire results in a row of zeros in matrix $\mathbf{G}$, causing LU decomposition to divide by zero, propagating `NaN` across all voltages.
   - *Fragile Point*: [`src/js/core/circuit-sim.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/circuit-sim.js#L280).
2. **Exponential Explosion in Shockley Diodes**: Evaluating $I_S (e^{V_D/V_T} - 1)$ when $V_D > 1.5\text{V}$ yields numbers $>10^{25}$, causing floating-point overflow to `Infinity`.
3. **Audio Context Starvation**: Rapid relay contact chatter can schedule hundreds of Web Audio oscillators per second, exhausting OS audio buffers.

### 1.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Shunt Conductance to Ground & Voltage Clamping
// Location: src/js/core/circuit-sim.js around Line 285
function buildProtectedMatrix(numNodes, components) {
  const G = Array.from({ length: numNodes }, () => new Float64Array(numNodes));
  const G_MIN = 1e-12; // 1 pS minimum shunt prevents singular matrix
  for (let i = 0; i < numNodes; i++) {
    G[i][i] += G_MIN;
  }
  return G;
}

function clampDiodeVoltage(vNew, vOld, vt = 0.026) {
  // Limiting algorithm prevents exponential overflow in Newton-Raphson
  const vcrit = vt * Math.log(vt / (Math.SQRT2 * 1e-14));
  if (vNew > vcrit && Math.abs(vNew - vOld) > 2 * vt) {
    return vOld > 0 ? vOld + 2 * vt : vcrit;
  }
  return vNew;
}
```

---

## 2. Feature Deep-Dive: Video Export & Direct MP4 Muxing (`F-110`, `F-139`)

### 2.1 What the Feature Is
Enables users to export high-definition video recordings (720p/1080p at 30/60 FPS) of their handwritten notes synchronized with multi-track audio recordings. Supports both legacy WebM (`MediaRecorder`) and pure client-side MP4 container muxing (`mp4-muxer` + WebCodecs) without external binaries like FFmpeg.

### 2.2 Implementation Mechanics & Data Structures
- **Sequential Audio Stitching**: Combines multiple selected recording sessions into a single continuous `AudioBuffer` using an `OfflineAudioContext` (resampling to 48kHz).
- **Offscreen Render Pump**: An offscreen `Surface` renders the board notes at exact target frame timestamps ($t = 0, \frac{1}{\text{fps}}, \frac{2}{\text{fps}}\dots$).
- **WebCodecs Pipeline**: Encodes raw canvas `VideoFrame` instances with `VideoEncoder` (`avc1.640028` or `vp09.00.10.08`), piping output chunks directly into `mp4Muxer.addVideoChunk(chunk, meta)`.
- **Automatic Fallback**: If WebCodecs hardware encoding is restricted by the OS or GPU, gracefully falls back to `MediaRecorder` WebM.

### 2.3 Primary Code Files & Key Locations
- [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js):
  - `VideoExporter` class constructor (Lines 148–170)
  - `exportReplayVideo()` single-track export (Lines 172–320)
  - `exportStitchedReplayVideo()` multi-session export with MP4 muxer (Lines 323–520)
  - `pickRecordingsForVideoExport()` interactive modal (Lines 540–690)
- [`src/vendor/mp4-muxer.mjs`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/mp4-muxer.mjs):
  - Pure JS ISO Base Media File Format (ISOBMFF) container serializer.

### 2.4 Interacting Files & Blast Radius
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js): Offscreen canvas sizing and dirty draw calls.
- [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js): Stroke temporal lookup.
- Electron / Browser file saver dialogs.

### 2.5 Specific Failure Modes & Line-Level Fragility
1. **Memory Exhaustion on Long Renders**: Storing all encoded video chunks in RAM before finalizing causes out-of-memory crashes on $>20$-minute 1080p exports.
   - *Fragile Point*: [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js#L353). Must use chunk streaming or progress garbage disposal.
2. **Keyframe Interval Drift**: If keyframe requests (`keyFrame: i % (fps * 2) === 0`) are skipped, seeking in the exported MP4 video will glitch or show black frames.
3. **Non-Finite Audio Duration**: An unhandled `track.durationMs = 0` creates division-by-zero when calculating percentage progress: `pct = curMs / totalDurationMs`.

### 2.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Video Encoder Chunk Pipeline & Keyframe Forcing
// Location: src/js/export-video.js around Line 360
const videoEncoder = new VideoEncoder({
  output: (chunk, meta) => {
    if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
  },
  error: (err) => {
    console.error('WebCodecs VideoEncoder failure:', err);
    throw err;
  }
});

// Configure with explicit keyframe cadence
videoEncoder.configure({
  codec: 'avc1.4d002a', // H.264 Main Profile Level 4.2
  width,
  height,
  bitrate: 4_000_000,
  framerate: fps
});
```

---

## 3. Feature Deep-Dive: Obsidian Markdown & KaTeX Engine (`F-107`, `F-129`)

### 3.1 What the Feature Is
A specialized local-first Markdown rendering pipeline for canvas cards. Supports Obsidian extensions including `[[wikilinks]]`, tags (`#tag`), callout blocks (`> [!NOTE]`), interactive task checkboxes, KaTeX mathematical equations (`$...$`, `$$...$$`), sub/superscript (`~sub~`, `^sup^`), and YAML frontmatter.

### 3.2 Implementation Mechanics & Data Structures
- **Multi-Phase Tokenizer**: In [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js), text undergoes:
  1. YAML frontmatter extraction (`extractFrontmatter`).
  2. KaTeX equation isolation: formulas are extracted and replaced with unique alphanumeric hashes (`__KATEX_MATH_0__`) to protect mathematical symbols from markdown regex rules.
  3. GFM block parsing: tables, callouts, lists, headers.
  4. Wikilink & tag tokenization: resolves target boards and headers.
  5. KaTeX re-injection: calls `katex.renderToString()` and restores HTML.
- **Card Styling Modes**: Four toggleable visual styles: `canvas`, `window`, `minimal`, and `transparent`.

### 3.3 Primary Code Files & Key Locations
- [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js):
  - `renderMarkdown()` orchestrator (Lines 40–120)
  - `extractFrontmatter()` YAML block-list parser (Lines 130–185)
  - `tokenizeObsidianLinks()` wikilink resolver (Lines 210–265)
- [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js):
  - Canvas card layout, text wrapping, and HTML container rasterization (Lines 820–960)

### 3.4 Interacting Files & Blast Radius
- [`src/js/core/boardrefs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/boardrefs.js): Cross-board anchor navigation.
- [`src/vendor/katex/katex.min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/katex/katex.min.js): Offline mathematical typesetting engine.
- SVG vector exports: Card HTML embedded in `<foreignObject>` tags.

### 3.5 Specific Failure Modes & Line-Level Fragility
1. **Catastrophic Regex Backtracking**: Unanchored regexes with nested repetition (e.g. `(\[[^\]]+\]\([^)]+\))+`) hang the browser on malicious or deeply nested text.
   - *Fragile Point*: [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js#L230).
2. **KaTeX Parse Exception Freezes**: An unclosed math bracket (e.g. `$\frac{1}{2$`) causes KaTeX to throw a fatal error if `throwOnError: false` is omitted, aborting board card rendering.
3. **Currency Symbol Collision**: Prose containing dollar prices (e.g., "Costs \$10 and \$20") is misidentified as an inline LaTeX math formula.

### 3.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe KaTeX Rendering with Currency Disambiguation
// Location: src/js/core/markdown.js around Line 85
export function safeRenderKaTeX(mathStr, isBlock = false) {
  try {
    return katex.renderToString(mathStr, {
      displayMode: isBlock,
      throwOnError: false, // Prevents fatal renderer crashes
      errorColor: '#f43f5e',
      strict: false
    });
  } catch (err) {
    console.warn('KaTeX parsing error caught:', err);
    return `<span class="katex-error" style="color:#f43f5e;">${escapeHtml(mathStr)}</span>`;
  }
}
```

---

## 4. Feature Deep-Dive: Dynamic 2D Calculus Function Grapher (`F-135`)

### 4.1 What the Feature Is
A full mathematical graphing workstation (<kbd>Ctrl+Shift+G</kbd>). Plots 2D Cartesian curves ($y = f(x)$), computes dynamic tangent derivative slopes ($\frac{df}{dx}$), secant lines, and Riemann definite integrals ($\int_a^b f(x)\,dx$) with area shading and step-by-step LaTeX formula output.

### 4.2 Implementation Mechanics & Data Structures
- **AST Mathematical Parsing**: Uses `FunctionPlot` and `math.js` to parse expressions without `eval()`.
- **Numerical Derivative**: Evaluates central finite difference:
  $$\frac{df}{dx} \approx \frac{f(x + h) - f(x - h)}{2h}, \quad h = 10^{-5}$$
- **Numerical Integration**: Implements Composite Simpson's Rule with adaptive subdivision:
  $$\int_a^b f(x)\,dx \approx \frac{\Delta x}{3} \sum_{i=0}^{n} c_i f(x_i)$$
- **Extrema & Root Isolation**: Scans discrete interval segments to find zero-crossings ($y = 0$) and sign changes in numerical derivative ($\frac{dy}{dx} = 0$).

### 4.3 Primary Code Files & Key Locations
- [`src/js/ui/function-grapher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/function-grapher.js):
  - `FunctionGrapherModal` class (Lines 25–95)
  - 2D Canvas plot render loop & coordinate grid mapping (Lines 140–230)
  - Dynamic tangent slider & Riemann area shader (Lines 280–370)
  - Curve tracing crosshair & automated root/extrema ring badges (Lines 420–510)
- [`src/vendor/function-plot.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/function-plot.js):
  - Curve sampling engine.

### 4.4 Interacting Files & Blast Radius
- [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js): Scientific math utilities.
- [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js): Whiteboard snapshot stamping.

### 4.5 Specific Failure Modes & Line-Level Fragility
1. **Vertical Asymptote Line Artifacts**: Plotting functions like $y = \tan x$ or $y = \frac{1}{x}$ connects $-\infty$ to $+\infty$ with an ugly vertical line if discontinuity detection is absent.
   - *Fragile Point*: [`src/js/ui/function-grapher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/function-grapher.js#L195).
2. **Divide-by-Zero in Riemann Slicing**: When integrating across a pole ($x = 0$ in $\frac{1}{x}$), Simpson's rule accumulates `Infinity` or `NaN`.
3. **Canvas Coordinate Overflow**: Extreme zoom limits (e.g. $10^{12}$) exceed Canvas2D integer precision, distorting gridlines.

### 4.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Asymptote Discontinuity Detection Guard
// Location: src/js/ui/function-grapher.js around Line 205
function sampleFunctionCurve(fn, xMin, xMax, numSamples, maxDerivativeJump = 100) {
  const points = [];
  const dx = (xMax - xMin) / numSamples;
  let lastY = null;

  for (let i = 0; i <= numSamples; i++) {
    const x = xMin + i * dx;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      points.push(null); // Discontinuity break
      lastY = null;
      continue;
    }
    // Detect asymptote jump between opposite infinities
    if (lastY !== null && Math.abs(y - lastY) > maxDerivativeJump && Math.sign(y) !== Math.sign(lastY)) {
      points.push(null); // Break path to avoid vertical line artifact
    } else {
      points.push({ x, y });
    }
    lastY = y;
  }
  return points;
}
```

---

## 5. Feature Deep-Dive: Multi-Tab Bar & Session Persistence (`F-127`, `F-139`)

### 5.1 What the Feature Is
A Google Chrome-style tab bar header (`TabBar`) allowing users to open and switch between multiple boards instantly. Implements an LRU session cache keeping recently used boards in sub-5ms memory while persisting open tab lists and split positions across app restarts.

### 5.2 Implementation Mechanics & Data Structures
- **Session Cache**: `WorkspaceSessionManager` maintains up to 8 board document objects in active RAM.
- **Serialization**: Writes open tab IDs, active tab index, and split ratio into `localStorage.getItem('gazboard:session:v1')`.
- **Smart Lease Locking**: When running multi-window desktop instances, acquires a timestamped lease lock to prevent two windows from simultaneously overwriting the same board file.

### 5.3 Primary Code Files & Key Locations
- [`src/js/ui/tabs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/tabs.js):
  - `TabBar` class & DOM tab pill rendering (Lines 15–90)
  - `WorkspaceSessionManager` serialization (Lines 120–185)
  - Tab close, reorder, and dirty dot indicators (Lines 210–280)
- [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js):
  - Window focus lease check and active editor handshake (Lines 1120–1180)

### 5.4 Interacting Files & Blast Radius
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Document loading and saving.
- [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js): Canvas cache clearing on tab switch.

### 5.5 Specific Failure Modes & Line-Level Fragility
1. **Storage Quota Exceeded**: Storing multiple heavy boards with embedded images directly in `localStorage` exceeds the 5MB browser quota, throwing a fatal `QuotaExceededError`.
   - *Fragile Point*: [`src/js/ui/tabs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/tabs.js#L145).
2. **Stale Session Overwrite**: Closing window A after window B made newer edits can overwrite the latest board revision if session saving lacks revision stamps.
3. **Tab Bar Overflow Clipping**: Opening 25 tabs squashes tab widths below readable thresholds without a horizontal scroll container.

### 5.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Quota-Aware Session Persistence
// Location: src/js/ui/tabs.js around Line 150
export function persistSessionSafe(tabs, activeIndex) {
  try {
    // Only store lightweight metadata: IDs, titles, and layout state
    const cleanSession = {
      version: 1,
      tabs: tabs.map(t => ({ id: t.id, name: t.name })),
      activeIndex,
      savedAt: Date.now()
    };
    localStorage.setItem('gazboard:session:v1', JSON.stringify(cleanSession));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Pruning session history.');
      localStorage.removeItem('gazboard:session:v1');
    }
  }
}
```

---

## 6. Feature Deep-Dive: Manhattan 90° Orthogonal Routing & Snap Ports (`F-139`)

### 6.1 What the Feature Is
Generates clean 90-degree orthogonal elbow connectors for circuit schematics, mind maps, and block diagrams. Automatically avoids obstacles and anchors cleanly to North (`n`), South (`s`), East (`e`), or West (`w`) cardinal magnetic ports on board cards.

### 6.2 Implementation Mechanics & Data Structures
- **Orthogonal Pathfinding**: `routeOrthogonal(start, end, obstacles)` computes a 2-bend (Z-shape) or 3-bend (C-shape) route depending on relative quadrant alignment.
- **Magnetic Snap Ports**: `snapPortPoints(box)` calculates cardinal perimeter midpoints:
  $$P_n = (x + \frac{w}{2}, y), \quad P_s = (x + \frac{w}{2}, y + h), \quad P_e = (x + w, y + \frac{h}{2}), \quad P_w = (x, y + \frac{h}{2})$$
- **Thickness Stepping**: Calibrates elbow chamfer radius to stroke line width.

### 6.3 Primary Code Files & Key Locations
- [`src/js/core/connectors.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/connectors.js):
  - `routeOrthogonal()` Manhattan elbow routing (Lines 85–165)
  - `snapPortPoints()` cardinal port generator (Lines 180–215)
  - `drawArrowhead()` barbed and elongated arrowheads (Lines 240–310)
- [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js):
  - Canvas connector rendering with endpoint caps (Lines 1120–1180)

### 6.4 Interacting Files & Blast Radius
- [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js): Arrow drawing tool pointer events.
- [`src/js/core/hit.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/hit.js): Hit-testing multi-segment polyline connectors.

### 6.5 Specific Failure Modes & Line-Level Fragility
1. **Collinear Degeneration**: When start and end points share identical X or Y coordinates, an unhardened 3-bend algorithm generates zero-length segments that flip arrowhead angles $180^\circ$.
   - *Fragile Point*: [`src/js/core/connectors.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/connectors.js#L112).
2. **Infinite Pathfinding Loop on Overlapping Cards**: When two cards overlap, obstacle clearance bounding boxes intersect, causing path search to oscillate.

### 6.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Degenerate Segment Pruning in Orthogonal Routing
// Location: src/js/core/connectors.js around Line 125
export function cleanOrthogonalPath(points) {
  if (!points || points.length < 2) return points;
  const cleaned = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    // Remove duplicate consecutive coordinates
    if (Math.abs(prev.x - curr.x) < 0.001 && Math.abs(prev.y - curr.y) < 0.001) {
      continue;
    }
    cleaned.push(curr);
  }
  return cleaned;
}
```

---

## 7. Execution Verification Commands

After completing hardening in this tier, execute these verification commands in PowerShell:

```powershell
# 1. Verify custom features and computational engines:
node scripts/smoke.js --new-features

# 2. Strict translation verification (must remain 2,238 / 2,238 keys):
node scripts/i18n-check.js
```
