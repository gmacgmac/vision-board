# T_01_contract-first: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Land every contract change the set needs (node icon and tone, a board's skin, Bookmark, a seen container, the
flags), with generated files and tests, before anything is drawn.

---

## Context

PLAN.md § Decisions 2, 3, 13, 15, 16, 17 and § Planner's calls 2, 3, 5. `CODE-MAP.md` §§ 2 to 5 map the files. The
schema is the source (`docs/specification/api.md` § One source); code follows it and `npm run gen` writes the rest.
Nothing in this task changes what the page draws.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/schema/` (`openapi.json`, `events/*.schema.json`, `common.schema.json`,
  `api/*.schema.json`), `packages/format/src/` (`view.ts`, `ledger.ts`, `ledger-shape.ts`, `validate.ts`, `flags.ts`,
  `words/`), `packages/format/fixtures/`, `packages/format/tests/`, `packages/actions/src/` (`registry.ts`, `act.ts`,
  `fold.ts`, `card-flags.ts`, `fresh.ts`, `conditions.ts`, `board-state.ts`, `words/`), `packages/actions/tests/`,
  `apps/board/server/` (the write and read paths), `apps/board/tests/`, the generated files `npm run gen` writes,
  `docs/specification/api.md`
- **Files to reference**: `CODE-MAP.md`; `apps/board/tests/schema-v19.test.ts` (how a format bump is tested);
  `packages/format/src/view.ts` `RENAMED_MODES` (how an old name still reads)
- **Patterns to follow**: an act is added as `CODE-MAP.md` § 4 "Adding a new person action" lists
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Kickoff answers**: read PLAN.md § Planner's calls as the orchestrator recorded them; use the tone names
       and keys recorded there.
2. [ ] **Node fields** (schema first): `icon`, one of `ICON_NAMES`; `tone`, one of `TONES`. Both optional, on any
       kind. Propose the icon names in your notes before coding (about 48, lowercase kebab-case, generic nouns for
       architecture and media work: `signal`, `camera`, `encoder`, `ingest`, `cloud`, `transcode`, `packager`,
       `storage`, `database`, `server`, `network`, `cdn`, `player`, `apps`, `ad`, `lock`, `key`, `captions`,
       `audio`, `video`, `clip`, `schedule`, `channel`, `live`, `share`, `user`, `team`, `monitor`, `alert`,
       `chart`, `api`, `code`, `queue`, `function`, `gateway`, `shield`, `route`, `satellite`, `fibre`, `file`,
       and what else a planning board needs). An unknown name is a validation problem that names the field.
3. [ ] **A board's skin**: `SKINS = ['default', 'command-lens']`. `BoardEvent.skin?` (set by whoever writes the
       board) and a person act `skin` naming the board. The fold's answer is the latest of either; absent means
       `default`. `get_board` and `list_boards` say it.
4. [ ] **Bookmark**: add acts `bookmark` and `unbookmark` (person only, private as `CARD_MARKS`, key `b`). `flag`
       and `unflag` stay valid to read and fold exactly as before (the page still writes them until FE_02). One
       fold, `bookmarksOn`, answers for both; `flagsOn` becomes a thin alias FE_02 removes.
5. [ ] **A seen container**: the `seen` event may name `board` and `region`. Fold it; `container.fresh` and a
       container note's unseen replies (tracker N47) clear on it. A locked board lets it through as other `seen`
       lines; a read-only ledger writes nothing.
6. [ ] **Flags**: declare `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, default off, each
       with its `FLAG_DESCRIPTIONS` sentence. Set the spike's `appStage` to default off as well: its Open button in the
       app card's footer is what fails 13 page tests on this branch (handover § 3), and the suite must be green
       before the set builds on it. Run the eight spec files the handover names and confirm they pass.
7. [ ] **Format 20**: bump `LEDGER_FORMAT`, keep 2 to 19 readable, add the format-20 schema test beside the
       format-19 one, and a fixture ledger in format 19 with `flag` lines that folds to the same bookmarks.
8. [ ] **Words**: every new label, refusal and tool-description sentence in its words file.
9. [ ] `npm run gen`; update `docs/specification/api.md`; run the checks.

---

## Validation

- [ ] `npm run gen -- --check`, `npm run verify`, `npm run check`, `npm test` pass
- [ ] A test proves: an agent's act is refused for `bookmark` and `skin`; an agent can set `skin` only on a board
      event; an unknown `icon`, `tone` or `skin` is refused with a sentence from a words file
- [ ] A format-19 ledger with flags opens and folds to bookmarks; a format-20 ledger round-trips
- [ ] The page is unchanged: `npm run test:pages -- board.spec.ts flag-retire.spec.ts` passes without new baselines

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-format] T_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_01_contract-first.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
