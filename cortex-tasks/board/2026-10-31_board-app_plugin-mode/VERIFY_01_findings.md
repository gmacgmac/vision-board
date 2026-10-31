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

## Re-check after FIX_01

Checked at `85136aa`, against a folder rebuilt with `npm run build:plugin` and copied outside the repo. I re-read `plugin.md` as it stands, changed my host where it now says otherwise (selectors by role and label, since ids aren't part of the page; spent kept across a null), and read FIX_01's notes only after the runs. Scripts: `temp/verify-plugin/rc*.mjs`, `rerun/`; shots `shots/rc*`, `cmp6/`. The machine was at a load of about 50 for most of it, falling near the end, so no timing is judged here.

**Verdict: F1 and F2 are fixed. Of the 15: 11 fixed, F14 fixed but for one protected sentence, 3 partly (F4, F7, F15). 4 new, none blocking.** Standalone shows nothing beyond the faint corner pixels.

| Finding | Verdict | What I ran and saw |
|---|---|---|
| **F1** Reply outside `root` | **Fixed** | Panel `position: absolute`, a child of the root. At 1100 by 880, 800 by 600, 420 by 600, 640 by 260, 360 by 640 and 240 by 400 it is inside the root and the sampler finds nothing painted outside. Esc and ✕ close it, focus in the stage. Copy works. Unmount with it open leaves nothing; a new mount has it shut. At 180 by 220, the panel's box stays in but its Copy and ✕ run a few px over (2 sample points): a size no one uses, not worth a number |
| **F2** `unmount` throws | **Fixed** | 11 hosts: `settings.on`, `chat.status.on` or `events` returning nothing, null, 42 or an object; unsubscribes that throw; `chat.attach` throwing always or only at null; `store.set` throwing. Every one: `unmount` returns, `root` byte-identical to before with the host's own class and style, no listener left on window, document or the host, no dialog. What throws goes to the console. Then 13 open states, instrumented: all clean. The spec now says both `on`s return the unsubscribe. See F17 for what a dead mount does if the host keeps calling |
| **F3** repo commands | **Fixed** | No `npm run` or `node apps` in `words.json` or `view/board.js`. Reply says "Paste it into chat." A failed read says "Could not read the board." An empty folder says "No boards yet. Waiting for an agent to draw." Standalone keeps its own words (screens identical). Left, no command in them: "The board server is not reachable. Is it running?", and "...tell the person", an agent's wording, on a 404 or 500 with no problem body |
| **F4** no recovery | **Partly** | The recovery is fixed: for 500, 404, a rejection and HTML the board subscribes, says so over the stage and through `notify`, and on the next `events` draws and takes answers. It does not retry by itself, as the spec says. Two things left. (a) The raw words are only gone on the first read: with a 200 of HTML, the *next* `events` notifies "TypeError: Cannot read properties of undefined (reading 'map')". FIX_01's note says no raw `TypeError`. (b) Every `events` while it stays down is another `notify` (1, 2, 3 in my run), so a chatty stream floods a host's notices. Non-blocking |
| **F5** `chat.send` rejects | **Fixed** | A rejection and a sync throw both: "Not sent · try again", tooltip "The chat could not send this.", back to idle after 6 s, and Send works again. `view.send()` answers the words. The cause goes to the console |
| **F6** focus falls out | **Fixed** | H on a focused answered card, H again, Reply by Esc and by ✕, a removed card: focus in the stage, the next key acts. 15 flows from a fresh page, all fine. **It takes nothing from a host:** focus stayed in a host input, a host textarea or on `body` through a bot's write, `reveal` of cards or of a missing card, a change of `align`, a pane resize and a status change. A note being typed keeps focus and words through a bot's write. Not exercised: a bot's `retire` of the focused card, as my calls had the wrong shape |
| **F7** `reveal` | **Partly** | With focus in a host input: `n` not there, `seq` not there, `n` on another board, and `n` of a hidden or removed card all `notify` ("No card 999", "That note is no longer on the board.", "Card 2 is hidden with the answered cards (H shows them)", "Card 4 was removed") and take no focus. Left: **`reveal({ cards: [2] })` with card 2 hidden says nothing**, though the spec says "a card hidden or removed: says so". Non-blocking |
| **F8** bare ids | **Fixed** | 81 ids in the root, every one `vb1-`, with menus and a note open too. With a host holding `board`, `send`, `stage`, `reply`, `arrow` and others: no duplicate, no `for` or `aria-*` reaching the host, the host's elements untouched |
| **F9** element rules | **Fixed** | Same DOM, every property of all 1102 elements, with and without a much louder sheet (`page/loud.css`, bare rules on everything the spec names). Beyond the root's own box, which is the host's, only `fill`, `stroke` and `box-sizing` move, and what follows from them (a container's rail opens, bisected to `*`). Pixels: quiet against a utility-reset sheet (`page/preflight.css`) identical on 12 of 21 screens. Six differ only by the host's own page outside the root. Three (note, info, rail; 3 to 51 pixels) differ at spots where the old folder's run also differs from this quiet run, so [INFERENCE] that run's focus or hover moment; not proven. The cases I reported (blank icons, 30 px orange text, the shrunk picture) are gone. `svg { width; height }` does size the wires' svg to 61 px, which the spec states; the connectors still draw. New: F16, F18 |
| **F10** window caps | **Fixed** | `.vb-access` is 160 of 400 at 240 by 400 and stays in at 180 by 220. § Size and § Modals now agree that a dialog is drawn over the window. `.vb-tip` caps by the root in the sheet; I couldn't raise a tip in a narrow pane, so that one is read, not seen |
| **F11** access strip | **Fixed** | At 480 down to 280: stacked, Allow and Refuse both inside, both hit-tested, nothing over the reason. Refuse opens its form inside at 320. At 240 by 400 and 180 by 220 the strip scrolls to reach them, with 17 px sideways at 180 |
| **F12** no agent id | **Fixed** | `{ by: 'agent' }`, empty, null, 7 and a bogus `by` all refused, by `tools.call` and by `route` (401). No agentless line in the ledger. A good id still writes |
| **F13** spec gaps | **Fixed** | A to H are all stated, and I ran A (null), B (403), C (400, no stack), D, E. Following E, a re-selected card stays spent and another card gets a chip. One more gap in F18 |
| **F14** claims | **Fixed, one sentence open** | `plugin.md` agrees with the running board bar F7's `cards`. `color-scheme`: see below. `docs/principles.md` (protected, untouched) still says it "sets every property it relies on", wider than `plugin.md`'s narrowed sentence: for the maintainer |
| **F15** small | **Partly** | The `app` item and `.visionboard` are gone from `tools.list()` and the manifest. `keepView`'s words are right. The two `vb-region-note-block` observers are **not** fixed: 2 still undisconnected per mount (FIX_01 left them on purpose, as they watch detached nodes). Bundle comments left, not a fault |

### What the fixes could have broken

- **The id prefix.** Fine. Two mounts at once: `vb1-` and `vb2-`, 81 ids each, no duplicate, every `for`, `aria-*` and `url(#...)` inside its own root, on the same board and on different ones. Two notes open keep their own words; Reply in one stays in it, focus too. Unmount `vb1`: `vb2`'s arrowheads hold. A new mount takes `vb1`, a third `vb3`; after all go, `vb1` again. Arrowheads resolve (`url(#vb1-arrow)`, right colour), and the sheet's id selectors match through `[id$=-board]`. Standalone's first mount keeps `#send`, `#board`, `#toolbar-menu`, which my comparison scripts select by.
- **`root.css` under a loud sheet.** Holds, as in F9. Rich Markdown (bold, lists, callout, label, code block, picture) draws the same under a quiet host on the old folder (`db5e4c5`) and the new. New: F16, F18.
- **`color-scheme` off the sheet.** Right in all 28 mixes of system light or dark, with `data-theme` light, dark or `ocean` on `<html>`, on `body`, the pane or the root, and a host's own `color-scheme`. The board follows the system or `<html>`'s `data-theme` and nothing else; the root's `color-scheme` matches, so a dialog's fields are dark in dark; the host's `<html>` stays `normal` and its fields stay its own. Old folder against new, dark, on the screens clipped to the root: identical bar the moved Reply panel and 2 to 5 stray pixels on two. The change a person would see is the wanted one: under a dark system a host's default controls stay light.
- **Focus kept in the stage.** Takes nothing from a host (F6 above). No ring on the stage: `outline: none`, on a host and standalone. A person cannot see where focus went, as with a click on the stage before.

### Standalone against `c220b78`

The same 64 screens by the same scripts, against the first pass's shots in `temp/verify-plugin/cmp*/before/` (the `temp/verify-before` checkout was removed then, so that side was not re-run): **51 identical, 13 differing by 1 to 18 pixels**, at most 50 of 765 in summed colour, on rounded corners and borders, many at the very spots as before. Tooltips, ⋯ text, storage keys, hash, chips, chat status and the five prompts: identical, the one exception being a version's time in a closed list.

**One difference beyond those:** after H with focus on an answered card, `document.activeElement` is the stage, not `body` (F6's fix, in shared code). No pixel moves and keys act from both. It is the only behavioural difference I found, and I'd keep it.

A rich Markdown card was not compared against `c220b78` itself: only old folder against new, as above. `chat-send`, `board-chrome`, `board-guest` and `header-tiers` pass.

### New findings

**F16. `svg { fill: currentColor }` fills the header's icons (non-blocking).** Steps: a host rule, bare, on `svg`, on a quiet board (`shots/rc10-rule-fill.png`). Happened: the robot and Send icons turn to solid shapes, the chevrons too, and connectors' arrowheads take `fill` or `stroke` (9 elements). Cards' icons hold. Should: `root.css` takes back `fill` and `stroke`, or `plugin.md` § Styles names it: its list has "an svg's inner shapes", not a rule on `svg` itself.

**F17. A dead mount still answers a host that keeps calling (non-blocking).** Steps: a host whose `events` or `chat.status.on` returns nothing, which `unmount` now passes over; unmount; then call what it was given. Happened: `events` makes the dead board call `api ledger` each time. `status`, once an answer is unsent, **puts the answers chip back in the host's chat** after `unmount` took it, and a next message would carry it. With proper unsubscribes neither happens. Should: a stopped mount ignores both. `apps/board/src/board/chat-side.ts` `hear`, and `boards.ts`.

**F18. § Styles leaves out two kinds of rule, and `ref` compares by value (non-blocking, spec).** Steps: `body span { color: red; font-size: 24px }`, `main div { line-height: 3 }` (`shots/rc10-rule-two-element.png`); `*, *::before { box-sizing: content-box }`. Happened: two element names tie `root.css` (0,0,2) and a later host sheet wins: red text and a broken card footer. The universal rule opens a container's rail and makes it 30 px taller. `* { margin: 0; padding: 0; border: 0; font: inherit }` is harmless. Should: "What doesn't hold" names both. Also, "spent until its key's `ref` changes" should say by value: comparing the objects, as I first did, makes a spent chip live again.

**F19. `host-styles.spec.ts` gallery, dark, target 190, a mini board (non-blocking, not FIX_01's).** Differs by 3 against `RASTER` 2: 3 of 3 at `85136aa` and 1 of 2 on an export of `db5e4c5`, under this load. FIX_01 names it too. It will trouble the set gate unless judged on a quiet machine, or the limit moves.

### Compared with FIX_01's notes, read last

- We agree on F1, F2, F5, F6, F8, F9, F10, F11, F12, F13.
- **F4:** its "no raw `TypeError`" and "notifies once" don't hold past the first read (above).
- **F7:** its row is about `n` and `seq`; the spec's sentence also covers `cards`, which says nothing for a hidden card.
- **F2:** it found what I missed: `unmount` during the first read left a subscription, and I had called that safe, having looked only at `root`. Now, by my own run, a first read landing or failing after `unmount` subscribes nothing, leaves `root` empty and gives no notice.
- Its `test:timing` failures match mine (2, then 4 or more, a different set), and I judge neither.

### Test runs

`test:plugin` 71 passed. `npm test` unit half 2187 of 2187; `test:timing` not judged. `verify` (30 warnings), `gen-api --check`, `check` clean. Page specs `board-guest`, `host-styles`, `board-chrome`, `header-tiers`, `chat-send`: 50 passed, 1 failed (F19). Not the full page suite. Not checked, as before: real CLI, other browsers, touch, screen reader, axe, another origin or a frame, nclite. No LOG line and no row: this pass writes only here and in `temp/verify-plugin/`.
