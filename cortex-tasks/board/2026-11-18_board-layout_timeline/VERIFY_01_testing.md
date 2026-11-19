# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Prove the set against PLAN.md § Success Criteria with the full gates, and use the timeline as its user would, in both
skins, light and dark, reporting every finding with its evidence. Change no code.

---

## Context

You are the persona in TASK-STATUS.md: you plan launches on boards like this every week and have no builder context.
Read PLAN.md § Decisions and § Design review, then the notes of every task. The flag is still on only by `?flags=
timeline`. This is the one run of the full page suite in the set.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 4, alone, in `.claude/worktrees/app-window`,
`VB_TEST_PORT=8210`.

---

## Inputs

- **Files to modify**: this task file and your TASK-STATUS row only (findings go in your notes and `REQUESTS`).
  Interim files (scripts, screenshots, ledgers) in `temp/verify01/`.
- **Files to reference**: PLAN.md, every task's notes, `design/mockups/timeline/`, `docs/specification/api.md`
  § Ledger v21, `components.md` § The timeline, the `pattern.json` files of `node`, `markdown` and `timeline`,
  `skills/vision-board/references/timeline.md`.
- **Skills**: `cortex-docs` (the doc audit: every claim the set added names a symbol or test that exists and says what
  the code does), `design:design-critique` (the look against the pages), `design:accessibility-review`.

---

## Steps

1. [ ] **Gates**, each with its time limit (PLAN.md § Tests): `npm run verify`, `npm run check`,
   `npm run gen -- --check`, `npm test`, then the full page suite once:
   `nice -n 15 env VB_TEST_WORKERS=3 VB_TEST_PORT=8210 npm run test:pages` (35 min), `npm run test:plugin`,
   `npm run test:plugin:webkit`, `npm run eval:bot -- --dry` and `--dry --standalone`. A failure: rerun that spec alone
   once; if it fails again, check it on the commit before the set (`git stash` is not allowed: use
   `git worktree add temp/verify01/before <commit>` and remove it after) and report which it is.
2. [ ] **The contract**: by the API (a temp project, a server on 8210): write dated cards in each of the four forms and
   each habit of decision 2; read them back normalised; each refused form answers with the four forms; an app card is
   refused; a rewrite without the key takes the card off the line; `show_layout` reports the line in drawn order and
   the rest as before. A format-20 copy of a fixture migrates to 21 with only `v` changed.
3. [ ] **As the user**, `?flags=timeline`, a board of a made-up launch plan written by the API: ten dated cards across
   two years, two on the same day, one with a time, a week of three entries, a decision that asks, a tone, an icon
   card, three undated risks in the same container, a link; then:
   - read the dates at a glance at 100%, 50% and 25%; the order, the alternation, the years, the band;
   - answer the decision; comment; bookmark; Save for later; history; Move to another container and back;
   - try to drag a dated card in both skins; drag an undated card; Reset places;
   - switch the container to Down, then Auto; switch its layout to grid: the line stays;
   - the same in Command Lens; the same in light and dark; Tab through the cards; a screen reader's reading of the
     date line (the accessible tree);
   - compare each look with the pages (`design:design-critique`), and every date colour, line, stem and dot with its
     APCA tier.
4. [ ] **Flag off**: the same board draws as an ordinary board, no header, no line; nothing else changed.
5. [ ] **Docs audit** (`cortex-docs`): api.md § Ledger v21, components.md § The timeline, the three `pattern.json`
   files, plugin.md, words.md, the skill reference: each claim checked against the code; a false claim is a finding.
6. [ ] **Report**: in your notes, a table of findings (must fix before T_03 / should fix / later), each with evidence
   (spec, screenshot path, measured Lc, steps), and the gates' results with times.

---

## Validation

- [ ] Every success criterion of PLAN.md marked met or not, with evidence
- [ ] The full page suite ran once, its result and time recorded

---

## Constraints

- Change no code, test, doc or screenshot. No git commands that change state, except the temporary `git worktree
  add`/`remove` in step 1 under `temp/`. Never port 4466; never a real ledger. No PII.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-11-19 00:40  
**Where**: `.claude/worktrees/app-window`, HEAD a7699dcf, `VB_TEST_PORT=8210` (plugin runs 8230, eval 8250, my board
server 8210 over `temp/verify01/proj`). No code, test, doc or screenshot changed; `git status --short` clean at the end.
No `git worktree add` was needed (no failure to bisect). Interim files: `temp/verify01/` (scripts `contract.mjs`,
`launch.mjs`, `look.ts`, `apca.ts`, `interact.ts`, `layout.ts`, `aria.ts`, `flagoff.ts`; logs `gate-*.log`,
`apca.tsv`; screenshots under `shots/`: `on-*`, `act-*`, `lay-*`, `drag-selection.png`, `flag-*`).

### Gates
| Gate | Result | Time |
|---|---|---|
| `npm run verify` | ok, 45 warnings (file lengths) | 1 s |
| `npm run check` | 0 errors, 0 warnings | 7 s |
| `npm run gen -- --check` | current | <1 s |
| `npm test` | 2,720/2,720; `test:timing` 15/15 | 28 s |
| `nice -n 15 env VB_TEST_WORKERS=3 VB_TEST_PORT=8210 npm run test:pages` (the one full run) | **1,094 passed, 2 skipped, 0 failed**; no baseline changed | 14.6 min (874 s wall) |
| `npm run test:plugin` | 116 passed | 22 s |
| `npm run test:plugin:webkit` | 116 passed | 33 s |
| `npm run eval:bot -- --dry` | 114/114 in 16 runs, **stopped by the run cap** (16 of 18 scenarios); with `--max-runs 18`: 129/129 | 5 s |
| `npm run eval:bot -- --dry --standalone` | 115/115 in 14 runs | 4 s |

The full suite ran while I drove the board on 8210 in another browser; nothing flaked, so no rerun. The count is 1,094
against the checkpoint's 1,076 (FE_02's 18 timeline tests).

### Success criteria (PLAN.md)
| Criterion | Met? | Evidence |
|---|---|---|
| Four forms and every habit stored normalised; anything else refused with the four forms | Met | `contract.mjs`: 14 sent forms (four forms, `Z`, `+02:00`, `-0500`, seconds, fractions, a space, `t…z`, spaces, `2026` as a number) read back normalised by `get_board` and `show_node`; 12 refused (`2026-Q4`, `2026-W42`, `next week`, `2026-10-13T14`, `2026-02-30`, `26-10-13`, `2026-13`, `T24:00`, `Oct 13, 2026`, `13/10/2026`, `2026.5`, `20261013`), each naming the four forms, nothing written; app card refused ("no header for a date"); an `append` keeps the date, a rewrite without the key drops it |
| Format 20 → 21 line for line; a newer format opens read-only | Met | the checkpoint's format-20 `roadmap` (36 lines) and `gallery` (385) through `npm run ledger:migrate` in temp folders: only `v` changed, byte-identical to HEAD's fixtures; line stamped 22: `ledger-migrate-open.test.ts` (`LEDGER_FORMAT + 1`) in `npm test` |
| Flag on: one line, in order, alternating, evenly spaced, years, band; rest below; run down | Met | `shots/on-*-{25,50,100}.png`, `lay-down-dark.png`, `lay-grid-dark.png`; `show_layout` order on the launch board 8 9 3 4 6 7 5 2 1 10 (Dec 2026 → Jul 2027, the two equal May 12 by card number, then 09:30) |
| No dated node, or flag off: exactly as before | Met | `flagoff.ts`: flag off, the dated board's 14 boxes equal the same board written with no dates; no `.vb-timeline`, no date header, 13 kind tabs; full suite: no baseline changed |
| Date heads every dated node, both skins, light and dark, ≥ Lc 45; titles 18px only there; entries for `###` and bold leads only | Met | `apca.tsv`: lowest date Lc 48.3 (default dark, topic), Command Lens dark 49.6, default light 58.4, Command Lens light 60.7; `###` entries are level-4 headings, bold leads `strong` (`aria.ts`) |
| A dated node never drags; Move to joins the target's line; links route | Met | `layout.ts`: drags on the top edge, date and body (default) and the plate (Command Lens) move nothing and write nothing; `interact.ts`: Move to Parking lot (its own one-dot line), back (rejoins at its date); the link 5 → 11 routes in both forms |
| `show_layout` reports the line in drawn order | Met | `contract.mjs` and `launch.mjs` output: `timeline.cards` equals the dots' order on the page |
| Skill core sentence; `references/timeline.md` in both builds; Haiku live | Met (live by T_02, not rerun) | `core.md` line 43; dry evals above; T_02's live runs |
| verify, check, test, gen, test:pages, test:plugin pass | Met | table above |
| Gallery in both skins; `pattern.json` and spec docs match the code | **Not met** (docs) | finding M1 |
| The maintainer has used it and said yes | Not yet | the result gate |

### Findings
| # | Finding | Evidence | Severity |
|---|---|---|---|
| M1 | **Docs out of step with D-106 (run down).** `api.md` 194 says `side` is `above`, `below` "or `beside` when the line runs down"; the code and the schema say `left` or `right` (`geometry.ts` `TimelineSide`, `show-layout-response.schema.json` `$defs.dated`). The same item still says "The layout fills it (timeline BE_01); until then the answer leaves it out". The agent-facing description `show-layout-response.schema.json` `$defs.timeline` (and so `api-reference.md`) says the line runs "down the left when it runs `down`"; it runs down the middle of the timeline's column with the cards alternating left and right | `grep -n "beside\|down the left" docs/specification/api.md packages/format/schema/api/show-layout-response.schema.json` | must fix before T_03 (an agent reads the description) |
| S1 | **Run down, a link runs along the line.** Card 5 (left of the line) to card 11 (right of the timeline): the route runs about 380 px up the line itself, over five dots (MAY 12, MAY 12, APR 20, MAR 2027, 2027), then right. Line and link read as one stroke; the dates' order and the link can no longer be told apart. Across, the same link leaves at the dot and runs down a gutter: fine. Known limit (routing round the line out of scope, § Design review (5)); judged here: acceptable across, misleading run down | `shots/lay-down-dark.png`, `lay-grid-down-dark.png` | should fix (a tracker row; not a blocker for T_03 since across is the default) |
| S2 | **The years do not read at a glance at fit.** The year is 11.5px in the world (`--vb-timeline-year`), so about 6.4px on screen at the launch board's fit (56%) and 3px at 27%; the day and time headers carry no year, so at fit the year of a card cannot be read. The dates (23px) read at 50% (about 13px); nothing on the board reads at 25% | `shots/on-default-dark-50.png`, `on-default-light-25.png` | should fix (maintainer's call: 590 kept the run-1 size; a `ZOOM_RULES` row could counter-scale the year as the container line is) |
| S3 | **A screen reader hears no date when moving card to card.** The item's name is "Item 6, Action: Pricing page live, Open"; the date is the card's first content (`time: 12 May 2027`, well formed), but list navigation by item names skips it, and Tab goes in card-number order, so the timeline's order cannot be heard | `aria.ts` output (the list's names and each card's tree) | should fix (the full date in `nodeLabel`'s name, from the words file) |
| S4 | **A drag on a dated card selects text across cards.** Where every other card's kind tab moves it (the top edge), a dated card's press is a text press (by `pointer.ts`: a press on content selects text), so the person who tries to move it gets a blue selection over this card and its neighbours; the copied text doubles the date ("MAR 2027MARCH 2027", short and full form). A drag on an undated card's body selected nothing in the same run | `shots/drag-selection.png`, `lay-before-cog.png`; `aria.ts` output | should fix (no selection when the press starts outside text on a dated card, or the date line not selectable) |
| L1 | The same-date band measures Lc 0.0 (dark) and 9.2 / 11.6 (light) on the canvas, under the decoration tier; it shows because the line runs over it, but faintly at fit | `apca.tsv` | later (593 kept it) |
| L2 | A year-precision card ("2027") sorts at 1 January, ahead of MAR 2027: right by decision 9, but a programme manager may read "2027" as "sometime in 2027" and expect it after the months | `on-default-dark-100.png`, `show_layout` order | later (a ruling) |
| L3 | Save for later keeps the date, so the Later container draws a one-dot line with its year and arrow; Move to Parking lot the same | `shots/act-later.png`, `act-moved.png` | later (consistent with decision 7) |
| L4 | `npm run eval:bot -- --dry` stops at its 16-run cap with 18 plugin scenarios, so the two last scenarios are not dry-run by the gate as written (129/129 with `--max-runs 18`) | `gate-eval-dry.log` | later (T_02 noted the 18 > 16) |
| L5 | Known, judged: Tab in card-number order (maintainer's); a link may run over a dot across (acceptable across, see S1 down); the date draws at 600 (the vendored face) though the CSS and node `pattern.json` say 800; temporary budgets not measured here; the hosted board covered by `test:plugin` (chromium and webkit, 116 each) and inference only, no plugin test turns the flag on | FE_02 notes | for the maintainer |

Every card answered like any other (`interact.ts`, default skin, dark): the right-click list of a dated decision and
action is Tick, Cross, Comment, Bookmark, Save for later, History, of a dated topic and an undated risk Comment,
Bookmark, Save for later, History; ✓ on the decision recorded and drawn, the line unchanged; a note with C, sent;
Bookmark; Save for later; History opens. An undated card drags by its tab and writes one pin; Reset places puts it
back (pin, unpin) with the line unchanged. Down draws the line down with the cards alternating left and right and
the risks to the right; Auto puts it back across; Grid keeps the line. No console error in any run.

Design critique against `design/mockups/timeline/default-timeline-dark.png`: the build follows the page in the
header forms, the kind word on the date line, the entries' bars, the dots in the kind's colour, the stems to the
middle of the facing edge, the years at the start and the turn and the band; differences are the rulings' (the
board's real spacing and widths). In Command Lens the plate stays and the date heads the body, as ruled. The toned
violet action reads in its tone (date, dot, edge) and keeps its kind word and disc in the kind's amber.

APCA as drawn (`apca.tsv`, every dated card of the launch board, both skins, light and dark): dates 48.3 to 77.4
(tier 45); line and stems 33.7 to 35.6 (tier 30); dots 48.8 to 73.9; the year 63.9 to 75.9 (reading tier 60, at
11.5px); the band 0.0 to 11.6 (L1).

### Caught Beyond the Brief
- S2, S3, S4 and L2 are what a programme manager meets first: the year at fit, the date when listening, the
  drag that selects, the "2027" card before March.
- Flag off, a `row` container with one link draws as a column (the launch board's roadmap, `flag-off-dated-vbwork.png`),
  the same as the board with no dates: not the timeline's, noted only because flag on the same container's rest
  draws as a row below the line.

---

## On Completion

1. Fill in the notes; set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] VERIFY_01: [result] → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/VERIFY_01_testing.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS` (the must-fix findings, for the
   orchestrator to plan as `FIX_NN`), `NOTES`.
