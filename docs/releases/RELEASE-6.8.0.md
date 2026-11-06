# Release Dossier — GazBoard v6.8.0

> **Release Version**: `v6.8.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(core): Phase 8 Language, Math & Knowledge Core (v6.8.0)`  
> **Binary Deliverable**: `GazBoard-v6.8.0-Portable.exe` (`113,095,961 bytes` / `107.86 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity across 7 locales with 2,143 strings, 0 native C++ dependencies, preserved `p.t` stroke timestamps, finite audio safeguard, scene partitioning during audio replay, Study Tape toggle persistence).

---

## 1. Executive Summary & Version 6.8.0 Scope

Release **`v6.8.0` (Phase 8 — Language, Math & Knowledge Core)** implements comprehensive offline vocabulary, linguistic writing, natural mathematics, and active-recall flashcard capabilities into GazBoard. Taking architectural inspiration from WordNet 3.1, Grammarly / Academic Writing Coach, Anki Image Occlusion Enhanced, and Wolfram Alpha / SymPy natural math engines, all capabilities execute in pure, portable JavaScript with zero external native binaries:

1. **WordNet Academic Dictionary & Scholarly Thesaurus (`src/js/ui/academic-dictionary.js`)**:
   - **Academic Word List (AWL) & STEM Lexicon**: Comprehensive offline database covering essential academic and scientific vocabulary (AWL sublists + STEM terminology).
   - **Rich Scholarly Metadata**: Definitions, grammatical parts of speech (nouns, verbs, adjectives), International Phonetic Alphabet (IPA) phonetics, academic synonyms, antonyms, scholarly collocations (e.g. *empirical approach*, *null hypothesis*, *standard deviation*), and formal corpus example sentences.
   - **Interactive Thesaurus Chip Navigation**: Click any synonym or antonym chip to instantly jump to that word's entry within the modal.
   - **Native Web Speech TTS Audio**: Instant pronunciation using zero-download native Windows speech synthesis.
   - **Whiteboard Definition Card Stamping**: 1-click card stamping that inserts styled markdown definition cards directly onto the canvas.
   - **Hotkey & Ribbon Access**: Bound to <kbd>Ctrl+Shift+D</kbd> and integrated into the ESL & Voice ribbon shelf.

2. **University-Level Grammar, Citation & Academic Writing Linter (`src/js/core/technical-linter.js`)**:
   - **Academic Tone & Colloquialism Detection**: Identifies informal phrasing (*a lot of*, *got*, *look into*, *find out*, *big*, *bad*, *thing*) and provides formal academic alternatives (*numerous*, *acquired*, *investigate*, *determine*, *substantial*, *detrimental*, *factor*).
   - **Subject-Verb Agreement Engine**: Flags grammatical discord (*the number of X are* $\to$ *the number of X is*, *a variety of X is* $\to$ *a variety of X are*, *each of the X are* $\to$ *each of the X is*).
   - **Citation Integrity Rules**: Detects incomplete parenthetical citations missing publication years and malformed citation structures.
   - **Quantitative Academic Style Score (0–100%)**: Evaluates formal academic score with itemized deductions and categorical rating (*Exemplary*, *Proficient*, *Developing*, *Needs Revision*).
   - **Automated Tone Elevation**: `TechnicalLinter.applyAcademicTone()` safely elevates informal prose into formal scholarly text.

3. **Natural Language Math-to-LaTeX Converter & Symbolic CAS (`src/js/core/scientific-math.js`, `src/js/ui/mathedit.js`)**:
   - **Natural Math Parser**: `naturalMathToLaTeX(text)` parses natural conversational English math queries into standardized LaTeX:
     - Integrals: `"integral of x^2 from 0 to 1"` $\to$ `\int_{0}^{1} x^{2} \, dx`
     - Derivatives: `"derivative of sin(x)*e^x with respect to x"` $\to$ `\frac{d}{dx}\left[ \sin(x) \cdot e^{x} \right]`
     - Partial Derivatives: `"partial derivative of x^2*y with respect to y"` $\to$ `\frac{\partial}{\partial y}\left[ x^{2} \cdot y \right]`
     - Limits: `"limit of sin(x)/x as x approaches 0"` $\to$ `\lim_{x \to 0} \frac{\sin(x)}{x}`
     - Summations: `"sum of 1/n^2 from n=1 to 10"` $\to$ `\sum_{n=1}^{10} \frac{1}{n^{2}}`
     - Matrices: `"matrix [[1, 2], [3, 4]]"` $\to$ `\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`
   - **Symbolic CAS Quadratic Solver**: `SymbolicCAS.solveQuadratic(eqStr)` parses arbitrary quadratic and linear equations ($ax^2 + bx + c = 0$), evaluates discriminant $\Delta = b^2 - 4ac$, and computes real distinct roots, repeated roots, or complex conjugate pairs ($u \pm vi$) with step-by-step LaTeX derivation.
   - **Symbolic Matrix Determinant**: `SymbolicCAS.matrixDeterminant(matrix)` calculates exact determinants for $n \times n$ matrices using recursive Laplace cofactor expansion.
   - **Direct Editor Integration**: Math Editor (`mathedit.js`) provides `🗣️ Natural Math…` and `⚡ Solve…` action buttons.

4. **Image Occlusion Dual Review Modes & Anki Cloze Deck Export (`src/js/ui/study-runner.js`, `src/js/ui/sidebar-ribbon.js`)**:
   - **Dual Occlusion Modes**:
     - *Hide All, Guess One*: All other occlusions on the board remain covered while testing memory on the active card.
     - *Hide One, Guess One*: All surrounding occlusions are revealed to provide full anatomical or schematic context, and only the target card is occluded.
   - **HUD Mode Switcher**: Live toggle button in the floating review HUD header to flip modes during active study sessions.
   - **Cloze Flashcard Deck Export**: `exportClozeDeck()` exports board occlusions into Anki-compatible tab-separated values (`.tsv`) ready for import into desktop Anki or AnkiDroid.

---

## 2. Invariant & Verification Audit

| Requirement | Target | Achieved Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **New Features Smoke Test Suite** | 100% Pass Rate | **21 Passed, 0 Failed** | `node scripts/smoke.js --new-features` |
| **Strict Translation Parity** | 100% across all 7 locales | **2,143 / 2,143 keys (100%)** | `node scripts/i18n-check.js` |
| **Zero Native Addons** | Pure JS / Portable | **0 C++ Native Modules** | Audit check (`package.json`) |
| **Content Security Policy** | No `eval` / `new Function` | **Safe Regex & AST Parsing** | Content-Security-Policy compliance |
| **Stroke Timestamp Preservation** | Preserve `p.t` | **Verified** | `Store.add` / `tools.js` invariants |
| **Study Tape Persistence** | Preserved occlusion state | **Verified** | Toggle & visibility invariants |
| **Binary Deliverable** | Versioned Portable Binary | **GazBoard-v6.8.0-Portable.exe** | `releases/` directory |

---

## 3. Deliverable Matrix

| Deliverable | Path | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Portable Binary** | `GazBoard-v6.8.0-Portable.exe` | Win32 Binary | Zero-install standalone executable with all Phase 1–8 capabilities bundled. |
| **Academic Dictionary** | [`src/js/ui/academic-dictionary.js`](../../src/js/ui/academic-dictionary.js) | UI Component | AWL lexicon, IPA phonetics, thesaurus chips, TTS audio, and note card stamping. |
| **Writing & Grammar Linter** | [`src/js/core/technical-linter.js`](../../src/js/core/technical-linter.js) | Core Module | Tone elevation, subject-verb agreement, and Academic Style Score (0–100%). |
| **Natural Math & CAS** | [`src/js/core/scientific-math.js`](../../src/js/core/scientific-math.js) | Core Module | Natural math to LaTeX converter, quadratic CAS solver, and matrix determinant. |
| **Math Editor Bridge** | [`src/js/ui/mathedit.js`](../../src/js/ui/mathedit.js) | UI Component | Natural math prompt and symbolic solver buttons in live equation editor. |
| **Study Runner Occlusion** | [`src/js/ui/study-runner.js`](../../src/js/ui/study-runner.js) | UI Component | Hide All vs Hide One occlusion modes, HUD toggle, and Anki cloze deck export. |
| **Ribbon Integration** | [`src/js/ui/sidebar-ribbon.js`](../../src/js/ui/sidebar-ribbon.js) | UI Component | Shelf actions for Academic Dictionary, Tone Elevation, Natural Math, and Cloze export. |
| **New Features Smoke Test** | [`test/smoke-new-features.js`](../../test/smoke-new-features.js) | Test Suite | 21-point custom features verification test suite. |
