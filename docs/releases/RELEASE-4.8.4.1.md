# GazBoard Release Dossier — V 4.8.4.1

- **Release label**: `V 4.8.4.1`
- **SemVer package version**: `4.8.4`; the app's release label and Windows artifact names identify the follow-up as `4.8.4.1` because npm/Electron do not accept four numeric version components.
- **Base commit**: `e6a2caf31947d8f62a31b9585437adc3fdf725ce` (v4.8.4)
- **Purpose**: Follow-up audit fixes for the 4.8.4 increment. Later v4.8.5–v4.8.7 feature commits are not included in this build.
- **Windows artifacts**: `GazBoard-4.8.4.1-portable.exe` and `GazBoard-4.8.4.1-Setup.exe`

## Audit attribution

- Initial audit: **Codex 4.6 Medium in Cursor**, as reported by the project owner.
- Secondary audit and fixes: **GPT-6 Luna High using Codex**, as reported by the project owner.

## Changes included

- Crop preview now restores the original crop when dismissed; Apply and Reset create one valid undo entry.
- Crop source rectangles are clamped to image bounds before drawing.
- Video export uses an ephemeral `Surface`, a private replay clock, bounded audio-load waits, and cleanup for media streams, audio sources, and the surface.
- Export duration no longer invents a five-second fallback when neither track metadata nor finite audio metadata provides a duration.

## Audit scope and remaining findings

The audit identified additional issues outside the fixes included in this follow-up. The full 12-item status ledger is in [`AUDIT-4.8.4-FINDINGS.md`](AUDIT-4.8.4-FINDINGS.md). Imported audio still needs a transactional `Store.commit` operation and collision-resistant IDs in `src/js/insert.js`; annotation cancellation/clipping and hover-only context-bar actions also require separate fixes. The original 4.8.4 release dossier overstated template-gallery filtering and Rotate 90° support; those descriptions are corrected in `RELEASE-4.8.4.md`.

## Later release comparison (not merged into V 4.8.4.1)

| Release | Commit | Changes documented for that increment |
|---|---|---|
| v4.8.5 | `fa6b58f` | Connector arrowhead/line geometry; user-defined templates; selectable raw, Chaikin, and Catmull–Rom inking; zoom presets and fit controls. |
| v4.8.6 | `ffe7a4a` | Highlighter opacity/color contrast; audio skip intervals and session menu; PDF background import; page-margin dialog. |
| v4.8.7 | `7549a64`, `84817ac` | Mouse-wheel scroll/zoom modes; arrow-key navigation; plus-menu hot-pinning and ribbon customization; persistent hover actions and non-overlapping context menus; hardening updates. |

These changes are recorded for future auditing; this package is based on v4.8.4 and does not contain those later commits.

## Verification

- `node scripts/smoke.js`: 1,240 passed, 0 failed (final run with package version `4.8.4`).
- `node scripts/i18n-check.js`: 1,295/1,295 strings across seven locales in the v4.8.4 source tree.
- `npm run dist:win`: build both Windows installer and portable executable.
- `npm run smoke:features:4.8.4.1`: 9 focused feature checks, 9 passed, 0 failed. This command is separate from the full regression suite.
