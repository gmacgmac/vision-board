# Handover to nclite: the board is built to your plugin contract (seam 2)

Answers `HANDOVER_board_nclite-contract.md` (nclite, 2026-11-07; tracker N592, N593). Every item in Part 1 and Part 2 is
done. With this build, `shared/plugin-adapters/board.ts` and the stylesheet waiver have nothing left to translate.

## Vendor it

- **Repo**: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`
- **Commit**: `<filled in when the maintainer commits this set>` (40 characters, for `scripts/plugin-vendor.ts`)
- **Seam**: **2** (breaking). In one change: vendor the folder, move the board row's `seam` to 2, set the flags below,
  delete the adapter, its line in `ADAPTERS`, `REVIEWED_BOARD_SHEET` and the board's stored registration
  (`plugins.agents` row for `board`). Keep `shared/plugin-legacy/board-change.ts`: old rows still need it.
- **Built against** your `shared/plugin-host.ts` at nclite commit `a975c1ca` (the board keeps a test copy,
  `tests/plugin/contract/plugin-host.ts`, with its sha256 in the README beside it).
- No new dependencies. The board's spec for all of this: `docs/specification/plugin.md` (§ The chat, § The engine,
  § The bot, § Tools, § The manifest, § The types and the seam version, § What nclite needs).

## The flags (named as you asked)

| Where | Flag | Set |
|---|---|---|
| The row's `engineFlags` | `singleAgent` | `true` |
| The row's `engineFlags` | `followOtherWriters` | `false` |
| The row's `engineFlags` | `botToolRules` | `true` (as now) |
| The row's `viewSettings` | `singleAgent` | `true` (the view must have it too: see B3) |
| The row's `viewSettings` | `appCards` | `false` (as now) |

The board's own app leaves `singleAgent` off and `followOtherWriters` on, and its server never passes either to its engine.

## Part 1, item by item

| # | What the board does now | Proven by (board repo) |
|---|---|---|
| B1 | A write's tool result carries `_meta['plugin/change']` = `{ words, count, subject, reveal }`: `words` one of `board.change.board` / `board.change.card` / `board.change.cards` (the manifest's `changeWords`; `words.json` has their text, word for word your `LEGACY_CHANGE_WORDS`), `count` the cards, `subject` the board id, `reveal` `{ board, cards }` (left out, never trimmed, when it would break `REF_LIMITS`). A write that appended nothing carries no line. | `apps/board/tests/plugin-types.test.ts` "the types satisfy the host contract" (runs your `CHANGE_EXAMPLES` rules against a real write), `tests/plugin/tools.spec.ts` |
| B2 | `chat.send(record)` calls `record(acks)`; the answers chip's `resolve` gives `ack: { board, head }` (no top-level `head`). | `tests/plugin/send-what-went.spec.ts`, `engine-hooks.spec.ts` "resolve: the answers ack" |
| B3 | With `singleAgent`: no sign-up; any non-empty caller id; ids never compared or stored; no `needs-grant`, `request_grant` answers `held`, reads unscoped. Lines are written as the folder's first joined agent (an old bot's registration, so it keeps its boards with no migration), else one the engine joins on its first write, labelled by `name()`. The lock, `readOnly` and the person's ✓, ✗ and approving are unchanged. | `apps/board/tests/engine-switches.test.ts`, `tests/plugin/tools.spec.ts` "the bot: singleAgent" |
| B4 | `events` take any `Ref` (`{}` catch up, `head: 0` read from the start); `chat.reveal` / `hasLine` get `{ board, cards: n }` (a number, which your `lineMatches` holds in a line's list). | `tests/plugin/view-hooks.spec.ts`, `round-trip.spec.ts` |
| B5 | `view/board.css` passes your `checkStylesheet(css, { scope: 'vb' })` with 0 problems and **no `reads`**: the three properties the board's script sets are now its own, `--vb-app-w`, `--vb-app-h`, `--vb-region`, so the adapter's `css.reads` goes too. The real selector count was 151, not 11 (your report prints 10 and "and N more"). | `apps/board/tests/plugin-build.test.ts` "the built sheet stays in its scope"; `npm run verify` holds the source sheets to the same rule |

## Part 2

- **C1, the skill.** One-line description of when to use the board. The plugin's `skill.md` is **8,178 bytes**, under
  `SKILL_BYTES` (8,192): the board row's `skillBytes: 28672` can go. Per-tool detail moved into the tool descriptions.
  Live bot evals: 75/75 twice, run with `singleAgent, -followOtherWriters, botToolRules`, and a host that signs nobody up
  and calls with a `bot-…` id.
- **C2, the poll.** `followOtherWriters: false`: `watch` and a held read never poll; the engine's own writes reach
  `watch` at once; another program's lines are read in at the engine's next call.

## Two asks

1. **Rename `CHANGE_META` to `'plugin/change'`**: a key that names no host. The board writes that key now, so nclite
   reads its change lines once it renames; the stored `v: 2` body is unchanged.
2. **No sign-up, no stored ids, no special case for old bots** (B3). Pass the derived id on every call.

## Worth knowing

- **Hand back exactly the acks `resolve` gave.** If a Send carries the answers chip but `record` gets `[]`, the chip stays
  spent in your chat until another answer arrives, while the answers stay unsent.
- **With `singleAgent` on, the bot writes on boards the person made without asking.** The person's guard is the board
  lock. Worth a line in nclite's UI or docs.
- **One folder, one host.** A folder opened both by the board's own app and by nclite shares its first agent between them.
- **Nested rules.** The sheet keeps its top-level selectors in scope and writes a rule that needs a pseudo-class or an
  outside attribute first as a nested rule round `&` (`vb-node { [data-zoom=far] & .vb-size {…} }`). Your check does not
  look inside nested rules, and neither it nor the board's own check reads a selector's subject (a nested `& + p` would
  pass). Every subject in the board's sheet is a `vb` element or class, by review. If you want that enforced, it is your
  check to tighten.
- **Drift.** The board's test compares its shared shapes with your contract by type identity: plain assignability lets a
  seam-1 `events` or line ref through as a `Mount<HTMLElement>`, so your per-plugin type block alone would miss it.

## To check after vendoring

- Your suite passes with `shared/plugin-adapters/board.ts` deleted and no `REVIEWED_BOARD_SHEET`.
- A bot draws: the chat shows "Changed a card on board “…”" and a click reveals the card.
- Send carries the answers; the next Send carries only newer ones.
- An existing bot's old boards still take its writes, with no grant asked.
- A locked board refuses the bot's write.
