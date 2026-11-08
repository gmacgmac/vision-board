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
