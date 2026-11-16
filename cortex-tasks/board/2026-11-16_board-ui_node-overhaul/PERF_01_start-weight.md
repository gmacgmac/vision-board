# PERF_01_start-weight: Room in the Start Weight

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

After T_01 the board page is 200.7 KB gzip at start against its 200 KB budget (D-049), and FE_01, FE_02 and the
skins will add more. Make lasting room by moving code the person does not need to open a board out of the start
bundle, behind `import()`. Target: 185 KB or less at start, so the overhaul has room. The budget does not move
(`docs/specification/performance.md`: "A budget is met by moving weight, never by moving the line").

## Inputs

- **Files to modify**: `apps/board/src/` (only to turn static imports of rarely used parts into `import()` with a
  small loading state that belongs to the part's pattern), `docs/specification/performance.md` (record what moved
  and the new figure), the page specs that cover a moved part if they need to wait for it
- **Not yours**: `packages/tokens/`, `apps/board/plugin/`, `apps/board/server/`, `apps/board/vite*.config.ts`,
  `packages/format/` (other wave-3 tasks own them). Need a change there: `REQUESTS`.
- **Reference**: `scripts/verify.mjs` (`PAGE`, `pageAssets`), D-049, `shell/chat-view.ts` (the existing lazy chunk)

## Steps

1. [ ] `npm run build`, then measure what the start bundle holds, by module (a source-map or rollup stats look in
       `temp/`). List the 15 largest parts in your notes.
2. [ ] Pick parts that a board does not need at first paint and that open on a person's action: for example the
       gallery sections, history, menus and dialogs, the app window and app stage, the settings and folder
       dialogs, attachments and image viewers. Never the node, the board, the toolbar, the ledger fold or the
       live connection.
3. [ ] Move them behind `import()`, one at a time, keeping every state: the first open shows the part's own
       loading state, no flash of nothing, no lost click or key, works offline (the chunk is local).
4. [ ] Run the page specs for each moved part, then all checks. Record the before and after weights.

## Validation

- [ ] `npm run verify` passes; the page is 185 KB gzip or less at start
- [ ] `npm test`, `npm run check`, and the page specs for every moved part pass with no new baselines
- [ ] A test or the verify check holds that the moved parts stay out of the start bundle

## Constraints

- Deviation: stop and tell the maintainer. No PII. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state. Flags stay off by default.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes, update your TASK-STATUS row, and append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] PERF_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/PERF_01_start-weight.md]]`
