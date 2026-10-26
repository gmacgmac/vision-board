# Cortex System — Changelog

> Version history for the Cortex system.
>
> **How upgrades work**: `copier update` overwrites all managed (lowercase) files automatically,
> including `cortex/templates/seed/{PROFILE,REGISTRY}.md` — Managed reference copies of the
> kernel's current schema. The `/cortex-setup` upgrade path diffs a consumer's live, seed-once
> `PROFILE.md`/`REGISTRY.md` against those directly, so schema changes (a renamed/added field)
> apply regardless of which version the consumer is coming from — no changelog replay needed.
> The **Migrations** section below is now scoped to what that diff can't express: renaming,
> moving, or deleting a **data** file/folder. The upgrade path reads Migrations sections between
> the consumer's old and new version and executes only those.
>
> - **Synced** = managed-file changes, one line each. Informational; already applied by copier. Brevity is deliberate — the files themselves are the reference.
> - **Migrations** = agent-executable steps for **data** files/folders only. Written in full: nothing else will apply them.

---

## v4.1.1 — 2026-10-21
**Root README with GitLab and GitHub install steps; never shipped to consumers.**

### Synced
- `README.md` (template repo only): what Cortex is, install for GitLab (internal, SSH) and GitHub (public), `/cortex-setup`, `copier update`, what gets installed, troubleshooting.
- `copier.yml`: `/README.md` added to `_exclude`, so a consumer's own README is never created, merged or overwritten.
- Tag `v4.0.1` points at the same README commit; it was numbered below the existing v4.1.0 by mistake. Use v4.1.1.

### Migrations
- None.

---

## v4.1.0 — 2026-10-21
**Task sets coordinate better: requests, file ownership, gates between waves, personas. Architecture gains one interface per concern, jobs and words.**

### Synced
- Task sets: sub-agents list changes they need in files they don't own (`REQUESTS`); the orchestrator routes each one.
- TASK-STATUS: File Ownership, Requests and Persona; PLAN: optional House Rules.
- Parallel runs check between waves: requests routed, orchestrator files updated, tests green.
- Only the orchestrator closes a set, after the full tests. Sub-agents never commit.
- Re-runs add a Run N block; tasks that need a person live run in the foreground.
- Trivial changes need no task file, but are logged and committed.
- `cortex-architecture`: one interface per concern; jobs registry; words files (`references/words.md`).
- Research blast radius is `local` / `cross-module`; "Execution Steps" is now "Steps".

### Migrations
- None. No change to `PROFILE.md` or `REGISTRY.md`. Older task sets keep working: the orchestrator adds a Requests table when needed, and asks before running a parallel wave that has no File Ownership table.

---

## v4.0.0 — 2026-10-16
**Breaking: `cortex-organize` renamed `cortex-docs`; new `cortex-architecture` skill. Docs are held true by tests, not re-read later.**

### Synced
- `cortex-docs` (was `cortex-organize`): filing flow kept; adds "Keep it true" — every claim about code cites a symbol and a test, never a line number; no current state in durable docs; numbers derived from code constants; audit-first UPDATE (cite, test, or delete each claim). New `references/doc-truth.md`: mechanism shape (Property / Where / Proven by / Not covered), index + three-way tripwire tests, symbol-existence test, VERIFY doc audit, no-test-suite fallback.
- `cortex-architecture` (new): before-you-build checklist and rules for reuse, one job per file, one source per contract, one layer per concern, and registries. References: `contracts.md` (schema → code → OpenAPI → MCP, tested end to end), `registries.md` (references and conditions, root cause by walking edges).
- `cortex-write-task`: Skill Routing table (replaces the v3.3.3 doc-placement Constraints line — doc tasks name `cortex-docs`); planner loads `cortex-architecture` for dev work and names skills in each task; VERIFY runs the doc audit when code a doc describes changes.
- `task-template.md` (`Skills` input), `single-task-template.md` (`skills:` frontmatter), `generic-document.md` (Mechanism block).
- `cortex-change-protocol.md`, `CORTEX-SYSTEM.md`, `cortex-archive`, `cortex/readme.md`: references updated to `cortex-docs`.

### Migrations
- If `.kiro/skills/cortex-organize/`, `.agent/skills/cortex-organize/` or `.claude/skills/cortex-organize/` still exists after `copier update`, delete it — it is replaced by `cortex-docs`.
- In project-authored steering, skills or task files that are still open, replace references to `cortex-organize` with `cortex-docs`. Leave completed task files unchanged — they are history.

---

## v3.3.3 — 2026-10-16
**Trimmed for stronger models; stale references and contradictions removed.**

### Synced
- `cortex-rules.md` rule 12: describes the file-include directive in words, so PROFILE is no longer inlined twice.
- `single-task-template.md`: Task Overview + Execution Steps merged into Steps; Agent Notes renamed Implementation Notes; Statistics and execution-log checkboxes dropped.
- `task-template.md`, `single-task-template.md`: Pre-Task Requirements block removed; `cortex-write-task` now adds a doc-placement Constraints line instead.
- `task-status-template.md`: table status `COMPLETED` → `Completed`.
- `sequential.md`, `parallel.md`: Pre-Loop Pledge replaced by a one-line read-discipline checkpoint; redundant AUDITED reminder dropped from dispatch prompts; "No external dependencies" scoped to "unless the task file calls for them". Long File Strategy and `cwd` reminders kept.
- `cortex-write-task`: FE/BE split generalised to surface boundaries; `research-variant.md` "Agent Notes" → "Implementation Notes".
- `cortex-organize`: stale PROFILE §3/§5 references point to `REGISTRY.md` `docs`; archive-before-update removed; tasks deferred to `cortex-write-task`; duplicate check uses `cortex-search`.
- `cortex-archive`: `versioned` reason removed — archiving always moves; no pre-edit snapshots.
- `cortex-search`: Layer 1 scopes to `include` + `flag` minus `exclude`; shell commands replaced with tool-agnostic steps; Scaling table removed.

### Migrations
- None.

---

## v3.3.2 — 2026-10-15
**Model class per task, reuse-never-copy, and scoped testing for sub-agents.**

### Synced
- `cortex-write-task`, `task-status-template.md`, `single-task-template.md`: planner sets a `Model` class (`standard` | `strong`) per task, never a model name.
- `cortex-task-exe/SKILL.md`: every dispatch names a model from the task's class; project steering maps classes to models, else ask the user. Single mode tests shared patterns it changes, and runs full gates when not a sub-agent.
- `sequential.md`, `parallel.md`: dispatch prompts add reuse-never-copy and "run your own tests plus those of every shared pattern or file you change" (replaces the TypeScript-only getDiagnostics line); orchestrator runs the full gates before marking a set complete.
- `cortex-task-exe` read discipline loosened: the orchestrator may read task and source files to check sub-agent work when it judges it worthwhile (was forbidden mid-loop).

### Migrations
- None.

---

## v3.3.1 — 2026-10-01
**Flagged tier wording gaps closed in the Gardener.**

### Synced
- `cortex-garden/references/engine.md` § Doc-Drift Check step 4: "no relevant doc" now checks Tracked **and** Flagged, so a topic covered only by a flagged doc no longer triggers a spurious `docs.include` proposal.
- `cortex-garden/SKILL.md` § Scope tiers: Observable row now reads "outside `include` and `flag`", matching engine.md step 6.

### Migrations
- None.

---

## v3.3.0 — 2026-10-01
**`docs.flag` tier (watch, report, never edit); tracker becomes a queue linked to tasks.**

### Synced
- `REGISTRY.md` (seed schema): new `docs.flag` list — drift-checked and reported, never edited. Precedence `exclude` > `flag` > `include`, regardless of match specificity.
- `cortex-garden` SKILL.md + engine.md: new **Flagged** tier. Flagged drift always escalates as one `[needs-human-input] DRIFT {file} § {section}` LOG line per file, plus a `Drift flagged` checkpoint line. Deep scan skips `flag` paths. An approved fence proposal may land in `flag` instead of `include`.
- `cortex-setup` install.md: seed protected files (anything a project rule forbids agents to edit) into `flag`; turn `deep_ripple_scan` off once the fence is complete.
- `tracker-template.md` rewritten as a queue: buckets by when an item hurts (renameable per project), stable letter-prefixed IDs, rows deleted on completion (never struck through), removal only via a completed task, dropped items recorded as a `Dropped {ID}: {reason}` LOG line.
- `task-status-template.md`, `single-task-template.md`: optional `tracker: path#ID[,ID]` frontmatter; On Completion deletes those rows and rewrites the tracker's Status. Task sets: orchestrator only, after the full set.
- `cortex-write-task`: set `tracker:` when a task comes from tracker items. `cortex-organize`: tracker description updated.

### Migrations
- None. Upgrade step 4 (schema reconcile) adds `flag: []` to the consumer's `REGISTRY.md` `docs` block and adopts the new fence prose. Existing tracker files are untouched; adopting the new format is optional, per project.

---

## v3.2.14 — 2026-09-16
**Template-repo release process only — nothing shipped to consumers.**

### Synced
- No managed files changed. The edits are to `.kiro/steering/CORTEX-SYSTEM.md`, which `copier.yml` `_exclude`s from the template payload, plus this changelog.
- For the record: releases now push to two remotes (GitHub `origin` + GitLab `gitlab`), tags must land on both, and the verify step diffs the two tag lists. A consumer's `.copier-answers.yml` `_src_path` decides which remote it updates from.
- Backfilled changelog entries for v3.2.7–v3.2.12, which had been tagged without one.

### Migrations
- None.

---

## v3.2.13 — 2026-09-16
**Wave assignment moves from executor inference to planner declaration; shared-code duplication in parallel waves closed.**
### Synced
- `task-status-template.md`: new `Wave` column in the Task List table (same number = parallel, ascending order) and a new `Shared Foundations` table naming artifacts the set creates and later tasks consume. Agent instructions now say respect the wave and reuse foundations.
- `cortex-write-task/SKILL.md`: Branch B step 6 makes wave assignment the planner's job — the orchestrator reads only PLAN.md and TASK-STATUS.md, so unassigned waves force it to guess. Planner role notes sub-agents run blind to each other, so anything created-then-reused must be declared and ordered.
- `granularity.md`: new `Wave Assignment` section — same-wave conditions, the shared-foundation failure mode (parallel tasks each inventing the same helper, invisible to file-overlap checks), and the "what would each task have to invent" test.
- `parallel.md`: waves now read from the `Wave` column instead of being inferred from task-file `Inputs`/`parallel-group:` frontmatter — that guidance was unfollowable, since read discipline forbids opening task files. Missing column falls back to sequential with a re-author suggestion. Dispatch prompt requires checking Shared Foundations before creating shared code, and reporting `DEVIATION` rather than inventing it.
- `cortex-task-exe/SKILL.md`: mode selection keys off the `Wave` column.
- `plan-template.md`: Dependencies section asks for task ordering and shared code, mirroring Shared Foundations.
- `task-template.md`: new `Shared artifacts to reuse` line in Inputs.
- **Removed**: `parallel-group: X` task-file frontmatter is no longer honoured — superseded by the `Wave` column.
### Migrations
- None. Existing task sets have no `Wave` column and fall back to sequential execution; no data changes required.

---

## v3.2.12 — 2026-09-15
**Sub-agent model tier must be set explicitly, not defaulted.**

### Synced
- `cortex-task-exe/SKILL.md` § Sub-Agent Dispatch Protocol: tier selection is now mandatory on every dispatch rather than advisory. New bullet warns an unspecified model silently inherits the orchestrator's — often the priciest tier. Adds sizing examples: lightweight for mechanical work, stronger for cross-file refactors and debugging.

### Migrations
- None.

---

## v3.2.11 — 2026-09-06
**Sub-agent model/effort tier sized to task complexity.**

### Synced
- `cortex-task-exe/SKILL.md`: match model tier to task weight where the platform supports it, keeping token cost proportional. Superseded by v3.2.12.

### Migrations
- None.

---

## v3.2.10 — 2026-08-31
**Background/async sub-agent dispatch preferred where available.**

### Synced
- `cortex-task-exe/SKILL.md`: dispatch async when the platform supports it, so the orchestrator stays responsive to the user instead of blocking per sub-agent.

### Migrations
- None.

---

## v3.2.9 — 2026-08-24
**Sub-agent references generalized off Kiro-specific naming.**

### Synced
- `cortex-rules.md` § SUB-AGENT PROTOCOL rule 1: `general-task-execution` (a Kiro-only agent name) replaced with "your environment's general-purpose sub-agent". Version → 2.7.
- `cortex-research/SKILL.md` § Delegation Strategy: dropped the hardcoded candidate list (`context-gatherer`, `general-task-execution`, `task`, `claude`) for a role description — specialized research agent if the environment exposes one, else the general-purpose one. Named agents broke non-Kiro IDE extensions and needed editing per new tool.

### Migrations
- None.

---

## v3.2.8 — 2026-08-20
**Mirror-edit ban narrowed to kernel files.**

### Synced
- `cortex-change-protocol.md` § Before editing: the `.agent/`/`.claude/` prohibition now scopes to `cortex-*` files only, not the whole directory — consumers may keep their own non-kernel files there. Version → 1.4.

### Migrations
- None.

---

## v3.2.7 — 2026-08-18
**Naming conventions rule added.**

### Synced
- `cortex-rules.md` new rule 4: use standard, industry-recognized terminology for modules and systems; avoid metaphorical or invented names; ask rather than invent when no standard term fits. Version → 2.6.

### Migrations
- None. Rules 4–13 renumbered to 5–14 (`9`/`9a` → `10`/`10a`), but numbering is internal to the file — nothing references rules by number.

---

## v3.2.6 — 2026-07-31
**Upgrade skill hardened against real-world friction; kernel-edit ban made explicit.**

### Synced
- `cortex-rules.md` gained rule 13: one-line pointer to `cortex-change-protocol.md` § Before editing — no restatement, avoids two resident files carrying the same list.
- `cortex-change-protocol.md`: the "Before editing" table's managed-file row now says "Don't" plus the reason and the template-repo exception, inline — no separate banner paragraph.
- `cortex-setup` upgrade path, new Step 0 (preflight): cheap remote-tag check (`git ls-remote --tags`) against local `_commit` — reports "already at latest" and stops before running `copier update` unnecessarily; plus a `git status --porcelain` dirty-tree check so that failure surfaces before the attempt, not during it.
- Step 1 command changed to `copier update --trust --defaults` — without `--defaults`, a new/changed prompt opens a TTY read that crashes in a non-interactive agent session (`OSError: [Errno 22]`). New outcome-report row "Defaults accepted" so a silent default doesn't slip past the human.

### Migrations
- None. All changes are to Managed skill/steering files; `copier update` applies them.

---

## v3.2.5 — 2026-07-31
**Upgrade path diffs against a live schema reference instead of replaying Migrations history.**

### Synced
- New Managed files `cortex/templates/seed/PROFILE.md` and `REGISTRY.md` — exact mirrors of the kernel's current `cortex/PROFILE.md`/`REGISTRY.md`, refreshed by `scripts/sync-agent.sh` on every commit. Never hand-edit; edit `cortex/PROFILE.md`/`REGISTRY.md` instead.
- `cortex-setup` upgrade path, step 4: reconciles a consumer's live seed-once `PROFILE.md`/`REGISTRY.md` against `templates/seed/` structurally (add missing fields, rename in place, preserve consumer values) — independent of version history.
- `Migrations` narrowed to structural/data actions only (file/folder renames, moves, deletions); schema field changes move to the new reconciliation step.
- Upgrade step 1: old template version is now read from `git show HEAD:.copier-answers.yml`, not the working-tree file — fixes silently-skipped migrations when a consumer runs `copier update` manually before invoking the agent.

### Migrations
- None. New consumers get `templates/seed/` from `copier copy`. Existing consumers get it on their next `copier update` (it's Managed) — no action needed on their existing `PROFILE.md`/`REGISTRY.md`.

---

## v3.2.4 — 2026-07-31
**Off-limits fence narrowed from whole trees to the kernel's own files.**

### Synced
- `docs.exclude` no longer blanket-excludes `.kiro/`, `.agent/`, `.claude/`. Only `cortex-*`-prefixed files inside them (the kernel's rules/skills/steering and their generated mirrors) are Off-limits — matched by pattern, same as `cortex-change-protocol.md` already does for system-file discovery. `cortex/` stays wholesale-excluded (it's 100% kernel/data).
- v3.2.2 had regressed this: its blanket `exclude: [cortex/, .kiro/, .agent/, .claude/, ...]` made every project-authored rule/skill/steering file in those trees invisible to the Gardener's drift check — including the kind of stale-CI-description fix that motivated tracking `.agent/`/`.claude/` rule files in the first place.
- `cortex-garden` `SKILL.md` § Scope tiers: dropped the hardcoded `.agent/`, `.claude/` parenthetical — `docs.exclude` is now the single source of truth, so the two can't drift apart again.
- `cortex-garden` `engine.md` System/Config verification row: reworded from "`cortex/` and `.kiro/` are Off-limits" to name the actual scope ("managed `cortex-*` files").

### Migrations
> `REGISTRY.md` is **seed-once** — copier will not touch an existing one, so apply this by hand.
- **If your `docs.exclude` matches the v3.2.2 Migration exactly** (`[cortex/, .kiro/, .agent/, .claude/, cortex-tasks/]`), replace it with:
  ```yaml
  exclude: [
    cortex/,
    cortex-tasks/,
    "**/cortex-*"
  ]
  ```
- **If you've since customized `docs.exclude`**, just replace the `.kiro/`, `.agent/`, `.claude/` entries with `"**/cortex-*"` — leave any other project-specific entries you've added alone.
- After updating, project-authored files under `.kiro/steering/`, `.kiro/skills/`, `.agent/rules/`, `.claude/rules/`, etc. that don't start with `cortex-` become Observable (or Tracked, if you add them to `docs.include`) on the next Gardener run — this is the intended fix, not a side effect to undo.

---

## v3.2.3 — 2026-07-30
**Changelog compressed.**

### Synced
- Every release's **Synced** section reduced to one line per change (341 → 190 lines, ~44% smaller). The rationale prose is gone; the managed files are the reference.
- **Migrations** sections kept in full everywhere — nothing else applies them. v3.2.2's were sharpened for the adapt-to-existing case.
- Header note now states the convention, so future entries stay terse.

### Migrations
- None.

---
## v3.2.2 — 2026-07-30
**Gardener write scope fenced; AUDITED is Gardener-only; task logging is two-level.**

### Synced
- Three scope tiers replace "inside/outside the declared surface": **Tracked** (`docs.include`, fixable) · **Observable** (deep-scan reach — read-only, propose only) · **Off-limits** (`docs.exclude`, never read for drift).
- `REGISTRY.md docs` restructured: `rule` + `include` → `include` + `hint` + `exclude`. `include` is authoritative; `hint` only proposes.
- `cortex-tasks/` is off-limits — editing a completed task destroys the audit trail.
- `cortex-infra` is now `virtual: true` — a log tag, not a path. System content is matched by pattern instead.
- `engine.md` System/Config verification row is verify-only; it raises `[needs-human-input]` instead of editing the kernel.
- New § Proposing a New Tracked Path — a scan hit becomes a concrete `docs.include` proposal; declines go to `docs.exclude` so they stop resurfacing.
- `AUDITED.md` is Gardener-only. The blanket "after any skill, append to AUDITED" rule is removed, and stripped from `templates/handler.md` and `cortex-task-audit`.
- Task-set logging is two-level, each entry written once: sub-agent logs its task, orchestrator logs the set. `parallel.md` no longer contradicts the task file.
- `task-template.md` gained the `On Completion` it never had; Single mode in `cortex-task-exe` gained its LOG step.
- Append contract: one entry = one line terminated with `\n`, append-only, never `str_replace`. Makes a parallel wave's simultaneous appends safe.
- Line-number citations dropped for `file` + symbol anchors (also in `cortex-rules` rule 12).
- `cortex/system-abstraction.md` deleted (obsolete; was copier-excluded, so consumers never had it).
- `PROFILE.md` §1: `deep_ripple_scan` is read-only in both modes and never enters `exclude`.

### Migrations
> `PROFILE.md` and `REGISTRY.md` are **seed-once** — copier will not touch an existing one, so these
> steps are required or the new Gardener reads keys that aren't there. Adapt to what's already in
> the file; only add what's missing.
- **`REGISTRY.md` → rename `docs.rule` to `docs.hint`.** Keep its existing value. It no longer
  matches live; it only proposes candidates. Keep `docs.include` exactly as-is — it is now the
  authoritative fence.
- **`REGISTRY.md` → add `docs.exclude`** with the kernel defaults, plus any local
  content-not-documentation paths (manuscripts, generated output, vendored trees):
  ```yaml
  exclude: [cortex/, .kiro/, .agent/, .claude/, cortex-tasks/]
  ```
- **`REGISTRY.md` → change `cortex-infra` to `{ virtual: true }`**, removing its `paths`. Also drop
  `.agent/` and `.claude/` from any other category's `paths` if present.
- **`PROFILE.md` §2 → reword the `cortex-infra` row** as a log tag matched by pattern, not a path.
- **`AUDITED.md`** — leave existing non-Gardener entries in place; they are history. Only new writes
  are restricted.

---
## v3.2.1 — 2026-07-30
**Gardener reworked to a thread model.**

### Synced
- Unit of work is a **thread**, not N entries: seed on the oldest LOG entry, trace the whole story, one checkpoint. Budget is 1–5 threads per run.
- Explicit thread-boundary rules (same task folder · forward-reference · same timestamp · direct continuation). A shared category tag is never sufficient.
- Verification is against the working tree, never another LOG entry's prose — and reads the parent `TASK-STATUS.md` subtask table, since subtasks often ship unlogged.
- Doc `last_updated` recency is a scoped confidence signal: the claim under audit is always checked directly.
- `[needs-human-input]` gained three defined outcomes: re-append, close with tree evidence, or create fresh.
- `processed LOG through [[…]]` marker suspended while draining a backlog — threads break chronology.
- Checkpoint format gained entry count, timestamp range, thread boundary, and LOG cleanup lines.
- `references/engine.md` de-duplicated — it had restated the non-negotiables and checkpoint format verbatim from `SKILL.md`.

### Migrations
- None. Both files are managed; `copier update` applies them.

---
## v3.2 — 2026-07-30
**`cortex-pre-mod-check` + `cortex-log-protocol` merged into `cortex-change-protocol`.**

### Synced
- New steering file `cortex-change-protocol.md` replaces `cortex-pre-mod-check.md` and `cortex-log-protocol.md`, ordered as one lifecycle: gates before an edit → LOG after it → AUDITED after a skill.
- Resident set is now 5 steering files. ~39% smaller across the merged pair; nothing behavioural dropped.
- Two defects fixed: a hand-maintained system-file inventory that had gone stale (now a glob), and a contradictory archive-filename spec (now defers to `cortex-archive`).
- `.kiro/**` gate is its own row in the gate table; references repointed in `cortex-routing.md` and `readme.md`; readme budget table recomputed from measured bytes.
- **Pre-edit archiving removed entirely** — git is the history. Nothing under `cortex/`, `.kiro/`, or `.agent/` is snapshotted before a change; bump the version header and log.
- `cortex-archive` is a retirement skill only. Its description had claimed it fires before `.kiro/` edits, contradicting every other file — and skill descriptions are resident, so that shipped on every turn.

### Migrations
- **Purge stale rule mirrors.** `copier update` removes the two old files from `.kiro/steering/`,
  but the local `.agent/`/`.claude/` mirrors are copy-only (they don't delete). After updating,
  remove the stale mirror files if present:
  ```bash
  rm -f .agent/rules/cortex-pre-mod-check.md .agent/rules/cortex-log-protocol.md \
        .claude/rules/cortex-pre-mod-check.md .claude/rules/cortex-log-protocol.md
  ```
  Then re-run your mirror sync so `cortex-change-protocol` propagates. Consumers without an
  `.agent/`/`.claude/` mirror can skip this.
- **Leaving a stale file in place is not cosmetic.** Steering files are `inclusion: always`, so an
  orphaned `cortex-pre-mod-check.md` keeps injecting a contradictory archive-filename spec on every
  turn. Verify the purge.

---
## v3.1 — 2026-07-24
**`cortex-install` + `cortex-upgrade` merged into a single `cortex-setup` dispatcher.**

### Synced
- New skill `cortex-setup` replaces `cortex-install` and `cortex-upgrade`, detecting fresh-vs-existing from `PROFILE.md`; explicit user intent overrides detection.
- Skill bodies moved to `cortex-setup/references/install.md` and `upgrade.md`, loaded on demand.
- The two old skill folders removed; references repointed to `/cortex-setup` across `readme.md`, `copier.yml`, and the INSTALL markers.

### Migrations
- **Purge stale skill mirrors.** `copier update` removes the old skill folders from `.kiro/skills/`,
  but the local `.agent/`/`.claude/` mirrors are copy-only (they don't delete). After updating,
  remove the stale mirror folders if present:
  ```bash
  rm -rf .agent/skills/cortex-install .agent/skills/cortex-upgrade \
         .claude/skills/cortex-install .claude/skills/cortex-upgrade
  ```
  Then re-run your mirror sync so `cortex-setup` propagates. Consumers without an `.agent/`/`.claude/`
  mirror can skip this.

---
## v3.0 — 2026-07-17
**Context diet: reflexes resident, references on-demand. Clean-break baseline.**

> **Not automatically migratable from v2.x.** This is a new-install floor. Existing projects
> re-run `copier copy` + `/cortex-setup`; their LOG/AUDITED/INBOX/`cortex-tasks/` data is
> never templated, so history survives. The upgrade path applies from v3.0 onward.

### Synced
- Always-in-context slimmed to reflexes only; `router.md` + `REGISTRY.md` became on-demand. Bare-turn cost ~7k → ~4.8k tokens.
- `ROUTES.md` → `REGISTRY.md` (seed-once): YAML, one record per category, plus `docs` and `handlers`.
- `PROFILE.md` slimmed to §1 switches + §2 category names + Conventions. Concern, subdomain and category are now *derived*, not tabulated.
- `router.md` v5.0: one canonical `## Resolution` algorithm; consumers point at it instead of restating it.
- `agent-infra` category removed (covered by `cortex-infra`); permanent categories down to 2.
- `cortex-principles.md` added (8 taxonomy tenets); `cortex-router.md` wrapper removed; rule files inlined directly into `.kiro/steering/` and `cortex/rules/` removed.
- `cortex-install` rewritten to emit the slim PROFILE + REGISTRY; readme budget table corrected (skill bodies load on demand).

### Migrations
- **None (clean break).** Re-install rather than update. New/updated managed files land via
  `copier update`; the seed-once `REGISTRY.md` renders fresh (old `ROUTES.md` is obsolete).

---
## v2.2 — 2026-07-17
**New tracker template; doc changelog block.**

### Synced
- `cortex/templates/tracker-template.md` — new managed template: a living overview for any ongoing multi-part effort.
- `cortex/templates/generic-document.md` — optional Changelog table + a commented section library, so one template covers structured/technical docs.
- `cortex-organize` CREATE step now maps content type → template; `cortex-install` §1 switch guidance rounded out; readme templates note updated.

### Migrations
- None required. New/updated managed files land automatically on `copier update`.

---
## v2.1 — 2026-07-14
**Structural reorg: rules + skills architecture, copier distribution model.**

### Synced
- `cortex/readme.md` regenerated (replaces root `CORTEX.md`); `cortex/changelog.md` restructured into Synced/Migrations.
- `cortex/router.md` rewritten as pure dispatch; `cortex/rules/` (4 files) and `cortex/templates/` centralised.
- `.kiro/steering/` → 6 thin wrappers; `.kiro/skills/` → 11 self-contained folders (was workflows + procedures).
- Data renames: `INBOX.md` → `LOG.md`, `OUTBOX.md` → `AUDITED.md`, `cortex-inbound/` → `INBOX/`, `archive/` → `.archive/`.

### Migrations
- `PROFILE.md`: no schema changes from v2.0. No action required.
- `ROUTES.md`: new file — seeded automatically by `/cortex-setup`. Existing installs: create `cortex/ROUTES.md` with the stub from the template.
- Rename data files if upgrading from v2.0 pre-reorg:
  1. `mv cortex/INBOX.md cortex/LOG.md`
  2. `mv cortex/OUTBOX.md cortex/AUDITED.md`
  3. `mv cortex-inbound/ cortex/INBOX/`
  4. `mv cortex/archive/ cortex/.archive/`

---
## v2.0 — 2026-06-28
**Architecture overhaul: Kernel vs Profile.**

### Synced
- `PROFILE.md` introduced — the fence, and single source of truth for categories, concerns, subdomains, doc surface, switches and logging triggers.
- `router.md` reduced to dispatch, then reworked into a link registry (By Intent + By Category + Decision Tree + inbound entry point).
- Doc Registry replaced by a folder-based doc surface — "declare the fence, discover the flock"; frontmatter search auto-detected.
- `deep_ripple_scan` default flipped ON; "buckets" renamed to concerns; system procedures renamed `procedure-*` → `cortex-proc-*`.
- New `cortex-routing` rule and `cortex-route` workflow; `[needs-human-input]` redefined from a hard stop to a recorded outcome.

### Migrations
- **Migrate ROUTER → PROFILE**: extract categories, concerns (was buckets), subdomains, doc registry (→ recast as §5 folder surface), switches, and the category-by-location tables into `PROFILE.md`.
- **Rewrite router.md** as a link registry (By Intent / By Category / Decision Tree).
- **Rename system procedures** `procedure-*` → `cortex-proc-*` and re-point references.
- **Recast Doc Registry**: convert file lists into folder entries in PROFILE §5.
- **Rename buckets → concerns** in existing task folder paths (optional — old names still work).
- Copy the v2 kernel files (managed) over v1; PROFILE is seed-once (do not blind-copy).
- Existing LOG/AUDITED/task files are data — leave as-is.

---
## v1.x History (appendix)

> Preserved from the original changelog. Versions prior to v2.0 used a different upgrade mechanism (manual changelog-driven diffing).

v1.x established the initial Cortex system with router-based dispatch (flat category → procedure table), procedure-based workflows in `.agent/workflows/`, the INBOX/OUTBOX logging model, template-based task creation, and the Gardener loop for ripple detection.

The v2.0 release replaced this with the Kernel/Profile architecture. See the v2.0 entry above for migration steps.
