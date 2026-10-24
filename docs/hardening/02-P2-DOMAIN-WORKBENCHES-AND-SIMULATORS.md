# GazBoard Hardening Dossier — Priority 2 (P2): Domain Workbenches & Simulators

> **Target Audience**: AI Coding Agent / Core Systems Engineer  
> **Status**: Ready for Sequential Execution (Execute directly following P1)  
> **Hardening Tier**: **`P2 — Moderate Hardening Priority`**  
> **Objective**: Hardening specialized scientific workbenches, 3D molecular viewers, chemical parsers, query engines, and spaced repetition runners.

---

## Executive Overview of P2 Subsystems

The P2 tier encompasses domain-specific interactive workstations:
1. **Pure Canvas 3D Molecular Structure Viewer (`F-134`)**: WebGL molecular visualizer.
2. **ChemDraw 2D Chemical Sketcher & SMILES Parser (`F-137`)**: 2D/3D chemical notation parser.
3. **Symbolic CAS Engine & Reactive Variables (`F-135`)**: Polynomial algebra and reactive variables.
4. **3D Surface & Polar Function Graphing (`F-137`)**: Wireframe 3D depth-sorting and polar plots.
5. **Dataview Query Engine & In-Canvas Kanban Cards (`F-139`)**: In-canvas table queries and agile boards.
6. **FSRS v5 Spaced Repetition & Anki Bridge (`F-131`)**: 17-parameter memory stability scheduler.
7. **Document Navigator, PDF Sidebar & OCR (`F-126`)**: PDF outline tree and Tesseract OCR.
8. **Knowledge Graph BFS Clustering & Halos (`F-128`, `F-139`)**: Connected component cluster halos.
9. **Pre-Built Physics Simulation Lab (`F-137`)**: Optics, Coulomb fields, and 2D collisions.
10. **Live DC Voltage Slider & Overheat Alarm (`F-136`)**: Multimeter Wattage mode and thermal badges.
11. **Click-to-Measure Bond Distances/Angles (`F-136`)**: Euclidean 3D geometry calculator.
12. **Natural Math-to-LaTeX Converter (`F-138`)**: Conversational sentence to equation converter.
13. **Image Occlusion Dual Review Modes (`F-138`)**: Hide All vs Hide One review HUD.

---

## 1. Feature Deep-Dive: 3D Molecular Viewer & ChemDraw SMILES (`F-134`, `F-137`)

### 1.1 What the Feature Is
A chemical modeling environment combining a 2D skeletal sketcher (`ChemicalSketcherModal`) and a 3D ball-and-stick/VDW molecular viewer (`MoleculeViewerModal` / <kbd>Ctrl+Shift+M</kbd>). Users can draw molecules, paste SMILES strings, measure 3D bond lengths/angles, and export high-res PNG cards to the board.

### 1.2 Implementation Mechanics & Data Structures
- **3Dmol Integration**: Uses pure JS 3Dmol engine (`src/vendor/3Dmol-min.js`) rendering hardware-accelerated CPK models.
- **SMILES Parser**: In [`src/js/ui/chemical-sketcher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/chemical-sketcher.js), parses linear and branched SMILES (e.g., `CC(=O)OC1=CC=CC=C1C(=O)O` for Aspirin), resolving ring closures (`%10`, `1-9`), aromaticity (`c`, `n`), and stereochemical bonds.
- **Bond Measurement Geometry**:
  - Distance: Euclidean norm $d = \|\mathbf{r}_2 - \mathbf{r}_1\|$ in Ångströms.
  - Angle: $\theta = \arccos\left(\frac{(\mathbf{r}_1 - \mathbf{r}_2)\cdot(\mathbf{r}_3 - \mathbf{r}_2)}{\|\mathbf{r}_1 - \mathbf{r}_2\|\|\mathbf{r}_3 - \mathbf{r}_2\|}\right)$.

### 1.3 Primary Code Files & Key Locations
- [`src/js/ui/molecule-viewer.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/molecule-viewer.js):
  - `MoleculeViewerModal` class (Lines 20–85)
  - 3D coordinate parsing & PDB importer (Lines 110–190)
  - Click-to-measure bond distance/angle tracker (Lines 220–305)
- [`src/js/ui/chemical-sketcher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/chemical-sketcher.js):
  - 2D Canvas bond drawing and ring stamps (Lines 35–140)
  - SMILES tokenizer and 2D coordinate layout generator (Lines 180–310)

### 1.4 Interacting Files & Blast Radius
- [`src/vendor/3Dmol-min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/3Dmol-min.js): WebGL canvas context.
- [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js): Whiteboard molecule card stamps.

### 1.5 Specific Failure Modes & Line-Level Fragility
1. **WebGL Context Retention Leak**: Opening and closing `MoleculeViewerModal` 20 times exhausts the browser's 16-context WebGL limit, breaking rendering across the app.
   - *Fragile Point*: [`src/js/ui/molecule-viewer.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/molecule-viewer.js#L75).
2. **NaN Angle on Collinear Atoms**: Floating-point drift can yield $\frac{\mathbf{u}\cdot\mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|} = 1.0000000002$, causing `Math.acos()` to return `NaN`.
3. **SMILES Ring Closure Stack Overflow**: Unmatched digit tags in malformed SMILES strings cause ring traversal loops.

### 1.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: WebGL Context Destruction & Protected Math.acos
// Location: src/js/ui/molecule-viewer.js around Line 80
destroy() {
  if (this.glViewer) {
    const gl = this.glViewer.getRenderer()?.getContext();
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.glViewer.clear();
    this.glViewer = null;
  }
}

function safeAngleDegrees(u, v) {
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  const lenU = Math.hypot(u.x, u.y, u.z);
  const lenV = Math.hypot(v.x, v.y, v.z);
  if (lenU === 0 || lenV === 0) return 0;
  // Clamp between -1.0 and 1.0 to guarantee finite return
  const cosTheta = Math.max(-1, Math.min(1, dot / (lenU * lenV)));
  return Math.round((Math.acos(cosTheta) * 180 / Math.PI) * 10) / 10;
}
```

---

## 2. Feature Deep-Dive: Symbolic CAS Engine & Reactive Variables (`F-135`)

### 2.1 What the Feature Is
A computer algebra system (CAS) executing exact symbolic calculus, polynomial factorization, linear/quadratic equation solving, and matrix calculations. Whiteboard notes can define reactive variables (e.g. `$mass = 12.5$`, `$acc = 9.8$`, `$force = mass * acc$`) that automatically update dependent cards.

### 2.2 Implementation Mechanics & Data Structures
- **Symbolic Solver**: Bundles pure JS `Nerdamer` (`src/vendor/nerdamer/`).
- **Reactive Dependency Graph**: `NotebookVariables` maintains a Directed Acyclic Graph (DAG) of variable assignments across whiteboard text objects.
- **Quadratic Solver**: `SymbolicCAS.solveQuadratic(a, b, c)` calculates exact radicals:
  $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

### 2.3 Primary Code Files & Key Locations
- [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js):
  - `SymbolicCAS` solver interface (Lines 80–180)
  - `NotebookVariables` dependency manager (Lines 210–310)
- [`src/vendor/nerdamer/nerdamer.core.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/nerdamer/nerdamer.core.js): Core CAS.

### 2.4 Interacting Files & Blast Radius
- [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js): Evaluating variable references in cards.
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Document object change dispatch.

### 2.5 Specific Failure Modes & Line-Level Fragility
1. **Circular Dependency Recursion Hang**: A user defining `a = b + 1` and `b = a + 1` triggers infinite recursion during evaluation, freezing the main thread.
   - *Fragile Point*: [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js#L245).
2. **Nerdamer Factorization Timeout**: Extremely large polynomial powers (e.g. $(x+1)^{100}$) cause deep recursive AST traversal.

### 2.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Cycle-Detecting Variable Evaluation Guard
// Location: src/js/core/scientific-math.js around Line 250
export function evaluateNotebookVariables(varMap) {
  const resolved = new Map();
  const visiting = new Set();

  function resolve(varName) {
    if (resolved.has(varName)) return resolved.get(varName);
    if (visiting.has(varName)) {
      console.warn(`Circular dependency detected in variable: ${varName}`);
      return NaN; // Break loop
    }
    visiting.add(varName);
    const rawExpr = varMap.get(varName);
    const val = evaluateExpressionSafe(rawExpr, resolve);
    visiting.delete(varName);
    resolved.set(varName, val);
    return val;
  }

  for (const key of varMap.keys()) resolve(key);
  return resolved;
}
```

---

## 3. Feature Deep-Dive: Dataview Query Engine & In-Canvas Kanban (`F-139`)

### 3.1 What the Feature Is
Brings Obsidian-style Dataview queries and agile sprint management directly to the canvas. Users can write ````dataview blocks querying whiteboard objects (`TABLE type, tags, created WHERE tags CONTAINS "exam"`), or create interactive 3-column Kanban cards (`TODO`, `IN_PROGRESS`, `DONE`) with drag-and-drop task advancement.

### 3.2 Implementation Mechanics & Data Structures
- **Safe Query Parser**: In [`src/js/core/dataview.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/dataview.js), parses `TABLE`/`LIST` statements with recursive AST filtering without using `eval()`.
- **Kanban Card Component**: In [`src/js/core/kanban.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/kanban.js), stores column tasks in `o.kanbanData = { columns: [{ id, title, tasks: [{ id, text, done }] }] }`.

### 3.3 Primary Code Files & Key Locations
- [`src/js/core/dataview.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/dataview.js):
  - `parseDataviewQuery()` SQL-like tokenizer (Lines 25–110)
  - `executeDataviewQuery()` object filter & sorter (Lines 120–210)
- [`src/js/core/kanban.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/kanban.js):
  - `KanbanManager` task state transition (Lines 30–120)
  - Interactive checkbox click hit-testing (Lines 140–190)

### 3.4 Interacting Files & Blast Radius
- [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js): Embedding dynamic tables in markdown cards.
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Storing Kanban card mutations.

### 3.5 Specific Failure Modes & Line-Level Fragility
1. **Mutation-Requery Feedback Loop**: If rendering a Dataview result mutates an object in `store`, it triggers a store change event, which re-evaluates the query, creating an infinite loop.
   - *Fragile Point*: [`src/js/core/dataview.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/dataview.js#L140).
2. **Object Prototype Pollution**: Unvalidated query field access (e.g. `WHERE __proto__.polluted = true`) can access object prototypes.

### 3.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Read-Only Query Sandbox & Safe Property Access
// Location: src/js/core/dataview.js around Line 130
export function safeGetProperty(obj, propPath) {
  if (!obj || !propPath) return undefined;
  const parts = propPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (part === '__proto__' || part === 'prototype' || part === 'constructor') {
      return undefined; // Block prototype pollution
    }
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}
```

---

## 4. Feature Deep-Dive: FSRS v5 Spaced Repetition & Anki Bridge (`F-131`)

### 4.1 What the Feature Is
A flashcard learning workstation implementing the modern Free Spaced Repetition Scheduler (FSRS v5). Features an interactive review runner (<kbd>Ctrl+Shift+R</kbd>) with four rating buttons (Again, Hard, Good, Easy), direct synchronization with desktop Anki via AnkiConnect (`127.0.0.1:8765`), and pure JS `.apkg` deck export.

### 4.2 Implementation Mechanics & Data Structures
- **FSRS Formula Engine**: Computes memory stability $S$ and difficulty $D$. Retrievability is calculated as:
  $$R(t, S) = \left(1 + \text{FACTOR} \cdot \frac{t}{S}\right)^{-1}$$
- **Deck Packaging**: Generates SQLite `collection.anki2` schema compressed inside `.apkg` files using offline JSZip.

### 4.3 Primary Code Files & Key Locations
- [`src/js/core/fsrs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/fsrs.js):
  - FSRS v5 17-parameter constants and next interval calculations (Lines 15–95)
- [`src/js/core/anki.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/anki.js):
  - AnkiConnect desktop bridge & `.apkg` binary packaging (Lines 40–180)
- [`src/js/ui/study-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/study-runner.js):
  - Interactive active-recall review runner modal (Lines 35–185)

### 4.4 Interacting Files & Blast Radius
- [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js): Persisting card review history (`card.reps`, `card.lapses`).
- [`src/vendor/jszip.min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/jszip.min.js): Zip compression.

### 4.5 Specific Failure Modes & Line-Level Fragility
1. **AnkiConnect Network Hang**: If desktop Anki is closed, `fetch('http://127.0.0.1:8765')` hangs until OS TCP timeout (up to 30 seconds) unless a strict `AbortController` timeout is enforced.
   - *Fragile Point*: [`src/js/core/anki.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/anki.js#L65).
2. **Negative Schedule Intervals**: Manually edited system clocks or anomalous review histories can produce $t < 0$, corrupting next review scheduling.

### 4.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Strict Network Timeout for AnkiConnect
// Location: src/js/core/anki.js around Line 70
export async function ankiConnectInvoke(action, params = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('http://127.0.0.1:8765', {
      method: 'POST',
      body: JSON.stringify({ action, version: 6, params }),
      signal: controller.signal
    });
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AnkiConnect timed out. Ensure Anki desktop is running with AnkiConnect enabled.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 5. Feature Deep-Dive: Document Navigator, PDF Sidebar & OCR (`F-126`)

### 5.1 What the Feature Is
A side navigation drawer (`PdfSidebarDrawer`) displaying hierarchical PDF outlines/bookmarks, visual thumbnail strips, page margin guides, and an offline Tesseract WASM OCR engine for extracting searchable text layers from scanned PDF books.

### 5.2 Implementation Mechanics & Data Structures
- **PDF.js Viewer Layer**: Uses bundled Mozilla PDF.js v4.10.38 (`src/vendor/pdfjs/`).
- **Offline OCR**: Tesseract WASM worker (`src/vendor/tesseract/`) recognizes English text offline without sending pages to the cloud.

### 5.3 Primary Code Files & Key Locations
- [`src/js/ui/pdf-sidebar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/pdf-sidebar.js):
  - `PdfSidebarDrawer` class & TOC tree builder (Lines 25–140)
- [`src/js/core/ocr.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/ocr.js):
  - Tesseract WASM worker pool & image chunk OCR (Lines 30–95)

### 5.4 Interacting Files & Blast Radius
- [`src/js/core/pages.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/pages.js): PDF background page state.
- [`src/vendor/tesseract/tesseract.min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/tesseract/tesseract.min.js): WASM memory heap.

### 5.5 Specific Failure Modes & Line-Level Fragility
1. **WASM Heap Out-of-Memory**: Running OCR on high-resolution ($300\text{ DPI}$) scanned pages concurrently exhausts the 2GB 32-bit WASM memory address space.
2. **Annotation Coordinate Desync**: If PDF margin adjustments alter page dimensions, handwritten annotations drift relative to the background PDF text.

### 5.6 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Sequential OCR Worker Disposal
// Location: src/js/core/ocr.js around Line 50
export async function runOcrSafe(canvasElement, onProgress) {
  // Downscale image if larger than 2000px to protect WASM heap
  const scaledCanvas = downscaleForOcr(canvasElement, 1800);
  const worker = await Tesseract.createWorker('eng', 1, {
    workerPath: './vendor/tesseract/worker.min.js',
    corePath: './vendor/tesseract/tesseract-core.wasm.js'
  });
  try {
    const res = await worker.recognize(scaledCanvas);
    return res.data.text;
  } finally {
    await worker.terminate(); // Mandatory heap termination
  }
}
```

---

## 6. Execution Verification Commands

After completing hardening in this tier, execute these verification commands in PowerShell:

```powershell
# 1. Verify custom features and domain workbenches:
node scripts/smoke.js --new-features

# 2. Strict translation verification (must remain 2,238 / 2,238 keys):
node scripts/i18n-check.js
```
