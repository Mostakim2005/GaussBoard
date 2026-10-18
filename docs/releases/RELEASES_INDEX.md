# GazBoard Progressive Releases & Binary Index

This document provides the definitive ledger of all progressive compiled Windows releases, from the base original (`4.8.1`) through the latest hardening release (`4.8.7`). Each release is paired with its standalone portable `.exe` binary and a dedicated, isolated release dossier explaining what was added, what was fixed, how it was implemented, which files were touched, and the exact rollback procedure.

---

## 1. Release Ledger & Binary Registry

| Version | Commit SHA | Portable Windows Executable | Binary Size | Release Dossier | Key Additions / Changes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v4.8.1** | `Base` | [`GazBoard-4.8.1-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.1-portable.exe) | 107,266,641 B | *Original Baseline* | Base application baseline before progressive replay & study extensions. |
| **v4.8.2** | `6f2f8d3` | [`GazBoard-4.8.2-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.2-portable.exe) | 107,242,268 B | [`RELEASE-4.8.2.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.2.md) | In-settings search, pen opacity, laser trail duration, audio session selector, video framing presets. |
| **v4.8.3** | `d8d4a20` | [`GazBoard-4.8.3-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.3-portable.exe) | 107,245,970 B | [`RELEASE-4.8.3.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.3.md) | Feedback R1 & R2, directional scribble false-positive rejection, gradient audio density HUD, Note Overview double-click jump. |
| **v4.8.4** | `e6a2caf` | [`GazBoard-4.8.4-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.4-portable.exe) | 107,251,200 B | [`RELEASE-4.8.4.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.4.md) | Gallery tag filtering, ribbon pinning, standalone audio import, non-destructive image crop/rotation, stitched video export. |
| **v4.8.5** | `fa6b58f` | [`GazBoard-4.8.5-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.5-portable.exe) | 107,256,816 B | [`RELEASE-4.8.5.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.5.md) | Connector arrowhead styles (open, stealth, diamond), custom template creator, Catmull-Rom Bézier smoothing, zoom popover. |
| **v4.8.6** | `ffe7a4a` | [`GazBoard-4.8.6-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.6-portable.exe) | 107,263,747 B | [`RELEASE-4.8.6.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.6.md) | Calibrated 50% highlighter opacity, configurable audio skip (5s–30s), recording 3-dot menu, PDF background mode, page margins dialog. |
| **v4.8.7** | `84817ac` | [`GazBoard-4.8.7-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.7-portable.exe) | 107,267,071 B | [`RELEASE-4.8.7.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.7.md) | Mouse wheel scroll/zoom dual-mode, 4-way arrow navigation, plus-menu hot-pinning, full ribbon tool mobility, persistent hover bar, side-by-side context menu. |

---

## 2. Regression Isolation & Rollback Guide for AI and Testers

If an issue is observed during testing, follow this progressive bisect checklist:

1. **Ink or Drawing Rendering Anomaly**:
   - Check if the issue occurs in `v4.8.5` (Bézier smoothing intro) or `v4.8.2` (Pen opacity intro).
   - If present in `v4.8.5` but not `v4.8.4`, inspect `src/js/core/ink.js`.
   - Rollback binary: [`GazBoard-4.8.4-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.4-portable.exe).

2. **Audio Timeline or Replay Synchronization Anomaly**:
   - Check if present in `v4.8.3` (Density HUD), `v4.8.4` (External import), or `v4.8.6` (Audio skip step).
   - Rollback binary: Test the preceding minor version binary directly from `dist/`.

3. **Toolbar, Ribbon, or Navigation Anomaly**:
   - Check `v4.8.7` (Mouse wheel / arrows / persistent hover bar / plus-menu pinning).
   - Rollback binary: [`GazBoard-4.8.6-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.6-portable.exe).

---

## 3. Storage Locations
- **Permanent Archive Executables**: `C:\Users\kazir\Documents\Antigravity\GazBoard\dist\`
- **Permanent Archive Documentation**: `C:\Users\kazir\Documents\Antigravity\GazBoard\docs\releases\`
- **Working Repository Source**: `C:\Users\kazir\Documents\OpenCode\GazBoard\`
