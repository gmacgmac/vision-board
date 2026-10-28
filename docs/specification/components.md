---
category: project-docs
type: specification
status: active
created: 2026-10-04
scope: How a board UI pattern is built — core, template, element, styles and the node-type registry
---

# Component pattern

The model is `docs/principles.md` § Component model. The decisions are D-005, D-015 and D-016,
and rule 16. This page says how each layer is built, so every pattern (`<vb-node>`,
`<vb-region>`, later `<vb-link>` and the overlays) is built the same way.

## One folder per pattern

```
packages/ui/src/<pattern>/
  <pattern>-core.ts       states and rules, no DOM; unit-tested under plain Node
  <pattern>-template.ts   one pure function from data to markup; unit-tested under plain Node
  vb-<pattern>.ts         the element: renders from the template, updates in place (browser)
  <pattern>.css           the pattern's styles, tokens only (`var(--vb-*)`)
  pattern.json            what the pattern is (name, tag, states, attributes, events, a11y)
```

The page (`apps/board/`) creates elements, places them and listens to them. It never builds a
pattern's markup or styles it.

## The node-type registry (D-015)

- **One registry, in `packages/format`** (`node-types.ts`, `NODE_TYPES: Record<Kind, NodeType>`),
  because three layers read it: the action layer refuses an action the type doesn't offer, the
  layout engine will read outlines and ports, and the UI draws it. `format` is the only layer all
  three may import (D-016).
- A `NodeType` holds what is true of the type everywhere: `label`, `answer` (the kind asks for an
  answer: question, decision, action) and `actions` (`ANSWER_ACTIONS` or `NOTE_ACTIONS`, api.md 118)
  today, and `outline` and `ports` (D-013) once the first
  non-card shape is built (§ Shapes).
- **Presentation keyed by type lives in `packages/ui`** (an icon, a body template for unusual
  content), as `Record<Kind, …>` so the compiler fails when a kind is added and its entry is not.
- `KINDS` stays the list; `Kind` is its type. A new kind is one entry in `KINDS`, one in
  `NODE_TYPES` and the compiler-required UI entries. Nothing else lists kinds: CSS reads a kind's
  colour through `--kind`, which the element sets from `--vb-kind-<kind>`.
- **The app card** (`app`, D-047, ledger v17) was added that way: `NODE_TYPES.app` is
  `tells('App')` (a note and Later, a number, no status word), `KIND_ICON.app` a small window, and
  `--vb-kind-app` a cyan measured against the label tier in light and dark. What it shows (the
  app's panel in a sandboxed frame) and its states are § App card; the app contract is
  [apps.md](./apps.md).

## The element

- **Light DOM, no shadow root.** The page's styles, focus handling and delegated events
  (`closest('vb-node')`) keep working, and agents can read the markup. Pattern CSS is scoped by
  the tag name (`vb-node .vb-node-title`), not by a shadow boundary.
- **Defined lazily.** `vb-<pattern>.ts` exports `defineVbNode()` (and so on), which creates the
  class and calls `customElements.define` once. Nothing touches `HTMLElement` at import, so
  the `packages/ui` front door stays importable from Node tests. The page calls
  `defineBoardElements()` once at start-up.
- **Render once, then update in place.** `render(data)` builds markup from the template when the
  data's version changes. `update(state)` changes only attributes, text and `aria-*`, so focus
  survives. The rules for what to show (`nodeState`, labels, which buttons) are in the core, so
  they are tested without a DOM.
- **The element knows nothing about layout.** It never imports `layout` (D-016). The page measures
  it, places it with `style.transform`, and sizes regions.
- **No inline styles.** The page's CSP has no `style-src`, so `style=""` attributes and `<style>`
  tags in templates are refused. Per-instance values (a kind's colour, a position) go through the
  CSSOM: `el.style.setProperty('--kind', …)`, `el.style.transform = …`.
- **Self-describing.** The element sets its own `role`, `tabindex` and label. Custom elements are
  `display: inline` by default, so `<pattern>.css` sets `display`.
- **Don't shadow built-in names** (steering rule 16).

## Shapes: outlines and ports (D-013, D-015)

A shape is data in the registry, not a new element. Approved examples (maintainer, 2026-10-04):
the **decision diamond** (a fork in a flow, one way in, a "yes" and a "no" way out) and the
**start/end pill** (where a flow begins or ends), and the **circle** (the centre of a radial or
mind-map view, with related nodes in circles around it; maintainer, 2026-10-05). The card stays
the default.

- **`outline`** names the shape: `card` (default), `diamond`, `pill`, `circle`. It is a word, not a path, so
  the agent never draws coordinates (rule 9). The node pattern owns one drawing per outline in
  `node.css` (CSS `clip-path` or a background SVG, tokens only); a kind's colour still arrives
  through `--kind`.
- **`ports`** say where connectors may attach, as sides and positions on the outline's box:
  `{ side: 't' | 'r' | 'b' | 'l', at?: 0..1 }` (at defaults to the middle). Card: every side,
  spread as today. Diamond: its four points (`t`, `r`, `b`, `l` at 0.5). Pill: its two ends
  (`l`, `r`), or `t`, `b` in a vertical flow. Circle: any angle, so a line meets it on the
  straight line to its centre (no fixed sides). A circle is sized to fit its text (its diameter
  comes from the text, like a card's height), and in radial mode its links are straight lines,
  centre to centre, never right-angled routes (maintainer, 2026-10-05). A port may carry a `label` ("yes", "no").
- **The layout engine reads them through `format`**: `routeLinks` picks the nearest port the
  type allows instead of any side, and clips each line to the outline's edge (the box edge for a
  card, the point for a diamond, the rounded end for a pill, the rim for a circle). Same input, same picture.
- **A link names a port only when it matters**: an optional `fromPort` label on a link (e.g.
  "yes") is a format change, made first with a schema version bump (rule 6 / "change the format
  first").
- **How a type gets a shape**: a new kind (for example `fork`, `start`, `end`) with its outline
  and ports in `NODE_TYPES`, or an optional `shape` on a node for kinds that may take several.
  Which of the two is decided in the shapes task, after the mockups.
- **Order**: mockups of both shapes in Architect's look after Stage 2b, picked by eye, then one
  task adds outline and ports to the registry, the layout engine and the node CSS, behind a flag
  (rule 12), with the gallery and page tests covering both shapes.

## Markdown (D-023)

Card bodies and notes are Markdown, and every surface that shows written text renders it through
the one function `renderMarkdown(src, { headingLevel, images })` from the `packages/ui` front door. It is a
pattern without an element: `packages/ui/src/markdown/` holds `blocks.ts` (lines into blocks),
`inline.ts` (marks, links, escapes), `image.ts` (what `![alt](path)` becomes, § Images in cards),
`render.ts` (the front function), `markdown.css` (the
`vb-md-*` classes, in `#ui/styles.css` beside `node.css`) and `pattern.json` (the subset, the
classes and the safety rules). A template sets its output with `innerHTML`, which is safe because
the renderer escapes every text run; one-line fields (titles, tags) stay plain text through `esc`.
Its tests run CommonMark's own examples (`packages/ui/tests/markdown-commonmark.test.ts`), whose
`EXCLUDED` table is the full list of deliberate differences.

## Type checking

- Core and template files run under Node and must not use the DOM at run time; the Node tests
  import them, so a DOM call fails a test.
- The root `tsconfig.json` includes the DOM library types, so element files type-check where they
  live. That is a type-level permission only: a DOM call reached from a Node test still fails.

## Tests

- **Core and template:** unit tests in `packages/ui/tests/`, under `npm test`, on fixture data.
- **Template and element agree:** the element renders by calling the template, never its own
  markup, so there is one markup path. A server render (principles § "One template, two render
  paths") will call the same template when one exists.
- **Element in a page:** page tests (D-025, `npm run test:pages`) open the board and the pattern
  gallery in Chromium and fail on console errors, failed requests, accessibility violations or
  screenshot changes. A new pattern needs a gallery entry: a section in
  `apps/board/src/gallery/` drawn from `#format/gallery.ledger.jsonl` through the pattern's own core
  (`nodeState`, `regionState`), never hand-written markup. The gallery lists patterns from `#ui` `PATTERNS`
  (their `pattern.json` files, `packages/ui/src/patterns.ts`), and `tests/pages/gallery.spec.ts` fails for a pattern that has no samples.

## Awareness tables (D-033)

Three typed tables in `packages/actions`, derived from the folded ledger and read alike by the
server, the page and (through the API) agents. Nothing in them is stored, so nothing goes stale.

- **References** (`references.ts`, `REFERENCES`, `scopeOf`): what belongs to what; the board,
  container and cards any ledger line touches.
- **Permissions** (`permissions.ts`, `PERMISSIONS`, `canWrite`): who may write what, board first,
  then container (D-034).
- **Conditions** (`conditions.ts`, `CONDITIONS`, `conditionsOf`): what needs attention. Each row
  says what it is about (a reference kind), who is told (person, agent, both), where the page
  shows it (picker, card, container, strip, toast, Send), when it holds and when it ends, and how it is
  derived. A condition is ids only (`{ kind, board, container?, n?, seq? }`); a component looks up
  the words it shows. An agent's rows are scoped through `PERMISSIONS`.

On the page, one read (`pageConditions`, `packages/actions/src/answers/page-conditions.ts`, also the gallery's; `apps/board/tests/board-data.test.ts`)
gives the picker marks, the container badges, the open requests, `board.drawn`, whether Send to
agent has anything to send (`board.unsent`: without it the button is disabled, "Nothing new to
send", api.md 123), and the new and updated cards with the fresh containers (`freshCards`,
`container.fresh`, api.md 158);
`attention.ts` runs it after every batch and on every switch, decides what is news (a request or a
drawing line in the batch), and sends the board seen that ends the marks. Components only render.

The rule: **a check needed twice is a row**, never a local check. A new kind without a row is a
type error, and each table has a coverage test that fails when a row has no test case.

## Feature flags (rule 12)

A refactor that keeps the look and behaviour needs no flag. A new mode, node type or behaviour
ships behind one. The pattern was defined by the first such task (U7, node size):

- **One definition**: `packages/format/src/flags.ts` holds `FLAGS` (name → `{ default,
  description }`). `format` because every layer may read it (D-016). Adding a flag is one entry;
  removing it, when its behaviour becomes the default, is deleting the entry and its checks.
- **One question**: `flagOn(name, overrides)` returns the override when there is one, else the
  default. An unknown name throws, so a typo never reads as "off".
- **Overrides**: the standalone page reads them with `pageFlags()` (`apps/board/src/flags.ts`) from the
  `vb.flags` localStorage key, then `?flags=` in the address, which wins, and gives them to the board
  as its host's settings (§ The board's host interface). Both use `parseFlags`'
  format: comma-separated names, a leading `-` turning one off (`?flags=nodeSize`,
  `?flags=-nodeSize`). Unknown names are refused and ignored. Tests and the gallery pass overrides
  directly.
- **Where it is checked**: once, where the behaviour enters (the board controller, through its host's
  `settings` and `board/host.ts` `flagOf`, a value the host does not give reading as the default; the
  gallery's entry point), and passed down as data (`render(n, { sizeControl })`, a tier for `nodeState`), so
  packages never read the address or storage. Pure packages (`layout`) take the result as input.
  `cardImages` is set once at each entry point with `setMarkdownImages` (`apps/board/src/main.ts`,
  the gallery's `main.ts`), because every surface that renders Markdown draws images (§ Images in cards);
  `svgImages` the same way, with `setMarkdownSvg` (`packages/ui/src/markdown/image.ts`).
- **Flag off means unchanged**: every existing page-test screenshot must still match with the
  flag off. A gallery section for flagged behaviour shows only with the flag on, with its own
  screenshots.

## The board's host interface (ARCH_03)

The board mounts in any host (`docs/principles.md` § The board is a plugin), in the shape of nclite's
plugin contract (draft v0.1, `docs/plugins.md` § The view and its host). The standalone page is one
host; nclite's pane will be another.

- **`mount(root, host)`** (`apps/board/src/board/mount.ts` `mount`) builds the board's layers inside
  `root` with no ids of its own, makes `root` its stage (`vb-board vb-stage vb-ground`, `BOARD_ROOT`; the `vb-board`
  class is its `@container`, D-061) and gives back the contract's view (`board/host.ts` `BoardView`:
  `unmount`, `pageChip`, `reveal`, `unsaved`, `leave`) plus what a host draws around it: `status` (`board/status.ts`
  `Status`, a plain observable of `BoardStatus`: the counts, versions, open lists, picker) and `board`
  (`controller.ts` `Board`, the controls). `send()` is Send to agent: the selected cards go to
  `host.addToChat` as `#actions` `cardChip`s, then the `send` act. `unmount` removes every listener the
  board added on the document or the window, takes the zoomed image view away (`card-images.ts`
  `destroy`; the one element outside `root`, a modal dialog's top layer) and empties `root`, giving it
  back without the classes and attributes it added. Each mount has its own calls (`io.ts` `createIo`),
  status and controller, so two boards on one page work apart. The ids inside cards and frames (popovers, step
  section, app menu, a frame's menus, the connectors' arrowheads) carry the mount's prefix
  (`board/mount-ids.ts` `takeIdPrefix`: none for the first live mount, `vb2-`, `vb3-` after it;
  `NodeTemplateOptions.idPrefix`, `RegionFrameOptions.idPrefix`), so no id repeats on a page and an
  `aria-controls` never points into another board. `pageChip` is `#actions` `boardChip` for the board on
  show (null with none shown, or an archived one). Proven by `tests/pages/board-host.spec.ts` (a fake
  host, no Svelte, no server: draw, Send, the page chip, confirm, a change event, two boards with no id
  twice, unmount), `apps/board/tests/mount-ids.test.ts` and `packages/ui/tests/id-prefix.test.ts`.
- **Keys stay inside the board** (nclite: "a view stays inside its root"; `input/keys.ts` `bindKeys`).
  Under a host a key acts only when its target is inside this board's root: a key on a host's own
  button or text field reaches no board, and a key in another board's root is that board's, never this
  one's. Esc follows the same rule. A board that has its own page (`host.page`, given only by the
  standalone page) is `pageWide`: a key outside every board still reaches it, as on any page of its own,
  but a key inside another board's root never does (`controller.ts` `createBoard` passes `!!host.page`
  through `input/wiring.ts` `bindStage`). A press the board handles itself (a lasso, a Cmd or Ctrl
  pan) stops the browser moving focus, so `mount` gives the root focus on pointer release when focus
  is outside it (`preventScroll`): after any click on the board its keys work. Left page-wide on
  purpose: the pan key's hand cursor (`input/pointer.ts` `bindPanKey`, an attribute on its own stage)
  and the keyboard-or-pointer reading (`canvas/pointer-focus.ts`, no action). One known exception, open
  as tracker M21: while a board menu or popover is open, its Esc is caught page-wide
  (`packages/ui/src/base/layer.ts` `dismissable`), so a host's own Esc then closes the board's menu, not the host's. The zoomed image view is
  a modal dialog outside the root, which `route` ignores (its Esc and Tab are the browser's). Proven by
  `apps/board/tests/keys.test.ts` (inside, outside, another board, Esc, `pageWide`) and
  `tests/pages/board-host.spec.ts` "keys stay inside the board" (focus on a host button and field, then
  a click, a Shift drag, a Cmd or Ctrl drag, a card and a container's title line).
- **A host calls `leave()` before `unmount()`** (M11): `unmount` is a plain teardown that never asks,
  so a note's words go with it. `unsaved()` is true while a note bubble is open with changed words
  (`notes/note-discard.ts` `unsavedIn`); it is synchronous, for a host's `beforeunload` or its own
  question, and the status's `unsaved` says each time it turns (`createLeave` `check`, on the bubble's
  open, close and input). `leave()` resolves true at once when nothing is unsaved; otherwise it asks
  through `host.confirm` with the board's own discard words (`DISCARD_ASK`), by the same `mayLeave` as
  Esc and another bubble: OK discards the words (the note closes, `unsaved()` turns false), resolves
  true and the host unmounts; Cancel resolves false and puts focus back in the text, whose keys still
  reach it. A `leave()` while one is asking gets the same answer. The board's own switch asks the same
  way: `Board.switchTo` (the picker, a chat's link, a new or restored board; `controller.ts`
  `switchTo`) resolves false on Cancel and keeps the board open. So `reveal` may ask too, through
  `host.confirm`, when it names another board: it shows the card or note only once that board has
  opened (`mount.ts` `reveal`), and Cancel shows nothing. The person's own acts that would take a
  note's card or container away ask the same way before they act (point 309; `notes/notes.ts`
  `leaveIf`, `controller.ts` `toggleHide`, `showVersion`, the Remove and Archive paths): Hide answered,
  Remove card or container, Archive board, and a past version; Cancel leaves the board as it was.
  An agent's redraw that removes the card still closes the note (tracker M24).
  The standalone page guards its own tab with the `leavePrompt` flag (`shell/page-host.ts`
  `guardLeave`, from `App.svelte`): a `beforeunload` listener only while the status says `unsaved`, so
  a close or reload, the page's own reloads included, gets the browser's "Leave site?" prompt; the folder
  picker (`FolderDialog.svelte` `accept`) calls `leave()` before the server switches folders. Proven by
  `apps/board/tests/note-leave.test.ts` (nothing unsaved, changed words, Cancel, OK, one question at
  a time, each turn heard), `tests/pages/board-host.spec.ts` "the host asks before words are lost" (a
  host's Close on two boards; "reveal of another board's card" waits for the question),
  `tests/pages/note-discard.spec.ts` "a tab close asks" (the browser's
  prompt; unchanged, discarded and flag off close), "choosing another board", "Hide answered…",
  "Remove card and Archive board…" and "a past version…", and
  `tests/pages/note-folder.spec.ts` (Cancel leaves page and server on one folder; flag off as before).
  Not covered: another tab opening another folder (`shell/folder.ts` `folderMoved`) reloads after the
  server has moved, so only the browser's prompt asks.
- **What a host supplies** (`board/host.ts` `BoardHost`): `api` (the typed client's `Transport`, paths
  relative to the route prefix), `events` (`BoardEvent`, `{ plugin, ref: { board, head } }`; a ref with
  no head means "catch up"), `addToChat`, `settings` (`get`, `on`: each flag by name, and `align`),
  `notify(text, tone)`, `confirm({ heading, body, confirm, list })` and, for a page that is the board's
  own, `page` (`BoardPage`: which board opens first, the board opened, starting again, the person's
  cookie). Without `page` the first board opens and, with none left, the board starts again in place.
- **The standalone host** (`apps/board/src/shell/page-host.ts` `createPageHost`): `api` is `fetch` on
  the page's origin, `events` its project stream (`shell/page-io.ts` `watchProject`; a rebuilt page or
  another folder reloads it), `settings` its flags and the viewer's alignment, `notify` the toast,
  `confirm` the shared dialog, `page` its address and the board last looked at. `App.svelte` mounts the
  board in its `<main>` and mirrors the status into `shell.svelte.ts`. Its chat is its own
  (`shell/chat-panel.ts`, `chat-bridge.ts`): it reads the board through `board/chat-side.ts` `BoardSide`,
  so its `addToChat` stages nothing more. No file under `apps/board/src/board/` imports the page around
  it or Svelte: `scripts/verify.mjs` `checkBoardHost` fails it (`scripts/verify.test.mjs`).
  The board's folder is in feature folders (`canvas/`, `links/`, `cards/`, `notes/`, `selection/`, `input/`,
  `find/`, `boards/`, `access/`, `apps/`), each with one public file, `index.ts`: code outside a folder imports
  that and nothing else, and `io.ts` is the one way into `io/`. `scripts/verify.mjs` `checkFeatureFolders`
  fails any other path in (`scripts/verify.test.mjs`); a unit test of a folder's inside may reach the inside.
  A function over about 50 lines of its own warns (`scripts/verify-functions.mjs`
  `checkFunctionLength`, proved in `verify-functions.test.mjs`), unless its header says why
  (`verify: long-function <reason>`): `createBoard` does, as the board's composition root.
- **Differences from nclite's draft** (the contract bends to the board, principles § The board is a
  plugin): `confirm` on the host (four actions ask first, one with a list); a change event whose `ref` is
  `{ board, head }`; `api` resolves to the `Response` (the client reads problems itself); `notify` takes a
  tone (`error` for a refusal); the optional `page` part; the image route (`io.ts` `imageVersion`,
  `IMAGE_ROUTE`) is the page's own, not under `api`; and where the draft has `unmount()` save anything
  being written, the board asks instead: `leave()` asks the person first, then the host unmounts, and
  `unsaved()` serves the host's own question or `beforeunload` (the person decides whether
  half-written words are kept, not the plugin).
- **Not covered**: the toolbar, strips,
  dialogs and reply panel are the standalone page's Svelte, so a host draws its own from the status;
  the work counters (`work.ts`) and the input-modality reading (`pointer-focus.ts`) are the page's, shared
  by every board on it. Open (VERIFY_01, tracker M12–M13): card images
  follow the page's `setMarkdownImages`, not `host.settings`; the saved view
  (`boards/kept-view.ts`) writes `sessionStorage` itself, keyed by board id only.

## Node size (D-030, tracker U7)

A card has one of three widths. The engine picks one from what the card holds, and the person can
override it by hand. Mockup `prototypes/board-v3-design/mockups/07-node-sizing.html`, option A.

1. **Tiers** are tokens: `--vb-card-w-s` 280px, `--vb-card-w-m` 360px, `--vb-card-w-l` 464px.
   Body text then runs about 37, 49 and 70 characters a line. Cards still grow taller to fit.
2. **Auto tier**, a pure function in `packages/layout` (`sizeTier`), counting the body Markdown
   only (title and tags do not count): `l` if the body is over 480 characters; `m` if it is over
   140, or has a code block, or more than 6 list items; `s` otherwise.
3. **Precedence**: the person's `size` act, then the agent's `node.size` suggestion, then the auto
   tier. Emphasis raises the result one tier, up to `l`. The person's `auto` removes their pick.
4. **Where it is applied**: the page sets `data-size` on `<vb-node>` before it measures cards,
   because height depends on width; layout keeps reading measured sizes, so it stays pure (rule 9).
5. **The control** (option A): a faint width glyph in the card's top-right border gap. On hover
   or keyboard focus it lifts an S / M / L / Auto pill above the card's top edge, with 26px
   buttons and a visible focus ring. Only the glyph is in the tab order until the pill opens; Esc
   closes it. The label reads "Card size: S, automatic. Change size". When the person has picked
   a size, the glyph shows the letter (for example "◆ S"). On a small card the "Moved by you" tab
   shrinks to "◆" so the two fit side by side.
6. **The record**: a person-only `act` `size { n, size }` (`docs/specification/api.md` point 16),
   folded like `pin`. The tier is a word, never a width, so no coordinates or pixel sizes enter
   the ledger.
7. On by default (maintainer, 2026-10-05, chat 666); `?flags=-nodeSize` turns it off.

## Notes beside cards (2e_FE_01)

The person's note on a card is written in a bubble beside the card, never in a modal. The rules
are the task's rulings (`cortex-tasks/board/2026-10-01_board-v3/2e_FE_01_note-bubbles.md`); the
record is `api.md` 58-61.

1. **The bubble** is its own pattern, `packages/ui/src/note-bubble/` (`<vb-note-bubble>`):
   `placeBubble` puts it on the card's right, else the left, else below, in stage pixels, so it
   draws above the board at any zoom and moves nothing; `bubbleView` says what it reads in each
   mode (`new`, `edit`, `sent`, and `thread` for the conversation, item 6); the element emits
   `vb-note` and never writes anything itself.
2. **The page** has one bubble, owned by `apps/board/src/board/notes/notes.ts`: C, M, the footer
   buttons, the pin and a click on a note open it; it follows its card through
   `Viewport.onApply` and every relayout; every write goes through the controller's `attempt`.
3. **On the card** (`<vb-node>`): `nodeState().notes` gives the pin (the latest note's number,
   `.vb-note-pin`, hanging off the top-right corner) and the "Your note" block (`notesMarkup`,
   `data-sent` notes grey). The block reads like a chat, oldest first, top to bottom (review polish
   ruling 8, `cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_03_card-notes.md`): note 1,
   its replies oldest first, note 2..., so a new note goes at the bottom; a reply that names no note
   of the card takes its place by time (`seq`) among the notes (decision 8). `notesView` puts them
   in that order once (`NotesView.entries`: a `NoteEntry` with its `replies`, or an `OrphanEntry`;
   `isNoteEntry` tells them apart) and every reader lists it as it is, never sorting again. The pin
   still opens the latest note.
4. **Zoomed out.** The `hideControlsZoomedOut` flag (on by default) is the only thing that sets the
   stage's `data-zoom="far"` below `FAR_K` (`viewport.ts`, one constant: 0.55 since review polish
   round 2 ruling 2, the maintainer's pick after trying it, which closed tracker N13; it was 0.75);
   the cards' buttons, the size control and the containers' icon rows, grips, retired markers and
   holders are then not drawn, so none draws too small to press. Off (`?flags=-hideControlsZoomedOut`),
   every control shows at every zoom. The toolbar's zoom group shows the level as a percentage beside
   Fit (`ZoomLevel.svelte`, rounded down so "55%" means the controls show; `Viewport` decides "far"
   from the same number), its buttons' tooltips say it ("Zoom in · + · 55% now"), and a polite status
   announces it once the zoom settles.
5. **Popovers share their sizes** (popovers-larger-thread ruling 4,
   `cortex-tasks/board/2026-10-14_board-ui_popovers-larger-thread.md`). Every popover reads the
   `--vb-pop-*` tokens (`packages/tokens/src/tokens.css`): `--vb-pop-text` (every text in a
   popover, 15px: the text typed in the comment box is the size of the text around it; the
   maintainer's changes, chats 698 and 701), `--vb-pop-w` (360px),
   `--vb-pop-max-h` (320px, past which the text box, the read-only part and the boxes scroll) and
   `--vb-pop-pad`. The note bubble, the card popover (`.vb-card-pop`: proposal, handover and history), the
   container note preview (`.vb-note-pop`) and the note and reply hover tip (`.vb-note-tip`) all
   read them, so changing a token scales every popover together. Labels and chips in them are
   `--vb-text-md`; buttons are 32px tall.
   A hover tip stays open while the pointer travels to it (hover-tip-reachable,
   `cortex-tasks/board/2026-10-26_board-ui_hover-tip-reachable.md`): the pointer leaving the anchor or
   the tip waits `CLOSE_GRACE_MS` (300 ms, `closeGrace`, `packages/ui/src/tip/close-grace.ts`) before
   the close, and coming back cancels it; opening, Esc, a press outside, focus leaving and `close()`
   stay immediate. `bindHoverTip` and the container note preview (`region-note.ts`) both use it. The
   note and reply tip (`.vb-note-tip`) keeps its box unclipped so its bridge over the gap takes the
   pointer, and scrolls the `.vb-tip-body` inside it (the wheel exemption in `board/input/pointer.ts` is
   `.vb-tip`, which matches it). The card popover's box is itself the scroller (a tab stop, filled by
   three producers), so it relies on the grace alone. Tests: `close-grace.test.ts`,
   `tests/pages/hover-tip.spec.ts`.
6. **The conversation** (review polish rulings 6 and 7, decisions 8 and 9,
   `cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_04_conversation-window.md`; it replaced
   popovers-larger-thread ruling 2's one-note exchange). A click, Enter or Space on a note in a card's
   block or on an agent's reply (`.vb-node-reply`, wired in `wiring.ts` `showReply`) opens the bubble
   in `thread` mode: every note and reply on the card, oldest first, in `conversation`'s order (the
   function `notesView` reads, so the window lists exactly what the card shows: a reply naming no note
   sits by time among the notes), each with who wrote it ("Your note 2 · Sent", "Agent reply · label")
   over its words as Markdown, in one read-only list that scrolls as a whole (`.vb-nb-thread`, a
   labelled group and a tab stop). It opens beside the card with its arrow on what was pressed
   (`partAnchor`), scrolled to the bottom (the latest) or, when an older note or reply was pressed, to
   that one, which takes focus (`vb-note-bubble` `reveal`). Read-only (`thread`, and `sent`, which the
   pin still opens on a note that is history) the bubble has no bottom row: an × in its top corner
   (24px, named "Close") closes it, as do Esc and a click outside (`note-outside.ts`: a drag outside
   pans and keeps it; a press on another note or reply moves it there), and focus goes back to the
   note or reply pressed; the board never moves (focus.ts). The person's note that can still be edited
   carries Edit, which turns the window into today's edit mode for it (Cancel and Save, the discard
   question when words changed). The pin and C still open the latest note. A container's note block
   works the same way: its note's text and each reply (`.vb-nblock-reply`) report `open`
   (`vb-region-note`), and the container's conversation opens beside the part pressed (`notes.ts`
   `showContainer`), listing every note on the container and the replies to them. What the bubble
   says is `note-views.ts` (`cardView`, `containerView`, from the replies `parking.ts` reads, the
   `cardReplies` flag). Hovering a note or a reply still shows only that one (`bindNoteTip`).
7. **A note locks once answered** (ruling 5, api.md 143). A note is history after a Send or the
   agent's answer (a reply naming it, or a newer version of its card), whichever comes first. The
   page reads `ItemNote.locked` (from `lockOf`, the server's own check): a locked note is read-only
   in the conversation ("· Answered" when no Send came yet, no Edit), and its pin opens it read-only,
   its head "Note 1 on 42, answered"; on the card
   it is grey and says "· Answered", and its pin shows it rather than editing it; C or M on the card
   then starts a new note. A container note answered before a Send reads "Answered" and is
   read-only in its block.
8. **Put away, and timed** (card-polish FE_02,
   `cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_02_hide-notes-and-times.md`).
   The block's head (`node-template.ts` `notesHead`) is the count on the left ("1 note", "3 notes",
   "2 replies" with only replies; `node-notes.ts` `notesView`) and one toggle that always sits on
   the right (maintainer, 2026-10-19): Hide, which puts the thread away, and then Show. Put away, the
   head alone shows, and the count adds the replies that came after the person's `notes-hide`
   ("2 notes · 1 new reply", from `BoardState.notesHidden`, board number to that line's `seq`). The
   toggle sends `notes-hide` or `notes-show` (`note-hide.ts` `notesAct`), the person's private mark
   (api.md 156), and keeps focus when the card is drawn again (`vb-node.ts` `updateNotes`); only the
   card's container lays out again. Each note and reply carries `data-at` and shows its time in a
   chip on its top edge at the right on hover and keyboard focus only (`node-notes.css`
   `.vb-note-time`, `title` the whole date, `fullTime`); screen readers hear it once, after who wrote
   it. The words are `node-time.ts` `noteTime` ("Today 09:42", "Yesterday 18:10", else
   `versionTime`). `note-hide.ts` `highlight` brings a note or reply into view on its card
   (`vp.reveal`), showing the thread first if it is put away, and rings it for `FLASH_MS`
   (`data-flash`). Proven by `packages/ui/tests/node-core.test.ts` (notesView put away),
   `node-template.test.ts`, `node-time.test.ts`, `tests/pages/notes.spec.ts` (Hide and Show) and
   `note-polish.spec.ts` (note time); `highlight` by `tests/pages/card-history.spec.ts` (a note row
   and a reply row of the history box).

## A card's history (card-polish FE_03)

The ⓘ at the far right of a card's footer opens, beside the card, when things happened to it
(maintainer, 2026-10-19, point 20: `cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_03_history-box.md`).
Behind the `cardHistory` flag (on by default).

- **Property**: the box lists first drawn and each update (vN), each note sent, each agent reply,
  ✓, ✗ and reopened, and the card's app allowed or stopped (`TIME_KINDS`), newest first, a time
  (`noteTime`, the whole date as its `title`) and one line in the history model's words, the agent's
  label on its rows. No note or reply text and no private mark (flag, hidden notes) reaches it. A row
  naming a note still on the card, or an agent's reply, is a button that closes the box and rings
  that note (`note-hide.ts` `highlight`); the rest are text. Up and Down move between those rows.
  A line for the card that lands while the box is open adds its row at the top, focus left alone.
- **Where**: the times are folded with the ledger, no ledger read: `packages/actions/src/card-times.ts`
  `foldCardTimes` (called by `fold.ts` `applyEvent`, `LedgerState.times`, ids only, no words) and
  `cardTimeRows`, which match and word each line with the history model's own `cardsAbout`, `saidOf`
  and `historyRow` (`card-history.ts`), so the box and `cardHistory` never disagree. The ⓘ and the
  empty box are `packages/ui/src/node/node-history.ts` (`historyButton`, `historyBox`, drawn by
  `node-template.ts` `footer` when `NodeTemplateOptions.history`); the box is the card popover
  (`node-popover.ts` `bindCardPopover` with the ⓘ as its tab), which fires `POPOVER_SHOW` as it shows
  and closes on `POPOVER_CLOSE`; the page fills it then (`apps/board/src/board/cards/history-flow.ts`
  `createHistoryFlow`, `historyMarkup`).
- **Proven by**: `packages/actions/tests/card-history.test.ts` (card times: the box's kinds only, as
  `cardHistory` says them; no words and no private mark kept), `tests/pages/card-history.spec.ts`
  (click and keyboard, rows in order, no note text and no flag, note and reply rows, a live row, Esc,
  the footer on one line on an S card and the smallest app card, axe light and dark).
- **Not covered**: a new version of the card draws its markup again, which closes an open box.

## Selecting and moving (3_FE_01)

The rulings are the task's (`cortex-tasks/board/2026-10-01_board-v3/3_FE_01_select-and-drag.md`).

1. **The selection** is view state, never a ledger event. It lives in one page module,
   `apps/board/src/board/selection/selection.ts`: `selected()`, `has(id)`, `select(ids, mode)` (`only`, `add`,
   `remove`, `toggle`), `clear()`, `keep(ids)` (drops ids that left the board, after each redraw) and
   `onChange`, whose event names only the ids that changed. The lasso and the selection bar call it.
2. **On the card**, the page passes `selected` to `nodeState`; `<vb-node>` sets `data-selected`
   (mockup 05's look, `node.css`) and its label ends ", selected". A list item takes no
   `aria-selected`, so the name carries it, and a polite live region (`#selection-status`) says
   "3 cards selected" or "Selection cleared". A change of the selection goes through `restate` in
   `cards.ts`: those cards are updated, nothing is measured, placed or laid out.
3. **Pointer** (`pointer.ts`): a click on a card selects it (Shift, Cmd or Ctrl adds or removes);
   only the kind tab (`.vb-node-kind`) moves a card; a drag on a card's content selects text; a
   drag on a background (the board, a frame, a frame's title line outside its label and tools) pans
   and a click there clears (a drag on the label moves its container: open list and container title
   FE_02, below); Shift+drag on a background is the lasso's; the middle button pans anywhere.
   **Cmd or Ctrl + drag pans from anywhere** (review polish ruling 13): over a card's text, its kind
   tab, a note, a reply, a button, an open hover tip, the note bubble or a card's popover. The press
   becomes a pan only once it moves past the drag threshold (`DRAG_THRESHOLD`, 4px), then holds the
   pointer, selects no text and swallows the click its release makes; held still it keeps its own
   meaning (a Cmd click adds or removes the card, opens a link in a new tab, presses a button).
   Shift+Cmd/Ctrl+drag on a background stays the additive lasso; a text field (`input`, `textarea`,
   `select`, `contenteditable`) keeps its own press. **While Cmd or Ctrl is held** with the pointer
   over the board, everything on it shows a hand (`grab`), and during any pan a closed hand
   (`grabbing`; review polish round 2 ruling 6): `pointer.ts` sets `data-pan-key` on the stage on
   every key press and release and as the pointer comes over the board, and drops it when the window
   loses focus; `board.css` draws it over every part's own cursor but a text field's. The key is named
   once, `pointer.ts` `panKey`.
   The stage is `user-select: none` and a card's content `user-select: text`.
4. **Keys** (`keys.ts`): Space on a focused card toggles it; Esc closes the note bubble first,
   else clears the selection.
5. **The focus ring** (`pointer-focus.ts`, `bindPointerFocus`, bound by `wiring.ts`): a card a
   pointer press focused carries `data-pointer-focus`, and `node.css` draws no ring on it when a
   key that moves no focus (Z, Esc, Space, the other commands) makes the browser match
   `:focus-visible`. Focus moved by the keyboard (Tab, Shift+Tab, arrows, J/K, a command that
   focuses another card) never carries it, so a card the keyboard focused keeps its ring (WCAG
   2.4.7). **Focus never moves the board** (review polish ruling 11): the same reading, exported as
   `lastInput()` (`'pointer'`, `'key'`, or null when no input came since the window last lost focus),
   tells `focus.ts` whether a focus may pan. Only a key's may, and then by `viewport.ts` `revealPan`
   (`Viewport.reveal`): a card that fits comes fully into view when any of it is outside the stage; a
   card bigger than the stage pans only when none of it shows, and then only to bring its top-left
   corner in (48px margin), never to fit it. A click on a card or any control in it, a card's
   popover opened by a click, and the window getting focus back (a focusout to nowhere while the page
   has no focus keeps the focused card) pan nothing; a popover opened by Enter is still brought into
   view. The selected look is the clicked card's only mark; its colour is the card's kind colour lifted
   about two-thirds of a step toward the strong ink (`--vb-select-lift`, 35%, in srgb) with its OKLCH
   chroma scaled by `--vb-select-chroma` (1.25) for a little more saturation (review polish round 2
   ruling 5, by eye; FE_01's full step was 50%): deeper in light, lighter in dark, the same for every
   kind, read by the border, the half-pixel ring, the top hairline and the glow
   (`cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md`).

**Frames and hover boxes (review polish FE_01).** A container's frame and every hover box's border
(`.vb-tip`) read one token, `--vb-line-contrast`, the Lines scale's next step above `--vb-line-strong`
(`regionColour` returns it as `REGION_COLOUR_DEFAULT`; the frame reads `--region` whole). The container
keeps no fill. Chosen by eye, not by the APCA tier (D-009): the measured scores are in
`cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_01_colours.md`.

**A container's top line (review polish FE_02, rulings 2 and 9).** With the toolRail flag (on by
default) the tools are not on this line but in a rail on the frame's left edge (below); what this
paragraph and the next say of the tools on the line holds with the flag off. The whole line (grip, title,
count, retired marker, holders and, flag off, the tools with their popovers) keeps one on-screen size at every
zoom, so a title reads zoomed all the way out and the controls never grow past 100%. `Viewport.apply`
writes the zoom once on the world as `--vb-zoom` (only when it changed); `region.css` registers it
(`@property`, a number, not inherited, so a zoom step restyles no card: only the regions layer, each
frame and its line take it) and counter-scales the line with a `transform`, its width tied to the
frame's on-screen width, so a zoom step lays out nothing but the lines. A glide (Fit, Z) animates the
value with the world. The line shows short words (review polish round 2 ruling 1): the count "1/1"
(its words, "1 of 1 answered", are its tooltip and a visually hidden copy for screen readers; the
short form is hidden from them) and the marker "6 retired" (its name and tooltip keep "6 cards
retired from this container. Show v…"). The line is the query container of its narrow forms
(`region-narrow.css`, on screen): the collapsed mode row under 408px of line (a 440px frame at 100%),
or under 568px with a retired marker, so the full row never comes back onto it (FIX_01); the marker's
icon and number in place of its words under 290px; and under 226px (261px with a marker) the row down
to the cog, and Comment while its badge shows, with the holders leaving the line whole. The others
stay in the row at no width and still focusable, so it expands over the label side on hover or focus
as before. So nothing on the label side is covered at any zoom where the controls show (`FAR_K`, 55%,
to 250%; `container-polish.spec.ts`). Measured on a one-card frame with a marker (336px): at 55% and
60% the title keeps its few letters and the count is out of sight; from about 62% "1/1" shows whole;
from about 96% the marker's words come back. Below `FAR_K` the tools, the grip, the retired marker and the
holders leave the line (`display: none`), so the title takes their room. In a narrow line the tools
never shrink beyond these forms; the holders give way first, then the title, one line ending in "…"
(never broken mid-word) down to about three letters, then the count. Each holder and the count show
whole or not at all, never a clipped sliver (VERIFY_01 finding 1, FIX_48): the holders' slot and the
handle (`region.css` `.vb-region-holders`, `.vb-region-handle`) are wrapping rows one line high whose
second line is clipped, so a part with no room on the line wraps out of sight whole (the last holder
first) and stays in the accessible tree: the count's words, "0 of 1 answered", and each holder's name
are read as before. The title's flex base is its few letters, so the count wraps only once the title
is down to them, and the title takes back the count's room. A holder with keyboard focus keeps its
room, the title giving way to it. CSS only: a zoom step measures nothing (`container-title.spec.ts`,
the count and each holder at every step from 100% to 20%). The heading keeps the full title
(the container's accessible name) and the title tip shows it on hover and focus. At 20% the line's
lower edge reaches about 1px into the first row's top edge (the line's room is `REGION_HEAD` board
units).

**The title's place, and moving a container by it (open list and container title FE_02, superseding
3_FE_01 ruling 6 for the label).** The label (grip, title and count: one `.vb-region-handle`, then the
retired marker and the holders) sits in the middle of the top line. The line's bar (`region.css`
`.vb-region-bar`) is a grid of three columns, the label's between two equal flexible ones, the tools'
never narrower than the tools and their gap. With room the label is centred on the frame; as the line
narrows on screen (zooming out) the tools' column stops at the tools' width and the first column takes
what is left, so the label slides left beside the tools, never onto them, until the first column is
gone; only then is the title cut. Nothing is measured: the grid reads the tools as they are at each
zoom, their narrow forms included. In the collapsed forms the first column is closed
(`region-narrow.css` `--region-lead`), since the expanded row leaves the flow; the full row leaves no
room to centre there, so the label never jumps. Below `FAR_K`, where the tools leave the line, it is
closed too: zooming out only ever moves a title left, and it takes the tools' room. A drag on the
label (its other buttons and its tip aside) moves the container as the grip does, at any zoom, and
writes one container `pin` (`pointer.ts` `frameAt`, `container-drag.ts`);
the grip takes focus after the move and keeps Alt+arrows. Held still, a click on the title is the
background's click (it clears the selection). The rest of the line, and Cmd or Ctrl + drag anywhere,
still pan; on a past version the title pans. Hovering the handle tints the grip, the title and the
count together in the grip's hover look (`--vb-surface-sunken`), kept while the frame moves. Held by
`tests/pages/container-title.spec.ts` (centred within 2px at 100%, slid left at 70%, never on the
tools, at the start from 50% and cut at 20%; the drag at 100% and 40%; the click; the tint and its APCA, the
title Lc 60 or more on it) and `containers.spec.ts`.

**The tool rail (container tool rail, toolRail flag; a component ruling superseding mockup 05's place
for the mode row).** The tools group, the same markup in the same order (layouts, divider, Match card
widths, Comment, the cog; then the layout popover, the note preview and the settings menu), sits in
`.vb-region-rail` after the header instead of on the top line (`region-template.ts` `regionTemplate`,
option `rail`; the frame carries `data-rail`). The line then holds the label alone, centred on the
whole line at every zoom (`region-rail.css` `.vb-region-bar`), with its shrink order and tip as above.
The rail is a box over the whole frame, counter-scaled by `--vb-zoom` like the line, a size container
whose height is the frame's on-screen height, so its forms follow the room on screen with nothing
measured (rule 15); its width is the line's, so the layout popover's compact form follows the same
568px query as before. In it the rail strip runs down the left border from just under the line, 30px
across on screen (24px buttons, WCAG 2.5.8) and offset outward, so at every zoom where it shows it
reaches at most `REGION_PAD` x `FAR_K` - 2 into the frame and `REGION_GAP` x `FAR_K` - 2 past it, its
canvas ring and Comment's badge (on its outer side) included: it never covers a card or a lane label
and never touches the next container (`packages/layout` is unchanged). By its room on screen it is
whole, collapsed to the checked layout, Comment and the cog, or down to the cog and Comment while its
badge shows; a collapsed rail sits by its foot, so hovered or focused it expands upward over the cards
(the frame raised as for an open popover) and Comment and the cog stay under the pointer; it collapses
on leave, blur or Esc (`region-row.ts`, `data-shut`). At rest its icons draw at `--vb-rail-rest`
(`tokens.css`: 0.5 in both themes, a trial approved 2026-10-26: light keeps the quiet icon at APCA Lc 30
or more, dark does not, Lc 16.9 to 17.7 for the unchecked icons and the cog, recorded in
`container-rail.spec.ts` until the maintainer rules); hovered, focused, with a popover or the note bubble open, or on a touch screen they are at
full strength, and the badge is never dimmed. Popovers open to the right of the rail, top-aligned with
the layouts, Comment and the cog. A tile of the layout popover (`region-template.ts` `modePopover`,
`button.vb-mtile`, out of the tab order) applies its layout on a click or Enter: the page's click wiring
(`wiring.ts`) sends the rail icon's `setMode` for it, so there is one action; the popover closes, a past
version and a locked board keep it inert (`layout-tiles.spec.ts`, `lock-board.spec.ts`). A container's title
(`.vb-region-handle` and its `h2`) takes `--vb-text-md`. Keys: Up and Down move through the rail; on the cog Right opens the
menu and Left in the menu closes it. Flag off, the row is on the line exactly as before: the template
places it there, and `region-narrow.css` scopes the row's narrow forms to frames without `data-rail`.
Held by `tests/pages/container-rail.spec.ts` (placement, the bounds at 100% to 56%, rest and lit, APCA
light and dark, collapse and expand, popovers, keys, flag off, touch) and
`packages/ui/tests/region-template.test.ts` (the markup with and without `rail`).

## The lasso, the selection bar and view commands (3_FE_02)

The rulings are the task's (`cortex-tasks/board/2026-10-01_board-v3/3_FE_02_lasso-and-zoom.md`).

1. **One command table**, `apps/board/src/board/input/commands.ts` (`COMMANDS`, keyed by `CommandId`):
   zoom out, Fit and zoom in (the header), Comment, Move to (3_FE_03), Reset places (navigation FE_03; R, disabled while no selected card is
   pinned), Remove and Zoom (the selection bar; Clear is not a button, a click on empty board and Esc clear), Zoom to this area (the area bar it draws when a lasso touches no card). Each entry holds
   its label (the visible word), when the label is short what it means in full (`means`: the tooltip, the accessible name and the key list read it, with the key), and keys; the header buttons, the bar's buttons and `keys.ts` all read from it, so a
   command is wired once (ruling 5).
2. **The lasso and the bar**, `apps/board/src/board/selection/selection-flow.ts` (`createSelectionFlow`):
   `pointer.ts`'s `lasso` gesture (Shift+drag on a background; Shift+Cmd/Ctrl adds) reports its
   screen box through `lassoMove`/`lassoEnd`; the cards it touches (`touches`, `packages/format/src/geometry.ts`, which
   `packages/ui`'s `selection-bar` pattern re-exports; `packages/format/tests/geometry.test.ts`) replace or add to the selection the same `selection.ts` module 3_FE_01
   uses. Touching none opens the **area bar** instead, holding the lassoed world box until a click
   away, a new lasso, or Zoom to this area dismisses it; the real selection bar shows "whenever the
   selection is not empty and no bubble is open" (ruling 2), for one card same as several.
3. **The bar's pattern**, `packages/ui/src/selection-bar/` (`<vb-selection-bar>`): `placeBar`
   centres it above the selection's screen box, below when there is no room above, kept inside the
   stage; it draws above the cards and moves nothing, and follows pan, zoom and a changed
   selection through the same `place()` the note bubble uses. `vb-command` events name the
   pressed button's `CommandId`; the element never acts itself (rule 8). With the `selectionPill`
   flag (stage5-follow-ups FE_02, on by default) the bar is compact and over a selection starts as
   a pill ("3 selected" and a chevron, `aria-expanded`): its `vb-toggle` opens it, and
   `board/selection/selection-pill.ts` closes it on a press outside, a wheel pan, Esc (focus back on the
   pill) or the selection clearing. The selection's keys work with it closed. **Clear of the
   tabs** (page polish ruling C, `cortex-tasks/board/2026-10-09_board-app_page-polish.md`): over
   cards the bar sits `pillGap(k)` above the selection, not `BAR_GAP`, because the cards' top tabs
   (number, kind) scale with the zoom `k` and the bar does not. `pillGap(k) = TAB_RISE * k +
   clamp(8k, 4, 16)`: the tabs' rise (10 world px) plus a clear space from 4px zoomed out to 16px
   zoomed in (6px at 0.2, 18px at 1, 41px at 2.5), so it never covers the tabs and a press there
   grabs the card. The area bar and the bar below a selection keep `BAR_GAP` (12px).
4. **Group notes.** Comment on two or more selected cards opens one note on the group
   (`notes.ts` `group()`, `BubbleInput.numbers`): the bubble's head names every item ("Note on 3
   cards: 12, 14, 15") instead of a number chip, and its act carries `nodes` in place of `n`/`ver`
   (api.md 62-65). A card may also hold its own single-card note (named by `n`) independently. With
   exactly one card selected, Comment is that card's own note (2e), unchanged.
   **Drawn once** (`groupNoteOnce` flag, on by default; task
   `cortex-tasks/board/2026-10-25_board-ui_group-note-once.md`, maintainer ruling point 103). The
   note is one pin per group of cards (`node-notes.ts` `groupMarkers`: its latest note, numbered
   among the group's notes, labelled as a card's pin is), in its own layer of the world above the
   cards (`group-pins.ts` `createGroupPins`, `.vb-group-notes`), on the right edge of the group's
   lowest-numbered card drawn, in the column of that card's own pin and just under it
   (`groupPinAt`). A group whose lowest card already holds a group pin takes its next card drawn that
   holds none (`groupAnchors`); only when all of them do does it stack, down clear of the footer, then
   a column out.
   It wears the card pin's look and states (`node.css` `.vb-note-pin`, `paused.css`). Hovering or
   focusing it, and its bubble being open, put a dashed ring round each card of the group
   (`data-group-ring`, `node-notes.css`): the accent while the note can be edited, `--vb-ink-subtle`
   once it is history; never a box, so no unrelated card is marked. Pressing it selects the group's
   cards and opens the note (`notes.ts` `show`), to edit or remove it, with the agent's replies to
   it once; focus goes back to the pin. The cards' pins, "Your note" blocks and conversations leave
   the group's notes and the replies to them out (`notesView`'s `apart`, `CardConditions.groupNotesApart`
   from `parking.ts`; `note-views.ts` `cardView`). Off, the note and its replies show on every card
   of the group and any of their pins opens it. Kept true by `packages/ui/tests/group-notes.test.ts`
   and `tests/pages/group-note.spec.ts` (one pin, no card repeating it, its place, rings on hover,
   focus and open, select, edit, the reply once, two groups sharing a card, Remove, the flag off, axe
   light and dark); the gallery's "Notes on groups of cards" section (`group-notes-section.ts`).
5. **View commands are never ledger events.** Zoom and clearing only move the viewport or the
   selection. **Z** (Zoom to the selection, and the chat's "zoom to these cards", which runs it)
   fits one card or several to 75% of the stage's width or height, whichever binds, centred, up to the
   top zoom (250%): `Viewport.fit(box, animate, SELECTION_FIT)` (review polish ruling 12). Exactly one
   app card fits with `APP_FIT` instead, 95%, so its app is big enough to use (card-polish FE_01;
   `viewport-zoom.test.ts` "fit with APP_FIT: …", `app-cards.spec.ts` "Z on the one app card …"). Fit,
   Zoom to this area and a container's zoom keep `fit`'s default, 32px a side and at most 110%.
   **Z on a container** (containerZoom flag): a click on a container's empty inside or on its title
   line clears the selection and focuses the container's title line (`find/finder.ts` `focusContainer`,
   the background click's pressed element, `input/pointer.ts` `Start.on`); Z there zooms to the whole
   container as the container finder does (`zoomToContainer`; `input/keys.ts` `zoomRegion`). A click on
   a card still makes Z zoom to the selection (`container-zoom.spec.ts`).
   Comment opens the note bubble, whose own write goes through the action layer as usual (rule 8).

6. **The key commands bubble** (navigation FE_04, `keyBubble` flag, on by default): a round "?" at the
   bottom left (`shell/KeyHelp.svelte`, `styles/key-help.css`) replaces the old key bar. Hover or focus
   opens the list through `bindHoverTip` (`packages/ui/src/tip/`): it stays while the pointer is on
   it, Esc closes it, and `?` opens it. The list is generated by `board/input/key-help.ts` `keyGroups()`
   from `COMMANDS` and the registry `ACTIONS` (Items, Selection, Board, View); only inputs neither
   table owns (J/K, Space, Alt+arrows, H, pointer gestures) are listed by hand there, and a unit
   test fails when a command or action with a key is missing. A command with too many keys to list
   one by one gives the list its own `shown` (Go to card's ten digits read "0–9"). Off, the board
   shows no key help.

## Moving cards between containers, and Later (3_FE_03)

The rulings are the task's (`cortex-tasks/board/2026-10-01_board-v3/3_FE_03_move-and-later.md`);
the format is api.md 66-70.

1. **Where a card is** is worked out, never stored on the page: `placedView` (`packages/actions`
   `moves.ts`) puts each card of the agent's view in the container of the person's latest `move`
   (`BoardState.moves`) and adds the built-in Later (`LATER`, id `later`, grid) last while it holds
   a card or a card is being dragged. The controller draws that view; the agent's own view is kept
   for Reopen, which sends a card back where its agent drew it.
2. **A drag** (`pointer.ts`) on a kind tab carries the card, or the whole selection when the card
   is in it (`moves.ts` `carried`); every carried card keeps its offset. The frame under the
   pointer that can take the cards gets `data-drop` (`region.css`: a dashed accent line and a soft
   fill); a frame of the drag writes only the carried cards' transforms and that attribute, so it
   touches no other card and lays out nothing. The drop (`moves.ts` `drop`): in another container,
   one `move` (with `nodes` for a group) and then each card's pin where it landed, local to that
   container; in its own container, today's pin; outside every container, the cards go back and
   nothing is written. Later takes only items that can be saved for later.
3. **Later is one thing, two ways in.** Into Later: `move` and `later`; out of it (a drag, Reopen,
   O, or L again): `move` and `reopen`. L and the card's Later button go through the same
   `moves.ts` `status`, called from `item-acts.ts`.
4. **One batch, drawn once.** A move's acts go through `sender.ts` `run`: the move first, then the
   status acts and pins side by side; the board is drawn when the last answer is in, so moving 50
   cards updates those 50 and lays out only the two containers (`perf.spec.ts`).
5. **Move to** is one command (`move`, Shift+M, the bar's "Move to"): `move-menu.ts` lists the
   board's containers, Later last (disabled when a selected card cannot go there), as a labelled
   `role="menu"`; Up and Down move, Enter or a click moves the selection, Esc closes and gives
   focus back. A Shift combination a command claims never falls through to the plain key (M).
6. **Later's frame** is `<vb-region>` rendered with `LATER_FRAME` (`render.ts`): `fixed` (no layout
   icons or popover; the board sets its layout; the cog is the row's one stop) and its own empty
   message, "Drop a card here to save it for later."

## Navigation: versions, the container finder and the key bubble (navigation FE_01, FE_02, FE_04)

Three toolbar and page patterns, each behind its own flag (on by default; off, the board is as it was
before). Their rulings are the task set's (`cortex-tasks/board/2026-10-07_board-app_navigation/`).

1. **The version view** (`versionView` flag). The toolbar's `#version` dropdown lists the open
   board's own versions (`boardVersions`, `packages/actions` `reads.ts`): "now" first, then each
   agent run with its time. A run is an agent's consecutive drawing lines on the board; a person's act
   or another agent ends it. Choosing a past version reads the ledger up to its line, folds it with
   the shared action layer and draws that state with the same drawing code, read-only: no act is
   sent (`sender.ts` `READ_ONLY`), no board seen is recorded (`attention.ts`), the stage's acting
   handlers do nothing (`versions.ts` `guard`), and `#world[data-readonly]` hides what acts. A card
   answered by then keeps its ✓ or ✗ lit, as now, so it never looks open: the act row is inert (no
   press, focus or hover) and shows only that mark (`board.css`; review polish FIX_01).
   `shell/VersionBanner.svelte` shows the banner with Back to now (Esc does the same). Code:
   `apps/board/src/board/boards/versions.ts`, `shell/Toolbar.svelte`, `shell/VersionBanner.svelte`.
   **From a container's "N retired" marker** (retiredMarker flag; review polish ruling 10,
   tracker N42) the same past view opens the version where the cards last appeared (the latest run
   before the latest of those retires) with the person's answers as they stood just before the
   first `retire` line on the board after that version: the marker carries that line as
   `data-until` (`packages/actions/src/answers/retired.ts` `retiredCounts`), the ledger is read on to just before it, and
   `pastLines` (same file) leaves out the board's drawing lines after the version, so the cards
   are exactly that version's (not a summary drawn with the retire) while every act, note, move and
   agent reply (a reply that cleared a ✓ shows the card open, D-045) up to the retire counts. It is
   read-only in the same way, and the banner is the same. A version chosen from the dropdown still
   shows the answers as at that version.
2. **The container finder** (`containerFinder` flag). The toolbar's `#containers` dropdown lists the
   board's containers in board order with their card counts, Later always last and disabled
   ("0 items") while empty. Choosing one zooms to its frame (`Board.goToContainer`, `vp.fit`) and
   focuses its title; zooming is no act, so it works in a past version too. There is no key. Code:
   `apps/board/src/board/find/finder.ts` (`containerRows`, `zoomToContainer`), `shell/Toolbar.svelte`.
   The dropdown is `shell/MenuSelect.svelte`, the one menu dropdown pattern (item 7 uses it too): a
   native select that shows its name, calls `onpick` with a row's value and shows its name again
   (`tests/pages/finder.spec.ts`).
3. **The key bubble** (`keyBubble` flag). The round "?" at the bottom left lists every key. It is
   generated from `COMMANDS` and the registry `ACTIONS`, never written twice (see 3_FE_02 item 6).
   Code: `apps/board/src/board/input/key-help.ts`, `shell/KeyHelp.svelte`, `styles/key-help.css`.
4. **The toolbar keeps its room** (verification fix). The board picker never goes under 220px from a
   1024px window up (its title truncates inside). At 1500px and below the toolbar carries
   `data-narrow` (`shell/Toolbar.svelte`, a `MediaQuery`): the end group's text buttons show an icon
   only (`shell/ButtonIcon.svelte`) and the counts, with the "boards updated" chip, show their
   numbers only; the words stay for screen readers and the title tooltip says them. "Replied" (with
   the agent, D-046) shares "boards updated"'s pink, so there it keeps the agent's mark (the Agents
   bot) beside its number (review polish FIX_01).
5. **Toolbar icons and the "⋯" menu** (`toolbarMenu` flag, on by default; task
   `cortex-tasks/board/2026-10-09_board-app_toolbar-icons-menu.md`). Theme, Hide answered (Hide
   decided before D-045) and Reply move into a "⋯" menu at the toolbar's end (`shell/ToolbarMenu.svelte`):
   rows with their icon and key, Hide answered a `menuitemcheckbox`; a click or Enter opens it and focuses the first row; Up,
   Down, Home, End, Esc (focus back on "⋯") and Tab are the Move to list's keys, one helper for both
   (`#ui` `menuKeydown`, `packages/ui/src/base/menu.ts`); a press outside or a choice closes it; H works on the board and in the
   menu. Agents (a bot with its holder count), Send to agent (a bot with a send arrow) and Chat show
   their icon only when narrow. The smallest supported width is 768px: at 1000px and below the
   gaps tighten, the app icon steps aside, the picker may go to 150px, the version and containers
   dropdowns take 6em and the count chips draw closer, so every control stays whole. (With the folder chip, § 6, the picker goes to
   125px and the two dropdowns to 5em: `styles/current-folder.css`.) The end group is
   `shell/ToolbarEnd.svelte`, which the gallery mounts wide, narrow and with the menu open. Off, the
   toolbar is as it was. `tests/pages/toolbar.spec.ts` checks 1500, 1440, 1280, 1200, 1100, 1024,
   900 and 768px (with that chip showing): nothing clipped, overlapping or scrolling, every control
   named with a tooltip, the open menu inside the window, axe light and dark.
6. **The folder picker** (`openFolder` flag, on by default; task
   `cortex-tasks/board/2026-10-09_board-app_open-folder.md`, api.md 109-113). The "⋯" menu ends with
   Open folder… (its tooltip names the open folder, as the page title does). It opens
   `shell/FolderDialog.svelte`, a native modal dialog holding `shell/FolderPicker.svelte`: a breadcrumb
   of buttons under `~`, on the home folder a "Cloud storage" group (the `places` of api.md 110, a
   cloud icon, by their real names; task `2026-10-10_board-app_folder-links-cloud.md`), the recent
   folders (the open one left out), then the folders in the chosen one, a folder with a Vision Board
   marked with a "board" chip. Choosing a place lists it like any folder, under its real names. Choosing a folder lists it and says
   "Vision Board found (N boards)" with Open, or "No Vision Board here" with Create; focus goes to Open
   when found, else to the first folder in it, else to Create. Esc, Cancel or the backdrop closes it.
   Open or Create switches the server's folder and reloads the page without its board hash; another
   open page reloads when its live stream opens again on a different folder (`shell/folder.ts`, through the page's change events, `shell/page-host.ts`). The
   last board is kept per folder. Styles: `styles/folder-dialog.css`. The gallery draws the picker in
   each state (`gallery/folder-section.ts`); `tests/pages/open-folder.spec.ts` covers it. Off, the menu
   and title are as before and the page never calls the folder routes.

   **The open folder always on show** (`currentFolder` flag, on by default, needs `openFolder`; task
   `cortex-tasks/board/2026-10-26_board-app_current-folder.md`). Nothing else on the page names the open
   folder, so three places do, from `shell.folder` (`FolderInfo`), with no server, ledger or schema change.
   (1) `shell/FolderChip.svelte`, the toolbar's first control after the app icon: a folder icon and the
   folder's own name (`shell/folder-path.ts` `folderName`) in the toolbar's chip-button look, its tooltip
   and accessible name the whole path with the home folder as `~` (`folderPath`, the server's `displayName`);
   a press opens the folder dialog. A long name is cut with "…" (`.vb-folder-chip-name`, `max-width: 18ch`),
   down to 36px (its icon and an ellipsis), and at 1000px and below the picker and the two dropdowns give up a
   little room so 768px still shows every control. (2) The "⋯" menu has a plain line under Open folder…, "Current: ~/…/name"
   (`ToolbarMenu.svelte`, `role="none"`, so the menu's keys skip it; `elidePath` elides the middle of a path
   over 32 characters, the whole path is its tooltip). (3) The folder dialog's heading reads "Open folder —
   choose a project folder", and above the lists, outside their scrolling box, a "Current folder" group with
   the whole path and a Copy button (`FolderPicker.svelte` `here`, `copyPath`): it copies the absolute path
   and says "Copied" for two seconds (a refusal says so in a status line). Reading text Lc 60 or more, the
   folder icon Lc 30 or more, light and dark. The gallery's own section is `gallery/current-folder-section.ts`;
   tests are `apps/board/tests/folder-path.test.ts` and `tests/pages/current-folder.spec.ts`. Off, the name is
   only in the page title and the Open folder… tooltip, and the dialog is as it was.

7. **The open cards list** (`openList` flag, on by default; task set
   `cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/`, FE_01). The toolbar's
   "N open" chip (`shell/OpenChip.svelte`) is a `MenuSelect` lying unseen over the chip
   (`.vb-menu-face`, `.vb-menu-over` in `styles/board.css`), named "Go to an open card": the chip
   keeps its look and draws the hover, pressed and focus looks. Its rows are the open cards
   (`packages/actions` `board-state.ts` `openCards`, which `counts.open` counts, so the two cannot
   disagree; `packages/actions/tests/open-cards.test.ts`) as "12 · title" in board number order,
   a title past `OPEN_ROW_MAX` cut with "…" (`finder.ts` `openRow`, `#format` `clip`) and
   whole in the option's tooltip (`apps/board/tests/open-list.test.ts`). Choosing one goes to the
   card as Go to card's Enter does (`go-to-card.ts` `to`, § Go to card and search); it is no
   act, so it works in a past version, on that version's open cards. With nothing open it is the
   plain chip. The list's keys are the browser's: Playwright cannot drive a native popup, so
   `tests/pages/open-list.spec.ts` checks Tab reach, the named combobox and its options, a choice
   (focus, selection, pan), the cut title, nothing open, a past version (nothing sent), the flag
   off, axe light and dark, and the gallery samples' screenshots (`gallery/open-list-section.ts`,
   in the toolbar section). Off, the chip is plain.
8. **New and updated cards at board scale** (`freshCards` flag, on by default; task
   `cortex-tasks/board/2026-10-25_board-ui_new-and-updated.md`, api.md 158). The "N updates" tab is
   outlined in the accent's pink with pink words at rest (`node-steps.css`, scoped by the world's
   `data-fresh-cards`), so it reads at a distance as NEW does; hovered or open it takes the amber
   edge as before. A container holding a card new or updated since the person last engaged with any
   card in it (`container.fresh`) carries `data-fresh`: its border takes `--vb-state-fresh` (teal)
   and its title line a pill after the count, "3 new · 1 updated" (`region-fresh.ts` `regionFresh`,
   `region-fresh.css`), which leaves a narrow line whole, after the holders and before the title,
   and stays zoomed out. The person's own select of one of its new or updated cards (a click, not a
   find), or any act on one of its cards, ends it; a click on the frame does not. The toolbar's "N new" chip beside "N open" is the same
   `OpenChip` (generalised: its word, tone and names are props), listing `freshCards` as "46 ·
   title", an updated one ending "· updated" (`finder.ts` `openRow`, the title giving way to a cut,
   never the ending); choosing one goes to it as Go to card does, which selects it but leaves its
   NEW or "updated" mark (finding keeps marks, § Go to card and search item 6). The count, the list, the pills and the tabs read one list (`freshCards`, conditions.ts), so
   they never disagree. Hidden at zero, and with the flag off or a past version (`attention.ts`
   `freshIn`, `Toolbar.svelte`). APCA, measured by `tests/pages/fresh-cards.spec.ts`: the border on
   the canvas Lc 58.6 light, 67.4 dark; the pill's words 54.8 and 63.5; the tab's words 74.8 and
   49.8, its outline 72.0 and 47.7. The gallery's "New and updated cards" section draws them
   (`gallery/fresh-section.ts`). Off, the tab is grey until hovered and no container, pill or chip
   shows.

## Every card in the conversation (every-node FE_01)

Task set `cortex-tasks/board/2026-10-10_board-actions_every-node/` (rulings 1-4, 6; api.md 118-120),
behind the `everyNode` flag (on by default; `?flags=-everyNode`).

1. **Numbers and buttons from the kind.** Every card shows its number; `offers` reads
   `NODE_TYPES[kind].actions`, so a question, decision or action draws ✓, ✗, Comment and Later, and
   every other kind Comment and Later (More context is gone, D-045). Off, `numberedView`
   (`apps/board/src/board/board-data.ts`, the page's own draw rule) drops the number from cards that need no answer, so they
   draw with no number, buttons or tabs and take no note.
2. **No meaning on ✓ and ✗** (superseded by D-045; was one meaning per kind, `action-words.ts`,
   now deleted). See "The answer model" below.
3. **Comment on any group.** The selection's Comment takes every selected card, any kinds: one note
   on exactly those cards (`selection-flow.ts` `comment`); one card alone is its own note.
4. **Counts and states.** The toolbar and container counts count only cards that need an answer
   (`counts`, `regionState`); a plain card's note or Later lights its button and counts nowhere,
   and since D-045 shows no status word. No new colour.
5. **Hide answered** (Hide decided before D-045) keeps an answered card while the agent owes it an
   answer (`item.owed`, read into `pageConditions` `owedCards`), so the reply lands where the person
   can see it; it hides once nothing is owed (`answeredIds`).
6. Tests: `tests/pages/every-node.spec.ts` (numbers, tooltips, a plain card commented by key, a
   lasso of mixed cards commented once, counts, hide while owed, the flag off, axe light and dark);
   the gallery's node section shows the cards that ask and the cards that tell in every status each
   can reach.

## The answer model (answer-model FE_01, D-045)

Task set `cortex-tasks/board/2026-10-15_board-actions_answer-model/` (rulings 1-5, 7, 8; api.md 144-146).

1. **✓ and ✗ are tools.** The buttons are named Check and Cross (registry labels, `buttonLabel`:
   "Check item 12 (A)", tooltip "Check · a"); the board never says what they mean, the card does.
   Lit, the mark shows in its state colour and no word follows it in the footer (`STATUS_LABEL` has
   none for `acknowledged` or `dropped`, and the divider hides with no word, `node.css`); the
   accessible name says "checked" or "crossed" (`STATUS_NAME`). ✗ no longer fades the card or strikes
   its title through.
2. **"Answered", never "decided".** The toolbar reads "N open · N answered · N later" (`shell.counts`,
   `toolbar-counts.ts`), a container "N/M" with "N of M answered" as its tooltip and name (`regionState`
   `countText`, `countLabel`; round 2 ruling 1), an emptied frame "Everything here
   is answered.", and the H toggle "Hide answered" (`answeredIds`).
3. **Only cards that ask show a status** (`asksAnswer` in `node-core.ts` reads
   `NODE_TYPES[kind].answer`): a finding, risk, topic or note has no status word and none in its
   name, whatever its state; its lit Later and its note pin still show.
4. **One way to write back.** No card, container or selection offers More context, and M is no key.
   An old `context` note reads as "Your note" everywhere (`KIND_WORD`, the bubble's placeholder).
5. **The agent's answer clears the card** (`ItemState.unseenAnswer`, from the action layer): the card
   is open and unmarked, and the reply is one update of its own on the "N updates" tab, the marker a
   new version gets (`packages/actions/src/answers/updates.ts` `unseenCount`, `unseenSteps`; `packages/actions/tests/updates.test.ts`: a step "Reply · when · who" with its
   words, at the card's latest version). Selecting the card or stepping past the reply sends the card
   seen line that ends it (`seenDue`: due although that version was seen). An answer by a new version
   is that version's step. **Any reply of the agent's is such an update** (review polish round 2
   ruling 4, `clears.ts` `unseenReply`, api.md 149), whether or not it answers a note or clears
   anything: a reply to an older note leaves the card's ✓ as it was and still shows "1 update".
6. **A lit button clears.** Pressing a lit ✓, ✗ or Later records `reopen` and the toast says
   "12 cleared"; ✗ while ✓ is lit switches straight to ✗; a second press of the same button on the
   same card within 400 ms (`REPEAT_MS`) is ignored (`item-acts.ts`).
7. Tests: `packages/ui/tests/node-core.test.ts`, `apps/board/tests/item-acts.test.ts`,
   `updates.test.ts`, `every-node-page.test.ts`; `tests/pages/answer-model.spec.ts` (names, no M,
   ✗ at full opacity, clear and switch, the double click, the header, a card the agent's answer
   cleared, keyboard, axe light and dark). The gallery's node matrices have rows for ✓ Checked,
   ✗ Crossed and "Answered by the agent".
8. **Replied: with the agent** (with-agent-state task, D-046, api.md 148; the word from
   `cortex-tasks/board/2026-10-16_board-ui_replied-word-and-unclear-marks.md`). A note puts a card that
   asks with the agent until its answer, and the person reads "Replied": in the footer and name
   (`STATUS_LABEL.commented`), and in the toolbar, "N open · N replied · N answered · N later", the
   replied chip (title "Replied items", `data-tone='agent'`, `--vb-state-comment` on
   `--vb-state-comment-soft`: APCA Lc 64.0 light, 49.1 dark) only above 0 (`counts().withAgent`, `shell.counts.withAgent`). The gallery's
   matrices name the row "Replied". Agents keep reading `with-agent` (it tells them they owe a
   reply), and the Send message keeps "Waiting for your reply". Tests: `node-core.test.ts`,
   `answer-model.spec.ts` (footer, name, the header chip at 1600px and at a 1470px toolbar).
9. **Open means "your move".** Open = no ✓, no ✗, no note, no Later; the agent's answer to a note
   makes the card open again (`cardStatus`, D-046).

## Field report, batch 1 (2026-10-11)

Task `cortex-tasks/board/2026-10-11_board-app_field-report-batch-1.md`.

1. **Send to agent, disabled.** `SendButton.svelte` gains the `disabled` state (the shell's
   `unsent`, from `pageConditions`, `board.unsent`; api.md 123): a quiet outline in place of the
   accent fill (`--vb-surface-card`, `--vb-line-strong`, the words in `--vb-ink-subtle`: APCA light
   Lc 76.2, dark 48.8, a short label at Lc 45), no hover or press, `aria-disabled` and still in the
   tab order, its title "Nothing new to send". A click, Enter or Space records nothing. The gallery's
   Send row shows it after Waiting. Tests: `tests/pages/send-nothing-new.spec.ts`.
2. **The "N updates" tab, smaller and quieter** (`packages/ui/src/node/node-steps.css`): lower case,
   medium weight, 18px tall with 4px sides (the other bottom tabs stay 20px, uppercase; 1px margins
   keep it centred on the edge beside them), `--vb-ink-subtle` on `--vb-surface-card` (a status
   word: Lc 76.2 light, 48.8 dark). Hovered or open, its edge takes `--vb-state-context` and its
   words `--vb-ink`. Still a button with a 24px target, still opens the stepper.

## Archive a board (N39)

Task `cortex-tasks/board/2026-10-12_board-app_archive-board.md` (rulings 4-6; api.md 135-137),
behind the `archiveBoard` flag (on by default; `?flags=-archiveBoard`).

1. **Archive board…** is a row in the "⋯" menu (`shell/ToolbarMenu.svelte`, given `onarchive`; with
   the `toolbarMenu` flag off there is no menu and so no row), before Open folder…, with a box icon
   (`ButtonIcon` `archive`). It acts on the open board and is `aria-disabled` (focusable, explained in
   its tooltip) while no board is open or a past version shows; the disabled look is the Move to
   list's, shared (`board.css`). It asks first through the shell's confirm dialog (`ConfirmDialog`,
   reused): "Archive 'Multi-bot'?", "Created 11 Oct, last updated 11 Oct. Agents won't see it; you
   can restore it from the board picker.", Cancel focused, then Archive (`board/boards/board-edit.ts`
   `archiveAsk`; days in the viewer's locale, the year only when not this one, from the fold's
   `dates`). Archiving sends one `archive` act through the one sender (`sender.ts` `actOn`).
2. **The next board opens** (`board/boards/boards.ts` `listed`, `leave`): whoever archived the open board,
   this page or another, the board after it in the picker opens, else the one before; with none left
   the page reloads into its empty state (as it boots in a folder with no board), which says how
   many boards are archived. The hash and the remembered last board never open an archived board:
   the next board after it opens instead (`board/boards/start-board.ts` `startBoard`, `nextBoard`).
3. **Archived (N)…** ends the board picker while any board is archived (`shell/Toolbar.svelte`). It
   opens `shell/ArchivedDialog.svelte`, a native modal dialog holding `shell/ArchivedList.svelte`:
   each archived board, the latest archived first, with when it was last updated and Restore (its
   accessible name "Restore <title>"). Focus starts on the first Restore; while one is on its way it
   says "Restoring…" and the others wait (`aria-disabled`, so focus stays); a refusal stays under the
   list; Esc, Close or the backdrop closes it and focus goes back to the picker. Restored, the board
   opens. Styles: `styles/archived-dialog.css`.
4. **The chat** on an archived board takes no message: the composer says why
   (`shell/chat-rules.ts` `blockedReason`, `ARCHIVED`; the panel's pure rules moved there from
   `chat-panel.ts`), and the server refuses one anyway (api.md 137).
5. A new board's id is never an archived board's (`boardIdFor` takes every board).
6. Tests: `tests/pages/picker-archive.spec.ts` (the confirm, Cancel and Esc, archive by keyboard and
   the next board, the Archived list and Restore by keyboard, a board archived in another tab, the
   hash and the remembered board, the empty state, the flag off, axe light and dark, the gallery
   section's screenshots); `apps/board/tests/board-edit.test.ts`, `start-board.test.ts` and
   `chat-bridge.test.ts` for the pure parts. The gallery's archive section
   (`gallery/archive-section.ts`) draws the menu, the confirm and the list in each state.

## Lock a board (N40)

Task `cortex-tasks/board/2026-10-12_board-app_lock-board.md` (rulings 1-7; api.md 138-140), the menu
rows behind the `lockBoard` flag (on by default; `?flags=-lockBoard`). The lock itself is the
ledger's, so a board locked elsewhere shows locked and paused whatever the flag.

1. **Lock board / Unlock board** is a row in the "⋯" menu (`shell/ToolbarMenu.svelte`, given
   `onlock`), before Archive board…, with a flat SVG padlock, shut or open (`ButtonIcon` `lock`,
   `unlock`; 24 grid, 1.5 stroke, `currentColor`). It acts on the open board with no confirm (nothing
   is lost either way) and is `aria-disabled`, explained in its tooltip, while no board is open or a
   past version shows, like Archive board…. It sends one `lock` or `unlock` act through the one
   sender (`board/boards/board-edit.ts` `lock`) and the toast says what it did (`LOCK_DONE`).
2. **"Locked"** follows the board's name and version in the toolbar while it is locked
   (`shell/LockedChip.svelte`): a quiet chip ringed in `--vb-line-strong`, the padlock and the word,
   never shortened on a narrow toolbar, its title "Locked: unlock to change it". A visually hidden
   polite live region beside it, outside the toolbar's flow, announces a lock from another tab.
   Styles: `styles/lock.css`.
3. **Paused in place** (`board/boards/lock-flow.ts`). After every batch and switch `apply` reads the lock
   from the folded ledger through the action layer's `boardLocked` and sets `data-locked` on the world
   and the status's `locked` (`board/status.ts`). The elements pause their own controls from `BoardState.locked`
   (`NodeState.paused`, `RegionState.paused`; `packages/ui/src/paused/paused.ts` `pauseControls`,
   `paused.css`): the review buttons, the size control, the note pin, a proposal's Accept and Reject,
   the layout icons, the widths switch, the grip, Comment, the note's Edit and Remove, Reset places,
   Put container back and Remove access stay in place and in the tab order, `aria-disabled` and
   `data-paused`, in the quiet ink with no hover or press; a pressed answer and the checked layout keep
   their colour; the cog still opens. Send to agent is disabled with the reason as its title
   (`SendButton` `paused`); the selection bar's Comment, Move to and Reset places are disabled.
4. **A press says why and writes nothing.** The stage's handlers that act (versions.ts `ACTING` but
   the flag, and the widths switch) toast "Locked: unlock to change it" and do nothing (`guard`; a
   drag's later moves stay quiet); the note bubble doesn't open (`notes.ts` `paused`); and the sender
   asks `refuse` before every line, with the action layer's `passesLock`, so a path the page doesn't
   guard is refused there, and the server refuses it again (423 `locked`).
5. **The flag stays usable** (ruling 4): the person's private mark changes nothing an agent reads,
   so its button and Shift+F work on a locked board (`passesLock`).
6. **The chat**: messages still go; the composer's chip carries no answers on a locked board
   (`chat-bridge.ts` `boardContext`), as the server sends none (api.md 140).
7. Tests: `tests/pages/lock-board.spec.ts` (the menu row by mouse and keyboard, "Locked", every
   paused control aria-disabled, a press on a button, a key, a note, a layout and the selection bar
   saying why and writing nothing but seen lines, the flag by click and Shift+F, a lock from another
   tab, the flag off, axe light and dark, the gallery section's screenshots);
   `packages/ui/tests/node-paused.test.ts`, `apps/board/tests/board-edit.test.ts` and
   `chat-bridge.test.ts` for the pure parts. The gallery's lock section (`gallery/lock-section.ts`)
   draws both menu rows, "Locked", a locked container and its cards, and Send paused.

## Remove cards and containers (N24)

Task `cortex-tasks/board/2026-10-12_board-app_person-removes-cards.md` (rulings 1-5; api.md 141-142),
behind the `personRemove` flag (on by default; `?flags=-personRemove`).

1. **Remove** is the selection bar's command `remove` (`board/input/commands.ts`), between Reset
   places and Zoom: the button reads "Remove" and its tooltip and accessible name "Remove the selected
   card · Delete" over one card, "Remove the selected cards · Delete" over several
   (`selectionButtons`); Delete or Backspace run it on the selection (the key bubble lists them). A
   card has no menu of its own: selecting it (a click, or Space on a focused card) gives it the bar.
2. **Remove container** ends a container's settings menu (the cog; `RegionFrameOptions.remove`,
   `data-remove-region`), after Reset places and Put container back; never on Later. The menu's
   Up and Down move between its rows, Home and End to the first and the last (`region-row.ts`).
3. **The confirm** is the shell's `ConfirmDialog` (Cancel focused first), with the words of
   `packages/actions/src/answers/remove-words.ts` (`cardsWords`, `containerWords`): "Remove card 4 'Venue lead time'?", "Remove 3 cards?" with the cards
   listed (`ConfirmList`), "Remove container 'Notes' and its 3 cards?" with its cards listed; the body
   says they leave the board and stay in its history, then warns of each card still owed an answer
   ("Card 4 still has an unanswered comment.", more than three in one sentence) and of the
   container's unanswered note (the action layer's `owedNotice`). Confirmed, `board/cards/remove-flow.ts`
   sends the person's `retire` line through the one sender (`sender.ts` `retire`, `retire_cards`); the
   toast says what went ("Removed card 4"); the cards leave the selection, focus that was on them goes
   back to the board, and the container shows "N retired" (retiredMarker flag).
4. **Paused** like every control that changes the board: hidden while a past version shows (the bar
   leaves out acting commands; the settings are hidden), and on a locked board the bar's button is
   disabled and Remove container is paused in place (`data-paused`, `aria-disabled`); a press on it
   says "Locked: unlock to change it" (`removeRegion` is in `ACTING`), and the sender refuses the line
   anyway (`passesLock`).
5. Tests: `tests/pages/person-remove.spec.ts` (one card by the bar, a selection by Delete with an
   owed card and Cancel, a container by its menu, keyboard throughout, a past version, a locked board,
   the flag off, axe light and dark with the confirm and the menu open, the gallery section's
   screenshots); `packages/actions/tests/remove-words.test.ts`, `retired-markers.test.ts`, `retire.test.ts`;
   `apps/board/tests/retired.test.ts`, `api-person-retire.test.ts`. The gallery's section
   (`gallery/remove-section.ts`) draws the settings menu open, the same on a locked board, and the
   three confirms from the fixture ledger.

## Go to card and search (go-to-card task, SEARCH_02)

Task `cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md`, behind the `goToCard` flag (on
by default; `?flags=-goToCard`: digits do nothing and the key list leaves it out).

1. **A digit opens the box.** With focus anywhere on the page but a text field, dialog or card
   popover (`keys.ts`), a digit is the `go-to-card` command (`commands.ts`, keys 0-9, listed under
   Board as "Go to a card by its number", `0–9`); `selection-flow.ts` hands it to `go-to-card.ts`
   `createGoTo`, which opens the "Go to card" box (`shell/GoToCard.svelte`, `styles/go-to-card.css`)
   at the board's bottom right, holding that digit, with focus in it. It works with or without a
   card selected or focused, and in a past version. In a note's text field a digit is text.
2. **The box** is a labelled text field (headed and named "Go to card"; "Find a card" with search, item 7; `inputmode="numeric"`, digits only, at most
   `GO_DIGITS`), a hint (Enter go · Esc close) and a polite status line that says what a go found.
   Enter goes; Backspace edits; Esc closes, as does focus leaving the box (not the window losing
   it), and focus goes back where it was. Nothing goes by itself: with the `goAfterPause` flag (off
   by default) a pause of `GO_PAUSE` (1 second) after the last digit goes too. States: typing, not
   found, retired; the field has the shared hover and focus looks.
3. **Arriving.** `goTarget` (`packages/actions/src/answers/go-target.ts`; `packages/actions/tests/go-target.test.ts`)
   reads the number through `idOf` on the state the board is drawn from. A card drawn with that number is selected (`selection.select`, as a click is) and
   focused (`focus.ts`); the board pans only by `viewport.ts` `revealPan`'s rule (`Viewport.reveal`,
   review polish FE_05: a card that fits comes fully in when any of it is outside, a bigger one only
   when none of it shows), and the zoom stays. Z then zooms to it.
4. **Not there.** A number the board never gave: "No card 99", the box stays open. A retired card:
   "Card 7 was removed" with a "Show v42" button (named "Show v42, where it last appeared") that
   opens the version where it last appeared, read-only, with the answers as they stood just before
   the retire, as the container's retired marker does (`packages/actions/src/answers/retired.ts` `lastShown`, shared with
   `retiredCounts`), then goes to the card there. Without the versionView flag it only says so. A
   card on the board but not drawn (hidden with the answered cards, H): "Card 4 is hidden with the
   answered cards (H shows them)".
5. Tests: `apps/board/tests/go-to-card.test.ts` (digits, Enter on a card, an unknown number, a
   retired card, a hidden one; Esc; Backspace; the timed go), `key-help.test.ts`;
   `tests/pages/go-to-card.spec.ts` (1 2 Enter on an off-screen card: selected, focused, panned in,
   zoom unchanged; no pan on screen; No card 99, Backspace, Esc, a click outside; a note's text field;
   a retired card's offer by keyboard; the pause flag; the flag off; the key list; axe light and
   dark; the gallery section's screenshots). The gallery's section (`gallery/go-to-card-section.ts`)
   draws the three states from the same state code.
6. **Finding keeps marks** (`findKeepsMarks` flag, on by default; the maintainer's ruling 322 in
   `cortex-tasks/board/2026-10-28_board-app_search-and-finding/`). Looking for a card is not reading
   it: going to a card by Go to card, the "N new" list, the open list or a chat chip's reveal selects,
   focuses and shows it but never marks it seen, so its NEW or "N updates" tab, the toolbar's count and
   its container's pill stay. Every one of those goes through `go-to-card.ts` `to`, which ends in the
   controller's `arrive`: `selection.select(ids, 'only', 'find')` (`selection.ts` `SelectBy`, carried
   on `SelectionChange.by`), and `update-flow.ts` `saw` reads it. The conditions table states which
   selection clears what: `conditions.ts` `clearsOn(kind, by)` is true only for the person's own
   select (`SelectedBy` `select`), never for a `find`, whatever a row's `clearedBy` names;
   `seenOnSelect(c, by)` reads it, so no list of kinds lives in the page. The person's own click on the
   card (also on one already selected), a lasso or Space, and every act (✓, ✗, a note, Accept, Reject)
   still clear them. Off, a found card is marked seen as a selected one is. Tests:
   `packages/actions/tests/updates.test.ts` (a find marks nothing; the person's select marks both),
   `apps/board/tests/selection.test.ts` (the change carries `by`), `tests/pages/find-keeps-marks.spec.ts`
   (each finder keeps NEW and "1 update", the count and the ledger; a click and an act clear them;
   the flag off is today), `tests/pages/fresh-cards.spec.ts` (the "N new" list).
7. **Search** (`cardSearch` flag, on by default; SEARCH_02 in
   `cortex-tasks/board/2026-10-28_board-app_search-and-finding/`, the maintainer's ruling 317; off:
   the digits-only box above, and `/` does nothing). The same box takes words: `/` (the `go-to-card`
   command's other key, `commands.ts`; listed under Board as its own row, "Find a card by its words",
   `KeyHelp.svelte`) opens it empty, headed and named "Find a card" (`shell-go-to-card.ts`
   `findACard`), the field saying "Card number or words". Digits alone still go by
   number. Words are searched by `go-to-card.ts` `createMatches` with `#search` `search` over an index
   built once per state change (`GoSearch.key`, the controller's held data) from `#actions`
   `boardSearchDocs` on the view drawn, cards not drawn left out: words in any order, part of a word,
   case and accents ignored, best first (`packages/search/README.md`). Matches carry `data-found`
   ("match", or "current") and the world `data-search`, written only where a mark changed; the box's
   polite status says one sentence, the count then the current one's card and the parts that matched
   ("2 of 3 · card 12, in the title and a note", `board/words/go-to-card.ts` `matchAt`, its count drawn
   bold), or "No matches" (nothing ringed or dimmed). ↓ and ↑ in the field step, wrapping, and bring the match in by `revealPan`'s rule
   (`GoSearch.reveal`), selecting nothing; typing never pans. Enter goes to the current match by the
   finding path (`arrive`, item 6: NEW and updated kept), closing the box; Esc, focus leaving, or a
   go chosen elsewhere (`to`) clears every mark; an empty box clears them and stays open. A redraw
   while it shows searches again on the cards drawn now, the current match kept (`GoTo.refresh`). The
   page draws the box for words when the board's `GoTo.words` says so. Look (`styles/board.css`,
   tokens only): a thin amber ring (`--vb-state-context`) on matches; the current one twice as thick,
   with a second amber ring outside it across a gap of canvas and a soft halo, so it is told apart at
   any zoom; every width the same on screen at any zoom (`--vb-zoom`); every other card, the containers,
   the connectors and their markers dim to 0.35 opacity, never hidden; dimmed text is decoration. Rings
   measured on the canvas (`tests/pages/search.spec.ts`, which also checks the current one's ring is
   thicker and its shadow differs): Lc 56.6 light, 63.7 dark (tier 30). **Under a host:** the box is
   the standalone page's (`shell/GoToCard.svelte`, drawn from `status.go`), so the controller gives
   `createGoTo` its `search` only where the page draws it, `host.page` (the standalone shell's own part,
   `host.ts` `BoardPage`; a host leaves it out). Under a host that draws no box, `/` opens nothing, is
   not prevented and stays the host's, and no search state waits for the letters after it
   (`tests/pages/board-host.spec.ts`, "under a host that draws no box"); where it is bound, `/` acts
   only inside the board's root (`keys.ts` `route`, M10). Digits still open the go state under a host
   (no box drawn; digits fire no shortcut). Tests:
   `apps/board/tests/go-to-card-search.test.ts` (open by `/`, marks, count and part, stepping and
   wrapping, Enter, Esc, an empty box, no matches, digits, the index once per change, refresh, `to`),
   `apps/board/tests/keys.test.ts` (`/` in its root), `tests/pages/board-host.spec.ts` (no box drawn, `/` the host's), `tests/pages/search.spec.ts` (each of these on
   a board, NEW and updated kept, the polite status, a redraw, the flag off, the key list, reduced
   motion, APCA and axe light and dark, the gallery section's screenshots), `tests/pages/search-perf.spec.ts`
   (each keystroke on the 1,000-card board inside the one-change budget, nothing drawn again). The
   gallery's "Search the board" section (`gallery/search-section.ts`) draws the box's states and a
   container with rings and dim from the same state code.

## App card (D-047, app-cards FE_01)

What an app is, its folder, the panel protocol and the limits are [apps.md](./apps.md); this
section is how the board draws one. Two patterns share the work.

1. **The node pattern draws the card.** For kind `app`, `node-template.ts` `nodeTemplate` draws,
   under the title, the panel slot (`appSlot`) in place of the Markdown body: the frame and the state
   view; and in the footer, after the kind icon, the app status (`appStatus`, card-polish FE_01): Allow,
   or "Allowed ▾" and its one-item menu, Stop app. An app card has a footer even without a number,
   for Allow. An app card takes no size control (whatever `sizeControl` says) and no status word (it
   tells, D-045). With the appCards flag off the page passes `{ appCards: false }` and the card is a
   plain one saying `APPS_OFF` (ruling 13). **The window look** (card-polish FE_04; the `appTitle`
   flag, on; the page sets `data-app-title` on the world, the gallery on its `main`): the card reads
   as the app's window. Its title is drawn in no state (visually hidden, still in the card's name):
   the panel meets the top border, its corners following the border's curve, under the tabs; a
   state without a panel says what is wrong in its own head; zoomed far, the frame's placeholder
   shows the app's title. The footer is the window's bar: a tint of the kind's colour under a
   hairline in it, the card's border a step stronger in it, and between the app status and the quick
   actions the app's name (`appName`, `AppCardView.name`, written in place by `node-app-apply.ts`
   `applyApp`), one line taking the room left, cut with "…" and whole in a tip while cut, on hover of
   the name or while keyboard focus is in the footer, not while the app's menu is open
   (`bindAppNameTip`, the shared hover tip). The title takes no room, so no state moves the card and
   the bar's height never changes (`app-states.spec.ts` "the window look …", with a cut name beside
   Allow on a 282px card; "with the appTitle flag off …"). The state view never draws past the panel's
   room: it scrolls when the panel is too small for it (`node-app.css` `.vb-app-state`).
2. **Its size.** `app-frame-core.ts` `panelSize` is the panel's size: the agent's `app.w`/`app.h`,
   else the manifest's `size`, else the default, held to `APP_SIZE`. `node-app-apply.ts` sets it as
   `--app-w` and `--app-h` through the CSSOM (`applyPanelSize` from `vb-node.ts` `render`, then
   `applyApp` once list_apps names a manifest size); `node.css` makes the card that wide plus its border, whatever its emphasis: the
   panel runs edge to edge inside the border (the slot reaches past the content's side padding, so
   the title, tags and notes keep theirs; `app-cards.spec.ts` "end to end: …" and
   `app-states.spec.ts` "every state the app host gives…" check its sides meet the border within
   1px). The slot is the panel's size in every state (`node-app.css`: a state without a panel hides
   the frame and keeps its room, and draws its view over it), and Allow is in the footer, so a state
   change, or the frame coming and going, never moves the card: one size for every state
   (`tests/pages/app-states.spec.ts` "every state the app host gives…", "loading: …"), and Allow, a
   code change and Stop app keep it (`app-follow.spec.ts` "Allow, a code change and Stop app leave
   the card's size as it was…"). Only a new size moves it. A card with no `w`/`h` of its own is
   the default size until list_apps first gives the manifest's, then takes it. After that it
   keeps its size while app.json has problems or the folder is gone: list_apps still sends a good
   `size` from a broken app.json (`server/apps/manifest.ts` `AppFolder.size`), and the page keeps the
   last size when none comes (`app-state.ts`). Proven by `api-apps.test.ts` "finding 25: …" and
   `app-follow.spec.ts` "a card with no size of its own keeps its box…".
3. **Its states.** `node-app.ts` `appView` turns what the page knows into one of
   `APP_CARD_STATES`: the page passes `CardConditions.app`, `{}` until list_apps has answered
   (`checking`), then `{ info }` with the app as list_apps gives it (the app host's one state
   function, ruling 11), and `{ info, past: true }` on a past version (the size stays the app's).
   `nodeState` returns it as `NodeState.app`, and its `words` end the card's name.

   | State | Shows |
   |---|---|
   | `checking` | "Loading…" in place of the panel |
   | `needs-approval` | the panel; Allow in the footer, its tip "Not allowed yet" |
   | `changed` | the panel; Allow in the footer, its tip "Code changed" |
   | `ready` | the panel; "Allowed ▾" in the footer once the person allowed this version, else nothing |
   | `missing` | "App <id> not found" and Check again in place of the panel |
   | `invalid` | "This app has problems", the problems (a list that scrolls, a tab stop) and Check again |
   | `broken` | "This app stopped" and Restart |
   | `past` | the app's title and "Apps don't run in past versions." |

   The words are in `packages/ui/src/words/node-app.ts`, laid out by `node-app.ts` `COPY`; `appView`'s `control` (`allow`, `allowed` or `none`) says
   which footer control shows, and `reason` is Allow's tip. `node-template.ts` `appStateMarkup` draws
   the view. `node-app-apply.ts` `applyApp`, from `vb-node.ts` `update`, applies it in place (the view
   rebuilt only when it changed, the footer's control shown and named, its menu closed when
   "Allowed ▾" hides, the footer's name) and unloads the frame in any state without a panel.
4. **Its buttons** carry `data-app-act` for the page's delegated listener: `app-allow` and
   `app-revoke` (the action layer's acts: the person only, confirmed by the page) and `retry`
   (Check again, Restart: the page reads list_apps again). Each is named with the app; Allow's name
   ends with its reason ("Allow app: Calculator. Not allowed yet"), so a screen reader hears why.
   "Allowed ▾" (`data-app-menu`, "App allowed: Calculator") is a menu button: the page opens its menu
   upward over the panel, in the board's menu look, focuses Stop app ("Stop app: Calculator") and
   handles its keys with `#ui` `menuKeydown` (`apps/app-cards.ts` `createAppMenus`; Esc gives
   focus back to the button). While an act is in flight its footer control is `aria-busy` (loading)
   and when it is refused `data-error`, until the next press. The footer's controls and the state
   view's buttons hide at far zoom as the quick actions do. A state change that takes the focused
   control away leaves focus on the card (`node-app-apply.ts` `applyApp`; `app-follow.spec.ts` "a state
   change that takes the focused button away leaves focus on the card"). Stop app, then Allow again:
   `app-cards.spec.ts` "Stop app (in "Allowed ▾"'s menu) asks first…".
5. **The app-frame pattern draws the panel** (`packages/ui/src/app-frame/`): `<vb-app-frame>`
   (`vb-app-frame.ts`), the DOM-free protocol (`app-frame-core.ts`), `app-frame.css` and its
   `pattern.json`. Its inputs are `data-app`, `data-label`, `data-w` and `data-h`; unloaded it is a
   light placeholder with the app's icon and title. The page calls `wire({ callTool, saveState?,
   loadState?, look?, onEscape?, onLoad? })` once (`onLoad` on each load of the frame's document), then `load()` the
   first time the card is on screen and near enough to use, `freeze()` while it is off screen or
   zoomed far and `thaw()` when it is back, and `unload()` only for the page's cap or a state with
   no panel (D-050, superseding ruling 14). `load()` makes the `<iframe>`: `sandbox="allow-scripts"`
   and nothing else, `src` `APP_PANEL_PATH` + the id (packages/format: the server's route reads
   the same string), `title` the app's name, no referrer. The frame stays hidden (so it neither shows nor takes focus) until the panel says it is ready, or
   `SHOW_AFTER_MS` after it loaded. Left out, `look` is `readLook` (the board's tokens resolved
   through a probe, light-dark() included, and the theme from the card surface) and Esc focuses
   the card. `lookChanged()` tells a ready panel the theme changed. `freeze()` keeps the panel
   running and what it holds, and marks the element `data-frozen` and `inert`: `app-frame.css`
   leaves the frame unpainted (`visibility: hidden`) and shows the placeholder, whatever
   `data-state` says; focus in it moves back to the card. `unload()`, also on disconnect, removes
   the frame and moves focus in it back to the card.
6. **The protocol** (`createAppBridge`; apps.md § The panel protocol). The element hands the core
   every message its window gets, marked as the frame's only when `event.source` is this frame's
   window and `event.origin` is `"null"`; it posts with `'*'` (an opaque origin cannot be named).
   The core checks each message as JSON-RPC 2.0 (`parsePanelMessage`), answers `ui/initialize`
   with the host context (`hostContext`; `hostInfo.version` is `LEDGER_FORMAT`), takes `ping`,
   forwards `tools/call` to `callTool` and answers by the request's id, calls `onEscape` on
   `ui/notifications/escape`, and posts nothing of its own before `ui/notifications/initialized`;
   then `host-context-changed` carries only the parts that changed. Errors use `PANEL_ERRORS`:
   -32000 carries the problem code in `data.problem`, the plain words `PROBLEM_WORDS` in `message`
   and the server's words in `data.detail`. A panel may send `APP_LIMITS.panelMessagesPerSecond`
   messages in a second and keep `FRAME_CALLS` tool calls waiting (the host's running plus queue);
   past either, a request answers `app-busy`. A panel that sends `ui/initialize` again (it
   restarted) gets no answer meant for the one before. The board's own `vision-board/save-state`
   (app-state-kept FE_02) is checked by `app-frame-state.ts` `checkSave` (params `{ state }` only, as
   the schema's `$defs/save`; `appStateProblem` for JSON and size), handed to `saveState` as JSON
   and answered `{}` once that settles, else -32000 with `SAVE_WORDS` and the page's
   problem; with `loadState` given, the `ui/initialize` answer waits for it and carries its value
   as `hostContext[APP_STATE_KEY]` (left out when none or when it fails), and only there
   (`packages/ui/tests/app-frame-state.test.ts`).
7. **Accessibility** (rule 5, ruling 15). The frame's title names the app. Tab goes from the card
   into the panel and on out of it in the page's order; while focus is in the panel the frame
   draws the focus ring, since keys then go to the app and not to the board's shortcuts (the
   element marks it `data-focus-in` from the window's blur and focus: Chromium never matches
   `:focus-within` on a frame of another origin). Focus a click brought in draws no ring, as on a
   card (`data-pointer-focus`, from the page's `focusCame` in `pointer-focus.ts`, passed to `wire`;
   `app-cards.spec.ts` "the panel's focus ring"); Tab into the panel always draws it (WCAG 2.4.7). The board cannot see keys inside the panel, so Esc back to the card needs the panel to send
   `ui/notifications/escape`. The card's name says its app state (", not allowed yet"); the
   placeholder and icons are hidden from assistive tech; `aria-busy` marks a slot or frame still
   loading. A frozen frame is `inert`: no click, no focus, out of the tab order
   (`app-alive.spec.ts` "a frozen panel takes no click and no Tab…").
8. **The page's part** (app-cards FE_02, `apps/board/src/board/`): `main.ts` imports the page's
   stylesheets (`styles/page.ts`), which take `node-app.css` and `app-frame.css` in with the other
   pattern styles through `#ui/styles.css`; the controller makes `app-cards.ts`
   `createAppCards` behind the appCards flag (off: the card set renders `{ appCards: false }` and
   nothing below runs).
   - **State**: `app-state.ts` `createAppStates` holds the one copy of list_apps' answer (io.ts
     `listApps`), keeping an app's last size while an answer gives none (§ 2). It reads it when a ledger that names an app is loaded, when a line draws an app
     card or allows or stops an app, after Allow and Stop app, on Check again and Restart, when
     a tool call is refused with a problem that says the state moved (`needs-approval`,
     `app-invalid`, `app-not-found`, `app-failed`, `app-timeout`), when a selection change selects
     an app card (one read for all of them), and when an app card's frame loads (the frame's
     `onLoad`: its panel, or the panel route's 404 once the folder went). No timer: an edited
     `tools.mjs` shows "Code changed" once the card is selected, before any call, and a deleted
     folder shows "not found" once the card is selected (`app-follow.spec.ts`; a kept panel never
     loads again by itself, D-050). Reads made
     meanwhile share one more read. A new answer redraws the board, which updates and measures only
     the cards whose state changed.
   - **Conditions**: `card(n)` gives an app card `{ app: {} }` until list_apps answers,
     `{ app: { info } }` after, and `{ app: { info, past: true } }` on a past version, so it keeps
     the manifest's size (`app-states.spec.ts` "a past version: …").
   - **Frames** (D-050, superseding ruling 14; app-state-kept FE_01): after every draw
     and every pan or zoom (`draw.ts` `placed`), `place` wires each app card's `<vb-app-frame>` once
     (`callTool` → io.ts `callAppTool`, which rejects with the problem's code and words; `saveState`
     and `loadState` → `panel-states.ts` `createPanelStates` for the card's board, number and app;
     `onEscape` focuses the card without scrolling). While its state shows a panel, its card is on the visible
     stage (`offscreen.ts` `viewBounds` with no margin) and the zoom is not `isFar` (`viewport.ts`,
     under `FAR_K`), the frame is loaded (the first time) or thawed; off the stage, hidden or zoomed
     out past `FAR_K` it is frozen, never unloaded. It is unloaded in a state without a panel, when
     its card goes, and for the cap: past `LIVE_PANELS` loaded, `overCap` picks the least recently
     on-screen frozen ones (a panel on screen never goes; `apps/board/tests/app-live-cap.test.ts`).
     A new version of the card keeps a loaded frame where it is (`node-app-apply.ts`
     `renderKeepingPanel`, from `vb-node.ts` `render`: the frame and the elements it sits in stay
     and take the new markup's attributes, since an `<iframe>` taken out of the page reloads), and
     the card set never moves a card already in the page (`card-numbers.ts` `readingOrder` sorts by the
     card's number, which never changes).
     `app-alive.spec.ts` proves a panel keeps what it holds, loaded once, through a far zoom, a pan
     two screens away, a new version, a relayout, a selection and a new size.
   - **Saved panel states** (app-state-kept FE_02; apps.md § Saving the panel's state):
     `panel-states.ts` holds each card's latest saved value in memory at once and writes it through
     io.ts `savePanelState` `SAVE_DELAY_MS` after the last save, one write in flight per card, the
     latest winning; each save is answered by the write that carried it. A starting panel gets the
     card's value from memory, else from one io.ts `panelState` read waited for at most
     `LOAD_WAIT_MS`. A refused save goes back to the panel only: the person sees nothing
     (`apps/board/tests/panel-states.test.ts`; `app-alive.spec.ts` "a panel gets back what it saved
     after a page reload…", "the panel the cap unloaded starts again…", "a save the server refuses…").
   - **Theme**: `watchTheme` (the root's `data-theme` from the toolbar, and the system's scheme)
     calls `lookChanged()` on every frame, so a ready panel gets `host-context-changed`.
   - **Buttons** (`data-app-act`, one delegated click on the stage): Allow and Stop app ask first,
     as `ACTIONS[...].needsConfirmation` says (`src/board/words/app-cards.ts` `appAsk`), go through the one sender
     (`app-allow { app, hash }` with list_apps' hash; `app-revoke { app }`), read list_apps again,
     put focus on the card and say what was done in the toast (`appDone`). Check again and Restart
     read list_apps again and say what they found (`retryDone`); focus moves to the card when the
     new state took the button away.
   - **Keys**: the key list's Items has "Leave an app" (Esc) with the flag on (`key-help.ts`).
   - The gallery's `app-section.ts` (appCards flag) runs the example's panel live in a card, wired
     the same way, from the served project's `.visionboard/apps/calculator/`.
9. **Kept true by**: `packages/ui/tests/app-frame-core.test.ts` and `app-frame-limits.test.ts`
   (every protocol rule, with fake windows: `app-frame-harness.ts`), `packages/ui/tests/node-app.test.ts`
   (every state's view, words and markup), `node-template.test.ts` (the footer), and the gallery
   (`apps/board/src/gallery/app-frame-section.ts`: the frame unloaded and loading, an app card in
   every state, the footer's app status loading, refused and with its menu open, the window look with
   a cut name and its tip, the flag off), which `tests/pages/gallery.spec.ts` checks has samples. The element
   and the page's part in a browser: `tests/pages/app-cards.spec.ts` (end to end, the keyboard, a
   code change, Stop app, the flag off), `app-states.spec.ts` (every state, on and off screen, far
   zoom, a past version), `app-safety.spec.ts` (opaque origin, CSP, other windows' messages) and
   `app-gallery.spec.ts`; the words: `apps/board/tests/words-app-cards.test.ts`, `key-help.test.ts`.

## Images in cards (D-048, app-cards FE_03)

The files, the path rules and the route are [images.md](./images.md); this section is how the page
draws an image. Three patterns share the work, behind the `cardImages` flag.

1. **The Markdown pattern writes the image** (`packages/ui/src/markdown/image.ts` `imageMarkup`). For
   `![alt](path)` it calls `imagePathProblem` (packages/format, the one path check): a path it passes,
   with alt text, is one fixed `<img class="vb-md-img" src="/board-images/<path>" alt="…" loading="lazy"
   decoding="async">`; a path it refuses is the box saying why (`imageNote`: "Image not shown: <path>
   (<reason>)", the reason in `IMAGE_WORDS`' words), so nothing outside the images folder, and nothing
   from the internet, is ever asked for; no alt text is the path as plain text. The alt text is the
   description's words, marks dropped. With images off it is its source text, as before. An svg is
   this same `<img>`, never inline markup, so its script never runs (D-064, images.md § SVG); with
   the `svgImages` flag off its path is refused ("only png, jpeg, webp or gif").
2. **Images on or off.** `renderMarkdown`'s `images` option, else the page's choice: `setMarkdownImages`
   (render.ts), called once by `apps/board/src/main.ts` and the gallery's `main.ts` with the `cardImages`
   flag, so every surface that renders Markdown agrees (card bodies, notes and replies, the note bubble,
   parking text, the chat). `setMarkdownSvg` (image.ts) is set beside it with the `svgImages` flag;
   until then it reads the flag's default.
3. **Its look** (`markdown.css`): never wider than what holds it, its own aspect ratio, at most 1.5 card
   widths tall (`--vb-card-w-s`; the zoomed view shows it whole), centred. Until its size is known it is
   a sunken box at the full width, 16 by 10, with nothing drawn in it (a transparent picture stands in
   for the missing one, so no alt text and no broken-image mark).
4. **The page's part** (`apps/board/src/board/cards/card-images.ts` `createCardImages`, made by `draw.ts`):
   - *Holding back*: a card's images (body, notes, replies, its boxes) lose their `src` when the card is
     drawn and keep their path in `data-path`; one in the card's body (not in a link) becomes the
     button that opens it (`imageButton`). After every draw, pan and zoom, in the next frame (once a
     board just opened has its view), an image loads only if its card is within a screen of the visible
     stage (`offscreen.ts` `viewBounds`, `outside`) and the zoom is not `isFar` (ruling 23).
   - *Version*: before it loads, the route is asked which version the file is (`io.ts` `imageVersion`,
     a HEAD; the route is not an API operation, so this is the page's one request for it by code), and
     the picture loads at that version (`?v=<ETag>`), so the page knows what it shows. A refused file
     (404, 413, 415) gives its place to the box with the route's own words (`showProblem`, the GET's
     problem `detail`); "not found" reads "Image not found: <path>". A picture that will not draw after
     the route served it says the route's reason, else "not a real <type>".
   - *Updates, no polling* (ruling 21): selecting a card (`draw.ts` `restate` with the cards just
     selected) and opening an image ask again with the shown version's ETag (`If-None-Match`): 304
     changes nothing; a newer version is loaded out of sight (`decode()`), then swapped into every image
     of that path and the open view at once, so nothing flickers. Nothing asks on a timer.
   - *Measuring*: a picture that loads or swaps sets its `width` and `height` (kept per address, so the
     card drawn again keeps its height at once) and its card is measured again alone, in the next frame
     with any others (`draw.ts` `resized`: only when a height changed are the containers laid out and
     placed again, layout-cache.ts keeping the rest).
5. **The image-view pattern** draws the button, the box in an image's place and the zoomed view
   (§ Image view).

## Image view (D-048 ruling 22)

`packages/ui/src/image-view/`: `image-view-core.ts` (no DOM), `image-view-template.ts`, `vb-image-view.ts`
(the element), `card-image.ts` (an image on a card), `image-view.css` and `pattern.json` (flag `cardImages`:
the gallery shows its section only with the flag on).

1. **An image on a card** is `imageButton(img)`: a `<button class="vb-img" aria-haspopup="dialog">` around
   the image, named by its alt text, in the card's tab order; hover, pressed and focus are drawn on the
   picture (which may be narrower than the card). A click (the pointer gives it no gesture: it is a
   control), Enter or Space opens the view. `showProblem(img, path, reason)` puts the box in its place.
2. **The view** is `<vb-image-view>` (the page appends one to the body), a native modal `<dialog>`
   named by the image's alt text: a backdrop (`--vb-scrim`, the board behind softly blurred), the image,
   and the × in the screen's top corner (named Close, tip "Close · Esc", 40px).
3. **Its size** is `fitImage(natural, screen)`: a wide image's width is `ZOOM_SHARE` (70%) of the screen's
   width, a tall image's height 70% of the screen's height, a square's side 70% of the shorter side;
   small images are scaled up to that; the other side is held to the screen. `centred` puts it in the
   middle; it is fitted again when the window or the picture changes.
4. **Its motion** (`flipFrom`): the image is held over its place on the card until the larger picture
   can be drawn (`decode()`), then moves to its zoomed box, and back on close, for `motionMs` of the
   board's motion token (`MOTION_SHARE` 0.6 of `--vb-motion`, 360ms: about 220 ms), eased by `--vb-ease`;
   the backdrop fades with it. Reduced motion sets the token to 0ms (tokens.css), so nothing moves.
   Closing during the opening runs back from where it is.
5. **Keys and focus**: focus goes to the × and stays there (Tab keeps it); Esc (the dialog's cancel), a
   click outside the picture and the × close it; focus goes back to the image's button, or to its card
   if the button has gone (the file went: the page closes the view and puts the box in its place). The
   board neither pans nor zooms meanwhile: the dialog is modal (the board is inert), its keys are
   outside the board's shortcuts (`keys.ts` ignores a dialog), and its wheel is stopped.
6. **The page** opens it (`open(img)`), and hands it a newer version (`swap(src)`); it fetches nothing.
   The gallery's `image-view-section.ts` shows an image in a card in every state (the missing and
   refused ones from the route's own words, so it makes no failing request) and opens the view with
   motion and without it (`open(img, true)`).
7. **Kept true by**: `packages/ui/tests/markdown-images.test.ts` (the shape, subfolders and the depth
   limit, the alt text, no alt text, every refused path with its reason, the box, links, every block,
   images off and `setMarkdownImages`), `markdown-safety.test.ts` ("an image cannot break out of its
   shape…"), `markdown-adversarial.ts` `IMG_SHAPE` (no `<img>` but the fixed shape),
   `markdown-commonmark.test.ts` ("CommonMark: Images"), `image-view-core.test.ts` (`fitImage` at
   1600×1000 and 1470×956, small, square, held to the screen; `flipFrom`; `motionMs`),
   `packages/format/tests/flags.test.ts` (cardImages on by default). In a browser:
   `tests/pages/card-images.spec.ts` (at the card's width and measured with it; 70% by click and by
   keyboard for a wide and a tall image at both screens; Esc, a click outside and the ×, focus back, Tab
   kept, no pan or zoom; a replaced image after select, the conditional request, nothing on a timer;
   opening asks too; motion from the card's box about 220 ms; reduced motion; axe and screenshots light
   and dark) and `card-image-states.spec.ts` (missing, a fake png, over 8 MB, out of the folder, the
   internet, no alt text; the flag off; far zoom and off screen; a file that goes while opening; the
   gallery, light and dark).
