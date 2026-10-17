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
