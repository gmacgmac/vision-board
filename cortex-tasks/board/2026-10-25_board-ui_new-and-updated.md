---
task_name: New And Updated Cards Easy To Find
created: 2026-10-25
completed:
status: pending
categories: [board-ui]
type: implementation
model: strong
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: New and updated cards, and the containers holding them, are easy to find

> **Source**: maintainer, chat 2026-10-25 (points 71-94; 78, 80, 86, 88 approved; container rule in
> the maintainer's words below) · **Branch / worktree**: `feat/tool-rail-and-examples` in `.claude/worktrees/tool-rail`

## Problem Statement

On a large board the person can't find new or updated cards: NEW is a small tab, "N updates" is a grey
tab that only turns pink on hover, nothing marks the container, and the toolbar's "N open" list holds
only unanswered asks. All the facts already exist in the condition registry
(`packages/actions/src/conditions.ts`, D-033: `item.new`, `item.unseen`); nothing shows them at board scale.

## Design (approved)

1. **Card tabs.** NEW unchanged (filled `--vb-accent-soft`, `--vb-accent` text). "N updates" (`item.unseen`)
   gets the pink outline and pink text at rest, no fill (`packages/ui/src/node/node-popover.css`
   `.vb-node-btab`). Hover, pressed, focus as today.
2. **No round clearing.** `item.new` ends only when the person engages with the card (selects it, or any
   act naming it): drop `'round'` from its `clearedBy` and from its `derive` (`inLatestRound`), so the
   chat panel's Send and an MCP agent behave the same. Update its `trueWhen` / `endsWhen` text and
   api.md. Check what else reads `ClearedBy 'round'` / `inLatestRound`; remove only what becomes dead.
3. **Container highlight, derived, no ledger change** (maintainer: "if even just one of the new or
   updated nodes is clicked, that deactivates the container"). A container is fresh when it holds a
   card that is `item.new` or `item.unseen` and the newest such change is after the person's latest
   engagement with any card in it (`LedgerState.looked`, card id -> seq of their latest seen or act).
   One new registry row, `container.fresh` (about `container`, audience `person`, shows `container`,
   clearedBy `select` / `act`), so the border, the pill and the list read one definition (registry
   rule: never a local check). Clicking the frame's empty space does not clear it (nothing is stored).
4. **Look.** New token `--vb-state-fresh` (teal, light and dark; approved, point 88) and its `-soft`
   mix, in `packages/tokens/src/tokens.css` beside the other `--vb-state-*`. A fresh container's border
   takes it, two or three steps brighter than the plain `--region` line; a pill on the title line after
   the count: "3 new · 1 updated" (teal text on `-soft`), hidden when zero, following the label's
   existing shrink order (it leaves whole, like the holders). APCA: border Lc >= 30, pill text >= 45,
   light and dark, measured and recorded.
5. **"N new" chip.** Beside "N open" (`apps/board/src/shell/Toolbar.svelte`), reusing
   `OpenChip.svelte` / `MenuSelect.svelte` (one dropdown pattern; generalise `OpenChip` rather than copy
   it): rows "46 · title", updated ones end "· updated", board order; picking one goes to the card as
   Go to card does (`go-to-card.ts`). Rows from the registry (`item.new` + `item.unseen`) via one
   function in `packages/actions` beside `openCards`, so count and list never disagree. Hidden at zero.
6. **Flags.** One flag, `freshCards`, on by default, for 1, 3, 4, 5; off = today. Point 2 is a fix to
   the rule, not behind the flag.

## Steps

1. Tests first: actions unit tests (`container.fresh` true / cleared by a seen or act on any card in
   it; `item.new` survives a Send and a redraw); page tests (tab looks, border and pill, list and pick,
   clear on click, axe, flag off).
2. Registry and actions (2, 3, the list function). Don't grow `fold.ts` (308 lines): read `looked`.
3. Tokens, card tab, container border and pill (`packages/ui/src/region/*`, `node-popover.css`).
4. Toolbar chip.
5. Gallery entries (tab states, fresh container, chip), `pattern.json` states, api.md (item.new, the
   new row), `components.md`, via `cortex-docs`. Look at it in a browser, light and dark.

## Constraints

- **DO NOT** change the ledger format or any schema. **DO NOT** touch the group-note task's files
  (`apps/board/src/board/notes.ts`, `note-*.ts`, `packages/ui/src/node/node-notes*`, `skills/`); it runs in parallel.
- Page tests on `VB_TEST_PORT=4590` under `temp/pages.lock`; never port 4466. No git commits.
- Files over 300 lines: split, never squeeze. Writes over 50 lines in chunks. No PII.
- **STOP** and report if `item.new` without rounds would mark old cards new on existing boards (check a
  real-shaped fixture), or if the teal can't meet its APCA tiers.

## Success Criteria

- [ ] Updated tabs pink-outlined; NEW unchanged; NEW survives Send and redraw until engaged
- [ ] Fresh containers: teal border and pill; clear when any of their cards is engaged
- [ ] "N new" lists new and updated cards and goes to each; count = list = tabs (one definition)
- [ ] APCA numbers recorded; axe passes; flag off = today
- [ ] `npm test`, `npm run verify`, `npm run check`, changed page specs pass; docs and gallery updated

## Implementation Notes

_To be completed by agent after task execution._

## On Completion

1. Frontmatter `status: completed`, `completed:` date.
2. Append one LOG line: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed: New And Updated Cards Easy To Find → Task: [[cortex-tasks/board/2026-10-25_board-ui_new-and-updated.md]]`
3. Do not write to `AUDITED.md`.
