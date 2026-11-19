# FIX_02_verify-findings: VERIFY_01's Must and Should Fixes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Fix what VERIFY_01 found that needs no new ruling, before the maintainer tries `?flags=timeline`
(VERIFY_01_testing.md § Implementation Notes has the evidence).

## Steps (each fix starts with a test that fails before it)

1. **Docs behind D-106 (M1, blocking)**: `docs/specification/api.md` (the timeline item: `side` is `above`, `below`,
   `left`, `right`; the layout fills the block now) and `packages/format/schema/api/show-layout-response.schema.json`
   `$defs.timeline` descriptions (run down: the line runs down the middle, cards alternate left and right, the first
   left); `npm run gen`. Grep the docs and the skill's built references for "beside", "down the left", "until then".
2. **The date in the accessible name (S3)**: a dated card's accessible name carries its full date (the same full form
   `timelineLabel` gives, from the words file), e.g. "Item 6, Action, 13 October 2026: Pricing page live, Open".
   `packages/ui` `nodeLabel` and its words; unit test and the timeline page spec's axe/name check.
3. **No text selection from a drag on a dated card (S4)**: a press-and-drag on a dated card's top edge (or anywhere a
   drag would start on an undated card) selects no text across cards and copies nothing; text inside a card stays
   selectable as on any card. Fix where the drag is refused (`apps/board/src/board/input/pointer.ts` `DATED`) or in the
   node CSS, whichever matches how an undated card's drag prevents selection. Page test.

## Where

`.claude/worktrees/app-window`, branch `spike/stage-apps`. `VB_TEST_PORT=8210`. Page specs with
`--config tests/pages/playwright.config.ts`. Files: those named above, their tests, words files.

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`, `npm run test:plugin`, `timeline.spec.ts` and
the specs that cover node names (`node-edges`, `command-lens`, `gallery`).

## Constraints

No git commands that change state. No PII. Deviation: stop and report. Budgets never block: report measured numbers.
Never git-add a snapshot.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FIX_02: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/FIX_02_verify-findings.md]]`

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-19 00:43  
**Where**: `.claude/worktrees/app-window`, `spike/stage-apps`, `VB_TEST_PORT=8210` (plugin 8230). No git state changed.

### Each fix, test first
| # | Failing test first (failed before, passes after) | Fix |
|---|---|---|
| M1 | `apps/board/tests/api-layout-timeline.test.ts` "the schema and api.md describe the line the layout draws, across and down (D-106)": the `side` enum, `$defs.timeline` and its `direction` description say "down the middle", never "down the left", and "alternating left and right, the first on the left"; api.md 194 names every side and says no "beside" or "until then" | `show-layout-response.schema.json` `$defs.timeline` and `direction` descriptions; api.md 194 rewritten (sides by form, D-106, the layout fills it, the tests that keep it true); `npm run gen` (only `api-reference.md` changed) |
| S3 | `packages/ui/tests/node-core.test.ts` "a dated card's name carries its full date after its kind" (day, month, year, time, selected; an app card none); `timeline.spec.ts` "a dated card's name carries its full date ...; flag off ... does not" | `node-core.ts` `nodeLabel` adds `datedOf` + `timelineLabel(...).full` after the kind; the words in `words/node.ts` `dateInName`. "Item 6, Action, 13 October 2026: Pricing page live, Open" |
| S4 | `timeline.spec.ts` "a drag where an undated card would move selects no text on a dated card, in both skins; its text stays selectable" (failed with "SEP 1515 SEPTEMBER 2026 / DECISION· / Freeze the feature list / OCT 2026OCTOBER 2026 ..." selected) | `pointer.ts`: a press on a dated card's plate, its frame outside the content, or the content's own box (`.vb-node-content` padding and gaps, `CONTENT`) is a `bare` press: `selectstart` is refused, as for a move, and an old selection is cleared. A press on an element inside the content (title, date, body) selects text as on any card |

Docs kept true: `components.md` § The timeline items 2 (the name) and 8 (the bare press); `node/pattern.json` `aria-label`.
No other spec's expected names changed: no spec outside `timeline.spec.ts` names a dated card (grep of `node-edges`,
`command-lens`, `gallery` for `Item N, Kind:` and accessible-name checks on dated cards).

Grep for "beside", "down the left", "until then" over `docs/`, `skills/vision-board/` (source and built): the only
timeline hit left is the skill's `references/timeline.md` "Its undated cards draw below the line (beside it when it
runs down)", which is true (569C: the other nodes to the right), so the skill is unchanged and `eval:bot` was not needed.

### Validation
| Gate | Result |
|---|---|
| `npm run check` | 0 errors, 0 warnings |
| `npm run gen -- --check` | current |
| `npm run verify` | ok, 45 warnings (`pointer.ts` 332 lines, `timeline.spec.ts` 450: warnings, under 500) |
| `npm test` | 2,722/2,722; timing 15/15 |
| pages: `timeline`, `node-edges`, `command-lens`, `gallery` | 59 passed (1.4 min); no screenshot renewed |
| `npm run test:plugin` | 116 passed |

**Budgets** (never blocking; raised to measured, per PLAN § House Rules): board page 206.01 KB gzip (210,959 B) over
206.0, raised to 206.1 (`scripts/verify-weight.mjs` `PAGE`, `performance.md`); plugin `view/board.js` 200,390 gzip over
200,300, raised to 200,400 (`plugin-build.test.ts` `BUDGET`). About 94 B gzip for the two fixes.

Look in a browser: nothing visible changed (a name and a selection); the page specs drove it in both skins, and the
axe/screenshot tests in light and dark pass unchanged.

### Caught Beyond the Brief
- Copying a dated card's text on purpose still doubles the date ("SEP 15" + "15 SEPTEMBER 2026"): the short form is
  `aria-hidden` and the full form visually hidden, and both are copied. Now that the name carries the date, the hidden
  full form is read twice by a screen reader that enters the card (name, then content). A later ruling: drop the
  hidden full form from the content (the name has it), or mark it `user-select: none`. Not changed here.
- S1 and S2 (VERIFY_01) are not this task's: S1 is a routing row for the tracker; S2 is the maintainer's call.
