# Reusable Agent Workflow Instructions

> Copy this file to the project root as `AGENTS.md`, or place it in the instruction file recognized by your agent harness. Keep this shared workflow intact and append project-specific rules below it. It is written in plain Markdown so it can be used with Codex, OpenCode, Antigravity, Claude Code, and other coding agents.

## 1. Work with the user’s intended meaning

- The user may dictate in English as a second language. Speech recognition can mishear words, names, technical terms, and especially similar sounds. Interpret the request using the surrounding conversation, project context, and stated goal; do not treat grammar or a likely transcription error as the user’s intent.
- Use clear, concise, respectful language. Do not correct the user’s English unless asked.
- If wording is unclear but context makes the intended task reasonably clear, state your interpretation briefly and proceed. Ask a focused question when different interpretations would materially change the work, data, or result. Before a high-impact action, summarize the intended result in plain language.
- Preserve the user’s constraints and choices across turns. Do not ask again for a preference they already gave.

## 2. Use Progressive Information Architecture (PIA)

Build and maintain project documentation as a top-down, layered map with progressive disclosure. Start at the highest-level route and follow it down to only the files and code relevant to the task.

| Layer | Project information | Agent action |
| :--- | :--- | :--- |
| 0. Rules | Root `AGENTS.md` and any higher-priority harness instructions | Read first; resolve conflicts according to instruction priority. |
| 1. Project overview | Short bootstrap/README and top-level documentation map | Learn the stack, core invariants, and where to route the task. |
| 2. Index | Master feature or subsystem index; domain sub-indexes where needed | Choose the smallest relevant documentation branch. |
| 3. Subsystem guide | One focused layer dossier with behavior, invariants, source entry points, and checks | Read the selected guide; avoid neighboring guides unless the task crosses domains. |
| 4. Implementation | Named modules, classes, functions, and relevant call sites | Trace only the affected flow down to the necessary functions and lines. |
| 5. Verification | Focused tests, integration checks, or user-facing build | Run the checks that cover the changed behavior and its important interactions. |
| Optional history | Handover, release notes, bug log, feature record, plans, or design proposals | Consult only when current state, prior rationale, or historical behavior matters. |

### PIA operating rules

- At task start, inspect applicable instructions, the project overview/index, and the current Git/version state. Use the project’s own navigation links instead of recursively opening documentation folders.
- Follow the route: **task → index → relevant guide → source entry point → affected functions/call sites → focused checks**.
- If a task spans multiple subsystems, identify each route independently and read only the relevant portions of each guide.
- For a new project or undocumented area, create or improve a concise map and sub-index before writing a large catalog. Give each document one clear purpose and avoid duplicate explanations.
- Keep indexes useful for locating source, tests, and lower-level maps. Keep broad catalogs searchable, not mandatory reading.
- Treat current source and passing tests as evidence of current behavior. Treat plans and proposals as intent until verified. Handover describes current working state; release notes describe version history.
- When code structure changes, update the map links so the hierarchy still reaches the right module and test.

## 3. Complete the requested work

For a feature or debugging task:

1. Understand the expected user-visible behavior and relevant edge cases. Reproduce or trace the failure when practical.
2. Inspect the existing implementation and adjacent call sites before editing. Preserve established project invariants and user-selectable behavior.
3. Implement the smallest coherent change that fully addresses the request. Do not stop at a code path that works in only one mode, workflow, or output surface when the feature is expected to work across them.
4. Run project-required checks and focused tests for the changed behavior. Add or update tests when appropriate and permitted by the project’s instructions. Do not claim a check passed unless it actually ran and passed.
5. For app projects, normally produce both a portable build and an installer when the change is medium/high complexity, crosses subsystems or modes, changes persistence/media/IPC/lifecycle behavior, or needs user testing. Skip a build only when the code change is clearly trivial and low risk; state why. Documentation-only work does not require an app build.
6. If a required check or build fails, investigate and fix it when feasible. Otherwise preserve the current state, record the failure and next step in the handover, and report the limitation honestly.

## 4. Keep documentation and handover current

After every completed feature or debugging task, update all project-authored documentation that is relevant to that change, however small. Use the project’s existing hierarchy and update applicable items such as:

- subsystem dossier and top-level index or sub-index;
- feature catalog/record and bug log;
- release notes or changelog;
- handover/current-state file.

Do not edit unrelated documentation simply to touch every file. Keep the detailed explanation in the document whose purpose fits it, and link to that source from indexes and catalogs. When useful, record:

- what the user saw and expected;
- why the previous behavior failed, including the root cause found;
- what changed and how the corrected behavior works;
- affected modes, workflows, and interactions;
- verification performed, build outputs, and known limitations.

Maintain one concise handover file. Reuse an existing project handover if present; otherwise create a root `HANDOVER.md` or the project’s equivalent. For each completed task, update it with:

- current version/tag and local commit;
- summary of the change and important files;
- documentation/indexes updated;
- checks and their results;
- portable/installer build paths, or why a build was skipped;
- remaining limitations or the next concrete step.

Write the handover so a fresh agent can resume without rereading the full conversation or the whole documentation tree.

## 5. Version, commit, tag, and build policy

### Versioning

- Inspect the project’s version metadata and latest local tag before choosing a version.
- For a code change, use three-part semantic versioning: **major** for the largest product/architecture or compatibility change, **minor** for a medium-sized feature, and **patch** for a small fix or change. When a project has no version yet, begin at `0.0.1`.
- A documentation-only change does not create or advance a version tag. Commit the documentation and associate it with the latest code tag.
- For code changes, keep package manifests, displayed app version, release notes, and the local tag consistent where those concepts exist. Use the project’s established tag form, commonly `vMAJOR.MINOR.PATCH`.
- If the current version/tag sources conflict or the change’s scope cannot be classified confidently, inspect history and project conventions; ask the user only if the choice remains consequentially ambiguous.

### Local Git actions

- Create one clear local commit for each completed task that changes project files, including documentation-only work. Include relevant documentation and handover updates in that commit. Do not create empty commits for advisory, Q&A, or review tasks that made no file changes.
- For code changes, commit the versioned and verified state, then create the matching local version tag. Do not tag documentation-only commits.
- Keep commits and tags local by default. Do not push, publish a release, upload artifacts, or create a remote release unless the user explicitly asks. Permission to push applies only to that specific push request.
- Never force-push, rewrite existing history, discard user changes, or commit unrelated work. Inspect `git status` and the diff before committing. If completion is blocked, do not label partial work complete; preserve it and report what remains.

### App builds and release publishing

- Build portable and installer artifacts for medium/high-risk app changes and other changes likely to need hands-on user validation. A low-risk code change may skip packaging with a short reason recorded in the handover. Docs-only tasks skip packaging.
- Keep generated artifacts and their paths clearly identified. Do not claim a user can test a build that was not generated successfully.
- A local version tag and test build are not a published release. Publishing or remote upload always requires an explicit user request.

## 6. Make every handoff understandable

At the end of each task, report concisely:

1. What changed and why.
2. Which documentation and handover files were updated.
3. Checks run and their results, including any check intentionally skipped.
4. Version, local commit, and local tag for code changes; for docs-only work, say that it is committed under the latest code tag with no new version tag.
5. Build artifact paths or the reason no build was needed.
6. Any remaining limitation or next step.

The user may have limited agent usage. Leave project state and handover notes in a form that another harness can pick up immediately.

## 7. Add project-specific instructions below

Keep only rules that apply to this project here: stack and setup, architecture invariants, exact subsystem routes, required checks, build commands, release/archive paths, and known project constraints. Keep this reusable workflow as the common baseline and avoid duplicating it with conflicting rules.
