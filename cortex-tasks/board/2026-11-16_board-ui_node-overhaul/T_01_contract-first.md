# T_01_contract-first: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Land every contract change the set needs, with generated files and tests, before anything is drawn: a node's icon
and tone, a board's skin, Bookmark in place of flag, a seen container, the `ask` act, flow direction, the icon
library's records and operations, the flags; and format 20, with its step in BE_02's upgrade chain.

---

## Context

PLAN.md § Decisions 2, 3, 5, 13, 15, 16, 17, 23, 24, 25 and § Planner's calls 2, 3, 5, 10 to 12, 15. The record
for each change is the ledger review's § 4 (O1 to O7), taken as the design
(`cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md`, rows R6 to R10, R26 and the contract half of
R27). `CODE-MAP.md` §§ 2 to 5 map the files. The schema is the source (`docs/specification/api.md` § One source);
code follows it and `npm run gen` writes the rest. Nothing in this task changes what the page draws.

No legacy (D-103): older ledgers are migrated, never read in an old shape. BE_02 built the upgrade chain and the
runner; this task adds the 19-to-20 step and nothing that reads `flag`. The reader still accepts lines of formats
2 to 19 where they lie until BE_03, the wave after, removes that; add no new branch for them.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/schema/` (`openapi.json`, `events/*.schema.json`, `common.schema.json`,
  `api/*.schema.json`), `packages/format/src/` (`view.ts`, `ledger.ts`, `ledger-shape.ts`, `ledger-index.ts`,
  `board-view.ts`, `validate.ts`, `flags.ts`, `data-folder.ts`, `words/`), `packages/format/src/migrate/` (the 19-to-20 step only),
  `packages/format/fixtures/` (not `legacy/`), `packages/format/tests/`, `packages/actions/src/` (`registry.ts`,
  `act.ts`, `fold.ts`, `card-flags.ts` renamed `bookmarks.ts`, `fresh.ts`, `unsent.ts`, `note-lock.ts`,
  `pending.ts`, `references.ts`, `conditions.ts`, `board-state.ts`, `words/`), `packages/actions/tests/`, every
  caller of the renamed fold (the rename only), `apps/board/src/board/cards/flag-flow.ts` (the sender's act names
  only), `apps/board/server/` (the write and read paths; the stub handlers for `list_icons` and `add_icon`),
  `apps/board/tests/`, the generated files `npm run gen` writes, `docs/specification/api.md`
- **Files to reference**: the review § 4 and § 3 (the chain); `CODE-MAP.md`; `apps/board/tests/schema-v19.test.ts`
  (how a format bump is tested); `packages/format/src/view.ts` `widthsOf` and the `widths` act (the pattern for
  `direction`); `packages/format/src/apps.ts` `APP_HASH_PATTERN`; `packages/format/src/board-view.ts` `applyDrawn`;
  `packages/format/src/migrate/` (BE_02's `UpgradeStep`, `upgradeLines`)
- **Patterns to follow**: an act is added as `CODE-MAP.md` § 4 "Adding a new person action" lists; an operation as
  `api.md` § Adding an operation
- **Shared artifacts to reuse**: BE_02's chain, runner and frozen fixtures. Import them; do not re-create them
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Rulings**: read PLAN.md § Decisions and § Planner's calls as the orchestrator recorded them at kickoff, and
       the review's § 4. Use the tone names, keys and library prefix recorded there.
2. [ ] **Node fields** (schema first; O3, R9, R26). `icon?`: a built-in name, one of `ICON_NAMES`, or a library
       name matching `^x-[a-z0-9][a-z0-9-]{0,37}$` (`isLibraryIcon`); a test holds that no name in `ICON_NAMES`
       starts with `x-`, so a later built-in can never clash with a project's icon. Propose the built-in names in
       your notes before coding (about 48, lowercase kebab-case, generic nouns for architecture and media work:
       `signal`, `camera`, `encoder`, `ingest`, `cloud`, `transcode`, `packager`, `storage`, `database`, `server`,
       `network`, `cdn`, `player`, `apps`, `ad`, `lock`, `key`, `captions`, `audio`, `video`, `clip`, `schedule`,
       `channel`, `live`, `share`, `user`, `team`, `monitor`, `alert`, `chart`, `api`, `code`, `queue`, `function`,
       `gateway`, `shield`, `route`, `satellite`, `fibre`, `file`, and what else a planning board needs). `tone?`:
       one of `TONES`, or a hue, a whole number from 0 to 359; the schema's description names the space (the OKLCH
       hue angle); 360, fractions and a number written as text are refused, so each colour has one spelling. Both
       optional, on any kind. An unknown value is a problem that names the field.
3. [ ] **The icon library's contract** (O4, R27). `ICONS_DIR` (`icons`) in `data-folder.ts`, `ProjectFiles.icons`
       (`.visionboard/icons/`, beside `attachments/`), and in `DATA_FOLDER_NAMES`, so no ledger can be called
       `icons`. The `icon` event, `{ "type": "icon", "name": "x-encoder", "hash": "<sha-256 hex>" }` (the hash in
       `APP_HASH_PATTERN`'s form), written by an agent (through `add_icon`, or by the server on a node's first use)
       or by the person (accepting a changed drawing); it names no board and moves no board's head. Add it to
       `EVENT_TYPES`, `AGENT_EVENTS`, a schema in `schema/events/`, `references.ts` `EVENT_SCOPES`; the index keeps
       each name's latest hash. Pure rules in `contextProblems`: a node naming a library icon needs an `icon` line
       for it earlier in the ledger; an agent's `icon` line for a name the index holds with another hash is refused
       (a name is given once). Operations in `openapi.json`: `list_icons` (agent and person: the built-in names, the
       library's names with titles, `problems`; query `paths`, default false, adds each library icon's checked `d`
       strings, for the page, call 11) and `add_icon` (agent: `name`, `title`, `svg`, `key`). Their handlers here are
       stubs that pass the drift tests: `list_icons` answers the built-ins and an empty library, `add_icon` refuses
       with a words-file sentence saying it is not built yet. BE_04 replaces both.
4. [ ] **A board's skin** (O2, R7). `SKINS = ['default', 'command-lens']`. `BoardEvent.skin?` (set by whoever writes
       the board; an agent's second `board` line is already refused) and a person act `skin` naming the board. The
       fold's answer is the latest of either; absent means `default`. A rename is a `board` line with no `skin`, so
       `applyDrawn` must carry the skin over (or keep it in its own map that only a line naming a skin sets): test
       "a rename keeps the skin". A `skin` act is no answer and lights no Send (`unsent.ts` `foldUnsent`): test.
       `get_board` and `list_boards` say it.
5. [ ] **Bookmark** (O1, R6). Acts `bookmark` and `unbookmark` only: person only, private as `CARD_MARKS`, key `b`.
       `flag` and `unflag` leave `ACTION_IDS` and `CARD_MARKS`; no alias anywhere, in the reader, the fold or the
       API's edge. The fold is renamed: `card-flags.ts` becomes `bookmarks.ts`, `flagsOn` becomes `bookmarksOn`,
       `LedgerState.flags` becomes `bookmarks`; every caller is updated (the rename only). The page's sender writes
       `bookmark` and `unbookmark` (`flag-flow.ts`, the act names only); FE_02 renames the rest of the page.
6. [ ] **A seen container** (O7, R8). The `seen` event may name `board` and `region`, and then carries `head`, as
       the board form does (`SeenEvent`, `ledger-shape.ts` `seenRules`). Fold it: `container.fresh` and a
       container note's unseen replies (tracker N47) clear on it up to `head`, so a line that arrives while the
       person clicks stays fresh. Add a pure `containerSeenDue(state, board, region, head)` beside `seenDue`: true
       only when the line would change something; FE_02 writes the line only then. A locked board lets it through
       as other `seen` lines; a read-only ledger writes nothing.
7. [ ] **Ask** (O6, R10). A person act `ask`:
       `{ "type": "act", "action": "ask", "board": "plan", "lines": [412], "context": "board" }`. `lines`: the `seq`
       of each of the person's notes it carried (a `comment`, a `context` with words, or a note on several nodes or
       on a container) on that board, each not removed, not sent and not asked before. `context`: one of
       `ASK_CONTEXTS = ['node', 'board', 'session']`, what the agent was given with it. Written once the message
       went, as a Send is (D-075). An `ask` is not a Send: `lastSend` and `sentHead` do not move. The fold keeps
       each board's set of asked lines, and `unsent.ts` (an asked note is not unsent, and the next Send does not
       carry it), `note-lock.ts` (an asked note locks as a sent one) and `pending.ts` (`replyScope`;
       `check_responses` reports an asked note as it reports a sent one, with the ask's `context`) consult it, and
       the one-unsent-note rule (`api.md` 59) counts an asked note as sent, so the node can take a new one. The
       agent answers as today: a `reply` naming the note's `seq`, or a new version of the node.
8. [ ] **Flow direction** (O5, R10). `Region.direction?: 'across' | 'down'`, set by an agent with any redraw, on any
       region (the layout reads it for `flow`). A person act `direction`: `{ board, region?, direction }`, where
       `direction` is `across`, `down` or `auto`; no `region` means the whole board; `auto` clears the person's
       choice at that level. `LedgerState.directions` and `directionOf(state, board, region)` beside `widthsOf`:
       the person's choice for the container, else theirs for the board, else the region's, else `across`. No
       answer, no Send (test).
9. [ ] **Flags**: declare `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, default off, each
       with its `FLAG_DESCRIPTIONS` sentence. Set the spike's `appStage` to default off as well: its Open button in
       the app card's footer is what fails 13 page tests on this branch (handover § 3), and the suite must be green
       before the set builds on it. Run the eight spec files the handover names and confirm they pass.
10. [ ] **Format 20**: bump `LEDGER_FORMAT` to 20 (the `$id`s and `common.schema.json`, as earlier bumps did). Add
        the 19-to-20 step to BE_02's `UPGRADE_STEPS`: `flag` becomes `bookmark`, `unflag` becomes `unbookmark`,
        `v` becomes 20; nothing else changes. Bring every fixture and test line that holds `flag` or `unflag` to
        format 20 with `upgradeLines`, never by hand. Never edit `fixtures/legacy/`: its test maps the frozen
        `flags` to `bookmarks` when it compares. `schema-v20.test.ts`, beside the format-19 one: an old ledger
        migrates to the same board (the frozen folds, flags as bookmarks); a format-20 ledger round-trips.
11. [ ] **Words**: every new label, refusal and tool-description sentence in its words file.
12. [ ] `npm run gen`; `api.md` gets a point for each new record, act and operation (the `icon` line and the
        library's folder, `list_icons`, `add_icon`, `ask`, `direction`, `skin`, a seen container, Bookmark) and says
        format 20; run the checks.

---

## Validation

- [ ] `npm run gen -- --check`, `npm run verify`, `npm run check`, `npm test` pass
- [ ] Refusals, each with a sentence from a words file: an agent's `bookmark`, `skin`, `direction` and `ask` acts;
      `skin` from an agent anywhere but its board event; an unknown `icon`, `skin` or `tone` (a name not in `TONES`,
      360, 12.5, "210"); a library icon with no `icon` line; a second drawing for a held name; an `ask` naming a
      line that is sent, asked, removed or not the person's note; `flag` and `unflag` in a format-20 line
- [ ] No name in `ICON_NAMES` starts with `x-` (test)
- [ ] A format-19 ledger with `flag` lines migrates (BE_02's runner) and folds to the same board with them as
      bookmarks; a second run changes nothing; a format-20 ledger round-trips
- [ ] A rename keeps the skin; `skin`, `direction` and `ask` light no Send; after an ask the other unsent answers
      stay unsent and the asked note is locked; `check_responses` reports it with its `context`; a container seen
      at an older `head` leaves a later line fresh
- [ ] The page is unchanged: `npm run test:pages -- board.spec.ts flag-retire.spec.ts` passes without new
      baselines, and the eight spike specs pass

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
