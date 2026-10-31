# VERIFY_01 findings

> **Task**: [VERIFY_01_plugin-verification.md](./VERIFY_01_plugin-verification.md) · checked at `db5e4c5`, 2026-10-31.
> Nothing is fixed here. Scripts and screenshots: `temp/verify-plugin/` (git-ignored; `shots/`, `cmp*/`).

## In short

- **A host gets a whole, working board.** A host written blind from `plugin.md` and the built folder (a copy outside the repo, no `node_modules` near it) drew on the first try, with a strict CSP and no console errors: cards answered, Send, chips, search, dialogs, menus, grants, lock, archive, versions, two boards, a page with no chat, unmount and mount again.
- **Two things stop a clean yes (blocking):** the Reply panel is fixed to the window, outside `root` (F1); and `unmount` throws and leaves the board behind if a host's `on` returns nothing, which the spec never says it must not (F2).
- **Standalone is the same as before.** Against `c220b78`: 64 screenshots across four scenarios, 51 pixel-identical, 13 differing by 1 to 18 faint pixels on rounded corners. The fake agent got byte-identical prompts. No difference a person would notice.
- Counts: **2 blocking, 15 non-blocking.**

## Blocking

### F1. The Reply panel is outside `root`, stuck to the window

- **Steps:** host with a pane of 1083 by 860 at the page's left and a chat beside it. Answer a card; ⋯ → Reply. Narrow the pane to 420 for the clearer view (`shots/s8-420x600-reply.png`).
- **Happened:** `aside.vb-reply` is `position: fixed`, 420 wide, at x 968 to 1388 of a root ending at 1083 (`shots/s5-reply.png`). In the 420 pane it is about 650 px right of the board, on the host's own page. The sampler found the board painting outside `root` at every pane size.
- **Should:** plugin.md § A guest, **Size**: "What opens stays inside the root, by the root's size and not the window's." The other menus and panels do.
- **Where:** `apps/board/src/styles/board.css` `.vb-reply` (`position: fixed`, `min(420px, 92vw)`). `short-pane.spec.ts` doesn't open Reply.

### F2. A host's `on` that returns nothing: `unmount` throws and the board stays

- **Steps:** give `settings: { get, on() {} }`, or `chat.status.on = () => {}`. Mount, then `view.unmount()`.
- **Happened:** "e is not a function". `root` keeps 37 children and `vb-board`, and the teardown stops there. `events` returning nothing is fine.
- **Should:** the spec says `events` "returns the unsubscribe", and says nothing of the kind for `settings.on` or `chat.status.on` (§ What the host gives, § The chat); only the no-chat example shows it for the second. A host following the page's words gets a board that survives `unmount`.
- **Where:** `apps/board/src/board/controller.ts` `unsettle`, `apps/board/src/board/chat-side.ts` `stops`. Fix the spec's two lines at least; better, a teardown that finishes whatever one step does.

## Non-blocking: the board under a host

### F3. A person in a host is told to run this repo's commands

- **Steps:** (a) ⋯ → Reply. (b) Have `api` fail on the first read.
- **Happened:** (a) "Paste it into chat, or let the agent run `node apps/board/bin/reply.ts <board>`." (b) "Could not reach the board server. Start it with: npm run board". Neither exists for that person. (`board.reply.nodeAppsBoardBinReply`, `board.boards.couldNotReachTheBoard`, `board.boards.npmRunBoardServesYour` in `words.json`.)
- **Should:** words a host's person can act on, or nothing. The plugin's skill and tool words were already cut this way (`plugin/words/skill-edits.ts`); the view's words weren't.
- **Where:** `apps/board/src/board/words/reply.ts`, `words/boards.ts`, shown by `chrome/ReplyPanel.svelte`, `boards/boards.ts`.

### F4. One failed first read and the board never recovers

- **Steps:** `api` answers 500, 404, a rejection or HTML to the first `ledger` call, then works again; say `events` `{ ref: {} }`.
- **Happened:** one `api` call, `events` never subscribed (`subs: 0`), message stays, 0 cards, still 0 after 7 s. Only a new mount helps. For HTML the notice is raw: "TypeError: Cannot read properties of undefined (reading 'map')". (`shots/s24-api-500.png`)
- **Should:** subscribe anyway, and catch up on the next `events`, as § What the host gives says of a `ref` with no head. An engine still starting when the pane opens is ordinary for a host. Same code in standalone, where a reload is the cure; a host has no reload.
- **Where:** `apps/board/src/board/boards/boards.ts` (the `couldNotReachTheBoard` path).

### F5. A `chat.send` that rejects leaves Send on "Sending…" for good

- **Steps:** `chat.send = async () => { throw new Error('x'); }`; press Send.
- **Happened:** "Sending…", disabled, still so after 5 s; an unhandled rejection; nothing said. Only a new mount clears it. (A send that answers words works: "Not sent · try again", with the words as the tooltip, for 6 s.)
- **Should:** the spec has it resolve, so the host is at fault, but a naive `fetch` failing does exactly this. Treat a rejection as the error state.
- **Where:** `apps/board/src/board/chrome/SendButton.svelte` `click`.

### F6. Two ways focus falls out of `root`, and every key stops

- **Steps:** (a) focus an answered card, press H. (b) ⋯ → Reply, Esc. Then press H, J or `=`.
- **Happened:** focus goes to `body`; a key there is not in the root, so the board ignores it until the next click. Standalone keeps working from `body` (same before and after, `cmp4-*.txt`), so this one bites only under a host. The other 18 flows tried keep focus in the root.
- **Should:** focus lands in the stage, as `sender` and the card moves already do when it would fall to `body`.

### F7. `reveal` of a missing card or note doesn't use `notify`

- **Steps:** `view.reveal({ n: 999 })`, `reveal({ seq: 99999 })`, `reveal({ cards: [996] })`.
- **Happened:** `cards` notifies. `n` opens the board's go-to field, says "No card 999" there and **takes focus** from wherever it was, the host's chat included. `seq` does nothing and says nothing.
- **Should:** plugin.md: "Not on the board: says so through `notify`." One side has to move. A reveal taking focus into a field is the part I'd change.

### F8. The board's ids are bare words, and clash with a host's

- **Steps:** a host with `id="board"`, `"reply"`, `"send"`, `"title"`, `"stage"` before the root; mount.
- **Happened:** 11 duplicate ids. `<label for="board">` and `for="version"` point at the host's elements, and `aria-controls="reply"` too. The controls still work. `mount-ids.ts` `takeIdPrefix` prefixes only the second mount.
- **Should:** `vb-` names (project rules § Board invariants: "neutral names"), or at least a line in the spec. The spec's "no id twice" holds only among mounts.

### F9. A host's element rules do reach in, despite "the board stands"

- **Steps:** host CSS, no `!important`: `span { color: orange; font-size: 30px }`, `svg { display: none }`, `img { max-width: 5px; border: 8px solid red }`, `div { line-height: 3; letter-spacing: 2px }` (`shots/s17-hostile.png`).
- **Happened:** the header title, the counts and "Open" go orange and 30 px; **every icon button on every card goes blank**, as `svg` isn't set; the picture shrinks; `div`'s spacing is inherited by the text.
- **Should:** plugin.md § Styles says "it sets every property it relies on", and `docs/principles.md` § The board is a plugin says the same. Rules on `button`, `input`, `select`, headings and `dialog` did not move it. `tests/plugin/fake-host/host.css` has no rule on `span`, `svg` or `img`, so `guest.spec.ts` doesn't see this. A rule like `svg { width: 1em }` is common in real apps. Set them, or narrow the sentence.

### F10. Window-sized caps left in what opens

- **Steps:** a request for access in a pane of 240 by 400, then 180 by 220 (window 1500 by 950).
- **Happened:** `.vb-access`'s `max-height: 40vh` is 380 px whatever the pane: 267 of the 308 px stage at 240 by 400, and past the root's bottom at 180 by 220. Also by the window: `.vb-tip` (`80vw`), `.vb-archived-list` (`48vh`), `.vb-dialog` (`92vw`). And the board's dialogs centre on the window, at up to 480 wide, over the host (`shots/s8-420x600-new-board.png`).
- **Should:** § Size says by the root. § Modals explains the modal; the two sentences need to agree that a dialog is the exception.
- **Where:** `apps/board/src/styles/access.css`, `archived-dialog.css`, `packages/ui/src/tip/tip.css`, `packages/ui/src/base/dialog.css`.

### F11. The access strip breaks in a narrow pane

- **Steps:** a request for access; pane widths 640 down to 280.
- **Happened:** at 360 and 320, Allow sits on top of the reason's last line and Refuse runs a few px past the root (`shots/s27-360.png`). At 280 both are cut. I didn't check a standalone window this narrow; the strip is the same code.
- **Should:** the strip stacks, as the header does, by the root's width.

## Non-blocking: the engine

### F12. `{ by: 'agent' }` with no id writes

- **Steps:** `tools.call('write_board', { board: 'u', items: [{ type: 'board', key: 'x', title: 'U' }] }, { caller: { by: 'agent' } })`. A host's lost or unset id does this.
- **Happened:** `ok: true`, a ledger line with `by: agent` and no agent. Its next `region` fails `needs-grant`: "the person made it". No `caller` at all refuses properly ("This needs an agent"), and an unknown id is refused too.
- **Should:** refuse like no caller.
- **Where:** `apps/board/server/engine/writes.ts` (the agent's id from `caller`).

## Non-blocking: where the spec failed me, writing the host blind

### F13. Things `plugin.md` left me to guess (each cost one try)

Steps for all: follow the page, as I did. **Should:** a line each.

- **A.** `route`'s `path`: "`path` as `api` got it" reads as `ledger?after=0`, which answers null, and the board says it can't reach the server. It must be split: `path` `ledger`, `query` the rest. Say so.
- **B.** Registering the bot: the page shows `route({ method: 'POST', path: 'agents', body })` with no second argument, beside "`{ by: 'person' }` for your person's door". Through that door it answers 403, "Only an agent can do this". Say it takes no caller, and not through the person's door.
- **C.** What to do with `route`'s `body`: it never says "send as JSON" or what an empty one means. `JSON.stringify` worked everywhere I went. A `body` function that throws, a malformed request, comes back 500 with a stack on stderr; 400 fits.
- **D.** How a card names a picture: `![pic](pic.png)`, relative to `<dir>/images`. I wrote `images/pic.png` first, and got a missing picture and a 404. Open point 1 covers the bot; a host putting files there needs this line.
- **E.** "Spent until its key's `ref` changes": does `attach(key, null)` end it? My host cleared it, so re-selecting the same card gives a live chip; `tests/plugin/fake-host/chat.js` keeps it, so that chip stays spent. Both pass. They differ for a person.
- **F.** `staged`: "Given at all it has the full say". With the no-chat `staged: false` an answer still enables Send (rightly). Say it has the say over chips, not over answers.
- **G.** "The id lives in `dir`, so don't register again": only its hash does; the engine can't give the id back. The host must keep it.
- **H.** A chip's `detail`, which a host is told to draw, reads `Board "pricing"`: the id, not the title.

## Non-blocking: the doc audit (`cortex-docs`)

Clean: every path and symbol I followed in `plugin.md` exists, `spec-truth.test.ts` passes, `npm run verify` and `gen-api --check` are clean, no stale `BoardSide`, `boardChromeInMount`, `setMarkdownSvg` or `shell/header-tier` outside history (`chat.md`'s `boardSend` and `components.md`'s `shell/kept.ts` are real). `tools.list()` equals the manifest's `tools`. Svelte 5.57.1 and nclite's 5.56.1 as stated.

### F14. Claims the running board contradicts

The spec sentences in F1, F7, F9 and F10, and the missing return in F2. Beside them: `docs/principles.md` § The board is a plugin says its styles "reach nothing outside it", while the sheet sets `color-scheme: light dark` on `:root`, so my host's own default `<input>` and buttons went dark with the board (`shots/s24-dark-font.png`). `plugin.md` states this and Open point 8 keeps it. The principle is protected: for the maintainer to reword or to reopen point 8.

### F15. Small: words and notes left over

- `write_board`'s input still has the `app` item, with "The app's folder name in `.visionboard/apps/`", for a bot with no apps (`tools.list()`, manifest). Harmless, since `appCards` is off, but the one place the plugin's bot is told of that folder.
- `flags.ts` `keepView` still says sessionStorage: true of standalone's store only.
- Two `vb-region-note-block` `ResizeObserver`s (one per container, `packages/ui/src/region/region-note.ts`) are never disconnected at `unmount`. They watch detached nodes and don't fire on a root resize. After 83 mounts: nodes and listeners flat, the heap settling at about 2 KB a mount. No real leak; "removes every listener" is true of listeners.
- Bundle comments: `view/board.js` keeps 237 `//#region` lines and its indentation, about 46 KB, which gzip mostly hides. Not a fault.

## What held

| Checked | Result |
|---|---|
| The blind host, every hook | `api`, `events`, `chat`, `settings`, `notify`, `confirm`, `store`, `imageRoute`; `unmount`, `unsaved`, `leave`, `pageChip`, `reveal`, `status`, `send`, working as the page says bar the above. `cardImages` off, `align` by `settings.on` |
| The folder | Six parts as listed. A copy outside the repo runs. Two builds, and `--out` elsewhere, byte-identical. Imports: `node:crypto`, `node:fs`, `node:path` only; no chunk, no `@import`, no `url()`. No personal path (only `/Users/example` in schema text) |
| The engine | Runs under Node's permission model with only the folder and `dir`. Exits by itself. Bot's ✓ refused 403. Image route refuses `..`, encoded `..`, absolute, backslash, NUL, symlink out; 304; svg policy header; script-only svg 415. `signal` ends a held `check_responses` in 200 ms. Two engines on one `dir` both hear `watch` |
| Keys | From a host's input, a host's button or `body`: nothing acts. In the root: `preventDefault`ed. A modal's Esc doesn't reach the host |
| Reach | While mounted, `<html>`, `<body>` and the host's elements gained no attribute, child, style, title or hash in any flow tried. Outside click closes a menu. A pan or lasso released over a host's button doesn't click it, and doesn't swallow the next click. Ctrl-wheel is taken only on the board |
| `unmount` | From 14 open states (menu, zoom, tip, popover, note with words, dialog, zoomed picture, find, key help, Reply, mid-drag, mid-lasso, selection, plain): no listener on window, document or the host; no stream; chips taken back; `root` byte-identical with the host's own class and style. Twice is safe. Mid-load is safe. 83 mounts flat |
| Narrow panes | Header takes its forms by the root's width at 1100, 640, 560, 420, 360, 240, 180; everything reachable through ⋯. Menus, note, find, key help, tips inside at all sizes bar the above |
| Two boards | Different boards, own chips and state, no id twice among them, one unmounted without hurting the other |
| No chat | The page's three lines work: answer, Send records, no errors |
| First paint | 200 cards: `mount` 9 ms, first card about 105 ms, painted about 150 ms (headless, local) |
| Sizes | `view/board.js` 557 KB (164 KB gzip), `view/board.css` 112 KB (19 KB), `engine/engine.js` 907 KB (209 KB); a page loads the first two |
| Test suites | `test:plugin` 51 passed; `npm test` 2187 and 14 passed; `verify`, `gen-api --check`, `check` clean |

### Standalone against `c220b78`

Each checkout's own build and server (`startTestBoard`, which `npm run board` shares, since the fake CLI needs it), same-named empty folders, same steps, pixel-compared. Threshold 12 of 765 per pixel.

| Scenario | Screens | Result |
|---|---|---|
| Header full, half, third, each with the chat open; ⋯; zoom; keys; help; find; dialogs; Reply; note; flag; Later; reload; dark | 24 | 13 identical, 11 differing by 1 to 18 stray pixels, none in a place a person reads. Records (tooltips, ⋯ text, focus, storage keys, hash) identical |
| Chat on a board: chips, words, change chip zoom, ✓, Send, hang, Queued, Allow once, Deny, Stop, attachment, reload, 800 and 530 | 19 | 17 identical, 2 differing by 1 or 2 pixels |
| Chat from an empty folder: first board opens, answers chip, Send round, note and selection, rewrite, change chip, held Send released | 13 | All identical. Five prompts byte-identical |
| Keys from `body`, hidden focus, T, typing in the composer | text | Identical |
| Picture zoomed, lasso, Move to, container menu, hover tip, gallery | 8 | All identical |

The stray pixels: single pixels on rounded corners and borders, at most 18 on a screen and at most 50 of 765 in summed colour difference. Some recur at the same spot, so they may be raster differences from the controls' new place in the DOM rather than pure noise. I can't see them at full size. The same number of 404s on both sides in the last scenario (not chased; the same on both).

## Not checked

- A real CLI, real Kiro: excluded here; the live look is the orchestrator's.
- The full page suite: the orchestrator's, after this.
- Only Chromium (headless shell): no Firefox, WebKit, touch or phone. No screen reader; no axe run on the host.
- A host's routes on another origin, a page in a frame (plugin.md § Not covered).
- nclite itself. `~/ai/nclite` was read only for its Svelte version.
- `skill.md`'s scenarios on a real model: read for leftovers only (no `join`, secret, `list_apps`, attachment, `.visionboard`, `npm`).
- `isolation: isolate` against a host's layers.
- Comparing a standalone window under 530 wide against before.
