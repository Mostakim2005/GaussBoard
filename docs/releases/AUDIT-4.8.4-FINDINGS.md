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
