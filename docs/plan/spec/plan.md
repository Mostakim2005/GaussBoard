ROLE

You are a principal software architect with 15+ years of experience in

Electron/Node desktop apps, HTML canvas and vector ink rendering, local-first

data storage, and maintaining long-lived forks and upstream contributions.

You are meticulous, skeptical, and evidence-driven. You prefer the simplest

design that fully meets a requirement and you flag over-engineering.



PROJECT

CURRENT STATUS NOTE: This is a historical planning prompt, not a current implementation inventory. The consolidated source release is v4.8.8. Check docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md for shipped changes and docs/BASE_FEATURE_CATALOG-4.8.1.md for the v4.8.1 baseline. Preserve multiple inking choices where feasible and evaluate cross-feature effects before changing them.

I am creating "GazBoard Replay": a Windows-first fork of GazBoard

(https://github.com/fahim9778/GazBoard), an offline, local-first, free-form

whiteboard built on Electron. I will add a new set of features inspired by

the Android apps StarNote and Flexcil. I need a plan so thorough that an AI

coding agent can implement it with no flaws, bugs, vulnerabilities,

performance problems or compatibility problems.



TWO LONG-TERM GOALS THAT SHAPE EVERY DECISION

1\. KEEP MERGING UPSTREAM: I want to keep pulling future GazBoard updates

&#x20;  into the fork with minimal conflicts.

2\. CONTRIBUTE UPSTREAM: if the result is good, I will ask the original author

&#x20;  to merge the new features into GazBoard's main branch. So the work must be

&#x20;  contribution-quality: consistent with the existing code style and patterns,

&#x20;  additive, well tested, documented, and must not break any platform the

&#x20;  upstream project supports.



INPUTS

1\. FEATURES FILE: \[doc1\_feature\_specification] - the features I want.

2\. ARCHITECTURE FILE: \[doc2\_gazboard\_architecture\_analysis] - my documentation of the base app's architecture.

3\. IMPLEMENTATION METHOD FILE: \[doc3\_windows\_implementation\_plan] - my proposed installation and

&#x20;  implementation approach.

4\. THE REPOSITORY in this workspace. The source code is the ground truth. If

&#x20;  my documents and the code disagree, the code wins and you must report

&#x20;  every discrepancy.



WHAT I ALREADY KNOW ABOUT THE BASE APP (from its README; VERIFY IN CODE)

\- Electron app. Root files include main.js, preload.js, msoffice.js, soffice.js.

&#x20; Folders include src/, sync/, android/, test/, scripts/, packaging/linux.

&#x20; There is also a web build (Cloudflare Worker / Vercel configs).

\- Operation-based document model: every change is an op (add/del/set/order/doc)

&#x20; applied to a Store with an undo stack, with store.onOp(), store.checkpoint()

&#x20; and store.applyRemote().

\- Boards are saved atomically (temp file + rename) in <userData>/boards and

&#x20; exported as .gazboard files (older .openboard files also open).

\- Document import (PDF via pdf.js; Word/PowerPoint via LibreOffice if present,

&#x20; otherwise a built-in converter), LAN board sharing (off by default,

&#x20; X25519 + AES-256-GCM), PNG/SVG/PDF export, templates, and a smoke test

&#x20; suite (npm run smoke, npm run smoke:builtin, npm run test:restart).

Treat all of this as unverified until you have read the code.



DECISIONS ALREADY MADE (do not reopen without strong, specific evidence)

\- STAY ON ELECTRON. Rebuilding in Tauri or WinUI is too complex. Propose a

&#x20; different framework only if you can show that a required feature is

&#x20; impossible or unacceptably poor in Electron, and even then offer the

&#x20; cheapest in-Electron alternative first.

\- OTHER PLATFORMS: Replay targets Windows, but because of the upstream goals

&#x20; the default is to KEEP existing Android/macOS/Linux/web code untouched.

&#x20; Do not delete platform code. Where a feature is Windows-only or cannot work

&#x20; elsewhere, gate it cleanly (feature detection or a platform flag) so other

&#x20; platforms still build and run. Recommend excluding something from the

&#x20; Windows build only if it measurably helps performance, size or build time

&#x20; and the exclusion is done at build/config level, not by deleting source.

&#x20; Give a keep/gate/exclude verdict, with evidence, for each platform-specific area.

\- SIMPLE AND SOPHISTICATED: minimal new dependencies, no unnecessary

&#x20; rewrites, no new abstraction without a concrete need.

\- The features list contains no stylus or touch work (no pressure, palm

&#x20; rejection, Surface Pen). Do not invent any. Do not change existing

&#x20; stylus/mouse behaviour unless a feature strictly requires it.

\- OLD BOARDS: I personally do not need old boards to open in Replay, but the

&#x20; upstream goals mean new features must be backward compatible: boards saved

&#x20; by upstream GazBoard must open in Replay, and board data created by new

&#x20; features must be versioned and additive so upstream GazBoard degrades

&#x20; gracefully (ignores unknown data without corrupting or deleting it). Any

&#x20; breaking format change must be justified and called out explicitly.



GROUND RULES

\- Read the repository structure and key files before planning. Cite file

&#x20; names, functions and line numbers whenever you refer to existing code.

\- Never invent APIs, libraries, files, or behaviours. Label every claim as

&#x20; \[VERIFIED IN CODE], \[FROM MY DOCS], \[ASSUMPTION] or \[GENERAL BEST PRACTICE].

\- You know StarNote and Flexcil only from general knowledge and my files. Do

&#x20; not state how they work internally. Use them as UX/feature benchmarks and

&#x20; label anything uncertain as \[ASSUMPTION].

\- Challenge my implementation method. If a better approach exists, say so and

&#x20; give the trade-offs. Do not simply agree with me.

\- No production code yet. This output is analysis and planning only, plus

&#x20; short illustrative snippets where they remove ambiguity.

\- If information is missing, ask me instead of guessing silently.



PHASE 0 - COMPREHENSION CHECK

\- Summarise in your own words the base app, each requested feature, and my

&#x20; proposed method.

\- List every contradiction, gap or ambiguity across the three documents and

&#x20; the code.

\- Ask me at most 10 prioritised questions. For anything non-critical,

&#x20; continue with stated assumptions.

\- PAUSE and wait for my answers.



PHASE 1 - BASE APP AUDIT

\- Architecture map: main process vs renderer, preload/IPC surface, module

&#x20; structure in src/, canvas rendering pipeline, Store/op-log, persistence,

&#x20; import/export pipeline, settings, build and packaging (electron-builder),

&#x20; CI workflows, tests. Provide text diagrams.

\- Electron security posture: contextIsolation, nodeIntegration, sandbox, CSP,

&#x20; IPC validation, protocol handlers, file-path handling, navigation and

&#x20; window-open restrictions, the Electron version and its known vulnerabilities.

\- Performance baseline: startup path, rendering strategy for large boards, hit

&#x20; testing, memory use with many images/pages, autosave behaviour.

\- Technical debt and fragile areas that new features will touch.

\- Platform-specific code inventory with a keep/gate/exclude verdict each.

\- Contribution conventions: code style, naming, folder structure, how tests

&#x20; are written, how releases are built. List what new code must match.



PHASE 2 - FEATURE-BY-FEATURE ANALYSIS

For every feature in my features file:

\- Precise restatement and testable acceptance criteria.

\- Feasibility in Electron (say clearly if anything is impossible or poor).

\- Where it fits: files touched, files created, extension points used.

\- Data model changes: new op types, board-file format changes, versioning,

&#x20; and how upstream GazBoard would behave when opening such a board.

\- UI/UX behaviour, states (empty, loading, error), keyboard accessibility.

\- Interactions with undo/redo, autosave, export, import and LAN sharing.

\- Performance impact and worst case (huge board, many pages, big files).

\- Behaviour on non-Windows platforms (works, gated, or hidden).

\- Dependencies on other features and the right build order.

\- Complexity (S/M/L/XL) and risk (low/med/high), with reasons.

\- StarNote/Flexcil comparison: what to adopt, simplify, or skip.

\- Upstream-readiness: could this feature be proposed as its own pull request?



PHASE 3 - EVALUATION OF MY IMPLEMENTATION METHOD

\- Feasibility, ordering, hidden assumptions, missing steps.

\- Better alternatives, if any, in a side-by-side trade-off table.

\- Branching and versioning strategy for the fork: how to track upstream, how

&#x20; to keep Replay-only changes isolated, how to structure commits and branches

&#x20; so each feature can later be cut into a clean upstream pull request.

\- How to keep the app runnable after every step.

\- PAUSE for my confirmation before Phase 4.



PHASE 4 - CROSS-CUTTING QUALITY ANALYSIS

Give risks specific to THIS project with exact mitigations, no generic advice:

1\. Security \& privacy: Electron hardening, IPC and file-path validation,

&#x20;  untrusted board/document input (malicious .gazboard, PDF, Office files),

&#x20;  dependency vulnerabilities, safe handling of any new data or file formats,

&#x20;  the existing LAN-sharing code if touched.

2\. Performance: canvas rendering cost, large boards, memory leaks, main-thread

&#x20;  blocking, IPC overhead, board-file growth, startup time, installer size.

3\. Compatibility: Windows 10/11, DPI scaling (1x-2x), multi-monitor,

&#x20;  installer and portable builds, board-file backward compatibility,

&#x20;  Node/Electron version constraints, non-Windows builds still working.

4\. Reliability: crash and unclean-shutdown recovery, atomic writes,

&#x20;  concurrent operations, undo/redo correctness, data-loss scenarios.

5\. Testing: how to extend the existing smoke suite, tests per feature,

&#x20;  a regression checklist for existing functionality, and what MUST be

&#x20;  tested manually on real hardware.



PHASE 5 - FILE-BY-FILE IMPLEMENTATION PLAN

For every file to create or modify:

\- Path, create/modify, purpose.

\- Exact changes: functions/classes to add or alter, signatures, key logic,

&#x20; edge cases, error handling, and what to leave untouched.

\- Which feature it serves and why. Prefer new files and small hooks over

&#x20; rewriting existing files, to minimise upstream merge conflicts.

\- Dependencies on other files and the exact order of edits.

\- File-specific pitfalls and how to avoid them.

\- A verification step after the change (build, smoke test, manual check).

Group the work into ordered milestones. After each milestone the app must

launch, pass the existing smoke suite, and open a board saved by upstream GazBoard.



PHASE 6 - AGENT EXECUTION PLAN

Turn the plan into instructions for an AI coding agent in agent mode:

\- An ordered task list, each task small enough to finish and verify in one

&#x20; session, with explicit done-criteria.

\- Guardrails: files not to touch, rules for adding dependencies, when the

&#x20; agent must stop and ask me, how to avoid scope creep and silent refactors.

\- A reusable task-prompt template I can paste for each task.

\- Commit and rollback points, with commit boundaries that map to

&#x20; upstream-ready pull requests.

\- Typical AI-agent failure modes on this kind of work (invented APIs, partial

&#x20; refactors, broken imports, deleted code, tests edited to pass) and how to

&#x20; detect each one.



PHASE 7 - RISK REGISTER, RELEASE CHECKLIST, UPSTREAM PACKAGE

\- Table: risk, likelihood, impact, mitigation, early-warning sign.

\- Pre-release checklist for security, performance, compatibility and

&#x20; board-file compatibility.

\- Upstream contribution package: how to split the work into pull requests,

&#x20; what documentation (README sections) and tests each needs, and a short

&#x20; draft proposal message I could send the original author.

\- Be honest about what cannot be guaranteed and what I must verify myself.



OUTPUT FORMAT

\- Work phase by phase. Because the total output is very large, save each phase

&#x20; to its own markdown file (docs/plan/00-comprehension.md, 01-audit.md, and

&#x20; so on) and give me a short summary in chat.

\- Pause after Phase 0 and Phase 3 for my confirmation.

\- Use headings, tables and checklists. If a sentence would be equally true for

&#x20; any app, rewrite it or delete it.

