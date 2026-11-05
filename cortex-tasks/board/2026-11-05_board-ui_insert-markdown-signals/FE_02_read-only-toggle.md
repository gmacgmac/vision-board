# FE_02_read-only-toggle: Read-only as one toggle

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Flag**: `readOnlyToggle`

## Objective

The header's read-only menu becomes one toggle button that shows the current state ("Read-only" or "Editing") and
flips on a press (PLAN Decision 11).

## Context

D-085: a ledger opens read-only; Edit takes the ledger's lock, Stop editing gives it back. Today a chip opens a menu
(`apps/board/src/shell/EditChip.svelte`, `shell/editing.ts`, words `shell/words/editing.ts`), placed through
the header (`board/chrome/{Toolbar,HeaderFields}.svelte`, `header-tier.ts`, `board/host.ts`).

## Inputs

- The files above; a toggle-button pattern in `packages/ui` (`aria-pressed`) if one exists: reuse it; none fits:
  `BLOCKED` with the options, the maintainer chooses (principles § Component model)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing page tests first: one press goes to Editing (lock taken), one more back to Read-only; a refused lock
   (another server holds it) leaves it Read-only and says why, as the menu does today; keyboard (Space, Enter),
   `aria-pressed`, its name; every header tier (full, half, third, and inside "⋯" where it lives there).
2. The toggle; the menu removed under the flag; words in `shell/words/editing.ts`.
3. Gallery: both states, the refusal, light and dark; axe and APCA.

## Validation

- [ ] `tests/pages/{read-only,read-only-writes,read-only-controls,header-tiers}.spec.ts` + yours, light and dark;
      a look at 1400, 900, 600 px; `check`; `npm test`; flag off = the menu as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind your flag (PLAN Decision 12), on by default; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

### Run 1 (2026-11-05, Opus 5.5, worktree `feat/fe-02`)

**Changes Made**
- `apps/board/src/shell/EditChip.svelte`: with `readOnlyToggle` on (`editing.ts` `toggleOn`), the chip is one toggle with no
  menu: the same chip classes (so `styles/editing.css` and `header.css` place it, shrink its word and ring it as before),
  its icon and word the state (Read-only / Editing, "Opening for editing…" / "Stopping…" while busy), `aria-pressed`
  (pressed = Editing), its name **Edit** whatever the state (APG: a toggle's name never changes; "press Edit" in the
  existing refusal words stays true for screen readers and voice control), its tooltip the state and what a press does
  (its description). Busy: spinner, aria-busy, aria-disabled, focus kept, a press does nothing. Flag off: the menu as it was.
- `apps/board/src/shell/editing.ts`: `toggleOn`, `toggleTip`; `toggleEditing(refused)` takes the refusal's words
  (default Edit's, so the old chip, the button and the row are unchanged).
- `apps/board/src/shell/words/editing.ts`: `toggleReadOnlyTip`, `toggleHeldTip`, `toggleEditingTip`, `toggleRefused`.
- `apps/board/src/board/chrome/Toolbar.svelte`, `HeaderFields.svelte`: under the flag no Edit button at full and no Edit
  row in "⋯" (one control); `host.ts` documents it on `editChip` / `editButton`.
- `apps/board/src/gallery/editing-section.ts`: flag on, `toggleGroups` (three forms read-only and editing, the toggle at
  rest/hover/focus/pressed in both states, busy both ways, held by another computer, the refusal); flag off, `menuGroups`
  (exactly the old samples).
- `tests/pages/read-only-toggle.spec.ts` (new, 13 tests, written failing first) + its two screenshots;
  `tests/pages/read-only.spec.ts` pinned to `-readOnlyToggle` so it keeps proving the old menu, its screenshots unchanged.

**Verification** (normal tier)
- `read-only-toggle`, `read-only`, `read-only-writes`, `read-only-controls`, `header-tiers`, `board-chrome`: 63 passed;
  `gallery`, `app-gallery`: 20 passed. `npm run check` 0 errors; `npm run build` + `npm run verify` ok; `npm test` 2367 + 14 pass.
- APCA (spec log): light word 95.1 / icon 95.1 read-only, editing word 95.1 / pencil 62.6, hovered pencil 56.2;
  dark word 93.8 / icon 93.8, editing pencil 46.6, hovered pencil 44.8 (tiers 60 / 30). Axe clean at 1400, 900, 600 in both themes.
- Browser look on a scratch read-only server (port 7499, scratch HOME and project): 1400 light and dark, 900 light, 600 dark;
  pressed both ways at each; the gallery's toggle section viewed in light and dark.

**Caught Beyond the Brief**
- The "on" look is the chip's existing Editing look (accent ring line, accent pencil, the word). The base toggle pattern's
  "on" (`#ui` button.css `.vb-btn[aria-pressed='true']`) also fills accent-soft; in dark the Editing ring is faint, so on
  and off differ mostly by icon and word. A fill would need `apps/board/src/styles/editing.css` (not owned): REQUEST.
- Label in name (WCAG 2.5.3): the visible word (Read-only / Editing) is not the name (Edit). Chosen on purpose (APG's
  constant-name rule, and "press Edit" across the refusal words); the alternative is the name following the word with no
  aria-pressed. Maintainer's call.
- Each container's own "Edit" button (rail) shares the name Edit with the toggle in the accessibility tree; the old Edit
  button shared it too.
- "press Edit" sentences outside this task (`#actions` `readOnlyPressEditTo`, `server/words/server-folders.ts`,
  `SKILL.md`, the docs) read right for a screen reader (the toggle's name is Edit) but a sighted person sees "Read-only".
- `docs/specification/components.md` (EditChip, EditButton paragraphs) does not yet describe the toggle (not owned).
- The gallery section's meta line says readOnlyStart is "off by default" (it is on); left as it was under the flag off.

**Deviations**: none from the PLAN. `EditButton.svelte` and `page-parts.ts` (not owned) are untouched: the header simply
does not draw the button or row under the flag.

### Run 2 (2026-11-05, FE_02-R1: `apps/board/src/styles/editing.css` granted)

- `editing.css`: `.vb-chip-editing[aria-pressed='true']` (and `:hover`) takes the base toggle pattern's on fill,
  `--vb-accent-soft`, the fill `.vb-btn[aria-pressed='true']` uses (`#ui` button.css). That fill is the accent pink's soft
  tint: it is the pattern, so used; the pattern's accent border and accent ink are not (the ring stays `--vb-accent-line`,
  the word the strong ink, Lc 60), given the maintainer's dislike of pink edges. On and off now differ clearly in dark.
- Gallery "Editing" group text names the fill. Screenshots `read-only-toggle-{light,dark}` re-taken (the change was under
  Playwright's default pixel threshold, so re-taken with `--update-snapshots=all`).
- APCA on the fill: light word 93.8, pencil 61.2; dark word 94.2, pencil 47.0 (tiers 60 / 30). `read-only-toggle` +
  `read-only` specs: 27 passed (the flag-off screenshots unchanged).

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-app] FE_02: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_02_read-only-toggle.md]]`, ending in a
newline; the return block.
