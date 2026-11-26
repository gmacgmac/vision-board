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
  colour through `--vb-kind`, which the element sets from `--vb-kind-<kind>`.
- **The app card** (`app`, D-047, ledger v17) was added that way: `NODE_TYPES.app` only tells (a number, no answer;
  D-099 5: a window, so no Save for later), `KIND_ICON.app` a small window, and
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
  CSSOM: `el.style.setProperty('--vb-kind', …)`, `el.style.transform = …`.
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
  through `--vb-kind`.
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
the one function `renderMarkdown(src, { headingLevel, images, more })` from the `packages/ui` front
door. It is a pattern without an element: `packages/ui/src/markdown/` holds `blocks.ts` (lines into
blocks), `line-starts.ts` (the ATX heading and break scanners), `table.ts` (GFM tables), `inline.ts`
(marks, links, escapes), `image.ts` (what `![alt](path)` becomes, § Images in cards), `render.ts`
(the front function), `markdown.css` (the `vb-md-*` classes, in `#ui/styles.css` beside `node.css`) and `pattern.json` (the subset, the
classes and the safety rules). A template sets its output with `innerHTML`, which is safe because
the renderer escapes every text run; one-line fields (titles, tags) stay plain text through `esc`.
Its tests run CommonMark's own examples (`packages/ui/tests/markdown-commonmark.test.ts`), whose
`EXCLUDED` table is the full list of deliberate differences.

**Heading sizes, tables and breaks** (the `markdownMore` flag, on by default; `renderMarkdown`'s
`more` option, given by whoever renders; off, every heading is the label and tables and breaks
stay text, exactly as before). Proven by `packages/ui/tests/markdown-more.test.ts` unless named:

- `#` draws large (`vb-md-h1`), `##` medium (`vb-md-h2`), `###` to `######` the small label
  (`vb-md-label`), all `role="heading"` at the caller's `headingLevel` (`render.ts` `heading`). The
  two larger sizes sit one and two type-scale steps above `--vb-md-text`, so they grow in a popover
  (`markdown.css`; `tests/pages/markdown-more.spec.ts`).
- **Big titles** (the `bigTitles` flag, on by default; point 437). The card's title is its one heading.
  A card whose body has structure, a `#` or `##` heading or a table as the renderer drew it, shows its
  title at the `#` size and weight (`--vb-text-xl`, `--vb-weight-bold`, point 442: the headline over a bold
  `##`; `node.css`, `.vb-node-content:has(…) > .vb-node-title`), and in
  that body `#` draws at the `##` size (`markdown.css`, `--vb-md-step`), `##` too, and `###` stays the
  label. The structure is read from the renderer's output with `:has()`, so nothing parses the body
  twice and a redraw updates it. A card whose only heading is `###`, a plain card, and a `#` in a note
  or popover are unchanged. The board's world and the gallery's main carry `data-big-titles` (the
  controller's flag-attribute list). Off, every title is medium (size and weight) and `#` large
  (`tests/pages/big-titles.spec.ts`: sizes and weights, on and off).
- A GFM table: the paragraph's last line is the header, then a delimiter row with as many cells
  (colons give each column's alignment), then rows until a blank line or another block; inline
  Markdown in cells, `\|` for a pipe (`table.ts` `splitRow`, `delimiterRow`, `tableHtml`; GFM's
  examples 198-205). At most 4 columns (`MAX_COLUMNS`); 5 or more stay text. The table is its
  holder's width, laid out as a grid with one `minmax(0, auto)` track per column (`markdown.css`
  `.vb-md-table`; the rows `display: contents`, the roles still table, row, columnheader and cell), so a
  column of short words or numbers takes just its width and the columns of sentences share the rest;
  cells wrap and a word breaks only when it alone is wider than its column (`overflow-wrap:
  break-word`). It never overflows or scrolls, at L or at S, and short words stay whole
  (`tests/pages/markdown-more.spec.ts`, "follow their content").
- A card whose body has a table is L by the auto rule (`packages/layout` `measureBody`, `autoTier`;
  `packages/layout/tests/size.test.ts`); the agent's suggestion and the person's pick still win. The
  two packages may not import each other, so the page suite holds their table rules equal
  (`tests/pages/markdown-more.spec.ts`, "agree on what is a table").
- `---`, `***` or `___` on a line of its own is a thematic break, one line (`vb-md-rule`;
  `line-starts.ts` `thematicBreak`; CommonMark's Thematic breaks section). Setext headings stay
  unsupported, so `---` under a paragraph line is a break.

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
  A card or frame the gallery draws in more than one sample takes ids of its own, as a mount does
  (`gallery/dom.ts` `ownIds`, passed as `idPrefix` to `render`; `mini-board.ts` and the proposals notice's `ids` likewise), so no id is on the page
  twice; `gallery.spec.ts` "no id twice on the page" proves it, with every reference pointing at an id.

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
send", api.md 123; with the host's chat's agent, `BoardChat.status.agent`, only what it may read, api.md 170), and the new and updated cards with the fresh containers (`freshCards`,
`container.fresh`, api.md 158);
`attention.ts` runs it after every batch and on every switch, decides what is news (a request or a
drawing line in the batch), and sends the board seen that ends the marks. Components only render.

The rule: **a check needed twice is a row**, never a local check. A new kind without a row is a
type error, and each table has a coverage test that fails when a row has no test case.

## Feature flags (rule 12)

A refactor that keeps the look and behaviour needs no flag. A new mode, node type or behaviour
ships behind one. The pattern was defined by the first such task (U7, node size):

- **One definition**: `packages/format/src/flags.ts` holds `FLAGS` (name → `{ default }`),
  and the sentences are in `FLAG_DESCRIPTIONS` in the same file (typed `Record<FlagName, string>`, never imported by the page).
  `format` because every layer may read it (D-016). Adding a flag is one entry in each table, and the type fails on a missing
  name; removing it, when its behaviour becomes the default, is deleting both entries and its checks.
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
  gallery's entry point), and passed down as data (`render(n, { appCards })`, a tier for `nodeState`), so
  packages never read the address or storage. Pure packages (`layout`) take the result as input.
  `cardImages` and `svgImages` are no different: `board/host.ts` `markdownOf` reads both from the host once
  per board and passes them to every surface that renders Markdown (§ Images in cards); there is no
  module switch (M12).
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
  (`mount.ts` `BoardControls`: what the board's controls call, and the standalone page's test door; no chat goes through them, and the plugin's folder leaves it out, `plugin/view.ts`, `docs/specification/plugin.md`). `send()` is Send to agent, through `host.chat.send`. `unmount` removes every listener the
  board added on the document or the window, takes the zoomed image view away (`card-images.ts`
  `destroy`), and empties `root`, giving it
  back without the classes and attributes it added. Each mount has its own calls (`io.ts` `createIo`),
  status and controller, so two boards on one page work apart. The ids inside cards and frames (popovers, step
  section, app menu, a frame's menus, the connectors' arrowheads) carry the mount's prefix
  (`board/mount-ids.ts` `takeIdPrefix`: `vb1-`, `vb2-`, ..., the first mount on the board's own page too;
  `NodeTemplateOptions.idPrefix`, `RegionFrameOptions.idPrefix`), so no id repeats on a page and an
  `aria-controls` never points into another board. `pageChip` is `#actions` `boardChip` for the board on
  show (null with none shown, or an archived one); each time it would change (by board, title or detail, not head),
  `mount` calls the host's optional `pageChanged` (`tests/plugin/page-changed.spec.ts`). Proven by `tests/pages/board-host.spec.ts` (a fake
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
  and the keyboard-or-pointer reading (`canvas/pointer-focus.ts`, no action). An open layer's Esc follows
  the same rule (M21; `packages/ui/src/base/layer.ts` `dismissable`, `escapeIsOurs`): it takes Esc only
  with focus in its board, or nowhere, so a tip under the pointer still closes; with focus in a host's own
  control or another board, the Esc is theirs. Proven by
  `apps/board/tests/keys.test.ts` (inside, outside, another board, Esc, `pageWide`) and
  `tests/pages/board-host.spec.ts` "keys stay inside the board" (focus on a host button and field, then
  a click, a Shift drag, a Cmd or Ctrl drag, a card and a container's title line), and
  `tests/pages/board-guest.spec.ts` "an open layer takes Esc only".
- **A key the board uses is marked used** (M22): `route` `preventDefault`s every key it acts on; a key it
  leaves, Esc with nothing to escape among them (`StageHandlers.escape` says), stays the host's, and typing
  includes `[contenteditable]`. Under a host it listens on the root, not the document, so the mark is there
  before the key reaches any listener of the host's on the document or the window: **a host skips a key
  whose `defaultPrevented` is true**. A modal's keys stop at the root (`mount.ts` `keepModalKeys`): its Esc
  is the browser's, which a `preventDefault` would stop. Proven by `board-guest.spec.ts` "every key the board acts on".
- **What it keeps goes through its host** (M13): `host.store` (`board/host.ts` `BoardStore`, strings under
  keys the board names: `view.<board>`, `proposals-hidden`). The keys say only what is on the board, so a
  host gives each folder or bot its own store, and two boards named "plans" never clash. Left out, the
  board keeps them for as long as the mount (`memoryStore`). The standalone page keeps them per folder and ledger, `main`
  too (`shell/kept.ts` `pageStore`: `vb.view.<board>` in sessionStorage, the rest in localStorage, each key ending `:`
  and `ledgerScope`: the folder's path for its `main` or old layout, the ledger's folder for another; it reads the folder
  before the board mounts, `App.svelte`). A key from before, with no scope, is read once by `main` of the folder open and
  kept under that folder's key from then on (PLAN decision 11). Proven by `apps/board/tests/kept.test.ts` "pageStore:
  each folder's main and each ledger…" and "pageStore: a value from before is read once…", and
  `tests/pages/ledger-memory.spec.ts` (boards `plan` of two ledgers and of two folders' `main`, and the keys from
  before: zoom and the proposals notice). Nothing
  under `board/` touches the page's storage or address (`apps/board/tests/board-no-page.test.ts`).
  Proven by `board-guest.spec.ts` "the saved view goes through the host".
- **Its pictures come from its host's route**: `host.imageRoute`, the address a picture's path goes after,
  what `<img src>` loads and `io/image.ts` `imageVersion` asks; the engine's `image` answers it (api.md 154,
  159). Left out, `IMAGE_ROUTE` on the page's origin. Proven by `board-guest.spec.ts` "pictures load from the host's route".
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
  no head means "catch up"), `chat`, `settings` (`get`, `on`: each flag by name, and `align`),
  `notify(text, tone)`, `confirm({ heading, body, confirm, list })` and, for a page that is the board's
  own, `page` (`BoardPage`: which board opens first, the board opened, starting again, the person's
  cookie, `parts`, the page's own controls in the header, and `help`, the page's own words naming this repo's commands). Without `page` the first board opens and, with
  none left, the board starts again in place.
- **The board's controls** (`board/chrome/`, tracker M8, M27): `mount` draws the whole board in
  `root`: the header, the strips, the reply panel, search, help and the New board, Rename and Archived dialogs
  (`chrome/index.ts` `mountChrome`, `BoardChrome.svelte`), round the stage the cards draw in. They are Svelte,
  compiled inside the plugin's bundle; no Svelte type crosses `host.ts`, and only `chrome/` may import it
  (`checkBoardHost`). Each mount has its own state and ids (`chrome.svelte.ts`, Svelte's context), its flags
  from `host.settings`, notices through `notify` and confirmations through `confirm`. A page's own controls come through
  `host.page.parts` (`BoardPageParts`: Theme, Centre cards, its folder, Chat), each a function that draws into an
  element of the header's taking no room (`.vb-part`); absent, they are absent and the header reflows. The root is
  the containing block (`:where(.vb-board)`, a host's own `position` wins), and the stage keeps its own
  `@container vb-board`, narrower than the root beside a chat. Proven by `tests/pages/board-chrome.spec.ts` (a host's whole board,
  `/` and `?` inside its root and the host's outside it; the page's chat beside them, under the header's menus),
  `tests/pages/board-host.spec.ts` (two boards, no id twice) and `tests/pages/host-styles.spec.ts`.
- **The host's chat** (`board/host.ts` `BoardChat`; the board's side is `board/chat-side.ts` `bindChat`, D-074). The
  board keeps two live chips attached (`chat.attach(key, chip | null)`): `selection` and `answers`
  (`#actions` `selectionChip`, `answersChip`), replaced as they change, none on a past version, taken back at
  `unmount`. Each may carry `preview`; a host may pass any chip through unread, and its `kind` and `ref` go
  to the engine's `resolve` as the message goes. A chip that went is spent until its key's `ref` changes.
  `chat.send(record)` sends what is staged with no words and calls `record(acks)` (the `send` act, with the
  answers' `head` from the ack for this board, `#actions` `acksRead`), unless the host's own server recorded that
  Send with the message; a host with no chat answers `record(null)` (plugin.md § The chat). `chat.status`
  is read only: `now` (idle, working, asking) is all a host need give and drives the status's `chatWork`;
  optional `agent` scopes the answers chip (ignored with the `singleAgent` setting on, `host.ts` `chatStatusOf`), `held` drives `sendWaiting`, and `staged` has the full say over `chatAttached`; with no
  `staged`, a chip of the board's own that hasn't gone with a Send enables it (`chat-side.ts` `markAttached`).
  Optional `chat.reveal` and `chat.hasLine` (each given `{ board, cards: n }`) are a changed card's stepper link
  to the chat's line; without `reveal` there is no link. `BoardView.reveal({ cards })` zooms to cards by number and selects nothing, and
  a `board` the ledger does not hold yet opens when its first line arrives. Proven by
  `apps/board/tests/chat-bridge.test.ts` (with a host that gives only `now`) and
  `tests/pages/board-host.spec.ts` "the chat seam", whose fake host imports nothing from `shell/`.
- **The standalone host** (`apps/board/src/shell/page-host.ts` `createPageHost`): `api` is `fetch` on
  the page's origin, `events` its project stream (`shell/page-io.ts` `watchProject`; a rebuilt page or
  another folder reloads it), `settings` its flags and the viewer's alignment, `notify` the toast,
  `confirm` the shared dialog, `page` its address, the board last looked at and its parts (`shell/page-parts.ts`).
  `App.svelte` mounts the board in a root that fills the page, keeps the chat sidebar level with the stage's top
  (`--vb-chat-top`, a `ResizeObserver` on the stage) and mirrors the status into `shell.svelte.ts`. Its chat is its own
  (`shell/chat-panel.ts`), and reaches the board only through `chat` and `BoardView`
  (`chat-bridge.ts` `createChatBridge`). No file under `apps/board/src/board/` imports the page around
  it, nor, outside `chrome/`, Svelte: `scripts/verify.mjs` `checkBoardHost` fails it (`scripts/verify.test.mjs`).
  The board's folder is in feature folders (`canvas/`, `links/`, `cards/`, `notes/`, `selection/`, `input/`,
  `find/`, `boards/`, `access/`, `apps/`), each with one public file, `index.ts`: code outside a folder imports
  that and nothing else, and `io.ts` is the one way into `io/`. `scripts/verify.mjs` `checkFeatureFolders`
  fails any other path in (`scripts/verify.test.mjs`); a unit test of a folder's inside may reach the inside.
  A function over about 50 lines of its own warns (`scripts/verify-functions.mjs`
  `checkFunctionLength`, proved in `verify-functions.test.mjs`), unless its header says why
  (`verify: long-function <reason>`): `createBoard` does, as the board's composition root.
- **What a host of the built folder implements** is `docs/specification/plugin.md`, which `tests/plugin/` holds on the folder itself.
- **Differences from nclite's draft** (the contract bends to the board, principles § The board is a
  plugin): `confirm` on the host (four actions ask first, one with a list); a change event whose `ref` is
  `{ board, head }`; `api` resolves to the `Response` (the client reads problems itself); `notify` takes a
  tone (`error` for a refusal); `chat` in place of `addToChat`, for chips that come and go, Send and the agent's status; the optional `page` part, `store` and `imageRoute`; the image route is not
  under `api`, since a browser loads a picture by its address; and where the draft has `unmount()` save anything
  being written, the board asks instead: `leave()` asks the person first, then the host unmounts, and
  `unsaved()` serves the host's own question or `beforeunload` (the person decides whether
  half-written words are kept, not the plugin).
- **Shared by every board on a page**: the work counters (`work.ts`), and the custom elements, whose
  `vb-` names are global by nature (`defineBoardElements` defines each once).

## Node size (D-030, tracker U7)

A card has one of three widths. The engine picks one from what the card holds, and the person can
override it from the selection bar or the card's right-click list (D-099 3, DD-10: Width left the node), where
a fourth, XL, is theirs alone.

1. **Tiers** are tokens: `--vb-card-w-s` 280px, `--vb-card-w-m` 360px, `--vb-card-w-l` 464px, and the person's own `--vb-card-w-xl` 600px (`ACT_SIZES` only: an agent's `size` stays s, m, l, `NODE_SIZES`).
   Body text then runs about 37, 49 and 70 characters a line. Cards still grow taller to fit.
2. **Auto tier**, a pure function in `packages/layout` (`sizeTier`), counting the body Markdown
   only (title and tags do not count): `l` if the body is over 480 characters or has a table (the
   markdownMore flag, § Markdown); `m` if it is over 140, or has a code block, or more than 6 list
   items; `s` otherwise.
3. **Precedence**: the person's `size` act, then the agent's `node.size` suggestion, then the auto
   tier. Emphasis raises the result one tier, up to `l`, never to `xl`. The person's `auto` removes their pick.
4. **Where it is applied**: the page sets `data-size` on `<vb-node>` before it measures cards,
   because height depends on width; layout keeps reading measured sizes, so it stays pure (rule 9).
5. **The control**: the selection bar's Width (Shift+W; `apps/board/src/board/selection/bar-acts.ts` `width`, the Move
   to list's look) offers S, M, L, XL and Auto for the selected nodes, one `size` act each; an app node takes none. The node's right-click list has `Width ›` (`node-menus.ts` `contextMenu`, `mark-acts.ts` `width`), which opens that same menu (`bar-acts.ts` `width`) under the pointer: for the card right-clicked, or every selected node when that card is in the selection. The node
   carries no size control; `data-size-picked` says the person picked its width (`vb-node.ts` `updateSize`).
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
2. **The page** has one bubble, owned by `apps/board/src/board/notes/notes.ts`: on a node it is the conversation box
   (item 9), on a container the bubble beside its title line; it follows its anchor through
   `Viewport.onApply` and every relayout; every write goes through the controller's `attempt`.
   **Which card C writes on** is the one the keyboard focus is on (`focusLeads` flag, point 394):
   with two or more cards selected C is the group note only while the focus is on one of them or on
   no card (`commentOnSelection`, `selection/comment-key.ts`, tested in `comment-key.test.ts` and
   `tests/pages/note-key-target.spec.ts`); N and the selection bar's Comment are the selection's
   wherever the focus is. A ✓ or ✗ whose write finishes after the focus has moved on does not take
   it back (`createItemActs` `focusLeft`). Off, C follows the selection and a press always refocuses.
3. **On the node** (`<vb-node>`): no notes are drawn on the node itself (D-099 3); its notes mark counts them, fills when
   an agent's reply is unread, and opens the conversation box (`node-marks.ts` `nodeMarks`, item 9). The box reads the
   thread like a chat, oldest first (review polish ruling 8): note 1, its replies oldest first, note 2..., a reply that
   names no note in its place by time (`seq`) among the notes (decision 8), as `conversation` (`node-notes.ts`) puts
   them once.
4. **Zoomed out.** The `hideControlsZoomedOut` flag (on by default) is the only thing that sets the
   stage's `data-zoom="far"` below `FAR_K` (`viewport.ts`, one constant: 0.55 since review polish
   round 2 ruling 2, the maintainer's pick after trying it, which closed tracker N13; it was 0.75);
   the containers' icon rows, grips, retired markers and holders and an app window's bar buttons are then not drawn, so
   none draws too small to press; a node's edge marks follow the zoom rules instead (§ Zoom groups). Off
   (`?flags=-hideControlsZoomedOut`), every such control shows at every zoom. The toolbar's zoom group shows the level as
   a percentage beside
   Fit (`ZoomLevel.svelte`, rounded down so "55%" means the controls show; `Viewport` decides "far"
   from the same number), its buttons' tooltips say it ("Zoom in · + · 55% now"), and a polite status
   announces it once the zoom settles; the level a board opens at (its first draw's fit or kept place, a switch) is not
   news and is not announced (`tests/pages/zoom-level.spec.ts`, "the level a board opens at is not news").
5. **Popovers share their sizes** (popovers-larger-thread ruling 4,
   `cortex-tasks/board/2026-10-14_board-ui_popovers-larger-thread.md`). Every popover reads the
   `--vb-pop-*` tokens (`packages/tokens/src/tokens.css`): `--vb-pop-text` (every text in a
   popover, 15px: the text typed in the comment box is the size of the text around it; the
   maintainer's changes, chats 698 and 701), `--vb-pop-w` (360px),
   `--vb-pop-max-h` (320px, past which the text box, the read-only part and the boxes scroll) and
   `--vb-pop-pad`. The note bubble, the boxes beside a node (`.vb-card-pop`: proposal and history, item 10) and the
   container note preview (`.vb-note-pop`) all read them, so changing a token scales every popover together. Labels and chips in them are
   `--vb-text-md`; buttons are 32px tall.
   A hover tip stays open while the pointer travels to it (hover-tip-reachable,
   `cortex-tasks/board/2026-10-26_board-ui_hover-tip-reachable.md`): the pointer leaving the anchor or
   the tip waits `CLOSE_GRACE_MS` (300 ms, `closeGrace`, `packages/ui/src/tip/close-grace.ts`) before
   the close, and coming back cancels it; opening, Esc, a press outside, focus leaving and `close()`
   stay immediate. `bindHoverTip` and the container note preview (`region-note.ts`) both use it. Tests:
   `close-grace.test.ts`.
6. **A container's conversation** (review polish rulings 6 and 7, decisions 8 and 9,
   `cortex-tasks/board/2026-10-15_board-ui_review-polish/FE_04_conversation-window.md`). A container's note block
   works as a node's box once did: its note's text and each reply (`.vb-nblock-reply`) report `open`
   (`vb-region-note`), and the bubble opens in `thread` mode beside the part pressed (`notes.ts` `showContainer`,
   `partAnchor`): every note on the container and the replies to them, oldest first, in `conversation`'s order, each
   with who wrote it over its words as Markdown, in one read-only list that scrolls as a whole (`.vb-nb-thread`, a
   labelled group and a tab stop), scrolled to the part pressed (`vb-note-bubble` `reveal`). Read-only (`thread`, and
   `sent`) the bubble has no bottom row: an × in its top corner (24px, named "Close") closes it, as do Esc and a click
   outside (`note-outside.ts`: a drag outside pans and keeps it), and focus goes back to the part pressed. The person's
   note that can still be edited carries Edit, which turns the window into the edit mode for it (Cancel and Save, the
   discard question when words changed). What the bubble says is `note-views.ts` (`containerView`, and `cardView` for
   the edit bubble a node's box opens, from the replies `parking.ts` reads, the `cardReplies` flag).
7. **A note locks once answered** (ruling 5, api.md 143). A note is history after a Send or the
   agent's answer (a reply naming it, or a newer version of its card), whichever comes first. The
   page reads `ItemNote.locked` (from `lockOf`, the server's own check): a locked note is read-only
   in the conversation box ("· Answered" when no Send came yet, no Edit); the box's field then starts a new note. A container note answered before a Send reads "Answered" and is
   read-only in its block.
8. **Times**: each note and reply in the box says when (`node-time.ts` `noteTime`: "Today 09:42", "Yesterday 18:10",
   else `versionTime`). The card-polish FE_02 toggle that put a node's thread away (`notes-hide`, `notes-show`, api.md
   156) is gone with the notes block: the page sends neither act, and lines already written still fold. A history row
   naming a note or a reply opens the node's box at it (`history-flow.ts`, `notes.ts` `show`;
   `tests/pages/card-history.spec.ts`).
9. **The conversation box** (D-099 3, node-overhaul FE_03; the design review of DESIGN_01). A node's notes open one
   box, to read and to write: C, the notes mark, right-click's Comment, a history row and a chat's note link all reach
   `notes.ts` `press` or `show`, which open the bubble in `conversation` mode, its field focused. Its markup is
   `conversation-template.ts` (loaded on first use, `loadConversation`, with the box's page code
   `notes/note-box.ts`, `loadNoteBox`): a compact head (the number chip, the node's title, ×); tabs only when the node
   is in a note on several nodes (this node first, then one per group, "With 28", `boxView`); the thread oldest first,
   each note "User" and each reply "Agent · <name> <id>" on one line (§ The conversation box's lines), a note not yet
   sent dashed and saying "Not sent", and "Waiting for the agent" while the
   latest note went and no reply came after it; a field of one line that grows to three, then scrolls; Ask now and
   Add note sharing the width, their keys in their tooltips. They are two modes (FIX_03 ruling 3): the active one is
   the primary (pink) button and `aria-pressed`, the field's placeholder and name say it ("Add a note about 4", "Ask
   the agent about 4 now"), and Enter does it (`fieldKey`); a press of either button does it and makes it the mode at
   once (`vb-note-bubble` `mode`, `NoteEventDetail.active`); the mode is kept per board for the tab, as its zoom is
   (`controller/ask-now.ts`, `view.box-mode:<board>`), Add note until Ask now is pressed. Cmd or Ctrl Enter is always
   Ask now and leaves the mode. **Add note** writes the note for the board's Send
   and keeps the box open; a node holds one note not yet sent (api.md 59), so later words join it as a `note-edit`.
   **Ask now** writes the words to that note the same way,
   then one `ask` naming it with the page's `askContext` (`kept-view.ts` `askContextOf`, default `board`), apart from
   Send (api.md 188); the board's other answers keep waiting. While no message can go (a past version, a read-only
   ledger, a locked board, the chat's agent mid-turn: `controller/ask-now.ts`) Ask now is `aria-disabled`, its title
   the reason, and a press says it in the box; with no agent listening (none joined the ledger, and the engine is not
   `singleAgent`) the words wait as a note for Send and the board says so. Words typed survive a redraw (`show(...,
   true)` keeps the field, caret, focus and phase), a failed write (the box says why) and Esc (the discard question);
   an empty box closes on a click outside. Showing a node's replies writes a card `seen` at the version already seen,
   so the notes mark goes back to its count. Edit on a queued note opens today's edit mode and comes back to the box.
   A container's note keeps the bubble above; Comment on several selected nodes opens the box beside the selection, on
   a note for the group. The box scales with the board (§ Zoom groups). No pin draws for a note on several nodes: it is
   counted on each member's notes mark, and is a tab of each member's box.
   Proven by `packages/ui/tests/conversation-box.test.ts`, `apps/board/tests/ask-now.test.ts` and
   `tests/pages/conversation-box.spec.ts`; the panel's agent hearing Ask now by `tests/pages/chat-ask.spec.ts`.
10. **The box beside a node** (FE_03 run 2, the maintainer's rulings; one behaviour, FIX_05, point 484, D-104). The
   conversation, proposal and history boxes share one place, one look and one zoom rule (`ZOOM_RULES.boxes`,
   clamp(zoom, 0.8, 1.2); the history and proposal boxes, inside the node, are written at that scale over the zoom). `board/cards/mark-place.ts` `placeBeside` places each: its top level with the node's
   top, to its right when the stage has room, else below it, centred on the node's width, never over the node or the
   marks that hang off it (`nodeReach`); its pointer is fixed on the box (FIX_04, point 459, replacing FIX_02's aim at
   the node's centre): beside the node, on the box's left edge `BOX_ARROW` (22px) from its top, level with the node's
   upper part while the box is top aligned; below (or above), at the middle of the box's edge, the box centred on the
   node. It never moves when the box moves to stay on screen. It stays on the stage (FIX_01): on
   the right it moves up just enough when it would run past the stage's bottom (top aligned whenever it fits); below, it
   opens above the node instead (`data-side="above"`), and only with room for neither is it kept inside the stage
   (`apps/board/tests/mark-place.test.ts`; `tests/pages/node-boxes.spec.ts`, "a node near the window's bottom"). Its
   corners are never rounder than the skin's node, and focused as a whole (a key opened it) its own border takes the
   skin's ring colour, no second ring (`tests/pages/command-lens.spec.ts`). The look is
   `packages/ui/src/node/node-box.css` (`.vb-node-box`, `.vb-node-box-head` with its title and ×, `.vb-node-box-body`):
   compact, about 1.2 times the node's width, its text `--vb-text-md` (13px; the node's body is `--vb-card-text`,
   14px, since D-112), in the mock-ups' proportions
   (`design/mockups/node-states/`). The history box with the edges is "History of 28" and its ×, the stepper, then one
   row per entry: its version (↩ for "Proposal withdrawn: the node changed", `card-times.ts` `withdrawn`), its words,
   who and when (`node-history.ts` `historyBox`, `historyMarkup`). Proven by `apps/board/tests/mark-place.test.ts`,
   `packages/ui/tests/node-edges.test.ts`, `packages/actions/tests/card-history.test.ts` and
   `tests/pages/node-boxes.spec.ts`.

## A card's history (card-polish FE_03)

The change badge on a node's bottom edge, H, or right-click's History opens, beside the node, when things happened to
it (maintainer, 2026-10-19, point 20: `cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_03_history-box.md`;
D-099 1, planner's call 9: the same box holds the update stepper on top).

- **Property**: the box lists first drawn and each update (vN), each note sent, each agent reply,
  ✓, ✗ and reopened, a proposal withdrawn, and the card's app allowed or stopped (`TIME_KINDS`), newest first, a time
  (`noteTime`, the whole date as its `title`) and one line in the history model's words, the agent's
  label on its rows. No note or reply text and no private mark (bookmark, hidden notes) reaches it. A row
  naming a note still on the card, or an agent's reply, is a button that closes the box and opens the node's
  conversation at that note (`notes.ts` `show`); the rest are text. Up and Down move between those rows.
  A line for the card that lands while the box is open adds its row at the top, focus left alone.
- **Where**: the times are folded with the ledger, no ledger read: `packages/actions/src/card-times.ts`
  `foldCardTimes` (called by `fold.ts` `applyEvent`, `LedgerState.times`, ids only, no words) and
  `cardTimeRows`, which match and word each line with the history model's own `cardsAbout`, `saidOf`
  and `historyRow` (`card-history.ts`), so the box and `cardHistory` never disagree. The box is
  `packages/ui/src/node/node-history.ts` `historyBox`, drawn by `node-edges.ts` `edgesMarkup` (and in an app window's,
  `node-window.ts`); the page opens it from its mark (`board/cards/mark-boxes.ts`), which fires `POPOVER_SHOW` as it
  shows, and closes it on `POPOVER_CLOSE`; the page fills it then (`apps/board/src/board/cards/history-flow.ts`
  `createHistoryFlow`, `historyMarkup`).
- **Proven by**: `packages/actions/tests/card-history.test.ts` (card times: the box's kinds only, as
  `cardHistory` says them; no words and no private mark kept), `packages/ui/tests/node-history.test.ts`,
  `tests/pages/card-history.spec.ts`.
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
   **The wheel** pans, and Ctrl/Cmd + wheel zooms, everywhere; an app card's panel keeps its own wheel
   unless Cmd or Ctrl is held (`app-pan-key.spec.ts`). With the `wheelChaining` flag (on by default) the
   wheel first scrolls what is under the pointer: the element there, or an ancestor below the stage,
   whose overflow scrolls and which is not yet at that edge (a bubble's thread, a long tip's body, a
   text box, a code block; `input/wheel-latch.ts` `canScroll`, `scrollerOn`); otherwise the board pans,
   a container's title and its tip included. One gesture keeps the target its first wheel event found
   until a quiet gap of `WHEEL_GAP` (`createWheelLatch`), as browsers latch a scroll, so a flick that
   reaches a bubble's end stops there and the next gesture pans. **Scroll first, then pan** (FIX_04 ruling 2, point
   460, settling tracker M4): the gesture is decided by its first wheel event that moves (a trackpad can open one with
   an event of no movement, which used to latch the whole gesture to a pan); `WHEEL_GAP` is 200 ms, so momentum that
   follows the fingers stays in the gesture. **The end of a scroll** (bookmark-list-and-scroll-end task, replacing FIX_05's rise rule, point 485): only the quiet
   gap ends a gesture. A flick's momentum keeps sending events for one to two seconds, and a trackpad's stream rises
   inside one gesture (fingers speed up again, the momentum starts faster than the fingers left off, a busy frame
   coalesces two events), so reading a rise as a fresh push handed the rest of a flick to the pan. Now every event of a
   gesture that began on a box is that box's: past its end it neither pans nor zooms (Ctrl/Cmd pressed mid-gesture is
   swallowed, default prevented), and a push with no pause is swallowed with the tail; the next gesture, after a pause,
   pans. A gesture that starts with Ctrl/Cmd zooms. A box drawn again mid-gesture (`isConnected`) hands the gesture to
   what is found then, or keeps it, never to the board. A scroller at its end hands the rest of the gesture to no one and shows no elastic
   bounce (`overscroll-behavior: none` under `.vb-stage`, board.css); a wheel that counts in lines or pages pans (and
   zooms) by 16px a line or a stage's height a page (`pointer.ts` `WHEEL_LINE`). Proven by
   `tests/pages/scroll-before-pan.spec.ts` (the conversation box's thread, the history list, a code block in a node,
   trackpad-style and mouse-style, Ctrl + wheel zooms, a flick to the thread's end whose tail rises, coalesces and
   meets a push and Ctrl with nothing moving, no bounce) and `wheel-latch.test.ts` (recorded-style streams: a flick
   with its tail, fingers that slow and speed up, momentum starting faster, a coalesced frame, a zero in the tail, a
   push with and without a pause, a redraw mid-gesture, a mouse). Off, the wheel inside the note bubble
   or any hover tip (`.vb-tip`) is always its own and never pans. Tests: `wheel-latch.test.ts`,
   `tests/pages/wheel-chaining.spec.ts`.
   The stage is `user-select: none` and a card's content `user-select: text`.
4. **Keys** (`keys.ts`): Space on a focused card toggles it; Esc closes the note bubble first,
   else clears the selection.
5. **The focus ring, only after Tab** (maintainer 2026-11-24; `#ui` `bindFocusMoves` in `base/focus-return.ts`,
   bound by `bindPointerFocus`, bound by `wiring.ts`; `cortex-tasks/board/2026-11-24_board-ui_selection-grid.md`): the
   page's root and every `.vb-board` carry `data-vb-keys` from the person's Tab (or Shift+Tab) until their next pointer
   press, or a click into a frame of another origin; `base/a11y.css` makes `--vb-ring-style` solid then and none
   otherwise, and every focusable thing the board draws wears it. So a click and then any other key (Shift, Alt, Cmd,
   Ctrl, Z, J) lights no ring, on a card, a container's title or a grid cell, and the arrows and Enter after a Tab keep
   it. A text box always shows where typing goes. A pattern only places the ring (its offset, or
   `outline: var(--vb-focus-w) var(--vb-ring-style) var(--vb-focus)` on what wears it for the focused element); `npm run verify` fails one that draws its own
   (`scripts/verify-style.mjs` `checkFocusRing`). Proven by `tests/pages/focus-ring.spec.ts`. **Focus never moves the board** (review polish ruling 11): the same reading, exported as
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
   **Focus given back** (FIX_03 ruling 1, point 442): when Esc or a click closes a menu, a box, the image viewer, the
   conversation box or an app's stage, focus returns to what opened it through one helper, `#ui` `returnFocus`
   (`base/focus-return.ts`). Its ring shows exactly when the ring's switch is on (after a Tab, until the next pointer
   press), as everywhere. Proven by `tests/pages/focus-return.spec.ts` and `app-window.spec.ts` ("Open by a click, then Esc").

**Frames and hover boxes (review polish FE_01).** A container's frame and every hover box's border
(`.vb-tip`) read one token, `--vb-line-contrast`, the Lines scale's next step above `--vb-line-strong`
(`regionColour` returns it as `REGION_COLOUR_DEFAULT`; the frame reads `--vb-region` whole). The container
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
never shrink beyond these forms; the holders chip gives way first, then the title, one line ending in "…"
(never broken mid-word) down to about three letters, then the count. The chip and the count show
whole or not at all, never a clipped sliver (VERIFY_01 finding 1, FIX_48): the holders' slot and the
handle (`region-holders.css` `.vb-region-holders`, `region.css` `.vb-region-handle`) are wrapping rows one line high whose
second line is clipped, so a part with no room on the line wraps out of sight whole and stays in the
accessible tree: the count's words, "0 of 1 answered", and the chip's name, "2 agents have access", are read as before. The title's flex base is its few letters, so the count wraps only once the title
is down to them, and the title takes back the count's room. The chip with keyboard focus keeps its
room, the title giving way to it. CSS only: a zoom step measures nothing (`container-title.spec.ts`,
the count and the chip at every step from 100% to 20%). The heading keeps the full title
(the container's accessible name) and the title tip shows it on hover and focus. At 20% the line's
lower edge reaches about 1px into the first row's top edge (the line's room is `REGION_HEAD` board
units).

**The holders chip (agentAccess flag; Access Clarity decision 7).** After the count, one chip: the icon set's
person icon (`user`) and how many agents hold the container, named "2 agents have access"; with no holders,
no chip. Hovering or focusing it opens the list below the label (`region-holders.ts` `bindHoldersTip`, the
shared hover tip with `opens`, WCAG 1.4.13): each holder by label, "Created this container" on the creator
and a Remove button on every other, which asks to confirm as before. Enter, Space or a click keeps it open,
Esc closes it and focus returns to the chip. Words are in `packages/ui/src/words/region.ts`; the styles are
`region-holders.css`; `send-access.spec.ts` holds the page tests and the gallery's Agent access section
every state (one holder, many, hover, focus, none).

**The title's place, and moving a container by it (open list and container title FE_02, superseding
3_FE_01 ruling 6 for the label).** The label (grip, title and count: one `.vb-region-handle`, then the
retired marker and the holders) sits in the middle of the top line. The line's bar (`region.css`
`.vb-region-bar`) is a grid of three columns, the label's between two equal flexible ones, the tools'
never narrower than the tools and their gap. With room the label is centred on the frame; as the line
narrows on screen (zooming out) the tools' column stops at the tools' width and the first column takes
what is left, so the label slides left beside the tools, never onto them, until the first column is
gone; only then is the title cut. Nothing is measured: the grid reads the tools as they are at each
zoom, their narrow forms included. In the collapsed forms the first column is closed
(`region-narrow.css` `--vb-region-lead`), since the expanded row leaves the flow; the full row leaves no
room to centre there, so the label never jumps. Below `FAR_K`, where the tools leave the line, it is
closed too: zooming out only ever moves a title left, and it takes the tools' room. A drag on the
label (its other buttons and its tip aside) moves the container as the grip does, at any zoom, and
writes one container `pin` (`pointer.ts` `frameAt`, `container-drag.ts`);
the grip takes focus after the move and keeps Alt+arrows. Held still, a click on the title is the
background's click (it clears the selection). The rest of the line, and Cmd or Ctrl + drag anywhere,
still pan; on a past version the title pans. Hovering the handle tints the grip, the title and the
count together in the grip's hover look (`--vb-surface-sunken`), kept while the frame moves. Held by
`tests/pages/container-title.spec.ts` (centred within 2px at 100%, slid left at 60%, never on the
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
whole, collapsed to the layout button, Comment and the cog, or down to the cog and Comment while its
badge shows; a collapsed rail sits by its foot, so hovered or focused it expands upward over the cards
(the frame raised as for an open popover) and Comment and the cog stay under the pointer; it collapses
on leave, blur or Esc (`region-row.ts`, `data-shut`). At rest its icons draw at `--vb-rail-rest`
(`tokens.css`: 0.5 in both themes, a trial approved 2026-10-26: light keeps the quiet icon at APCA Lc 30
or more, dark does not, Lc 16.9 to 17.7 for the quiet icons and the cog, recorded in
`container-rail.spec.ts` until the maintainer rules); hovered, focused, with a popover or the note bubble open, or on a touch screen they are at
full strength, and the badge is never dimmed. Popovers open to the right of the rail, top-aligned with
the layout button, Comment and the cog.
**One layout control (FE_07, PLAN decision 20).** A container shows one button, `vb-layout-btn` (`region-template.ts` `layoutButton`), the active layout's icon named "Layout: Flow" ("Layout: Flow, down" on a flow drawn down); the layout popover is its menu (`modePopover`, role=menu, tiles `menuitemradio`). The six layout icons it replaced, their tooltips and the hover popover are gone (node-overhaul T_04). A press, or a pointer resting on it for 400 ms (`REST_MS`, `region-row.ts`), opens it; arrows move between the tiles, Esc returns focus to the button. On a flow the popover also holds Across, Down and Auto (`directionRow`, `button[data-dir]`): a press is the container's `direction` act (`places.ts` `setDirection`, `wiring.ts`), Auto clearing the person's choice so the agent's shows. Tests: `layout-control.spec.ts`, `region-template.test.ts`. Gallery: "One layout control".

A tile of the layout popover (`region-template.ts` `modePopover`,
`button.vb-mtile`, out of the tab order) applies its layout on a click or Enter: the page's click wiring
(`wiring.ts`) sends `setMode` for it, so there is one action; the popover closes, a past
version and a locked board keep it inert (`layout-tiles.spec.ts`, `lock-board.spec.ts`). A container's title
(`.vb-region-handle` and its `h2`) takes `--vb-text-md`. Keys: Up and Down move through the rail; on the cog Right opens the
menu and Left in the menu closes it. Flag off, the row is on the line exactly as before: the template
places it there, and `region-narrow.css` scopes the row's narrow forms to frames without `data-rail`.
Held by `tests/pages/container-rail.spec.ts` (placement, the bounds at 100% to 56%, rest and lit, APCA
light and dark, collapse and expand, popovers, keys, flag off, touch) and
`packages/ui/tests/region-template.test.ts` (the markup with and without `rail`).

With the `railOnHover` flag (`controller.ts` reads it into the render option `railHover`; the frame carries `data-rail-hover` beside
`data-rail`) the rail is drawn only on the container in use: `canvas/region-use.ts` `bindRegionUse` sets `data-use` on the frame under
the pointer or focus, since the cards are a layer above the frames and a frame's own `:hover` does not see a pointer over its cards.
Under `(hover: hover)` a `data-rail-hover` frame without `data-use`, `:hover`, `:focus-within`, `data-open`, `data-preview` or
`data-note-open` draws the row at opacity 0 (its box too, so no empty pill); in use it is at `--vb-rail-rest`, on the rail itself at full
strength; Comment's badge always shows, and a touch screen shows every rail. Gallery group "Only on the container in use"
(`rail-section.ts`); held by `tests/pages/container-rail-hover.spec.ts`.

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
   pill) or the selection clearing. The selection's keys work with it closed. **The grid**
   (`selectionGrid` flag, on by default since 2026-11-24; `cortex-tasks/board/2026-11-24_board-ui_selection-grid.md`): the pill opens
   into three rows of three, its cells in `SELECTION_GRID` order (`commands.ts`), with `icon` and `danger` from
   `COMMANDS`; `placeGrid` puts the anchor cell (Comment) at the click on the pill, or the pill's centre from the
   keyboard, upward when it fits, else downward with its rows reversed, and `gridStep` moves focus between the cells
   (`packages/ui/tests/selection-grid.test.ts`, `tests/pages/selection-grid.spec.ts`). **Clear of the
   tabs** (page polish ruling C, `cortex-tasks/board/2026-10-09_board-app_page-polish.md`): over
   cards the bar sits `pillGap(k)` above the selection, not `BAR_GAP`, because the cards' top tabs
   (number, kind) scale with the zoom `k` and the bar does not. `pillGap(k) = TAB_RISE * k +
   clamp(8k, 4, 16)`: the tabs' rise (10 world px) plus a clear space from 4px zoomed out to 16px
   zoomed in (6px at 0.2, 18px at 1, 41px at 2.5), so it never covers the tabs and a press there
   grabs the card. The area bar and the bar below a selection keep `BAR_GAP` (12px).
4. **Group notes.** Comment on two or more selected cards opens the conversation box beside the selection, on a note
   for the group (`notes.ts` `group`, FE_06): its act carries `nodes` in place of `n`/`ver` (api.md 62-65). A card may
   also hold its own single-card note (named by `n`) independently. With exactly one card selected, Comment is that
   card's own box. A note on a group is drawn once (maintainer ruling point 103, kept by D-099): counted on each member's
   notes mark and a tab of each member's box ("With 28", `note-box.ts` `boxView`); no pin draws. Kept true by
   `packages/ui/tests/conversation-box.test.ts` and `tests/pages/conversation-box.spec.ts`.
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
   bottom left (`board/chrome/KeyHelp.svelte`, `styles/key-help.css`) replaces the old key bar. Hover or focus
   opens the list through `bindHoverTip` (`packages/ui/src/tip/`): it stays while the pointer is on
   it, Esc closes it, and `?` opens it. The list is generated by `board/input/key-help.ts` `keyGroups()`
   from `COMMANDS` and the registry `ACTIONS` (Items, Selection, Board, View); only inputs neither
   table owns (J/K, Space, Alt+arrows, Shift+H, a node's H and menu key, pointer gestures) are listed by hand there, and a unit
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
   pointer that can take the cards gets `data-drop` (`region.css`: the corners close, a dashed ink line and a soft
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
   `board/chrome/VersionBanner.svelte` shows the banner with Back to now (Esc does the same). Code:
   `apps/board/src/board/boards/versions.ts`, `board/chrome/Toolbar.svelte`, `board/chrome/VersionBanner.svelte`.
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
   `apps/board/src/board/find/finder.ts` (`containerRows`, `zoomToContainer`), `board/chrome/Toolbar.svelte`.
   The dropdown is `board/chrome/MenuSelect.svelte`, the one menu dropdown pattern (item 7 uses it too): a
   native select that shows its name, calls `onpick` with a row's value and shows its name again
   (`tests/pages/finder.spec.ts`).
3. **The key bubble** (`keyBubble` flag). The round "?" at the bottom left lists every key. It is
   generated from `COMMANDS` and the registry `ACTIONS`, never written twice (see 3_FE_02 item 6).
   Code: `apps/board/src/board/input/key-help.ts`, `board/chrome/KeyHelp.svelte`, `styles/key-help.css`.
4. **The toolbar keeps its room** (verification fix; with the `adaptiveHeader` flag on, § the header by its own
   width below takes over, and this and § 5's widths describe the flag off). The board picker never goes under 220px from a
   1024px window up (its title truncates inside). At 1500px and below the toolbar carries
   `data-narrow` (`board/chrome/Toolbar.svelte`, a `MediaQuery`): the end group's text buttons show an icon
   only (`board/chrome/ButtonIcon.svelte`) and the counts, with the "boards updated" chip, show their
   numbers only; the words stay for screen readers and the title tooltip says them. "Replied" (with
   the agent, D-046) shares "boards updated"'s pink, so there it keeps the agent's mark (the Agents
   bot) beside its number (review polish FIX_01).
5. **Toolbar icons and the "⋯" menu** (`toolbarMenu` flag, on by default; task
   `cortex-tasks/board/2026-10-09_board-app_toolbar-icons-menu.md`). Theme, Hide answered (Hide
   decided before D-045) and Reply move into a "⋯" menu at the toolbar's end (`board/chrome/ToolbarMenu.svelte`):
   rows with their icon and key, Hide answered a `menuitemcheckbox`; a click or Enter opens it and focuses the first row; Up,
   Down, Home, End, Esc (focus back on "⋯") and Tab are the Move to list's keys, one helper for both
   (`#ui` `menuKeydown`, `packages/ui/src/base/menu.ts`); a press outside or a choice closes it; Shift+H works on the board and
   in the menu (H is a node's history). Agents (a bot with its holder count), Send to agent (a bot with a send arrow) and Chat show
   their icon only when narrow. The smallest supported width is 768px: at 1000px and below the
   gaps tighten, the app icon steps aside, the picker may go to 150px, the version and containers
   dropdowns take 6em and the count chips draw closer, so every control stays whole. (With the folder chip, § 6, the picker goes to
   125px and the two dropdowns to 5em: `styles/current-folder.css`.) The end group is
   `board/chrome/ToolbarEnd.svelte`, which the gallery mounts wide, narrow and with the menu open. Off, the
   toolbar is as it was. `tests/pages/toolbar.spec.ts` checks 1500, 1440, 1280, 1200, 1100, 1024,
   900 and 768px (with that chip showing): nothing clipped, overlapping or scrolling, every control
   named with a tooltip, the open menu inside the window, axe light and dark.

   **The header by its own width** (`adaptiveHeader` flag, on by default, needs `versionView` and `toolbarMenu`;
   maintainer's approved mock-up, 2026-10-31). The bar takes one of three forms by its own width, not the window's
   (`board/chrome/Toolbar.svelte`, a `ResizeObserver`; the window's width only as the first guess, so a page opens in its form),
   so it holds in a host's pane. `board/chrome/header-tier.ts` is the one table: `headerTier` (full from `FULL_MIN` 1300px, or
   `FULL_MIN + FLOWS_W` 1428px with Flows, the board's flow direction button, whose room `styles/header.css` keeps out of the box
   the bar measures itself on, so every breakpoint holds as measured without it; from half Flows is rows of "⋯"; half
   from `HALF_MIN` 620px, else a third), `inBar`, `inMenu`. One copy of each control, in the bar or as a row of "⋯".
   Full: the app icon, the path "folder / board ▾ / version ▾" (`<nav>`), Containers, "N open" and "N new", − 47% + and Fit,
   Agents, Send to agent, Chat, "⋯". Half: the folder's icon, the board's name cut with "…", the counts, the zoom as a small
   menu (`board/chrome/ZoomMenu.svelte`: − and + leave it open, Fit closes it), Agents, Send and Chat as icons; Version and
   Containers are rows of "⋯". A third: the board's name, Locked as its padlock, one compact count (a dot while there are
   new cards), Send, Chat, "⋯"; the folder, version, containers, the open and new lists, Bookmarked, the zoom row, Agents and
   the boards-updated line are in "⋯" (Replied goes). The board's name in the path is the title: the `h1` stays,
   visually hidden, as the page's heading, and the closed picker and version show one fact each
   (`board/chrome/BoardPicker.svelte`, `board/chrome/VersionPicker.svelte`: native selects unseen over a face, `.vb-menu-face`).
   What moved is `board/chrome/HeaderFields.svelte`: the same controls as rows (`MenuSelect`, `OpenChip`, `FolderChip`,
   `BookmarkedChip`, `BoardAgents`), beside the `role="menu"` and not in it, since a select is not a menu item; the menu's
   keys walk both (`#ui` `openMenu` `items`), and Enter on a select opens its list. The chips that come and go are bare
   up to 1500px; under 900px a half bar holding any of them bares "N open", "N new" and Locked too
   (`styles/header.css`). Tests: `apps/board/tests/header-tier.test.ts`; `tests/pages/header-tiers.spec.ts` (nothing cut
   off down to 400px, quiet and crowded; every action reachable at a third; the bar's own width; no other form first on
   load; axe and APCA, light and dark; the gallery's section, `gallery/header-section.ts`). Off, the toolbar is as § 4 and § 5 say.
   While the page's server names a ledger the page's ledger is one more control of the table, `ledger` (§ 6, the ledger chip): in the
   path after the folder at full ("folder / ledger ▾ / board ▾ / version ▾") and at half (its icon and its name), and a row of
   "⋯" under the folder's at a third (`header-tier.ts` `IN_MENU`; `apps/board/tests/header-tier.test.ts`, "the page's folder and
   ledger"). `FULL_MIN` and `HALF_MIN` hold with it: `tests/pages/ledgers.spec.ts` ("long folder, ledger and board names")
   fits every form from 1470px to 400px with a 40-character ledger, a long folder and board name, a bookmarked card and Locked;
   `tests/pages/header-tiers.spec.ts` runs its forms with Flows too (FIX_01).
   With the `readOnlyStart` flag the ledger's state is two more controls of the table (§ 6, Read-only and Edit): `editing`,
   the state chip after the path, in the bar at every tier like Locked (decision 16; at a third its icon, the word for
   screen readers), and `edit`, Edit or Stop editing, a button at full and a row of "⋯" from half (`header-tier.ts`
   `IN_MENU`; `apps/board/tests/header-tier.test.ts`, "the ledger's state"). `FULL_MIN` and `HALF_MIN` hold with them:
   `tests/pages/read-only.spec.ts` ("long folder, ledger and board names, Locked and bookmarked, read-only") fits every form
   from 1470px to 400px, the folder giving up its room for the state at full and the button giving way on a crowded bar.

   **Write controls on a read-only ledger** (N44, D-085; task `cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_01_read-only-controls.md`).
   Every write control a person can press is paused and says why, in `READ_ONLY_PERSON`: `AccessRequests.svelte` (`readOnly`: Allow all,
   Allow and Refuse), `BoardAgents.svelte` (`readOnly`, else the board's own state: Remove access), `ProposalsBar.svelte` (Accept all,
   `data-paused`), and, in `#ui`, `paused.ts` `explainPaused` (every paused card control's title is the reason, its own tip back on Edit)
   with the app card's Allow app and Stop app paused (`vb-node.ts`; `app-cards.ts` `press` toasts the reason and sends nothing). A paused
   button takes `button.css` `.vb-btn[data-paused][aria-disabled='true']`: a quiet outline, no hover or press; an app window's
   Allow takes `paused.css`. The gallery's last section, "Write controls on a read-only ledger" (`read-only-controls-section.ts`), shows
   the strip, the Agents panel and an app card; held by `tests/pages/read-only-controls.spec.ts` and `packages/ui/tests/node-paused.test.ts`.
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

   **Wider, wrapping, and the system's own chooser** (D-110; task
   `cortex-tasks/board/2026-11-19_board-app_folder-chooser-setup/T_01_chooser.md`; api.md 208-211). The dialog is 720px
   wide, never past the window (a 16px gutter each side at phone width), and every folder name, the breadcrumb, a list's
   heading and a problem naming a folder wrap anywhere, never cut with an ellipsis. With the `systemFolderChooser` flag
   (on by default, needs `openFolder`) and where the server's listing says `chooser` (macOS), a "Choose in Finder…"
   button (`.vb-btn-small`, `FolderPicker.svelte` `chooser`) sits under the lists: the server opens Finder's own
   folder chooser; while it is open the status line says so, the button is `aria-disabled` (it keeps focus), the lists
   and Open wait, and Cancel closes the dialog and the chooser. The pick, or a recent folder outside home (named by its
   whole path; it can't be listed), is the chosen folder (`picked`): a "Chosen folder" line in the Current folder line's
   look, on the card surface, with the status and Open or Create its own, Open focused. A refused pick (hidden) shows in
   the problem line. Reading text Lc 60 or more, light and dark. The gallery's section is last
   (`gallery/folder-chooser-section.ts`, long names and each chooser state); tests are
   `tests/pages/folder-chooser.spec.ts` and `apps/board/tests/api-folder-chooser.test.ts`. Off, no button; the width and
   wrapping are not flagged (a fix to a look, not new behaviour).

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

   **The ledger chip and New ledger** (the server's `ledgerFolders` flag; needs `openFolder`; D-084 7; tasks
   `cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/LEDGER_UI_01_ledger-chip.md` and, for M51 and M52,
   `cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/FE_02_ledger-chip-and-memory.md`). The open folder's ledger is
   the standalone page's, as the folder is (no seam change): three page parts, `board/host.ts` `BoardPageParts` `ledgerChip`,
   `ledgerField` and `ledgerRow`, which `shell/page-parts.ts` `pageParts` gives (getters) only while `get_project` names a
   ledger, whatever the page's own flag (a gallery sample: the page's flag too); the header reads them where it draws, so
   the path's "/", the "⋯" rows and the "⋯" tooltip follow (`Toolbar.svelte` `given`). `shell/LedgerPart.svelte` is the chip and the row, the board picker's pattern: a
   native select unseen over a face (`.vb-menu-face`) listing the folder's ledgers as "name · N boards" ("· kept out of
   git" for a throwaway one), the open one selected, then New ledger…. Choosing a ledger calls `open_project` with the folder
   and the ledger (`shell/ledgers.ts` `openLedger`) and reloads onto it (`folder.ts` `reloadOnto`); the board last looked at
   is kept per folder and ledger (`lastBoardKey`: `main` keeps the folder's own key), through `shell/kept.ts` `pageStore` (`lastBoardKey` is its key there); one kept before folders (`vb.lastBoard`) is read once by `main` of the folder that is open, then kept under its key (`tests/pages/last-board.spec.ts`, "another folder never opens…" and "one kept before folders…"), and another open page reloads when the
   server's ledger changes too (`folderMoved`). While a ledger is on its way the face says "Opening name…" and the list is
   shut; a refusal is a toast. A note's unsaved words ask first (`ledgers.ts` `mayLeave`, leavePrompt flag). In the path the
   ledger keeps its room while the folder and the board's name give theirs (16ch, 12ch on a full bar under about 1385px, a
   longer name cut with "…"); at half it gives way first, never under 44px (`styles/ledgers.css`). `shell/LedgerRow.svelte`
   is New ledger… in "⋯" after Open folder…, left out at a third, where the Ledger row stands for it (`ToolbarMenu.svelte`
   `ledgerAbove`). `shell/LedgerDialog.svelte` holds `shell/LedgerForm.svelte`, the board dialog's pattern: the name, shown as
   an id as it is typed (`ledgers.ts` `typedLedgerName`) and checked as it is typed by `#format` `ledgerNameProblem` and
   against the folder's ledgers, the problem replacing the rule's line (`aria-live`, `aria-invalid`), Create sending nothing
   while there is one; "Keep out of git", off, sends `keepOutOfGit`; a refusal stays in the dialog in the server's words.
   Words: `shell/words/ledgers.ts`. Reading text Lc 60 or more and the icon Lc 30 or more, light and dark. The gallery's
   section is `gallery/ledger-section.ts`; the tests are `tests/pages/ledgers.spec.ts` (the path, half, a third, switching,
   another tab following, create and kept out of git, refused names and a refusal, the page's flag off with a server that
   names a ledger, a server that names none, fit, axe, APCA, the gallery). A server that names no ledger: the header is as above.

   **Read-only and Edit** (`readOnlyStart` flag, on by default, needs `openFolder`; D-085 2 and 5; task
   `cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/READONLY_UI_01_edit-control.md`). Whether the open ledger
   can be changed here is the standalone page's to show, as its folder and ledger are (no seam change): two page parts,
   `board/host.ts` `BoardPageParts` `editChip` and `editButton`, filled by `shell/page-parts.ts` once `shell/editing.ts`
   `editingOn` (`openFolder` alone: the page's own flag is not asked, so a server that opens read-only always shows it,
   decision 16), and drawn only while `get_project` says `readOnly` or `editing: { here }` (`editing.ts` `editState`; a server
   opened with `--edit` says neither, and nothing shows). `shell/EditChip.svelte` follows the path, before Locked: an eye and
   "Read-only", or a pencil and "Editing" (ringed in the accent's line), Locked's look (`styles/editing.css`); its tooltip and
   accessible name say the whole state (`editing.ts` `stateTip`: "Read-only: switch to Editing to change this ledger", or "being
   edited on <computer> since <time>" when another computer holds the lock). The word gives way at a third, on a narrow half
   and on a crowded bar with Locked's (`styles/header.css`), the icon never. The chip is a button opening a small menu
   (the zoom menu's pattern, `board/chrome` `toolbarPopup`): the state in words, then Edit or Stop editing; a polite status
   says a change of state. Open, the header stacks over the access-request bar, as for "⋯" (`styles/editing.css`). `shell/EditButton.svelte` is Edit or Stop editing as a button at full (its pencil alone under
   1500px, hidden under a 1360px content box or on a crowded bar, where the chip's menu holds it) and as a row of "⋯" from
   half (`HeaderFields.svelte`). Pressed, each shows loading (a spinner, "Opening for editing…", `aria-busy`, focus kept)
   until `editing.ts` `toggleEditing` has the server's answer (`page-io.ts` `editLedger`, `stopEditing`): Editing, or
   read-only again with a toast naming the computer that holds the ledger. The page reads the folder again when the
   board's reads change their `readOnly`, on the stream's `editing` event (another computer started or stopped, or this
   server lost its lock: `page-host.ts`) and when the chip's menu opens. Every control that would write says why while
   read-only (`#actions` `READ_ONLY_PERSON`): the card's controls and the flag (`#ui` `NodeState.paused`, `NodeState.readOnly`,
   `vb-node.ts` `FLAG`), the container's (`RegionState.paused`), Send (`ToolbarEnd.svelte`), New board… and Rename board…
   (`BoardPicker.svelte`), Lock board… and Archive board… (`ToolbarMenu.svelte`), Accept all (`ProposalsBar.svelte`), Restore
   (`ArchivedList.svelte`); the chat panel hears it (`ChatPanel.show`'s `readOnly`, `App.svelte`). There is no disabled
   state for a folder that cannot be written: `get_project` gives no such reason. Words: `shell/words/editing.ts`. Reading
   text Lc 60 or more and the icons Lc 30 or more, light and dark. The gallery's section is `gallery/editing-section.ts`;
   the tests are `tests/pages/read-only.spec.ts` (opens read-only with every write control paused and saying why; Edit then
   a write; Stop editing; another computer named; 1400, 900, 620 and 600 px and the keys; fit; axe; APCA; the menu over
   the access bar; the page's flag off; the gallery) and `packages/ui/tests/node-paused.test.ts`. Off, the header is as above.

   **Read-only as one toggle** (`readOnlyToggle` flag, on by default; PLAN decision 11, point 431; task
   `cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_02_read-only-toggle.md`). Wherever the chip above is
   drawn, `shell/EditChip.svelte` is one toggle button with no menu (`editing.ts` `toggleOn`): its icon and word are the
   state (an eye and "Read-only", a pencil and "Editing"; "Opening for editing…" or "Stopping…" while busy), `aria-pressed`
   is true while Editing, and its accessible name is Edit whatever the state, so voice control can always say it (the
   visible word is the state). Its tooltip is its description (`editing.ts` `toggleTip`: the
   state and what a press does, or the computer that holds the ledger). A press is `toggleEditing` with the toggle's own
   refusal words (`shell/words/editing.ts` `toggleRefused`): Editing, read-only again, or still read-only with a toast
   naming the computer that holds the ledger. Busy, it keeps its place and focus (`aria-busy`, `aria-disabled`) with the
   spinner, and a press does nothing. Editing takes the base toggle pattern's on fill, the accent's soft ground, its ring
   still the accent's line (`styles/editing.css` `.vb-chip-editing[aria-pressed='true']`). `shell/EditButton.svelte` is not
   drawn: no Edit or Stop editing button at full and no row in "⋯" (`Toolbar.svelte`, `HeaderFields.svelte` `editToggle`).
   Words: `shell/words/editing.ts` (`toggleReadOnlyTip`, `toggleHeldTip`, `toggleEditingTip`, `toggleRefused`). The word
   Lc 60 or more and the icon Lc 30 or more, light and dark. The gallery's section is `gallery/editing-section.ts`
   (`toggleGroups`; `menuGroups` with the flag off); the tests are `tests/pages/read-only-toggle.spec.ts` (one toggle named
   Edit, not pressed, no menu; a press takes the lock and one more gives it back; Space and Enter; another computer
   holding the ledger; 1400, 900 and 600 px; axe; APCA; the flag off; the gallery). Off, the chip opens its menu and
   EditButton is beside it, as above (`tests/pages/read-only.spec.ts`, which pins `-readOnlyToggle`).

7. **The open cards list** (`openList` flag, on by default; task set
   `cortex-tasks/board/2026-10-19_board-ui_open-list-and-container-title/`, FE_01). The toolbar's
   "N open" chip (`board/chrome/OpenChip.svelte`) is a `MenuSelect` lying unseen over the chip
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
   `cortex-tasks/board/2026-10-25_board-ui_new-and-updated.md`, api.md 158). A node's change badge says it: "New" or
   "N updates" (`node-edges.css` `.vb-mark-badge`, item 2 of § The node's edges). A container holding a card new or
   updated since the person last engaged with any card in it (`container.fresh`) carries `data-fresh`: its border takes `--vb-state-fresh` (teal)
   and its title line a pill after the count, "3 new · 1 updated" (`region-fresh.ts` `regionFresh`,
   `region-fresh.css`), which leaves a narrow line whole, after the holders and before the title,
   and stays zoomed out. The person's own select of one of its new or updated cards (a click, not a
   find), or any act on one of its cards, ends it; a click inside the container clears its pill on the person's screen
   only (point 308, `cards/container-seen.ts`). The toolbar's "N new" chip beside "N open" is the same
   `OpenChip` (generalised: its word, tone and names are props), listing `freshCards` as "46 ·
   title", an updated one ending "· updated" (`finder.ts` `openRow`, the title giving way to a cut,
   never the ending); choosing one goes to it as Go to card does, which selects it but leaves its
   NEW or "updated" mark (finding keeps marks, § Go to card and search item 6). The count, the list and the pills read one list (`freshCards`, conditions.ts), so
   they never disagree. Hidden at zero, and with the flag off or a past version (`attention.ts`
   `freshIn`, `Toolbar.svelte`). APCA, measured by `tests/pages/fresh-cards.spec.ts`: the border on
   the canvas Lc 58.6 light, 67.4 dark; the pill's words 54.8 and 63.5. The gallery's "New and updated cards" section
   draws them (`gallery/fresh-section.ts`). Off, no container border, pill or chip shows.

   **Updated in amber** (`updateSignals` flag, on by default; PLAN decision 10, points 429-432; task
   `cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FE_01_update-signals.md`). One colour per meaning:
   updated is `--vb-state-updated` (its APCA figures in `packages/tokens/src/tokens.css`), new stays `--vb-state-fresh`.
   A node's change badge saying "N updates" is `--vb-badge-updated` (the amber), "New" `--vb-badge-new` (the teal),
   settled "vN" quiet (`tokens.css`, `node-edges.css` `.vb-mark-badge`). The pill writes each count in its own
   span (`region-fresh.ts` `fillFreshPill`, called by `vb-region.ts` `applyFresh`), so "updated" takes the amber
   (`region-fresh.css` `.vb-region-fresh-updated`) and "new" stays teal; the border stays teal, also when only updated
   cards are inside. New is teal wherever it shows: the badge's New and the toolbar's "N new" chip (`OpenChip.svelte` `newTone`: tone `fresh`, `chip.css`;
   `Toolbar.svelte`, `HeaderFields.svelte`), which counts new and updated cards together under the one word "new", and
   the narrowest bar's "new" dot (`Toolbar.svelte` `.vb-count-dot` `data-tone={newTone(…)}`, `header.css`). The other
   boards' "N boards updated" chip is amber (`chip-tone.ts` `updatedTone`: chip tone `updated`, `chip.css`). The
   agent's reply carries the amber on its left edge, apart from the person's notes: bright while
   its card is unseen, then a muted amber (`color-mix` halfway to `--vb-line-strong`), in the note bubble
   (`note-bubble.css`) and under a container's note on its frame (`region-note.css` `.vb-nblock-reply`). On a node an
   unread reply fills its notes mark (`node-marks.ts`); opening the conversation box reads it, so the box draws its
   replies muted. A reply is unseen when written after the person last looked at its card
   (`apps/board/src/board/cards/parking.ts` `repliesOn`, from `LedgerState.looked`; never while a past version shows),
   and keeps it only while the card itself is NEW or has updates not stepped through (`node-notes.ts`
   `litReplies`, in `node-core.ts` `nodeState`); the bubble's template marks it `data-unseen` (`note-bubble-template.ts`
   `replyItem`). The tests are `tests/pages/update-signals.spec.ts` and `tests/pages/fresh-cards.spec.ts` (the
   two-colour pill, the teal border with only updated cards), with `packages/ui/tests/{node-core,region-fresh}.test.ts`
   and `apps/board/tests/parking.test.ts`. The gallery's sample is `gallery/update-signals-section.ts`. Not covered
   here: the "N new" dot on the narrowest bar (`styles/header.css` `.vb-count-dot`, still pink) and the toolbar's "N
   updated" chip for other boards (tone `new`, pink). Off, the chip is pink and replies are grey. The badge's colours
   are its tokens', whatever the flag (a tracker row asks which should win).

   **Row gap** (`updateSignals` flag, D-091; task `cortex-tasks/board/2026-11-05_board-ui_tab-lower.md`). The bottom-edge
   tabs that once hung below the footer are gone with it (D-099); what stays is the row gap: the board lays out a card
   and the card under it `ROW_GAP` (30px) apart instead of `GAP` (24px) in column, grid rows, flow and a lane's stacks,
   side by side `GAP` (`packages/layout/src/types.ts` `ROW_GAP`, `LayoutOptions.rowGap`, passed by `controller.ts`
   and the gallery's `mini-board.ts` with the flag; the layout cache keys on it), and at least `EDGE_ROW_GAP` while the
   skin's marks hang on the edges (§ Flow branching and direction, item 6). Tests: `packages/layout/tests/stack-gap.test.ts`
   (`rowGap` in each mode that stacks; side by side `GAP`), `apps/board/tests/layout-cache.test.ts` (the gap lays out
   every container and equals `layoutBoard`).

   **One tab for updates and a proposal** (point 444) is gone with the bottom tabs (D-099): the change badge opens the
   updates (in the history box) and the disc opens the proposal (its own box), so a card with both shows each on its own
   mark.

## Every card in the conversation (every-node FE_01)

Task set `cortex-tasks/board/2026-10-10_board-actions_every-node/` (rulings 1-4, 6; api.md 118-120),
behind the `everyNode` flag (on by default; `?flags=-everyNode`).

1. **Numbers and actions from the kind.** Every card shows its number; `offers` reads
   `NODE_TYPES[kind].actions`, so a question, decision or action offers ✓, ✗, Comment and Save for later (its disc, its
   keys and its right-click list, § The node's edges), and every other kind Comment and Save for later (More context is
   gone, D-045). Off, `numberedView` (`apps/board/src/board/board-data.ts`, the page's own draw rule) drops the number
   from cards that need no answer, so they draw with no number and take no note.
2. **No meaning on ✓ and ✗** (superseded by D-045; was one meaning per kind, `action-words.ts`,
   now deleted). See "The answer model" below.
3. **Comment on any group.** The selection's Comment takes every selected card, any kinds: one note
   on exactly those cards (`selection-flow.ts` `comment`); one card alone is its own note.
4. **Counts and states.** The toolbar and container counts count only cards that need an answer
   (`counts`, `regionState`); a plain card's note or Later counts nowhere, and since D-045 shows no status. No new
   colour.
5. **Hide answered** (Hide decided before D-045) keeps an answered card while the agent owes it an
   answer (`item.owed`, read into `pageConditions` `owedCards`), so the reply lands where the person
   can see it; it hides once nothing is owed (`answeredIds`).
6. Tests: `tests/pages/every-node.spec.ts` (numbers, a plain card commented by key, a
   lasso of mixed cards commented once, counts, hide while owed, the flag off, axe light and dark);
   the gallery's node section shows the cards that ask and the cards that tell in every status each
   can reach.

## The answer model (answer-model FE_01, D-045)

Task set `cortex-tasks/board/2026-10-15_board-actions_answer-model/` (rulings 1-5, 7, 8; api.md 144-146).

1. **✓ and ✗ are tools.** Tick and Cross (keys A and X) answer on the disc's picker or a skin's switch (§ The node's
   edges); the board never says what they mean, the card does. Answered, the disc fills green with a tick or red with a
   cross; the accessible name says "checked" or "crossed" (`STATUS_NAME`). ✗ no longer fades the card or strikes its
   title through.
2. **"Answered", never "decided".** The toolbar reads "N open · N answered · N later" (`shell.counts`,
   `toolbar-counts.ts`), a container "N/M" with "N of M answered" as its tooltip and name (`regionState`
   `countText`, `countLabel`; round 2 ruling 1), an emptied frame "Everything here
   is answered.", and the Shift+H toggle "Hide answered" (`answeredIds`).
3. **Only cards that ask show a status** (`asksAnswer` in `node-core.ts` reads
   `NODE_TYPES[kind].answer`): a finding, risk, topic or note has no disc and no status in its
   name, whatever its state; its notes mark still counts its notes.
4. **One way to write back.** No card, container or selection offers More context, and M is no key.
   An old `context` note reads as "Your note" everywhere (`KIND_WORD`, the bubble's placeholder).
5. **The agent's answer clears the card** (`ItemState.unseenAnswer`, from the action layer): the card
   is open and unmarked, and the reply is one update of its own on the change badge ("N updates"), the marker a
   new version gets (`packages/actions/src/answers/updates.ts` `unseenCount`, `unseenSteps`; `packages/actions/tests/updates.test.ts`: a step "Reply · when · who" with its
   words, at the card's latest version). Selecting the card or stepping past the reply sends the card
   seen line that ends it (`seenDue`: due although that version was seen). An answer by a new version
   is that version's step. **Any reply of the agent's is such an update** (review polish round 2
   ruling 4, `clears.ts` `unseenReply`, api.md 149), whether or not it answers a note or clears
   anything: a reply to an older note leaves the card's ✓ as it was and still shows "1 update".
6. **A lit answer clears.** Pressing a lit ✓ or ✗ (or A, X on an answered card, or Later again) records `reopen` and the
   toast says "12 cleared"; ✗ while ✓ is lit switches straight to ✗; a second press of the same action on the
   same card within 400 ms (`REPEAT_MS`) is ignored (`item-acts.ts`).
7. Tests: `packages/ui/tests/node-core.test.ts`, `apps/board/tests/item-acts.test.ts`,
   `updates.test.ts`, `every-node-page.test.ts`; `tests/pages/answer-model.spec.ts` (names, no M,
   ✗ at full opacity, clear and switch, the double click, the header, a card the agent's answer
   cleared, keyboard, axe light and dark). The gallery's node matrices have rows for ✓ Checked,
   ✗ Crossed and "Answered by the agent".
8. **Replied: with the agent** (with-agent-state task, D-046, api.md 148; the word from
   `cortex-tasks/board/2026-10-16_board-ui_replied-word-and-unclear-marks.md`). A note puts a card that
   asks with the agent until its answer, and the person reads "Replied": in its name
   (`STATUS_NAME.commented`), and in the toolbar, "N open · N replied · N answered · N later", the
   replied chip (title "Replied items", `data-tone='agent'`, `--vb-state-comment` on
   `--vb-state-comment-soft`: APCA Lc 64.0 light, 49.1 dark) only above 0 (`counts().withAgent`, `shell.counts.withAgent`). The gallery's
   matrices name the row "Replied". Agents keep reading `with-agent` (it tells them they owe a
   reply), and the Send message keeps "Waiting for your reply". Tests: `node-core.test.ts`,
   `answer-model.spec.ts` (name, the header chip).
9. **Open means "your move".** Open = no ✓, no ✗, no note, no Later; the agent's answer to a note
   makes the card open again (`cardStatus`, D-046).

## Field report, batch 1 (2026-10-11)

Task `cortex-tasks/board/2026-10-11_board-app_field-report-batch-1.md`.

1. **Send to agent, disabled.** `SendButton.svelte` gains the `disabled` state (the shell's
   `unsent`, from `pageConditions`, `board.unsent`; api.md 123): a quiet outline in place of the
   accent fill (`--vb-surface-card`, `--vb-line-strong`, the words in `--vb-ink-subtle`: APCA light
   Lc 76.2, dark 63.0 since point 415, a short label at Lc 45), no hover or press, `aria-disabled` and still in the
   tab order, its title "Nothing new to send". A click, Enter or Space records nothing. The gallery's
   Send row shows it after Waiting. Tests: `tests/pages/send-nothing-new.spec.ts`.
2. **The "N updates" tab** of this batch became the node's change badge (D-099, § The node's edges item 2).

## Archive a board (N39)

Task `cortex-tasks/board/2026-10-12_board-app_archive-board.md` (rulings 4-6; api.md 135-137),
behind the `archiveBoard` flag (on by default; `?flags=-archiveBoard`).

1. **Archive board…** is a row in the "⋯" menu (`board/chrome/ToolbarMenu.svelte`, given `onarchive`; with
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
3. **Archived (N)…** ends the board picker while any board is archived (`board/chrome/Toolbar.svelte`). It
   opens `board/chrome/ArchivedDialog.svelte`, a native modal dialog holding `board/chrome/ArchivedList.svelte`:
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

1. **Lock board / Unlock board** is a row in the "⋯" menu (`board/chrome/ToolbarMenu.svelte`, given
   `onlock`), before Archive board…, with a flat SVG padlock, shut or open (`ButtonIcon` `lock`,
   `unlock`; 24 grid, 1.5 stroke, `currentColor`). It acts on the open board with no confirm (nothing
   is lost either way) and is `aria-disabled`, explained in its tooltip, while no board is open or a
   past version shows, like Archive board…. It sends one `lock` or `unlock` act through the one
   sender (`board/boards/board-edit.ts` `lock`) and the toast says what it did (`LOCK_DONE`).
2. **"Locked"** follows the board's name and version in the toolbar while it is locked
   (`board/chrome/LockedChip.svelte`): a quiet chip ringed in `--vb-line-strong`, the padlock and the word,
   never shortened on a narrow toolbar, its title "Locked: unlock to change it". A visually hidden
   polite live region beside it, outside the toolbar's flow, announces a lock from another tab.
   Styles: `styles/lock.css`.
3. **Paused in place** (`board/boards/lock-flow.ts`). After every batch and switch `apply` reads the lock
   from the folded ledger through the action layer's `boardLocked` and sets `data-locked` on the world
   and the status's `locked` (`board/status.ts`). The elements pause their own controls from `BoardState.locked`
   (`NodeState.paused`, `RegionState.paused`; `packages/ui/src/paused/paused.ts` `pauseControls`,
   `paused.css`): a node's answer (the disc or the switch's halves, which keep their look at rest and show the lock for a
   moment when pressed, point 328), a proposal's Accept and Reject, the layout choices, the widths switch, the grip, Comment, the note's Edit and Remove, Reset places,
   Put container back and Remove access stay in place and in the tab order, `aria-disabled` and
   `data-paused`, in the quiet ink with no hover or press; a pressed answer and the checked layout keep
   their colour; the cog still opens. Send to agent is disabled with the reason as its title
   (`SendButton` `paused`); the selection bar's Comment, Move to and Reset places are disabled.
4. **A press says why and writes nothing.** The stage's handlers that act (versions.ts `ACTING` but
   the flag, and the widths switch) toast "Locked: unlock to change it" and do nothing (`guard`; a
   drag's later moves stay quiet); the note bubble doesn't open (`notes.ts` `paused`); and the sender
   asks `refuse` before every line, with the action layer's `passesLock`, so a path the page doesn't
   guard is refused there, and the server refuses it again (423 `locked`).
5. **The bookmark stays usable** (ruling 4; the flag before D-099 2): the person's private mark changes nothing an agent reads,
   so the number and B work on a locked board (`passesLock`).
6. **The chat**: messages still go; the composer's chip carries no answers on a locked board
   (`#actions` `answersChip`), as the server sends none (api.md 140).
6a. **A read-only ledger** (D-085, `readOnlyStart`; api.md 173) pauses the same way, with its own reason, "Read-only:
   switch to Editing to change it" (`#actions` `READ_ONLY_PERSON`): `lock-flow.ts` `paused` gives it, so the stage's acting
   handlers, the note bubble and the selection bar's acting commands stop, and the sender refuses every line first
   (`controller.ts`), the bookmark too, which a lock lets through. It is not a lock: no "Locked", no `data-locked`. The page
   learns it from its reads (`live.ts` `readOnly`), not from the standalone shell; nothing is written, not even a seen
   mark (a card seen is kept in the page). `BoardState.readOnly` carries it for the elements; the header's control
   and the elements' paused look are § 6, Read-only and Edit (`NodeState.readOnly` pauses the bookmark too). Tests:
   `tests/pages/read-only-writes.spec.ts`, `tests/pages/read-only.spec.ts`.
7. Tests: `tests/pages/lock-board.spec.ts` (the menu row by mouse and keyboard, "Locked", every
   paused control aria-disabled, a press on a button, a key, a note, a layout and the selection bar
   saying why and writing nothing but seen lines, the bookmark by click and B, a lock from another
   tab, the flag off, axe light and dark, the gallery section's screenshots);
   `packages/ui/tests/node-paused.test.ts`, `apps/board/tests/board-edit.test.ts` and
   `chat-bridge.test.ts` for the pure parts. The gallery's lock section (`gallery/lock-section.ts`)
   draws both menu rows, "Locked", a locked container and its cards, and Send paused.

## Agents from other folders (D-120)

Task `cortex-tasks/board/2026-11-26_board-security_other-folders-switch.md` (api.md 215-216), behind the `otherFolders`
flag (on by default; `?flags=-otherFolders`). Only in the "⋯" menu: no toolbar button or chip.

1. **"Repo agents only"** (chat 850-851; first "Let agents from other folders in") is a `menuitemcheckbox` in the "⋯" menu (`board/chrome/ToolbarMenu.svelte`,
   given `onfolders`), just above Open folder…, with the folder icon, ticked (`aria-checked`) while the open ledger keeps
   agents from other folders out, the default, and unticked while it lets them in (the status's `otherFolders`, from `otherFoldersIn` after every batch, `board/boards/boards.ts`). It shows
   only on a page that opens folders (the page part `folderRow`: the standalone board; a host has no folder check). Off
   like Lock board while no board is open, a past version shows or the ledger is read-only, its tooltip saying why; otherwise its tooltip says what it does (`toolbarWords.repoAgentsOnlyTip`). A press sends `folders-allow` or `folders-revoke` through the one sender
   on the open board, with no confirm and no toast (`board/boards/board-edit.ts` `otherFolders`; the page's weight
   budget had no room for one): the tick says it. The gallery (`gallery/other-folders-section.ts`) draws the menu with the row ticked and unticked.

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
   `createGoTo`, which opens the "Go to card" box (`board/chrome/GoToCard.svelte`, `styles/go-to-card.css`)
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
   answered cards (Shift+H shows them)".
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
   focuses and shows it but never marks it seen, so its change badge (New or "N updates"), the toolbar's count and
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
   the standalone page's (`board/chrome/GoToCard.svelte`, drawn from `status.go`), so the controller gives
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

1. **The node pattern draws the card.** For kind `app`, `node-template.ts` `nodeTemplate` draws a window
   (`node-window.ts` `windowMarkup`, § The app window): a thin title bar and, under it, the panel slot (`appSlot`) in
   place of the Markdown body: the frame and the state view. The bar holds the app status (`appStatus`, card-polish
   FE_01): Allow, or "Allowed ▾" and its one-item menu, Stop app. An app card takes no width tier and no status (it
   tells, D-045). With the appCards flag off the page passes `{ appCards: false }` and the card is a plain node saying
   `APPS_OFF` (ruling 13). The window has no title over the panel in any state (the card's name still says it): the
   panel meets the bar; a state without a panel says what is wrong in its own head; zoomed far, the frame's placeholder
   shows the app's title. The app's name sits in the bar (`AppCardView.name`, written in place by `node-app-apply.ts`
   `applyApp`), one line taking the room left, cut with "…" and whole in a tip while cut (`bindAppNameTip`, the shared
   hover tip). No state moves the card and the bar's height never changes. The state view never draws past the panel's
   room: it scrolls when the panel is too small for it (`node-app.css` `.vb-app-state`).
2. **Its size.** `app-frame-core.ts` `panelSize` is the panel's size: the agent's `app.w`/`app.h`,
   else the manifest's `size`, else the default, held to `APP_SIZE`. `node-app-apply.ts` sets it as
   `--vb-app-w` and `--vb-app-h` through the CSSOM (`applyPanelSize` from `vb-node.ts` `render`, then
   `applyApp` once list_apps names a manifest size); `node.css` makes the card that wide plus its border, whatever its emphasis: the
   panel runs edge to edge inside the border (the slot reaches past the content's side padding, so
   the title, tags and notes keep theirs; `app-cards.spec.ts` "end to end: …" and
   `app-states.spec.ts` "every state the app host gives…" check its sides meet the border within
   1px). The slot is the panel's size in every state (`node-app.css`: a state without a panel hides
   the frame and keeps its room, and draws its view over it), and Allow is in the bar, so a state
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
   | `needs-approval` | the panel; Allow in the bar, its tip "Not allowed yet" |
   | `changed` | the panel; Allow in the bar, its tip "Code changed" |
   | `ready` | the panel; "Allowed ▾" in the bar once the person allowed this version, else nothing |
   | `missing` | "App <id> not found" and Check again in place of the panel |
   | `invalid` | "This app has problems", the problems (a list that scrolls, a tab stop) and Check again |
   | `broken` | "This app stopped" and Restart |
   | `past` | the app's title and "Apps don't run in past versions." |

   The words are in `packages/ui/src/words/node-app.ts`, laid out by `node-app.ts` `COPY`; `appView`'s `control` (`allow`, `allowed` or `none`) says
   which bar control shows, and `reason` is Allow's tip. `node-template.ts` `appStateMarkup` draws
   the view. `node-app-apply.ts` `applyApp`, from `vb-node.ts` `update`, applies it in place (the view
   rebuilt only when it changed, the bar's control shown and named, its menu closed when
   "Allowed ▾" hides, the bar's name) and unloads the frame in any state without a panel.
4. **Its buttons** carry `data-app-act` for the page's delegated listener: `app-allow` and
   `app-revoke` (the action layer's acts: the person only, confirmed by the page) and `retry`
   (Check again, Restart: the page reads list_apps again). Each is named with the app; Allow's name
   ends with its reason ("Allow app: Calculator. Not allowed yet"), so a screen reader hears why.
   "Allowed ▾" (`data-app-menu`, "App allowed: Calculator") is a menu button: the page opens its menu
   upward over the panel, in the board's menu look, focuses Stop app ("Stop app: Calculator") and
   handles its keys with `#ui` `menuKeydown` (`apps/app-cards.ts` `createAppMenus`; Esc gives
   focus back to the button). While an act is in flight its bar control is `aria-busy` (loading)
   and when it is refused `data-error`, until the next press. The bar's controls (Allow, the drawer arrow, Open) and
   the state view's buttons hide at far zoom (`node-app.css`, `[data-zoom='far']`). A state change that takes the focused
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
   `:focus-within` on a frame of another origin). It wears the board's one ring (`--vb-ring-style`), so a click into the panel
   draws none and a Tab into it does (`app-cards.spec.ts` "the panel's focus ring"). The board cannot see keys inside the panel, so Esc back to the card needs the panel to send
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
     the card set moves a card already in the page only when a timeline's date order asks it to
     (`card-numbers.ts` `readingOrder`: otherwise by the card's number, which never changes), and then with
     `moveBefore`, which the frame takes without unloading (§ The timeline: the node and the page, 12).
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
   (every state's view, words and markup), `node-window.test.ts` (the bar), and the gallery
   (`apps/board/src/gallery/app-frame-section.ts`: the frame unloaded and loading, an app window in
   every state, the bar's app status loading, refused and with its menu open, a cut name and its tip, the flag off), which `tests/pages/gallery.spec.ts` checks has samples. The element
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
2. **Images on or off.** `renderMarkdown`'s `images` and `svg` options, with `imageRoute`: whoever renders
   passes them, so two boards on one page can differ, and left out each reads its flag's default. The board
   reads them from its host once (`host.ts` `markdownOf`) and gives them to every surface it draws (card
   bodies, notes and replies, the note bubble, parking text: `NodeTemplateOptions.markdown`,
   `RegionFrameOptions.markdown`, `VbNoteBubbleElement.show`); the standalone chat and the gallery read
   the page's (`flags.ts` `pageMarkdown`).
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
2. **The view** is `<vb-image-view>` (the board puts one in its root, beside the stage, so its keys and
   pointer never reach the stage; a gallery sample, on the body), a native modal `<dialog>`
   named by the image's alt text: a backdrop (`--vb-scrim`, the board behind softly blurred), the image,
   and the × in its top corner (named Close, tip "Close · Esc", 40px). It fills the board's root, not the
   window: the "screen" below is the root's box, on the standalone page the whole window. It stays a real
   modal, the one thing a host feels: its page is inert while the view is open (Esc, a click anywhere else or the × close it).
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
   images off, each flag by its call, the route it is given), `markdown-safety.test.ts` ("an image cannot break out of its
   shape…"), `markdown-adversarial.ts` `IMG_SHAPE` (no `<img>` but the fixed shape),
   `markdown-commonmark.test.ts` ("CommonMark: Images"), `image-view-core.test.ts` (`fitImage` at
   1600×1000 and 1470×956, small, square, held to the screen; `flipFrom`; `motionMs`),
   `packages/format/tests/flags.test.ts` (cardImages on by default). In a browser:
   `tests/pages/board-guest.spec.ts` (under a host: its flags, its route, inside its root, gone with `unmount`),
   `tests/pages/card-images.spec.ts` (at the card's width and measured with it; 70% by click and by
   keyboard for a wide and a tall image at both screens; Esc, a click outside and the ×, focus back, Tab
   kept, no pan or zoom; a replaced image after select, the conditional request, nothing on a timer;
   opening asks too; motion from the card's box about 220 ms; reduced motion; axe and screenshots light
   and dark) and `card-image-states.spec.ts` (missing, a fake png, over 8 MB, out of the folder, the
   internet, no alt text; the flag off; far zoom and off screen; a file that goes while opening; the
   gallery, light and dark).

## The node's edges (D-099, D-100; node overhaul FE_01)

Every node is drawn this way (D-099; node overhaul T_04 made it the only node). The page passes `render(n, { edges,
icons })`: `edges` is the board's skin row from `SKIN_DEFS` (the default skin's when left out), `icons` the project's
icon library it holds. The look is
`design/mockups/node-skins/default-skin-*.html` and the states `design/mockups/node-states/`, as PLAN.md's
"Design review of DESIGN_01" rules them.

1. **The skin registry** (`packages/ui/src/skins.ts` `SKIN_DEFS`): one row per `SKINS` name saying where the answer
   sits (`disc` or `switch`) and where the marks sit (`edges` or `plate`). The template reads a row, never a skin's
   name (`node-edges.ts` `edgesMarkup`); the element sets `data-answer-at` and `data-marks-at` from it, and CSS places
   by those. Every row offers the same actions: the menus never read the skin.
2. **The marks** (`node-marks.ts` `nodeMarks`, carried as `NodeState.marks`; pure): the number is the Bookmark toggle
   (aria-pressed; its name stays put); the answer is none on a node that only tells, else
   waiting, ticked or crossed, with an open proposal's mark (`proposed`, the dashed ring; an out-of-date one is no
   ring); the change badge is New, "N updates" or, once seen, a quiet "vN" from v2 (`CardConditions.ver`, the
   node's latest version); the notes mark counts every note and reply, is filled while a reply is unseen and shows two
   bubbles for a note on several nodes; Awaiting is a quiet tab. Keys come from the action registry (`MARK_KEYS`);
   History's H is `HISTORY_KEY`, since history is no act.
3. **The template** (`node-edges.ts`): no footer, no notes on the node, no bottom tabs. In visual order, so reading and Tab
   order follow it: the number, the kind tab (or, for a node with an icon, a grip and the kind's word over the title),
   the disc on a node that asks, the body (a written handover is a section of it), the badge, Awaiting and the notes
   mark on the bottom edge. Items also get the history box, holding the step section and stepper on top (planner's call
   9), which the badge controls, and the proposal box. An app card is a window (§ The app window).
4. **The element** (`vb-node.ts`, `node-edges-apply.ts` `applyMarks`, `applyTone`): applies the marks in place; sets the
   tone as `data-vb-tone` (the name or `hue`) and `--vb-tone-h` through CSSOM from `toneView`'s checked value, never a
   style attribute. It binds no popover on the marks: the page opens the history and proposal boxes and the menus
   (FE_02), and the answer picker on a pointer resting on the disc (D-112). A locked board pauses the disc (aria-disabled) and read-only the number too,
   but a paused mark keeps its look at rest (point 328); the page sets `data-saving`, `data-failed` and `data-locked`
   on a pressed mark for a moment.
5. **The icon set** (`packages/ui/src/icons/`): `ICONS`, every `ICON_NAMES` name and every mark's icon as path `d`
   strings on `ICON_BOX` (the compiler fails on a name with no drawing; each passes `iconPathProblem`), and
   `icon(name, cls, library?)`: a library name (`x-…`) draws from the page's `IconLibrary` (`iconLibrary` of a
   `list_icons` reply with `paths`), each path checked again and drawn as a `path` the code builds with the set's one
   stroke (`icons.css`); a missing name or a failing path draws nothing, so the tile is the plain tile.
6. **The menus** (`node-menus.ts` on `packages/ui/src/menu/menu-template.ts` `menuMarkup`, the base's menu look at one
   size, `menu-fixed.css`): the number's (Bookmark or Remove bookmark, Save for later or Bring back, Put back on a moved
   node), the answer picker (Tick and Cross side by side, `data-menu-look="picker"`; drawn Cross then Tick with
   `data-cross="left"`; a row under the pointer, after Tab or with `data-look="hover"` fills with its answer's colour,
   `--vb-answer-tick` or `--vb-answer-cross`, its icon `--vb-answer-mark`) and the right-click list (the six
   actions with their keys, then Width ›, a row with `popup` that opens the bar's width menu; no Tick or Cross on a node that only tells, no Save for later or Width on an app, no Width with the nodeSize flag off). Markup only, drawn
   hidden, rows acting by `data-menu-act`; the page opens them (FE_02, `mark-menus.ts`: the shared menu's keys, `menuKeydown`, and a press outside through `dismissable` with `clickWithin`, so a pan leaves one open).
7. **Styles** (`node-edges.css`, tokens only): marks 22px tall with a 28px hit area (3px of transparent edge); the disc
   is `--vb-answer-size` (24px, D-112), in the kind's colour (in dark 15% toward black, in its own rule, so its white
   keeps Lc 45 on every kind, `tests/plugin/token-contrast.spec.ts`), with a small white tick and cross (the icon set's
   `tick-cross`, `.vb-mark-wait`) while waiting, green with a tick or red with a cross once answered; hover rings it in
   the kind's colour and a press fills the ring; the disc, the icon
   tile and the notes mark on one vertical line, 34px in from the right edge; selection is the node's own border,
   thicker and brighter (an inset ring of `--vb-select-w`, no outer ring); the node's colour (`--vb-node-color`) is
   the kind's, or its tone's line (point 366, FE_04): it colours the grip or kind tab, the top line, the hover and
   selected borders, the tags and the tile, while the kind's word over the title and the disc keep the kind's; the
   ring is `--vb-focus-edge`, the board's one focus colour (blue, `--vb-focus`; point 627, D-109), and shows after Tab only.
   The body (`node.css` `.vb-node-body`: its paragraphs, lists and the rest of its Markdown, through `--vb-md-text`) is
   `--vb-card-text`, 14px, under the 15px title, in every skin (D-112).
8. **Kept true by**: `packages/ui/tests/icon-set.test.ts` (every name drawn, every drawing passes the check, a library
   icon from its paths, missing, failing and too many draw nothing), `node-marks.test.ts` (every answer, badge and notes
   state; the tone; `nodeState.marks`), `node-edges.test.ts` (the order of the marks; the tile;
   no tone in the markup; the three menus; every skin offers the same actions), `node-paused.test.ts` (the marks
   pause). In a browser, `tests/pages/node-edges.spec.ts` (the element builds the template's markup; the tone through
   CSSOM; Tab order, names and hit area; the ring after Tab only, in each theme; axe; screenshots light and dark) and
   the gallery's "The node's edges" section (`apps/board/src/gallery/edges-section.ts`).

### On the board (node overhaul FE_02)

The page wires the marks (`apps/board/src/board/controller/node-edges.ts` `createNodeEdges`; `cards/mark-flow.ts`, which
hears the presses; `cards/mark-acts.ts`, `mark-menus.ts`, `mark-boxes.ts`, `mark-tips.ts`, `mark-place.ts`, loaded once
the board is idle or on the first press).

1. **The root**: `data-vb-skin` on the board's root, from the board's skin (`skinOf`). A new skin draws every node
   again in its row. Decision's fuchsia is the token's own value (`tokens.css` `--vb-kind-decision`, D-100 4).
2. **The number**: a click toggles Bookmark at once (`bookmark` or `unbookmark`); held 400 ms (`HOLD_MS`; a long press
   on touch) it opens the number's menu instead and bookmarks nothing; the menu key or Shift+F10 on it opens the menu.
   B on a node bookmarks it.
3. **The disc** (D-112, amending DD-07): a click, Enter or Space on it (focus on Tick), or the pointer resting on it for
   `REST_OPEN_MS` (400 ms, `packages/ui` `tip/rest-open.ts`, the layout button's wait too; `cards/disc-rest.ts`; not
   on touch, not on a disc too small to press, not while another menu or box is open; focus stays where it is) opens the
   answer picker over the disc with Tick centred on it (`placeOver`), Cross on its left, or on its right when the
   stage has no room there, so a click without moving ticks: two clicks in one place answer, a double click included.
   Left and Right move as drawn. Esc, a click elsewhere or the pointer leaving the picker and the disc (after
   `CLOSE_GRACE_MS`, read from where the pointer is) closes it; once it closes with the pointer still on the disc, the
   disc opens nothing more until the pointer leaves it. Tick and Cross are the item acts (`item-acts.ts`: its 400 ms
   guard; a lit answer pressed again clears it). A disc whose node has a proposal opens the proposal box on a click,
   and nothing on a rest.
4. **History and notes**: the badge, or H on a node (the focused one, else the one selected; FIX_01: Hide answered is
   Shift+H, `input/keys.ts`, `key-help.ts` `HIDE_KEY`), opens the history box (its stepper opens with it,
   `update-flow.ts`); the notes mark, or C, the conversation. Esc gives the focus back to the mark that opened a menu or a
   box (the node, after C); an Esc closes the newest layer open only (`base/layer.ts` `dismissable`). A and X answer
   as the disc does: on a locked board, a past version or a read-only ledger the lock on the mark for a moment, no toast. A box with no room on the node's right opens on its left.
5. **The actions**: right-click on a node, a long press on touch (`LONG_PRESS_MS`), the menu key or Shift+F10 open the
   right-click list at the pointer (from the keyboard, near the node's top left); never on the board's background.
6. **One at a time**: one menu or box is open; each menu sits on the stage at one size and is placed again from its
   anchor whenever the view moves, so it stays attached while the person zooms or pans; a drag outside it (a pan) leaves
   it open, a click outside, Esc or Tab closes it, and focus goes back to what opened it.
7. **Tips and moments** (`mark-tips.ts`): a mark's `data-tip` shows above it after a hover of two seconds
   (`TIP_HOVER_MS`), at once on keyboard focus, never after a click. A press the board can't take (locked, read-only, a
   past version) sets `data-locked` for a moment with the reason beside the mark (`MARK_MOMENT_WORDS`); a write on its
   way past 150 ms sets `data-saving`; a write that failed sets `data-failed`, its words shown for a few seconds, then on
   a hover, until the next press.
8. **A container seen** (point 308, `cards/container-seen.ts`): a click inside a container on a board that isn't
   read-only clears its pill on this screen only, until its next change (api.md 158), and quiets the agent's replies
   under its note (`data-unseen` on `.vb-nblock-reply`, tracker N47). Nothing is written.
9. **The icon library** (`cards/icon-library.ts`): `list_icons` with `paths` when a ledger opens and when an `icon` line
   arrives; the nodes naming a library icon draw again. A node with an icon is dragged by its grip (`pointer.ts` `HANDLE`).
10. **The skin** (D-100 2): the "⋯" menu lists each skin (`menuitemradio`, the board's ticked) and writes the `skin`
    act; paused, with the reason, on a read-only ledger or a past version.
11. **Kept true by**: `apps/board/tests/mark-place.test.ts`, `container-seen.test.ts`, `item-acts.test.ts` (a press
    says what it came to), `key-help.test.ts` (B, H, Shift+F10), `bookmark-flow.test.ts` (a format-19 ledger's flags
    migrate to bookmarks); in a browser, `tests/pages/node-edges-board.spec.ts` (each mark, key, menu and box; one at a
    time; size and place while zooming and panning; axe, dark and light) and `node-edges-seen.spec.ts` (the root, the
    container seen and N47, the icon library, the grip, the skin, a locked board, a failed write).

### Zoom groups (D-101; node overhaul FE_05; FIX_02, points 430-438, 444, 445)

The source is one table: `packages/ui/src/zoom-rules.ts` `ZOOM_RULES` (`#ui`), one row per part with its rule
(scales, fixed, grows to a minimum, clamped range, hidden below), its numbers and the CSS variable or stage attribute the
page writes for it. Read it there; this section says how it is held. `apps/board/src/board/canvas/viewport.ts` reads the
numbers and writes `--vb-zoom` (the regions layer: a container's title line and rail, the hover halo, counter-scaled),
`--vb-mark-grow` (the cards layer: the edge marks), `data-marks="small"` and `data-zoom="far"` (the stage); `mark-boxes.ts`
and `notes.ts` write `--vb-box-scale` from the one `boxes` row (FIX_05, point 484, D-104): every box beside a node is
drawn at `boxScale(k)`, one size below 80%, with the board to 120%, one size above (the history and proposal box, in the
node, at `boxScale(k) / k`). The CSS reads only those variables; the
selection bar's gap (`selection-bar-core.ts` `pillGap`), the zoom steps (+ and -, the wheel) and the fits read the table
too. `apps/board/tests/zoom-rules.test.ts` holds the table equal to tokens.css (`--vb-mark-min`, `--vb-mark-h`) and to
`viewport.ts`, checks every variable it names is read by the CSS and set by none, and fails on a zoom constant declared
anywhere else in the board's or the patterns' code.

`MARK_MIN` and `MARK_H` are `--vb-mark-min` and `--vb-mark-h` in tokens.css; `apps/board/tests/zoom-groups.test.ts` holds them
equal. Kept true by that test and, in a browser, `tests/pages/zoom-groups.spec.ts` (at 20%, 40%, 100% and 250%: mark
sizes, the shared vertical line, a menu's size, the conversation's scale, the history and proposal box's size while zooming).

One breakpoint follows (FIX_02, the maintainer's points 430 to 438, replacing FIX_01's two): the far one, `MARK_FAR_K`
(the zoom where a mark needs three steps of growth, about 37%). Above it the marks keep their minimum and every mark takes
its press with the hand cursor. Below it nothing grows any more: the growth stays what it is at the breakpoint, so the
number, the disc, the notes mark, the badges, the kind tab and the grip scale down with the node from there, with no
jump, nothing moving or hiding (only container titles and their rail keep their size); the stage carries
`data-marks="small"`, a press on a mark selects its node only (`smallMark`, read by `input/pointer.ts`, `input/wiring.ts`,
`mark-flow.ts`, `mark-tips.ts`), no hand and no hover tip, and the keyboard reaches and presses every mark as ever.
`apps/board/tests/zoom-groups.test.ts`; `tests/pages/zoom-groups.spec.ts` ("nothing jumps or hides at the far
breakpoint"); `tests/pages/small-marks.spec.ts` (presses at 83% and 45%, a press selecting the node at 30%, 24px hit areas
and axe at 100% in both skins). Below 100% page specs excuse axe's `target-size` only for a mark drawing under 24px
(`tests/pages/helpers.ts` `expectNoAxeOnBoard`): the keyboard reaches it, and the person zooms in to press it.

## Flow branching and direction (PLAN decisions 19 and 25, D-100 5; node overhaul BE_01)

No flag since node-overhaul T_04. The layout stays a pure
function: a container's direction arrives as an input (`LayoutOptions.directions`), never a page read.

1. **Branches on rows** (`packages/layout/src/modes/branches.ts` `branchRows`): a flow is drawn as
   chains, each on one row from its first card to its last. The main line follows each card's first link in card order;
   a branch takes the nearest row to the card it forks from (below first, then above) that is free over its whole run;
   a branch that rejoins keeps its row up to the column before the card it rejoins, so it comes back with one link; a
   run that skips columns keeps its row empty there, so its long link runs straight. Cards not linked to each other are
   separate bands of rows. `flow.ts` keeps the rows unless their links, routed as the board routes them, cross more than
   the stacked flow's (up to `ROUTE_WEIGH`, 30 links; above it, straight strokes), so branching never adds a crossing.
2. **A linked row or column** (`modes/grid.ts` `row`, `column`, `plainChain`): a `row` whose links
   are more than a chain in card order (a link between two cards that are not neighbours in card order) is laid out as
   a flow across, a `column` as a flow down. No links, or a plain chain, stays one line in card order.
3. **Down** (`flow.ts` `down`): a flow across on cards turned a quarter, turned back; layers top to
   bottom `COL_GAP` apart, cards in a layer side by side `GAP` apart; under `match`, every card the widest card's width;
   cells read as drawn. `ModeOutput.down` marks it, `BoardLayout.downward` names those containers, and the router
   (`routeLinks(links, boxes, groups, downward)`) leaves and enters such cards by the bottom and top first
   (`ports.ts` `sidesFor`), with ports kept off the middle fifth of the side, where the kind tab sits (`offCentre`). A
   drag reroutes with the layout's `downward` too (`input/wiring.ts`, `selection/container-drag.ts`).
4. **Which way** (`directionOf`, api.md 189): the page passes each container's direction from `directionOf` on the
   shown state (`canvas/draw.ts` `DrawDeps.direction`); `show_layout` reads the same fold
   (`server/engine/reads.ts` `showLayout`), so its answer stays true for the picture. The layout cache keys a container
   on its direction (`canvas/layout-cache.ts`).
5. **The board's choice** (`chrome/FlowMenu.svelte`, in the header's end group, `ToolbarEnd.svelte`): a button with its words
   at full ("Flows: Auto"; its icon alone on a narrow bar), its Flows menu, Flows: Across, Flows: Down and
   Flows: Auto (`menuitemradio`; choosing the ticked one closes the menu and writes nothing; from the header's half form
   the same rows are in "⋯", `ToolbarMenu.svelte`; the person's board-wide choice ticked, Auto when they made none), write the `direction`
   act with no `region` through the one sender (`controller.ts` `setDirection`; `io/acts.ts` names its board); Auto
   clears the choice, giving back each container's own. Paused, with the reason, on a read-only ledger or a past
   version. A container's own choice is FE_07's layout control. Words: `words/toolbar.ts` `directionName`,
   `directionTip`, `directionTitle`.
6. **Room for edge marks** (`packages/layout/src/types.ts` `EDGE_ROW_GAP` = 40): while nodes draw their marks on their
   edges (a skin whose marks are `edges`, `canvas/draw.ts`), the gap under a node is at least 40px, so its bottom marks
   (11px below) and the next node's number, kind tab and disc (12px above, D-112) stay clear; side by side stays `GAP`. A plate
   skin keeps the row gap as it is.
7. **Kept true by**: `packages/layout/tests/flow-branches.test.ts` (the maintainer's example in row, column and flow,
   both directions; a plain chain stays one line; down is across turned; `structureOf` agrees; seeded boards with no
   overlap, no line under a card off the fallback, deterministic; the edge gap; `flow.ts` `across` keeps the rows only
   while their routed links cross no more than stacked),
   `layout.timing.ts` (1,000 cards and 1,200 links with branches, across and down, under 100 ms),
   `apps/board/tests/flow-direction-layout.test.ts` (the precedence as the layout sees it, another page draws the same,
   the cache), `api-layout-direction.test.ts` (`show_layout` both ways); in a browser, `tests/pages/flow-direction.spec.ts`
   (the header's Flows menu, the act, the redraw, read-only, branching rows, the edge gap, the gallery's section, axe dark and
   light). The routing seed 174 of `routing.test.ts` is a known shared stretch (`SHARED_KNOWN`), a follow-up for the router.

## The timeline: layout (D-105; Timeline BE_01, PLAN.md decisions 7-15, § Design review 587-595)

A container's nodes that carry the `timeline` key share one line. It is not a mode (`MODES` is unchanged): `layoutRegion`
(`packages/layout/src/board.ts`) runs it beside the container's mode, and the layout stays a pure function with no flag
(the page's half, the flag's one gate and the drawing, is the next section). The geometry type is `#format` `geometry.ts`
`TimelineDrawing`.

1. **The split** (`layoutRegion`): the visible nodes with `timeline` go on the line (`timeline.ts` `layoutTimeline`), the
   rest through the mode with the links among the rest only; a link touching a dated node still routes (decision 13).
   With no dated node the layout is exactly the one before: no `timeline` on the piece, the region or the structure.
   Hidden nodes (`LayoutOptions.hidden`) leave the line.
2. **Order and sides** (`timelineOrder`, from `#format` `sortByTimeline`; `timelineSide`): by start, the coarser first at
   one start, equal dates by card number; above, then below, alternating (run down: left, then right, point 594).
3. **Across** (`across`, `timelineStep`): one step for the whole line, call 6's formula: the least that keeps two nodes
   on the same side `TIMELINE_SIDE_GAP` (28) apart, over neighbours too, at least `TIMELINE_MIN_STEP` (120). The first
   dot is at least `TIMELINE_YEAR_ROOM` (56) along the line, for the year at its start. A node above sits on its bottom
   edge and a node below hangs from its top edge, each `TIMELINE_STEM` (30) from the line; the stem meets the middle
   of the facing edge. The line runs from the content's left to its right edge (`reachTimeline`: the nodes below count),
   at least `TIMELINE_END_ROOM` (30) past the last dot, for the arrow.
4. **Run down** (`down`; § Design review 587, 594, DESIGN_01 run 2): the line one stem from the widest node on each side
   (the exact middle under `match`); the first node at the top of the content; each later dot as high as keeps its
   node the board's row gap (`RegionOptions.rowGap`, else `ROW_GAP`) below the last node on its side and
   `TIMELINE_MIN_DOT` (56) below the dot before; each node centred on its dot, so the stem meets the middle of its facing
   side. The line ends `TIMELINE_END_ROOM` past the last dot.
5. **Years and bands** (`yearsOf`, `bandsOf`): the year at the line's start (its `at` is `line.from`: the label begins
   there) and at each turn, halfway between the two dots (`at` is the label's centre); none between dots of one year.
   A band from the first to the last dot of each run of two or more exactly equal dates.
6. **Widths** (`#format` `widthsOf` with the timeline's direction, decision 21, point 595, § Design review "After FE_02"
   (a)): one setting for the whole container, its dated and its other nodes alike: the person's choice, else the
   container's `widths`, else `match` run down and `own` across (`match`: every dated node as wide as the widest), in
   place of the mode's default. The caller passes it per container (`LayoutOptions.widths`, worked out with `widthsOf`);
   a container left out gets it from `layoutRegion`, as does `structureOf`, and `show_layout`'s `widths` reports it.
7. **The rest** (`beside`): the mode's own answer moved `REGION_GAP` below the timeline's box, or, run down, `COL_GAP`
   to its right with tops level with the line's start (569C); its lane bands move with it (`Lane.x` set when they no
   longer start at the frame's left).
8. **Pins** (decision 15): a pin on a dated node is ignored. Pins on the rest apply after the move (region-local, as the
   page writes them) and win, even over the line; an unpinned card moved out of a pin's way keeps out of the
   timeline's band (`bandOf`: across, its rows the whole way right; run down, its column the whole way down).
9. **Packing** (`packRegions`): `RegionPiece.timeline` (region-local) becomes `RegionBox.timeline` in board coordinates
   (`shiftTimeline`), as a lane does. Dated nodes are in `groups` whatever the mode, so links route around them; in
   `radial` the rest stay out, as before.
10. **Direction**: the region's `direction` (`RegionOptions.direction`, which the page passes from `directionOf` for
    every container), whatever the mode. `ModeOutput.down` stays a flow's.
11. **`show_layout`** (`structure.ts` `structureOf`, `server/engine/reads.ts` `showLayout`): the same split; `cards`,
    `columns`, `links`, `crossing`, `empty` of the rest through the mode, and `timeline` (`direction`, the dated cards
    in line order with `n`, `at` and `side`) from `timelineOrder`, so it agrees with the picture. Left out with no
    dated card.
12. **Kept true by**: `packages/layout/tests/timeline.test.ts` (order, across and down over random sizes with no
    overlap, the step, packing, widths, years, bands, one node, determinism), `timeline-region.test.ts` (the rest in
    every mode both ways, the line to the content's edge, only dated nodes, pins, hidden, links, packing and groups,
    widths, `structureOf` agrees with `layoutRegion`, fixtures with no dated node, determinism), every other
    `packages/layout/tests/*` unchanged, `layout.timing.ts` (40 dated and 40 undated, reported),
    `apps/board/tests/api-layout-timeline.test.ts` (`show_layout` with and without a timeline, the person's direction).

## The timeline: the node and the page (D-105, D-106; Timeline FE_01, FE_02)

The layout's half is the section above. This is the rest: how a dated node draws (FE_01, `packages/ui`), and how the
board page joins the layout's geometry to that drawing (FE_02, `apps/board/src`; always on since T_03).

1. **A dated node** (`#ui` `node/node-date.ts` `datedOf`): a stored date on any kind but an app card; the template, the
   element and the Markdown entries all ask this one function. `vb-node` sets `data-timeline` to the stored value in
   `render()` and clears it when a version drops the key (`vb-node.ts`): the hook the page's pointer and CSS read.
2. **The header** (`node-edges.ts` `datedHeading`, `timelineLabel`): `<p class="vb-node-date">` first on the node, a
   `<time datetime>` holding the short form only (`OCT 13`, `OCT 2026`, `2026`, `OCT 13 · 14:30`; upper case is CSS's),
   hidden from assistive technology; month names and forms are words (`words/node.ts`). In the default skin a dated node has no kind tab and no grip, and its kind is a small word at
   the end of the date line (`.vb-node-date-kind`); Command Lens keeps its plate, with `cursor: default`, and the date
   heads the body. The date takes `--vb-text-date` in the skin's display font and the kind's colour (a toned node's
   ink); the title `--vb-text-title-dated`; only on a dated node. The card's accessible name carries the full form
   after its kind ("Item 6, Action, 13 October 2026: Pricing page live, Open"; `node-core.ts` `nodeLabel`,
   `words/node.ts` `dateInName`), so moving card to card a screen reader hears the date, once: the content holds no
   second, visually hidden full form (point 602), so a copy of the card's text holds the date once too. Kept true by
   `packages/ui/tests/node-date.test.ts`, `node-dated.test.ts` ("the four header forms"), `node-core.test.ts` ("a
   dated card's name") and `timeline.spec.ts` ("a dated card's name", "the date is said once": a real copy, both
   skins).
3. **Entries** (`MarkdownOptions.entries`, which the node template turns on for a dated node; `markdown/entries.ts`
   `boldLead`; `render.ts`): a `###` heading and its blocks, a paragraph opening with a bold name, or a top-level list
   item opening with one, draw as `.vb-md-entry` with `.vb-md-entry-name`. One colon closing the name inside the bold
   (`**Name:**`) is dropped from the name, as one leading separator is from the rest. Off, the output is byte for byte
   what it was. Kept true by `packages/ui/tests/markdown-entries.test.ts`.
4. **The line's drawing** (`#ui` `timeline/`, the `timeline` pattern): `timelineMarkup(drawing, look)` writes one
   container's `<g class="vb-timeline" aria-hidden>` (bands, the line and its arrow as paths, stems, years, a dot per
   dated node with `data-node`, `data-side`, `data-kind`, `data-tone`); `applyTimelineLook(root)` colours the dots in
   place through CSSOM (the page's CSP). Kept true by `packages/ui/tests/timeline-template.test.ts`.
5. **No gate** (switched on by T_03; nothing switches it): `controller.ts` `redraw` passes the
   view as stored, so the layout, node, pointer, wires and region all see a date wherever the ledger holds one. An app
   card never holds one (`#format` `app-shape.ts`, the write refuses it). Kept true by `tests/pages/timeline.spec.ts`
   ("a board with no key": no line, no date header, no date in a card's name).
6. **Layout inputs** (`canvas/draw.ts` `lay`, `canvas/layout-cache.ts`): the page passes each container's widths from
   `widthsOf` with its direction when a dated node of it is drawn (the timeline's default, After FE_02 (a)), and its
   direction for every container; the cache's key holds each node's `timeline` (`nodeKey`), so a date written, changed
   or dropped lays out exactly its container. Kept true by `apps/board/tests/layout-cache.test.ts` (the random walk
   writes and drops dates).
7. **The line on the board** (`links/timelines.ts` `createTimelines`, in `wires.ts`'s `vb-timelines` group between
   the lane bands and the connectors, and its `vb-timeline-dots` group, the layer's last): per container, a
   `g.vb-timeline[data-region]` holding its bands, line, arrow and years (`#ui` `timelineLineMarkup`) in its own
   coordinates, placed at the container's origin; per dated node, a `g.vb-timeline[data-node]` holding its stem in
   `vb-timelines` and another holding its dot in `vb-timeline-dots` (`timelineDotMarkup`, look from the drawn node's
   kind and tone, `draw.ts` `lookOf`, coloured by `applyTimelineLook`) in the node's coordinates, placed where the node
   is. So the dots draw above every link and label, the line and stems beneath the links (FIX_04). The groups
   stay from draw to draw, their markup rewritten only when it changes, and their place is the SVG `transform`
   attribute (`place`), in the SVG's own units as the links' path data is: a CSS transform on an SVG child is scaled
   again by WebKit's page zoom, which moved the line off its cards in Safari zoomed in and in nclite at 110%. While the
   cards glide to a new layout the line, stems and dots are hidden with the links and fade back where the cards land
   (`board.css` `.vb-wires.settling`; maintainer, 2026-11-22, points 5-6, replacing After FE_02 (b)'s glide). Each year
   is drawn over a halo of its own (`vb-timeline-year-halo`), so WebKit never paints one letter's halo over the
   letter before it. Behind frames and cards with wire layers on; scales with the world, no zoom
   number. A lane band beside a timeline run down starts at `Lane.x`. Kept true by `timeline.spec.ts` ("the line":
   order, sides, band, years, arrow, every stem meeting the middle of its card's facing edge and every dot on the line;
   "while the cards glide", every frame; "from 20% to 250%"); `timeline-layers.spec.ts` (every dot after every link
   and label, the line and stems before the links; "placed in SVG units"); `timeline-template.test.ts` (each year
   over its halo).
8. **No drag on a dated node** (D-105 4): `input/pointer.ts` starts no move inside `vb-node[data-timeline]` (`DATED`),
   its plate included, so a press there is a click; `selection/moves.ts` `placeable` keeps dated nodes out of what a
   drag carries and out of a drop's pins; `canvas/places.ts` `pin` (Alt+arrows) writes nothing for one. No new action
   or record: a dated node simply never writes a `pin`, and the layout ignores one written anyway. A press on its plate,
   its edge or its content's own box (padding and gaps, not an element inside) is `bare`: it selects no text, so a
   drag where an undated card would move leaves no selection across cards; the text inside selects as on any card.
   Kept true by `timeline.spec.ts` (both skins; a selection drag moves only the undated card; Reset places leaves the
   line; "selects no text on a dated card").
9. **Move to** is the existing `move` (Shift+M, the selection bar's Move to): a dated node moves to another container
   and joins its line (`timeline.spec.ts`).
9a. **Links never run under a card** (PLAN § Out of Scope: links route around cards "as today"): the cards above and
    below a line are staggered, so between the facing sides a link would take (a card above to one below and to its
    left, say) no gutter is free, and the router used to fall back to its plain elbow under a card. `#layout`
    `route/route.ts` `lineFor` now tries the other pair of sides (`route/ports.ts` `otherSides`: top and bottom for
    left and right, and back, each port in the middle of its side) before the elbow. From a dated node's facing side
    the link starts where the stem does and crosses the line at the node's own dot. Kept true by
    `packages/layout/tests/timeline-routes.test.ts` (every link from a dated card, 41 size seeds, across and down, both
    skins' row gaps: none under a third card) and `timeline.spec.ts` ("never runs through a card", both skins, across
    and down). Routing round the line itself stays out of scope: a link may still run along the line's band where it
    is the only free one.
10. **Direction** (`canvas/render.ts` sets `RegionState.timeline` from the layout's region; `#ui` `vb-region.ts`
    `applyLayoutControl`): the layout menu's Across, Down and Auto show on a flow or on a container with a timeline,
    marking the container's direction; the layout button names the direction on a flow only. Kept true by
    `timeline.spec.ts` (Down draws the line down with the other cards to its right; Auto gives the agent's back; a grid
    with no timeline has no direction row).
11. **Widths**: the container's Match card widths switch covers its dated nodes as well as the others (point 595). With
    no choice, a container with a timeline takes the timeline's default for all its nodes (`match` run down, `own`
    across) and the switch shows it (`#ui` `regionState` passes the laid-out box's `timeline.direction` to `widthsOf`),
    so it always shows what is in force. Kept true by `packages/ui/tests/region-widths.test.ts`,
    `packages/format/tests/widths.test.ts`, `packages/layout/tests/timeline-region.test.ts`,
    `apps/board/tests/api-layout-timeline.test.ts` and `timeline.spec.ts`.
12. **Tab order** is the board's reading order (`card-numbers.ts` `readingOrder`, which also orders the cards in the
    page and J and K), read the way the line draws (point 601): a container with a timeline is read at its first
    card's place, its dated cards in the line's order (`#format` `sortByTimeline`, as the layout), then its other cards
    by number; every other card keeps its card-number place, so a board with no date reads
    exactly as before. Across and run down alike. A card already in the page that the order moves goes with
    `moveBefore` where the browser has it (`cards/cards.ts` `order`), and `vb-app-frame` takes the move
    (`connectedMoveCallback`), so a loaded app panel beside a timeline keeps its document. Kept true by
    `apps/board/tests/card-numbers.test.ts` ("reading order"), `timeline.spec.ts` ("Tab and Shift Tab walk a
    timeline", both forms) and `app-alive.spec.ts` ("a timeline reordering the cards").
13. **Gallery**: the pattern's section (`gallery/timeline-section.ts`, the node and the drawing from hand-made
    geometry) and "The timeline on the board" (`timeline-board-section.ts`: a container laid out for real by the
    board's drawing, across and down, default and Command Lens; `mini-board.ts` takes the skin's row as `edges`), both
    shown by default. Kept true by `timeline.spec.ts` (the gallery's section, axe on it, light and dark).

## The selection bar's node commands, and Z (node overhaul FE_06)

The rulings are `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/PLAN.md` decision 9 (D-099) and D-101.

1. **Z fits the selection.** With focus on a container's title line, Z used to zoom to that container even when nodes
   were selected (`keys.ts` sends it to `zoomRegion` first). `stage-handlers.ts` `zoomRegion` now answers only with
   nothing selected, so the selection wins and the key falls through to `zoom-selection` (`selection-flow.ts`
   `zoomTo`); with no selection the title line's container is zoomed as before. Pinned by
   `tests/pages/zoom-selection.spec.ts` (Shift-click, Cmd-click, Ctrl-click and a lasso, each with focus on a node, on a
   mark, in the bar and on a container's title line, and across containers) and `tests/pages/container-zoom.spec.ts`.
2. **Three more commands**, rows of the one table and of `SELECTION_COMMANDS` (`commands.ts`; `selectionButtons`'
   `marks` argument says whether Bookmark all is offered, the cardBookmark flag, and what it reads; words in
   `words/commands.ts`; key help lists them): **Bookmark all** (Shift+B; reads "Remove
   bookmarks" when every numbered selected node has one), **Save for later** (Shift+L) and **Width** (Shift+W, a list: S, M,
   L, Auto). They sit before Zoom. Each writes one act per selected node through the one sender, drawn once
   (`selection/bar-acts.ts` `createBarActs`: `bookmark`/`unbookmark`; `Moves.saveLater`, the Move to list's Later plan,
   `move` then `later`; `size` by `sizeAct`). Nodes with no number take none; an app card takes no width; nodes that cannot be saved
   for later are skipped, and none being able says so. A locked board disables Save for later and Width, not Bookmark all
   (the bookmark is the person's private mark). Width's list is the Move to list (`move-menu.ts`) with other rows.
   "Match widths" stays a container tool.
3. **Comment on the selection** (`notes.ts` `group`): it opens FE_03's conversation box
   (`note-box.ts` `boxView`, mode `conversation`, `group` set, several `anchor`s), titled "N cards", with Ask now beside
   Add note by the same `askNow` path; the box is placed by `placeBeside` over the union of the nodes' reach (`nodeReach`), its
   arrow at the centre of the nodes' union. Add note leaves one note on the group for the board's Send.
4. **Place.** `placeBar` as before (centred above the bounding box at one size, below when there is no room, inside the
   stage, clear of a container's title line). The bar also steps aside, hidden, while a menu or box of a node
   (`.vb-mark-menu`, an open `.vb-card-pop`) or the conversation box is open (`selection-flow.ts` `covered`), and comes back
   when it closes. Tests: `tests/pages/selection-bar-edges.spec.ts`, `apps/board/tests/commands.test.ts`, `key-help.test.ts`.
### The Command Lens skin (node overhaul FE_04)

The second row of `SKIN_DEFS`, `command-lens` (`answer: 'switch'`, `marks: 'plate'`), and its token values
(`packages/tokens/src/skins.css`). A board in it sets `data-vb-skin="command-lens"` on its root. The look is
`design/mockups/node-skins/command-lens-skin-*.html` and `design/mockups/node-states/command-lens-*`.

1. **By the row, never the name** (`node-edges.ts` `edgesMarkup`): with `marks: 'plate'` the number, the kind (its word
   with a dot, or the node's icon in place of the dot), the badge, Awaiting, a proposal chip and the notes mark sit in
   `.vb-node-plate` along the top, which is the drag handle (`pointer.ts` `HANDLE`; its buttons keep their press), and
   there is no grip and no kind word over the title. With `answer: 'switch'` a node that asks gets `.vb-mark-switch`
   after the body: two halves, `data-mark="tick"` and `"cross"`, each a toggle named "Tick item N (A)" whose name stays
   put (aria-pressed says it is lit); pressing the lit half clears the answer (`item-acts.ts`). A proposal outlines
   its half (`data-proposed`) and shows the chip, `data-mark="proposal"`, named "Proposal on item N, the agent proposes
   tick", which controls the proposal box (`node-edges-apply.ts` `applyMarks`; `NodeMarks.proposalLabel`).
2. **Styles** (`node-plate.css`, keyed by `data-marks-at` and `data-answer-at`, tokens only): a node that asks has the
   dark plate (`--vb-plate`) and a switch, one that only tells a light plate and none; on the dark plate a mark keeps
   its hue lifted to `--vb-plate-mark-l` (at most `--vb-plate-mark-c` chroma), so the kind's dot, the badges and the
   notes count read in either theme, and its ring is `--vb-plate-focus`. The number is a square at the plate's left;
   bookmarked it fills and hangs a notched tail below the plate. Only the lit half recolours an answered node. The
   moments: a spinner in a saving half, a red ring and "!" on a failed one (or on the number), a lock in a half pressed
   on a locked board. Selected: the border in the node's colour. A tone takes the plate's rule and a light plate's
   ground. The plate's marks stay at the node's scale (FE_05's minimum mark size applies to the edge marks).
3. **The glass** (`--vb-glass`, `-hover`, `-ink`, `-muted`, `-line`, `-tick`, `-cross`): the node's menus
   (`menu-fixed.css`) and the selection bar (`selection-bar.css`) read the base's surface and ink tokens from them;
   the default is today's raised surface, Command Lens's the plate's dark glass in both themes.
4. **Kept true by**: `packages/ui/tests/node-skins.test.ts` (for every kind, with an icon, a tone or no number, every
   row offers the same actions; the plate's order; the switch only on a node that asks; no node file names a skin),
   `packages/tokens/tests/skins.test.ts`, `tests/plugin/token-contrast.spec.ts` (the lifted marks, the rings and the
   glass at their tiers, light and dark, both skins); in a browser, `tests/pages/command-lens.spec.ts` (the element
   builds the template's markup; the same actions as the default skin, node by node; the proposal; Tab order, names
   and the skin's rings; axe; screenshots light and dark) and the gallery's "The Command Lens skin" section
   (`apps/board/src/gallery/command-lens-section.ts`).

## The app window (D-099 5; node overhaul FE_08)

Every app card is a window while the appCards flag is on (D-099 5; T_04 made it the only app card). The page passes
`render(n, { edges, appCards })` (`canvas/draw.ts`, `controller.ts`). The look is
`design/mockups/node-states/default-app-*.html` and `command-lens-app-*.html`; what an app is stays [apps.md](./apps.md).

1. **One title bar** (`packages/ui/src/node/node-window.ts` `windowMarkup`, `node-template.ts` `isWindow`): in visual and
   tab order the number (`numberMark`, the Bookmark toggle, as on any node), the app's icon and name (`vb-app-name`, cut
   with "…", whole in its tip), the change badge (`badgeMark`, opening history; H and right-click too), why Allow shows
   (`vb-win-reason`: a lock and its words; on a window under 480px the lock alone, its words in its tip and for a screen
   reader, so the name keeps the room; `tests/pages/app-window.spec.ts`, "a 360px window"), Allow or "Allowed ▾" (today's `appStatus`, its menu opening under the bar), the drawer arrow
   (`data-drawer`) and Open (`data-app-act="stage"`, a toggle). Under the bar everything is the app's: today's slot
   (`appSlot`) and its state views, every `APP_CARD_STATES` state. No footer, no kind tab, no disc, no notes under the
   app, no coloured border: the window's border is the strong line, selected the ink. The node carries `data-edges`, so
   the marks, menus, keys and right-click work as on any node (`cards/mark-flow.ts`); it offers no Save for later
   (`node-menus.ts` `later`; D-099 5, `NODE_TYPES.app`).
2. **By the row, never the name**: the bar is a plate (`vb-node-plate vb-win-bar`), so with `marks: 'plate'` it is
   Command Lens's light plate (an app only tells) and in every skin it is the drag handle (`pointer.ts` `HANDLE`). Its
   look is `node-app.css` (§ "An app node as a window"), keyed by `data-window` and `data-marks-at`, tokens only.
3. **The state applied in place** (`node-app-apply.ts` `applyWindow`): the reason, the arrow's name (the notes mark's
   name, then "Show conversation" or "Hide conversation"), its count and `data-notes-mark` (filled while a reply is
   unread), the pane shown, Open shown while the panel shows. `AppCardView.drawer` (from the card's conditions) sets
   `data-drawer-open`: the node is wider by `--vb-drawer-w` (300px), so the board measures it so and the layout moves
   its neighbours aside; closed, they come back. A new version of the node keeps what its drawer holds
   (`keepingDrawer`) and its loaded panel (`renderKeepingPanel`).
4. **The drawer** (`apps/board/src/board/notes/app-drawer.ts` `createDrawers`): the node's conversation box (FE_03's
   `<vb-note-bubble>` in conversation mode and `note-box.ts`: its tabs, Add note and Ask now), one per open drawer,
   docked in the window's pane at its height, with no head, arrow or shadow of its own. The arrow shows and hides it;
   C, the notes mark or a history row on the node show it (`notes.ts` `press`, `show`). Open or closed is kept per board and node for
   the page's session; `app-cards.ts` reads it into the card's conditions (`drawer`). Hiding a drawer with words typed
   asks first. Moving the box never touches the frame, so the panel never reloads.
5. **On stage** (Open; `app-frame-stage.ts` `holdStage`, `vb-app-frame.ts` `stage(host)`): the whole window,
   bar and drawer, goes into the top layer as a manual popover and fills the page; the frame never leaves its place
   in the page, so the panel never reloads, and a change of its size is told to the panel. Focus is held inside (a focus
   that lands outside comes back, at the start, or the end after Shift+Tab) until Open again or Esc, then goes to the
   node. Open is pressed (`aria-pressed`) meanwhile. The frame never goes on stage alone: its host is always the window.
6. **Kept true by**: `packages/ui/tests/node-window.test.ts` (the bar in order; no footer, kind tab, notes or disc;
   Open; the plate; no Save for later; the drawer's state);
   `packages/ui/tests/app-frame-note.test.ts` (the panel's note and the reply); in a browser,
   `tests/pages/app-window.spec.ts` (both skins, light and dark, axe; the drawer moving the neighbour and back, the
   panel never reloaded, the drawer kept through a redraw; Add note, the agent's reply and the panel's raised note in
   one thread; the stage holding focus, Esc, focus back on the node; no Save for later) and
   `tests/pages/app-window-stuck.spec.ts`; the gallery's "The app window" section
   (`apps/board/src/gallery/app-window-section.ts`).

## The conversation box's lines, one divider and one scrollbar; Print in light or dark (export-import-print FIX_01)

1. **One label line** (point 619; `node-notes.ts` `conversation`, `replyEntry`; `note-bubble-template.ts`). A note reads
   "User", its number in the hover ("Note 2"), and "· Not sent" while no agent has had it (not sent, asked or answered;
   the box draws it dashed); no "Sent", "Asked now" or "Answered". A reply reads "Agent · <name> <id>" on one line
   (`.vb-nb-agent`): the name alone gives way, cut with an ellipsis, and `vb-note-bubble` gives it the whole name as a
   tip on hover only while it is cut; the id never is. The name and id are the reply's own author: an imported
   reply's `from` (api.md 206), else the agent that wrote the line (`cards/parking.ts`). The words are
   `words/node-notes.ts` (`user`, `agentLead`, `agentWho`) and `words/note-bubble.ts` (`notSent`, `noteNumber`).
2. **One divider** (point 617). An imported note or reply (`NoteEntry`/`ReplyEntry` `imported`) is history from the
   board the file came from; one "Imported" entry follows the last of them (`conversationList`, `.vb-nb-imported`, a
   hairline either side of the word), and what was said here follows it.
3. **The thread's room** (point 618; `node-box.css`). The thread scrolls the box's full width, its bar at the box's own
   right edge; its padding keeps the bubbles 8px off the bar and gives them 16px on the left.
4. **One scrollbar** (point 618; `packages/ui/src/base/root.css`). Every scroller in the board (the thread, the history
   list, menus, a card's body) has nclite's look, CSS only: a 3px thumb 2px in from the far right edge (the bottom,
   sideways), always shown, no rail, wider under the pointer; `::-webkit-scrollbar` for Chromium and a host's WebKit
   webview, `scrollbar-width: thin` and `scrollbar-color` where those parts don't exist (Firefox). The rule names the
   root and its class, so a host's `*` rule that hides every bar (nclite's overlay-scroll.css) leaves the board's;
   it reaches no scroller of the host's. A gallery sample that draws a box is a board root for this (`g-bubble-stage`).
5. **Save as PDF in light or dark** (point 615; `FilesForm.svelte`, `print-view.ts`, `print.css`, `shell.css`). The
   Save as PDF dialog asks light or dark ("Save in"), the screen's theme first (`FilesDialog.svelte` `shownTheme`: the
   root's `color-scheme`, else the system's). The choice goes to the host as `savePdf({ look })` (`board-files.ts`,
   nclite's `PdfAsk`, its ADR-0381), with the saved root's own size as `size`, one page exactly that size, and the root
   on the board's canvas (`print.css`), so the page is one colour: the host owns the page and the colours (nclite
   through its own scheme, the standalone page through `shell.css` at its root). The board sets nothing on `<html>`
   and names no page. The screen keeps its own theme.
6. **Kept true by**: `packages/ui/tests/node-core.test.ts` and `conversation-box.test.ts` (the labels, the divider);
   `tests/pages/conversation-labels.spec.ts` (the full-width thread and its 7px bar, a host's hiding rule, one label
   line with the name cut and its tip, an imported conversation's authors and divider; scrollbars shown, not the
   headless shell's hidden ones); `tests/pages/board-files.spec.ts` "Save as PDF… offers light or dark" (both themes); the
   gallery's conversation box entry ("Imported").

