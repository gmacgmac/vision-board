# ARCH_03_board-host-interface: The Board Is Hostable

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The board mounts in any host as `mount(root, host)`, in the shape of nclite's plugin contract, with no
import of the standalone app's shell, no hidden module-level state and nothing left behind on `unmount`.

## Context

Review §2, `docs/principles.md` § The board is a plugin, and PLAN § The Plugin Contract (nclite draft
v0.1, `~/ai/nclite/docs/plugins.md` § The view and its host; the spike's `public/host/plugin-host.js`
is a working host; read only). Eleven board modules (`controller.ts`, `boards.ts`, `attention.ts`,
`access*.ts`, `proposal-flow.ts`, `lock-flow.ts`, `versions.ts`, `remove-flow.ts`, `toolbar-counts.ts`,
`folder.ts`) import `apps/board/src/shell/shell.svelte.ts` (a Svelte `$state` object, `toast`,
`askConfirm`); `io.ts` holds a module-level `createClient()`; `flags.ts` `pageFlags` reads `location` and
`localStorage`; the page's change feed is its own `EventSource` (`io.ts`). In nclite the host supplies
the routes, the change events, the chat, settings and notices; the board keeps its ledger.

**The contract may bend to the board** (maintainer, 2026-10-26): build the shape the board needs, and
list each difference from the draft under `REQUESTS` for nclite. Known ones: `confirm` (the board asks
first in four places: removing cards or containers with a list, Accept all, removing access, discarding
a note); a change event carrying the board and the ledger head.

## Inputs

- **Files to modify**: `apps/board/src/board/**` (the modules above and their callers),
  `apps/board/src/shell/shell.svelte.ts`, `apps/board/src/main.ts`, `apps/board/src/gallery/main.ts`,
  `apps/board/src/App.svelte` and shell components that read board state, their tests.
- **Shared artifacts to reuse**: typed client with its transport (ARCH_02), base menu/dialog/layer
  (UI_01), moved queries and the `Chip` type (ARCH_04), module names (ARCH_01).
- **Skills**: `cortex-architecture` (rule 5: one layer, one interface).

## Steps

1. [ ] **The host interface**, plain TypeScript in the board's public file, in the contract's shape:
   `api(path, init)` (the typed client's transport), `events(listener)` (`{ plugin, ref }`, the ref
   carrying the board and the ledger head), `addToChat(chip)`, `settings.get` / `settings.on`,
   `notify(text)`, and `confirm({ heading, body, confirm, list? })` (the board's addition). Nothing
   else: what the shell shows of the board (counts, versions, open lists) comes out through a small
   observable the board returns, not in through the host. No Svelte type crosses it.
2. [ ] **`mount(root, host)`** → `{ unmount, pageChip, reveal }`: it builds the board's elements inside
   `root` (no `document` ids, no element outside `root` other than the top layer of a modal dialog);
   `unmount` removes every listener it added on `document` or `window` and empties `root`; `pageChip`
   is the board shown now; `reveal(ref)` goes to a card or note as the Go to card box does. Every module
   takes what it needs from the host (passed down, not imported); `io.ts` and `flags.ts` stop being
   module singletons; flags are read through `settings`, with today's defaults.
3. [ ] **Send is `addToChat`**: the board hands the host chips; its own chat panel is the standalone
   host's, not the board's.
4. [ ] **The standalone app is one host**: the Svelte shell implements the interface (`api` on `fetch`,
   `events` on today's `EventSource`, `settings` on `?flags=` and `kept.ts`, `addToChat` into its chat
   panel, `confirm` with the shared dialog) and renders from the observable; behaviour and pictures
   unchanged.
5. [ ] **Tests with a fake host** (no Svelte, no server): draw a fixture board; a Send reaches the fake
   `addToChat`; a removal goes through the fake `confirm`; an event redraws; two boards mounted on one
   page work apart; after `unmount` the root is empty and no listener remains.
6. [ ] `verify`: no file under `apps/board/src/board/` imports `apps/board/src/shell/` (a test for it).
7. [ ] Note in `docs/specification/components.md` (via `cortex-docs`): the host interface, what a host
   supplies, and each difference from nclite's draft.

## Validation

- [ ] `grep` finds no `shell.svelte` import under `apps/board/src/board/`
- [ ] The fake-host tests pass; no screenshot changes
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
