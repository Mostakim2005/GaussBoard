# GazBoard Replay — Comprehensive Bug Fix & Resolution Log

This document records all bugs, regressions, edge-case failures, and UI conflicts discovered during the development and hardening of GazBoard Replay, along with their root causes, architectural fixes, and regression prevention invariants.

---

## 1. Bug Registry & Summary Index

| Bug ID | Title | Severity | Area | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Gesture Eraser 3-Second Timeout Cutoff | High | Gesture Recognition | Resolved |
| **BUG-002** | Gesture Eraser False-Positive on Numbers (`2 3 2`) and Words (`WRM`) | Critical | Gesture Math | Resolved |
| **BUG-003** | Right-Click Context Menu and Selection Toolbar Collision | Medium | UI / Context Menu | Resolved |
| **BUG-004** | In-Settings Search Missing Token Descriptions and Dynamic DOM Updates | Medium | UI / Settings | Resolved |
| **BUG-005** | Top-Bar Audio Recording Button Lacked State Sync & Persistence | High | Audio Pipeline | Resolved |
| **BUG-006** | Audio Replay Engine Clock Stall & MediaRecorder Duration Infinity | Critical | Audio / Canvas Replay | Resolved |
| **BUG-007** | Session Selector Dropdown Destroyed Mid-Click by Reactivity Loop | Medium | UI / AudioBar HUD | Resolved |
| **BUG-008** | Split Workspace Initialization Referenced Unmounted Pane | High | UI / Split View | Resolved |
| **BUG-009** | Settings Button Color Choices Lacked Immediate Click Feedback | Low | UI / Settings | Resolved |
| **BUG-010** | Storage Switch Timing Race Condition in Re-entrant Smoke Test | Low | Storage / Testing | Resolved |
| **BUG-011** | i18n Missing String Placeholders & Locale Parity Drift | Medium | Internationalization | Resolved |
| **BUG-012** | Hover Toolbar Premature Dismissal on Cursor Approach | Medium | UI / Toolbar | Resolved |
| **BUG-013** | Context Menu and Quick Action Toolbar Screen Overlap | Medium | UI / Context Menu | Resolved |
| **BUG-014** | Plus (+) Menu Popover Dismissal on Pin/Unpin Toggle | Medium | UI / Popover | Resolved |
| **BUG-015** | Front Ribbon Tool Non-Configurability & Plus Menu Separation | Medium | UI / Ribbon Customization | Resolved |
| **BUG-016** | Mouse Wheel Zoom vs Scroll Ambiguity & Arrow Key Navigation | High | Interaction / Navigation | Resolved |
| **BUG-017** | Smoke Test Title Assertion Failure from Toolbar Tooltip Suffix | Low | Testing / i18n | Resolved |
| **BUG-018** | Replay Seek Reverted to Stale Media Position | High | Audio / Replay | Resolved in v4.8.11 |
| **BUG-019** | Live Highlighter Replay Outline Was Not Visible | High | Replay Rendering | Resolved in v4.8.11 |
| **BUG-020** | Recording Rename Dialog Did Not Work Reliably | Medium | Audio / UI | Resolved in v4.8.11 |
| **BUG-021** | Recording Action Menu Could Overflow the Viewport | Medium | Audio / UI | Resolved in v4.8.11 |
| **BUG-022** | Video Export Suggested Names Could Collide or Be Invalid on Windows | Low | Video Export | Resolved in v4.8.11 |
| **BUG-028** | Center Camera Follow Snapped After Pause or Long Frame | Medium | Replay Camera | Resolved in v5.0.0 |
| **BUG-029** | Scratch-Out Classification Varied with Pointer Sample Rate | Medium | Gesture Recognition | Resolved in v5.0.0 |
| **BUG-030** | Replay Rebuilt Track Lookup from the Full Board Every Frame | Medium | Replay Performance | Improved in v5.0.0; overlay paint remains session-sized |
| **BUG-031** | Window Focus Loss Could Strand a Pointer Gesture | Medium | Interaction Lifecycle | Resolved in v5.0.0 |
| **BUG-032** | Closed Recording Menu Could Acquire a Delayed Dismiss Listener | Low | AudioBar Lifecycle | Resolved in v5.0.0 |
| **BUG-033** | Markdown Heading Anchors Were Not Distinguished from Pad Pages | Medium | Board Links / Markdown | Resolved in v5.1.0 |
| **BUG-034** | Split Workspace Could Not Receive In-App Excerpt Clipboard or Drop | Medium | Split Workspace / Clipboard | Resolved in v5.1.0 |
| **BUG-045** | Relative Import Path Resolution Mismatch in UI Subsystem Modules | Medium | ES Modules / Workbench | Resolved in v6.4.0 |
| **BUG-046** | Content Security Policy `EvalError` in Mathematical Evaluator & Grapher | High | Security / CSP | Resolved in v6.5.0 |
| **BUG-047** | Localization Parity Drift on New Scientific & CAS Workbench Keys | Medium | i18n Parity | Resolved in v6.5.0 |
| **BUG-048** | Offline Tesseract OCR Engine Omitted from Electron Binary Distribution | High | Packaging / Offline Engine | Resolved in v6.5.0 |

---

## 2. Detailed Bug Analyses & Resolutions

### BUG-001: Gesture Eraser 3-Second Timeout Cutoff
* **Symptom**: Fast zig-zag strokes longer than 3000ms failed to activate the scratch-out gesture eraser, leaving messy ink lines on the canvas.
* **Root Cause**: An arbitrary hardcoded check `(t1 - t0) > 3000` in `src/js/core/scratch.js` aborted detection on deliberate, multi-word or large-area scribbles.
* **Fix**:
  1. Removed the artificial time cutoff entirely.
  2. Anchored detection strictly to kinematic and geometric invariants: $\ge 5$ sharp direction reversals, stroke density $\ge 3.5$, and net progress ratio $\le 0.35$.
* **Files Touched**: `src/js/core/scratch.js`.

---

### BUG-002: Gesture Eraser False-Positive on Numbers (`2 3 2`) and Words (`WRM`)
* **Symptom**: Writing sequential handwriting with loops or reversals (such as digits `2 3 2`, `3 3 3`, or cursive letters `w`, `m`) occasionally triggered the scratch-out eraser accidentally.
* **Root Cause**: The gesture detector only evaluated reversal counts without measuring spatial overlap along the dominant reversal axis. Sequential writing travels linearly across the paper, whereas intentional scrubbing repeatedly retraces over the same spatial domain.
* **Fix**:
  1. Implemented **Dominant Reversal Axis Spatial Overlap Guard**:
     Calculated the primary reversal axis vector $\vec{A}$ and computed pairwise 1D bounding box overlap between consecutive reversal segments:
     $$\text{Overlap Ratio} = \frac{\sum \text{overlap}(S_i, S_{i+1})}{\sum \text{length}(S_i)} \ge 0.25$$
  2. If strokes advance forward without reversing back over previous bounds, scratch-out is safely rejected as normal writing.
  3. Added an explicit ON/OFF toggle in the Eraser popover and ReplayBar HUD for user override.
* **Files Touched**: `src/js/core/scratch.js`, `src/js/ui/toolbar.js`, `src/js/ui/replay-bar.js`.

---

### BUG-003: Right-Click Context Menu and Selection Toolbar Collision
* **Symptom**: Right-clicking a selected object (such as a board link card or note) opened the context menu directly overlapping the selection action toolbar (`#ctxbar`), creating visual clutter and conflicting click targets.
* **Root Cause**: Both the selection toolbar and the custom context menu listened to selection events without mutual exclusion.
* **Fix**:
  1. Updated `src/js/ui/contextmenu.js` to immediately hide `#ctxbar` upon opening the context menu (`app.hideSelectionBar()`).
  2. Added an event listener on context menu dismissal to restore `#ctxbar` cleanly if objects remain selected.
* **Files Touched**: `src/js/ui/contextmenu.js`.

---

### BUG-004: In-Settings Search Missing Token Descriptions and Dynamic DOM Updates
* **Symptom**: Searching settings via OmniSearch or the in-Settings search bar only matched title headers; searching for terms inside descriptions (e.g., "pressure", "duration", "transparent") returned no results or failed to update dynamically.
* **Root Cause**: Search index only indexed setting title keys, and in-Settings input did not filter DOM section cards in real-time.
* **Fix**:
  1. Rewrote search indexing to extract and tokenize both setting headers and full descriptive body copy into a searchable multi-word inverted index.
  2. Attached live `input` listener to `#settingsSearchInput` in `src/js/ui/panels.js`, instantly hiding non-matching sections and updating category subheaders without page reloads.
* **Files Touched**: `src/js/ui/search-dialog.js`, `src/js/ui/panels.js`.

---

### BUG-005: Top-Bar Audio Recording Button Lacked State Sync & Persistence
* **Symptom**: Clicking the embedded `#btnTopRecord` button started recording, but failed to synchronize recording state with the app's persistent document schema or properly stop/save the track.
* **Root Cause**: `#btnTopRecord` was implemented as a simple UI prototype that did not link with `app.audioRecorder.recording` or call `app.persist()`.
* **Fix**:
  1. Connected `#btnTopRecord` to `app.audioRecorder` lifecycle.
  2. Added animated pulsing red recording ring and live digital timer (`MM:SS`).
  3. On recording completion, automatically packages track into `doc.audioTracks`, updates store, commits op-log, and opens the AudioBar player.
* **Files Touched**: `src/js/ui/toolbar.js`, `src/index.html`, `src/js/app.js`.

---

### BUG-006: Audio Replay Engine Clock Stall & MediaRecorder Duration Infinity
* **Symptom**:
  1. Audio replay occasionally stalled when seeking or jumping to bookmarks.
  2. WebM recordings created by `MediaRecorder` reported `duration = Infinity` in Chromium, causing scrubbers and video exporters to crash or freeze.
* **Root Cause**:
  1. WebM chunk streams recorded via MediaStream omit duration headers until container indexing finishes.
  2. Audio HTML5 `<audio>` element relied solely on `audio.currentTime`, which desyncs if the audio buffer stalls or drops frames.
* **Fix**:
  1. `AudioRecorder` captures explicit wall-clock elapsed duration: `durationMs = Date.now() - startTime` and saves it directly in `track.durationMs`.
  2. Built an autonomous `performance.now()` delta fallback clock in `ReplayEngine`. If `audio.currentTime` ceases advancing during playback, the delta clock smoothly continues driving stroke animations without audio interruption.
* **Files Touched**: `src/js/core/audio-recorder.js`, `src/js/core/replay.js`, `src/js/ui/density-canvas.js`.

---

### BUG-007: Session Selector Dropdown Destroyed Mid-Click by Reactivity Loop
* **Symptom**: When multiple audio recordings existed, clicking the native `<select>` dropdown in AudioBar collapsed immediately before a track could be picked.
* **Root Cause**: The 100ms `syncUI()` polling interval rebuilt and replaced the DOM structure of AudioBar every tick, destroying active `<select>` focus.
* **Fix**:
  1. Replaced the raw `<select>` element with a custom floating glassmorphic popover menu (`ab-session-dropdown`).
  2. Preserved the popover across clock ticks, closing it only on explicit selection or click-outside dismiss.
* **Files Touched**: `src/js/ui/audio-bar.js`.

### BUG-033: Markdown Heading Anchors Were Not Distinguished from Pad Pages (v5.1.0)
* **Symptom**: Textual board references could target a board or numeric page, but heading and local block targets were not represented consistently across Markdown conversion, canvas hit-testing and navigation.
* **Cause**: The native reference format treated its fragment as a page number and Markdown conversion did not preserve a separate heading target.
* **Fix**: Encode heading anchors with an `h:` marker, preserve them through native-reference/wikilink conversion and board-ID remapping, and navigate to matching Markdown headings or block IDs. Numeric fragments continue to select pad pages.
* **Verification**: Board-reference round-trip tests cover heading/local targets; focused Markdown and v5.1.0 smoke checks pass.
* **Files Touched**: `src/js/core/boardrefs.js`, `src/js/core/markdown.js`, `src/js/core/render.js`, `src/js/app.js`.

### BUG-034: Split Workspace Could Not Receive In-App Excerpt Clipboard or Drop (v5.1.0)
* **Symptom**: An excerpt copied from a selection could be inserted into the active board, but the left reference pane did not receive it through the shared clipboard or drag/drop workflow.
* **Cause**: The secondary canvas owns a separate Store and was outside the active board's paste/drop routing.
* **Fix**: Route in-app clipboard paste to the hovered left pane and support a validated custom excerpt payload in either split-pane drop target. Store data remains independent and the source backlink travels with the image.
* **Verification**: Electron feature smoke confirms left-pane paste and drag/drop both create a linked image.
* **Files Touched**: `src/js/ui/split-workspace.js`, `src/js/app.js`, `src/js/core/excerpts.js`.

---

### BUG-008: Split Workspace Initialization Referenced Unmounted Pane
* **Symptom**: Opening Split Study Workspace threw a JavaScript `TypeError: Cannot read properties of undefined (reading 'store')`.
* **Root Cause**: In `src/js/ui/split-workspace.js`, `this.rightPane.load()` was invoked before the right DOM host element had been appended and measured.
* **Fix**:
  1. Reordered lifecycle: DOM mounting and flexbox layout assignment execute first, followed by surface camera creation and secondary board state hydration.
  2. Added null checks to ensure split instances clean up all global listeners on close.
* **Files Touched**: `src/js/ui/split-workspace.js`.

---

### BUG-009: Settings Button Color Choices Lacked Immediate Click Feedback
* **Symptom**: Clicking laser color or duration pills in Settings updated internal state, but did not visually highlight the clicked button until the panel was closed and reopened.
* **Root Cause**: `mkChoice()` helper mutated `app.settings` but omitted updating the `.primary` CSS class on sibling button elements.
* **Fix**:
  1. Added instant DOM class switching to `mkChoice`: removes `.primary` from siblings and applies it immediately to the clicked target.
* **Files Touched**: `src/js/ui/panels.js`.

---

### BUG-010: Storage Switch Timing Race Condition in Re-entrant Smoke Test
* **Symptom**: Test `"and going back, the board that was left behind is there again, still in its folder"` intermittently timed out after storage switch.
* **Root Cause**: Windows disk file flush on folder re-indexing occasionally exceeded the hardcoded 400ms sleep loop when switching board directories under high I/O.
* **Fix**:
  1. Verified that storage switch functions atomically and all filesystem handles close before folder transition.
  2. Ensured storage directory reset triggers synchronous board state reload.
* **Files Touched**: `test/smoke.js`, `storage-location.js`.

---

### BUG-011: i18n Missing String Placeholders & Locale Parity Drift
* **Symptom**: Adding new UI features caused `scripts/i18n-check.js` to fail due to missing keys in non-English dictionaries.
* **Root Cause**: GazBoard strictly enforces 100% string coverage across all 7 supported languages before packaging.
* **Fix**:
  1. Extracted all newly introduced user-facing strings.
  2. Synchronized full, grammatically verified translations into `ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, and `zh-Hant.json`.
  3. Validated placeholder integrity (`{name}`, `{n}`, `{count}`) so interpolation never errors.
* **Files Touched**: `src/locales/*.json`.

---

### BUG-012: Hover Toolbar (#ctxbar) Premature Dismissal on Cursor Approach
* **Symptom**: Hovering an object revealed the floating action toolbar (`#ctxbar`), but moving the mouse towards it immediately dismissed the bar before the user could click any action button.
* **Root Cause**: The hover hit-test dismissed the toolbar synchronously whenever the pointer left the bounds of the hovered canvas object, without accounting for the physical gap between the object and the floating menu bar.
* **Fix**:
  1. Implemented a 350ms grace timeout before hiding `#ctxbar`.
  2. Attached `mouseenter` and `mouseleave` listeners to `#ctxbar` so cursor entry cancels the dismissal timer and keeps the bar active with Windows-style persistent focus.
  3. Added an explicit user preference toggle: `Show quick actions on hover` in Settings.
* **Files Touched**: `src/js/app.js`, `src/js/ui/panels.js`, `src/js/ui/contextmenu.js`.

---

### BUG-013: Context Menu and Quick Action Toolbar Screen Overlap
* **Symptom**: Right-clicking an object opened both the horizontal quick-action toolbar (`#ctxbar`) and the vertical context menu right on top of each other, obstructing menu items.
* **Root Cause**: Both UI elements positioned themselves relative to the clicked object's coordinates without computing mutual exclusion bounding boxes.
* **Fix**:
  1. Updated `showContextMenu(app, e)` in `src/js/ui/contextmenu.js` to inspect `#ctxbar.getBoundingClientRect()`.
  2. Dynamically positions the vertical context menu side-by-side: placed 8px adjacent to the right of `#ctxbar` (`cr.right + 8`), or flipping to the left (`cr.left - 8 - menuWidth`) if near screen edge.
  3. Both menus coexist simultaneously without overlapping.
* **Files Touched**: `src/js/ui/contextmenu.js`.

---

### BUG-014: Plus (+) Menu Popover Dismissal on Pin/Unpin Toggle
* **Symptom**: Clicking the pin/unpin icon (📌 / 📍) in the `+` menu closed the popover and returned focus to the canvas, forcing the user to reopen the menu for every single pin change.
* **Root Cause**: `togglePin()` triggered `initToolbar(app)`, which called `bar.innerHTML = ''`, destroying the `+` anchor button in the DOM and causing `openPopover`'s click-outside detection and toggle logic to dismiss the popover.
* **Fix**:
  1. Created a persistent `#pinnedToolsSlot` inside the toolbar.
  2. Implemented `toggleInsertPin(id, pinBtn)`: updates only `pinBtn` text, opacity, and title directly in the DOM without rebuilding the popover or destroying the toolbar.
  3. Re-renders only `#pinnedToolsSlot` in-place, keeping the popover open for multiple consecutive pin/unpin operations.
* **Files Touched**: `src/js/ui/toolbar.js`.

---

### BUG-015: Front Ribbon Tool Non-Configurability & Plus Menu Separation
* **Symptom**: Front ribbon tools (`select`, `lasso`, `pan`, `laser`, pens, `highlighter`, `eraser`, `ruler`, `text`, `note`, `shape`, `emoji`) were statically hardcoded and could not be moved or organized into the `+` menu.
* **Root Cause**: Ribbon construction assumed a static set of tools and lacked serialization for hidden ribbon items.
* **Fix**:
  1. Introduced `app.settings.hiddenRibbonTools` array in `DEFAULT_SETTINGS`.
  2. Wrapped ribbon tools with right-click context menu listeners: right-clicking any tool moves it to the `+` menu with a toast notification (`t('Moved to + menu')`).
  3. Added a comprehensive "Ribbon tools" section in `openInsertPopover` with 📌/📍 toggles for each tool and direct tool activation.
  4. Added `syncRibbonTools(app)` to dynamically toggle `style.display = 'none'` on hidden tools without re-rendering the ribbon.
* **Files Touched**: `src/js/app.js`, `src/js/ui/toolbar.js`.

---

### BUG-016: Mouse Wheel Zoom vs Scroll Ambiguity & Arrow Key Navigation
* **Symptom**: Mouse wheel scrolling zoomed the canvas without an option to pan/scroll pages, and arrow keys did not provide canvas navigation.
* **Root Cause**: `onWheel()` routed mouse wheel notches to zoom without checking user preferences, and `onKeyDown()` lacked Arrow key navigation handlers when no object was selected.
* **Fix**:
  1. Added `mouseWheelMode` setting (`'scroll'` vs `'zoom'`) with intelligent dual mode: wheel performs the chosen action, holding `Ctrl` switches to the other action, and `Shift+wheel` pans horizontally.
  2. Preserved trackpad gesture distinction: two-finger gestures continue to pan smoothly by default, while pinch zooms.
  3. Added Arrow key pan/scroll navigation in `onKeyDown()`: on infinite canvas, $\leftarrow, \rightarrow, \uparrow, \downarrow$ pan in all four directions; in paged mode, $\uparrow, \downarrow$ scroll pages; `Shift` accelerates step size. Handlers are safely bypassed during text editing or input focus.
* **Files Touched**: `src/js/app.js`, `src/js/core/tools.js`, `src/js/ui/panels.js`, `src/js/ui/search-dialog.js`.

---

### BUG-017: Smoke Test Title Assertion Failure from Toolbar Tooltip Suffix
* **Symptom**: `node scripts/smoke.js` failed on test `"chosen in Settings, Bangla reaches the toolbar, the top bar and the menu bar"`.
* **Root Cause**: The test asserts `bnUi.selectTitle === bnDict['Select (V)']`. Appending ` — Right-click to move to + menu` to `b.title` caused an exact string equality mismatch.
* **Fix**:
  1. Retained exact `opts.title` on ribbon buttons without extra suffix.
  2. Move actions are handled via standard right-click and surfaced with toast confirmations.
* **Files Touched**: `src/js/ui/toolbar.js`, `src/locales/*.json`.

---

### BUG-4841-01: Crop Apply/Reset Undo Entry Malformed
* **Symptom**: Undo after cropping could throw because a string ID list was passed as store operations.
* **Fix**: Capture an object snapshot before preview mutations and commit the completed crop/reset through `commitSnapshot()`.
* **Files Touched**: `src/js/ui/contextmenu.js`.

### BUG-4841-02: Crop Cancel Kept Preview Changes
* **Symptom**: Closing the crop dialog left its in-place preview on the image, and Apply had no clean pre-preview state to undo to.
* **Fix**: Restore the original snapshot on dismiss; Apply and Reset commit one snapshot transaction.
* **Files Touched**: `src/js/ui/contextmenu.js`.

### BUG-4841-03: Video Export Mutated Live Replay and Retained Surface Resources
* **Symptom**: Export used the live replay engine and a regular animated `Surface`, retaining observers, resize handlers, and a frame loop.
* **Fix**: Use an ephemeral surface and exporter-owned replay clock; dispose surface, media sources, streams, audio elements, and audio context.
* **Files Touched**: `src/js/core/surface.js`, `src/js/export-video.js`.

### BUG-4841-04: Video Audio Load Could Wait Forever
* **Symptom**: Export awaited `canplaythrough` without a timeout and invented a fallback duration when metadata was unavailable.
* **Fix**: Bound audio loading to 15 seconds and require finite track or media duration.
* **Files Touched**: `src/js/export-video.js`.

### BUG-4841-05: Invalid Crop Source Rectangle Could Abort a Frame
* **Symptom**: Out-of-bounds or partial crop values could reach `drawImage()` unchanged.
* **Fix**: Clamp the source origin and dimensions to the image bounds.
* **Files Touched**: `src/js/core/render.js`.

### BUG-018: Replay Seek Reverted to Stale Media Position (v4.8.11)
* **Symptom**: Immediately after recording or after an initial play, seeking/skip controls could appear unresponsive or jump back to the previous media time. Toggling replay sometimes cleared the condition.
* **Root Cause**: The media element's pre-seek `currentTime` remained stale while the browser completed an asynchronous seek and could overwrite the user's requested replay time.
* **Fix**: Keep the requested seek authoritative until media seek lifecycle confirmation; retry/resolve pending seeks on relevant media events.
* **Verification**: `test/replay-reading.test.mjs`; see `docs/releases/RELEASE-4.8.11.md` for test counts and boundaries.
* **Files Touched**: `src/js/core/replay.js`.

### BUG-019: Live Highlighter Replay Outline Was Not Visible (v4.8.11)
* **Symptom**: Video export rendered synchronized ink replay, while the live board failed to show the active outline for some strokes/highlighters.
* **Root Cause**: The feedback outline reused blending behavior that could multiply into an invisible/dark result; a one-point stroke prefix also had no drawable segment.
* **Fix**: Draw the replay feedback in a visible source-over pass, retaining regular source ink behavior, and use a tiny render-only segment at stroke start.
* **Verification**: `test/replay-reading.test.mjs`; this is automated rendering coverage, not a user-board E2E validation.
* **Files Touched**: `src/js/core/surface.js`.

### BUG-020: Recording Rename Dialog Did Not Work Reliably (v4.8.11)
* **Symptom**: Rename from the audio recording menu could fail to show or persist the new name.
* **Root Cause**: The action used the browser `prompt()` path, which is unreliable in the Electron application shell and did not provide the desired document operation semantics.
* **Fix**: Use GazBoard's own text dialog and commit the value as an undoable `audioTracks` Store operation.
* **Verification**: `test/audio-bar.test.mjs` covers dialog wiring and persistence logic; see the release dossier.
* **Files Touched**: `src/js/ui/audio-bar.js`.

### BUG-021: Recording Action Menu Could Overflow the Viewport (v4.8.11)
* **Symptom**: The recording three-dot menu could render offscreen when its anchor was near the top or bottom of the recording list.
* **Fix**: Measure available space, choose the better side of the anchor, and constrain menu height so its contents scroll within the viewport.
* **Verification**: `test/audio-bar.test.mjs` includes placement checks.
* **Files Touched**: `src/js/ui/audio-bar.js`.

### BUG-022: Video Export Suggested Names Could Collide or Be Invalid on Windows (v4.8.11)
* **Symptom**: Repeated exports using the board title could suggest duplicate names, and invalid Windows filename characters could reach the save dialog.
* **Fix**: Append a UTC timestamp to the suggested name and sanitize Windows-reserved filename characters.
* **Verification**: `test/replay-reading.test.mjs` includes filename rules; video output quality/throughput was not benchmarked on representative user boards.
* **Files Touched**: `src/js/export-video.js`.

### BUG-023: Live Board Replay Did Not Render Animated Stroke Highlights (v4.8.11 follow-up)
* **Symptom**: Exported replay showed progressive stroke animation/highlighting, but replaying on the live board did not. Changing Reading/Writing mode did not restore the live overlay.
* **Root Cause**: Video export constructs its temporary `Surface` with `{ app: this.app }`, but the primary board `Surface` was constructed without the app reference. `Surface` therefore held `this.app === null`; live drawing could not reach `ReplayEngine`, so the replay overlay did not render. Export had the required reference and continued working. Reading/Writing mode controls board gestures, not replay rendering.
* **Fix**: Pass `app: this` into the primary `Surface` constructor in `src/js/app.js`, aligning live and export surface wiring. The existing replay renderer can then access `ReplayEngine`, keep session strokes out of the frozen base scene, and draw the progressive overlay.
* **Verification**: Focused replay/custom checks and the full regression smoke run passed after the fix. The user also confirmed live-board behavior works. See `docs/releases/RELEASE-4.8.11.md` for final build/check details.
* **Files Touched**: `src/js/app.js` (wiring correction); renderer behavior remains in `src/js/core/surface.js` and `src/js/core/replay.js`.

### BUG-024: Saved Bookmark Names Were Interpreted as Tooltip HTML (v4.8.21)
* **Symptom**: Bookmark names from board data were interpolated into `innerHTML` in the replay density tooltip.
* **Cause**: A user-controlled label was mixed with trusted tooltip markup rather than rendered as text.
* **Fix**: Build the label with DOM nodes and assign the timestamp/name through `textContent`. Escape cancels an edit and restores the persisted value.
* **Verification**: `test/security-hardening.test.mjs`; manual tooltip interaction should also be checked in the built app.
* **Files Touched**: `src/js/ui/density-canvas.js`.

### BUG-025: Electron IPC and External Navigation Were Not Restricted to the Main App Frame (v4.8.21)
* **Symptom**: IPC handlers did not verify their sender frame, `window.open()` passed arbitrary schemes to `shell.openExternal`, and renderer navigation was unrestricted.
* **Cause**: The main process trusted renderer-originated requests without checking the frame or parsing external URLs.
* **Fix**: Route every `ipcMain.handle` through a primary-frame `app://board` guard; prevent navigation off the app URL; open only HTTP(S) URLs externally; restrict the explicit releases bridge to the configured GitHub releases path.
* **Verification**: `test/security-hardening.test.mjs`; full smoke suite and packaged-app launch are recorded in the v4.8.21 release dossier.
* **Files Touched**: `main.js`, `src/js/platform/security.cjs`.

### BUG-026: Standard Obsidian YAML Block Lists Were Dropped from Board Metadata (v4.8.21)
* **Symptom**: `tags:` and `aliases:` written as indented `- item` YAML lists were parsed as empty values, so tags were missing from imported Markdown cards.
* **Cause**: The lightweight parser only recognized inline bracket arrays and one-line scalars.
* **Fix**: Parse block lists and preserve quoted commas/colons in inline list entries without adding a YAML dependency.
* **Verification**: `test/markdown.test.mjs`.
* **Files Touched**: `src/js/core/markdown.js`.

### BUG-027: Locale Dictionaries Had Missing and Obsolete Keys (v4.8.21)
* **Symptom**: The required locale check failed: several recently added UI strings were untranslated in all seven dictionaries, while renamed strings remained as stale entries.
* **Fix**: Added translations for the extracted strings, removed obsolete keys, and verified complete parity across the seven locales.
* **Verification**: `node scripts/i18n-check.js` reports 1,483/1,483 strings and zero extras/problems for every locale.
* **Files Touched**: `src/locales/ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`.

### BUG-028: Center Camera Follow Snapped After Pause or Long Frame (v5.0.0)
* **Symptom**: Center-follow could translate most of the remaining offset in one step after a pause or a delayed animation frame, making the replay camera jump.
* **Cause**: Exponential easing used the full elapsed wall-clock interval; a long gap made its blend factor approach 1.
* **Fix**: Increase the time constant to 360 ms, cap a single easing delta at 50 ms, and reset the smoothing clock whenever playback pauses.
* **Verification**: `test/replay-reading.test.mjs` covers a delayed frame and pause/resume movement bounds.
* **Files Touched**: `src/js/core/replay.js`.

### BUG-029: Scratch-Out Classification Varied with Pointer Sample Rate (v5.0.0)
* **Symptom**: Dense and coarse pointer streams describing the same scratch gesture could produce different density/reversal measurements.
* **Cause**: Classification consumed device-reported move samples directly, so report rate changed the detector's input geometry.
* **Fix**: Resample finite coordinates at a fixed 3 px spacing for classification, preserving major x/y/diagonal turns. Keep raw ink points, timestamps and pressure/tilt data untouched.
* **Verification**: `test/custom-features.test.mjs` compares coarse and high-rate versions of the same gesture and malformed input.
* **Files Touched**: `src/js/core/scratch.js`.

### BUG-030: Replay Rebuilt Track Lookup from the Full Board Every Frame (v5.0.0)
* **Symptom**: Replay active-stroke selection and camera-follow target search repeatedly filtered document objects while the animation loop ran.
* **Cause**: Callers rebuilt a session selection from `doc.order` or `Object.values(doc.objects)` for each frame.
* **Fix**: Cache a selected track's strokes per Store revision in a WeakMap/LRU map. Rebuild only after Store revision changes; bound each Store's retained track indexes to 16.
* **Verification**: `test/replay-reading.test.mjs` asserts cache reuse and invalidation; replay/video custom smoke checks pass. Drawing already-visible strokes is still proportional to the selected track's stroke count.
* **Files Touched**: `src/js/core/replay-clock.js`, `src/js/core/replay.js`, `src/js/core/surface.js`, `src/js/export-video.js`.

### BUG-031: Window Focus Loss Could Strand a Pointer Gesture (v5.0.0)
* **Symptom**: If the app lost focus before pointer-up, active ink/object interaction state and pointer capture could remain stale until another action or refresh.
* **Cause**: The Interaction state machine depended on receiving `pointerup`/`pointercancel` from its canvas.
* **Fix**: On window blur, complete the owning action through the ordinary pointer-up route at its last screen point, release every captured pointer ID and clear remaining pointer state.
* **Verification**: `test/custom-features.test.mjs` verifies the final event, completion and release of all captures.
* **Files Touched**: `src/js/core/tools.js`.

### BUG-032: Closed Recording Menu Could Acquire a Delayed Dismiss Listener (v5.0.0)
* **Symptom**: A queued zero-delay callback could add a global outside-click listener after the recording panel had already closed.
* **Cause**: Listener attachment was deferred to avoid dismissing the menu on its opening click, but did not re-check menu identity.
* **Fix**: Remove the listener whenever the menu closes and have delayed attachment confirm the same panel and handler remain active.
* **Verification**: Covered by code-path review and the audio-bar focused test suite; menu close/dismiss behavior has not been run through a full interactive UI automation scenario.
* **Files Touched**: `src/js/ui/audio-bar.js`.


### BUG-033: `buildMarkdownSvgDataUri` Corrupted `xmlns` Attributes via Post-Render URL Autolinker (v5.3.0)
* **Symptom**: Canvas Markdown cards (`drawMarkdownBlock`) failed to render when SVG `<foreignObject>` data URIs were loaded into `Image`.
* **Cause**: `renderInlineMarkdown` ran a raw URL regex (`/(^|[\s(>])([a-zA-Z]+:\/\/[^\s<]+)/g`) after HTML tags were already emitted, matching `http://www.w3.org/2000/svg` inside `xmlns="..."` attributes and injecting `<a href="...">` inside XML attribute strings.
* **Fix**: Mask existing HTML tags (`<...>`) and `<a ...>...</a>` blocks with null-byte tokens before autolinking raw URLs, then restore them afterward.
* **Verification**: `test/markdown.test.mjs` (`Produces valid XHTML inside SVG <foreignObject> data URI`).
* **Files Touched**: `src/js/core/markdown.js`.

### BUG-034: Split Workspace Surface Leak, Missing `isOpen` Getter & Duplicate Wheel Handler (v5.3.0)
* **Symptom**: Opening and closing Split Study Workspace leaked `Surface`, `ResizeObserver`, and `rAF` instances; `Ctrl+Z`/`Ctrl+Y` and `pasteAt()` ignored the left study pane; mouse wheel zoomed/panned at 2x speed on the left pane.
* **Cause**: `app.js` checked `this.splitWorkspace?.isOpen` while `SplitWorkspace` only defined `.active`; `disable()` did not call `this.leftSurface.destroy()`; `split-workspace.js` attached a redundant `wheel` listener alongside `Interaction`'s wheel handler.
* **Fix**: Added `get isOpen() { return this.active; }`, called `this.leftSurface.destroy()` in `disable()`, and removed the duplicate wheel listener.
* **Verification**: `test/custom-features.test.mjs`, `test/smoke-features-5.1.0.js`.
* **Files Touched**: `src/js/ui/split-workspace.js`, `src/js/app.js`.

### BUG-035: Left Study Pane Unsaved Edits, Missing Asset Hydration/Externalization & Incomplete `swapPanes()` (v5.3.0)
* **Symptom**: Drawing or editing on the left study pane did not auto-save or update `#tags`; images stored as `asset:<sha256>` failed to display in the left pane; `swapPanes()` lost `audioTracks`, `properties`, and camera positions.
* **Cause**: `leftStore` lacked a `subscribe()` handler for `syncDocumentTags()` and `saveLeftBoardDebounced()`; `loadLeftBoard()`/`saveLeftBoard()` bypassed `resolveAssets()`/`externaliseAssets()`; `swapPanes()` copied only a partial subset of `doc` fields.
* **Fix**: Subscribed `leftStore`, wired `resolveAssets()` and `externaliseAssets()` into left board load/save, and updated `swapPanes()` and `createNewStudyBoard()` to preserve full `emptyDoc()` schema and cameras.
* **Verification**: `test/custom-features.test.mjs`, `test/smoke-features-5.1.0.js`.
* **Files Touched**: `src/js/ui/split-workspace.js`.

### BUG-036: `.gazboard` Single-Board Export/Import Omitted Audio Assets & `isBoardFile` Skipped Audio-Only Boards (v5.3.0)
* **Symptom**: Exporting a board with recorded audio via `board:exportFile` wrote raw JSON without the audio asset files, leaving audio tracks unplayable when imported on another device.
* **Cause**: `board:exportFile` only checked image assets and wrote raw JSON; `board:importFile` rejected ZIP containers; `storage-location.js` `isBoardFile()` did not check `audioTracks` or `properties`.
* **Fix**: Bundled `doc.audioTracks` assets into `.gazboard` ZIP archives on export, extracted bundled assets in `board:importFile`, and updated `isBoardFile()` to recognize `audioTracks` and `properties`.
* **Verification**: `test/storage-location.test.js`, `npm run smoke:custom`.
* **Files Touched**: `main.js`, `storage-location.js`.

### BUG-037: `ink.js` 1-Slot `WeakMap` Cache Thrashing During Replay & Per-Stroke `ctx.filter` Slowdown (v5.3.0)
* **Symptom**: Live audio replay with neon outlines recomputed cubic Bézier and polygon paths 3 times per stroke per frame (0% cache hit rate), and Spotlight replay mode dropped frames due to per-stroke `ctx.filter` switches.
* **Cause**: `pathCache` and `runCache` stored a single `{ w, engine, path }` entry per `o.points` reference, which was evicted whenever `drawReplayOutline` cloned the stroke with `width: o.width + 5` and `width: o.width + 6`.
* **Fix**: Upgraded `pathCache` and `runCache` to store up to 6 `Map` entries (`${engine}:${w}`) per `pts` array, quantized replay outline width boosts to `0.5px`, and replaced per-stroke `ctx.filter` in Spotlight mode with alpha dimming.
* **Verification**: `test/custom-features.test.mjs`, `test/replay-reading.test.mjs`.
* **Files Touched**: `src/js/core/ink.js`, `src/js/core/surface.js`.

### BUG-038: `perfectFreehand` Ignored in `runPath`, Stylus Tilt Ignored in `calligraphyPath` & `p.t` Stripped on Study Tape (v5.3.0)
* **Symptom**: Variable-pressure strokes fell back to polygonal segments under `perfectFreehand`; calligraphy strokes ignored stylus tilt (`tiltX`/`tiltY`); freehand Study Tape strokes lost `p.t` timestamps on `finishStroke()`.
* **Cause**: `runPath()` omitted `perfectFreehand`; `calligraphyPath()` used only static `o.angle`; `finishStroke()` called `simplify()` on `subtype === 'tape'`.
* **Fix**: Added `perfectFreehand` support to `runPath()`, incorporated stylus `tiltX`/`tiltY` into `calligraphyPath()`, and preserved `{ x, y, p, t }` on Study Tape strokes.
* **Verification**: `test/custom-features.test.mjs`.
* **Files Touched**: `src/js/core/ink.js`, `src/js/core/tools.js`.

### BUG-039: Modal Keydown Listener & Share Panel Interval Leaks (v5.3.0)
* **Symptom**: Repeatedly opening `PageMarginDialog` or `NoteOverviewDrawer` stacked global `keydown` listeners; `SearchDialog` registered duplicate `Ctrl+F`/`Ctrl+K` listeners; closing the Share panel via the header X button leaked its `setInterval` poll.
* **Fix**: Cleaned up modal `keydown` listeners on `close()`, deduplicated `SearchDialog` shortcut binding, and invoked `panels.onClose` when closing `#panel`.
* **Verification**: `npm run smoke:custom`.
* **Files Touched**: `src/js/ui/pagemargin-dialog.js`, `src/js/ui/note-overview.js`, `src/js/ui/search-dialog.js`, `src/js/ui/panels.js`.

### BUG-040: SVG Export Flattened `brush`/`fountain` Runs and Ignored Image Crop Rectangles (v5.3.0)
* **Symptom**: Exporting a board to SVG flattened variable-width `brush` and `fountain` strokes into uniform lines and exported cropped images uncropped.
* **Fix**: Exported `brushRuns` and `fountainRuns` sub-paths in `svgObjects()` and cropped images via an offscreen canvas during SVG generation; prevented `drawMarkdownCardContainer` from drawing `'MD'` badge text while a text box is actively being edited.
* **Verification**: `test/custom-features.test.mjs`, `node scripts/smoke.js`.
* **Files Touched**: `src/js/export.js`, `src/js/core/render.js`.

### BUG-041: `remapImportedBoard` Dropped `#h:` Heading Links and `excerptSource.boardId` (v5.3.0)
* **Symptom**: Importing a linked board bundle failed to remap board IDs inside `@[Label](b:id#h:Heading)` links and `o.excerptSource.boardId`.
* **Fix**: Extended `remapImportedBoard()` in `src/js/core/boardrefs.js` to remap `#h:...` links and `excerptSource.boardId`.
* **Verification**: `test/excerpt.test.mjs`.
* **Files Touched**: `src/js/core/boardrefs.js`.

### BUG-042: Board Link Thumbnail Toggle & Arrowhead Helpers Bypassed `Store.update` (v5.3.0)
* **Symptom**: Toggling a board-link card thumbnail mutated `o.thumb` without saving or recording an undo entry; `setArrowHeads()`, `stepLineWidth()`, and `cycleArrowScale()` referenced undefined `this.selectedIds`.
* **Fix**: Routed all mutations through `this.store.update()`.
* **Verification**: `test/custom-features.test.mjs`.
* **Files Touched**: `src/js/ui/contextmenu.js`, `src/js/app.js`.

### BUG-043: Malformed `store.commit` Calls Corrupted `undoStack` on Audio Track & Bookmark Edits (v5.3.0)
* **Symptom**: Recording audio, importing audio, or editing bookmarks pushed `{ ops: undefined }` or `{ type: 'audioTracks' }` onto `undoStack`, throwing `TypeError: tx.ops is not iterable` on Redo and skipping autosave.
* **Fix**: Hardened `Store.commit(label, ops)` to filter out invalid ops and updated all audio track/bookmark commits to dispatch `{ t: 'doc', before: { audioTracks }, after: { audioTracks } }`.
* **Verification**: `test/custom-features.test.mjs`, `test/audio-bar.test.mjs`.
* **Files Touched**: `src/js/core/store.js`, `src/js/app.js`, `src/js/ui/audio-bar.js`, `src/js/ui/replay-bar.js`, `src/js/ui/toolbar.js`, `src/js/ui/density-canvas.js`.

### BUG-044: `ReplayBar` `z-index: 9000` Obscured Class Timer Controls and Side Panels (v5.3.0)
* **Symptom**: When docked at the top, `#replayBar` sat above `#classTimer` (`z-index: 27`), `#panel` (`z-index: 35`), and `#overlay` (`z-index: 60`), intercepting clicks on the Class Timer's `+1` button.
* **Fix**: Set `#replayBar` `z-index` to `21`.
* **Verification**: `node scripts/smoke.js`, `npm run smoke:custom`.
* **Files Touched**: `src/js/ui/replay-bar.js`.


### BUG-045: Relative Import Path Resolution Mismatch in UI Subsystem Modules (v6.4.0)
* **Symptom**: Workbench modules in `src/js/ui/` failed to import i18n helpers when referencing `../core/i18n.js` instead of `../i18n.js`.
* **Root Cause**: Directory reorganization had placed `i18n.js` in `src/js/i18n.js` directly, but new workbench modules attempted to import from `src/js/core/i18n.js`.
* **Fix**: Normalized import paths across `circuit-workbench.js`, `diagram-builder.js`, `simulation-runner.js`, and `periodic-table.js` to `import { t } from '../i18n.js'`.
* **Verification**: `node scripts/smoke.js`.
* **Files Touched**: `src/js/ui/circuit-workbench.js`, `src/js/ui/diagram-builder.js`, `src/js/ui/simulation-runner.js`, `src/js/ui/periodic-table.js`.

### BUG-046: Content Security Policy `EvalError` in Mathematical Evaluator & Grapher (v6.5.0)
* **Symptom**: Function grapher expressions and Symbolic CAS evaluations threw `EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self' app: 'wasm-unsafe-eval'"`.
* **Root Cause**: `function-grapher.js` and `scientific-math.js` attempted to use `new Function('x', ...)` and `Function(...)()` to compile math expressions entered by users.
* **Fix**: Implemented `parseMathExpressionSafely(exprStr, vars)`—a pure, zero-dependency Recursive Descent Abstract Syntax Tree (AST) evaluator that parses tokens, respects operator precedence (`^`, `*`, `/`, `+`, `-`), unary negation, parenthetical grouping, mathematical constants (`pi`, `e`, `tau`), and math functions (`sin`, `cos`, `tan`, `sqrt`, `exp`, `log`, `abs`, etc.) with zero use of `eval()` or `new Function()`.
* **Verification**: `node scripts/smoke.js` (1,244 passed, 0 failed).
* **Files Touched**: `src/js/ui/function-grapher.js`, `src/js/core/scientific-math.js`.

### BUG-047: Localization Parity Drift on New Scientific & CAS Workbench Keys (v6.5.0)
* **Symptom**: `node scripts/smoke.js` and `node scripts/i18n-check.js` flagged 38 missing localization keys across all 7 non-English dictionaries (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`).
* **Root Cause**: Phase 5 added user-facing UI controls in `molecule-viewer.js`, `function-grapher.js`, and `technical-linter.js` that had not yet been translated across all supported languages.
* **Fix**: Added high-accuracy native translations for all 38 keys across `src/locales/{ar,bn,de,es,pt-BR,zh-Hans,zh-Hant}.json`, achieving 100% parity (2,030 / 2,030 keys).
* **Verification**: `node scripts/i18n-check.js` (all 7 locales passing 100%).
* **Files Touched**: `src/locales/ar.json`, `src/locales/bn.json`, `src/locales/de.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/zh-Hans.json`, `src/locales/zh-Hant.json`.

### BUG-048: Offline Tesseract OCR Engine Omitted from Electron Binary Distribution (v6.5.0)
* **Symptom**: Portable `.exe` build could not run OCR on scanned PDF text because Tesseract WASM binaries and English traineddata were located only in the shared central `C:\Users\kazir\Documents\Antigravity\CommonLibraries\` folder rather than bundled inside the app.
* **Root Cause**: `src/vendor/tesseract/` was not populated during the initial packaging step.
* **Fix**: Copied `tesseract-core.wasm.js`, `worker.min.js`, and `eng.traineddata.gz` (10.3 MB total) directly into `src/vendor/tesseract/`, updated `libraries.json` manifest (`"bundledInApp": true`), and recompiled the standalone portable binary.
* **Verification**: `dist/GazBoard-v6.5.0-Portable.exe` (107.81 MiB).
* **Files Touched**: `src/vendor/tesseract/*`, `C:\Users\kazir\Documents\Antigravity\CommonLibraries\libraries.json`.


### BUG-049: Libraries Manifest JSON Windows Path Backslash Escape Syntax Error (v6.9.1)
* **Symptom**: Parsing `src/vendor/libraries.json` and `CommonLibraries/libraries.json` failed with `SyntaxError: Bad escaped character in JSON at position ...` when hydrating offline third-party metadata.
* **Root Cause**: Hardcoded Windows absolute paths like `"C:\Users\kazir\Documents\Antigravity\..."` contained raw single backslashes (`\U`, `\k`, `\D`, `\A`) which violated strict JSON RFC 8259 syntax specifications.
* **Fix**: Corrected and normalized all file paths to double-escaped backslashes (`\\`) across both `src/vendor/libraries.json` and `C:\Users\kazir\Documents\Antigravity\CommonLibraries\libraries.json`.
* **Verification**: `node -e "JSON.parse(fs.readFileSync('src/vendor/libraries.json', 'utf8'))"`.
* **Files Touched**: `src/vendor/libraries.json`, `C:\Users\kazir\Documents\Antigravity\CommonLibraries\libraries.json`.

### BUG-050: UI Discovery Entry Points Omission for STEM & Advanced Modals (v6.9.1)
* **Symptom**: Advanced domain workbenches (Circuit Simulator, Molecule Viewer, Function Grapher, CAS, Physics Lab, Periodic Table, WordNet Dictionary, Academic Linter, Kanban Board, Document Navigator) had no direct visual access points in the user interface, requiring developer-console invocations.
* **Root Cause**: While modules and core logic were complete and testable, user-facing discovery containers (`toolbar.js`, `insert.js`, `search-dialog.js`, `panels.js`) lacked corresponding tool cards, ribbon pinnings, command palette entries, and export actions.
* **Fix**: Integrated 10 dedicated discovery cards into the main `+` Insert menu with 1-click ribbon pinning (📌 / 📍); added command palette actions in OmniSearch (<kbd>Ctrl+K</kbd>); registered "Runtime Libraries" inspector in More Settings menu; added context menu quick-launch shortcuts; added "Export Board as Video" in the main export menu.
* **Verification**: `node scripts/smoke.js --new-features` (24/24 passed).
* **Files Touched**: `src/js/ui/toolbar.js`, `src/js/insert.js`, `src/js/ui/search-dialog.js`, `src/js/ui/panels.js`, `src/index.html`.

### BUG-051: Localization Parity Drift on STEM Workbench & UI Discovery Keys (v6.9.1)
* **Symptom**: Strict internationalization check (`node scripts/i18n-check.js`) failed with 45 missing localization keys across all 7 non-English dictionaries (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`).
* **Root Cause**: Adding 10 new STEM tool cards, pin/unpin toggles, runtime library inspector strings, and video export menu items introduced 45 new user-facing strings without corresponding translations in the locale files.
* **Fix**: Added accurate translations for all 45 keys across all 7 locale dictionaries (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`), bringing total key count to 2,238 / 2,238 (100% coverage).
* **Verification**: `node scripts/i18n-check.js` (2,238 keys verified, 0 missing).
* **Files Touched**: `src/locales/ar.json`, `src/locales/bn.json`, `src/locales/de.json`, `src/locales/es.json`, `src/locales/pt-BR.json`, `src/locales/zh-Hans.json`, `src/locales/zh-Hant.json`.
