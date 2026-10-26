# ARCH_06_feature-folders-and-functions: Feature Folders And Short Functions

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

`apps/board/src/board/` is organised by feature, each folder with one public file; no function runs far
past ~50 lines; small helpers have one home.

## Context

Review §10 and §11. `apps/board/src/board/` is flat (76 files, ~8,100 lines). Closure factories hide long
functions: `createBoard` 222, `createChatPanel` 221, `createNoteFlow` 215, ui `bindNoteParts` 199,
`bindModeRow` 196, `bindPointer` 179, `createCardSet` 154, server `openChats` ~155, `createSupervisor`
~145 (re-measure: earlier waves moved code). `io.ts` (301) does six jobs; `write-board.ts` two. Copied
helpers: `isRec` ×9 (`packages/mcp` exports `isRecord`), plural `n === 1 ? '' : 's'` ×10, the server's
`real()` ×2, the 32-byte token ×3, the constant-time compare ×2, raw `localStorage` in
`shell/Toolbar.svelte` and `flags.ts` instead of `shell/kept.ts`.

## Inputs

- **Files to modify**: `apps/board/src/board/**` (moved into folders), the long functions' files,
  `apps/board/src/board/io.ts`, `apps/board/server/write-board.ts`, the helper copies, `scripts/verify.mjs`
  (the function-length warning), their tests; `apps/board/README.md` (§ layout, via `cortex-docs`).
- **Shared artifacts to reuse**: everything earlier waves built (TASK-STATUS Shared Foundations).
- **Skills**: `cortex-architecture` (rules 2, 3), `cortex-docs`.

## Steps

1. [ ] **Feature folders**: `canvas/`, `cards/`, `notes/`, `selection/`, `links/`, `apps/` (adjust to
   what the code shows; say why), each with a public file; outside code imports only that. The board's
   `mount` (ARCH_03) stays the one way in from a host; the standalone host's own parts (its chat panel,
   folder switching) sit apart from the board's. The server's `engine/` (ENGINE_01) keeps its public file.
2. [ ] **Split** each long factory at its seams into named functions or modules; `io.ts` into `io/`
   behind `io.ts` (skill rule 3); `write-board.ts`'s retry-key replay into its own file.
3. [ ] **Helpers**: one home each (`packages/format` for `isRecord` and plural; the server's in one
   server util module); `localStorage` only through `kept.ts`. Where D-037 allows a copy across a hard
   boundary, a parity test instead.
4. [ ] **Verify**: warn on a function over ~50 lines (count factory closures' inner functions on their
   own), with the same `long-file` style escape; tests for it.

## Validation

- [ ] No function over ~80 lines without a reason in its header; the warning list recorded
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
   `[[YYYY-MM-DD HH:MM]] [board-app] ARCH_06: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_06_feature-folders-and-functions.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
