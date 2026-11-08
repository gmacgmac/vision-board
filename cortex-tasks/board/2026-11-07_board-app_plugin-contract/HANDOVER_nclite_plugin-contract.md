# Handover to nclite: the board is built to your plugin contract (seam 2)

Answers `HANDOVER_board_nclite-contract.md` (nclite, 2026-11-07; tracker N592, N593). The board meets Part 1 and Part 2
**given two things on your side, in the same change as vendoring**: the change key's rename, and the manifest's new
`scope` field, which `checkPluginStylesheet` reads (below). The plugin's id is now **`vision-board`**, as you asked, and
all that stays of its entry in `ADAPTERS` is its icon. Everything else the adapter and the stylesheet waiver do goes.
Revised 2026-11-08 after three independent reviews (the last ran your
`scripts/plugin-vendor.ts` on the build: it vendored and passed your manifest, content and skill checks): this version
claims only what a test or that run shows, and says which tests run your own code.

## Vendor it, in one change

- **Repo**: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`
- **Commit**: `ac4bba01e36f049468426ed67e75b206ca449211` (on main)
- `node --experimental-strip-types scripts/plugin-vendor.ts "<repo>" ac4bba01e36f049468426ed67e75b206ca449211`
- **Decisions**: the board's D-096, D-097 and D-098 (`docs/decisions.md`); D-098 replaces D-097 point 1, the two-field
  entry, with steps 4 and 5 (your ask of 2026-11-08). **Seam**: **2** (breaking).

In the same change, in this order:

1. **Rename `CHANGE_META` to `'plugin/change'`** in `shared/plugin-host.ts`, and the Journal plugin's writes of
   `nclite/change` (`plugins/journal/engine/engine.js`, its `plugin.d.ts`; the Journal is vendored, so in its source,
   then re-vendored). The board writes `plugin/change`. **Without the rename you store none of the board's change
   lines**: your `storedChangeOf` returns null for the board's key (the board's `plugin-types.test.ts` runs your copied
   `storedChangeOf` and asserts exactly that).
2. **Move the board's row to the id `vision-board` and its `seam` to 2 first** (step 4): `scripts/plugin-vendor.ts`
   refuses a manifest whose seam differs from the row's. Then vendor the folder and set the flags below.
3. **Set the row's `provenanceSha256` to the pin `vendor()` prints.** Your registry refuses the folder until the row
   carries it (`checkFolder`).
4. **The plugin's id is `vision-board`, and its adapter entry is just the icon: `'vision-board': { icon: 'board' }`**,
   with no `css`. The manifest's `id` is `vision-board` and its folder is built as `dist/plugin/vision-board/`, so it
   vendors into a folder of that name. Every words key starts `vision-board.`: `changeWords` is
   `vision-board.change.board` / `.card` / `.cards` (texts unchanged), and so are the name, the chips, the tools
   (`vision-board.tool.<name>`) and the view's own words. Chips and events carry `plugin: 'vision-board'`. Your bot sees
   `vision-board_write_board` and so on. The icon keeps its name, `board`, from your own icon list.
5. **Add `scope` to the manifest, and have `checkPluginStylesheet` take it from there.** The board's manifest carries
   `"scope": "vb"`. Your rule as you gave it: absent, the scope is the id; present, `/^[a-z][a-z0-9]{1,15}$/`, not `host`
   or `ui`, and no other installed plugin uses it. The board's schema holds the first three
   (`apps/board/plugin/manifest.schema.json`; `plugin-build.test.ts` "the manifest fits its schema" refuses `host`, `ui`
   and five malformed scopes); uniqueness is yours. The board's copies of your files have exactly these lines changed,
   which a test holds (`tests/plugin/contract/README.md` § Edits, `plugin-host.test.ts` undoes them and checks your
   sha256):
   - `shared/plugin-host.ts`, `PluginManifest`: after `icon?: string;`, the line `scope?: string;`.
   - `engine/plugins/stylesheet.ts`, `checkPluginStylesheet`: `(id: string, bytes: Uint8Array): string[] {` becomes
     `(id: string, bytes: Uint8Array, scope?: string): string[] {`, and `{ scope: css?.scope ?? id, reads:` becomes
     `{ scope: scope ?? id, reads:`. Your loader passes the manifest's `scope`.

   Without it the scope is `vision-board` and the loader refuses the sheet (over a thousand problems; your check lists
   ten and counts the rest). The board's `plugin-build.test.ts` asserts both outcomes.
6. **Replace `BoardSeams` in `app/src/lib/plugins/seams.ts`** with the Journal's form, which needs nothing from the
   adapter: `Holds<Mount<HTMLElement>, typeof Board.mount>`, `Holds<CreateEngine, typeof Board.createEngine>` (the board's
   `plugin-types.test.ts` compiles exactly those two against your contract). The old block imports `boardHost` from the
   adapter, so your type check fails once it goes. Your board tests that use `registerAgent` or `boardHost`
   (`engine/plugins/host-testing.ts`) change with it. Then delete everything else of `shared/plugin-adapters/board.ts`
   (register, change, ack, reveal, host, `reads`, the `css` entry), `REVIEWED_BOARD_SHEET`, and the board's stored
   registration (`plugins.agents` row for `board`). Keep `shared/plugin-legacy/board-change.ts`: old rows still need it.

**Unchanged**: the data folder `.visionboard`, the change key `plugin/change`, seam 2, the flags below, the icon name
`board`. (The chip's `plugin` value is in the seam's types, so their hash moved; no host had seam 2 yet, so it stays 2.)

Built and tested against byte-for-byte copies of your `shared/plugin-host.ts`, `shared/plugin-checks.ts`,
`engine/plugins/stylesheet.ts`, `engine/plugins/provenance.ts` and `engine/words/plugins.ts`, at nclite `4356abee`
(identical to `a975c1ca` for these files). Their sha256s are in the board's `tests/plugin/contract/README.md`; a test
fails if a copy differs from them except for step 5's lines. The one stand-in is `shared/plugin-adapters.ts`, which holds
exactly the entry step 4 keeps, so `checkPluginStylesheet` runs as your loader will. No new dependencies. The board's spec: `docs/specification/plugin.md`.

## The flags

| Where | Flag | Set |
|---|---|---|
| The row's `engineFlags` | `singleAgent` | `true` |
| The row's `engineFlags` | `followOtherWriters` | `false` |
| The row's `engineFlags` | `botToolRules` | `true` (as now) |
| The row's `viewSettings` | `appCards` | `false` (as now) |

Your row's other `viewSettings` (`sendCountsWhatWent`, `botToolRules`, `align`) can stay as they are: each is the board's
default.

`singleAgent` is set once, on the engine. The engine's ledger read says so (`oneAgent: true`), and the view follows it,
so the two can't disagree; a `singleAgent` view setting does nothing (`apps/board/tests/engine-switches.test.ts`,
`tests/plugin/view-hooks.spec.ts` "chat.status: singleAgent", "chat.status: a `singleAgent` view setting alone"). If your
row has `viewSettings.singleAgent`, it can go. The board's own app never turns either host flag on: its server strips them before its engine,
and its page strips them from the address and its storage (`withoutHostFlags`; tests `packages/format/tests/flags.test.ts`,
`apps/board/tests/page-flags.test.ts`).

## Part 1, item by item

"Your code" means a byte-for-byte copy of nclite's own check, run by the board's tests on the board's build.

| # | What the board does | Proven by (board repo) |
|---|---|---|
| B1 | A write that appended a line carries `_meta['plugin/change']` = `{ words, count, subject, reveal }`: `words` one of the manifest's `changeWords` (`vision-board.change.board` / `.card` / `.cards`, texts word for word your `LEGACY_CHANGE_WORDS`), `count` the cards written (a retry's replayed item is not counted), `subject` the board id, `reveal` `{ board, cards }`, left out (never trimmed) when it would break `REF_LIMITS`. A write that appended nothing carries no line. | `apps/board/tests/plugin-types.test.ts` "the types satisfy the host contract": your `storedChangeOf`, under the id `vision-board` (it checks the words start `vision-board.`), stores a real write's line once the key is renamed, and stores nothing under today's key; `packages/agent/tests/claude-stream.test.ts` (replays) |
| B2 | `chat.send(record)` calls `record(acks)`; the answers chip's `resolve` gives `ack: { board, head }` (no top-level `head`). | `tests/plugin/send-what-went.spec.ts`, `engine-hooks.spec.ts` "resolve: the answers ack" |
| B3 | With `singleAgent`: no sign-up; any non-empty caller id; ids never compared or stored; no `needs-grant` (on any board, the person's own included: the maintainer's ruling, the lock being the person's guard); `request_grant` answers `held`; reads unscoped. Lines are written as the folder's first joined agent (an old bot's registration, so it keeps its boards), else one the engine joins on its first write, labelled by `name()`. The lock, `readOnly` and the person's ✓, ✗ and approving are unchanged, and a write refused whole (locked, read-only, no such board) joins nobody; one whose items are each refused may still write the join line. | `apps/board/tests/engine-switches.test.ts` (what lands in the ledger), `tests/plugin/tools.spec.ts` "the bot: singleAgent" |
| B4 | `events` take any `Ref` (`{}` catch up, `head: 0` from the start); `chat.reveal` / `hasLine` get `{ board, cards: n }`. | `tests/plugin/view-hooks.spec.ts`, `round-trip.spec.ts`; `plugin-types.test.ts`: the ack and line refs, at the longest board id, pass your `checkRef` |
| B5 | `view/board.css` passes your `checkPluginStylesheet('vision-board', …, 'vb')`, the loader's own path with step 5's lines, with 0 problems, given the manifest's `scope` and step 4's entry, with **no `reads` and no waiver**: every property the sheet reads is `--vb-*` or `--host-*`, the ones the board's script sets included (`--vb-app-w`, `--vb-app-h`, `--vb-region`, `--vb-kind`, `--vb-arrow`, …), so a name on your page can't reach the board. Every nested selector starts with a symbol, never an element name, which WebKit before Safari 17.2 (macOS 14.0 and 14.1) drops. | `apps/board/tests/plugin-build.test.ts` "the built sheet stays in its scope" (your `checkPluginStylesheet` passing it with the manifest's scope and refusing it without; your `checkStylesheet` refusing it under scope `vision-board`; then the board's own rule); `npm run verify` (`scripts/verify-style.mjs`: what a sheet reads, how a nested selector starts) |

## Part 2

- **C1, the skill.** A one-line description of when to use the board. The plugin's `skill.md` is **8,166 bytes**, 26
  under `SKILL_BYTES` (8,192): the board row's `skillBytes: 28672` can go, but there is little room to add to it. It
  was cut from 27,641 bytes, mostly removed, not moved: one tool description gained detail (`show_layout`).
  - **Give the bot the tool descriptions from `engine.tools.list()`** and the instructions from `engine.tools.instructions`
    of the engine you run with the flags above, never from the manifest or `words.json` (`vision-board.tool.*`). Those are built
    with no flags and still carry the grant steps. Under `singleAgent`, what the bot reads names no sign-up, secret or
    grant; `request_grant` stays listed (dropping it would change the manifest) and says it is not needed.
  - Live bot evals, run with `singleAgent, -followOtherWriters, botToolRules` and a host that signs nobody up and calls with
    a `bot-…` id: **80/80 checks over 14 runs, one run per scenario**, including a new scenario on a board the person
    made. That shows nothing got worse; it is not a pass rate.
  - **With the new id.** The skill and the tool descriptions name the tools bare (`write_board`, `check_responses`), so
    they read the same beside `vision-board_write_board`; no text names the old `board_` prefix. `skill.md` is byte for
    byte what it was (its sources changed only in a comment), still 8,166 bytes, so the bot evals were not run again.
  - A board test holds `skill.md` to your `SKILL_BYTES` (`apps/board/tests/plugin-skill.test.ts` "the plugin skill fits
    the host's budget"), so a longer skill fails the board's tests before it reaches you.
- **C2, the poll.** `followOtherWriters: false`: `watch` and a held read never poll; the engine's own writes reach `watch`
  at once; anything else that writes the ledger is read in at the engine's next call. Your docs say the bot can write its
  data folder directly (`docs/plugins.md` § Where the data lives); such an edit stays unseen by the view until then.

## Worth knowing

- **The lock holds against the board's tools only** (maintainer's point 500, accepted). With `singleAgent` on the bot
  writes on boards the person made without asking, and the lock is the person's guard against that. But the ledger
  (`.visionboard/ledger.jsonl`) is in the bot's workspace: a bot that edits the file can append an `unlock` or a ✓ line
  itself. Splitting the ledger out of the bot's reach is a later option on your side. Worth a line in nclite's docs.
- **Hand back exactly the acks `resolve` gave.** The board marks the answers chip spent on Send whatever `record` receives:
  if a Send carries the chip but `record` gets `[]`, the chip stays spent in your chat until another answer arrives, while
  the answers stay unsent.
- **Rows stored under the old id.** Chips in stored messages and stored change lines name the plugin `board`. A chip
  resolves through the plugin its `plugin` names, so an old chip finds no `board` plugin; whether to map `board` to
  `vision-board` for old rows is your call.
- **One folder, one host.** A folder opened both by the board's own app and by nclite shares its first agent between them.
- **Nested rules are checked by review only.** The sheet keeps its top-level selectors in scope and writes a rule that
  needs a pseudo-class or an outside attribute first as a nested rule round `&`. Your `checkStylesheet` does not look
  inside nested rules, and neither does the board's (`.vb-x { :root:has(&) .app-nav { … } }` passes both). Every subject
  in the board's sheet is a `vb` element or class, by review. If you want that enforced, it is your check to tighten.
- **WebKit.** The plugin specs pass in WebKit 26.6 too, 104 of 104 (`npm run test:plugin:webkit`). That run found three
  things Chromium hid, now fixed: two resize-observer loops (the toolbar's width, the access strip's height), which WebKit
  reports as page errors, and focus lost to the page when Reply's close button is clicked (WebKit gives a clicked button
  no focus). The rule older WebKit (before Safari 17.2, macOS 14.0 and 14.1) enforces on nested selectors is held by
  `npm run verify`; Playwright's WebKit is current, so that one rests on the check. Look at the board in your app on
  macOS, light and dark, before you call it done.
- **Drift.** The board's test compares its shared shapes with your contract by type identity: plain assignability lets a
  seam-1 `events` or line ref through as a `Mount<HTMLElement>`, so your per-plugin type block alone would miss it.

## To check after vendoring

- Your suite passes with the board's adapter cut to step 4's entry and no `REVIEWED_BOARD_SHEET`, and the board loads
  from `vision-board/` with its sheet checked against the manifest's `scope`.
- A manifest with `scope` `host`, `ui`, or one another plugin uses, is refused.
- The Journal still stores its change lines under the renamed key.
- A bot draws with `vision-board_write_board`: the chat shows "Changed a card on board “…”" and a click reveals the card.
- Send carries the answers; the next Send carries only newer ones.
- An existing bot's old boards still take its writes, with no grant asked.
- A locked board refuses the bot's write.
- The board looks right in your app on macOS, light and dark.
