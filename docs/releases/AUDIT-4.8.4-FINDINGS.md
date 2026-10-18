# v4.8.4 Audit Findings and Follow-up Status

This record accompanies **V 4.8.4.1**, built from commit `e6a2caf`.

## Audit attribution

- Initial audit: **Codex 4.6 Medium in Cursor**, as reported by the project owner.
- Secondary audit and fixes: **GPT-6 Luna High using Codex**, as reported by the project owner.

## Finding ledger

| # | Finding | V 4.8.4.1 status |
|---|---|---|
| 1 | Crop Apply/Reset generated malformed undo entries. | Fixed with snapshot transactions. |
| 2 | Crop preview mutations survived dismissal and made Apply undo ineffective. | Fixed by restoring the starting snapshot on dismiss. |
| 3 | Each export kept a normal `Surface`, frame loop, observers, and resize listener alive. | Fixed with an ephemeral surface and disposal. |
| 4 | Export changed the live replay engine and invalidated the on-screen freeze cache. | Fixed with an exporter-owned replay clock. |
| 5 | Audio readiness waits could hang; unavailable duration used a fabricated fallback. | Export path now times out and requires a finite duration. The audio importer remains unchanged. |
| 6 | Imported audio bypassed undoable Store operations and IDs could collide. | Not fixed in this release; requires `src/js/insert.js`. |
| 7 | The 4.8.4 pin toggle rebuilt the ribbon and detached the popover anchor. | Not fixed in this release. The later v4.8.7 increment documents the in-place fix. |
| 8 | Annotation mode lacked Escape/tool-change cancellation and did not clip ink to the image. | Not fixed in this release. |
| 9 | Hover-only quick actions could show commands without a selected object. | Not fixed in this release. |
| 10 | The 4.8.4 dossier claimed a Rotate 90° crop action that was not present. | Documentation corrected; no rotate action added. |
| 11 | Crop source rectangles were not clamped before `drawImage()`. | Fixed by clamping the source rectangle to image bounds. |
| 12 | Closing My boards reopened the first audio track instead of the previously active track. | Not fixed in this release. |

The release dossier records this partial follow-up explicitly. The v4.8.5–v4.8.7 feature changes are comparison material only and are not merged into this 4.8.4-based build.

## Later v4.8.8 follow-up status

The rows above remain the historical status for **V 4.8.4.1**. The consolidated v4.8.8 release includes later work, but should not be read as silently changing the old build:

| Finding | Later status recorded for v4.8.8 | Evidence / limit |
|---|---|---|
| Crop undo, dismissal, and source bounds (#1, #2, #11) | Retained as fixes | Included in the 4.8.4.1 follow-up and its focused smoke group. |
| Video export lifecycle/clock/resource cleanup (#3–#5) | Retained and hardened | See `RELEASE-4.8.8.md`; real Windows MediaRecorder output is not covered by fake-media checks. |
| Imported audio duration and temporary media URL cleanup (#6 related) | Partially addressed | v4.8.8 resolves media duration from metadata when possible, leaves unknown duration unknown, and revokes temporary URLs. Transactional Store commit and collision-resistant IDs are not stated as resolved in the release evidence; review those separately before changing this status. |
| Ribbon pin popover stability (#7) | Later in-place pinning is documented | v4.8.7/4.8.8 support pin changes without destroying the anchored popover. |
| Annotation Escape/tool-change cancellation and image clipping (#8) | Not recorded as fixed | The 4.8.8 release/evolution record does not claim these behaviors; verify before representing them as resolved. |
| Hover-only quick actions without selection (#9) | Not conclusively re-audited | Later hover persistence and menu positioning are documented, but this specific selection-state condition needs a focused check. |
| Rotate 90° crop action (#10) | Still not implemented | The original claim was corrected; no rotate action is listed in v4.8.8. |
| Active audio track restoration after closing My boards (#12) | Not conclusively re-audited | No v4.8.8 release evidence claims this specific behavior; verify separately. |

The source-checked cumulative record is [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md). The initial audit was performed with **Codex 4.6 Medium in Cursor**; the secondary audit and fixes were applied with **GPT-6 Luna High using Codex**, as reported by the project owner.
