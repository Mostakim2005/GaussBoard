# GazBoard v5.0.0 — Replay, Camera and Input Reliability Audit

## Release summary

This major release audits the custom feature line after the v4.8.1 baseline and adds improvements to the most cross-cutting workflows: timestamped audio replay, camera following/video export, advanced inking and split-workspace input reliability. It also adds replay presentation choices inspired by established note-replay UX.

The source is based on the local cumulative feature line through v4.8.21. Upstream tags v4.9.0–v4.9.4 are in a separate diverged history and are not included. This release is local; no remote push or public release was performed.

## What changed

- Added Live reveal, Spotlight and Static replay display modes in the recording-session menu. The mode is independent of Reading/Writing input mode, retains Live reveal as the default, and applies to both live playback and single/stitched video export. Exports honor the existing Ghost/Hidden Preview choice.
- Made the session controls reachable with one recording as well as with multiple recordings.
- Cached selected-session stroke lookup by Store revision and bounded the per-Store cache to 16 tracks, reducing repeat full-document scans in replay and follow-framing paths.
- Slowed center-follow response from 180 ms to 360 ms, capped delayed-frame smoothing at 50 ms, and reset the easing clock on pause to prevent resume snaps.
- Made scratch-out classification consistent across pointer sample rates by resampling only its classifier input at 3 px spacing and preserving major turn points. Stored ink points are unchanged.
- Finalized active pointer gestures and released captured pointers when the app window loses focus. Also prevented a closed recording menu from acquiring a delayed outside-click listener.
- Added seven-locale labels and targeted regression coverage.

## How replay display modes work

`Surface` separates the frozen base scene from the active recording's dynamic overlay. Animated modes exclude the active session's strokes from the frozen scene and draw them in the overlay according to the replay clock. Static mode keeps them in the ordinary scene and skips duplicate overlay drawing. Spotlight draws the active stroke fully and can show future strokes as a faint preview when Ghost Preview is enabled. The same mode, preview choice and scene-filter helpers are shared by the live board and video exporter, so a mode cannot silently affect only one output path.

Reading mode controls whether pointer gestures pan or edit. The replay display selector controls ink appearance. `audioInkSync` remains the single gate for hiding session strokes in the base scene and drawing them in the overlay.

## Root causes and fixes found in the audit

- **Center camera could move too sharply after a pause or delayed frame:** the previous easing step used the elapsed interval without a cap; a long pause made the exponential blend approach 1.0. The easing clock now resets when playback pauses and ignores more than 50 ms for a single center-follow step, while using a slower 360 ms response.
- **Replay and export repeatedly rebuilt whole-board session filters:** lookup now reuses an LRU-bounded index keyed by Store and track, invalidated by Store revision. Drawing the selected session's already-visible strokes remains proportional to the session size.
- **Scratch-out results could vary with input report rate:** classification now uses stable-distance samples while preserving turns; the actual stored and rendered stroke points are untouched.
- **Window focus loss could strand an active pointer gesture/capture:** the existing interaction completion path now receives a final synthetic pointer-up using the last screen point, then releases every captured pointer and clears the state.
- **Recording-menu outside-click handler could outlive its menu:** the handler is removed on dismissal and its deferred attachment checks that the same menu is still open.
- **Back-to-back playback:** track/load generations and pending seek behavior were reviewed and are covered by an end → replay and track-switch regression. No production lifecycle rewrite was necessary for the tested paths.

## Compatibility and edge conditions

- Replay mode defaults to Live reveal for settings without a valid choice; invalid values normalize to Live reveal.
- Sync disabled: session ink stays in the normal board scene and the replay overlay remains disabled.
- Static mode does not double-draw highlighters or change their ordinary blend behavior.
- Store revisions invalidate cached track stroke lists; the cache does not retain removed track IDs without bound.
- Scratch resampling rejects non-finite coordinates and does not mutate source points or timestamp/pressure/tilt metadata.
- Blur completion routes through the regular pointer-up handler so drawing and object interactions retain their normal commit/undo behavior. Pointer capture release is guarded for already-released IDs.
- No new third-party or native dependencies were added.

## Security and audit limitations

The renderer's existing fixed-XHTML Markdown pipeline escapes data and restricts ordinary link protocols. Electron sender validation, navigation checks, `contextIsolation`, and `nodeIntegration: false` remain in place. `sandbox: false` and path-based trusted-renderer file IPC are documented future hardening work. The v4.8.21 audit found 0 production dependency advisories and 10 moderate dev/build transitive advisories; incompatible automated downgrades were not applied. See [`AUDIT-POST-4.8.1-TO-5.0.0.md`](AUDIT-POST-4.8.1-TO-5.0.0.md) for prioritized feature judgment and deferred risks.

## Verification

- `npm run smoke:custom`: **64 checks passed, 0 failed** across custom features, replay, video framing, path security, and focused Electron 4.8.4.1/4.8.8/5.0.0 checks. The full base-feature suite was not run per the user's scope.
- Focused combined tests (`custom-features`, `replay-reading`, `video-framing`, `audio-bar`): **45 tests passed, 0 failed**.
- `node scripts/i18n-check.js`: **1,487/1,487 keys** in each of the seven locales; no missing or extra keys.
- `git diff --check`: passed before the release commit.
- Packaged portable Windows executable: x64, Electron 43.8.3, unsigned (no signing certificate configured).

## Release record

- Version tag: `v5.0.0`, local only.
- Commit: see the tag target in local Git history.
- Portable executable: `dist-v5.0.0/GazBoard-v5.0.0-Portable.exe`.
- Artifact size: **106,255,198 bytes**.
- SHA-256: `FBE91E5DF562649BC527F3FC92F46AC876B7880049429A3495E941936B537439`.
- Archive snapshot: `C:\Users\kazir\Documents\Codex\GazBoard\v5.0.0\`.
- Remote push/publication: none.
