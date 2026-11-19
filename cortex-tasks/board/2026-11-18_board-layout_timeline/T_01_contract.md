# T_01_contract: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Land the `timeline` key as contract: one grammar module, the field in every schema and type, the normaliser at the
write edge, refusal words, the `show_layout` block, the line's geometry type, the flag, and ledger format 21 with its
restamp step, before any drawing.

---

## Context

PLAN.md decisions 1-6, 9, 25 and calls 1-3 are this task's rulings; read them first. The contract is the one source
everything else is generated from or tested against (`docs/principles.md` § The contract comes first). Today a node has
no date and nothing normalises an agent's field (CODE-MAP.md § Format, § Server).

**Read previous task notes in TASK-STATUS.md before starting.** Wave 1, beside DESIGN_01 (which touches only
`design/`). Works in `.claude/worktrees/app-window`, `VB_TEST_PORT=7610`.

---

## Inputs

- **Files to modify**: `packages/format/src/timeline.ts` (new), `view.ts`, `ledger.ts`, `ledger-shape.ts`,
  `view-shape.ts`, `app-shape.ts`, `validate.ts`, `geometry.ts`, `flags.ts`, `index.ts`, `migrate/steps.ts`,
  `words/format-ledger.ts`; `packages/format/schema/` (every file whose `$id` or `$ref` names `ledger/20/`, plus
  `common.schema.json`, `events/node.schema.json`, `api/view.schema.json`, `api/write-item.schema.json`,
  `api/show-layout-response.schema.json`, `openapi.json`); `packages/format/fixtures/` except `legacy/`;
  `packages/format/tests/`; the generated files (`npm run gen`); `apps/board/server/write-board.ts`,
  `apps/board/server/examples.ts` (only if a refusal needs it); test files holding a format-20 line or a `ledger/20/`
  `$id` (`apps/board/tests/bookmark-flow.test.ts` and the three board tests; the one file in `scripts/`);
  `docs/specification/api.md`.
- **Files to reference**: `packages/format/src/view-shape.ts` (`toneProblems`, the shape of a field check),
  `app-shape.ts` (`appNodeRules`, the kind-dependent rule), `migrate/steps.ts` (`restamp`),
  `apps/board/server/write-board.ts` (`checkProposeWord`, `storedNames`, `refuse`), `api.md` § Migration (176-181) and
  § Ledger v20 (182-189, the shape of a format section), `packages/format/tests/node-look.test.ts`,
  `apps/board/tests/schema-v20.test.ts`, `migrate.test.ts`.
- **Patterns to follow**: a field check twin of its schema `$def`, held equal by a test (`node-look.test.ts`); a
  word-level refusal before the schema (`checkProposeWord`); a stored form made before the replay check
  (`storedNames`); an add-only format bump (`restamp(n)`).
- **Shared artifacts to reuse**: none yet; this task creates them (TASK-STATUS.md Shared Foundations).
- **Skills**: `cortex-architecture` (contracts: `references/contracts.md`), `cortex-docs` (api.md).

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Tests first** (`packages/format/tests/timeline.test.ts`, new). A table of inputs and results:
   - kept: `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`, `2024-02-29`, `2026-12-31T23:59`;
   - normalised (decision 2): `2026-10-13T14:30:00Z`, `2026-10-13T14:30:45.123+02:00`, `2026-10-13T14:30-0500`,
     `2026-10-13 14:30`, `2026-10-13t14:30z`, `" 2026-10 "`, the number `2026` → each to its four-form value, the time
     digits as written (no conversion);
   - refused: `2026-Q4`, `Q4 2026`, `2026-W42`, `2026-W42-1`, `next week`, `Oct 2026`, `2026-10-13T14`,
     `2026-10-13T24:00`, `2026-02-30`, `2023-02-29`, `26-10-13`, `20261013`, `2026-1-3`, `2026-10-13T14:30:00+25:00`,
     the numbers `26`, `2026.5`, `99999`, `true`, `null`, an empty string, a 41-character string;
   - order: `2026` < `2026-01` < `2026-01-01` < `2026-01-01T00:00` < `2026-01-01T09:00` < `2026-01-02` < `2026-10` <
     `2027`; equal values keep card-number order, then input order;
   - precision and year of each form.
2. [ ] **`packages/format/src/timeline.ts`** (new, pure, no `Date`: string arithmetic only, so no time zone can creep in):
   - `TIMELINE_FORMS`: the four example values the words name, `['2026', '2026-10', '2026-10-13', '2026-10-13T14:30']`.
   - `TIMELINE_PATTERN`: the stored grammar (four digits; then optionally `-MM`; then `-DD`; then `THH:mm`), with
     `TIMELINE_MAX = 40` for raw input length.
   - `isTimeline(v)`: matches the pattern and is a real calendar date (month 01-12, the day exists in that month,
     leap years by the Gregorian rule, hour 00-23, minute 00-59).
   - `normaliseTimeline(raw: unknown): string | undefined`: the habits of decision 2 (trim; a whole number 1000-9999
     → its digits; a space or `t` between date and time → `T`; seconds and fractions dropped; `Z`/`z`, `±HH:mm`,
     `±HHmm`, `±HH` dropped when they are valid offsets), then `isTimeline` on the result; anything else `undefined`.
     It never changes the precision: a value with no time never gains one.
   - `timelinePrecision(v): 'year' | 'month' | 'day' | 'minute'`; `timelineYear(v): string`.
   - `compareTimeline(a, b)`: by start (the value padded to `YYYY-MM-DDTHH:mm` with `-01`, `-01`, `T00:00`), then
     coarser first; 0 only for equal values.
   - `sortByTimeline<T extends { timeline?: string; n?: number }>(nodes: readonly T[]): T[]`: a stable sort by
     `compareTimeline`, then `n`, then input order. The layout and `show_layout` both use it (one order everywhere).
   - `timelineProblems(v, f, p)`: the shape rule (the stored form only: `isTimeline`), pushing
     `formatLedgerWords.timelineForms(f)`. Export everything through `src/index.ts`.
3. [ ] **Words** (`packages/format/src/words/format-ledger.ts`, beside `toneOneOf`): `timelineForms(field)` naming
   the four forms from `TIMELINE_FORMS` passed in by the caller (words import only words, so the caller passes the
   list or the words file holds the four examples as text; pick the one `scripts/words.test.mjs` allows), and
   `timelineOnApp(field)`. Plain, one sentence each, for an agent: what was refused and the four forms, for example
   "`timeline` takes a date in one of four forms: `2026`, `2026-10`, `2026-10-13` or `2026-10-13T14:30`." Quarters,
   weeks and words are named as refused.
4. [ ] **The field**: `ViewNode.timeline?: string` (`view.ts`, documented with api.md's paragraph number), the ledger
   node body (`ledger.ts`), `NODE.fields.timeline: timelineProblems` (`ledger-shape.ts`), the view validator
   (`validate.ts`), and in `appNodeRules` (`app-shape.ts`) a `timeline` on an `app` card pushes `timelineOnApp`.
5. [ ] **Schemas**: `common.schema.json` `$defs.timeline` (string, the stored pattern, a description naming the four
   forms; the twin of `isTimeline`, held equal by a test in `timeline.test.ts` over the table of step 1, as
   `node-look.test.ts` holds `tone`; note in its `$comment` that the calendar check is the code's);
   `events/node.schema.json` and `api/view.schema.json` refer to it; `api/write-item.schema.json` takes the agent's
   input leniently, a string of at most 40 characters or a whole number, so the normaliser is reached (check whether
   the MCP server or `vb` validate input against `tools.generated.json` before sending; the lenient input form must
   pass there too); `openapi.json`: the field's agent-facing description (the four forms; the server normalises a
   zone, seconds and a space; nodes with one share their container's timeline; a rewrite without it takes the node off
   the line), `info.version` 1.42.0 → 1.43.0.
6. [ ] **`show_layout`**: `api/show-layout-response.schema.json` gains an optional `timeline`:
   `{ direction: across | down, cards: [{ n, at, side }] }`, `cards` in line order, `n` as `$defs/cell` names a card,
   `at` the stored value, `side` `above`, `below` or `beside` (run down). Left out when the container has no dated
   card. `cards`' description becomes "every card the container lays out in its mode (dated cards are under
   `timeline`)", and `columns`, `links`, `crossing` and `empty` describe those cards. BE_01 fills it; until then
   `showLayout` leaves it out, which the schema allows.
7. [ ] **The geometry type** (`packages/format/src/geometry.ts`, beside `Box` and `Point`), the one shape the layout
   returns and the page draws:
   ```ts
   export type TimelineSide = 'above' | 'below' | 'beside';
   export interface TimelineDot { id: string; at: Point; side: TimelineSide; stem: { from: Point; to: Point } }
   /** A container's timeline as drawn (D-105): region-local in a RegionPiece, board coordinates in a RegionBox. */
   export interface TimelineDrawing {
     direction: Direction;            // 'across' | 'down'
     line: { from: Point; to: Point }; // the arrow is at `to`
     dots: TimelineDot[];             // in line order
     years: { year: string; at: Point }[]; // the line's start, and each turn of the year
     bands: { from: Point; to: Point }[];  // behind runs of equal values
   }
   ```
   If `Direction` would make `geometry.ts` import `view.ts` in a cycle, inline `'across' | 'down'` and say so.
8. [ ] **The write edge** (`apps/board/server/write-board.ts`): a `normaliseTimeline`-based step in `writeOne`,
   before `itemProblems`, in the manner of `checkProposeWord` and `storedNames`: for a `node` item whose `node` has
   `timeline`, a copy with the normalised value (the input object is never mutated), or a refusal with
   `timelineForms` at `/items/<i>/node/timeline` and the node item's example (`refuse`'s form). It runs before the
   replay check, so a retry in a habit form replays. Find every other path that appends a `node` line for an agent
   (grep `type: 'node'` in `apps/board/server/`; `write-insert.ts` goes through `writeOne`) and route it the same way;
   name them in the notes. Tests (`apps/board/tests/api-timeline.test.ts`, new): each habit stored normalised, each
   refusal with its words and pointer, an app card refused, a rewrite without the key stores none, a replay.
9. [ ] **Format 21** (decision 6): `LEDGER_FORMAT = 21` with its comment ("v21 = the node's `timeline` key; the step
   restamps, no line's meaning changes"); `FORMAT_STEPS` gains `restamp(20)`; every `ledger/20/` in `$id`s and `$ref`s
   becomes `ledger/21/` (one mechanical replace over `packages/format/schema/`, the three board tests and the script;
   then `npm run gen`). Restamp the fixtures through the chain, never by hand: a one-off script in `temp/` that runs
   `upgradeLines` (`#format`) over each non-legacy fixture file and writes the result, and a code literal `"v":20` in
   a test becomes `LEDGER_FORMAT` where the test means "current". `migrate.test.ts`: step 20 changes `v` only, on a
   line with every field; the newer-format test still passes with a line stamped 22. Add
   `apps/board/tests/schema-v21.test.ts` (beside `schema-v20.test.ts`): a stored dated node accepted; a non-stored form refused in a ledger
   line (the ledger never normalises); `timeline` on an app line refused.
10. [ ] **The flag** (`flags.ts`): `timeline`, `default: false`, and its `FLAG_DESCRIPTIONS` row ("A container's dated
    nodes draw on one line across its top, with the date as each node's header (D-105, T_03 removes it)").
11. [ ] **api.md**: a section "## Ledger v21: the timeline key (timeline T_01, D-105)" continuing the numbering from
    190: the field and its four forms (`timeline.ts`); normalisation at the write edge and what is refused
    (`write-board.ts`); app cards; the order (`compareTimeline`, `sortByTimeline`); `show_layout`'s `timeline`;
    format 21 and why the step is a restamp (decision 6); the page's flag. Each claim names its symbol and test
    (`cortex-docs`). Amend the `show_layout` paragraph (133) to point to it.
12. [ ] Project checks (PLAN.md § Tests); pages `board.spec.ts` and `gallery.spec.ts` (fixtures restamped), port 7610.

---

## Validation

- [ ] `timeline.test.ts`, `api-timeline.test.ts`, `schema-v21.test.ts`, `migrate.test.ts`, `legacy-folds.test.ts`
      pass; `node-look.test.ts`-style twin test holds `$defs.timeline` equal to `isTimeline` over the table
- [ ] `npm run gen -- --check` clean; `grep -rn "ledger/20/"` finds nothing outside `legacy/` and history docs
- [ ] `npm run verify`, `npm run check`, `npm test` pass; the two page specs pass with no screenshot change
- [ ] A format-20 copy of a fixture migrates to 21 with only `v` changed (`npm run ledger:migrate -- <temp copy> --check`
      reports the lines, then the run, then `--check` clean)

---

## Constraints

- If a deviation is needed, collaborate with the maintainer; no silent breaking change. No PII in examples.
- No git commands that change state. Interim files in `temp/`; writes over 50 lines in chunks.
- Never edit `packages/format/fixtures/legacy/`; never open a real ledger.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-18 21:02  

### Changes Made
- `packages/format/src/timeline.ts` (new, pure, no `Date`): `TIMELINE_FORMS`, `TIMELINE_MAX` 40, `TIMELINE_PATTERN`,
  `isTimeline`, `normaliseTimeline`, `timelinePrecision`, `timelineYear`, `compareTimeline`, `sortByTimeline`,
  `timelineProblems`; exported through `index.ts`. Tests first: `packages/format/tests/timeline.test.ts` (the table of
  step 1, order, sort, the schema twin).
- Words (`format-ledger.ts`): `timelineForms(f, forms)` (a new `timeline.ts` section; the caller passes
  `TIMELINE_FORMS`, the words file formats them) and `timelineOnApp(f)` (app-shape section).
- The field: `ViewNode.timeline`, `NodeBody.timeline`, `NODE.fields.timeline`, `validateView`, `appNodeRules`.
- Schemas: `common.schema.json` `$defs.timeline` (strict) and `$defs.timelineSent` (text up to 40 or an integer);
  `events/node.schema.json` split: `fields` (every field but `timeline`, open), `body` (fields + strict `timeline`,
  closed: stored lines and every read), `sentBody` (fields + lenient `timeline`, closed) and `sentCore`, which `sent`
  now uses instead of `core`; `appRule` refuses `timeline` on an app card; `api/view.schema.json` refers to the strict
  def; `show-layout-response.schema.json` gains optional `timeline` (`$defs.timeline`, `$defs.dated`) and the
  `cards`/`columns`/`links`/`empty` descriptions name the cards laid out in the mode. Generated: reads type
  `timeline?: string`, the sent item `string | number`.
- `geometry.ts`: `TimelineSide`, `TimelineDot`, `TimelineDrawing` (`Direction` imported as a type from `view.ts`: no
  cycle, view.ts imports nothing from geometry).
- Write edge (`write-board.ts` `storedTimeline`): before `itemProblems` and the replay check; a copy with the
  normalised value, or `refuse` with `timelineForms` at `/items/<i>/node/timeline` and the node example. The only path
  that appends an agent's node line is `writeOne` (`append` via `appended`, `insert` via `appendInsert`); grep of
  `apps/board/server/` for node appends found no other (engine/chat paths append join, grant, act, seen, board, retire
  only). Tests: `apps/board/tests/api-timeline.test.ts` (forms and habits stored and read back by get_board and
  show_node, 12 refusals, app card, rewrite without key, retry replay and key conflict, MCP `checkArgs` passes habits).
- Format 21: `LEDGER_FORMAT = 21`, `restamp(20)`; every `ledger/20/` → `ledger/21/` (schemas, `openapi.test.ts`,
  `schema.test.ts`, `schema-apps.test.ts`, `scripts/gen-contract.mjs`); `stamp.v` const 21; openapi examples `"v": 21`
  (data and serialized); `info.version` 1.43.0. Fixtures restamped by a one-off `temp/` script running `upgradeLines`
  (removed after): 468 lines, only `v` changed (checked by diff). `bookmark-flow.test.ts`, `migrate.test.ts` and
  `schema-v20.test.ts` use `LEDGER_FORMAT` where they meant "current"; `migrate.test.ts` "step 20 restamps only";
  new `apps/board/tests/schema-v21.test.ts`.
- Flag `timeline` (off) and its `FLAG_DESCRIPTIONS` row.
- `docs/specification/api.md`: "## Ledger v21: the timeline key" 190-196; 133 points to 194; points 5 and 11 say 21;
  the `updated:` line. `npm run gen` regenerated the six generated files.

### Issues & Resolutions
- The node schema's `body` served sent items, stored lines and reads alike, and the MCP server checks tool calls
  against the flattened schema (`packages/mcp/src/check-args.ts`), so a strict `timeline` there would refuse
  `2026-10-13T14:30:00Z` before the board could normalise it, and a lenient one would type every read as
  `string | number`. Resolved with the `fields`/`body`/`sentBody`/`sentCore` split above.
- `packages/mcp/tests/tools.test.ts` failed `write_board` 19,486 characters over its 19,400 cap with the first wording;
  the field's description was tightened (no content lost) and the anyOf branches lost their descriptions: it now
  passes without a budget change.
- `apps/board/tests/plugin-build.test.ts`: `view/board.js` is 195,849 gzip, over its budget of 195,500 (+349; raw
  667,137 bytes against 666,209 in the pre-change `dist/plugin` build). Not raised (orchestrator's).
- `npm run verify` fails only on `docs/specification/modules.md` "out of date: run npm run map" (new imports:
  `ledger-shape.ts`/`validate.ts` → `timeline.ts`, `geometry.ts` → `view.ts`, the new tests). Orchestrator's file.

### Caught Beyond the Brief
- Existing bug, not this task's files: `apps/board/server/schema.ts` `plain` reads every failed `anyOf` as a card
  reference, so `write_board` refuses `tone: "pink"` with "`tone` must be a node number or { "key": "…" }" and
  `icon: "rocket"` the same (checked with `schemaProblems(WRITE_ITEM_ID, …)`). `tone` and `iconName` are `anyOf`s.
  The timeline never reaches it (normalised or refused first), which is also why `timelineSent` is safe as an anyOf.
- `schema.ts` `PATTERNS` has no words for the stored timeline pattern, so a schema-only refusal of a stored line says
  "is not in the expected …"; agents never reach it (the write edge refuses first) and the reader's hand check words
  name the four forms.
- A day its month lacks (`2026-02-30`) passes the schema and is refused by the code: recorded in the `$comment` and
  held by `schema-v21.test.ts`, so the split is a stated contract, not drift.

### Deviations from Plan
- The agent-facing field description lives in `events/node.schema.json` `sentBody.timeline` (where every node field's
  description lives, and what the MCP tool and `vb` read), not in `openapi.json`, which has no node field
  descriptions; `openapi.json` changed only in `info.version` and the restamped examples.
- `sent` uses a new `sentCore` instead of `core` (the schema split above); `core` still serves `stored`.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only — and your notes block there.
3. Append your own LOG entry to `cortex/LOG.md`, one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-format] T_01: [what changed] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/T_01_contract.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (including `npm run map` if imports
   changed), `NOTES`.
