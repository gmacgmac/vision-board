# BE_01_seam-2-shapes: Seam 2 Shapes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the board's seam the host contract's shape (B1, B2, B4), everywhere it runs, with seam 2 and a type test that
holds the built `plugin.d.ts` to the contract fixture.

---

## Context

T_01 wrote the promises in `docs/specification/plugin.md` and named the tests; build to that page. PLAN.md Current
State lists every producer and consumer. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: as TASK-STATUS File Ownership, BE_01 row.
- **Files to reference**: `tests/plugin/contract/plugin-host.ts` (T_01), plugin.md, nclite (read-only)
  `shared/plugin-adapters/board.ts` (what each piece maps today: `storedBoardChange`, `boardChat`, `headOf`, `ackOf`,
  `boardEventRef`, `revealOf`).
- **Shared artifacts to reuse**: the change words and the flags (T_01); `boardWriteSummary` (`packages/agent`) for the
  cards a write changed.
- **Skills**: `cortex-architecture`, `cortex-docs`.

---

## Steps

1. [x] **B1.** One home for the key `plugin/change` (replace `TOOL_CHANGE = 'vb/change'`); `withChange` gives
   `{ words, count, subject, reveal: { board, cards } }`: words by card count (none / one / more), `count` the cards,
   `subject` the board id, `reveal` dropped when it would break `REF_LIMITS` (cards capped as the contract allows).
   The manifest gains `changeWords` (`manifestOf`, `manifest.schema.json`); `words.json` carries the three texts.
2. [x] **B2.** `chat.send(record)` gives `record(acks: readonly Ref[] | null)`. The answers chip's `resolve` gives
   `ack: { board, head }` (drop the top-level `head` if nothing else needs it). The view maps acks to what
   `controller.send` needs (PLAN Goal State 3). Standalone's bridge calls `record(null)` where it called `record()`.
3. [x] **B4.** `ChatLine` → a `Ref` `{ board, cards: n }`; `events` listeners take `{ plugin, ref: Ref }` and read only
   `head` as before. Standalone's `page-host.ts` and `chat-bridge.ts` (`lastChange` matching a number in `cards`),
   both fake hosts and their specs move with it. Prefer the contract's own type names where the board's differ only
   in name, but keep the board's types generated from its own code (no import from the fixture in shipped code).
4. [x] **View under `singleAgent`**: the view setting of that name on → the answers chip and Send's enablement ignore
   `chat.status.agent`.
5. [x] **Seam 2.** `SEAM = 2`, new `SEAM_TYPES`; `plugin-types.test.ts` `HOST` uses every new member; the fake host's
   `SEAM_WRITTEN_FOR`.
6. [x] **Contract test.** A test that compiles a small check against the built `plugin.d.ts` and the fixture:
   `mount` assignable to `Mount<HTMLElement>`, `createEngine` to `CreateEngine`, the manifest to `PluginManifest`, a
   write's `_meta` to the contract's `ChangeMeta` within `CHANGE_LIMITS` / `REF_LIMITS`, and the fixture's
   `CHANGE_EXAMPLES`-style check for the board's change (words listed in `changeWords`). Name it as plugin.md does.
7. [x] Every test plugin.md names for B1/B2/B4 exists and passes.

---

## Validation

- [x] `npm run build:plugin`, `npm run verify`, `npm test`, `npm run test:plugin` pass (`VB_TEST_PORT=9500`).
- [x] Page specs that touch the chat and the host harness: `tests/pages/board-host*.spec.ts`, `chat-send*.spec.ts`,
      `send-*.spec.ts`, `chat-send-scope.spec.ts` pass.
- [x] `tests/plugin/spec-truth.test.ts` passes for everything BE_01 owns.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-07 (Opus 5.5)

### Changes Made
- **Shared shapes** (`packages/actions/src/answers/chips.ts`): `Ref`, `RefValue` (type aliases, so a plain object is one);
  `ChipText.ack?: Ref`; `AnswersText` carries `ack: AnswersAck` (`{ board, head }`) and no top-level `head`;
  `acksRead(acks, board)` maps a host's `record(acks)` to what the board records (null: no chat, covers all; first ack of
  this board with a whole-number head; else nothing new). `sendHead` unchanged (the standalone server still calls it).
- **B2/B4 view** (`apps/board/src/board/host.ts`): `PluginEvent { plugin, ref: Ref }` (was `BoardEvent`), `ChatLine =
  { board, cards: number }`, `SendRecord = (acks: readonly Ref[] | null) => …`, `BoardView.reveal(ref: Ref)`;
  `chatStatusOf(host)` drops `status.agent` under `singleAgent`. `live.ts` reads only a whole-number `head` (else a
  catch-up); `mount.ts` reads `board`/`n`/`seq`/`cards` only when of their kind; `controller.ts` `send(id, acks)` via
  `acksRead`; `chat-side.ts` asks `{ board, cards: n }` and reads the status through `chatStatus`.
- **Standalone**: `shell/chat-bridge.ts` `record(null)` where it called `record()`, `reveal`/`hasLine` on `{ board, cards }`;
  `shell/page-host.ts` type rename only.
- **B1** (`apps/board/server/engine/tools.ts`): `CHANGE_META = 'plugin/change'` (replaces `TOOL_CHANGE`), `CHANGE_WORDS`
  (keys held to `plugin/words/change.ts` by a type-only import), `ChangeMeta`, `CHANGE_BOUNDS`, `changeOf(board, cards)`
  (reveal left out over the bounds, never trimmed); `withChange` adds the line only when the write appended (an ok
  result that is not `replayed`): T_01-R5. Exported from `server/engine/index.ts`.
- **Manifest**: `changeWords` (`plugin/manifest.ts` from `CHANGE_WORDS`; `manifest.schema.json`).
- **Engine entry** (`apps/board/plugin/engine.ts`): `PluginEngine` declares its own `watch` over `PluginChange`, a type
  alias (see Issues).
- **Seam 2**: `SEAM = 2`, `SEAM_TYPES` `4937e920…fb80`; fake host `SEAM_WRITTEN_FOR = 2`.
- **Contract test** (`apps/board/tests/plugin-types.test.ts` "the types satisfy the host contract"): compiles a check
  against the built `plugin.d.ts` and the fixture: `[Mount<HTMLElement>, CreateEngine]`; identity (not assignability) of
  `Ref`, `RefValue`, `SendRecord`, `PluginEvent`, `ChatStatus`, `ChatWork`, `ConfirmAsk|List|Item`, `Caller`, `Transport`,
  `EngineReply`, `ListedTool`, `ToolResult`; `AnswersAck`/`ChatLine`/`PluginChange` are `Ref`s; `AnswersText` a `ChipText`;
  the real manifest a `PluginManifest`; three seam-1 drifts must fail. At run time: `CHANGE_META` and `CHANGE_BOUNDS`
  equal the fixture's; a checker built on the contract's rules accepts `CHANGE_EXAMPLES.meta`, refuses every `none`, then
  accepts a real write's `_meta` and `changeOf` at the bounds. `HOST` there moved to seam 2 (acks, refs, `ack`).
- **Tests plugin.md cites, now written**: `engine.test.ts` "a board write says what it changed"; `plugin-build.test.ts`
  "the change words are in the manifest and words.json"; `view-hooks.spec.ts` "events: a ref of the contract",
  "chat.status: singleAgent"; `view-gives.spec.ts` "reveal: a ref of the contract"; `send-what-went.spec.ts` "acks:" (two);
  `engine-hooks.spec.ts` "resolve: the answers ack"; `tools.spec.ts` "tools.call: the change line", "the bot: singleAgent"
  (`test.fixme`, its engine half is BE_02's: un-fixme it there).
- **Fake host** (`tests/plugin/fake-host/*`): resolves every chip and hands back their `ack`s in order (`Message.acks`);
  `record(null)` with no chat; passes `watch`'s ref through as is; change lines from `_meta['plugin/change']`, drawn as
  the words.json text filled; `hasLine` by `reveal.cards`; options `bot` (no sign-up) and `acks` (a host's own acks);
  driver `say(ref)`. `tests/pages/board-host-fixture.ts` `record(null)`.
- `docs/specification/plugin.md` § Tools, the change line: "and wrote a line (…not a retry's replay); one that wrote
  nothing carries none" (T_01-R5). `docs/specification/modules.md` regenerated (`npm run map`: `#actions`' new exports).

### Issues & Resolutions
- The engine's `EngineChange` (an interface in `server/engine/engine.ts`, BE_02's file) is not a `Ref` (no implicit index
  signature), so `createEngine` failed `CreateEngine`. Resolved in BE_01's own `plugin/engine.ts` (`PluginChange`, a type
  alias); BE_02 may instead make `EngineChange` a type alias and pick `watch` again (REQUEST, non-blocking).
- A board-only write: `{ type: 'board' }` on an existing board is refused, and `later` is a built-in container id; the
  test uses a new container (`next`). `write_board` with `items: []` is refused by the schema.
- `answerResult` (`#mcp`) already marks a write whose every item failed `isError`, so T_01's "count 0" case was only a
  retry's replay (or a board-only write); the line now needs a non-replayed ok result.

### Caught Beyond the Brief
- **Assignability does not catch drift.** The contract's methods are bivariant, so a seam-1 `events` or `ChatLine` still
  compiles as `Mount<HTMLElement>`; only identity checks catch it (the test uses `Same<A, B>`, the compiler's identity).
  nclite's per-plugin type block (assignability) would miss the same drift; behaviour is held only by the fake host's specs.
- The contract check runs in `npm test`, not in `npm run build:plugin` (the fixture is a test file, never a build input).
- A host that sends the answers chip but hands back no ack (`[]`) leaves it spent in its chat (its `ref` does not move,
  since nothing was acknowledged): the answers stay unsent but cannot go again until another answer moves the chip.
  Correct by point 377's rules; worth a line in the nclite handover (hand back what `resolve` gave).
- `null` means two things: at the seam "no chat" (covers every answer), inside `sendHead` "nothing new" (the standalone
  server's `chat-sessions.ts` passes it). Kept apart by `acksRead`; the server's call is unchanged.
- `docs/specification/components.md` § The host's chat still says "a host with no chat answers `record()`" and does not
  mention `singleAgent` (REQUEST).
- No new sentence a person reads; the fake host's line text comes from `words.json`.

### Deviations from Plan
- Files outside the BE_01 row, each a direct consequence of a renamed or reshaped type: `packages/actions/src/index.ts`
  (the public file re-exporting chips.ts), `packages/actions/tests/send-head.test.ts` (`ack.head`; an `acksRead` test),
  `apps/board/tests/live-read-only.test.ts` (`BoardEvent` → `PluginEvent`), `docs/specification/plugin.md` (T_01-R5's
  sentence, routed here), `docs/specification/modules.md` (generated).
- No browser look: nothing visual changed but the fake host's own line text, which `round-trip.spec.ts` reads.

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only), category `[board-app]`,
   trail `→ Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/BE_01_seam-2-shapes.md]]`.
