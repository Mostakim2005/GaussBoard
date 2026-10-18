# Layer 07: Deterministic Video Exporter & Audio Stitching

## 1. Subsystem Overview
Orchestrates offscreen canvas frame rendering and Web Audio multi-track multiplexing to export deterministic `.webm` videos of note replays. Features multi-session selection, interactive reordering (▲/▼), and sequential audio-ink stitching into a single combined video file.

## 2. Primary Source Files (Touch ONLY These)
* **Video Pipeline**: `src/js/export-video.js` (`VideoExporter` class, offscreen replay pump, audio stitching, modal UI).
* **Audio Protocol Streaming**: `main.js` (IPC streaming handler `app://board/asset/<id>`).
* **Canvas Drawing Subroutine**: `src/js/core/render.js` (`drawScene()`, offscreen scaling).

## 3. Subsystem Invariants & Behavior
### Multi-Session Picker & Ordering:
* When clicking "Export video", if multiple audio tracks exist on the board, an interactive selection modal appears.
* Each recording displays a checkbox, track title, duration, and up/down reorder buttons (`▲` / `▼`).
* A toggle allows choosing between:
  1. **Combined / Stitched Export**: Stitches selected recordings sequentially into a single `.webm` video with continuous audio and animated stroke replays.
  2. **Separate Exports**: Exports each selected recording as an individual `.webm` file.

### Offscreen Replay Pump:
* Uses an offscreen HTML5 `<canvas>` sized to the target export resolution (e.g. 1080p).
* Bounding Box Auto-Framing: Calculates the cumulative bounding box of all strokes and cards belonging to the active recording session and centers the camera with smooth padding.
* Active Stroke Camera Tracking: If strokes extend beyond the initial viewport, the offscreen camera glides smoothly to keep the pen tip centered.

### Audio Multiplexing & Chunk Flushing:
* Streams binary audio chunks via Web Audio `AudioContext.createMediaStreamDestination()`.
* Combines video stream from `canvas.captureStream(30)` and audio stream into a single `MediaRecorder` instance.
* Flushes all final data chunks upon completion to prevent 0-byte or corrupt WebM file writes.

## 4. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - VideoExporter pipeline engine exists
# - Store serializes and restores audioTracks in doc schema
```

## 5. v4.8.8 Presets and Test Boundary

`VIDEO_EXPORT_PRESETS` in `src/js/export-video.js` exposes 720p30, 1080p30 and 1080p60. The selection dialog passes the selected output dimensions and frame rate into the single-track or stitched exporter. Presets are settings for the export pipeline; they do not guarantee identical codec support or output size across every Windows device.

Focused tests validate preset configuration and the dialog's returned selection. Media encoding and long-duration memory behavior should still be manually verified on target Windows hardware before making stronger performance claims.
