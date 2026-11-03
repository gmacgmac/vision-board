# READONLY_UI_01_edit-control: Read-only and Edit in the header

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With `readOnlyStart` on, the header always shows whether the ledger is read-only or being edited here, at all three
widths, with Edit and Stop editing beside the ledger; a refused Edit says who holds the ledger; every disabled write
control says why.

## Context

PLAN decisions 12, 13 and 16. READONLY_01's notes first: it gives `get_project` `readOnly` and `editing`, the
`edit_ledger` / `stop_editing` operations, the `read-only` problem and the page's widened read-only condition.
LEDGER_UI_01's notes: the ledger's page parts and its `ledger` row in `header-tier.ts`. Patterns (research):

- The Locked padlock: `apps/board/src/board/chrome/LockedChip.svelte` (padlock plus "Locked"); `styles/header.css`
  hides the word at a third (`[data-tier='third'] .vb-chip-locked .vb-chip-word`) and when crowded; `locked` is in
  neither `IN_MENU` nor `GONE`, so it stays in the bar at every tier. The read-only state does the same (decision 16).
- `ToolbarEnd.svelte` passes `SendButton` `paused` from `shown.locked`; `ToolbarMenu.svelte`'s Lock row (`isLocked`,
  `lockTip`). Gallery: `header-section.ts` (one sample `locked: true`), `lock-section.ts` `lockSection`. Specs:
  `tests/pages/lock-board.spec.ts`, `header-tiers.spec.ts`.
- The control is the standalone host's (the lock is the standalone server's): a page part beside the ledger's, so the
  plugin seam does not change. PLUGIN_RO_01 decides how a plugin host shows its own state.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (READONLY_UI_01, wave 5)
- **Files to reference**: `docs/specification/components.md` § The header by its own width, § the locked board;
  `docs/specification/words.md`; `packages/ui` chip and button patterns
- **Shared artifacts to reuse**: READONLY_01's operations, problem and condition; LEDGER_UI_01's page parts and table row
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **The state chip**: a chip after the ledger: an eye icon and "Read-only" while read-only, a pencil and "Editing"
   while this server holds the lock; the word hides at a third and when crowded, the icon never does. Its tooltip and
   accessible name say the whole state ("Read-only: press Edit to change this ledger"; "Being edited on <computer>
   since <time>" when another holds it).
2. **Edit and Stop editing**: Edit in the chip's menu and as a button where room allows at full; Stop editing in the
   same places while editing; both rows of "⋯" at a third. Pressing Edit shows loading, then Editing, or the
   holder's words in a toast (`notify`, tone error) and stays read-only. Keyboard and focus as the board picker.
3. **Every disabled control says why**: Send, flag, ✓/✗, notes, New board…, Rename board…, Lock board…: disabled with
   READONLY_01's reason as the tooltip, the way a locked board's are. Nothing is hidden that the person would look for.
4. **States**: idle, hover, focus, pressed, loading (Edit taking the lock), success (Editing), error (refused),
   disabled (the folder cannot be written: the reason from `get_project`, if READONLY_01 gives one).
5. **Gallery**: the chip in the three forms, read-only and editing, held by another; the Edit refusal.
6. **Specs**: `tests/pages/read-only.spec.ts` (new): opens read-only; every write control disabled with its reason;
   Edit then a write works; a second server holding the lock makes Edit say who; Stop editing returns to read-only;
   the chip present at 1400, 900 and 600 px; axe and APCA, light and dark; flag off shows no chip and writes as today.
7. **Docs** (`cortex-docs`): `components.md` (the chip, Edit and Stop editing, in each header form).
8. **Look**: in a browser at three widths, light and dark, with both flags on; screenshots in your notes.

## Validation

- [ ] `read-only.spec.ts`, `header-tiers.spec.ts`, `lock-board.spec.ts`, `ledgers.spec.ts` green (port 6700)
- [ ] `npm run verify`, `check`, unit green; gallery complete; axe and APCA pass; the look done

## Implementation Notes

_To be completed by the agent. Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Pending

### Changes Made
-
### Issues & Resolutions
-
### Caught Beyond the Brief
- None
### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-ui] READONLY_UI_01: …` → this file, one line ending in a newline); the return
block with `REQUESTS`. No commit.
