# Layer 01: Audio Recording, Replay Engine & Bookmarks

## 1. Subsystem Overview
Captures microphone audio via `MediaRecorder`, stamps sub-millisecond relative timestamps on every stroke point (`p.t`), and orchestrates synchronized audio-ink replay. Provides an interactive floating `AudioBar` HUD, waveform density scrubber, jump-to-bookmark tools, configurable skip intervals, and on-canvas interactive audio cards.

## 2. Primary Source Files (Touch ONLY These)
* **Core Recording**: `src/js/core/audio-recorder.js` (`AudioRecorder` class, pause/resume continuity, duration tracking).
* **Core Replay**: `src/js/core/replay.js` (`ReplayEngine` class, multi-speed playback, fallback `performance.now()` delta clock).
* **Document Store**: `src/js/core/store.js` (`Store.toJSON()`, `Store.load()` serialization of `doc.audioTracks`).
* **AudioBar HUD**: `src/js/ui/audio-bar.js` (Floating draggable player, skip intervals `[5s, 10s, 15s, 30s]`, Recording Panel with 3-dot context menu).
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
3. **Finite Duration Fallback**: WebM streams report `duration = Infinity` in Chromium until indexing completes. Always record explicit wall-clock elapsed duration in `track.durationMs` and fall back to it.
4. **Autonomous Delta Clock**: If `<audio>` element stalls or drops frames during seeking, `ReplayEngine` delta clock must continue advancing replay animations smoothly.

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
```
