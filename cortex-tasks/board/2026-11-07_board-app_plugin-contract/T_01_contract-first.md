# T_01_contract-first: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Write seam 2 down before any code moves: plugin.md, the two flags, the change words, the contract fixture, and the
D-096 draft.

---

## Context

PLAN.md Goal State and Decisions 1-10 are the brief. The code is BE_01's, BE_02's and FE_01's (wave 2); this task says
what they build and names the test that will prove each promise (tests that do not exist yet are fine to name: the
wave-2 tasks write them, and `tests/plugin/spec-truth.test.ts` will fail until they do; say which in your notes).

---

## Inputs

- **Files to modify**: `docs/specification/plugin.md`, `docs/specification/api.md` (the `vb/change` mentions and the
  agents/grants lines under a host), `packages/format/src/flags.ts` (`FLAGS`, `FLAG_DESCRIPTIONS`) and its test, a new
  words file under `apps/board/plugin/words/` for the change words (keys must come out as `board.change.board`,
  `board.change.card`, `board.change.cards` in `words.json`: check `apps/board/bin/plugin-words.ts` `wordsFile` for how
  keys are named), new `tests/plugin/contract/plugin-host.ts` and `tests/plugin/contract/README.md`.
- **Files to reference**: nclite (read-only) `shared/plugin-host.ts`, `docs/plugins.md` (§ The contract, § Refs, § The
  bot's registration, § A guest in the app's page, § What nclite gives the engine), `shared/plugin-adapters/board.ts`,
  `app/src/lib/plugins/chat.ts` `lineMatches`; the board's `tests/plugin/spec-truth.test.ts`,
  `apps/board/tests/plugin-types.test.ts`, `docs/specification/words.md`.
- **Skills**: `cortex-architecture`, `cortex-docs`.

---

## Steps

1. [x] Copy nclite's `shared/plugin-host.ts` to `tests/plugin/contract/plugin-host.ts` with exactly one change:
   `CHANGE_META = 'plugin/change'` (PLAN Decision 5), marked by a comment. `README.md` beside it: source path, the
   nclite commit (`git -C /Users/dev/AI/nclite rev-parse HEAD`, read-only), the source's sha256, the change, and how to
   refresh it. Check it is not swept by a words or host-name scan; adjust only by an exclusion the scan already supports.
2. [x] Flags: `singleAgent` (default false) and `followOtherWriters` (default true), each with its description, as the
   flag file's rules ask.
3. [x] Change words: the three keys, nclite's legacy text word for word (PLAN Decision 6).
4. [x] plugin.md, for seam 2, with every promise naming its proving test:
   - § What the host gives: `events` takes a `Ref` (`{}` catch up; `head: 0` read from the start; `head` changed
     through; other keys ignored); `chat` per the contract (`attach`, `add` given by the host and not used by the
     board unless you decide otherwise, `send(record)` with `record(acks)`, `status`, `reveal(ref)`, `hasLine(ref)` with
     `{ board, cards: n }`).
   - § The chat: `send(record)` and the acks mapping (null = no chat; `[]` or no ack for this board = nothing new;
     an ack `{ board, head }` = answers read through `head`).
   - § The engine: `flags` lists every flag the engine reads (`svgImages`, `botToolRules`, `insertBetween`,
     `singleAgent`, `followOtherWriters`); `resolve`'s answers chip gives `ack`; `watch` with `followOtherWriters`.
   - § The bot: with `singleAgent` no sign-up; what the switch does and does not change (PLAN Decision 3), the lock.
     Without it, `POST agents` as now.
   - § Tools: `_meta['plugin/change']` `{ words, count, subject, reveal }`, its bounds, which write carries it.
   - § The manifest: `changeWords`.
   - § The types and the seam version: seam 2 and why (what broke).
   - The "What nclite needs" section: the flags to set (engine and view), the two asks.
   - No host names before that last section.
5. [x] api.md: the same facts where it states them (no second copy of the detail: point to plugin.md).
6. [x] Draft D-096 in your notes (exact wording, for the maintainer's yes; do not edit `docs/decisions.md`).

---

## Validation

- [x] `node --test packages/format/tests/flags.test.ts` passes; `npm run verify` passes.
- [x] `tests/plugin/spec-truth.test.ts`: list in your notes which failures wait on wave 2 and why; none other.
- [x] Words scans (`scripts/words-homes.mjs`, `scripts/words-scan.mjs`) pass.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-07 (Opus 5.5)

### Changes Made
- `tests/plugin/contract/plugin-host.ts`: nclite `shared/plugin-host.ts` at HEAD `a975c1ca` (file last changed `da90f265`),
  source sha256 `63622aad…e275`, with one line changed: `CHANGE_META = 'plugin/change'` plus a trailing comment. Same
  line count; `diff` shows only line 364.
- `tests/plugin/contract/README.md`: source, commit, sha256, the one change, how to refresh.
- `tests/plugin/contract/plugin-host.test.ts` (new; holds the README): the copy with that line put back hashes to the
  README's sha256; `CHANGE_META` is `plugin/change`. 2/2 pass. **Not yet in `npm test`** (glob `tests/plugin/*.test.ts`
  stops at the folder): REQUEST 1.
- `packages/format/src/flags.ts`: `singleAgent` (default false) and `followOtherWriters` (default true), comments and
  `FLAG_DESCRIPTIONS`; two tests in `packages/format/tests/flags.test.ts`.
- `apps/board/plugin/words/change.ts` (new): `board`, `card`, `cards` → `board.change.board|card|cards` in `words.json`
  (checked with a build to `temp/`, removed after); text word for word nclite's `LEGACY_CHANGE_WORDS`.
- `docs/specification/words.md`: one row for the new words file (see Deviations).
- `docs/specification/plugin.md` for seam 2: "One shape everywhere" up top; § What the host gives (`events` refs, the
  `singleAgent` setting); § What the view gives (`reveal(ref)` any `Ref`); § The chat (`PluginChat` less `add`,
  `record(acks)` mapping, `{ board, cards: n }`, change line, no-chat `record(null)`); § A guest (the `vb` scope rule,
  the root's `position`); § The engine (flags table, `resolve`'s `ack`, `watch` with `followOtherWriters`); § The bot
  (two modes, what `singleAgent` does and does not change, the lock); § Tools (the change line, bounds, `CHANGE_META`'s
  one home named `apps/board/server/engine/tools.ts` `CHANGE_META`); § The manifest (`changeWords`); § The types and the
  seam version (seam 2 and the table of what broke); Open points 2 and 14 touched; § What nclite needs rewritten (the
  closed v0.1 gap table removed; the flags to set, the two asks).
- `docs/specification/api.md`: 46, 159, 160, 162, 163 amended to point at plugin.md; new 175 (seam 2 summary).

### Tests plugin.md now names that wave 2/3 must write (spec-truth fails until they exist)
Exact titles (each must start the test's title):
- BE_01: `apps/board/tests/plugin-types.test.ts` "the types satisfy the host contract" (`mount` → `Mount<HTMLElement>`,
  `createEngine` → `CreateEngine`, against `tests/plugin/contract/plugin-host.ts`); `view-hooks.spec.ts` "events: a ref of
  the contract", "chat.status: singleAgent"; `view-gives.spec.ts` "reveal: a ref of the contract";
  `send-what-went.spec.ts` "acks:"; `engine-hooks.spec.ts` "resolve: the answers ack"; `tools.spec.ts` "tools.call: the
  change line", "the bot: singleAgent" (needs BE_02's engine; BE_01 may write it skipped-until or BE_02 asks for it);
  `apps/board/tests/engine.test.ts` "a board write says what it changed"; `apps/board/tests/plugin-build.test.ts` "the change
  words are in the manifest and words.json".
- BE_02: new `apps/board/tests/engine-switches.test.ts` with "every flag the engine reads is in the spec",
  "followOtherWriters off:", "singleAgent: no sign-up", "singleAgent: the folder's one agent", "singleAgent: no grants and
  no scoping", "singleAgent: the lock and the person's acts" (the last three sit after a line break, so spec-truth's regex
  does not see them: write them anyway).
- FE_01: new `tests/pages/host-position.spec.ts` "a host's own position on the root wins"; `scripts/verify-style.test.mjs`
  "a selector outside the scope" (an `.mjs`, not checked by spec-truth); `apps/board/tests/plugin-build.test.ts` "the built
  sheet stays in its scope" (BE_01's file: REQUEST 2).
- Spec-truth today: 7/8 pass; test 1 fails on these 15 citations and nothing else (checked with a script that lists every
  miss, not only the first).

### Issues & Resolutions
- `npm test`: 2418/2420. Fails: spec-truth test 1 (expected, above), and `api-ledgers.test.ts` "the folder open now…",
  because the worktree had no built page (`/` sets no cookie). After `npm run build` it passes; not caused by this task.
- `npm run verify`: ok (warns `tests/plugin/contract/plugin-host.ts` 444 lines; left as is, since a `verify: long-file`
  marker would be a second change to the copy).
- `tsc -p tsconfig.json`: clean (the copy compiles under the repo's strict settings).
- Words scans (`scripts/words.test.mjs`, `scripts/words-scan.test.mjs`): pass.

### Caught Beyond the Brief
- `docs/principles.md` § The board is a plugin still says "Where the board needs a different shape, the contract changes,
  not the board (maintainer, 2026-10-26)", which Decision 1 reverses; it also places the board in "the bot's
  `plugins/board/` in nclite" where plugin.md says `.visionboard` in the bot's workspace. Protected file: the orchestrator
  should propose the exact change.
- A `write_board` whose every item failed still answers without `isError`, so it carries a change line, count 0, "Changed
  board" (as `vb/change` did with `cards: []`). The summary can't tell a board-only change from nothing; BE_01 could leave
  the meta out when the write appended no line (head unmoved). plugin.md promises a line for any non-`isError` write today.
- `count` is `reveal.cards.length`, and `boardWriteSummary` caps the cards at `MAX_CARDS` (200): a larger write would say
  200. Within `REF_LIMITS.maxItems` (500), so safe, only understated.
- The contract's `PluginHost` gives every member (`store`, `imageRoute`, `chat.reveal`, `chat.hasLine`, `chat.add`); the
  board keeps the first four optional, which assignability allows, and never calls `add`.
- spec-truth's citation regex does not cross a line break, so a title cited after a wrap is not checked (as with the
  singleAgent titles). BE_01 owns that test, if it wants to tighten it.
- `chat.status.agent` from a contract host is a string nclite derives (`bot-…`); without `singleAgent`, the view would
  scope the answers chip to an id no ledger line carries and light nothing. So nclite must set `singleAgent` in
  `viewSettings` too, not only `engineFlags`: plugin.md's last section says so.

### Deviations from Plan
- `docs/specification/words.md` is not in T_01's file list, but `scripts/words.test.mjs` "the doc lists every words file"
  fails without a row for the new `apps/board/plugin/words/change.ts`. Added that one row only.
- One test file beyond the brief, `tests/plugin/contract/plugin-host.test.ts`, inside T_01's `tests/plugin/contract/`, so
  the README's "one change, this sha256" is held by a test.

### D-096 draft
For the maintainer's yes; to append to `docs/decisions.md` as written:

```
## D-096 The board's seam is the host contract's shapes (seam 2)
- **Date**: 2026-11-07 · **Status**: Accepted (maintainer, point ___) · **From**: nclite's handover (its N592, N593), points 458-492
- **Decision**:
  1. One shape everywhere: the board's seam is the host plugin contract's shapes (`Ref`, `SendRecord`, `ChangeMeta`, `PluginHost`, `CreateEngine`), in its own page and server as in any host; no adapter and no plugin-mode branch. A copy of the contract is a test fixture (`tests/plugin/contract/`), never the spec. The seam moves to 2.
  2. Events, `chat.reveal`, `chat.hasLine` and `view.reveal` take plain `Ref`s (a line is `{ board, cards: n }`); `chat.send(record)` calls `record(acks)`; the answers chip's `resolve` gives `ack: { board, head }`.
  3. A board write's change line is `_meta['plugin/change']`, `{ words, count, subject, reveal }`, its words keys `board.change.board|card|cards` listed as the manifest's `changeWords`, their text word for word the lines a host already stores. The key names no host; nclite is asked to rename its `CHANGE_META` to it.
  4. What differs inside a host is a flag the host turns on, never a fork. `singleAgent` (off): no sign-up, any caller id, never compared, no grants, no scoping, every agent line written as the folder's one agent (the first joined, else one the engine joins, named by `name()`); the board lock, `readOnly` and the person's ✓, ✗ and approving stay. `followOtherWriters` (on): off, the engine never polls the ledger for another writer. Standalone leaves both at their defaults.
  5. Every selector of the plugin's stylesheet stays in the `vb` scope, by the host's rule, held by `npm run verify`.
- **Why**: nclite hosts every plugin through one contract it owns (its ADR-0288), and carried a translator and a stylesheet waiver for the board alone. Built to the contract, the board needs neither, and any host built to it mounts the board as it is.
- **Task**: cortex-tasks/board/2026-11-07_board-app_plugin-contract/TASK-STATUS.md
```

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [project-docs] T_01: … → Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/T_01_contract-first.md]]`
