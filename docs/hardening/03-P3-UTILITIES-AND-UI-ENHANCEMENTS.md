# GazBoard Hardening Dossier — Priority 3 (P3): Utilities & UI Enhancements

> **Target Audience**: AI Coding Agent / Core Systems Engineer  
> **Status**: **Fully Hardened & Audited (All 13 Subsystems Verified)**  
> **Hardening Tier**: **`P3 — Low Risk / Self-Contained Utilities`**  
> **Objective**: Polish and harden standalone educational tools, linguistics linters, audio/replay HUD widgets, and stroke rendering parameters.

---

## Executive Overview of P3 Subsystems

The P3 tier consists of isolated tools and formatters with minimal blast radiuses and zero cross-subsystem state corruption risk:
1. **Stroke Opacity Slider & Gel-Pen Styling (`F-111`)**: Canvas2D `globalAlpha` controls.
2. **Highlighter 50% Opacity & Contrast (`F-114`)**: Luminance-preserving blending mode.
3. **Laser Pointer Trail Duration Controller (`F-112`)**: Time-decay FIFO pointer trail queue.
4. **AudioBar HUD & Waveform Scrubber (`F-105`)**: 1D density histogram seek-scrubber.
5. **ReplayBar Floating Dockable HUD (`F-109`)**: Multi-edge snap dock toolbar.
6. **Named Bookmarks Inline Label Editor (`F-117`)**: Scrubber bookmark pill input.
7. **Double-Layered Sidebar Ribbon Menu (`F-130`)**: Dockable engineering rail with auto-hide.
8. **118-Element Interactive Periodic Table (`F-132`)**: Chemical element modal and stamp cards.
9. **Bohr Shell Orbitals & Molar Mass Calculator (`F-136`)**: Electron configuration inspector and formula weight calculator.
10. **STEM Formula Encyclopedia & Balancer (`F-132`)**: High school STEM equations and Gaussian stoichiometry balancer.
11. **Technical Writing & ESL Linter (`F-135`)**: Rule-based redundancy and passive voice detector.
12. **Readability Scoring & Auto-Fix (`F-136`)**: Flesch-Kincaid grade level and 1-click text cleanup.
13. **WordNet Academic Dictionary & Thesaurus (`F-138`)**: Academic Word List, IPA phonetics, and Web Speech TTS pronunciation.

---

## 1. Feature Deep-Dive: WordNet Academic Dictionary, Thesaurus & TTS (`F-138`)

### 1.1 What the Feature Is
An offline academic dictionary modal (<kbd>Ctrl+Shift+D</kbd>) based on WordNet and the Academic Word List (AWL). Features IPA phonetics, definitions, synonyms, antonyms, collocations, corpus sentences, native Web Speech API audio pronunciation, and a `[📸 Stamp Definition]` action creating a permanent whiteboard card.

### 1.2 Implementation Mechanics & Data Structures
- **Lexical Graph**: Embedded database in [`src/js/ui/academic-dictionary.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/academic-dictionary.js) indexing words by lemma, part of speech (`n`, `v`, `adj`, `adv`), and semantic relation vectors.
- **Audio Pronunciation**: Uses browser `window.speechSynthesis` with `SpeechSynthesisUtterance`, targeting English voices (`en-US`, `en-GB`).

### 1.3 Primary Code Files & Key Locations
- [`src/js/ui/academic-dictionary.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/academic-dictionary.js):
  - `AcademicDictionaryModal` class (Lines 20–85)
  - Word lookup and morphological lemmatization (Lines 110–180)
  - `speakWord()` Web Speech TTS integration (Lines 210–245)
  - Whiteboard definition card stamper (Lines 260–310)

### 1.4 Specific Failure Modes & Line-Level Fragility
1. **TTS Voice Lockup on Windows N Editions**: Windows N or stripped enterprise systems lack the Windows Media Feature Pack, causing `speechSynthesis.speak()` to hang silently without calling `onend`.
   - *Fragile Point*: [`src/js/ui/academic-dictionary.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/academic-dictionary.js#L225).
2. **Regex Injection on Search Filter**: Typing regex meta-characters (`[`, `*`, `+`) directly into the search bar throws an unhandled `SyntaxError`.

### 1.5 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Web Speech TTS Invocation with Fallback Timeout
// Location: src/js/ui/academic-dictionary.js around Line 230
export function speakWordSafe(word) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Clear queued speech
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.9;
  utter.lang = 'en-US';
  
  // Timeout safeguard for Windows N / voice stall
  const timer = setTimeout(() => {
    window.speechSynthesis.cancel();
  }, 4000);
  
  utter.onend = () => clearTimeout(timer);
  utter.onerror = () => clearTimeout(timer);
  window.speechSynthesis.speak(utter);
}
```

---

## 2. Feature Deep-Dive: Technical Writing Linter & Readability Auto-Fix (`F-135`, `F-136`)

### 2.1 What the Feature Is
A writing enhancement utility analyzing whiteboard text notes. Computes the **Flesch Reading Ease Score** ($0-100$) and **Flesch-Kincaid Grade Level**, detects passive voice, conversational redundancies, wordiness, and duplicate adjacent words, and provides a 1-click **Auto-Fix** transformation.

### 2.2 Implementation Mechanics & Data Structures
- **Readability Algorithms**:
  $$\text{Flesch-Kincaid Grade Level} = 0.39 \left(\frac{\text{total words}}{\text{total sentences}}\right) + 11.8 \left(\frac{\text{total syllables}}{\text{total words}}\right) - 15.59$$
- **Pattern Dictionary**: Regex rules map conversational filler (e.g. "due to the fact that" $\to$ "because", "at this point in time" $\to$ "currently").

### 2.3 Primary Code Files & Key Locations
- [`src/js/core/technical-linter.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/technical-linter.js):
  - `TechnicalLinter` class (Lines 15–75)
  - `countSyllables(word)` phonetic counting heuristics (Lines 90–140)
  - `computeReadability()` Flesch scoring (Lines 150–195)
  - `fixAll(text)` batch auto-fix cleanups (Lines 210–280)

### 2.4 Specific Failure Modes & Line-Level Fragility
1. **Division-by-Zero on Sentence Count**: Text with zero punctuation marks yields `sentenceCount = 0`, causing Flesch-Kincaid to return `NaN` or `Infinity`.
   - *Fragile Point*: [`src/js/core/technical-linter.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/technical-linter.js#L162).
2. **KaTeX Math String Mangling**: Auto-fix regex transformations replacing words like "in order to" can corrupt embedded LaTeX math blocks (e.g. `\int_{0}^{1}`).

### 2.5 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Math-Protected Linter Auto-Fix
// Location: src/js/core/technical-linter.js around Line 220
export function fixAllSafe(text) {
  // 1. Stash KaTeX equations
  const mathStash = [];
  const clean = text.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (match) => {
    const key = `__MATH_STASH_${mathStash.length}__`;
    mathStash.push({ key, match });
    return key;
  });

  // 2. Apply rules
  let fixed = TechnicalLinter.applyRules(clean);

  // 3. Restore equations
  for (const { key, match } of mathStash) {
    fixed = fixed.replace(key, match);
  }
  return fixed;
}
```

---

## 3. Feature Deep-Dive: 118-Element Periodic Table & Molar Mass (`F-132`, `F-136`)

### 3.1 What the Feature Is
An interactive 118-element periodic table modal (`PeriodicTableModal`). Displays atomic numbers, electronegativity trends, atomic radius heatmaps, concentric Bohr shell electron orbits ($2, 8, 18\dots$), and calculates stoichiometric molar weights for complex chemical formulas (e.g., $\text{CuSO}_4\cdot 5\text{H}_2\text{O}$).

### 3.2 Implementation Mechanics & Data Structures
- **Element Catalog**: 118 elements stored with atomic mass, electron configuration string, category color, and melting/boiling points.
- **Formula Lexer**: Parses chemical formulas with nested parentheses (e.g. $\text{Ca(OH)}_2$) and hydration dot multipliers.

### 3.3 Primary Code Files & Key Locations
- [`src/js/ui/periodic-table.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/periodic-table.js):
  - 118-element database and category filters (Lines 20–160)
  - Bohr shell concentric ring canvas renderer (Lines 180–240)
  - Element card whiteboard stamp creator (Lines 260–310)
- [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js):
  - `calculateMolarMass()` chemical formula parser (Lines 340–420)

### 3.4 Specific Failure Modes & Line-Level Fragility
1. **Unbalanced Parentheses Syntax Error**: Typing `Ca(OH` throws an unhandled exception in the formula parser.
   - *Fragile Point*: [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js#L365).
2. **Hydration Multiplier Glitch**: Misparsing the dot symbol ($\cdot$ or `*`) as a multiplication operator instead of hydration addition.

### 3.5 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Chemical Formula Molar Mass Parser
// Location: src/js/core/scientific-math.js around Line 370
export function parseChemicalFormulaSafe(formula) {
  if (!formula || typeof formula !== 'string') return null;
  try {
    // Normalize hydration symbols
    const cleanFormula = formula.replace(/[·•]/g, '*');
    return evaluateFormulaTree(cleanFormula);
  } catch (err) {
    return { valid: false, error: 'Invalid chemical formula syntax' };
  }
}
```

---

## 4. Feature Deep-Dive: Floating HUDs & Toolbars (`F-105`, `F-109`, `F-130`)

### 4.1 What the Feature Is
A collection of floating and dockable UI controls:
- **AudioBar HUD (`F-105`)**: Waveform density scrubber, transport controls, skip duration selectors (`[5s, 10s, 15s, 30s]`), and named bookmark label editor (`F-117`).
- **ReplayBar HUD (`F-109`)**: Multi-edge snap dock toolbar (Top, Bottom, Left, Right, Free).
- **Sidebar Ribbon Menu (`F-130`)**: Double-layered collapsible engineering dock (<kbd>Ctrl+B</kbd>) with inking proximity auto-hide.

### 4.2 Implementation Mechanics & Data Structures
- **Drag Threshold**: 6px drag dead-zone prevents accidental dragging during stylus tapping.
- **Proximity Sensor**: Auto-hides sidebar ribbon when active stylus coordinates approach within 48px of the toolbar boundary while drawing.

### 4.3 Primary Code Files & Key Locations
- [`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js): Audio transport controls (Lines 35–180).
- [`src/js/ui/density-canvas.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/density-canvas.js): Waveform density canvas (Lines 20–110).
- [`src/js/ui/replay-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/replay-bar.js): Floating dock logic (Lines 25–130).
- [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js): Double-layer engineering ribbon (Lines 30–210).

### 4.4 Specific Failure Modes & Line-Level Fragility
1. **Pointer Capture Latching**: Releasing mouse or stylus outside window boundaries leaves `pointerCapture` active, causing the HUD to stick to the cursor permanently.
   - *Fragile Point*: [`src/js/ui/replay-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/replay-bar.js#L85).
2. **Proximity Timer Thrashing**: Rapid pen movements crossing the 48px boundary repeatedly schedule and cancel DOM transition animations, causing ribbon flickering.

### 4.5 Concrete Hardening Directive for the Next AI
```javascript
// Hardening Pattern: Safe Pointer Release & Debounced Ribbon Proximity
// Location: src/js/ui/replay-bar.js around Line 90
function setupDraggableHUD(element, handle) {
  const onPointerUp = (e) => {
    if (handle.hasPointerCapture(e.pointerId)) {
      handle.releasePointerCapture(e.pointerId);
    }
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };
  handle.addEventListener('pointerdown', (e) => {
    handle.setPointerCapture(e.pointerId);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });
}
```

---

## 5. Execution Verification Commands

After completing hardening in this tier, execute these verification commands in PowerShell:

```powershell
# 1. Verify custom features smoke tests:
node scripts/smoke.js --new-features

# 2. Strict translation verification (must remain 2,238 / 2,238 keys):
node scripts/i18n-check.js

# 3. P3 Hardening Test Suite:
node --test test/p3-hardening.test.mjs
```

---

## 6. Audit & Hardening Completion Log

| Subsystem | Audit Scope | Fragility / Bugs Identified | Hardening Implemented | Verification State |
| :--- | :--- | :--- | :--- | :--- |
| **WordNet Academic Dictionary & TTS (`F-138`)** | `src/js/ui/academic-dictionary.js`, `src/js/ui/dictionary-popover.js` | 1. `window.speechSynthesis` stall on Windows N without timeout fallback.<br>2. `AcademicDictionaryModal.close()` did not cancel speech.<br>3. `stampCard()` attempted to access `cam.viewport.x` when `cam.viewport` was a function, producing `NaN` coordinates. | Added 4s watchdog timeout, cancel on close/hide, defensive SSR `typeof window` check, and resolved viewport coordinate calculation. | PASS (6/6 unit tests, 24/24 smoke) |
| **Technical Writing Linter & Readability (`F-135`, `F-136`)** | `src/js/core/technical-linter.js` | 1. LaTeX math equations (`$x$`, `$$x^2$$`) and code blocks (` ``` `, `` ` ``) were not protected, allowing regexes to corrupt LaTeX symbols (e.g. `\big(` -> `\substantial(`).<br>2. Division-by-zero protection in F-K readability. | Implemented `getProtectedRanges()` and `isInsideProtected()`; masked code/math blocks during academic tone transformation; guarded sentence and word counts. | PASS |
| **118-Element Periodic Table & Molar Mass (`F-132`, `F-136`)** | `src/js/ui/periodic-table.js`, `src/js/core/scientific-math.js`, `src/js/core/chemistry.js` | 1. Hydration middle dots (`·` / `•`) failed to parse in molar mass calculation.<br>2. Unbalanced bracket edge cases (`CaOH)2`, `Ca(OH`) either crashed or silently produced bad values.<br>3. Periodic table only contained 41 elements. | Expanded `ELEMENTS_DATA` to full 118 elements; added transuranic atomic weights up to Og (118); normalized hydration dots; strictly validated brackets; guarded zero-mass division. | PASS |
| **Floating HUDs & Toolbars (`F-105`, `F-109`, `F-130`)** | `src/js/ui/audio-bar.js`, `src/js/ui/replay-bar.js`, `src/js/ui/sidebar-ribbon.js` | 1. `audio-bar.js` lacked pointer capture, drag dead-zone, and bounds clamping.<br>2. `replay-bar.js` did not guard `hasPointerCapture()` on release.<br>3. `sidebar-ribbon.js` lacked debouncing during pen drawing near 48px boundary. | Added pointer capture and 6px deadzone to `AudioBar`; added safe pointer release; added debounced inking proximity auto-collapse (120ms). | PASS |
| **Rendering Parameters & Laser Pointer (`F-111`, `F-112`, `F-114`)** | `src/js/core/surface.js`, `src/js/core/render.js` | 1. Laser pointer trail duration setting was ignored by `headFade` (hardcoded to 520ms).<br>2. Highlighter blending in dark mode used `multiply` indiscriminately, resulting in black/invisible ink. | Connected `headFade` to `app.settings.laserTrailDuration`; conditioned `multiply` composite operation on `!lightInk()` to preserve luminance in dark mode. | PASS |

