---
name: cortex-write-task
description: "Author cortex task file(s): a single self-contained task, or a multi-task set (PLAN + TASK-STATUS + individual task files). Use when asked to plan work, write it up as tasks, or break an effort into executable steps."
---

# Write Task

Author one or more task files to capture planned work. The scope determines which branch to follow.

## Branch Selection

- **Single task** — one self-contained file covers the work. Use when the effort is small, touches few files, and needs no orchestration.
- **Multi-task set** — a folder with PLAN.md, TASK-STATUS.md, and individual task files. Use when work spans multiple surfaces, risk profiles, or agents.

Pick the branch, then follow the steps below.

---

## Branch A: Single Task

1. **Determine category and concern** — pick the category from `PROFILE.md` §2; **derive the concern** from the category-name prefix (see PROFILE Conventions), unless `REGISTRY.md` declares a `concern` override. No category matches → flag for the user to register first.
2. **Create task file** — path: `cortex-tasks/{concern}/{YYYY-MM-DD}_{category}[_{subdomain}]_{task-title}.md`. Use the template at `cortex/templates/tasks/single-task-template.md`.
3. **Fill content** — problem statement, numbered steps, files involved, constraints, success criteria, references, implementation notes section.
4. **If the task creates documentation** — include a Pre-Task Requirements block: resolve per `router.md § Resolution`, confirm destination via the `REGISTRY.md` doc surface, use the `cortex-organize` skill for proper placement.
5. **Research variant** — if `type: research`, see `references/research-variant.md` for the research-task format additions (banner, research objectives, result file).

## Branch B: Multi-Task Set

1. **Determine category and concern** — same as Branch A.
2. **Create folder** — `cortex-tasks/{concern}/{YYYY-MM-DD}_{category}[_{subdomain}]_{title}/`
3. **Write PLAN.md** — use `cortex/templates/tasks/plan-template.md`. Problem, solution, key changes, dependencies.
4. **Write TASK-STATUS.md** — use `cortex/templates/tasks/task-status-template.md`. Frontmatter, task table, implementation notes sections.
5. **Write individual task files** — use `cortex/templates/tasks/task-template.md`. Name format: `[TYPE]_{##}_{task-title}.md`, where `[TYPE]` marks the work type and drives agent assignment: `BE` (Backend), `FE` (Frontend), `VERIFY` (Verification), `MANUAL` (Human action), or a generic `T` when the work is a single stream with no separate-agent split. Break work down along the FE/BE boundary — separate agents may complete those tasks. Include a final `VERIFY_01` task that tests the implementation (targeted, not a generic `npm test`). Each file: objective, inputs, steps, validation, notes section.
6. **Assign waves** — fill the `Wave` column in TASK-STATUS.md and the Shared Foundations table. This is the planner's call, not the executor's: the orchestrator reads only PLAN.md and TASK-STATUS.md, never task files. Unassigned waves mean it must guess.
7. **Apply granularity heuristics** — before finalising, run the split-vs-merge and wave self-checks (see `references/granularity.md`).

---

## Naming Rules

- Separator is `_` (underscore), even though categories contain `-` (hyphen).
- Task title is REQUIRED — never omit it.
- Research tasks include `research` in the filename.

## Your Role (planner)

You are the planner/architect: provide instructions, file references, and function names for reusability, and keep executing agents focused on the bigger picture. **Do NOT create READMEs or Reference Guides** — all information goes in PLAN.md, TASK-STATUS.md, and the task files.

Reuse only works if you wire it up. An agent can find a pattern that already exists in the repo — point it there. It cannot see a pattern a sibling task is building right now; sub-agents run blind to each other. Anything this set creates and then reuses must be named in Shared Foundations and ordered by wave, or every consumer builds its own copy.

## Constraints (include in every task file)

- If deviation needed, collaborate with user — do not make breaking changes silently.
- No PII in examples.
- No git commits during execution.
- Update task file with implementation notes on completion.

## On Finishing Authoring (this skill's own completion)

- This skill writes task file(s) — it does not execute them. Authoring the file(s) is not
  a loggable event.
- Do NOT log to `LOG.md`. Logging `status: completed` / implementation notes / a `LOG.md`
  entry happens when the task is later *executed* (see `cortex-task-exe`), not when it is
  written.
