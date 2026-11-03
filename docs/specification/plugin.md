---
category: project-docs
type: specification
status: draft
created: 2026-10-31
updated: 2026-11-03 (read-only for a host: § The engine `readOnly`, `watch` on a replaced ledger; Open points 12-14)
scope: The board as a plugin — what any host implements: the folder, the view seam, the engine seam, the types and the seam version, the manifest, tools over MCP, attachments, theme, and how an update travels
keywords: [plugin, host, mount, engine, manifest, MCP, seam, types, version, read-only]
---

# The board as a plugin

A plugin is the board built once as one folder, which a host takes and runs: the person sees the board in the host's
page, and the host's bot works on the same board through tools. The standalone app is one host of it, through the same
seam (D-074). This page is all a host needs. If it doesn't say it, a host may not rely on it.

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
`root` wins.

### What the host gives

`PluginHost` (`apps/board/plugin/view.ts`): `BoardHost` (`apps/board/src/board/host.ts`) without `page`, which is the standalone page's own
(§ Standalone's own). Everything the board does outside `root` goes through it.

| Member | Promise | Left out | Proven by |
|---|---|---|---|
| `api(path, init)` | Calls the engine's routes: `path` is relative (`ledger?after=0`); resolves the `fetch` `Response`, as the person (§ The engine) | Required | `view-hooks.spec.ts` "api and events" |
| `events(listener)` | Calls `listener({ plugin, ref: { board?, head? } })` for every change to the data, from anyone; returns the unsubscribe. A `ref` with no `head` says "you may have missed changes": the board catches up. Say one each time your stream opens. **A first read that fails** (`api` answers a problem or rejects, an engine still starting) says so through `notify` and over the stage, keeps listening and reads again on the next call of `listener`, with no retry of its own: so say one when your engine is up. **While reads keep failing**, at any time, there is one notice until one works | Required | `view-hooks.spec.ts` "api and events", "events: a ref with no head", "events: a first read that fails", "events: while reads keep failing" |
| `chat` | § The chat | Required: give the three lines there if you have no chat | `view-hooks.spec.ts` "a host with no chat at all" |
| `settings.get(key)`, `settings.on(listener)` | Each flag by name, a boolean, and `align` (`center` or `start`). A value you don't give reads as the flag's default. Flags are read once, at mount; `on` is for `align`, which lays out again, and returns the unsubscribe | Required | `view-hooks.spec.ts` "settings: a flag comes" |
| `notify(text, tone?)` | A short notice outside the board; `tone` `error` for a refusal | Required | `view-hooks.spec.ts` "notify and confirm" |
| `confirm(ask)` | Your own dialog. `ask` is `{ heading, body, confirm, list? }`, `confirm` being the button's words, `list` `{ items, skipped? }` of `{ ref, text }`. Resolves true when confirmed | Required | `view-hooks.spec.ts` "notify and confirm" |
| `store.get(key)`, `store.set(key, value)` | The viewer's conveniences, as strings: each board's zoom (`view.<board>`), whether the proposals notice is hidden. May lose anything. Give each data folder its own store: the keys name only what is on the board | Kept for the mount | `view-hooks.spec.ts` "store:", "store left out" |
| `imageRoute` | The address a picture's path goes after: what `<img src>` loads and its version is asked at, on the browser's own cookies, so it can't carry a header. Answer it with the engine's `image` | `/board-images/` on the page's origin | `view-hooks.spec.ts` "imageRoute: under", "imageRoute left out" |

**Flags a host needs to know.** Set `appCards` off unless you host apps: on, the board asks a route only an app host
answers, and a bot has no `list_apps` to draw with (`view-hooks.spec.ts` "settings: appCards off"). `cardImages` and `svgImages`
off stop pictures and svg pictures; pass `svgImages` to `createEngine`'s `flags` too. Leave the rest at their defaults.

### What the view gives

`PluginView`, `apps/board/plugin/view.ts`.

| Member | Promise | Proven by |
|---|---|---|
| `unmount()` | Removes every listener it added, an open menu's or tip's too, takes back its chips, empties `root` and gives it back as it was. Never asks, so call `leave()` first. Each step runs whatever another does: an unsubscribe of yours that isn't a function is passed over, and one that throws goes to the console (`apps/board/src/board/teardown.ts` `finishAll`). After it the mount ignores whatever you keep calling, a listener your unsubscribe left in place or a member of the view (`hearUntilStopped`) | `view-gives.spec.ts` "unmount: every listener", "unmount with a tip open", "unmount finishes", "a stopped mount ignores" |
| `unsaved()` | Synchronous: a note holds changed words. For your `beforeunload` or your own question | `view-gives.spec.ts` "unsaved and leave" |
| `leave()` | True at once when nothing is unsaved; else asks through `confirm`. True: the words are discarded and you unmount. False: the board stays, focus in the words | `view-gives.spec.ts` "unsaved and leave" |
| `pageChip()` | The chip for the board on show, for your own Add to chat; null with none | `view-gives.spec.ts` "pageChip" |
| `reveal({ board?, n?, seq?, cards? })` | Brings into view a board, a card, a note, or several cards. `cards` zooms and selects nothing. Not on the board, or a card hidden or removed: says so through `notify`, and takes no focus. Another board may ask through `confirm` first. A board not yet in the ledger opens when its first line arrives, which is how a bot's first board opens | `view-gives.spec.ts` "reveal: a board", "reveal of what is not" |
| `status.now`, `status.on(listener)` | What the board shows, read only: `boardId`, `title`, `counts`, `unsaved` and `chatWork`, which are all the types promise (`PluginStatus`: the status holds more, and a host may read it but not rely on it); `on` says each change, with the fields that changed | `view-gives.spec.ts` "status and send" |
| `send()` | Send to agent, for a button of your own. The board's header has its own. Resolves null, or the problem's words | `view-gives.spec.ts` "status and send" |

Nothing else is there (`view-gives.spec.ts` "the view holds no more").

### The chat

`BoardChat`, `host.ts`: the only way the board reaches the host's chat.

```ts
chat: {
  attach(key, chip | null),                  // add, replace or remove the chip under `key`
  send(record),                              // Send to agent; record(answers | null) once it went
  status: { now, agent?, held?, staged?, on(listener) },
  reveal?({ board, n }),                     // show the chat's line that last changed this card
  hasLine?({ board, n }),                    // synchronous: is there such a line
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
- **As a message goes**, call the engine's `resolve(chip.kind, chip.ref)` for every chip. `{ where, text }` is one block of
  the bot's prompt; no block when `text` is empty. `{ refused, reason }` stops the send: answer with your words. Proven by
  `view-hooks.spec.ts` "chat.send: Send sends", "chat.send: a chip the engine refuses".
- **`send(record)`** sends what is staged, with no words, then answers `record(answers)`, the board's own record of the Send:
  null, or the problem's words. **Only a message that carried the answers counts as their Send** (point 377): pass `record`
  what `resolve` answered for the answers chip that went (the board reads its `head`: the answers it read count as sent,
  one made after the read waits for the next Send), or `null` when the message went without one (none was staged, or the
  person removed it): the Send then acknowledges nothing new, and the answers stay. Call `record` only once the message has
  gone: one that failed records nothing, and a crash before the record sends the answers again (a duplicate, never a loss).
  `record()` with nothing is for a Send no chat carried (no chat at all: the bot reads the board itself); it covers every
  answer up to the Send's own line, as before. Call it even when nothing was staged. Leave it out only when your own server
  recorded that Send with the message (the `send` act, with its `head`). The record goes to the board the Send was pressed
  on. Resolves null when done or held for the bot's turn to end. One that rejects, a `fetch` that failed, is Send's error
  state, with the board's own words (the standalone server's own `send` act is that rejection, a 409 saying why, when its chat session can't be loaded: api.md 170). Behind the `sendCountsWhatWent` setting, on by default; off, every Send covers every
  answer up to its own line. Proven by the same, "chat.send: a rejection", and `send-what-went.spec.ts` "removed chip",
  "watermark", "at-least-once", "flag off"
- **`status`** is read only. `now` (`idle`, `working`, `asking`) drives the board's working mark, and is all you must give.
  With only that, Send is enabled by an answer no Send has carried, or by a chip of the board's own that hasn't gone with a
  Send. `on` returns the unsubscribe. `staged`: you hold what Send would carry. Given at all it has the full say over the chips, the
  board's included, so give it if your chat holds more of its own, a file say, or drops the chips. An answer no Send has carried
  enables Send either way; with `agent`, only one that agent may read. `held`: Send waits for the bot's turn. `agent`: the id your
  chat talks to, which scopes the answers chip, and the answers that light Send, to what it may read; an answer only another agent
  may read leaves Send off, and that agent reads it with `check_responses` (`chat-send-scope.spec.ts`). Proven by `view-hooks.spec.ts` "chat.status", "chat.status: with no staged".
- **`reveal` and `hasLine`** give a changed card's stepper its link to your chat. Without `reveal`, no link; with `reveal` and
  no `hasLine`, always a link. Proven by `view-hooks.spec.ts` "chat.reveal and chat.hasLine", "chat.reveal left out".
- **A change chip.** A board write's tool result carries `_meta['vb/change']`, `{ board, cards, head }` (§ Tools). Draw it as a
  line, and `view.reveal({ board, cards })` on a click. Proven by `round-trip.spec.ts` "a board-to-chat round trip".

With no chat at all, where nothing carries a chip, and the bot reads the board itself: `chat: { attach() {}, send: (record) => record(), status: { now: 'idle', staged: false, on: () => () => {} } }`.

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
  takes back; `all` costs a big board too much), or a `width` or `height` on an `svg` or `img` that carries its own. The board's rules stay under its own `vb-` names, but the sheet does
  set `--vb-*` and `--lightningcss-*` on `:root` and on `[data-theme]`, registers `--vb-root-w`, and selects `vb-node` and `vb-region`. A
  `color-scheme` of yours stays yours: the board's is on its root. Proven by `guest.spec.ts` "a host's loud element rules",
  "a picture stands too", "a host's color-scheme", `tests/pages/host-styles.spec.ts`.
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
`warn(message)` takes the ledger's warnings (default stderr). `flags` holds the flags the engine reads itself: `svgImages`. Flag names are plain strings in `plugin.d.ts` (`{ [name: string]: boolean }`), so a new flag is never a change to the seam, and a name the engine does not know is ignored (`apps/board/tests/plugin-types.test.ts` "a new flag leaves the types alone").

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
| `resolve(kind, ref)` | What a chip says now: `{ where, text }`, or `{ refused, reason }` when it changed or went. `answers` also gives `count`, and `head`, the ledger line it read through (what the Send's `record` is given, § The chat). Never throws | `engine-hooks.spec.ts` "resolve:" |
| `tools.list()`, `tools.call(name, input, ctx)`, `tools.instructions` | § Tools | `tools.spec.ts`, `apps/board/tests/bot-tool-rules.test.ts` "the right instructions per host" |
| `watch(onChange)` | `{ board?, head }` for every ledger change, this engine's or another writer's on `dir`. A ledger file replaced rather than grown (a sync, a git pull, a copy dropped in) is read again from the start and said as `{ head: 0 }`, which the view reads from the start. Returns the stop. Turn each into an `events` call | `engine-hooks.spec.ts` "watch:", `read-only.spec.ts` "watch: a ledger file replaced" |

Nothing else is there (`engine-hooks.spec.ts` "createEngine and the engine hold no more").

## The bot

**The host names its bot.** Register it once, `route({ method: 'POST', path: 'agents', body: { label } })`, with no second argument and
not through your person's door, which answers 403. Keep the `agent` it answers, and ignore the secret: no call takes one. Pass
`{ caller: { by: 'agent', agent } }` on every tool call. **Keep the id yourself**, with the bot's own data: no call of the engine's
gives it back. It holds on another engine over the same `dir`, so don't register again on a restart (`tools.spec.ts` "the bot").

**Words differ per host.** `skill.md` and the engine's tool descriptions are standalone's less what a bot under a host doesn't
have: `join` and its secret, the chat panel, attachments and apps; its pictures go in the board folder's `images/` (`apps/board/plugin/words/skill-edits.ts`,
`apps/board/server/words/plugin-tools.ts`). Give the bot `skill.md` while the plugin is on. Proven by
`apps/board/tests/plugin-skill.test.ts` "the plugin skill names no tool". The MCP instructions a bot reads before its first
call are the plugin's too (`tools.instructions`, below).

### Tools

Tools reach any bot as MCP tools (D-074 rule 4). The engine gives both halves in MCP's shapes, and the transport is yours:

- `tools.list()` gives `{ name, title, description, inputSchema }`, `inputSchema` being JSON Schema. It equals the manifest's `tools`.
- `tools.call(name, input, { caller, signal })` gives a `CallToolResult`: `content` (one text, the answer's JSON),
  `structuredContent`, `isError`. An input that doesn't fit, an unknown tool or a refusal is `isError` with words for the bot;
  it never throws. The engine checks `input` against the schema itself, so a host need not. `signal` ends a held call
  (`check_responses` with `wait`, with the `botToolRules` flag off: on, a bot under a host has no `wait`, below).
- `_meta['vb/change']` on a board write is `{ board, cards, head }`.
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

## Theme

Set any of three properties on the page's root, or none (`apps/board/plugin/theme.css`):

| Property | What it is | Without it |
|---|---|---|
| `--host-font` | The text face, a `font-family` list | The board's own |
| `--host-font-mono` | The face of code and numbers, a list | The board's own |
| `--host-text-scale` | The text size around the cards, a number | `1.25` |

Colours are not on the list: they are measured for contrast (D-009). **Light or dark follows the system; `data-theme="light"` or
`"dark"` on the page's root (`<html>`) forces one.** A `color-scheme` of yours doesn't move them, nor does `data-theme` on
`root`, so two boards in a page share one theme. Proven by `guest.spec.ts` "theme", `apps/board/tests/plugin-theme.test.ts`.

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
and may ignore, a new tool or chip kind, a new flag that is off until a host turns it on, new words.

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
   (`record(answers)`, § The chat), so nothing is lost and the seam stays small.
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
8. **The sheet still touches `:root`.** **Settled** (point 391D), until a host needs two boards with different themes: the tokens, whose lowered form makes `data-theme` work only there. `color-scheme` left it for the
   board's root (`apps/board/vite.plugin.config.ts` `hostKeepsColorScheme`), so a host's fields stay its own. Scoping the tokens to
   `.vb-board` too would let two boards differ, but it moves every token and risks the screenshots. Keep until a host minds.
9. **Types in the folder.** **Settled** (point 377): `plugin.d.ts`, generated at build (§ The types and the seam version).
10. **A seam version.** **Settled** (point 377): `seam` in the manifest, with the rule for moving it (§ The types and the seam version).
11. **The zoomed view stays a real modal**, inert page and all (PROOF_01). Non-modal means rebuilding its focus handling. **Settled** (D-080).

Open, from read-only (D-085 7), 2026-11-03, for the maintainer:

12. **The person's reason names Edit.** A refused press says standalone's words, "Read-only: press Edit to change it"
    (`#actions` `READ_ONLY_PERSON`), and a bot's refusal tells it the person can press Edit (`READ_ONLY`). A host has no
    Edit unless it draws one. Either a host-neutral sentence for both, or `readOnly` answering the reason the host gives.
13. **A bot's own file writes.** `readOnly` stops every write through the engine. A bot that writes pictures straight into
    `images/` (open point 1) is stopped only by the host's own file rules while the board is read-only.
14. **A lock of the host's own.** Standalone takes the ledger's lock on Edit, so two computers never write one ledger; the
    engine takes none. A host that lets two writers open one `dir` (a shared folder) keeps them apart itself, or asks for
    the lock in the seam.

## What nclite needs

Against nclite's draft contract v0.1 (`docs/plugins.md`) and its spike (`prototypes/plugin-host/`), read and run in a copy under
`temp/`; nothing was written in nclite. Run as it stands, the spike refuses the folder at `checkManifest`, naming the problems in
rows 1 and 2. With a throwaway manifest and engine shim it loads, and `mount` stops at the first thing its `createAppHost` lacks:
"Cannot read properties of undefined (reading 'status')", `host.chat`. Its CSP (`img-src 'self' data:`) already fits. Its Svelte
(5.56.1, in `app/node_modules`) was the second runtime in `guest.spec.ts` "a second Svelte", beside the bundle's 5.57.1.

| # | Gap | Why | Suggested change |
|---|---|---|---|
| 1 | Manifest: `icon`, `settings`, `data`, `view.dir`, `view.modules` required; `version` a whole number | The board has none of them, and a string `version` | Make those optional, `version` a string; add `engine: { module, export }` in place of the fixed `engine.ts` (`registry.ts`) |
| 2 | Tool input is a flat object of strings and booleans, with `required` (`checkTool`, `checkInput`) | `write_board` takes nested arrays; numbers elsewhere; `list_boards` has no `required` | Real JSON Schema. The engine checks input itself, so the host may only pass it |
| 3 | `route` and `tools[name]` are synchronous, with no caller and no signal | The board's are async, check the caller on every call, and `check_responses` holds | `route(req, { caller, signal })`, `tools.list()`, `tools.call(name, input, ctx)`; the caller from the run ticket |
| 4 | Tool result `{ ok, summary, ref }`; `resolve` `{ ok, where, text }`; `createEngine(dir)` | Shapes differ | MCP's `CallToolResult`, the chat's line from `_meta['vb/change']`; `{ where, text } \| { refused, reason }`; `createEngine({ dir, name, warn, flags })` |
| 5 | `addToChat` only adds | The selection and the answers come, change and go | `chat.attach(key, chip \| null)`, with a chip spent until its key's `ref` changes |
| 6 | Nothing lets a view send | Send to agent makes the host's chat send | `chat.send(record)` |
| 7 | Nothing says what the bot is doing | The board's working mark, Send's wait | `chat.status` |
| 8 | No link back to a chat line; `reveal` takes one thing | A changed card links to the line; a change chip zooms to several cards and selects none | Optional `chat.reveal`, `chat.hasLine`; `reveal` with `cards` |
| 9 | The spike's `api` answers the parsed body | The board's client reads status and problems | `api` resolves the `Response` |
| 10 | No `confirm`, no tone on `notify`, no `store`, no `imageRoute` | Four acts ask first; a refusal is `error`; the saved view; a picture loads by address | Add them, a per-bot `store`, and a route answering `engine.image` |
| 11 | `settings` from the manifest only; two types | The board reads flags by name and declares none | `settings.get` answers undefined for what isn't set, and nclite sets `appCards: false` |
| 12 | `unmount()` saves anything being written | The person decides whether half-written words are kept | The pane's Close calls `leave()`, then `unmount()` |
| 13 | "Framework-free view"; "every selector starts with its root class" | The board is Svelte inside, and its sheet selects `vb-node` and sets `:root` tokens | "Framework-free to the host: it only calls `mount`"; "every selector under the plugin's own prefix" |
| 14 | The pane's header is the host's; nothing about a plugin's own | The board draws its own header in `root`, under the pane's | Say so; Add to chat stays the pane's, by `pageChip`. A short pane works |
| 15 | One bot, no joins | The board's ledger names agents, and `request_grant` is for a person's board | Register the bot once at turn-on (`POST agents`), keep its id with the bot's plugin data; the grants strip is inside the board |
| 16 | `prefers-color-scheme` and the app's theme | Colours follow the system or `data-theme` on `<html>` | Set `data-theme` on `<html>` if the app has a theme switch |
| 17 | No `--host-*` | Fonts and text size | Set the three on the root, or leave them |

**How the tools should reach its bot (recommended, its choice).** One generic plugin pass-through in the existing container MCP
server: `tools/list` from the engine for the plugins on for this bot; `tools/call` becomes `POST /api/run/plugins/{id}/tools/{name}`
with the run token, and the engine runs `engine.tools.call` with the run ticket's bot. The same pattern as `webFetchTool`: the call
happens on the engine side, and the container learns no board code. It keeps one MCP server, one token, one ceiling and one approval
path, and one tool list here. A board-specific server would need a second copy of the list; a tool the host serves directly isn't
possible under `--strict-mcp-config`.

Not settled there: whether `NCLITE_TOOLS` covers plugin tools by name; how a tool's name is spelled (`${plugin}.${tool}` in the spike,
`mcp__nclite__<name>` for its own, and whether each CLI takes a `.`); the cap on a held run-door call against `check_responses`' 60 s;
whether a `writes: true` tool asks the person.

**Attachments there.** Its chat already uploads on submit and tells the bot the path, and the reader runs in its container: nothing
to add for the board.

### Where the board lives in nclite

Decided (point 377.1); open point 1 rests on it:

- **The whole board folder lives inside each bot's workspace**: `.visionboard`, with its ledger, its `images/` and its apps. That folder is the `dir` the host gives `createEngine`.
- **Each bot has its own board**: one engine and one `dir` per bot, and the bot's id (§ The bot) is kept with that bot.
- **A bot writes its pictures straight into the board's `images/` folder**, and `engine.image` reads them with its usual checks (§ The engine). There is no `put_image` tool.
- **Accepted for now**: the bot can reach the ledger file (`.visionboard/ledger.jsonl`) because it is in the bot's workspace. Splitting the ledger out of the bot's reach is a later option.
