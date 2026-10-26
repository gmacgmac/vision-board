# ARCH_05_words-files: Words Files

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Every sentence a person or an agent reads lives in a words file for its area, never in the code that
shows or sends it, and a test keeps it so.

## Context

`cortex-architecture` rule 7 and `references/words.md`; `docs/principles.md` § Architecture we adopt.
Today screen text sits in Svelte and TS templates, refusals in server handlers, MCP instructions in
`packages/mcp/src/info.ts`. Tool and parameter descriptions are already one source
(`packages/format/schema/openapi.json`, D-056): declare it a words home, don't move it.

## Inputs

- **Files to modify**: any file that holds a sentence a person or agent reads (`apps/board/src/**`,
  `apps/board/server/**`, `packages/ui/src/**`, `packages/mcp/src/**`, `packages/cli/src/**`), new words
  files, one project doc listing every home (`docs/specification/words.md`, via `cortex-docs`), its test.
- **Shared artifacts to reuse**: module names (ARCH_01), `packages/testing` (TEST_01).
- **Skills**: `cortex-architecture` (rule 7, `references/words.md`), `cortex-docs`.

## Steps

1. [ ] **Homes**: one words file per area (a screen or feature) in each part that sends text (page, ui
   patterns, server, MCP, CLI); shared text in one file both can import. List every home, with the
   reason for any file that can't import words (HTML, a config), in `docs/specification/words.md`.
2. [ ] **Move the sentences**, area by area; code imports them. Keep each sentence word for word (this
   task changes no wording); fix only a sentence said two different ways for one thing, and list those.
3. [ ] **The test**: the doc's list and the code agree both ways; a user-facing string literal outside a
   words home fails (with the reference's allowed exceptions: ids, keys, CSS, log lines).
4. [ ] Screenshots unchanged.

## Validation

- [ ] The words test passes and fails on a planted literal
- [ ] No screenshot changes; `npm test`, `npm run verify`, `npm run check`; the full page specs on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-app] ARCH_05: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_05_words-files.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
