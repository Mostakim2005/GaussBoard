# GazBoard Replay — Comprehensive Manual QA Testing & Feedback Guide
## Testing & Field-Audit Protocol for Versions v4.8.1 through v6.0.0

> **Target Build**: `GazBoard-v6.0.0-Portable.exe` (Portable Zero-Install Executable, 103.16 MiB)  
> **Date**: October 2026  
> **Author**: Senior Principal Architect QA & Engineering Team  
> **Companion Documents**: [`INDEX.md`](INDEX.md) | [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md) | [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md)

---

## Quick Start for the Testing Week

You have the complete, standalone portable executable at:
`c:\Users\kazir\Documents\OpenCode\GazBoard\releases\GazBoard-v6.0.0-Portable.exe`

Double-click to run. It requires no installation, does not modify Windows registry settings, and stores boards in your local user data directory or beside the executable.

Use this field guide as your daily testing companion. Each section provides:
1. **The Feature Concept & Intent**: What it does and why it was built.
2. **Step-by-Step Test Actions**: Exactly how to trigger and exercise it.
3. **What to Look For**: Verification criteria, smooth animations, correct physics, and expected state transitions.
4. **Edge Cases & Stress Tests**: Things to try to see if you can break it.
5. **Inspiration & Competitive Notes**: Points of comparison against StarNote, Flexcil, LiquidText, Obsidian, and GoodNotes.

---

# Domain 1: Audio Recording, Sync & Temporal Note Replay

### 1.1 Audio-Synchronized Inking & Live Reveal Replay
* **Concept**: While audio is recording, every pen stroke point captures a high-resolution timestamp (`p.t`). During replay, handwriting appears dynamically in sync with the speaker's voice.
* **Test Steps**:
  1. Click the microphone/recording button in the toolbar or AudioBar.
  2. Notice the recording timer badge in the top bar with its glowing outline.
  3. Speak a test sentence while writing 3 distinct words at 2-second intervals (e.g. *"First"*, *"Second"*, *"Third"*).
  4. Stop the recording. Notice the AudioBar HUD appears with the waveform density scrubber.
  5. Press **Play** (or <kbd>Space</kbd>).
* **What to Look For**:
  - Strokes should appear exactly as the words were spoken, accompanied by a subtle electric cyan glow bloom.
  - The Live Reveal presentation should accurately partition: only strokes belonging to that track replay dynamically.
* **Edge Cases to Test**:
  - Pause playback midway and seek back and forth on the timeline.
  - Switch replay display modes in AudioBar (Live Reveal vs Spotlight vs Static).
  - Test with stylus pressure vs mouse drawing.

### 1.2 Waveform Density Scrubber & Timestamp Bookmarks
* **Concept**: Visual density timeline showing stroke activity peaks with clickable timestamp bookmarks.
* **Test Steps**:
  1. With an active recording in AudioBar, click the **Bookmark** button (🔖) or press <kbd>Ctrl+B</kbd> while playback is running.
  2. Notice the bookmark tick appears on the scrubber timeline.
  3. Hover over the bookmark tick to view the tooltip card.
  4. Click the bookmark in the AudioBar drawer to immediately jump the playhead to that exact millisecond.
  5. Click the inline pencil icon to rename the bookmark (e.g., *"Exam Definition"*). Press <kbd>Escape</kbd> to cancel or <kbd>Enter</kbd> to save.
* **What to Look For**:
  - Bookmarks stay synchronized across audio scrub/seek operations.
  - Jump button glides the playback cleanly without audio stutter.

### 1.3 Skip Intervals, Tap-Stroke-to-Seek & Silence Skip
* **Concept**: Smart playback shortcuts for lecture review.
* **Test Steps**:
  1. In AudioBar, look at the skip button (e.g., `10s`). Click it to cycle intervals: `5s` $\rightarrow$ `10s` $\rightarrow$ `15s` $\rightarrow$ `30s`. Right-click to choose directly from the dropdown.
  2. Switch to **Reading Mode** (hand icon / eye icon on toolbar) or hold <kbd>Alt</kbd> in Select mode.
  3. Click any handwritten word on the whiteboard that was recorded during that audio track.
  4. Notice the playback playhead jumps immediately to the moment that specific stroke was written!
  5. In Settings under Canvas, enable **Skip dead air (silence)**. Play a recording with a long pause (>2s without speaking or inking) and verify it automatically accelerates through the silence.

---

# Domain 2: Inking, Gestures & Advanced Pen Suite

### 2.1 The Pluggable Inking Engines
* **Concept**: Pluggable stroke smoothing algorithms tailored for graphics tablets, Surface pens, and styluses.
* **Test Steps**:
  1. Open **Settings** (<kbd>Ctrl+,</kbd> or gear icon) $\rightarrow$ **Canvas** $\rightarrow$ **Inking engine**.
  2. Test each of the 4 engines by writing cursive text and fast circles:
     - **GazBoard Default**: Classic baseline responsive smoothing.
     - **Windows Ink**: Velocity-weighted cubic Bézier curve fitting matching Snip & Sketch / MS Whiteboard feel.
     - **Catmull–Rom Bézier**: Smooth interpolating spline preserving sharp corners.
     - **Perfect Freehand**: Pressure-modulated artistic stroke profiles.
* **What to Look For**:
  - Compare stroke latency, curvature roundness at high speed, and tail tapering.
  - Note which engine feels most natural with your specific stylus or mouse.

### 2.2 Advanced Pens: Brush, Fountain & Calligraphy
* **Concept**: Specialized pen tools inspired by fine art and calligraphy software.
* **Test Steps**:
  1. In the toolbar, click the pen tool icon or click `+` to open the extended pen tray.
  2. Select **Brush Pen** (hotkey <kbd>B</kbd>): Draw quick strokes. Notice velocity thinning: fast strokes taper thin, slow strokes stay rich.
  3. Select **Fountain Pen** (hotkey <kbd>F</kbd>): Draw diagonal cross-hatching. Notice the directional tine spreading ($|\sin(\text{dir} - \text{slant})|$) producing authentic nib variance based on draw angle.
  4. Select **Calligraphy Pen** (hotkey <kbd>C</kbd>): Write italic lettering. Notice the fixed flat chisel polygon ribbon envelope geometry.
* **Edge Cases to Test**:
  - Adjust the **Pen Opacity** slider in Settings (e.g. 50%) and layer multiple brush strokes over each other to inspect alpha blending.
  - Draw with graphics tablet pressure vs mouse vs touchscreen finger.

### 2.3 Gesture Scratch-Out Eraser (StarNote-Style)
* **Concept**: Scribble rapidly back and forth over ink to erase it immediately without switching to the eraser tool.
* **Test Steps**:
  1. Write a word like *"Testing"* with any pen.
  2. Without switching tools, quickly scribble back and forth across the word in 5+ tight horizontal zig-zags ($M$-shape or $Z$-shape).
  3. Notice the word vaporizes in place!
  4. Now write ordinary handwriting that has zig-zags (like a cursive *"w"*, *"m"*, or *"nn"*). Notice it does NOT erase (spatial overlap guard prevents false positives).
  5. Go to **Settings** $\rightarrow$ **Inking** $\rightarrow$ **Gesture scratch-out eraser** card:
     - Change sensitivity between **Low**, **Medium**, and **High**.
     - Toggle target protection: try enabling `Text Boxes` or `Sticky Notes` and scratch over a sticky note to see it vaporize.

### 2.4 Shape Recognition: Lift-to-Snap & Hold-to-Shape
* **Concept**: Two flexible ways to convert hand-drawn shapes into clean vector geometry.
* **Test Steps**:
  1. Draw a circle and pause the pen still for ~500ms at the end of the stroke without lifting. Notice it snaps into a perfect circle (**Hold-to-Shape**).
  2. Try the same pause gesture with:
     - A rectangle / box
     - A triangle
     - A straight line
     - A diamond
     - An arrow
  3. In Settings, enable **Straighten shapes I draw** (Lift-to-Snap). Draw a rough box and lift immediately — it automatically converts to a geometric box. Press <kbd>Ctrl+Z</kbd> once to return your raw hand-drawn ink!

---

# Domain 3: Active-Recall Study Tape & Answer Covers

### 3.1 Study Tape Drawing & Toggling (Flexcil-Style)
* **Concept**: Interactive concealing tape for self-quizzing and memorization.
* **Test Steps**:
  1. Select the **Study Tape** tool from the toolbar (striped tape icon) or Add menu.
  2. Draw a freehand strip of tape across an answer, formula, or diagram detail.
  3. Notice the distinctive diagonal neon hatched pattern concealing the content underneath.
  4. Switch to Select tool or Reading Mode and **tap the tape**.
  5. Notice the tape becomes semi-transparent with a faint dotted outline, fully revealing the answer!
  6. Tap it again to conceal it.
* **Edge Cases to Test**:
  - Draw tape over an image annotation.
  - Select the tape and drag it across the board — verify content underneath stays intact.
  - Test **Rectangular Answer Covers** via Insert menu (`type: 'curtain'`).

### 3.2 Global Reveal & Conceal (Document Navigator Integration)
* **Test Steps**:
  1. Place 3 or 4 study tapes across different sections of your whiteboard.
  2. Open the **Document Navigator** (<kbd>Alt+T</kbd> or sidebar icon).
  3. Switch to the **Study Index** tab.
  4. Notice all study tapes and covers are listed with their status (👁️ Revealed / 🙈 Concealed).
  5. Click **Reveal All** — all tapes on the board uncover at once.
  6. Click **Conceal All** — all answers re-mask simultaneously.
  7. Click an individual tape row in the sidebar to jump directly to it.

---

# Domain 4: Geometry, Connectors & Templates

### 4.1 Arrowheads & Flexible Route Geometry
* **Concept**: Smart diagram connectors with custom heads and automatic shape snapping.
* **Test Steps**:
  1. Draw two shapes (e.g. a circle and a box).
  2. Select the **Line / Connector** tool.
  3. Hover near the circle: notice the 4 cardinal blue connection snap dots (North, East, South, West).
  4. Click a snap dot on the circle and drag an arrow to a snap dot on the box.
  5. Select the connector: in the floating action menu, test changing:
     - Arrowhead style: **Barbed / Elongated**, **Open**, **Stealth**, or **Diamond**.
     - Routing geometry: **Straight**, **Curved** (smooth Bézier), or **Orthogonal** (stepped right-angle).
  6. Move the circle around the board — notice the connector line dynamically stretches and follows the shape!

### 4.2 Custom Template Creator & Zoom Presets
* **Test Steps**:
  1. Design a custom layout on the board (e.g., Cornell note columns or meeting minutes).
  2. Open the slide-in Templates panel $\rightarrow$ click **Set current board as template** or import a background image/PDF.
  3. Open a new board: your custom template is available in the gallery.
  4. Hover over the **Zoom percentage label** in the bottom bar:
     - Notice the hover popover with preset zoom levels (50%, 100%, 150%, 200%).
     - Click **Fit Width** or **Fit Height** to frame content to the window.
     - Click the star icon to pin a favorite zoom level.

---

# Domain 5: PDF Book Reader, Spread View & Margins

### 5.1 PDF Background Import vs Movable Objects
* **Concept**: Choose between locked high-fidelity textbook reading mode vs movable image cutouts.
* **Test Steps**:
  1. Click **+** (Insert) $\rightarrow$ choose a multi-page PDF document.
  2. When prompted by the import modal, choose **Page background (Locked pad mode)**.
  3. Notice the PDF pages are locked into a smooth vertical or spread layout, allowing you to ink, highlight, and write notes in margins without accidentally dragging the PDF page.

### 5.2 Turnout Page Margin Adjustment Dialog
* **Concept**: Draggable 8-handle margin controller allowing asymmetrical margins (e.g. wide right margin for annotations).
* **Test Steps**:
  1. With a document open, open the **Page Margins** dialog (toolbar icon or via page menu).
  2. Drag any of the 8 blue control handles:
     - Notice the 1:1 kinematic responsiveness without cursor lag.
     - Test Cornell Notes preset (wide left or wide right margin).
     - Test symmetric vs asymmetric margins up to 2000px.
  3. Apply to **Current page** or **All pages**.
  4. Write notes in the newly expanded turnout gutter.

### 5.3 2-Page Book Spread Reading View
* **Test Steps**:
  1. In a multi-page PDF board, switch page layout to **2-Page Spread**.
  2. Notice pages align side-by-side like an open book with centered odd/final pages.
  3. Panning and zooming smoothly maintains companion page alignment.

---

# Domain 6: Markdown, Obsidian Interoperability & Knowledge Graph

### 6.1 Obsidian-Style Markdown Cards & Math
* **Concept**: Rich Markdown cards supporting Obsidian syntax, KaTeX formulas, checklists, and callout containers.
* **Test Steps**:
  1. Select the **Text tool** (<kbd>T</kbd>) and click on the board.
  2. Type Markdown syntax:
     ```markdown
     # Lecture 4 Notes
     > [!NOTE] Fundamental Theorem
     > Here is an important formula:
     $$ \int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2} $$

     ### Tasks
     - [x] Review lecture slides
     - [ ] Complete practice set #physics
     ```
  3. Click outside the box to render.
  4. Notice the styled Obsidian callout block, rendered KaTeX math, and interactive checkbox (clicking the checkbox toggles check state without editing text!).
  5. Click the card style button in the floating menu to cycle: **Canvas** $\rightarrow$ **Window** $\rightarrow$ **Minimal** $\rightarrow$ **Transparent**.

### 6.2 Wikilinks & Autocomplete (`[[BoardName]]`)
* **Test Steps**:
  1. In a text card or sticky note, type `@` or `[[`.
  2. Notice the autocomplete popover appears listing existing boards in your collection!
  3. Select a board or type a new board name.
  4. Double-click the rendered `[[BoardName]]` wikilink to test your configured action (Open in Split View, Navigate, or Embed in place).

### 6.3 JSON Canvas 1.0 Bidirectional Engine
* **Concept**: Export your whiteboard to the open JSON Canvas format used by Obsidian Canvas, Logseq, and Kinopio, or import `.canvas` files.
* **Test Steps**:
  1. Create a board with 2 sticky notes, a text card, a diagram, and a connecting arrow.
  2. Open the board menu $\rightarrow$ **Export** $\rightarrow$ choose **JSON Canvas 1.0 (.canvas)**.
  3. Save the `.canvas` file. Open it in a text editor to verify standard schema (`nodes`, `edges`, colors).
  4. Open Obsidian (or a new GazBoard) and import that `.canvas` file: all notes, positions, and connectors restore cleanly!

### 6.4 Obsidian Markdown Sidecar Exporter
* **Test Steps**:
  1. Open board menu $\rightarrow$ **Export** $\rightarrow$ choose **Markdown Sidecar (.md)**.
  2. Open the exported `.md` file in any text editor or Obsidian vault.
  3. Notice the YAML frontmatter at the top:
     ```yaml
     ---
     title: "My Study Board"
     date: 2026-10-23
     tags: [calculus, physics]
     generator: GazBoard v6.0.0
     ---
     ```
  4. Notice all text notes, KaTeX formulas, and video timestamp bookmarks are neatly structured as native Markdown headings and lists.
  5. In Settings under Canvas, test turning on **Auto-export Markdown sidecar on save**.

### 6.5 LiquidText-Style Elastic Tether Connectors
* **Concept**: Excerpt cards visually linked to their source location on the board.
* **Test Steps**:
  1. Make an excerpt (snip a region of a page or board).
  2. Place the excerpt card nearby on the board.
  3. Notice the anchor pin badge (📍) and the dynamic elastic dashed cyan tether curve connecting the excerpt card to its source coordinates!
  4. Drag the excerpt card around — the tether line stretches like a rubber band.
  5. Click the anchor badge: notice the camera smoothly glides back to the original source location with a radiant glow!

### 6.6 Interactive Knowledge Graph View
* **Test Steps**:
  1. Press the Knowledge Graph button in the top bar or menu.
  2. The high-performance force-directed Knowledge Graph modal opens!
  3. Notice boards (cyan/blue), tags (orange `#`), and excerpt links (green) simulating physics.
  4. Hover over a node: connected edges illuminate.
  5. Drag a node to arrange the network.
  6. Type in the filter search box to highlight matching topics.
  7. Click any board node: the modal closes and immediately navigates you to that board!

---

# Domain 7: Multi-Tab Workspace & Multi-Window Browsing

### 7.1 Chrome-Style Tab Bar
* **Concept**: Fast tabbed switching between multiple boards with sub-5ms LRU caching.
* **Test Steps**:
  1. In Settings under Appearance, ensure **Show tab bar** is enabled.
  2. Notice the horizontal tab bar at the top of the window.
  3. Click `+` to open a new tab, or open several boards from the gallery.
  4. Click between tabs: switching should feel instantaneous without reloading.
  5. Right-click a tab to test the context menu:
     - **Open in new window**
     - **Duplicate tab**
     - **Close other tabs**
     - **Close tab**
  6. Reorder tabs by dragging them horizontally.

### 7.2 Multi-Window Smart Focus & Lease Locking
* **Concept**: Dual-window study with automatic active-editor vs read-only reference protection.
* **Test Steps**:
  1. Press <kbd>Ctrl+Shift+N</kbd> or right-click a tab and choose **Open in new window**.
  2. Arrange both windows side by side.
  3. Notice the window in focus has the **✍️ Active editor** badge in the corner and permits full inking/editing.
  4. Notice the background window automatically shifts to **🔒 Read-only reference mode** to protect against race conditions.
  5. Click the background window or click **Take over editing**: the lease locks immediately transfer, making the new window editable!
  6. Draw a stroke in the active window and save: notice the second window refreshes its board view automatically.

---

# Domain 8: Diagram Studio & Scientific Math Studio

### 8.1 Interactive UI Diagram Studio (Mermaid.js & Chart.js)
* **Concept**: Visual builders for decision trees, flowcharts, mind maps, and radar charts with real-time error checking.
* **Test Steps**:
  1. Click **Insert** $\rightarrow$ **Diagram Studio** (or diagram icon).
  2. Test the **Flowchart / Decision Tree** builder:
     - Add steps and conditions.
     - Notice the green checkmark pill indicating *"Valid diagram syntax"*.
     - Intentionally make a syntax error in the Code tab: notice the red error pill with line pointer and helpful error description!
  3. Test the **Mind Map** visual builder.
  4. Test the **Spider Radar** and **Bar Chart** builders.
  5. Select **White Card** vs **Transparent** background.
  6. Click **Insert Diagram onto Board**: the diagram renders onto the whiteboard as a high-resolution vector card.

### 8.2 Scientific Math Studio (LaTeX <-> SymPy / MATLAB / Wolfram)
* **Concept**: Bidirectional converter between LaTeX formulas and computational math engines.
* **Test Steps**:
  1. Click **Insert** $\rightarrow$ **Scientific Math Studio**.
  2. Type a LaTeX formula:
     `\int_{0}^{1} x^2 dx`
  3. Notice the live three-way translation tabs:
     - **SymPy**: `integrate(x**2, (x, 0, 1))`
     - **MATLAB**: `int(x^2, x, 0, 1)`
     - **Wolfram Alpha**: `integrate x^2 from x=0 to 1`
  4. Test the **Matrix Builder**: select rows and columns (e.g. $3 \times 3$) to automatically generate LaTeX matrix syntax.
  5. Test the **Quick Evaluator**: type `\sqrt{64} + 2^4` and verify it calculates `24`.

---

# Domain 9: In-App Video & YouTube Suite

### 9.1 Video Embedding, Frame Capture & Timestamp Stamps
* **Concept**: Study video lectures inside the whiteboard without switching apps.
* **Test Steps**:
  1. Click **Insert** $\rightarrow$ **Video / YouTube**.
  2. Paste a YouTube URL (e.g. `https://youtu.be/...`) or local `.mp4` file.
  3. Click **Insert Video Card**: a rich video thumbnail card appears on your whiteboard.
  4. Double-click the card to open the **In-App Video Player**:
     - Play the video.
     - At an interesting moment, click **📷 Full-Res Screenshot**: the exact high-resolution frame is stamped directly onto your whiteboard!
     - Click **🔖 Bookmark Timestamp**: records the exact second in the bookmark drawer.
     - Click **📌 Stamp Card on Board**: places a clickable timestamp card on the canvas.
     - Click **📋 Copy Markdown Link**: copies `[mm:ss](...)` to clipboard.
  5. Close the video modal: verify audio stops immediately with zero background leak.

---

# Domain 10: Video Export & Rendering Pipeline

### 10.1 High-Definition Replay Video Export
* **Concept**: Export your handwritten notes, diagrams, and audio as a stitched MP4/WebM video.
* **Test Steps**:
  1. Open a board containing strokes and audio recordings.
  2. Click board menu $\rightarrow$ **Export** $\rightarrow$ **Export as video**.
  3. In the export dialog:
     - Select recording sessions. Reorder tracks using ▲ / ▼.
     - Choose resolution: **720p**, **1080p**, or **4K**.
     - Choose framing: **Follow strokes** (dynamic camera) vs **Whole board** (fixed).
  4. Click **Start Export**: inspect the progress indicator and verify the rendered WebM video plays smoothly with stitched audio tracks.

---

# Feedback & Bug Reporting Template

Whenever you discover a bug, visual glitch, performance slowdown, or have an inspiration for a new feature while testing this week, use this structured template to record it:

```markdown
### [Bug / Feedback / Inspiration Title]
* **Target Version**: v6.0.0 Portable
* **Domain / Subsystem**: (e.g. Inking / Video Player / Knowledge Graph / Multi-Window)
* **Severity**: (Critical Crash / Annoying Bug / Minor Visual / Feature Idea)

#### What I Did (Steps to Reproduce):
1. ...
2. ...
3. ...

#### What Happened (Actual Behavior):
* Describe the quirk, glitch, or unexpected behavior.

#### What Should Have Happened (Expected Behavior):
* Describe the ideal behavior.

#### Inspiration / Competitive Comparison:
* How does StarNote, Flexcil, LiquidText, Obsidian, or GoodNotes handle this?
* What tweak or workaround would make this 10x better in GazBoard?
```

Keep this guide open as you test. When your usage quota resets next week, we will systematically resolve every collected item and elevate GazBoard to the next level!
