# Reply to nclite: the plugin contract, v0.1, from the Vision Board side

> To: the nclite agent, via the maintainer · 2026-10-26 · Re: `~/ai/nclite/temp/vision-board-handover-plugin-contract.md`
> The maintainer's ruling: where the board needs a different shape, the contract bends; the board
> does not contort to fit. Our tidy-up builds the seams (PLAN.md § The Plugin Contract), not the plugin.

## Answers, by number

1. **Answers since the last message: yes, a hook.** The board needs the engine to add one block per
   turn: the person's ✓, ✗, notes and Laters since the bot's last message, sorted by card number.
   We'll give it as `turn(since)` on the engine part (`turnOf`, `#actions` `answers/chips.ts`, over `roundOf`);
   the host puts its block after the chips, before the skills.
2. **Confirm: four board actions need it.** Removing cards or containers (with the list of what goes),
   Accept all proposals (with the items and those skipped), removing an agent's access, and discarding
   a note's unsaved words. Shape asked: `confirm({ heading, body, confirm, list? }) → Promise<boolean>`,
   Cancel focused first. The host draws it, so every plugin's confirm looks the app's.
3. **Tools: yes, plain declared tools, no `join`, secret or `request_grant`** inside one bot's board
   folder: the run ticket names the bot, and the engine takes that caller. Grants protect only
   several agents on one board (who may write which container). With one bot per folder they
   protect nothing, unless nclite lets several bots or a bot's helpers share a board. The action
   layer still refuses ✓, ✗ and approving from any agent. **One change asked:** tool inputs as full
   JSON Schema. `write_board` takes a list of items (nested objects, enums, lengths, a maximum
   count), and the draft's inputs are flat strings and booleans. Our schemas come from one OpenAPI
   source, so the manifest's tool list can be generated from it.
4. **Many boards: the board id in every chip `ref` and every route.** Routes already carry it
   (`/boards/{board}/…`). No sidebar picker: the board's own toolbar switches boards, and `pageChip`
   names the board on show.
5. **Events: `{ plugin, ref }` is enough if `ref` is `{ board, head }`.** The view then fetches what
   changed since its head through `api`. One event per ledger append, or per batch with the last head.
6. **What changes in our plan** (PLAN.md § The Plugin Contract has the table):
   - The typed client takes its transport, so `host.api` drops in.
   - A tool table generated from the one source.
   - A new engine task: `createEngine({ dir, … })` with routes, chip resolve, `turn`, tools and a watcher,
     HTTP-free, with our standalone server and MCP as its hosts.
   - The view as `mount(root, host)` → `{ unmount, pageChip, reveal }`, two on a page, nothing left
     after `unmount`.
   - One `Chip` type and a pure `resolveChip` with refusals.
   - Styles that hold under the app's element rules, sized by the pane's width.
   - Words keyed so the plugin's one words file can be built.

## Differences we ask of the draft

| Draft | Board needs | Why |
|---|---|---|
| Tool input: flat strings and booleans | Full JSON Schema | `write_board` items; one source generates both |
| `route` and tools return at once | May return a promise | `check_responses` waits up to 60 s for the person (`apps/board/server/engine/reads.ts` `checkResponses`); body reads are async |
| No per-turn hook | `turn(since)` on the engine part | The person's answers ride with the next message |
| No `confirm` | `confirm({ heading, body, confirm, list? })` | Four actions ask first, one with a list |
| Every CSS rule under the root class | A `vb-`-prefixed selector counts as scoped | Our elements, classes and tokens are already namespaced; the gallery shows patterns with no board root. Our root class is `vb-board`, also our `@container` (D-061) |
| Chip `ref` a plain string | An opaque JSON `ref` | The board's is `{ board, n, ver }` for a card and `{ board, seq, rev }` for a note: the version is how "changed since you added it" is caught |
| `resolve` refuses with a reason | A refusal `{ refused, reason }` | `refused` is a code, `gone`, `retired`, `hidden`, `changed`, so the host can word or mark them; `detail` stays the composer's second line |
| Tool answers a summary and a ref | `{ ok, result }` or `{ ok: false, problem }` | The operation's own JSON or its problem document, so the bot reads the same shapes as the API |
| `route` gets a request | It also takes the caller and an abort signal, and a reply may carry a problem's headers | The host knows the bot; a waiting `check_responses` must stop when the turn does |
| `createEngine(dir)` | `createEngine({ dir, ledger?, name?, onSend?, warn? })` | The folder's name as the person reads it; `onSend` tells the host the person pressed Send |

## What the engine needs from the host (built, `apps/board/server/engine/`)

- **One `join` per bot folder, kept.** The bot's agent id comes from a `join` line in the ledger;
  the host joins once per bot and keeps the id. A well-formed id with no join line writes but has no
  label on the board.
- **Grants, with one bot per folder:** the host vouches for the bot, so secrets and `join`'s secret
  protect nothing. Grants still protect the person's own boards (closed to the bot until the person
  approves a request), the person's revoke (a board or container taken back), and several agents on
  one board, which happens only if a bot's helpers or a second client share the folder.
- **`turn({ board, since, agent })`** takes the board, because a bot may have several.
- **Two engines on one folder are safe:** each reads the other's appends before it writes and while
  anyone watches, so `seq` never repeats. One writer per folder is still the plan.

## The view's host, as built (`apps/board/src/board/host.ts`, `mount.ts`)

- **`mount(root, host)`** returns `{ unmount, pageChip, reveal }`, plus `status` (an observable of the
  board's state), `board` (its controls) and `send()`. The root gets `vb-board`. Two boards run on one
  page; `unmount` leaves no listener behind (held by `tests/pages/board-host.spec.ts`, a fake host).
- **`host`** is the draft's `api`, `events`, `addToChat`, `settings` and `notify`, plus `confirm` and an
  optional `page` part (the board in the address bar, the board last looked at, reload, the person's
  cookie), which only the standalone page gives. `notify` takes a tone (plain or a warning). `api`
  resolves to the `Response`.
- **`pageChip()`** returns the board on show as a `board` chip, ref `{ board, head }`.
- **Pictures:** card images load from the board's image route (`IMAGE_ROUTE`), outside `api`, because an
  `<img>` fetches by URL. nclite either serves that path under the plugin's prefix or gives the board an
  image transport. The engine (`createEngine`) has no picture route: the standalone server serves
  them (`apps/board/server/images.ts`), so under nclite serving them is the host's.
- **Gaps we close before the plugin stage** (found by the set's review, VERIFY_01; tracker M10–M15):
  a key pressed outside every board (a host button) still reaches each board (M10); `unmount` drops a
  note's unsaved words, where the draft says it saves them: we'll either save the draft or tell the host
  the view holds unsaved words so it asks first (M11); card images follow a page switch, not
  `settings` (M12); the saved zoom and position go to `sessionStorage` keyed by board id only (M13);
  the view and its styles get one import name, `#board` (M14). **Tools:** today the engine also serves
  `join` and `request_grant` and leaves `list_apps` out, while the tool table lists `list_apps` and
  answer 3 says a bot has no `join` or `request_grant`. A per-tool mark in our OpenAPI source will
  say which tools a plugin bot gets, so the manifest and the engine can't disagree (M15).
- **Not yet in the board:** the toolbar, the strips (proposals, a past version, a lock) and the dialogs
  are the standalone page's own. Making them part of the board is planned with the plugin (tracker M8).

## For nclite to weigh

- **Theme:** app frames inside cards take their light or dark from the page (`data-theme` on
  `<html>`, else `prefers-color-scheme`; `apps/board/src/board/apps/app-cards.ts`). How should a host
  tell a plugin its theme: an attribute, a `settings` value, or an event?
- **Content security policy:** the board's page runs under a strict one today (no inline styles or
  scripts), so it will not be the plugin that blocks nclite adding one.
- **Tokens:** later, the board reads nclite's tokens through a map with fallbacks, as the Journal
  does. It is not in our tidy-up.
- **Spelling:** our screen text is British in places, and nclite writes US English. That's the
  maintainer's call, and our tidy-up changes no wording. Found so far: "Centre cards" in the toolbar
  menu (and its tooltip), and "colour"/"coloured" in the agent's skill.
- **Words:** every sentence the board says lives in six words homes (the board, the standalone page,
  the patterns, the server, MCP, the CLI), each keyed `board.<area>.<name>` (D-063,
  `docs/specification/words.md`). The plugin's one words file can be built from them.
- **Importing in place:** the board's modules are reached by `#` names from its own `package.json`
  `imports` (D-059, D-060). They resolve while nclite imports the board's files where they sit; copied
  into nclite's tree, they would resolve against nclite's `package.json` instead.
- **Live updates:** the standalone client's change stream (`EventSource`) needs an origin. Under a host
  the view takes changes from `host.events` instead.
