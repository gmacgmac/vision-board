---
category: project-docs
type: specification
status: draft
created: 2026-10-31
updated: 2026-11-07 (seam 2, the host contract's shapes: `events` and the chat's refs, `send(record)` with acks, the answers chip's `ack`, the change line `plugin/change` and `changeWords`, the `singleAgent` and `followOtherWriters` flags, the scoped sheet; the last section rewritten for the contract: plugin-contract T_01); 2026-11-06 (§ Theme and host styling: colour and mode properties, scope, contrast; open point 8 settled; the fill apart from the accent); 2026-11-05 (open point 12: the person's reason names Editing: FIX_02); 2026-11-03 (read-only for a host: § The engine `readOnly`, `watch` on a replaced ledger; Open points 12-14)
scope: The board as a plugin — what any host implements: the folder, the view seam, the engine seam, the types and the seam version, the manifest, tools over MCP, attachments, theme, and how an update travels
keywords: [plugin, host, mount, engine, manifest, MCP, seam, types, version, read-only]
---

# The board as a plugin

A plugin is the board built once as one folder, which a host takes and runs: the person sees the board in the host's
page, and the host's bot works on the same board through tools. The standalone app is one host of it, through the same
seam (D-074). This page is all a host needs. If it doesn't say it, a host may not rely on it.

**One shape everywhere.** The seam is a host plugin contract's shapes (a `Ref`, a `SendRecord`, a `ChangeMeta`, the
contract's `PluginHost` and `CreateEngine`), kept as a copy for the tests in `tests/plugin/contract/` (its `README.md` says
where from and the one change). The board's own page and server use the same shapes, so a host built to that contract
mounts the board and runs its engine with no adapter: the built `mount` is a `Mount<HTMLElement>` and `createEngine` a
`CreateEngine` of the copy. Where a host's board behaves differently from standalone's, it is a flag the host turns on
(§ The engine `flags`, § What the host gives `settings`), never a second shape. Proven by
`apps/board/tests/plugin-types.test.ts` "the types satisfy the host contract", `tests/plugin/contract/plugin-host.test.ts`.

Every claim holds a symbol and a named test. "Proven by" names a spec in `tests/plugin/` (`npm run test:plugin`), where a
fake host written from this page mounts the built folder, unless the path says otherwise. `tests/plugin/spec-truth.test.ts`
(in `npm test`) checks that every test named here exists and every member of the seam is here.

## The folder

`npm run build:plugin` writes `dist/plugin/board/`, and only that (`apps/board/bin/build-plugin.ts` `buildPlugin`). A host
links or copies the folder. It imports nothing else from this repo, and needs nothing installed: the same input gives
the same bytes, and neither bundle imports anything a host must supply but Node's own modules in the engine.

| Part | What it is |
|---|---|
| `manifest.json` | What the plugin is, read before anything loads (§ The manifest) |
| `view/board.js` | Browser ES module, one export: `mount`. Its own Svelte is inside; no dynamic import, no chunk |
| `view/board.css` | The one stylesheet, no `@import`, no address |
| `engine/engine.js` | Node ES module, one export: `createEngine`. Reads and writes only the folder it is given |
| `words.json` | The manifest's words keys, and the board's fixed words, by `board.<area>.<name>` |
| `skill.md` | What the bot reads while the plugin is on (§ The bot) |
| `plugin.d.ts` | The seam's types for a TypeScript host (§ The types and the seam version) |

To update: rebuild, and reload the page and restart the engine. `npm run build:plugin -- --out <folder>` writes elsewhere;
`-- --watch` rebuilds the two bundles on a change, so a host linked to the folder picks them up on a reload. A page holds
**one built version**: custom elements are global, so a second copy mounts, but with the first copy's elements. Keep two
versions in separate pages.

Proven by `apps/board/tests/plugin-build.test.ts` "a clean build writes exactly the folder", `engine-hooks.spec.ts` "the folder",
`guest.spec.ts` "a page holds one built version".

## The view

```ts
mount(root: HTMLElement, host: PluginHost): PluginView   // apps/board/plugin/view.ts `mount`
```

`root` is an element the host gives, empty, with **a definite size**: everything the board draws is placed against it, so
it has no height of its own. Load `view/board.css` first. The board draws all of itself inside `root`: its header, strips,
dialogs, search and help. There is no second element to give and no control a host must draw. A host's own `position` on
`root` wins, from a sheet loaded before the board's or after it (`tests/pages/host-position.spec.ts` "a host's own position on the root wins").

### What the host gives

`PluginHost` (`apps/board/plugin/view.ts`): `BoardHost` (`apps/board/src/board/host.ts`) without `page`, which is the standalone page's own
(§ Standalone's own). Everything the board does outside `root` goes through it.

| Member | Promise | Left out | Proven by |
|---|---|---|---|
| `api(path, init)` | Calls the engine's routes: `path` is relative (`ledger?after=0`); resolves the `fetch` `Response`, as the person (§ The engine) | Required | `view-hooks.spec.ts` "api and events" |
| `events(listener)` | Calls `listener({ plugin, ref })` for every change to the data, from anyone; returns the unsubscribe. `ref` is any `Ref`, as `watch` gave it (§ The engine): `{ head }` says the ledger changed through line `head` (with `board`, the board it changed); `{ head: 0 }` says read from the start (a ledger file replaced); a `ref` with no `head`, `{}` above all, says "you may have missed changes": the board catches up. Other keys are ignored, and so is a `head` that is not a whole number from 0. Say `{}` each time your stream opens. **A first read that fails** (`api` answers a problem or rejects, an engine still starting) says so through `notify` and over the stage, keeps listening and reads again on the next call of `listener`, with no retry of its own: so say one when your engine is up. **While reads keep failing**, at any time, there is one notice until one works | Required | `view-hooks.spec.ts` "api and events", "events: a ref with no head", "events: a ref of the contract", "events: a first read that fails", "events: while reads keep failing" |
| `chat` | § The chat | Required: give the three lines there if you have no chat | `view-hooks.spec.ts` "a host with no chat at all" |
| `settings.get(key)`, `settings.on(listener)` | Each flag by name, a boolean, and `align` (`center` or `start`). A value you don't give reads as the flag's default. Flags are read once, at mount; `on` is for `align`, which lays out again, and returns the unsubscribe | Required | `view-hooks.spec.ts` "settings: a flag comes" |
| `notify(text, tone?)` | A short notice outside the board; `tone` `error` for a refusal | Required | `view-hooks.spec.ts` "notify and confirm" |
| `confirm(ask)` | Your own dialog. `ask` is `{ heading, body, confirm, list? }`, `confirm` being the button's words, `list` `{ items, skipped? }` of `{ ref, text }`. Resolves true when confirmed | Required | `view-hooks.spec.ts` "notify and confirm" |
| `store.get(key)`, `store.set(key, value)` | The viewer's conveniences, as strings: each board's zoom (`view.<board>`), whether the proposals notice is hidden. May lose anything. Give each data folder its own store: the keys name only what is on the board | Kept for the mount | `view-hooks.spec.ts` "store:", "store left out" |
| `imageRoute` | The address a picture's path goes after: what `<img src>` loads and its version is asked at, on the browser's own cookies, so it can't carry a header. Answer it with the engine's `image` | `/board-images/` on the page's origin | `view-hooks.spec.ts` "imageRoute: under", "imageRoute left out" |

**Flags a host needs to know.** Set `appCards` off unless you host apps: on, the board asks a route only an app host
answers, and a bot has no `list_apps` to draw with (`view-hooks.spec.ts` "settings: appCards off"). `cardImages` and `svgImages`
off stop pictures and svg pictures; pass `svgImages` to `createEngine`'s `flags` too. `singleAgent` (off by default) goes to
both, the view's settings and the engine's `flags`, when your bot is the folder's one agent (§ The bot): in the view it means
`chat.status.agent` is ignored, so the answers chip holds every answer and every answer lights Send
(`view-hooks.spec.ts` "chat.status: singleAgent"). Leave the rest at their defaults.

### What the view gives

`PluginView`, `apps/board/plugin/view.ts`.

| Member | Promise | Proven by |
|---|---|---|
| `unmount()` | Removes every listener it added, an open menu's or tip's too, takes back its chips, empties `root` and gives it back as it was. Never asks, so call `leave()` first. Each step runs whatever another does: an unsubscribe of yours that isn't a function is passed over, and one that throws goes to the console (`apps/board/src/board/teardown.ts` `finishAll`). After it the mount ignores whatever you keep calling, a listener your unsubscribe left in place or a member of the view (`hearUntilStopped`) | `view-gives.spec.ts` "unmount: every listener", "unmount with a tip open", "unmount finishes", "a stopped mount ignores" |
| `unsaved()` | Synchronous: a note holds changed words. For your `beforeunload` or your own question | `view-gives.spec.ts` "unsaved and leave" |
| `leave()` | True at once when nothing is unsaved; else asks through `confirm`. True: the words are discarded and you unmount. False: the board stays, focus in the words | `view-gives.spec.ts` "unsaved and leave" |
| `pageChip()` | The chip for the board on show, for your own Add to chat; null with none | `view-gives.spec.ts` "pageChip" |
| `reveal(ref)` | Any `Ref`, of which the board reads `board`, `n` (a card), `seq` (a note) and `cards` (a list of card numbers), and ignores the rest: what a change line's `reveal` holds (§ Tools) or a sent chip's `ref`. Brings into view a board, a card, a note, or several cards. `cards` zooms and selects nothing. Not on the board, or a card hidden or removed: says so through `notify`, and takes no focus; it never throws. Another board may ask through `confirm` first. A board not yet in the ledger opens when its first line arrives, which is how a bot's first board opens | `view-gives.spec.ts` "reveal: a board", "reveal of what is not", "reveal: a ref of the contract" |
| `status.now`, `status.on(listener)` | What the board shows, read only: `boardId`, `title`, `counts`, `unsaved` and `chatWork`, which are all the types promise (`PluginStatus`: the status holds more, and a host may read it but not rely on it); `on` says each change, with the fields that changed | `view-gives.spec.ts` "status and send" |
| `send()` | Send to agent, for a button of your own. The board's header has its own. Resolves null, or the problem's words | `view-gives.spec.ts` "status and send" |

Nothing else is there (`view-gives.spec.ts` "the view holds no more").

### The chat

`BoardChat`, `host.ts`: the only way the board reaches the host's chat. It is the contract's `PluginChat` less `add`, which
the board never calls: its own chips come and go through `attach`, and a host's Add to chat stages `pageChip()`.

```ts
chat: {
  attach(key, chip | null),                  // add, replace or remove the chip under `key`
  send(record),                              // Send to agent; record(acks) once it went
  status: { now, agent?, held?, staged?, on(listener) },
  reveal?({ board, cards: n }),              // show the chat's newest change line that holds this card
  hasLine?({ board, cards: n }),             // synchronous: is there such a line
}
```

- **Chips.** A chip is `{ plugin, kind, ref, label, detail, preview? }` (`#actions` `Chip`): draw `label` and `detail`, keep the
  rest unread. `detail` names a board by its id, as `Board "pricing"`, not its title. The board keeps two live, keys `selection`
  and `answers`, replaced as they change and removed at `unmount`. A chip that went with a message is **spent until its key's
  `ref` changes**, by value: each chip is a new object, so compare their JSON, not the objects. The same `ref` may come again with new
  words, and stays spent. `attach(key, null)` does not end it, so
  selecting the same card again stays spent; keep what is spent across a null, as `tests/plugin/fake-host/chat.js` does.
  A chip the person removes from a message is left out of that message only: stage it again for the next, since the
  board attaches it again only when it changes. Proven by `view-hooks.spec.ts` "chat.attach"; `send-what-went.spec.ts` "removed chip".
- **As a message goes**, call the engine's `resolve(chip.kind, chip.ref)` for every chip. `{ where, text, ack? }` is one
  block of the bot's prompt; no block when `text` is empty. `{ refused, reason }` stops the send: answer with your words.
  Proven by `view-hooks.spec.ts` "chat.send: Send sends", "chat.send: a chip the engine refuses".
- **`send(record)`** sends what is staged, with no words, then answers `record(acks)`, the board's own record of the Send:
  null, or the problem's words. `acks` is the contract's: every `ack` the `resolve` answers of the board's chips that went
  carried, in the order staged. Only the answers chip carries one, `{ board, head }` (§ The engine `resolve`). **Only a
  message that carried the answers counts as their Send** (point 377), and the board reads `acks` so:
  - an ack whose `board` is the board the Send was pressed on: the answers read through its `head` count as sent, and one
    made after the read waits for the next Send. The first such ack counts, and its keys other than `board` and `head`
    are ignored; an ack of another board, or whose `head` is not a whole number from 0, is passed over;
  - `[]`, or no ack for that board (none was staged, the person removed it, nothing went): the Send acknowledges nothing
    new, and the answers stay;
  - `null`, only from a host with no chat (the bot reads the board itself): the Send covers every answer up to its own
    line, as a Send no chat carried always has.

  Call `record` only once the message has gone: one that failed records nothing, and a crash before the record sends the
  answers again (a duplicate, never a loss). Call it even when nothing was staged (`record([])`). Leave it out only when
  your own server recorded that Send with the message (the `send` act, with its `head`). The record goes to the board the
  Send was pressed on. Resolves null when done or held for the bot's turn to end. One that rejects, a `fetch` that failed,
  is Send's error state, with the board's own words (the standalone server's own `send` act is that rejection, a 409 saying
  why, when its chat session can't be loaded: api.md 170). Behind the `sendCountsWhatWent` setting, on by default; off,
  every Send covers every answer up to its own line. Proven by the same, "chat.send: a rejection", and
  `send-what-went.spec.ts` "removed chip", "watermark", "at-least-once", "flag off", "acks:"
- **`status`** is read only. `now` (`idle`, `working`, `asking`) drives the board's working mark, and is all you must give.
  With only that, Send is enabled by an answer no Send has carried, or by a chip of the board's own that hasn't gone with a
  Send. `on` returns the unsubscribe. `staged`: you hold what Send would carry. Given at all it has the full say over the chips, the
  board's included, so give it if your chat holds more of its own, a file say, or drops the chips. An answer no Send has carried
  enables Send either way; with `agent`, only one that agent may read. `held`: Send waits for the bot's turn. `agent`: the id your
  chat talks to, which scopes the answers chip, and the answers that light Send, to what it may read; an answer only another agent
  may read leaves Send off, and that agent reads it with `check_responses` (`chat-send-scope.spec.ts`). With the
  `singleAgent` setting on, `agent` is ignored (§ What the host gives). Proven by `view-hooks.spec.ts` "chat.status", "chat.status: with no staged".
- **`reveal` and `hasLine`** give a changed card's stepper its link to your chat. The board asks with `{ board, cards: n }`, a
  plain `Ref`: a change line matches when its `reveal` (§ Tools) has the same `board` and a `cards` list holding `n`.
  Without `reveal`, no link; with `reveal` and no `hasLine`, always a link. Proven by `view-hooks.spec.ts` "chat.reveal and chat.hasLine", "chat.reveal left out".
- **A change line.** A board write's tool result carries `_meta['plugin/change']`, `{ words, count, subject, reveal }`
  (§ Tools). Draw it as a line, the text of `words` in `words.json` with `{count}` and `{subject}` filled, and
  `view.reveal(reveal)` on a click. Proven by `round-trip.spec.ts` "a board-to-chat round trip".

With no chat at all, where nothing carries a chip, and the bot reads the board itself: `chat: { attach() {}, send: (record) => record(null), status: { now: 'idle', staged: false, on: () => () => {} } }`.

### A guest in the host's page

- **Keys.** A key acts only when its target is in the root. Every key the board acts on is `preventDefault`ed before it
  leaves the root, so **skip a key whose `defaultPrevented` is true**. A capture-phase listener on the window or document
  runs before the board's, so it reads nothing marked: use one only for what you want to take first. A key in a modal of the
  board's goes no further than the root. When what held the focus goes (a card hidden or taken away, a closed panel) the focus stays in the
  stage, so the next key still acts. Proven by `guest.spec.ts` "keys", "focus stays in the root", `tests/pages/board-guest.spec.ts` "every key the board acts on".
- **Modals.** The board's dialogs and its zoomed picture are real `<dialog>` modals, inside the root in the document but drawn
  over the window: **the whole page is inert while one is open**, your controls too, and each centres on the window and caps by
  it (`.vb-dialog` up to 480 wide, `.vb-archived-list`). Proven by `guest.spec.ts` "the zoomed view is a real modal".
- **Layers.** The root makes no stacking context of its own, so the board's `z-index`es meet your page's; set `isolation: isolate`
  on `root` if yours would clash.
- **Styles.** Your rules on one bare element reach in and the board stands: `button`, a field, a heading, `p`, `dialog`, `span`, `div`,
  `a`, a list, `table`, `code`, `kbd`, the sectioning elements, `img` and `svg`, its `fill` and `stroke` too, each start again inside the
  root, under every rule of the board's (`packages/ui/src/base/root.css`). `root` itself is yours, and the text properties it would hand
  down the board sets. What doesn't hold: a rule of yours with a class or an id that matches inside, one with `!important`, a rule naming
  two elements (`body span`, `main div`), which ties the board's guard and wins when your sheet comes later, a rule on `*` (`box-sizing`
  among them), one on an element not named there or on an svg's inner shapes, a less usual property on `span` or `div` (the sheet lists what it
  takes back; `all` costs a big board too much), or a `width` or `height` on an `svg` or `img` that carries its own.
  **The sheet stays in its scope, `vb`.** Every top-level selector of `view/board.css` holds, in its first compound (up to its first
  space or combinator), the class `vb` or a `vb-…` class, or a `vb-…` element (`vb-node`, `vb-region`), and no `:is`,
  `:where`, `:not` or `:has` there. A rule that needs a pseudo-class or an outside attribute first is nested in a scoped
  rule and written round `&` (`vb-node { [data-zoom=far] & .vb-size {…} }`, `.vb-board { :where(&) {…} }`): it is under its
  parent and is not checked again. Its subject is always one of the board's own elements, by review: neither check reads
  a selector's subject; `:root` declares only `--vb-*` (and again on the board's root, § Theme and host styling,
  Scope); `@property` and `@keyframes` are named `--vb-…` and `vb-…`, and no other at-rule but `@media`, `@supports` and
  `@container` (no `@layer`, no `@import`); `url()` only of a `data:` address; every `var()` reads a `--host-*` property or a
  `--vb-*` one (the properties the board's script sets are `--vb-app-w`, `--vb-app-h` and `--vb-region`). The board reads `--host-*` and never sets one. Proven by
  `scripts/verify-style.test.mjs` "a selector outside the scope" (`npm run verify` holds the source sheets to it,
  `scripts/verify-style.mjs` `checkScope`), `apps/board/tests/plugin-build.test.ts` "the built sheet stays in its scope". A `color-scheme` of yours stays yours: the board's is on its
  root. Proven by `guest.spec.ts` "a host's loud element rules", "a picture stands too", "a host's color-scheme",
  `host-styling.spec.ts` "the sheet:", `tests/pages/host-styles.spec.ts`.
- **Size.** What opens stays inside the root, by the root's size and not the window's, but for a modal (above). The Reply panel and the
  requests strip too; the strip stacks when the root is narrow. Proven by `short-pane.spec.ts`.
- **Your CSP.** It must allow `img-src` for `imageRoute` and for `data:` (a picture's blank, `packages/ui/src/markdown/markdown.css`
  `.vb-md-img`), and `connect-src` for `api`, `imageRoute` and your stream. No inline script or style is needed. Every spec
  here runs under `CSP`, `tests/plugin/fake-host/server.ts`. The PDF frame's `frame-src` matters only to a host of the
  standalone chat, whose frame it is; the folder has none.
- **Your Svelte.** The bundle's runtime is its own, and a host's beside it, the board nested in its tree, is untouched. Proven by
  `guest.spec.ts` "a second Svelte".
- **Two boards.** Mounts in one page work apart: no id twice, each its own calls and state. Proven by `guest.spec.ts` "two mounts".
- **Ids.** Every id the board owns starts `vb<n>-` (`vb1-`, `vb2-`, `apps/board/src/board/mount-ids.ts` `takeIdPrefix`), the board's own page
  included, so your own `board` or `send` stays yours, and a `label` or `aria-controls` in the root finds its own. Don't select by them:
  they aren't part of this page. Proven by `guest.spec.ts` "a host's own ids", `apps/board/tests/mount-ids.test.ts`.
- **No storage, no address.** Nothing touches the page's storage or address (`view-hooks.spec.ts` "store:",
  `apps/board/tests/board-no-page.test.ts`).

## The engine

```ts
createEngine({ dir, name?, warn?, flags?, readOnly? }): PluginEngine   // apps/board/plugin/engine.ts `createEngine`
```

`dir` is the board's data folder, one per bot or project, and the only place it reads or writes: the ledger, the agents'
hashes and `images/`. `name()` is the folder as the person reads it (`list_boards` answers it as `project`; default `dir`).
`warn(message)` takes the ledger's warnings (default stderr). `flags` holds the flags the engine reads itself, each at its
default (`packages/format/src/flags.ts` `FLAGS`) when left out:

| Flag | Default | What it switches in the engine |
|---|---|---|
| `svgImages` | on | `image` serves svg pictures (§ Theme and host styling has the view's half) |
| `botToolRules` | on | The tools keep a bot's rules and its reads give it the facts (§ Tools) |
| `insertBetween` | on | A `node` item of `write_board` may carry `insert` |
| `singleAgent` | off | One agent per folder: no sign-up, no grants, no scoping (§ The bot) |
| `followOtherWriters` | on | `watch` and a held read hear another program's writes to `dir` (`watch`, below) |

Flag names are plain strings in `plugin.d.ts` (`{ [name: string]: boolean }`), so a new flag is never a change to the seam, and a name the engine does not know is ignored (`apps/board/tests/plugin-types.test.ts` "a new flag leaves the types alone"; `apps/board/tests/engine-switches.test.ts` "every flag the engine reads is in the spec").

**Read-only** (D-085 7). `readOnly()` is asked on every call, so you flip it in place: no new engine, no reload. While it
answers true, every write, your person's through `route` and your bot's through `tools.call`, answers the problem
`read-only` (409; a tool's `isError` with words saying nothing was written) and writes nothing in `dir`; every read says
`readOnly: true` (`list_boards`, `get_board`, `ledger`). The view learns it from its reads: after you flip it, say a `ref`
with no `head` through `events` (§ What the host gives), and the view reads again. Then a press that would write says why
through `notify`, `error`, and writes nothing, on the same path as standalone's page (`tests/pages/read-only-writes.spec.ts`:
an answer, a key, a note, a flag; seen marks stay in the view's memory). Naming your bot (`POST agents`, § The bot) is
a write too: do it while open. Left out, the engine is never read-only and no answer carries `readOnly`. Proven by
`read-only.spec.ts` "readOnly: an engine made read-only", "readOnly: asked on every call", "readOnly: the host flips it".

| Member | Promise | Proven by |
|---|---|---|
| `route(req, { caller, signal })` | One request, with no HTTP. `req` is `{ method, path, query?, body? }`. Split what `api` got: `path` is the part before the `?` (`ledger`), `query` the rest as a `URLSearchParams`; a `path` holding its query answers null. `body` is the JSON value, or a function the engine calls for it when the operation reads one (one that throws is a 400); leave it out when there is none. Answers `{ status, body, headers? }`, `body` to send as JSON, a problem as a reply, or null for a path not its own. **It trusts `caller`**: `{ by: 'person' }` for your person's door, never your bot's; `{ by: 'agent' }` with no id is refused, as no caller is. `signal` ends a held read | `engine-hooks.spec.ts` "route:", "route and tools.call", "route: a body", `tools.spec.ts` "tools.call: a caller of an agent" |
| `image({ method, path, ifNoneMatch? })` | Answers `imageRoute`: `path` is the text after the prefix, as the request wrote it. `GET` or `HEAD` of a picture in `dir`'s `images/` and only there, held to the same checks as standalone's route (`images.md`). A card names a picture relative to that folder: `![Flow](flow.png)` is `<dir>/images/flow.png`, and `images/flow.png` is missing. `body` is its bytes or null. Send `headers` as given: they carry the type, the no-sniff and the svg's policy | `engine-hooks.spec.ts` "image:" |
| `resolve(kind, ref)` | What a chip says now: `{ where, text }`, or `{ refused, reason }` when it changed or went. `answers` also gives `count`, and `ack: { board, head }`, `head` the ledger line it read through (what the Send's `record` is given back, § The chat). With `singleAgent` on, the answers chip's `agent` is ignored: it holds every answer. Never throws | `engine-hooks.spec.ts` "resolve:", "resolve: the answers ack" |
| `tools.list()`, `tools.call(name, input, ctx)`, `tools.instructions` | § Tools | `tools.spec.ts`, `apps/board/tests/bot-tool-rules.test.ts` "the right instructions per host" |
| `watch(onChange)` | A `Ref`, `{ board?, head }`, for every ledger change, this engine's or another writer's on `dir`. A ledger file replaced rather than grown (a sync, a git pull, a copy dropped in) is read again from the start and said as `{ head: 0 }`, which the view reads from the start. Returns the stop. Turn each into an `events` call. **Another writer** is heard because the engine looks at the file every `FOLLOW_MS` while anyone watches or a held read waits (`apps/board/server/ledger.ts` `follow`). With `followOtherWriters` off it never looks: `watch` hears this engine's own writes only, a held `check_responses` wakes on them alone, and a file replaced or grown by another program is read in at the engine's next call (every call reads the file's new lines first), said then | `engine-hooks.spec.ts` "watch:", `read-only.spec.ts` "watch: a ledger file replaced", `apps/board/tests/engine-switches.test.ts` "followOtherWriters off:" |

Nothing else is there (`engine-hooks.spec.ts` "createEngine and the engine hold no more").

## The bot

Pass `{ caller: { by: 'agent', agent } }` on every tool call: the engine trusts it (§ The engine `route`). Which `agent` it
takes depends on one flag, `singleAgent`, which you give the engine's `flags` and the view's settings alike.

**One bot per folder: `singleAgent` on.** No sign-up. Pass any id you like, a non-empty string that is the same for the bot every time
(a derived one does); the engine never compares it with another and never stores it. Every agent line the bot's calls write
is written as **the folder's one agent**: the first agent already joined in the ledger, so a bot that drew there before keeps
its boards and its cards, else one the engine joins itself on the first write, labelled by `name()` (cut to an agent label's 80 characters; the
folder's own name when `name()` is blank). A folder belongs to one host: one opened both by the board's own app and by a
host shares its first agent between them. The board's own server never passes `singleAgent` or `followOtherWriters` to
its engine (`#format` `withoutHostFlags`; `packages/format/tests/flags.test.ts` "the host-only flags never reach"). So
with the flag on:

- no write answers `needs-grant`, and no item is refused because another agent made the card or the board: there is no
  other agent;
- `request_grant` answers `held` for any board, writing nothing;
- every read is unscoped: `check_responses` and `list_open` give every answer and every open item, the reads' marks
  (§ Tools) say `held` on every board and `owed` on every note an agent owes, and the answers chip holds every answer (§ The engine `resolve`);
- the view ignores `chat.status.agent` (§ What the host gives).

What it does **not** change: ✓, ✗ and approving are still the person's, through `route` with `{ by: 'person' }`, and
refused to a bot; **a locked board still refuses every write**, the bot's and the person's (`locked`); `readOnly` still
refuses every write (§ The engine); a caller `{ by: 'agent' }` with no id is still refused. `POST agents` still answers as
below, and you need not call it. Proven by `apps/board/tests/engine-switches.test.ts` "singleAgent: no sign-up",
"singleAgent: the folder's one agent", "singleAgent: no grants and no scoping", "singleAgent: the lock and the person's acts",
`tools.spec.ts` "the bot: singleAgent".

**Agents of their own: `singleAgent` off** (the default, and standalone's). The host names its bot. Register it once,
`route({ method: 'POST', path: 'agents', body: { label } })`, with no second argument and not through your person's door,
which answers 403. Keep the `agent` it answers, and ignore the secret: no call takes one. **Keep the id yourself**, with the
bot's own data: no call of the engine's gives it back. It holds on another engine over the same `dir`, so don't register
again on a restart. Grants and scoping hold between agents as standalone's do (api.md 81-86) (`tools.spec.ts` "the bot").

**Words differ per host.** The engine's tool descriptions are standalone's less what a bot under a host doesn't have:
`join` and its secret, the chat panel, attachments and apps (`apps/board/server/words/plugin-tools.ts`). `skill.md` is the
standalone skill cut, section by section, to what a host's bot needs with `singleAgent` on, within 8 KiB: no grants, no
other ledgers, no apps, its pictures in the board folder's `images/`, and detail about one tool in that tool's description
(`apps/board/plugin/words/skill-edits.ts`). A change to it lands only with `npm run eval:bot` passing. Give the bot
`skill.md` while the plugin is on. Proven by
`apps/board/tests/plugin-skill.test.ts` "the plugin skill names no tool". The MCP instructions a bot reads before its first
call are the plugin's too (`tools.instructions`, below).

### Tools

Tools reach any bot as MCP tools (D-074 rule 4). The engine gives both halves in MCP's shapes, and the transport is yours:

- `tools.list()` gives `{ name, title, description, inputSchema }`, `inputSchema` being JSON Schema. It equals the manifest's `tools`.
- `tools.call(name, input, { caller, signal })` gives a `CallToolResult`: `content` (one text, the answer's JSON),
  `structuredContent`, `isError`. An input that doesn't fit, an unknown tool or a refusal is `isError` with words for the bot;
  it never throws. The engine checks `input` against the schema itself, so a host need not. `signal` ends a held call
  (`check_responses` with `wait`, with the `botToolRules` flag off: on, a bot under a host has no `wait`, below).
- **The change line.** A `write_board` call that answers without `isError` and wrote a line (an item that went, not a
  retry's replay of one written before) carries `_meta['plugin/change']`, the contract's `ChangeMeta` under its
  `CHANGE_META` key (one home in the board's code: `apps/board/server/engine/tools.ts` `CHANGE_META`); one that wrote
  nothing carries none, and no other tool carries one:
  - `words`: `board.change.board` when no card was written, `board.change.card` for one, `board.change.cards` for more; each
    is in the manifest's `changeWords` and has its text in `words.json` (`apps/board/plugin/words/change.ts`), holding
    `{count}` and `{subject}` for you to fill;
  - `count`: how many cards the write wrote, a whole number from 0, the length of `reveal.cards`;
  - `subject`: the board's id, which `packages/format/src/view.ts` `ID_PATTERN` keeps short and plain enough for the
    contract's subject bound;
  - `reveal`: `{ board, cards }`, the board's id and the written cards' numbers, for `view.reveal` on a click and for
    `chat.reveal` and `chat.hasLine` to match (§ The chat).

  It stays within the contract's `CHANGE_LIMITS` and `REF_LIMITS`. The facts are those a CLI's stream reads from the tool's
  text (`#agent` `boardWriteSummary`). Proven by `tools.spec.ts` "tools.call: the change line",
  `apps/board/tests/engine.test.ts` "a board write says what it changed".
- `tools.instructions` is what to tell the bot before its first call, MCP's server `instructions`: standalone's less `join`,
  the secret, `wait` and the folder header (`words/plugin-tools.ts` `instructionEdits`). `createMcpServer({ tools })` sends it;
  send it from your own MCP server too. Left out with the `botToolRules` flag off.

A bot under a host gets `list_boards`, `get_board`, `show_node`, `show_container`, `show_layout`, `list_open`, `check_responses`,
`request_grant` and `write_board`, as `x-hosts` in `packages/format/schema/openapi.json` says. It does not get `join` (you name it),
`list_apps` (the app host's) or `read_attachment` (the standalone chat's). No tool answers ✓ or ✗, or approves: those are the
person's, through `route`, and refused to a bot. Proven by `tools.spec.ts` "tools.list", "tools.call: every listed tool",
"tools.call: an input", `engine-hooks.spec.ts` "route:".

**The tools keep the bot's rules and tell it what it needs** (the `botToolRules` flag, on; off, as before; api.md 171):

- *It cannot hold its turn.* `check_responses` is listed without `wait` (`x-hosts` on the `wait` parameter: the tool table's
  `inputHosts`), and a `wait` sent anyway is refused at once, `invalid`, saying the person's Send brings their answers and to
  end the turn. Your chat brings them. `route` keeps `wait`, as standalone's agents keep it.
- *Reads say what is true for it.* A note it owes an answer is `owed` (`get_board`, `show_node`, `show_container`: the rule
  `list_open`'s `pending` uses), a note already answered says what answered it, `answered` (a reply with its words, a
  newer version, or the person's ✓ or ✗; api.md 172), and a board it holds is `held` (`list_boards`, `get_board`: what
  `request_grant` answers `held` for), so it never answers a note twice or asks for a board it has.
- *A key conflict says what the key holds* (a card by number, title and version, or the line's kind) and names a free key.

Proven by `apps/board/tests/bot-tool-rules.test.ts` "no holding the turn", "reads tell the truth", "reads say what answered a note", "a key conflict helps", and `engine-hooks.spec.ts` "route and tools.call".

**Two worked transports.**

1. *Your own MCP server*, the whole of it (`tools.spec.ts` "a host's own MCP server"):

   ```js
   // tools/list
   ({ tools: engine.tools.list() })
   // tools/call
   engine.tools.call(params.name, params.arguments ?? {}, { caller: { by: 'agent', agent } })
   // initialize, server/discover
   ({ instructions: engine.tools.instructions })
   ```

   If the bot runs elsewhere, one generic pass-through does it: the bot's MCP server lists and calls over your own door, which
   calls the engine with the caller it knows. The engine never meets the bot.
2. *Standalone's `vb-mcp`*: a stdio MCP server the CLI starts, calling the standalone server over HTTP with the agent's secret
   (`packages/mcp/bin/vb-mcp.ts`). `createMcpServer({ tools })` (`#mcp`) also serves any host's `engine.tools` as they are, but
   `#mcp` is not in the folder; it sends `tools.instructions` when they are given. Proven by `apps/board/tests/engine.test.ts`
   "the MCP server serves the engine's tools", `apps/board/tests/bot-tool-rules.test.ts` "the right instructions per host".

## Attachments

Attachments belong to the host's chat (D-068 ruling 6, D-074 rule 5). The plugin never sees a file: nothing in `BoardHost`
takes one, and no tool reads one. Your chat attaches, uploads and tells the bot the path in its own message. Limits are yours.
`read_attachment` and the PDF frame stay with the standalone chat, and `packages/documents` stays reusable. Standalone's own
way is its chat's (`apps/board/server/chat-files.ts`; `docs/specification/chat.md`). Proven by `tools.spec.ts` "tools.list" (the absence).

## Theme and host styling

A host may dress the board in its own type, colours and light or dark, or set none of it and get the board's own look. Each
property is optional: a CSS custom property you set and the board only reads, never declares. Set it on `root` or any ancestor
(**Scope**, below).

**Type** (`apps/board/plugin/theme.css`):

| Property | What it is | Without it |
|---|---|---|
| `--host-font` | The text face, a `font-family` list | The board's own |
| `--host-font-mono` | The face of code and numbers, a list | The board's own |
| `--host-text-scale` | The text size around the cards, a number | `1.25` |

**Colours** (read in `apps/board/plugin/theme.css`; the board's own values in `packages/tokens/src/tokens.css`). Give each as one finished colour for the mode the board is in: resolve your own
light and dark first, and change the value when your mode changes. Each feeds the board's tokens in its row; one you leave out
keeps the board's own value, light / dark.

| Property | What it means | Feeds | Without it (light / dark) |
|---|---|---|---|
| `--host-accent` | Your accent: the selection, the active state, a highlighted link; a button's fill when you give no `--host-accent-fill` | `--vb-accent` | `#d4138a` / `#ff5cbe` |
| `--host-accent-strong` | The accent where it carries text; a fill's hover when you give no `--host-accent-fill-hover` | `--vb-accent-text` | `#c81784` / `#ff66c2` |
| `--host-accent-fill` | A primary button's fill, when yours differs from your accent | `--vb-accent-fill` | Your `--host-accent`, else `#d4138a` / `#ff85cf` |
| `--host-accent-fill-hover` | That fill under the pointer | `--vb-accent-fill-hover` | Your `--host-accent-strong`, else `#bc0f7a` / `#ff9bd8` |
| `--host-on-accent` | Text and icons on the fill and its hover | `--vb-ink-on-fill` | `#ffffff` / `#1a0712` |
| `--host-canvas` | The ground behind the containers | `--vb-surface-canvas` | `#f5f5f6` / `#111112` |
| `--host-surface` | Containers, cards, menus and popovers | `--vb-surface-region`, `--vb-surface-card`, `--vb-surface-raised` | `#ffffff` / `#1a1a1c` |
| `--host-surface-sunken` | Wells, fields, the deepest grounds | `--vb-surface-sunken`, `--vb-surface-deep` | `#efeff1` / `#222225`; deep `#e4e4e7` / `#2c2c30` |
| `--host-ink` | Body text and strong text | `--vb-ink-strong`, `--vb-ink` | `#18181b` / `#ededef`; ink `#3f3f46` / `#c7c7cc` |
| `--host-ink-muted` | Secondary text | `--vb-ink-subtle` | `#6b6b74` / `#b8b8c0` |
| `--host-line` | Hairlines and borders | `--vb-line` | `#e1e1e5` / `#2a2a2e` |
| `--host-line-strong` | Borders that must be seen, a container's frame | `--vb-line-strong`, `--vb-line-contrast` | `#cbcbd1` / `#3a3a40`; contrast `#b5b5bd` / `#4a4a52` |
| `--host-focus` | The focus ring | `--vb-focus` | The accent, yours when you give one |
| `--host-color-scheme` | Light or dark: `light`, `dark`, or `light dark` (the system's) | The `color-scheme` of the board's root | **Mode**, below |

**Derived.** `--vb-accent-soft` (a selected or commented ground) and `--vb-accent-line` (its edge) mix `--host-accent` into
`--host-surface` (or the board's surface) when you give an accent, so one accent dresses the whole family; without one they
are the board's own. The fill is apart from the accent because many hosts fill a button with a deeper colour than they ring a
selection in: give `--host-accent-fill` and its hover, and the accent keeps the selection, the ring and the soft grounds;
give neither, and the fill is your accent as before. A token the board defines from one in the table follows it: the focus ring and a highlighted wire are
the accent, and a state's soft ground mixes into the card surface. **The board's own**, whatever you set: every card kind, a
decision's pink too, and the state colours (answered, dropped, commented, later, new, updated, the flag), since a card's
colour says what it is (D-094, point 455); the scrim, the dot grid, the wires, the lane band and the shadows. Proven by `host-styling.spec.ts` "no host property", "each host property reaches", "derived accents",
"fill:", `apps/board/tests/plugin-theme.test.ts` "the spec's host table".

**Mode.** The board's root takes `--host-color-scheme` as its `color-scheme`, and every colour, the board's own and the
defaults above, resolves against it (`light-dark()`, kept native in `view/board.css`). Without it, `data-theme="light"` or
`"dark"` on `<html>` forces one, else the system's. An inherited `color-scheme` doesn't move the board, nor does `data-theme`
on `root`: the board can't tell a `color-scheme` you chose from a page that said nothing, whose `normal` would make every
colour light, so it reads your choice from the property, beside your colours.
Proven by `host-styling.spec.ts` "mode: --host-color-scheme", `guest.spec.ts` "theme", "a host's color-scheme".

**Scope.** Every property here, the type's too, works set on `root` or any ancestor of it; nothing needs `<html>`. The sheet
declares the board's tokens on its root as well as `:root`, so they read what you set there, and two boards in one page may
wear different colours and modes. Proven by `host-styling.spec.ts` "scope: on the mount root", "scope: two mounts".

**Live.** Change a property, or your mode, while the board is mounted, and it follows at once, with no remount and no call.
Proven by `host-styling.spec.ts` "live:".

**Contrast** (D-009). The board's own pairs meet APCA tiers, measured with APCA-W3 0.0.98G-4g, light and dark. Your colours
are your promise: in each mode you give, measured the same way, your pairs meet these. A property you leave out counts as the
board's value, so your ink on the board's surface is your pair too.

| Pair | At least |
|---|---|
| `--host-ink` on `--host-surface`, `--host-canvas` and `--host-surface-sunken` | Lc 60 |
| `--host-ink-muted` on the same three | Lc 60 |
| `--host-on-accent` on the fill and its hover: `--host-accent-fill` and `--host-accent-fill-hover`, or `--host-accent` and `--host-accent-strong` where you give no fill | Lc 60 |
| `--host-accent-strong` as text on `--host-surface` and `--host-canvas` | Lc 45 |
| `--host-focus` on `--host-surface` and `--host-canvas` | Lc 30 |

Lines (`--host-line`, `--host-line-strong`) are not a tier: the board's own are faint by design, as `tokens.css` § Lines
says. The board's own colours that stay (the kinds, the states) are measured on its own grounds, not on yours (§ Not covered).
Proven by `host-styling.spec.ts` "contrast: the board's own", which holds the board's defaults to the same table.

**Off.** Behind the `hostStyling` flag, on. Off (`settings.get('hostStyling')` false, read at mount), the colour properties
and `--host-color-scheme` reach nothing and light or dark is as before; the type's three still apply. Proven by
`host-styling.spec.ts` "flag off:".

## The types and the seam version

**The types.** `plugin.d.ts`, at the root of the folder, is made at build from the code and is not written by hand
(`apps/board/bin/plugin-types.ts` `pluginTypes`): the declarations of `apps/board/plugin/view.ts` and `engine.ts`, and every
type they reach, copied as written with their comments. It is one module: `mount`, `createEngine`, `PluginHost`, `PluginView`,
`PluginEngine`, `PluginEngineOptions` and what those take and give (`BoardChat`, `Chip`, `EngineReply` and the rest). A
`Pick` or `Omit` is opened to its members, so what this page calls standalone's own (§ Standalone's own) is not in the file.
It uses the DOM's types (`HTMLElement`, `Response`, `URLSearchParams`, `AbortSignal`) and nothing else outside itself. A
TypeScript host compiles against the file of the folder it ships:

```ts
import type { PluginHost, PluginView } from './board/plugin.js';
const { mount } = (await import(viewUrl)) as Pick<typeof import('./board/plugin.js'), 'mount'>;
```

Proven by `apps/board/tests/plugin-types.test.ts` "the types are the code's own", "a host that uses every member compiles against the types", "the file fails to compile against that host when any one member is taken out", `apps/board/tests/plugin-build.test.ts` "a clean build writes exactly the folder".

**The seam version.** `seam` in `manifest.json` is one whole number, starting at 1, with one home: `SEAM` in
`apps/board/plugin/seam.ts`. It is the version of the types above, and of what this page promises of the view and the engine:
`manifest.version` is the API's and moves with routes, so it says nothing of the seam.

*A breaking change* is one a host built for the last number would not survive, by its compiler or by its behaviour: a member
taken out or renamed, or a part of the folder or its entry (`mount`, `createEngine`) moved; a member the host gives that is
now required, or takes less than before; a member the host is given that now holds less; a promise on this page that now means
something else, or happens at another moment. *Not breaking*: a member the host may leave out, a member the host is given
and may ignore, a new tool or chip kind, a new flag that is off until a host turns it on, new words, a new `--host-*`
property a host may leave out (§ Theme and host styling: a host that sets none sees the board as before, and no type moves).

*An option shaped like standalone's.* A member the host gives that the standalone engine also takes (`readOnly`) is
declared in `PluginEngineOptions` itself, with its promise in a host's words, rather than picked from `EngineOptions`,
whose comments name standalone's own controls: the compiler holds the two shapes equal at `createEngine`'s call, and
"the types are the code's own" fails if a standalone name reaches the file. A host written before it still compiles
(`apps/board/tests/plugin-types.test.ts` "an option a host may leave out is additive").

*When the number moves.* `SEAM` is raised by one in the same change as the breaking change, never lowered, never reused. The
types cannot tell a breaking change from an addition, and no tool can see a changed meaning, so the person making the change
decides, and review checks. What the build does is make the decision unavoidable: `SEAM_TYPES` in `seam.ts` is the hash of the
types (their tokens: a comment or a line break moves nothing), and the build and `npm test` fail with the hash and the
rule until it is set again, whichever way the change goes. A change that does not touch the types leaves both alone.

*Seam 2* (this page) moved the seam to a host contract's shapes (§ One shape everywhere, at the top). A host built for 1
would not survive it:

| What | Seam 1 | Seam 2 |
|---|---|---|
| `events` | `ref: { board?, head? }` | `ref` any `Ref`; `{}` catches up (§ What the host gives) |
| `chat.send(record)` | `record(answers)`: the answers chip's `resolve` answer, `null`, or nothing | `record(acks)`: a list of `Ref`s, `[]`, or `null` with no chat (§ The chat) |
| `chat.reveal`, `chat.hasLine` | `{ board, n }` | `{ board, cards: n }` |
| `resolve('answers', …)` | `head` | `ack: { board, head }` (§ The engine) |
| A board write's `_meta` | `vb/change`: `{ board, cards, head }` | `plugin/change`: `{ words, count, subject, reveal }` (§ Tools) |
| `view.reveal` | `{ board?, n?, seq?, cards? }` | any `Ref`, the rest ignored (§ What the view gives) |

The two flags of § The bot and § The engine, and `changeWords` in the manifest, are additions: at their defaults the board
behaves as on seam 1, and a host that ignores `changeWords` loses nothing.

*What a host does with it.* Read `seam` before anything else is loaded, and compare it with the number it was built for. The
same number: load. Any other: don't load that folder, keep the one it has, and say both numbers: a higher one means the host is
the one to update (compile against the new `plugin.d.ts`), a lower one that the folder is old. A host never needs to
read the types at run time.

Proven by `apps/board/tests/plugin-types.test.ts` "the manifest holds the seam number", "the seam number cannot stay behind the types",
`engine-hooks.spec.ts` "the folder: a host reads the seam version", `apps/board/tests/plugin-build.test.ts` "the manifest fits its schema".

## The manifest

`manifest.json`, checked at build by `apps/board/plugin/manifest.schema.json` (`apps/board/plugin/manifest.ts` `manifestOf`). Text is words keys, never the text.

| Field | Means |
|---|---|
| `id` | `board` |
| `name` | A words key |
| `version` | The API's version (`info.version` in `openapi.json`), a string |
| `seam` | The seam's version, a whole number from 1 (§ The types and the seam version) |
| `view` | `{ module, styles, export }`: `view/board.js`, `[view/board.css]`, `mount` |
| `engine` | `{ module, export }`: `engine/engine.js`, `createEngine` |
| `chips` | Each `{ kind, words }`: `card`, `note`, `board`, `selection`, `answers` |
| `tools` | Each `{ name, words, input, writes }`, exactly `tools.list()`; `input` is its JSON Schema; `writes` says it changes the ledger |
| `skill`, `words` | The two files |
| `changeWords` | The words keys a change line may name: `board.change.board`, `board.change.card`, `board.change.cards`, each with its text in `words.json` (§ Tools, the change line). Proven by `apps/board/tests/plugin-build.test.ts` "the change words are in the manifest and words.json" |

It has **no `settings` and no `icon`**: the board declares no settings for a host to draw (flags and `align` come through
`host.settings`), and an icon is a name in a host's own list. Proven by `engine-hooks.spec.ts` "the folder",
`apps/board/tests/plugin-build.test.ts` "the manifest fits its schema".

## Standalone's own, not in the folder

The standalone page and server are a host, but these are theirs alone. A host of the folder can't reach them, as
`view-gives.spec.ts` "the view holds no more" and `engine-hooks.spec.ts` "createEngine and the engine hold no more" hold.

| What | Why it is there |
|---|---|
| `MountedBoard.board`, `BoardControls` (`apps/board/src/board/mount.ts`) | `#board`'s `mount` gives it for `App.svelte`'s page door (`rebuild`, `idle`) and `tests/pages/` |
| `BoardHost.page`, `BoardPage`, `BoardPageParts` (`host.ts`) | Its address, the board last looked at, its folder, theme and Chat button in the header, and help naming this repo's commands. Left out, the board opens its first board, the header reflows, and its words say only what any person can act on (`engine-hooks.spec.ts` "the folder: nothing") |
| `EngineOptions.ledger`, `EngineOptions.onSend`, `Engine.ledger`, `Engine.agents`, `Engine.dir` (`apps/board/server/engine/engine.ts`) | Its server opens the ledger under its own lock and runs chat sessions and the app host beside the engine |

## Not covered

No test holds these:

- A real bot or CLI: the fake bot is tool calls, and `skill.md`'s scenarios have not been run on one.
- A host's routes on another origin than its page, a page in a frame, a phone's width.
- App cards under a host: `appCards` stays off here.
- `isolation: isolate` on `root` against a host's own layers.
- The board's own colours (the card kinds, the states, the wires) on a host's grounds: looked at on the fake host's palettes,
  not measured by a test. A colour read into script (an app card's frame) following a host's change: `appCards` stays off here.

## Open points

Reviewed by the maintainer (D-074 rule 7): all settled, 2026-11-02. Each is still cheap to change until a host depends on it.

1. **Pictures for a bot under a host.** **Settled** (point 377): no `put_image`. A bot writes a picture straight into the board's
   `images/` folder and the engine reads it with its usual checks (`engine.image`; `imagePathProblem`, `imageHeadProblem`, the size
   limit), so the engine stays the one reader and no bytes pass through a tool's input. That holds where the bot can reach the
   folder: the last section says where it lives. **Done**: the plugin's `skill.md` has its own Images section
   (`apps/board/plugin/words/skill-edits.ts` `IMAGES`): the `images/` folder of the board folder the host names, the formats and
   limits, and how a card names a picture, with no host named (`apps/board/tests/plugin-skill.test.ts` "the plugin skill has an Images section").
2. **The answers are a chip** (D-074 rule 6), through `chat.attach` and `resolve`, with no extra prompt hook. **Settled**
   (point 377): a host may let the person drop them; the Send then counts only what went, by what `resolve` read
   (`record(acks)`, § The chat), so nothing is lost and the seam stays small.
3. **`chat.send(record)`, not `chat.send()`.** **Settled** (D-075): The host sends, then runs the board's record of the Send, so the board keeps the
   act's outcome and a host with its own server may record it with the message. Cost: a callback in a seam otherwise plain.
   Keep: it is what makes Send's wait and refusal the same on every host, and its argument is how the board knows what went.
4. **`chat.hasLine?`.** **Settled** (point 391A): a synchronous question beside `chat.reveal?`, since the stepper asks it while drawing. The alternative is a
   link always shown when `reveal` is given. Keep: a link that does nothing is worse.
5. **`status` and `send` on the view**, beyond PLAN's list. **Settled** (point 391B). Standalone's chat reads `status`, and a host may want a button of its
   own. Keep; the status is wide, so the types promise only what this page names (`PluginStatus`).
6. **`#board` still gives `board`.** **Settled** (point 391C), until `boardChromeInMount`'s off branch goes: The folder's `mount` leaves it out (`plugin/view.ts`), but the `#board` name, used inside
   this repo, does not: `App.svelte` needs its test door.
7. **The root is a size container** (`apps/board/src/styles/board.css`). **Settled** (D-082): `100cqh` caps a menu by the pane. It asks a host for a definite
   size, which its absolute children needed already.
8. **The sheet still touches `:root`.** **Settled** (point 391D; reopened and settled by host styling, 2026-11-06): the tokens
   are declared on `:root` and again on the board's root, one literal each, so a host's properties on the mount root reach them and
   two boards may differ (§ Theme and host styling). `light-dark()` stays native in the plugin's sheet, so the board's mode is the
   `color-scheme` at its root, and `color-scheme` itself stays off `:root` (`apps/board/vite.plugin.config.ts`
   `hostKeepsColorScheme`), so a host's fields stay its own. The standalone page keeps its own build.
9. **Types in the folder.** **Settled** (point 377): `plugin.d.ts`, generated at build (§ The types and the seam version).
10. **A seam version.** **Settled** (point 377): `seam` in the manifest, with the rule for moving it (§ The types and the seam version).
11. **The zoomed view stays a real modal**, inert page and all (PROOF_01). Non-modal means rebuilding its focus handling. **Settled** (D-080).

Open, from read-only (D-085 7), 2026-11-03, for the maintainer:

12. **The person's reason names Editing.** A refused press says standalone's words, "Read-only: switch to Editing to
    change it" (`#actions` `READ_ONLY_PERSON`); a bot's refusal is already host-neutral, "until they make it editable"
    (`READ_ONLY`). A host has no Editing unless it draws one. Either a host-neutral sentence for the person too, or
    `readOnly` answering the reason the host gives.
13. **A bot's own file writes.** `readOnly` stops every write through the engine. A bot that writes pictures straight into
    `images/` (open point 1) is stopped only by the host's own file rules while the board is read-only.
14. **A lock of the host's own.** Standalone takes the ledger's lock on Edit, so two computers never write one ledger; the
    engine takes none. A host that lets two writers open one `dir` (a shared folder) keeps them apart itself, or asks for
    the lock in the seam. With `followOtherWriters` off, such a second writer is not even heard until the engine's next call.

## What nclite needs

Against nclite's plugin contract (`shared/plugin-host.ts`, its ADR-0288; `docs/plugins.md`) at the commit the board's copy
names (`tests/plugin/contract/README.md`). The gaps this section listed against its draft v0.1 are closed by that contract
and seam 2, and its board adapter (`shared/plugin-adapters/board.ts`) and stylesheet waiver (`REVIEWED_BOARD_SHEET`) have
nothing left to translate: B1 is § Tools' change line, B2 § The chat's acks, B3 `singleAgent`, B4 the plain refs, B5 the
scoped sheet (§ A guest in the host's page), C2 `followOtherWriters`.

**Taking seam 2**, in one change: vendor the folder, move the board row's `seam` to 2, set the flags below, and delete the
adapter, its line in `ADAPTERS`, the waiver and the board's stored registration.

| Where | Flag | Set | Why |
|---|---|---|---|
| The row's `engineFlags` | `singleAgent` | `true` | Each bot has its own folder: no sign-up; pass the bot's derived id as the caller (§ The bot) |
| The row's `engineFlags` | `followOtherWriters` | `false` | The bot's engine is its folder's only writer; its own writes reach `watch` without polling |
| The row's `viewSettings` | `singleAgent` | `true` | The answers chip and Send ignore `chat.status.agent` (§ What the host gives) |
| The row's `viewSettings` | `appCards` | `false` | As before: no app host |

Leave `svgImages`, `botToolRules` and `insertBetween` at their defaults.

**Two asks.**

1. **Rename `CHANGE_META` to `'plugin/change'`**: a key that names no host, so a plugin writes it the same under any. The
   board's copy carries the rename already, and its writes use that key, so nclite reads the board's change lines once it
   renames. The stored `v: 2` body does not change, and the board's `changeWords` texts are word for word the ones
   `readBoardChange` draws for rows stored before, so old and new lines read alike.
2. **No sign-up, no stored ids, no special case for old bots.** With `singleAgent` on, the board needs no `POST agents`,
   keeps nothing for the bot, and takes the derived id on every call. A bot that registered before keeps its boards and
   cards with no migration: the engine writes as the folder's first joined agent, which is that registration.

**Attachments there.** Its chat already uploads on submit and tells the bot the path, and the reader runs in its container:
nothing to add for the board.

### Where the board lives in nclite

Decided (point 377.1); open point 1 rests on it:

- **The whole board folder lives inside each bot's workspace**: `.visionboard`, with its ledger, its `images/` and its apps. That folder is the `dir` the host gives `createEngine`.
- **Each bot has its own board**: one engine and one `dir` per bot, so the bot is its folder's one agent (`singleAgent`, § The bot), and nothing of its id is kept.
- **A bot writes its pictures straight into the board's `images/` folder**, and `engine.image` reads them with its usual checks (§ The engine). There is no `put_image` tool.
- **Accepted for now**: the bot can reach the ledger file (`.visionboard/ledger.jsonl`) because it is in the bot's workspace. Splitting the ledger out of the bot's reach is a later option.
