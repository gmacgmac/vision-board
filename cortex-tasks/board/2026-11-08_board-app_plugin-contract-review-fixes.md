---
task_name: Plugin Contract Review Fixes
created: 2026-11-08
completed: 2026-11-08
status: completed
categories: [board-app, board-agent]
type: implementation
model: strong
persona: Principal engineer and security reviewer — a claim counts only when a test asserts it against the real thing, and a handover never says more than was proven.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Plugin Contract Review Fixes

---

## Problem Statement

An independent review of the seam-2 work (commits `dda9143`, `48b1f55`; set
`cortex-tasks/board/2026-11-07_board-app_plugin-contract/`) scored it 5.5/10. The maintainer approved
seven fixes (points 508–514); point 500 (the bot can edit the data folder in nclite, so the lock holds
against the board's tools only) is accepted as is and goes into the handover.

---

## Steps

1. **508, the change key.** The handover makes nclite's rename of `CHANGE_META` to `'plugin/change'` part of
   the vendoring change (with the Journal plugin's `nclite/change` in `plugins/journal/engine/engine.js` and
   its `plugin.d.ts`), never a later request.
2. **509, the host's real checks.** `tests/plugin/contract/` holds verbatim copies of nclite's
   `shared/plugin-host.ts`, `shared/plugin-checks.ts` and the pure part of `engine/plugins/stylesheet.ts`,
   each with its sha256 in the README. No edited line: the one known difference (the change key) is a
   named test that fails the day nclite renames. `plugin-types.test.ts` runs nclite's `storedChangeOf` and
   `checkRef` (not `storesChange` / `fitsRef`); `plugin-build.test.ts` runs nclite's `checkStylesheet`
   (with its `HOST_PROPERTIES`), beside the board's own `checkScope`.
3. **510, the switch stays off standalone.** `apps/board/src/flags.ts` `pageFlags` drops `HOST_FLAGS`
   (`withoutHostFlags`), so `?flags=singleAgent` and `vb.flags` cannot reach the view; a test holds it.
4. **511, the count.** `#agent` `boardWriteSummary` counts only items that went and were not a replay
   (`replayed: true`), so "Changed N cards" counts what was written; a test holds it.
5. **512, the bot's instructions under `singleAgent`.** The plugin's MCP instructions and tool descriptions
   drop sign-up and grant steps when the engine runs `singleAgent` (T_02-R4 of the 2026-11-07 set); the
   skill gains room. `npm run eval:bot` passes before merge. Done by a sub-agent (Opus 5.5).
6. **513, an honest handover.** `HANDOVER_nclite_plugin-contract.md` is corrected to claim only what tests
   prove; adds point 500, the stranded-chip note, the 14-byte headroom (or the new figure).
7. **514.** Full gates, commit, merge to main, and the same reviewer brief run again.

---

## Files Involved

| File | Purpose |
|------|---------|
| `tests/plugin/contract/*` | Verbatim host copies, README, their test (step 2) |
| `apps/board/tests/plugin-types.test.ts`, `apps/board/tests/plugin-build.test.ts` | Use the host's checks (step 2) |
| `apps/board/src/flags.ts` (+ its test) | Step 3 |
| `packages/agent/src/claude-stream.ts` (+ its test) | Step 4 |
| `apps/board/server/engine/tools.ts`, `apps/board/plugin/words/*`, `skills/vision-board/SKILL.md`, `tests/evals/bot/*` | Step 5 (sub-agent owns these) |
| `cortex-tasks/board/2026-11-07_board-app_plugin-contract/HANDOVER_nclite_plugin-contract.md`, `docs/specification/plugin.md` | Step 6 |

---

## Constraints

- Never edit the host copies; a difference from nclite is a test, not an edit.
- Never use port 4466; page tests take `VB_TEST_PORT=5700`.
- No change to the lock, `readOnly`, or the person's ✓, ✗ and approving.
- **STOP** if a fix needs a contract change in nclite beyond the key rename.

---

## Success Criteria

- [ ] No committed test re-implements a host check the host ships; the copies match nclite by sha256.
- [ ] `?flags=singleAgent` does nothing in the standalone app (test).
- [ ] A replayed item is not counted (test).
- [ ] Under `singleAgent` the bot is never told to join or ask for a grant; `eval:bot` passes.
- [ ] Handover states the rename as a vendoring step and claims only what is tested.
- [ ] `npm run verify`, `npm test`, `npm run test:plugin`, page suite pass; second review run.
- [ ] Task file updated with completion notes

---

## References

- `cortex-tasks/board/2026-11-07_board-app_plugin-contract/` (PLAN, TASK-STATUS: T_02-R4, BE_01-R4)
- `docs/specification/plugin.md`; `docs/decisions.md` D-096

---

## Implementation Notes

### Steps 1–4, 6 (508–511, 513), the orchestrator

- **509**: `tests/plugin/contract/nclite/` mirrors nclite's paths with byte-for-byte copies (contract, `plugin-checks.ts`,
  `stylesheet.ts`, `provenance.ts`, `words/plugins.ts`) so imports resolve unchanged; the one stand-in is
  `shared/plugin-adapters.ts`. The old edited copy is gone; the key difference is the test "the one known difference".
  `plugin-types.test.ts` runs nclite's `storedChangeOf` (and asserts it stores nothing under the board's key today) and
  `checkRef` on the ack and line refs; `plugin-build.test.ts` runs nclite's `checkStylesheet`. The re-implementations
  (`storesChange`, `fitsRef`, the `var()` stray check) are deleted. nclite HEAD moved to `4356abee` during the work; the
  copied files are unchanged since `a975c1ca`.
- **510**: `apps/board/src/flags.ts` `pageFlags` reuses `withoutHostFlags`; `apps/board/tests/page-flags.test.ts`.
- **511**: `#agent` `boardWriteSummary` skips `replayed: true`; one home, so the standalone chat line counts the same.
- **513**: handover rewritten: the rename (and the Journal's key, vendored, so in its source) is step 1 of vendoring;
  proofs name the host's copied checks; point 500, the nested-rule gap, the two-switch agreement, C1's real figures, the
  C2 premise, and "descriptions from `tools.list()`, never `words.json`" (512's request). `plugin.md` follows.
- **Gates**: verify ok; `npm test` 2437 + 14; `test:plugin` 103/103; page suite below.
- **Caught beyond the brief**: the trim kept `request_grant` listed (a manifest change otherwise); the descriptions in
  `words.json` stay flag-free, so the handover now tells the host where to read them from.

### Step 5 (512)

Sub-agent (Opus 5.5). T_02-R4 done: under `singleAgent`, the bot is told nothing about joining, secrets, grants or
`needs-grant`; off, every word is as before.

- **Mechanism, reused.** `apps/board/server/words/plugin-tools.ts` gains `singleAgentEdits` (descriptions) and
  `singleAgentInstructionEdits`, made after the existing edits only with the flag on; `DescriptionEdit` gains `until` (cut up
  to a text, `''` to the end, as `skillEdits` do). `apps/board/server/engine/tools.ts` `makeTools` reads `singleAgent` from
  the flags it already gets (`forPlugin`, `instructions`). Edited: `get_board` (no grant `requests`/`holders` line),
  `show_container` (no "ask for a grant"), `list_open` and `check_responses` (no "Only the containers you hold", untrue
  unscoped; no grant answers), `write_board` (no `needs-grant`/creator sentence; "you may write on every board here, one the
  person made too, without asking; a board with no container takes a `region` item first"), `request_grant` (whole
  description: not needed, answers `{ held: true }`, never call it), and the instructions (the grant sentences go).
- **`request_grant` stays listed** under `singleAgent`. Why: the manifest's `tools` are the engine's list with no flags
  (`build-plugin.ts` `textFiles`), and plugin.md / `manifest.ts` promise `tools.list()` equals them; dropping it under a flag
  would be a contract change in nclite (the task's STOP). Its name stays; its words say it isn't needed.
- **Instructions need `botToolRules`**, as before: with it off a host gets no plugin instructions (plugin.md), so the
  `singleAgent` instruction edit applies only where instructions exist. nclite sets both.
- **The skill is the same whatever the flags**: it already says nothing of grants (held by `plugin-skill.test.ts`). A host
  that turns `singleAgent` off gets the grant steps from the instructions and tool descriptions, which then stay as today.
- **Evals caught two failures that were already there** (A/B with the edits switched off: send-round `no-re-read` 1/3,
  new person-board `done-only` 0/3 on the old words). Fixes, all plugin-only: `list_open` and `check_responses` (rules)
  "never call it to read what your host's message lists"; the instructions (rules) carry the quiet rule; the plugin
  skill's quiet rule gains a second reasoning example ("no regions yet, so I'll add one"), paid for by cutting "The tools'
  descriptions hold the exact fields." from its intro (`skill-edits.ts` `INTRO`, `RUNNING`). `SKILL.md` unchanged.
- **New eval scenario** `tests/evals/bot/scenarios/person-board.ts`: a board the person made, `singleAgent` held on by the
  scenario (`Scenario.flags`, merged over `--flags` in `eval.ts`; `Person.board` in `host.ts`, a throw in
  `standalone.ts`): no `request_grant`, the card on their board, "Done." only.
- **Plugin `skill.md`: 8,178 → 8,166 B** (26 B under `SKILL_BYTES`).
- **Evals** (`--flags singleAgent,-followOtherWriters,botToolRules --port 6080`, reports `temp/s512-live*/`): first full
  78/80; diagnosis send-round + person-board ×3 29/33; A/B old words 28/33; after list_open words 31/33; instructions quiet
  14/15; skill example 15/15; **final full 80/80, $0.4527**. Spend in all **$1.76**.
- **Gates**: `npm run verify` ok; `npm test` 2436/2437, the one failure `tests/plugin/spec-truth.test.ts` "the seam names no
  host" on step 6's in-progress `plugin.md` edit (nclite named outside the last section), not this step; `npm run
  test:plugin` 103/103 (`VB_TEST_PORT=5800`); dry eval 80/80; `apps/board/tests/plugin-skill.test.ts` "singleAgent
  (T_02-R4)" holds the words both ways.
- **For step 6 (plugin.md / handover)**: § The bot "Words differ per host" and § Tools `tools.instructions` should add the
  `singleAgent` edits and the instructions' quiet sentence; `request_grant` is listed under `singleAgent` saying it is not
  needed; words.json's `board.tool.*` texts are the flag-free (grant) descriptions, so a host gives its bot `tools.list()`'s.
  The skill is now 8,166 B (26 B headroom).

### Second review's fixes (points 516–520, maintainer yes at 521)

The second independent review scored 5/10 and found a blocker the first missed. Fixed:
- **516, the sheet's scope**: nclite's loader (`checkPluginStylesheet`) takes the scope from the plugin's adapter entry,
  else its id (`board`), and refuses the sheet under `board`. The contract's manifest has no scope field, so the handover
  now asks nclite to keep `board: { icon: 'board', css: { scope: 'vb' } }`. The fixture's stand-in holds exactly that
  entry; `plugin-build.test.ts` runs `checkPluginStylesheet` and shows the refusal without it. The icon stays nclite's
  (the spec leaves it out of the manifest: a name in the host's own list).
- **518a, one source for singleAgent**: `read_ledger` answers `oneAgent: true` when the engine runs `singleAgent`
  (schema `read-ledger-response.schema.json`, `npm run gen`); `live.ts` tracks it beside `readOnly`; `host.ts`
  `chatStatusOf` takes it from there, not from a view setting. Tests: `engine-switches.test.ts`, `view-hooks.spec.ts`
  (the engine's flag alone unscopes; a view setting alone does nothing).
- **518b, skill size**: `plugin-skill.test.ts` holds `skill.md` to the contract's `SKILL_BYTES`.
- **518c–e, handover**: seam moved before vendoring; "a refused write joins nobody" narrowed to whole-write refusals
  (comment in `operations.ts` too: making the join lazy would thread through retry-key lookups; not worth it);
  "80/80" said to be one run per scenario.
- No bot-facing words changed in this round, so no new `eval:bot` run.

### Third review's fixes (points 523–527, maintainer yes at 528)

Third review (told the settled decisions): 7/10; it ran nclite's `scripts/plugin-vendor.ts` on the build, which passed.
- **523, two missing vendoring steps**: the row's `provenanceSha256` (the pin `vendor()` prints) and `BoardSeams` in
  nclite's `app/src/lib/plugins/seams.ts` (it imports `boardHost` from the adapter). Both in the handover and plugin.md.
- **524, older WebKit**: `scripts/verify-style.mjs` now checks nested rules: a nested selector starts with a symbol,
  never an element name (WebKit before Safari 17.2 drops it). Four selectors in `packages/ui/src/base/root.css` became
  `:is(svg):where(& *)…`. `npm run test:plugin:webkit` (config `VB_TEST_BROWSER=webkit`) is added but has not run: the
  WebKit build this Playwright needs is not downloaded (needs the maintainer's yes). Playwright's WebKit is current, so it
  would not reproduce the older-Safari rule anyway; the static check does.
- **525, wrong claims made true or corrected**: the 20 unprefixed properties the board's sheets read or the script sets
  (`--kind`, `--surface`, `--gap`, `--card-surface`, `--arrow`, …) are renamed `--vb-*` (no exact clash; 25 files), and
  verify now fails a board sheet that reads any other than `--vb-*` / `--host-*` (`ownReads`). D-096 point 5 is now true.
  D-097 appended (maintainer, 527–528): the two-field entry nclite keeps, `singleAgent` from the engine alone, the nesting
  rule. Handover: "11 problems" is over a thousand; `flags.ts` comment and plugin.md "no adapter" corrected.
- **526**: a board-only change line (`cards: []`) opens the board with no "no longer there" notice (`mount.ts` `show`;
  `view-gives.spec.ts`, shown to fail without the fix); the `plugin-types` message says what it tests; one `isCount`
  (`#actions`) for `mount.ts`, `live.ts` and `chips.ts`; the contract README says its sha test catches edits, not drift.

### WebKit run (point 529, maintainer yes)

Playwright's WebKit 26.6 downloaded (77.5 MB). First run: 25/104. Every failure but one was WebKit reporting
"ResizeObserver loop completed with undelivered notifications" as a page error; a tagged trace named the observers:
- `Toolbar.svelte`: the bar's width set inside the observer changed its tier, so its own size; now set on the next frame.
- `AccessRequests.svelte`: the strip's height (`bind:offsetHeight`) wrote `--vb-strip-h` and moved the stage in the same
  pass; now written on the next frame, removed at once when the strip goes.
- `ReplyPanel.svelte`: WebKit gives a clicked button no focus, so the close button found the focus already on the page
  and the stage never took it; `close()` moves it to the stage itself.
Then 104/104 in WebKit and 104/104 in Chromium. Handover's WebKit note rewritten.

### nclite's two asks before vendoring (maintainer, 2026-11-08)

- **The id is `vision-board`.** One home: `#actions` `CHIP_PLUGIN`. The manifest's `id`, the folder
  (`build-plugin.ts` `DEFAULT_OUT`, `dist/plugin/vision-board/`), every words key (`plugin-words.ts`, `manifest.ts`
  `toolKey`, `tools.ts` `CHANGE_WORDS`, the schema's `wordsKey`, `scripts/words.test.mjs`, the 71 words files' `Keys:`
  comments), chips and events. The schema's `id` takes nclite's rule. The seam types' hash moved (the chip's `plugin`
  literal); SEAM stays 2, as no host has it yet. skill.md is byte for byte unchanged (8,166 B), so no bot eval; the
  skill and tool descriptions name tools bare, which reads right beside `vision-board_write_board`.
- **The manifest's `scope`, `vb`** (`manifest.ts` `SCOPE`; schema: nclite's pattern, not `host`/`ui`). The stand-in
  adapter is `'vision-board': { icon: 'board' }`. Two copied nclite lines changed for the field (`PluginManifest`
  `scope?`, `checkPluginStylesheet`'s `scope` parameter); `plugin-host.test.ts` undoes them and checks the source sha256,
  and the contract README names them.

### nclite's bug report: a deleted data folder left the engine stuck (maintainer, 2026-11-08)

With nclite's flags (`singleAgent`, `followOtherWriters` off, `botToolRules`), deleting the data folder or its ledger
file while the engine ran made every later write a 409 `conflict` (`ledgerFileGone`) until a restart: the ledger's
`gone` refusal (FIX_01 F1) is there for standalone, where another server moves the file into `main/`, but a host has no
"open the folder again".
- **Fix**: `openLedger`'s new option `startAgainWhenGone` (`ledger.ts`): a file or folder deleted since it was read is a
  new, empty ledger, read again from the start (reset listeners told, so the plugin's `watch` says `{ head: 0 }`) and
  made again by the next append. The engine passes it when it opens its own ledger (`engine.ts` `createEngine`, no
  host `ledger`): every host's engine, either `followOtherWriters`. The standalone server opens its ledger itself and
  keeps the refusal (`api-ledger-gone.test.ts` unchanged), because there a gone file is most often one another server
  moved into a ledger folder, and writing anew would start a second ledger beside it; the person has Open folder.
- **Tests first** (all failed before the fix but the older-copy case, which already worked):
  `apps/board/tests/engine-folder-gone.test.ts`, the plugin engine with nclite's flags, `followOtherWriters` off and
  on: the folder deleted, the ledger file deleted, the folder replaced with an older copy, a new empty folder in its
  place, then the bot's `write_board` and the person's `PUT boards/<id>` go, the file holds what they wrote, `watch`
  said `{ head: 0 }` first, and `get_board` reads the disk; the person's write first; a folder from elsewhere; an empty
  file deleted is never later taken for a replaced one (fails without that line). `tests/plugin/engine-folder-gone.spec.ts`
  runs the deleted and older-copy cases on the built bundle.
- Tried and dropped, as no test needed them with `singleAgent` (its one agent holds every board): reading the file
  before the caller is taken, and reading the agents file again after a reset.
- Seam types unchanged (the build's check passed), SEAM stays 2, no flag added or changed. Spec: plugin.md § The engine
  `watch` row; api.md's "A watcher follows a move" says the refusal is standalone's only.

### nclite's item 160: the host's `pageChanged` (maintainer, 2026-11-09)

nclite's pane header greys its Add to chat when `pageChip()` is null, and could only ask, never hear, when that changed
(nclite `temp/panel-layout/plugin-handover-160.md`).
- **Contract copy**: `pageChanged(): void` added to `PluginHost` in `tests/plugin/contract/nclite/shared/plugin-host.ts`,
  word for word as the handover gives it, as a README edit that `plugin-host.test.ts` undoes before its sha256 check
  (like `scope`). The board's own `BoardHost` has it **optional** (`host.ts`), so a host without it still fits: an
  addition, `SEAM_TYPES` set again, `SEAM` stays 2 (`plugin-types.test.ts`'s host uses it, so taking it out fails).
- **When** (`board/mount.ts` `tell`): once after each boot's first draw settles, then, a microtask after any status
  change, when the chip's board, label or detail differs from what the host was last told. The chip's `head` is left out
  of the comparison: it moves with every line on any board, and the host reads it fresh. Never after `unmount` (the
  status listener goes with it, and `gone` stops a late call).
- **Tests**: `tests/plugin/page-changed.spec.ts` on the fake host (which counts the calls): the first draw (null), an
  agent's first board arriving and opening, a card added and another board drawn (no call), switching to another board
  and back, a rename, the shown board archived (the next board shows), the last board archived (null), one restored and
  opened; a board already there at mount (one call), none after unmount; a host without it. Run three times, stable.
- Spec: plugin.md's host table has a `pageChanged` row and the view table's `pageChip` names it; components.md says it.
- Fixed on the way: `tests/plugin/engine-folder-gone.spec.ts`'s `watch` listener type failed `npm run check` (from 5fdbda8).

### The skill for a host that lists skills, and Haiku's two gaps (maintainer, 2026-11-09)

From the Haiku 5.5 eval (points 538, 539) and nclite's skills-as-skills handover (the Journal's `label`, b331fde there).
- **Front matter** (`SKILL.md`, both skills): `name`, then `label: Chats through the board` (Bot › Skills names the row
  by it), then a `description` that says what the board is and when to read the skill ("Read this before you draw on
  it or answer what they sent, and when ..."). The plugin's has no `status` line (`skill-edits.ts`); the standalone keeps
  its history. `plugin-skill.test.ts` "the plugin skill opens with front matter" holds the order, the few words and
  the 1,000 characters. Still within `SKILL_BYTES` (8,174 of 8,192 B), since nclite's main still has the budget:
  examples trimmed (one key example, "containers stack down the screen").
- **Instructions** (`plugin-tools.ts` `instructionEdits`): "Open your `vision-board` skill before your first
  `write_board`", for a host that shows only the description until the bot opens the skill.
- **538, summary**: "to sum cards up in one card is to retire them" beside "Only when the person asks" (plugin), and
  the same in the standalone's words.
- **539, the Send line** (`actions-message.ts` `theseAreThePersonS`): "Answer from them; only if the person says they
  changed more since, call check_responses ... with after N", no longer an invitation to read again. Tests, gallery,
  api.md and scenarios.md quote it.
- **Evals** (nclite's flags on Haiku; `VB_TEST_PORT` 9800/9900/10000, ports 6080/6180/6280; $3.16 in all):
  - Haiku, the five failed scenarios ×3: 92/93; `cards-retired` 3/3 (0/2 before), `no-re-read` 3/3 (0/2 before); the
    one miss is new-card-number's reply in the same call (model miss, 1 of 3 as before). Haiku full set: 80/80 (76, 77).
  - Sonnet, plugin (the gate): 79/80, and 78/80 after the last trim. The misses: `person-board/done-only`, Sonnet
    narrating "Empty board; needs a region first", which fails 2 of 3 on the old words too (pre-existing; the scenario
    came after T_02); `refusals/no-propose-without-source` 2 of 10 on the new words, 0 of 4 on the old, 5 of 5 in a row
    on the new: read as a flake.
  - Standalone (Sonnet): 17/19. `ledger-picture/done-only` (narration; 1 of 3 on the old words, known since 11-05) and
    `join-ledger/one-line` (2 of 3 on the old words): both pre-existing.
- Not done (proposed): `write_board` result flagging a picture path that does not resolve (540); `size`/`widths` left
  out of the bot's schema under `botToolRules` (541); a done-only check in new-card-number (542); a fix for Sonnet's
  narration on an empty board (the instructions' "no regions yet" example may prime it).
