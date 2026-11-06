# Release Dossier — GazBoard v5.9.0

> **Release Version**: `v5.9.0`  
> **Date**: October 23, 2026  
> **Git Commit Target**: `feat: implement Phase 5 JSON Canvas 1.0, Knowledge Graph View & Document Navigator (v5.9.0)`  
> **Binary Deliverable**: `GazBoard-v5.9.0-Portable.exe` (108,168,272 bytes / 103.16 MiB)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict verification across all 6 Golden Invariants (100% i18n parity, 1,240 base smoke tests passed, 39 custom tests passed, 0 native C++ dependencies).

---

## 1. Executive Summary & Capabilities

Release **`v5.9.0`** completes **Phase 5 (Knowledge Interoperability & Document Navigation)** of the GazBoard architectural roadmap, introducing bidirectional JSON Canvas 1.0 support, an interactive Knowledge Graph View, an Obsidian Markdown Sidecar Exporter, LiquidText-style Elastic Tether Connectors, and a full Document Navigator & TOC Sidebar, alongside user-configurable lateral settings.

---

## 2. Key Features Implemented

### 2.1. JSON Canvas 1.0 (`.canvas`) Bidirectional Engine
* **Specification Compliance**: Full bidirectional translation implementing the open [JSON Canvas 1.0 specification](https://jsoncanvas.org/spec/1.0/).
* **Export (`exportToJsonCanvas`)**:
  - Notes, text cards, and LaTeX equations map directly to `.canvas` `"type": "text"` nodes with color mapping (Obsidian 1–6 color codes or hex).
  - Diagrams (Mermaid/Chart) export as fenced markdown blocks.
  - Video and web links export as `"type": "link"` nodes.
  - Rectangular containers export as `"type": "group"` nodes.
  - GazBoard `connector` objects map to `.canvas` `edges` (`fromNode`, `toNode`, `fromSide`, `toSide`, `toEnd: 'arrow'`, `label`).
* **Import (`importFromJsonCanvas`)**:
  - Drag-and-drop or file menu import converts any `.canvas` file into native GazBoard notes, images, links, and curved connectors with relative coordinate positioning intact.

### 2.2. Interactive Knowledge Graph View (`GraphViewModal`)
* **Force-Directed Network Visualization**:
  - Visualizes boards, `#tags`, `[[wikilinks]]`, and linked excerpts as nodes and edges in a high-performance HTML5 Canvas 2D modal.
  - Physics simulation implements Coulomb repulsion, Hooke spring attraction, damping, and center gravity.
* **Interactive Exploration**:
  - Dynamic search filter highlighting matching nodes.
  - Interactive pan, scroll-wheel zoom, and node dragging.
  - Node hover highlights connected edges and neighboring nodes with a glassmorphic tooltip showing degree and type.
  - **1-Click Navigation**: Clicking any board node opens that board directly; clicking a tag node filters connected boards.

### 2.3. Markdown Sidecar & Vault Summary Exporter
* **Obsidian-Compatible Markdown Export (`generateMarkdownSidecar`)**:
  - Generates clean GFM markdown with YAML frontmatter (`title`, `date`, `tags`, `aliases`, `generator: GazBoard v5.9.0`).
  - Summarizes text notes, KaTeX math blocks (`$$...$$`), Mermaid diagrams (` ```mermaid `), video timestamp bookmarks (`- [mm:ss] Bookmark Label`), and excerpt sources.
  - User can export manually via the Export menu or enable automatic sidecar generation on board save (`autoExportMarkdownSidecar`).

### 2.4. LiquidText-Style Elastic Tether Connectors
* **Dynamic Elastic Tether Lines**:
  - Excerpt cards (`excerptSource`) render an anchor pin badge (📍).
  - When the source bounding box is on the board or in split-view, an elastic dashed cyan curve (`#00e5ff`) connects the source coordinates to the excerpt card.
  - Clicking the anchor badge glides the camera smoothly to the source bounding box with a 600ms radiant glow.

### 2.5. Document Navigator & TOC Sidebar (`PdfSidebarDrawer`)
* **Collapsible Navigation Drawer** (hotkey <kbd>Alt+T</kbd> or toolbar button):
  - **TOC / Outline**: Displays hierarchical PDF outlines or page headings with 1-click jump.
  - **Pages Thumbnails**: Vertical page strip with dimensions, active page indicator, and quick page creation.
  - **Study Index**: Real-time index of all Study Tape and Answer Covers on the board with status indicators (👁️ Revealed / 🙈 Concealed) and 1-click **Reveal All** and **Conceal All** actions.

### 2.6. Lateral Settings & Controls
* Added in Settings under Canvas:
  - `showExcerptTethers`: Toggle dynamic elastic tether lines on excerpt cards.
  - `graphPhysics`: Toggle force-directed physics animation in Graph View.
  - `autoExportMarkdownSidecar`: Option to automatically save a companion `.md` note with YAML frontmatter whenever a board is saved.

---

## 3. Verification & Test Ledger

| Test Suite | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Electron Smoke Suite** | `node scripts/smoke.js` | **1,240 passed, 0 failed** | Complete regression verification |
| **Custom Feature Suite** | `node scripts/smoke-custom.js` | **39 Node tests + 20 Electron tests passed** | Full suite including Phase 5 |
| **Phase 5 Unit Suite** | `node --test test/phase5-obsidian-and-graph.test.mjs` | **4 passed, 0 failed** | JSON Canvas, Markdown sidecar & graph |
| **Strict 100% i18n Parity** | `node scripts/i18n-check.js` | **1,786 / 1,786 translated (0 missing)** | All 7 locales (ar, bn, de, es, pt-BR, zh-Hans, zh-Hant) |

---

## 4. Rollback & Bisect Target

If a regression occurs:
- Rollback binary: `GazBoard-v5.8.0-Portable.exe`
- Rollback Git commit: `bce627e`
