# Release Dossier — GazBoard v6.9.2

> **Release Version**: `v6.9.2`  
> **Date**: October 25, 2026  
> **Git Commit Target**: `fix(hardening): complete P0 and P1 senior hardening audit (v6.9.2)`  
> **Binary Deliverable**: [`releases/GazBoard-v6.9.2-Portable.exe`](../../releases/GazBoard-v6.9.2-Portable.exe) (`113,146,990 bytes` / `107.90 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Audit Record**: [`../hardening/AUDIT_LOG.md`](../hardening/AUDIT_LOG.md) (one line per finding, appended as it was fixed)  
> **Invariant Compliance**: 6 Golden Invariants preserved; 100% i18n parity across 7 locales with **2,245** keys; 0 native C++ dependencies.

---

## 1. Executive Summary

Release **`v6.9.2`** is the first two-tier (P0 + P1) hardening audit executed against the live source rather than against the dossiers' own status claims. Every finding was fixed (or explicitly left open with a reason) **as it was found**, so [`hardening/AUDIT_LOG.md`](../hardening/AUDIT_LOG.md) doubles as an interruption-safe progress record.

| Tier | Findings logged | Fixed | Open |
| :--- | ---: | ---: | ---: |
| **P0 — Mission-Critical Foundations** | 35 | 33 | 2 (1 in scope, 1 out-of-scope verification note) |
| **P1 — Computational Engines & Media** | 39 | 35 | 4 |
| **Total (this audit)** | **74** | **68** | **6** |

No document schema changed: saved `.gazboard` files, audio tracks, stroke points/timestamps, covers and settings remain compatible. The only key-space change is seven new UI translations (2,238 → 2,245).

---

## 2. P0 — Mission-Critical Foundations

Audited subsystems: dual split study workspace, audio-ink timestamps, dynamic replay scene partitioning, scratch-out eraser, study tape/answer covers.

### 2.1 Behaviour that was actually broken and is now fixed

- **Split workspace**
  - Left-board autosave captured the board id after an `await`, so switching boards mid-save could write the old document over the newly selected board. Saves are now snapshotted and chained.
  - The 600 ms debounced save was not flushed on board switch; closing a split with an unsaved fresh reference board discarded its work.
  - Text typed in the reference pane went through the primary `TextEditor`: positioned with the main camera and committed to the main store (silent loss). The pane now owns its editor, offset-corrected for the pane.
  - Undo/redo followed the resting pointer, not the last-pressed pane; the split "focus lease" (`activePane`) now exists and drives Ctrl+Z/Ctrl+Y.
  - The wikilink action **Open in Split View** called a method that never existed; implemented, with a guard against opening the same board in both panes.
  - `asset:` pictures in the reference pane were never resolved (two paths); `#editLayer`/`#ctxbar` and reparented-node restore order were corrected.
- **Audio-ink timing**
  - Partial erasing rebuilt points as `{x,y,p}`, stripping `p.t` (Invariant #2) and giving fragments the original stroke's whole time span. Fragments now preserve/interpolate timestamps and their own `t0`/`t1`.
  - Coalesced pointer samples in one frame shared one clock reading; each is now back-dated, with a monotonic clamp for scrub-during-stroke.
  - Failed or double-clicked recording starts leaked the microphone stream, meter, AudioContext and temp file; `stop()` could hang if `MediaRecorder` errored or the hard-coded codec was unsupported.
- **Replay engine**
  - The overlay allocated a ghost copy of every future stroke every frame and linearly scanned the active stroke each frame; both are now bounded (reused copies, binary-search reveal edge).
  - Skip-silence walked the whole board every frame; throttled to four checks per second.
  - Animated session ink was painted over **concealed answer covers**, revealing deliberately blinded content. Concealed covers are now redrawn above the replay pass.
- **Scratch eraser** — a scribble over a concealed cover deleted the invisible answer ink beneath it; fully covered objects are now spared. The dossier's atomic-undo and NaN/jitter concerns were verified already handled.
- **Study tape / covers**
  - The study runner mutated `object.revealed` directly: the frozen-scene key never moved (the reveal could be blitted back as the old picture) and on-card content (`hidden`) was not synchronised. Review visibility now goes through `setReviewState()` + `refreshCanvas()`.
  - Freehand tape could never claim ink written on it (`coverFor` read `c.x/c.w`, which tapes do not have); the footprint now comes from `boundsOf()`.
  - Tape drawn while recording was stamped with `audioId` and replayed as ink; masks are now excluded from the audio-ink clock.

### 2.2 Open P0 item

- **Pane-aware keyboard commands**: Delete/Copy/Select-all/z-order still execute against the primary board. Mitigated by clearing the inactive pane's selection on pointer-down, so a focused reference pane cannot delete main-board objects. Full routing needs a pane-aware command dispatcher (deferred).

---

## 3. P1 — Computational Engines & Media

Audited subsystems: MNA circuit simulator & semiconductors, video export/MP4, Markdown/KaTeX, calculus grapher, multi-tab sessions, orthogonal routing.

### 3.1 Behaviour that was actually broken and is now fixed

- **Circuit simulator (flagship preset was non-functional)**
  - The **DOL starter could never latch**: contactor state was recomputed from half-propagated potentials, so the coil dropped and opened the aux contact carrying its own supply. Armature state is now decided from completed potentials and applied on the next step (one real contactor delay). Start latches, Stop drops, overload trips drop the latch.
  - The **Forward-Reverse preset had no wiring at all** for KM2/SB3. Reverse coil/self-hold/neutral, cross-interlock in both coil paths, and phase-swapped reverse mains were added and verified.
  - The "diode clamp" from the previous pass capped every series diode at ~0.73 V and crept up 52 mV per step (bridge rectifier read millivolts instead of 23 V). Propagation has no exponential to limit; the drop is direct again.
  - Driver outputs (op-amp, 555, logic gates) replaced their node object after wires had copied the old one, so downstream LEDs were frozen at their first value. Nodes are now mutated in place; op-amp saturation, 555 blink and all four full-adder combinations drive their LEDs correctly.
  - Also fixed: 12-pass propagation ceiling on long circuits, DMM continuity reporting a short on dead terminals, unthrottled contactor/breaker audio, per-frame HUD DOM churn and backplate repaint, invisible BOM/Ladder stamp (no geometry), stale `hoveredPort` on press/release, `clear()`/`step()` state and input sanitising.
- **Video export**
  - The MP4/WebCodecs path muxes **video only**, but MP4 was the default picker value: the default export was silent. WebM (audio) is now the default and MP4 shows a translated no-sound notice. Missing `assetId` now fails immediately with the recording name; a throwing progress callback can no longer hang the frame pump; filename length is capped.
- **Markdown / KaTeX**
  - Unbounded link/wikilink quantifiers were quadratic: 100 KB of `[` blocked the main thread for ~24 s (now ~1 ms) — the dossier's catastrophic-backtracking class.
  - Blockquote/callout recursion overflowed the stack at ~20k levels; block nesting is capped at 24.
  - Object colour/font/alignment were interpolated into the card stylesheet unvalidated (CSS injection); values are whitelisted.
  - Markdown `$...$` never requested the offline KaTeX bundle and the SVG cache did not account for its arrival; math now typesets on cards shortly after first render.
- **Function grapher**
  - `compileExpression` flattened every non-finite value to 0, drawing `sqrt(x)` as a line across its undefined domain and hiding poles. NaN/±Infinity are preserved and correctly break curves/integrals/markers.
  - Wheel zoom was unbounded; repeated zoom-out drove the view span to Infinity and the integer grid loop never terminated (app freeze). Span is clamped and the grid uses a pixel-sized 1/2/5×10ⁿ step (≤400 lines per axis).
  - Integrals across a pole now report **O.L**, poles no longer produce fake roots, and undefined polar radii leave a gap instead of a spoke to the origin.
- **Multi-tab bar**
  - The cache read `store._undoStack`/`_redoStack` (non-existent), silently discarding undo history on every tab switch.
  - Cached-tab restore assigned `store.doc` directly (no revision bump, no normalisation, stale app title/last-board/Recent); it now goes through `app.loadBoard()` and then restores that tab's history.
  - Duplicate tab copied only `doc.objects` (no `order`, and disk payloads store an array), producing an empty board. It now copies the whole board.
  - Rapid tab clicks could cache the previous board under the new tab's id; switches are serialised.
  - Session Save/Restore used `window.prompt`, which Electron does not implement, so both menu actions did nothing; they now use the app's own dialog. Corrupted localStorage sessions are normalised.
- **Orthogonal routing** — a fully degenerate path (both ends on the same point) drew an arbitrary arrowhead; heads now require a usable final segment. Two stale test expectations (3 routes, first `<select>` as quality) were aligned with the shipped features.

### 3.2 Open P1 items

1. **Video memory** — both export paths keep the whole encoded video in RAM; streaming to disk needs append/seek-capable IPC across desktop/Android/web, a pipeline change.
2. **MP4 audio** — MP4 remains video-only; adding an AAC/Opus audio track is a codec-work item. The default was switched to WebM and MP4 now warns instead of silently dropping sound.
3. **Obstacle-aware orthogonal routing** — `routeOrthogonal()` accepts obstacle boxes but does not use them; real avoidance needs grid/A* routing (new functionality).
4. **Connector pane context** — connector end resolution uses one module-global store, so connectors on the split reference pane fall back to free ends (no corruption). Fixing needs a store context threaded through render/hit/bounds.

---

## 4. User-Visible Behaviour Changes

- Default video format is now **WebM**, which includes the recording audio; choosing **MP4** shows a translated notice that MP4 is exported without sound.
- The DOL starter and Forward-Reverse presets now actually operate (previously they could not); op-amp/555/full-adder presets drive their indicator LEDs.
- Reference-pane text editing works and stays on the reference board; Ctrl+Z/Ctrl+Y follow the pane last pressed.
- Replay no longer reveals ink under a concealed answer cover during animated replay (deliberate state conflict fix; see limitations).
- Markdown cards containing `$...$` typeset shortly after opening even if the board has no maths box; `sqrt(x)`/`1/x` graphs show domain gaps/asymptotes instead of fabricated zeros; zooming out cannot freeze the grapher.
- Tab undo history survives switching; Duplicate tab produces a real copy; session dialogs open.
- Seven new translation keys (2,238 → 2,245).

---

## 5. Verification Audit

| Requirement | Command | Result |
| :--- | :--- | :--- |
| P1 dedicated unit suite | `node --test test/p1-hardening.test.mjs` | **5 / 5 passed** |
| Custom/new features smoke | `node scripts/smoke.js --new-features` | **24 passed, 0 failed** |
| 4.8.8 feature checks | `node scripts/smoke.js --features-4.8.8` | **8 passed, 0 failed** |
| i18n parity | `node scripts/i18n-check.js` | **2,245 / 2,245** in all 7 locales |
| Markdown engine | `node --test test/markdown.test.mjs` | **15 / 15 passed** |
| Custom features | `node --test test/custom-features.test.mjs` | **30 / 30 passed** |
| Replay + audio + video + custom | `node --test test/markdown.test.mjs test/audio-bar.test.mjs test/replay-reading.test.mjs test/custom-features.test.mjs test/video-framing.test.mjs` | **64 / 65**; the only failure is the pre-existing DOM-dependent video-framing test |
| Base regression suite | `node scripts/smoke.js` | **1,247 passed, 1 failed** — pre-existing dynamic `t(item.message)` translation scan in `technical-linter.js` |
| Circuit presets (direct) | Node harness against `circuit-sim.js` | DOL start/stop/overload, forward↔reverse interlock, 555 blink, op-amp LED, all 4 adder combinations, rectifier ≈229 V |

---

## 6. Deliverable Matrix

| Deliverable | Path | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Source release** | repository `feat/cumulative-fixes` at tag `v6.9.2` | Source | Hardened application source |
| **Hardening audit record** | `docs/hardening/AUDIT_LOG.md` | Documentation | 74 findings, fix status, verification, manual tests |
| **Release dossier** | `docs/releases/RELEASE-6.9.2.md` | Documentation | This record |
| **Portable executable** | [`releases/GazBoard-v6.9.2-Portable.exe`](../../releases/GazBoard-v6.9.2-Portable.exe) | Binary | Standalone zero-install portable Windows executable (`113,146,990 bytes`) for week-long validation |

---

## 7. Manual Test Guidance

The full checklist is at the end of [`hardening/AUDIT_LOG.md`](../hardening/AUDIT_LOG.md). Highest-value checks:

1. Split view: left-pane drawing/typing survives close/reopen; Undo targets the pane last pressed; Right-board selection cannot be deleted from the left pane.
2. Recording: deny/allow microphone; stop after typing on a reference board; open a long recording (memory) and replay a partially erased stroke.
3. Study session: reveal → rate → exit; covers conceal again and on-card ink is visible; concealed ink survives a scratch-out; replay does not reveal covered ink.
4. Circuits: DOL start/stop/overload; forward↔reverse interlock; every analog/digital preset's indicator.
5. Video: default WebM keeps sound; MP4 shows the no-sound notice; cancel mid-export; long export memory remains a known limit.
6. Markdown: a note of 100k `[` stays responsive; math typesets without a maths box; currency text stays text.
7. Grapher: `tan(x)`, `1/x`, `sqrt(x)`, maximum zoom-out, pole integral → O.L.
8. Tabs: undo after switching, Duplicate tab content, session save/restore dialogs, rapid tab clicking.
9. Connectors: self-connector has no arbitrary head; split-pane connector limitation is documented.

---

## 8. Attribution & Scope Notes

- This audit was executed on 2026-10-25 in the DeepSeek Harness agent session, against the live source; the P0/P1 dossiers were treated as input suggestions, not proof of correctness.
- Scope was limited to the P0 and P1 feature lists. One out-of-scope verification note (pre-existing test drift) is recorded in the audit log.
- Historical records remain historical: where an older release, dossier §8 completion log, or bug-log entry conflicts with current behaviour, this dossier, [`hardening/AUDIT_LOG.md`](../hardening/AUDIT_LOG.md), and the source/tests are authoritative.
