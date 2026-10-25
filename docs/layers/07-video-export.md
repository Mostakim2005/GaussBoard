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
* **Fixed view:** `Fixed view area` fits either the selected recording's ink bounds or the combined bounds of all board objects and page extents. The export frame stays stationary.
* **Follow strokes:** the camera eases toward the active or next timestamped stroke as it is reanimated. If a recording has no associated strokes, the exporter falls back to the current board view.
* Both framing choices apply to single-track and stitched exports; stitched exports initialize the camera at each recording boundary.
* **Replay presentation:** Live reveal, Spotlight and Static share `replayDisplayMode()` and `replaySceneFilter()` with the live board. Static draws session ink only in the normal scene pass. Spotlight draws the current stroke in full and can show future strokes as a faint preview when Ghost Preview is enabled; Live reveal progressively draws the current stroke. Export also reuses the live engine's Ghost/Hidden Preview choice.
* **Lookup cost:** the exporter builds one selected-track stroke list keyed by Store revision, then reuses it for camera target selection. Scene rendering still paints visible strokes from the selected track every frame; no large-board encoder benchmark is implied by unit tests.

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

## 6. v4.8.11 Filename and Encoder Notes

- Each suggested video filename includes a UTC timestamp suffix and sanitizes board/recording names for Windows paths. The user can still edit the name in the save dialog.
- Current export remains Chromium `canvas.captureStream()` + `MediaRecorder` with VP9/Opus when available and a WebM fallback. It is dependency-free and preserves the current real-time replay/audio multiplexing path.
- WebCodecs could provide low-level control and may use hardware acceleration, but requires explicit frame/audio timestamp management and a WebM muxer. Codec support must be probed at runtime; it should be added as an optional backend with MediaRecorder fallback, not assumed universal.
- A bundled native FFmpeg executable would offer mature codec, bitrate, scaling, and muxing controls, but increases download size and distribution/security maintenance. `ffmpeg.wasm` is not the recommended desktop encoder: its maintainers describe it as slower than native FFmpeg and its multithread variant as CPU/memory hungry. No encoder backend was replaced in v4.8.11; benchmark representative board/audio exports before selecting one.
- `test/audio-bar.test.mjs` covers Windows-safe unique names. `npm run smoke:video` remains focused on framing/configuration; it does not measure full encode time or output size.

Focused tests validate preset configuration and the dialog's returned selection. Media encoding and long-duration memory behavior should still be manually verified on target Windows hardware before making stronger performance claims.

For the post-v4.8.1 feature audit, replay modes and cross-feature behavior, see [`../releases/AUDIT-POST-4.8.1-TO-5.0.0.md`](../releases/AUDIT-POST-4.8.1-TO-5.0.0.md). The v5.0.0 portable release and feature-only test totals are recorded in [`../releases/RELEASE-5.0.0.md`](../releases/RELEASE-5.0.0.md).

Run `npm run smoke:video` for focused frame-bounds and camera-follow checks. `npm run smoke:features:4.8.8` exercises the export-dialog choices.

## 7. v6.9.2 Hardening Corrections

- **Format default:** the picker now defaults to **WebM**, the pipeline that muxes the recording's audio. The WebCodecs **MP4** path writes video only, so choosing MP4 shows a translated notice that it is exported without sound; MP4 audio muxing remains an open item.
- **Robustness:** a selected track without `assetId` fails immediately with the recording name (instead of a 15 s media timeout); a throwing `onProgress` callback cannot stop the frame pump; suggested filenames cap the descriptive part while preserving the timestamp suffix.
- **Known limitation:** both export paths still hold the entire encoded video in memory (MediaRecorder chunks or the muxer's in-memory fast-start buffer, plus the final Blob/ArrayBuffer). Streaming to disk needs append/seek-capable IPC across desktop, Android and web adapters, plus a save dialog before encoding. See `hardening/AUDIT_LOG.md`.
