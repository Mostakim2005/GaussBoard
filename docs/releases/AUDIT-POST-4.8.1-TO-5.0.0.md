# GazBoard Feature Audit: v4.8.1 through v5.0.0

## Scope and source lineage

This source-checked review covers the project-authored additions after the v4.8.1 baseline through the v4.8.21 source snapshot, plus the v5.0.0 improvements in this release. It routes history through [`FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md), the v4.8.9–v4.8.11 dossiers, [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](../MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md), and [`RELEASE-4.8.21.md`](RELEASE-4.8.21.md), then checks current source and targeted tests.

**Lineage note:** v5.0.0 is built on the project's local `feat/cumulative-fixes` history through v4.8.21. Tags v4.9.0–v4.9.4 are on a separate, diverged upstream history and are not silently included in this release. The v5.0.0 label marks this project's major feature audit and compatible additions, not a merge of those upstream tags.

## Priority and implementation judgment

| Rank | Feature group | Why it matters / implementation complexity | Audit judgment |
| :--- | :--- | :--- | :--- |
| **1 — Critical / very high** | Timestamped audio, live replay, camera follow, stitched video export | Coordinates media seek events, audio time, point timestamps, canvas scene partitioning, multiple sessions and export clocks. A wiring or clock defect can make a central study workflow appear to work in export but fail live. | Keep separate clock and renderer responsibilities; cache active-session lookup by Store revision; expose replay presentation choices; ease and bound center-camera movement; retain export and live parity. Remaining cost: completed session ink is still drawn per frame and should be benchmarked on large boards. |
| **2 — High / very high** | Split Study Workspace | Two independently interactive canvases must keep Store, camera, undo, tools and pointer focus isolated while maintaining clear ownership. | Preserve per-pane state isolation. Finalize a gesture and release captured pointers when the app loses focus, including both pane interactions. Add lifecycle and undo-routing tests before changing ownership rules. |
| **3 — High / high** | Advanced pens and pluggable inking | Brush, fountain and calligraphy geometry must account for pressure, tilt, velocity, smoothing, cache keys, timestamps and every output renderer. | Keep engines selectable and pure JavaScript. Preserve raw point metadata and `p.t`; reduce sampling only for the scratch classifier, never for stored/rendered ink. Check cache invalidation and export parity. |
| **4 — High / high** | Markdown, wikilinks, board embeds and metadata | A custom parser, strict XHTML/SVG `foreignObject` renderer, board resolution and user-authored content combine compatibility and security concerns. | Current renderer emits a fixed XHTML vocabulary, escapes text/attributes, and restricts ordinary Markdown link schemes. Keep the parser closed to raw HTML; continue targeted hostile-input tests. The embed/link resolver is a trusted internal callback and must not become an arbitrary HTML insertion point. |
| **5 — Medium / high** | Active-recall covers, PDF backgrounds and page-margin workflows | These combine persisted state, hit testing, object bounds, page geometry, import modes and undo. | Preserve direct reveal/conceal, attached-object behavior, page scope and undo boundaries. Changes need paired pointer/UI and document-state checks. |
| **6 — Medium / medium** | Scratch-out gesture eraser | Gesture classification depends on geometric density and reversal features, which vary with stylus report rate. | Normalize the classifier's input spacing and preserve meaningful axis turns. Continue to reject malformed coordinates and ordinary writing; keep original points unchanged. |

Other additions—search, tags/aliases, ribbon mobility, templates, connector geometry, PDF import choices and context-menu reflow—are useful but are smaller or less cross-cutting. Their existing focused tests remain in `npm run smoke:custom`; they were not expanded indiscriminately in this major release.

## v5.0.0 changes from the audit

### Replay presentation and performance

- Added **Live reveal**, **Spotlight**, and **Static** display modes to the recording-session menu. The control is distinct from Reading/Writing mode: Reading/Writing governs input and editing, while replay display mode governs how timestamped ink is painted. The default remains Live reveal for existing boards/settings.
- Made the session menu available when a board has one recording as well as multiple recordings, so its replay controls are not hidden in the single-track case.
- Applied the selected mode to both the live board and single/stitched video export. Spotlight shows completed ink normally, future ink as a faint preview, and the active stroke in full; Live reveal progressively draws the active stroke; Static leaves all session strokes in the base scene.
- Kept Ghost/Hidden Preview as an independent choice and passed that choice into both export paths, so exports no longer force a future-stroke preview when live playback hides it.
- Reused an LRU-bounded per-Store/per-track stroke index while the Store revision is unchanged. The replay clock and export camera no longer rebuild a full-board filter on every frame. A Store revision invalidates the index; at most 16 track indexes are retained per Store.
- Center camera follow now uses a slower 360 ms exponential response, caps a delayed frame's smoothing delta at 50 ms, and resets its time base on pause. This prevents a pause/background interval from turning the next frame into a camera snap. The export follow easing remains frame-interval based.
- Added replay lifecycle coverage for end/restart and track switching. The production lifecycle already uses generation counters and pending-seek authority; the new test protects those behaviors from regressions.

Goodnotes' official Note Replay documentation describes the same three presentation choices (Spotlight, real-time reveal and Static). That provides a useful interaction precedent; GazBoard keeps them available for its board workflow and applies them to video export as well. See [Goodnotes: Add Audio Recordings to your documents](https://support.goodnotes.com/hc/en-us/articles/7352688559631-Add-Audio-Recordings-to-your-documents).

### Input and gesture reliability

- Scratch-out classification now resamples valid points at a fixed 3 px spacing for classification only, preserving major direction turns. Raw stroke samples, timestamps, pressure, tilt and rendering remain untouched. This reduces sensitivity to high pointer report rates without reducing ink fidelity.
- If the window loses focus during an interaction, the owning gesture is finalized through the normal pointer-up path at its last known point, all captured pointer IDs are released, and stale gesture state is cleared. This also covers split-workspace interactions because each pane owns an Interaction instance.
- The recording-menu outside-click listener is now removed on close and cannot attach later from a queued timeout after its menu has already closed.

MDN documents pointer cancellation and capture release as normal parts of Pointer Events lifecycles; the blur cleanup complements those paths for a window-focus transition. See [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) and [MDN: `getCoalescedEvents()`](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents). Sampling normalization here is deliberately limited to gesture classification; coalesced samples remain appropriate for smooth pen geometry.

## Cross-feature review and edge cases

| Interaction | Required behavior / check | v5.0.0 status |
| :--- | :--- | :--- |
| Replay mode × Reading/Writing | Presentation mode must not change gesture routing. Reading stays pan/navigation; Writing still creates replay-timestamped ink. | Kept independent; unit coverage asserts the existing Reading route and replay sync gate. |
| Replay mode × audio-ink sync | Turning sync off leaves strokes in the ordinary board scene and disables replay overlay; mode selection must not override the sync switch. | Covered by the shared scene-filter helper. |
| Replay mode × freeze cache | Mode and selected track are part of the frozen-scene key so switching settings cannot reuse the wrong cached picture. | Included in `Surface.freezeKey()` and render-path review. |
| Replay mode × video export | Single and stitched exports use the same presentation choice as the live board. Static must not double-draw ink. | Shared filter and renderer helpers; automated mode/filter and framing checks. Full encode quality is not benchmarked here. |
| Ghost/Hidden Preview × export | The preview toggle must not be forced on only in exported videos. | Both export paths now carry the live replay engine's preview choice. |
| Replay restart × track switch × pending seek | Old media events must not overwrite a newer load/seek; ending then replaying starts from zero. | Existing generation guards retained; targeted end/restart/switch test passes. |
| Camera center × pause/background | Long idle time must not produce a full-strength easing step on resume. | Clock reset and 50 ms delta cap; targeted delayed-frame test passes. |
| Scratch gesture × device sample rate | Classifier must not accept/reject only because a device reports more move events; malformed/non-finite coordinates must be ignored. | Fixed-spacing classifier and regression test for coarse/dense paths. |
| Split panes × focus loss/undo | A lost window focus must not strand a pointer capture; undo must remain routed to the pane owning the pointer. | Blur handler per Interaction plus prior dual-store/undo tests. |
| One recording × session controls | Display-mode settings must remain reachable even when there is only one recording. | Session button is available for any non-empty track list. |

## Security, robustness and deferred findings

- `npm audit --omit=dev` on the v4.8.21 dependency set reported 0 production advisories. The full audit reported 10 moderate issues in development/build-only transitive dependencies (Mammoth's `argparse` chain and Electron Builder's `global-agent`/`roarr` chain). Automated remediation would roll back Mammoth to 0.3.29; it was not applied without compatibility evidence. Re-run dependency audit for the v5.0.0 package before any future release.
- Electron has `contextIsolation: true`, `nodeIntegration: false`, sender-frame checks on IPC and navigation/external-URL guards. `sandbox: false` remains because the preload currently imports Node `crypto`; a sandbox migration needs a dedicated compatibility change.
- The Markdown renderer does not insert arbitrary raw HTML. It generates fixed XHTML, escapes text and attributes, and limits normal external-link protocols. Continue to treat all loaded board data as untrusted. IPC sender checks do not make renderer XSS harmless.
- The earlier `EPERM` temporary smoke-profile startup report is not present in the checked source path: each smoke launch receives a unique temporary user-data directory, cleanup is best-effort/caught, and the main-process portable write-probe cleanup is inside a guarded `try/catch`. The custom Electron smoke launches pass on this tree; they do not delete a shared profile.
- File read/write IPC still accepts filesystem paths from the trusted top-level renderer; capability-token/root-scoped access is a future defense-in-depth improvement before remote content or plugins are introduced.
- The replay index avoids full-board selection work every frame, but `drawReplaySession()` must still paint the selected track's already-visible strokes. No representative large-board or long-session frame-time benchmark was run; a progressive completed-stroke cache is a future optimization, with seek/backward invalidation as its main complexity.
- Large Note Overview thumbnail sets may retain substantial decoded image memory. Defer thumbnail virtualization/LRU until measured on representative boards.
- No native or new npm dependency was introduced. The full base-feature smoke suite was intentionally not run because the user scoped final smoke verification to features added after v4.8.1.

## Verification

The release dossier records the final test totals, locale parity, build result and artifact hash. The required custom scope is `npm run smoke:custom`; it covers the user-added feature suites and does not invoke the base-only smoke run. `node scripts/i18n-check.js` checks the translations for the new replay labels across all seven supported locales.
