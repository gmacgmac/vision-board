# ARCH_03_board-host-interface: The Board Is Hostable

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The board mounts in any host through one interface, with no import of the standalone app's shell and no
hidden module-level state, so nclite can host it as a plugin.

## Context

Review §2 and `docs/principles.md` § The board is a plugin. Eleven board modules (`controller.ts`,
`boards.ts`, `attention.ts`, `access*.ts`, `proposal-flow.ts`, `lock-flow.ts`, `versions.ts`,
`remove-flow.ts`, `toolbar-counts.ts`, `folder.ts`) import `apps/board/src/shell/shell.svelte.ts` (a
Svelte `$state` object, `toast`, `askConfirm`); `io.ts` holds a module-level `createClient()`;
`flags.ts` `pageFlags` reads `location` and `localStorage`. In nclite the host supplies the folder, the
chat, notices and confirmations; the board keeps its ledger.

## Inputs

- **Files to modify**: `apps/board/src/board/**` (the modules above and their callers),
  `apps/board/src/shell/shell.svelte.ts`, `apps/board/src/main.ts`, `apps/board/src/gallery/main.ts`,
  `apps/board/src/App.svelte` and shell components that read board state, their tests.
- **Shared artifacts to reuse**: typed client (ARCH_02), base menu/dialog/layer (UI_01), moved queries
  (ARCH_04), module names (ARCH_01).
- **Skills**: `cortex-architecture` (rule 5: one layer, one interface).

## Steps

1. [ ] **The interface**, plain TypeScript in `apps/board/src/board/host.ts` (or the board's public
   file): the I/O client, `notify`, `confirm`, flags, a key-value store, the folder, the chat link (send
   the person's answers to the agent; hear its turn end), and a small observable the board writes its
   shell-facing state to (counts, versions, open lists). No Svelte type crosses it.
2. [ ] `createBoard(els, host)`: every listed module takes what it needs from the host (passed down, not
   imported); `io.ts` and `flags.ts` stop being module singletons.
3. [ ] **The standalone app is one host**: the Svelte shell implements the interface and renders from the
   observable; behaviour and pictures unchanged.
4. [ ] **A test mounts the board with a fake host** (no Svelte, no server): draws a fixture board, a
   Send reaches the fake chat link, a confirm goes through the fake `confirm`.
5. [ ] `verify`: no file under `apps/board/src/board/` imports `apps/board/src/shell/` (a test for it).
6. [ ] Note in `docs/specification/components.md` (via `cortex-docs`): the host interface and what nclite
   must supply.

## Validation

- [ ] `grep` finds no `shell.svelte` import under `apps/board/src/board/`
- [ ] The fake-host test passes; no screenshot changes
- [ ] `npm test`, `npm run verify`, `npm run check`; the full page specs for the board, toolbar, chat and gallery on your port

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
   `[[YYYY-MM-DD HH:MM]] [board-app] ARCH_03: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_03_board-host-interface.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
