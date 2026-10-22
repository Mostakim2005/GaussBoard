# AI Documentation Map

> Keep this file as the short map, not a summary of every document. Use it to choose one authoritative document for the task, then open only that document and its linked source/tests.

## Start here

1. Read repository `AGENTS.md` for mandatory local rules.
2. Read [`../AI_BOOTSTRAP.md`](../AI_BOOTSTRAP.md) for the project stack, invariants, and quick task router.
3. Use [`INDEX.md`](INDEX.md) to select the feature row and its one layer dossier.
4. Consult this map only if the documentation scope or source of truth is unclear.
5. Read [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md) only when you need current branch/release state, owner preferences, archive policy, or known verification limits.
6. Open the named source files and the smallest relevant test group. Do not recursively read `docs/`, all plans, or all release notes.

## Reading tiers

| Tier | Read | Scope |
| :--- | :--- | :--- |
| 0 — Rules | `AGENTS.md` | Mandatory instructions for this repository/task. |
| 1 — Router | `AI_BOOTSTRAP.md` → `docs/INDEX.md` | Project-wide facts, invariants, and one feature route. |
| 2 — Subsystem | One selected file in `docs/layers/` | Only that feature's invariants, source entry points, and checks. |
| 3 — Implementation | Named source files and focused tests | Inspect only the behavior being changed. |
| Optional history | One relevant release, bug, feature, plan, or handover record | Open only when history, current state, or a specific rationale is needed. |

## Directory map

| Location | Role | Open when |
| :--- | :--- | :--- |
| `docs/INDEX.md` | Feature-to-layer router and links to authoritative records | You know the feature area, or need a destination document. |
| `docs/layers/` | Seven current subsystem dossiers; each describes invariants, source files, and focused checks | You are changing or debugging a subsystem. Choose exactly one dossier from the index. |
| `docs/releases/RELEASES_INDEX.md` | Compact release ledger and artifact registry | You need to identify a release or artifact. |
| `docs/releases/RELEASE-x.y.z.md` | Scope, implementation, causes/fixes, verification, and limitations for one release | You need details for that specific version. Open only the selected dossier. |
| `docs/FEATURE_RECORD.md` | Stable feature IDs and concise feature descriptions | You need the feature registry or to add a feature record. |
| `docs/BUG_FIX_LOG.md` | Bug IDs, symptoms, causes, fixes, and verification | You need a prior incident or are recording a fix. Search by ID/term first. |
| `docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md` | Historical custom-feature changes through v4.8.8 | You need history for those versions. It is not current implementation authority. |
| `docs/BASE_FEATURE_CATALOG-4.8.1.md` | Upstream v4.8.1 baseline only | You need to distinguish inherited behavior from later additions. |
| `docs/plan/` and `docs/plan/spec/` | Historical plans, design proposals, and evaluations | You need original intent. Treat claims as proposals until confirmed in current source/tests. |
| `docs/MASTER_ALL_FEATURES_CATALOG_AND_ARCHITECTURE.md` | Broad inventory plus future-facing proposals | Use targeted search for a specific feature; avoid reading it end to end. |
| `docs/MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md` | Source-checked history and architecture for v4.8.11–v4.8.20, with audit follow-up notes | You need the feature inventory or previous audit findings for these releases. |
| `docs/releases/RELEASE-4.8.21.md` | Security hardening, Markdown metadata robustness, root causes, verification, and artifact record | You need the latest security/feature audit outcome or v4.8.21 release details. |
| `docs/MASTER_HYBRID_ARCHITECTURE_EVALUATION.md` | Architecture evaluation/reference | Open only for architecture decisions or a task that cites it. |
| `docs/PWA.md` | PWA-specific behavior and setup | You are working on the web/PWA target. |

## Which document is authoritative?

For **current behavior**, use source and focused tests. For **current release state and owner constraints**, use the handover. For **feature routing and architecture guardrails**, use the bootstrap, this map, and the selected layer dossier. For **release history**, use the release index and selected release dossier. Feature records and bug logs are indexes into that evidence. Plans, audit reports, and broad catalogs preserve historical intent and must not override current source or tests.

## Token-light discovery

Search names/headings before opening content:

```powershell
rg -n "search phrase|BUG-023|F-120" docs/INDEX.md docs/FEATURE_RECORD.md docs/BUG_FIX_LOG.md docs/releases
rg --files docs/layers
```

Prefer one route: **task → index row → one dossier → named source/test files**. If no row matches, use a narrow `rg` search over document names/headings, then update the index only if the new area needs a reusable route. Avoid copying the same detailed explanation into multiple catalogs; link to its release dossier or subsystem dossier instead.

## Documentation maintenance

- Update the layer dossier when subsystem invariants, source ownership, or focused checks change.
- Update the index when a task needs a new route or an existing route changes.
- Update a release dossier, feature record, or bug log only for claims in that document's role.
- Keep the bootstrap brief; point to this map instead of duplicating the full directory inventory.
- When changing docs, preserve historical records and user-authored material; do not bulk-rewrite unrelated files.
