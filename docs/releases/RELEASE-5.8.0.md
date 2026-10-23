# GazBoard Replay — Release Dossier v5.8.0

> **Release Version**: `v5.8.0`  
> **Release Codename**: Scientific Math Studio & Comprehensive Media Suite  
> **Git Branch**: `feat/cumulative-fixes`  
> **Target Platform**: Windows 10/11 x64 (Portable Binary Deliverable)  
> **Timestamp**: 2026-10-23  

---

## 1. Executive Summary

GazBoard Replay **v5.8.0** delivers the complete implementation of **Phase 4** alongside the **Scientific Math Studio & Media Suite**:
1. **100% Vendored Offline Runtime Libraries**: Bundled `pdf-lib` (v1.17.1), `fontkit` (v2.0.4), `PDF.js` viewer and sandbox engines directly inside `src/vendor/` with `bundledInApp: true`, ensuring zero external network dependency and fully portable single-executable distribution.
2. **SymPy, MATLAB, & Wolfram Alpha Scientific Math Studio**:
   - Expanded LaTeX math palette with rich Calculus ($\int, \iint, \oint, \frac{d}{dx}, \frac{\partial}{\partial x}, \nabla, \lim, \sum$), Linear Algebra ($2\times2, 3\times3, n\times m$ matrices, $\det, \mathbf{A}^{-1}, \mathbf{A}^T, \vec{u}\cdot\vec{v}$), Logic/Sets, and Physics/Statistics ($\hbar, \mu, \sigma, \sigma^2, P(A|B)$).
   - Interactive Matrix Dimension Builder ($\mathbf{\boxplus}$ Rows $\times$ Columns generator).
   - 1-Click Code Syntax Exporter: Copies equivalent Python/SymPy, MATLAB/Octave, and Wolfram Alpha natural queries to clipboard.
   - Built-In Offline Math Quick Evaluator: Safely computes and displays arithmetic and elementary expressions (e.g. `2 + 3 * 4 = 14`, `\sqrt{64} = 8`) with click-to-append.
3. **In-App Video & YouTube Player with Full-Res Screenshot & Timestamp Bookmarking**:
   - Supports YouTube URLs (`watch?v=`, `youtu.be/`, `embed/`, `shorts/`) and direct video files/URLs (`.mp4`, `.webm`, `.ogg`, `file://`).
   - Native canvas video card (`type: 'video'`) with thumbnail preview, play button, and bookmark chips.
   - Interactive Player modal with standard playback controls.
   - **Full-Resolution Screenshot**: Extracts native video stream frames (e.g. 1080p, 4K) using offscreen canvas directly into a canvas image card placed beside the video.
   - **Timestamp Bookmarks**: Captures current video second, stores bookmark tag, copies Markdown link `[mm:ss](https://youtu.be/... or video://...)`, and drops clickable canvas bookmark cards.
4. **Photo/Image & PDF Compression Suite**:
   - Offline Image Compression Dialog with quality slider (15%-95%), resolution scaling (20%-100%), format selector (JPEG, WebP, PNG), before/after size readouts, and savings percentage badge.
   - Bulk "Compress All on Board" to optimize board assets.
   - PDF stream object compression via `pdf-lib` (`useObjectStreams: true`).
5. **Phase 4 PDF Book Reader & Margin Suite**:
   - 2-Page Book Spread reading view kinematics (`pageRects(pages, 'spread')`) displaying facing book pages side-by-side.
   - Turnout Gutter Cornell Notes margin template (+160px note margin).

---

## 2. Release Deliverable Matrix

| Asset | Location | Type | Description |
| :--- | :--- | :--- | :--- |
| **Binary Deliverable** | `releases/GazBoard-v5.8.0-Portable.exe` | Windows Executable | Standalone portable zero-install binary (108,158,531 bytes). |
| **Scientific Math Module** | `src/js/core/scientific-math.js` | Core Module | Pure offline LaTeX to SymPy, MATLAB, Wolfram converters & evaluator. |
| **Video Player Suite** | `src/js/ui/video-dialog.js` | UI Module | Video/YouTube player, full-res screenshot capture & bookmarking. |
| **Compression Engine** | `src/js/core/compression.js` | Core Engine | Offline image downsampling and PDF object stream compression. |
| **Compression Dialog** | `src/js/ui/compression-dialog.js` | UI Module | Interactive image compression modal with live savings readout. |
| **Math Editor Studio** | `src/js/ui/mathedit.js` | UI Module | Extended palette, matrix builder, export pills, and quick eval. |
| **Unit Test Suite** | `test/math-and-video.test.mjs` | Test Suite | 5 unit tests for math studio, video parsing, and spread layout. |

---

## 3. Verification & Quality Gates

```powershell
# 1. Full Electron smoke test suite:
node scripts/smoke.js
# Output: 1240 passed, 0 failed

# 2. Strict 100% translation coverage check across all 7 locales:
node scripts/i18n-check.js
# Output: ar, bn, de, es, pt-BR, zh-Hans, zh-Hant: 1740/1740 translated, 0 left over, 0 problems

# 3. Custom feature & node test suite:
node scripts/smoke-custom.js
# Output: 100% passing across all custom test runs
```
