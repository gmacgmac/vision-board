---
skills: [cortex-architecture]
---
# FIX_01_conversation-and-import-polish: The Whole Conversation Imported, a Tidier Conversation Box

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

PLAN.md § Kickoff answers, points 615-619. Right-sized: the most direct way, no machinery; reuse what exists.

## Steps (each starts with a failing test)

1. **The whole conversation imported (617)**: whoever imports, every note and reply in the file comes in, each line
   keeping its original author (one optional field on an imported note or reply line, e.g. `from`, in ledger 22: no
   new format). The person's import may write imported replies; an agent's import may write imported notes. Answers and
   pins stay as D-108 says. The thread draws one "Imported" divider after the last imported message (words file), no
   per-message icon.
2. **The import reply's dropped list for a person**: a person-worded form beside the agent's pointer-first one (one
   home per sentence, `packages/format/src/words/`), the page showing the person's.
3. **Print light or dark (615)**: one choice in the Print dialog, default the screen's theme; the print view sets the
   theme for print only.
4. **The board's one scrollbar (618)**: a skinny thumb at the scroller's far right edge, always visible, no rail, CSS
   only (`scrollbar-width: thin` + `scrollbar-color`, and `::-webkit-scrollbar` for nclite's WebKit), one rule for every
   board scroller (thread, history list, menus, node bodies). Look at nclite's `app/src/styles/overlay-scroll.css`
   (`/Users/dev/AI/nclite`, read only) for its look; do not port its script.
5. **The conversation box (618-619)**: the thread scrolls the box's full width; its own padding gives a gap between the
   bubbles and the scrollbar and a little more room on the left. Labels: "User" (the note's number in the hover);
   "Agent · <name> <id>" on one line, no wrap; when the name is cut, an ellipsis and the full name on hover. No "Asked
   now" or "Sent"; "Not sent" only when the note has not reached an agent. Words in the note-bubble words file.
6. Docs (`components.md`, `api.md` for the imported author), gallery states, both skins light and dark.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=9010`. Page specs with
`--config tests/pages/playwright.config.ts`; renew only baselines this changes and say which. A try-out board runs on
6611: leave it.

## Validation

`npm run check`, `gen -- --check`, `verify`, `npm test`, `test:plugin`, the conversation, history, notes, board-files and
gallery specs; a look in a browser, light and dark, both skins.

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_01: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/FIX_01_conversation-and-import-polish.md]]`

## Implementation Notes

**Status**: Pending
