# GazBoard v4.8.21 — Security and Markdown Metadata Hardening

## Release summary

This patch audits the features added from v4.8.12 through v4.8.20 and hardens three exposed edges while making Obsidian-style metadata import handle the standard block-list form. It also adds Escape-to-cancel for bookmark renaming.

## Changes

- **Electron IPC sender checks:** every `ipcMain.handle` registration now passes through a guard that accepts only the primary `app://board` frame. The app blocks navigation away from its own app URL and denies new windows after optionally opening a validated HTTP(S) URL in the user's browser.
- **Release URL validation:** the `shell:openExternal` bridge accepts only the configured HTTPS GitHub releases route and its subpaths. URL parsing replaces the vulnerable string-prefix comparison.
- **Bookmark label safety:** names loaded from board files are assigned with `textContent`; saved board data can no longer inject markup into the timeline tooltip. Escape restores the saved name and closes the editor without committing.
- **Obsidian properties:** frontmatter `tags` and `aliases` now accept YAML block lists, quoted inline list values containing commas, and quoted values containing colons. This matches the format shown in [Obsidian's Properties guide](https://obsidian.md/help/properties).
- **Locale coverage:** filled missing translations across all seven locale dictionaries and removed obsolete keys; the required checker now targets the current extracted string set rather than stale historical totals.
- **No added runtime dependencies.**

## Audit notes

The v4.8.12–v4.8.20 feature record remains in [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](../MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md). Source review confirmed v4.8.20's math delimiter guard and pen-color preservation are present; the markdown XHTML renderer already self-closes generated void elements. The older audit's suggested regex-only XHTML sanitizer is not used because it would not validate arbitrary XML and would duplicate the renderer's existing behavior.

The Electron sandbox remains disabled because the current preload imports Node's `crypto` module; enabling sandboxing needs a separate preload compatibility migration. File read/write bridge operations still accept paths supplied by the trusted top-level renderer, so a future capability-token redesign is recommended before adding remote content or plugins. Sender validation is defense-in-depth against subframes and unintended web contents; it does not make a renderer XSS harmless.

`npm audit --omit=dev` reports **0 vulnerabilities** in production dependencies. The full dev-inclusive `npm audit` report is **10 moderate, 0 high, 0 critical**; the findings are in dev/build dependencies, through Mammoth's `argparse` CLI dependency and Electron Builder's `global-agent`/`roarr` build chain. npm's automated fixes require downgrading Mammoth to 0.3.29 and Electron Builder to 26.5.0; those rollbacks were not applied because they would replace the current document-import and packaging versions without compatibility evidence. Electron itself is updated to 43.8.3. Revisit these remaining advisories when compatible upstream fixes are available.

## Verification and artifact

### Verification

- `npm run smoke:custom`: all custom-feature checks passed — Node suites **23 + 10 + 3 + 2 passed**, Electron v4.8.4.1 checks **9/9**, and v4.8.8 checks **8/8**. The stale Study Tape smoke selector was updated to exercise the current desktop ribbon and phone Add menu.
- `npm run smoke:replay`: **13 passed, 0 failed** across audio actions, replay synchronization, and camera-follow behavior.
- `node --test test/security-hardening.test.mjs test/markdown.test.mjs`: **12 passed, 0 failed**.
- `node scripts/i18n-check.js`: **1,483/1,483 keys in each of seven locales**, no missing or extra entries.
- `scripts/i18n-extract.js` scan: **1,483 strings, 0 unresolved/dynamic translation calls**.
- An initial base-inclusive smoke run, started before the user narrowed verification to post-v4.8.1 features, reported **1,228 passed and 12 failed**. Failures covered canvas typing/math export, updater placement, phone canvas controls, theme pen colors, and class timer UI assertions; the static translation scan also found three dynamic calls, which were corrected and rechecked separately. These failures were not compared with a clean v4.8.20 baseline, so they are not attributed to this audit.
- After the user narrowed scope, the follow-up full smoke run was stopped. Final verification was limited to this audit's security, Markdown metadata, and localization changes.
- Portable Windows executable: `dist/GazBoard-v4.8.21-Portable.exe`, x64, Electron 43.8.3, unsigned because no code-signing certificate is configured; **106,252,560 bytes**, SHA-256 `C9639CBFD4BEA795C13093DC921C1ABBE7484A173B2D19032A0965E0C39CA98C`.
- Version tag: `v4.8.21`, local only. Nothing is pushed.
