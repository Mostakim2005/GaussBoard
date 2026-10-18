# Layer 01: Audio Recording, Replay Engine & Bookmarks

## 1. Subsystem Overview
Captures microphone audio via `MediaRecorder`, stamps sub-millisecond relative timestamps on every stroke point (`p.t`), and orchestrates synchronized audio-ink replay. Provides an interactive floating `AudioBar` HUD, waveform density scrubber, jump-to-bookmark tools, configurable skip intervals, and on-canvas interactive audio cards.

## 2. Primary Source Files (Touch ONLY These)
* **Core Recording**: `src/js/core/audio-recorder.js` (`AudioRecorder` class, pause/resume continuity, duration tracking).
* **Core Replay**: `src/js/core/replay.js` (`ReplayEngine` class, multi-speed playback, fallback `performance.now()` delta clock).
* **Document Store**: `src/js/core/store.js` (`Store.toJSON()`, `Store.load()` serialization of `doc.audioTracks`).
* **AudioBar HUD**: `src/js/ui/audio-bar.js` (Floating draggable player, skip intervals `[5s, 10s, 15s, 30s]`, replay sync toggle, saved camera-follow toggle, configurable outline, Recording Panel with 3-dot context menu).
* **Waveform Scrubber**: `src/js/ui/density-canvas.js` (Interactive density canvas, hover preview card with clickable `[Jump]`, expandable bookmark rename editor).
* **Canvas Audio Cards**: `src/js/core/render.js` (`drawAudioCard()`) & `src/js/core/tools.js` (Tap or double-click to play audio card).
* **Top-Bar Button**: `src/js/ui/toolbar.js` (`#btnTopRecord` with glowing neon red ring and live digital timer).

## 3. Data Schema & State Invariants
Whiteboard state represents audio tracks in `doc.audioTracks`:
```javascript
doc.audioTracks = [
  {
    id: "track_1729000000",
    assetId: "ast_abc123",     // Binary audio asset in app://board/asset/<id>
    name: "Lecture Notes",
    durationMs: 452000,        // Wall-clock duration in ms (avoids WebM Infinity bug)
    created: 1729180000000,
    bookmarks: [
      { id: "bm_1", t: 124000, name: "Proof of Theorem 2" }
    ]
  }
];
// Every stroke created during recording has:
stroke.audioId = "track_1729000000";
stroke.t0 = 1240; stroke.t1 = 1820;
stroke.points = [{ x, y, p, t: 1240 }, ...]; // p: pressure, t: relative timestamp in ms
```

## 4. Mandatory Subsystem Invariants (Never Violate)
1. **Scene Partitioning**: During replay, strokes where `o.audioId === activeTrackId` must **never** be rendered in the base frozen canvas. Base passes (`drawScene`, `warmFreeze`) MUST filter: `(o) => o.audioId !== activeTrackId`. Replay strokes render exclusively in `Surface.drawReplaySession()`.
2. **Timestamp Preservation**: All stroke point generators and smoothing passes in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio-ink synchronization.
3. **Finite Duration Handling**: WebM streams from in-app recording can report `duration = Infinity` in Chromium until indexing completes, so retain wall-clock elapsed `track.durationMs`. For imported audio, use finite metadata when available and keep the duration unknown if unavailable; do not fabricate a fallback duration.
4. **Autonomous Delta Clock**: If `<audio>` element stalls or drops frames during seeking, `ReplayEngine` delta clock must continue advancing replay animations smoothly.
5. **Seek After Metadata**: A seek requested before media metadata is available remains pending and is applied when the resource becomes seekable. Playback becomes active only after `play()` succeeds.
6. **Serialized Recording Writes**: MediaRecorder chunks are appended in order, and finalization waits until all pending chunk writes finish.
7. **Reading and Writing Modes**: Playback enters Reading mode. Canvas gestures pan and replay/audio-card taps work without changing objects. Writing mode permits edits and new strokes inherit the active replay track and replay-clock timestamps.
8. **Sync Toggle and Replay Style**: `settings.audioInkSync` controls track-stroke separation and overlay rendering. Replay outline color and effect (`neon`, `outline`, `none`) are user-selectable settings.
9. **Live Camera Follow**: `settings.replayCameraFollow` controls whether replay follows the active reanimated stroke after it leaves the viewport. The AudioBar toggle persists this choice; disabling it cancels an in-progress replay camera glide.

## 5. Relevant Bug Fixes
* **BUG-005**: `#btnTopRecord` was disconnected from `audioRecorder` state and persistence $\rightarrow$ fixed in `toolbar.js`.
* **BUG-006**: Replay clock stalled on seek & WebM duration was `Infinity` $\rightarrow$ fixed with `durationMs` and delta clock fallback.
* **BUG-007**: Session dropdown was destroyed mid-click by 100ms polling $\rightarrow$ replaced with custom floating glassmorphic popover.

## 6. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - ReplayEngine initializes with loadTrack and syncClock
# - Store serializes and restores audioTracks in doc schema
# - No uncaught renderer errors during seek
npm run smoke:replay
# Focused checks for metadata-pending seeks, play rejection state, ordered
# recording writes, replay-clock ink timestamps, and sync-overlay gating.
npm run smoke:video
# Focused video framing options and active-stroke camera-follow calculations.
```

## 7. v4.8.8 Additions and Audit Notes

- **External media duration:** `src/js/insert.js` attempts bounded metadata loading for imported audio. If no finite duration can be read, it keeps the duration unknown instead of fabricating a 60-second value.
- **Temporary media resources:** `src/js/insert.js` and `src/js/ui/audio-bar.js` revoke temporary object URLs after metadata resolution or download use.
- **Video export presets:** `src/js/export-video.js` defines 720p30, 1080p30 and 1080p60 presets; the UI passes explicit dimensions and frame rate into the exporter.
- **Feature test entry points:** `npm run smoke:custom` runs the custom unit/security checks plus focused 4.8.4.1 and 4.8.8 Electron checks. The 4.8.8 video checks assert dialog selection/configuration; they do not perform a long real-time Windows encode.
- **Replay reliability and reading/writing mode:** `src/js/core/replay.js` retains seeks until metadata is available and reports play failures. `src/js/core/audio-recorder.js` waits for ordered chunk writes before finalizing. `src/js/core/tools.js` timestamps ink drawn during replay. `src/js/core/surface.js` gates replay ink with the sync setting and draws the selected outline style. The Replay Bar toggles Reading/Writing mode, while AudioBar exposes sync and outline controls. Run `npm run smoke:replay` for focused regression checks.
- **v4.8.10 replay camera follow:** Replay follows the currently animated stroke when `settings.replayCameraFollow` is enabled; AudioBar provides a persistent toggle. See [`../releases/RELEASE-4.8.10.md`](../releases/RELEASE-4.8.10.md).
- **Change history:** See `docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md` for version boundaries and correction notes.
