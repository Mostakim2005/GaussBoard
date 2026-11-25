# Third-Party Notices — GaussBoard

## Upstream Heritage & Divergence Notice

GaussBoard originated as an open-source fork of [GazBoard](https://github.com/fahim9778/GazBoard) by MD. Fakhruddin Gazzali ([theBoringCodes](https://github.com/theBoringCodes)), used and redistributed under the terms of the MIT license. The original copyright notice is preserved in [`LICENSE`](LICENSE).

### Architectural Divergence & Upstream Separation
GazBoard was created as a clean, minimalist, offline digital whiteboard reconstructing the classic Microsoft Whiteboard 21.x experience with document annotation. 

In contrast, GaussBoard (maintained by Kazi S. Mostakim) has diverged substantially into a specialized, heavy-duty Electrical Engineering & STEM workstation—introducing extensive custom features (real-time MNA circuit simulation, synchronized audio-ink replay, symbolic CAS, 2D/3D calculus graphing, active-recall study tape, and Obsidian knowledge graph interoperability). Because this direction represents a profound divergence from the original minimalist philosophy, both the upstream creator and the GaussBoard maintainer agreed that GaussBoard is best maintained as an independent entity.

**Looking for a standard or minimalist whiteboard?**
For everyday whiteboard needs, lightweight handwriting, and a distraction-free canvas without complex engineering subsystems, users are strongly encouraged to check out the official upstream project:
👉 [**GazBoard by theBoringCodes (MD. Fakhruddin Gazzali)**](https://github.com/fahim9778/GazBoard)

---

## Bundled Third-Party Components & Libraries

All libraries below are bundled offline so the app works with no network connection. This table is
split into what actually ships inside the installed app and what is only used on a build machine.

---

## Ships inside the core app (`src/vendor/`)

Core runtime JavaScript and WASM bundled directly in `src/vendor/` so GaussBoard launches offline with zero network connection.

| Library | Version | Licence | Upstream licence text | What it does |
| :--- | :--- | :--- | :--- | :--- |
| KaTeX | 0.16.21 | MIT | <https://github.com/KaTeX/KaTeX/blob/main/LICENSE> | Math typesetting for formulas and equations. |
| PDF.js (Core + Worker) | 4.10.38 | Apache-2.0 | <https://github.com/mozilla/pdf.js/blob/master/LICENSE> | Core PDF parsing and page canvas rendering (`pdf.min.mjs`). |
| JSZip | 3.10.1 | MIT *or* GPLv3 | <https://github.com/Stuk/jszip/blob/main/LICENSE.markdown> | ZIP containers for `.gaussboard` / `.gazboard` single-file boards. See dual-licence note. |
| Mammoth.js | 1.8.0 | BSD-2-Clause | <https://github.com/mwilliamson/mammoth.js/blob/master/LICENSE> | Converts imported `.docx` documents to HTML. |
| mp4-muxer | 5.2.2 | MIT | <https://github.com/Vanilagy/mp4-muxer/blob/main/LICENSE> | Pure-JavaScript MP4 container writing for video export. |
| electron-updater | 6.8.10 | MIT | <https://github.com/electron-userland/electron-builder/blob/master/LICENSE> | In-app update checks and downloads (Desktop). |

---

## Optional libraries via `%LOCALAPPDATA%\SharedLibraries` / On-Demand Cache

To keep the core bundle and PWA precache lean without duplicating engines across apps, these optional libraries resolve automatically from `%LOCALAPPDATA%\SharedLibraries` on Windows desktop (or download once on user confirmation into `SharedLibraries` / browser `CacheStorage` via HTTPS allowlist).

| Library | Version | Licence | Upstream licence text | What it does |
| :--- | :--- | :--- | :--- | :--- |
| Mermaid | 10.9.1 | MIT | <https://github.com/mermaid-js/mermaid/blob/develop/LICENSE> | Flowcharts, sequence and state diagrams, mind maps. |
| Chart.js | 4.4.7 | MIT | <https://github.com/chartjs/Chart.js/blob/master/LICENSE.md> | Canvas charts (radar, bar, line, doughnut, scatter). |
| pdf-lib | 1.17.1 | MIT | <https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md> | Editing and compressing existing PDFs (`compression.js`). |
| @pdf-lib/fontkit | 1.1.1 | Apache-2.0 | <https://github.com/Hopding/fontkit/blob/master/LICENSE.txt> | Custom font embedding in PDFs. |
| Rough.js | 4.6.6 | MIT | <https://github.com/rough-stuff/rough/blob/master/LICENSE> | Deterministic sketchy hand-drawn shape generator (with pure-JS fallback when absent). |
| 3Dmol.js | 2.0.4 | BSD-2-Clause | <https://github.com/3dmol/3Dmol.js/blob/master/LICENSE> | WebGL 3D molecular viewer for PDB and SDF files. |
| Nerdamer | 1.1.13 | MIT | <https://github.com/jiggzson/nerdamer/blob/master/LICENSE> | Symbolic algebra: differentiation, factoring, solving, matrices. |
| function-plot | 1.24.0 | MIT | <https://github.com/mauriciopoppe/function-plot/blob/master/LICENSE> | 2D function graphing with derivatives and integrals. |
| Math.js | 12.4.1 | Apache-2.0 | <https://github.com/josdejong/mathjs/blob/develop/LICENSE> | Arbitrary-precision arithmetic, complex numbers, matrices, units. |
| Tesseract.js | 5.1.1 | Apache-2.0 | <https://github.com/naptha/tesseract.js/blob/master/LICENSE> | Optional offline OCR WASM engine (offloaded to SharedLibraries). |

### Fonts

Bundled font files in `fonts/` and `src/assets/fonts/` are distributed under the SIL Open Font
Licence 1.1 (OFL-1.1) or Apache-2.0 as stated by their upstream projects. The Noto Sans CJK family
used for Chinese, Japanese and Korean text is licensed under OFL-1.1:
<https://github.com/notofonts/noto-cjk/blob/main/LICENSE>.

---

## Build / test only — not shipped

Development tooling. None of this is included in the packaged application.

| Tool | Version | Licence | Upstream licence text | What it does |
| :--- | :--- | :--- | :--- | :--- |
| Electron | 43.4.1 | MIT | <https://github.com/electron/electron/blob/main/LICENSE> | Desktop runtime. The packaged app embeds Electron; see note below. |
| electron-builder | 26.15.3 | MIT | <https://github.com/electron-userland/electron-builder/blob/master/LICENSE> | Produces the portable `.exe` and installer `.exe`. |
| pdfjs-dist | 4.10.38 | Apache-2.0 | <https://github.com/mozilla/pdf.js/blob/master/LICENSE> | Source of the bundled PDF.js build. |
| JSZip | 3.10.1 | MIT *or* GPLv3 | <https://github.com/Stuk/jszip/blob/main/LICENSE.markdown> | Source of the bundled JSZip build. |
| Mammoth | 1.8.0 | BSD-2-Clause | <https://github.com/mwilliamson/mammoth.js/blob/master/LICENSE> | Source of the bundled Mammoth build. |

---

## Notes that need attention

**Electron is a runtime, not just a build tool.** The packaged application embeds Electron and
Chromium binaries. Electron is MIT, but Chromium and its bundled components carry their own notices,
which the packaged app's `LICENSES.chromium.html` covers. That file is generated by the build and is
not tracked in this repository.

**JSZip is dual-licensed MIT or GPLv3.** GaussBoard is distributed under MIT, so it is used here
under the MIT option. Anyone redistributing this code under GPLv3 terms should re-check that choice.

**Tesseract.js is offloaded to SharedLibraries.** The heavy WASM/traineddata payloads (`~9.9 MB`) were moved out of `src/vendor/` into `%LOCALAPPDATA%\SharedLibraries` (`tesseract`), keeping the core app bundle lean while still surfacing status and download options in Library Inspector (`src/js/ui/library-inspector.js`).

**Upstream heritage.** GaussBoard is not affiliated with Microsoft, StarNote, Flexcil, LiquidText or
OneNote. Those names appear only to describe design inspiration.
