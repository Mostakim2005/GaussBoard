# Layer 06: Study Workspace, Notes Overview & UI Controls

## 1. Subsystem Overview
Governs high-level user interface containers, the dual-viewport Split Study Workspace, Notes Overview card gallery with direct double-click opening and smart reflow actions, OmniSearch (Ctrl+F) with multi-word token fuzzy search, ribbon tool pinning/unpinning, and Obsidian-style board tags and aliases.

## 2. Primary Source Files (Touch ONLY These)
* **Split Workspace**: `src/js/ui/split-workspace.js` (`SplitWorkspace` class, dual viewport layout, independent Store and Camera synchronization).
* **Notes Overview**: `src/js/ui/note-overview.js` (Gallery cards, double-click to open, smart reflow actions `[ | ] Split`, `# Tag`, `🏷️ Alias`).
* **OmniSearch & Filtering**: `src/js/ui/search-dialog.js` (Ctrl+F multi-word token fuzzy matcher across titles, descriptions, and tags).
* **Properties Dialog**: `src/js/ui/properties-dialog.js` (Obsidian tags `#tag/subtag` and aliases with workspace-wide autocomplete).
* **Toolbars & Ribbon**: `src/js/ui/toolbar.js` (Bottom/top bars, ribbon tool pinning 📌/📍, unpin on right-click, audio importer trigger).
* **Settings & Sidebars**: `src/js/ui/panels.js` (Gallery view HUD auto-hide, left sidebar `#tags` filtering, live in-Settings DOM search).

## 3. Subsystem Invariants & Behavior
### Split Study Workspace (`src/js/ui/split-workspace.js`):
* Mounts two side-by-side flexbox viewports. Left pane usually displays textbook or reference PDF; right pane acts as an active scratch note.
* Each pane possesses its own independent `Store`, `Camera`, and `Surface`.
* Lifecycle Invariant: DOM element measuring and flex layout MUST occur before constructing secondary camera and hydrating state to avoid unmounted host crashes (`BUG-008`).

### Notes Overview & Gallery Smart Reflow (`src/js/ui/note-overview.js`):
* Direct Double-Click: Double-clicking any board card immediately opens that board.
* Removed redundant 3-dots menu. Replaced with direct action overlay buttons: `[ | ] Split`, `# Tag`, `🏷️ Alias`.
* Smart Reflow: If a note title exceeds 22 characters, the action buttons reflow cleanly above the title, preventing truncation or visual clipping.
* Gallery HUD auto-hide: Entering "My boards" automatically collapses `ReplayBar` and `AudioBar`.

### OmniSearch & In-Settings Multi-Word Search:
* Tokenizes queries into individual words and matches across both titles and descriptive body text.
* Settings panel live-filters DOM section cards on `input` events, hiding non-matching sections without page reloads (`BUG-004`).

### Ribbon Customization:
* Each item in the `+` insert menu features a selectable pin icon (📌 / 📍) allowing users to pin frequently used tools directly to the ribbon or move items back into the menu.
* Right-clicking any pinned tool on the ribbon instantly unpins it.

## 4. Relevant Bug Fixes
* **BUG-004**: In-settings search failed to match descriptions $\rightarrow$ multi-word token inverted index added.
* **BUG-008**: Split workspace initialized on unmounted pane $\rightarrow$ lifecycle reordered in `split-workspace.js`.

## 5. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - SplitWorkspace dual layout manager exists
# - folders nest, show their path, list what is in them
```
