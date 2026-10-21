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

