# GazBoard v5.1.0 — Split Workspace, Markdown Links and Excerpts

## Release summary

This release connects the existing two-board split workspace with practical clipboard and excerpt workflows, strengthens board navigation with heading/block anchors, and adds commonly used Obsidian Markdown conveniences. A visual excerpt is a transparent PNG snapshot carrying a backlink to the originating board, pad page and selected region.

## What changed

### Split workspace and excerpts

- Selection context menus now offer **Copy excerpt**. The screenshot is rendered from the selected objects with a small margin, bounded to 4096 pixels per side and approximately 12 megapixels, and copied to the in-app clipboard plus the system image clipboard.
- Paste the excerpt into another board, or drag its custom payload onto a board. In split mode, paste routes to the left pane when the pointer is over that pane; excerpt drops are accepted by either pane.
- Excerpt images retain `excerptSource` metadata: source board ID/name, page and bounds. Ctrl-click or **Open source excerpt** returns to that location. Board-copy ID remapping updates the backlink.
- Payloads have a version marker and are checked for PNG data URL shape, maximum payload length, finite geometry and valid source metadata before insertion. This does not alter the existing independent Store/Surface model of the two split panes.

### Markdown and linking

- Wikilinks and native board references preserve numeric pad-page anchors and now support heading anchors, local `[[#Heading]]` links, and Obsidian block targets such as `[[#^block-id]]`.
- Heading/block targets resolve on the current board or after opening another board; aliases remain intact when converting between Obsidian and native reference syntax.
- Added rendered Obsidian conveniences: `==highlight==`, `~subscript~`, `^superscript^`, footnote references/definitions, `%%hidden comments%%`, tilde code fences and hidden block-ID markers. Existing GFM tables/task lists, callouts, math, YAML metadata, aliases, tags, wikilinks and four Markdown card styles remain supported.
- Markdown source remains editable. Comments are hidden only in rendered output; raw HTML remains escaped and is not enabled.

## Design and edge-case notes

- Screenshot dimensions are bounded before serialization to avoid unbounded canvas allocations. The image uses PNG transparency and its visible picture is independent of its source metadata.
- Clipboard image bytes are interoperable with other applications; the return link is preserved for GazBoard's in-app paste/drag payload. Ordinary clipboard PNG data from external applications is not assigned an excerpt backlink.
- A source board that has been deleted or is unavailable cannot be opened; the image itself remains usable. If the source board ID is remapped during bundle copy, the excerpt backlink follows the remapping.
- Heading navigation searches Markdown heading text after stripping inline markup; block navigation searches the matching `^block-id` marker. This is a lightweight in-canvas locator, not a full Obsidian block parser or graph database.
- This release does not add arbitrary raw HTML, executable Markdown, plugin APIs or external network resolution. Existing renderer escaping and protocol allowlists remain in place.

## Product references

- Obsidian's official URI guidance demonstrates links to headings and block IDs, including the need to URI-encode anchors. This informed the explicit `h:` anchor representation and round-trip tests: [Obsidian URI — open a heading or block](https://help.obsidian.md/Extending%2BObsidian/Obsidian%2BURI).
- Obsidian documents desktop pop-out windows and moving files between windows. GazBoard keeps its existing simultaneous split-board workspace and applies the same quick-reference workflow locally, with independent board Stores: [Obsidian pop-out windows](https://help.obsidian.md/User%20interface/Pop-out%20windows).
- This is inspiration for selected workflows and Markdown syntax, not a claim of full Obsidian/plugin compatibility.

## Verification

- `npm run smoke:custom`: **88 checks passed, 0 failed**, including focused suites for custom features, Markdown, excerpts/links, replay, video framing, path security and Electron UI flows.
- `npm run smoke:features:5.1.0`: **5 Electron checks passed, 0 failed** — bounded selection capture, linked-image paste, source return navigation, split-pane paste and split-pane drop.
- `node --test test/markdown.test.mjs test/excerpt.test.mjs`: **19 tests passed, 0 failed**.
- `node scripts/i18n-check.js`: **1,493 keys in each of seven locales; zero missing or extra keys**.
- The base-only/full smoke suite was not run, per the owner's requested scope to smoke-test custom features added after v4.8.1.
- `git diff --check`: pending final release check.

## Build and release record

- Version: `5.1.0`.
- Commit and local tag: recorded after the final release commit; tag `v5.1.0` is local unless the owner separately requests a push.
- Windows artifact: portable x64 `.exe`; installer not requested.
- Build result: portable Windows x64 `.exe` built successfully with Electron 43.8.3; unsigned because no signing certificate is configured.
- Artifact size: **106,259,823 bytes**.
- SHA-256: `0DE968EC52B2042FBFE61AC93E1C79E7609433690CE76878EE18BCE72EBDCAFA`.
- Repository artifact: `dist-v5.1.0/GazBoard-v5.1.0-Portable.exe`.
- Archive path: `C:\Users\kazir\Documents\Codex\GazBoard\v5.1.0\` (copied after the local commit and tag).
- Remote publication: none.
