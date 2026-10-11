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
the one function `renderMarkdown(src, { headingLevel })` from the `packages/ui` front door. It is a
pattern without an element: `packages/ui/src/markdown/` holds `blocks.ts` (lines into blocks),
`inline.ts` (marks, links, escapes), `render.ts` (the front function), `markdown.css` (the
`vb-md-*` classes, imported by the page beside `node.css`) and `pattern.json` (the subset, the
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
  `apps/board/src/gallery/` drawn from `gallery.ledger.jsonl` through the pattern's own core
  (`nodeState`, `regionState`), never hand-written markup. The gallery lists patterns from their
  `pattern.json`, and `tests/pages/gallery.spec.ts` fails for a pattern that has no samples.

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

On the page, one read (`pageConditions`, `apps/board/src/board/board-data.ts`, also the gallery's)
gives the picker marks, the container badges, the open requests, `board.drawn` and whether Send to
agent has anything to send (`board.unsent`: without it the button is disabled, "Nothing new to
send", api.md 123);
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
- **Overrides**: the page reads them with `pageFlags()` (`apps/board/src/flags.ts`) from the
  `vb.flags` localStorage key, then `?flags=` in the address, which wins. Both use `parseFlags`'
  format: comma-separated names, a leading `-` turning one off (`?flags=nodeSize`,
  `?flags=-nodeSize`). Unknown names are refused and ignored. Tests and the gallery pass overrides
  directly.
- **Where it is checked**: once, where the behaviour enters (the board controller, the gallery's
  entry point), and passed down as data (`render(n, { sizeControl })`, a tier for `nodeState`), so
  packages never read the address or storage. Pure packages (`layout`) take the result as input.
- **Flag off means unchanged**: every existing page-test screenshot must still match with the
  flag off. A gallery section for flagged behaviour shows only with the flag on, with its own
  screenshots.

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
   mode (`new`, `edit`, `sent`); the element emits `vb-note` and never writes anything itself.
2. **The page** has one bubble, owned by `apps/board/src/board/notes.ts`: C, M, the footer
   buttons, the pin and a click on a note open it; it follows its card through
   `Viewport.onApply` and every relayout; every write goes through the controller's `attempt`.
3. **On the card** (`<vb-node>`): `nodeState().notes` gives the pin (the latest note's number,
   `.vb-note-pin`, hanging off the top-right corner) and the "Your note" block (`notesMarkup`,
   latest first, `data-sent` notes grey).
4. **Zoomed out.** The `hideControlsZoomedOut` flag (off) is the only thing that sets the stage's
   `data-zoom="far"` below `FAR_K` (`viewport.ts`); with it off every control shows at every
   zoom (tracker N13).

## Selecting and moving (3_FE_01)

The rulings are the task's (`cortex-tasks/board/2026-10-01_board-v3/3_FE_01_select-and-drag.md`).

1. **The selection** is view state, never a ledger event. It lives in one page module,
   `apps/board/src/board/selection.ts`: `selected()`, `has(id)`, `select(ids, mode)` (`only`, `add`,
   `remove`, `toggle`), `clear()`, `keep(ids)` (drops ids that left the board, after each redraw) and
   `onChange`, whose event names only the ids that changed. The lasso and the selection bar call it.
2. **On the card**, the page passes `selected` to `nodeState`; `<vb-node>` sets `data-selected`
   (mockup 05's look, `node.css`) and its label ends ", selected". A list item takes no
   `aria-selected`, so the name carries it, and a polite live region (`#selection-status`) says
   "3 cards selected" or "Selection cleared". A change of the selection goes through `restate` in
   `cards.ts`: those cards are updated, nothing is measured, placed or laid out.
3. **Pointer** (`pointer.ts`): a click on a card selects it (Shift, Cmd or Ctrl adds or removes);
   only the kind tab (`.vb-node-kind`) moves a card; a drag on a card's content selects text; a
   drag on a background (the board, a frame, a frame's title line outside its tools) pans and a
   click there clears; Shift+drag on a background is the lasso's; the middle button pans anywhere.
   The stage is `user-select: none` and a card's content `user-select: text`.
4. **Keys** (`keys.ts`): Space on a focused card toggles it; Esc closes the note bubble first,
   else clears the selection.
5. **The focus ring** (`pointer-focus.ts`, `bindPointerFocus`, bound by `wiring.ts`): a card a
   pointer press focused carries `data-pointer-focus`, and `node.css` draws no ring on it when a
   key that moves no focus (Z, Esc, Space, the other commands) makes the browser match
   `:focus-visible`. Focus moved by the keyboard (Tab, Shift+Tab, arrows, J/K, a command that
   focuses another card) never carries it, so a card the keyboard focused keeps its ring (WCAG
   2.4.7). The selected look is the clicked card's only mark
   (`cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md`).

## The lasso, the selection bar and view commands (3_FE_02)

The rulings are the task's (`cortex-tasks/board/2026-10-01_board-v3/3_FE_02_lasso-and-zoom.md`).

1. **One command table**, `apps/board/src/board/commands.ts` (`COMMANDS`, keyed by `CommandId`):
   zoom out, Fit and zoom in (the header), Comment, Move to (3_FE_03), Reset places (navigation FE_03; R, disabled while no selected card is
   pinned), Zoom to selection and Clear (the selection bar), Zoom to this area (the area bar it draws when a lasso touches no card). Each entry holds
   its label and keys; the header buttons, the bar's buttons and `keys.ts` all read from it, so a
   command is wired once (ruling 5).
2. **The lasso and the bar**, `apps/board/src/board/selection-flow.ts` (`createSelectionFlow`):
   `pointer.ts`'s `lasso` gesture (Shift+drag on a background; Shift+Cmd/Ctrl adds) reports its
   screen box through `lassoMove`/`lassoEnd`; the cards it touches (`touches`, `packages/ui`'s
   `selection-bar` pattern) replace or add to the selection the same `selection.ts` module 3_FE_01
   uses. Touching none opens the **area bar** instead, holding the lassoed world box until Clear,
   a new lasso, or Zoom to this area dismisses it; the real selection bar shows "whenever the
   selection is not empty and no bubble is open" (ruling 2), for one card same as several.
3. **The bar's pattern**, `packages/ui/src/selection-bar/` (`<vb-selection-bar>`): `placeBar`
   centres it above the selection's screen box, below when there is no room above, kept inside the
   stage; it draws above the cards and moves nothing, and follows pan, zoom and a changed
   selection through the same `place()` the note bubble uses. `vb-command` events name the
   pressed button's `CommandId`; the element never acts itself (rule 8). With the `selectionPill`
   flag (stage5-follow-ups FE_02, on by default) the bar is compact and over a selection starts as
   a pill ("3 selected" and a chevron, `aria-expanded`): its `vb-toggle` opens it, and
   `board/selection-pill.ts` closes it on a press outside, a wheel pan, Esc (focus back on the
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
   (api.md 62-65). Any of the group's pins reopens, edits or removes it on every card at once; a
   card may also hold its own single-card note (named by `n`) independently. With exactly one card
   selected, Comment is that card's own note (2e), unchanged.
5. **View commands are never ledger events.** Zoom and Clear only move the viewport or the
   selection; Comment opens the note bubble, whose own write goes through the action layer as
   usual (rule 8).

6. **The key commands bubble** (navigation FE_04, `keyBubble` flag, on by default): a round "?" at the
   bottom left (`shell/KeyHelp.svelte`, `styles/key-help.css`) replaces the old key bar. Hover or focus
   opens the list through `bindHoverTip` (`packages/ui/src/tip/`): it stays while the pointer is on
   it, Esc closes it, and `?` opens it. The list is generated by `board/key-help.ts` `keyGroups()`
   from `COMMANDS` and the registry `ACTIONS` (Items, Selection, Board, View); only inputs neither
   table owns (J/K, Space, Alt+arrows, H, pointer gestures) are listed by hand there, and a unit
   test fails when a command or action with a key is missing. Off, the board shows no key help.

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
   handlers do nothing (`versions.ts` `guard`), and `#world[data-readonly]` hides what acts.
   `shell/VersionBanner.svelte` shows the banner with Back to now (Esc does the same). Code:
   `apps/board/src/board/versions.ts`, `shell/Toolbar.svelte`, `shell/VersionBanner.svelte`.
2. **The container finder** (`containerFinder` flag). The toolbar's `#containers` dropdown lists the
   board's containers in board order with their card counts, Later always last and disabled
   ("0 items") while empty. Choosing one zooms to its frame (`Board.goToContainer`, `vp.fit`) and
   focuses its title; zooming is no act, so it works in a past version too. There is no key. Code:
   `apps/board/src/board/finder.ts` (`containerRows`, `zoomToContainer`), `shell/Toolbar.svelte`.
3. **The key bubble** (`keyBubble` flag). The round "?" at the bottom left lists every key. It is
   generated from `COMMANDS` and the registry `ACTIONS`, never written twice (see 3_FE_02 item 6).
   Code: `apps/board/src/board/key-help.ts`, `shell/KeyHelp.svelte`, `styles/key-help.css`.
4. **The toolbar keeps its room** (verification fix). The board picker never goes under 220px from a
   1024px window up (its title truncates inside). At 1500px and below the toolbar carries
   `data-narrow` (`shell/Toolbar.svelte`, a `MediaQuery`): the end group's text buttons show an icon
   only (`shell/ButtonIcon.svelte`) and the counts, with the "boards updated" chip, show their
   numbers only; the words stay for screen readers and the title tooltip says them.
5. **Toolbar icons and the "⋯" menu** (`toolbarMenu` flag, on by default; task
   `cortex-tasks/board/2026-10-09_board-app_toolbar-icons-menu.md`). Theme, Hide decided and Reply
   move into a "⋯" menu at the toolbar's end (`shell/ToolbarMenu.svelte`): rows with their icon and
   key, Hide decided a `menuitemcheckbox`; a click or Enter opens it and focuses the first row; Up,
   Down, Home, End, Esc (focus back on "⋯") and Tab are the Move to list's keys, one helper for both
   (`board/menu-keys.ts`); a press outside or a choice closes it; H works on the board and in the
   menu. Agents (a bot with its holder count), Send to agent (a bot with a send arrow) and Chat show
   their icon only when narrow. The smallest supported width is 768px: at 1000px and below the
   gaps tighten, the app icon steps aside, the picker may go to 150px, the version and containers
   dropdowns take 6em and the count chips draw closer, so every control stays whole. The end group is
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
   open page reloads when its live stream opens again on a different folder (`board/folder.ts`). The
   last board is kept per folder. Styles: `styles/folder-dialog.css`. The gallery draws the picker in
   each state (`gallery/folder-section.ts`); `tests/pages/open-folder.spec.ts` covers it. Off, the menu
   and title are as before and the page never calls the folder routes.

## Every card in the conversation (every-node FE_01)

Task set `cortex-tasks/board/2026-10-10_board-actions_every-node/` (rulings 1-4, 6; api.md 118-120),
behind the `everyNode` flag (on by default; `?flags=-everyNode`).

1. **Numbers and buttons from the kind.** Every card shows its number; `offers` reads
   `NODE_TYPES[kind].actions`, so a question, decision or action draws ✓, ✗, Comment, More context
   and Later, and every other kind Comment, More context and Later. Off, `numberedView`
   (`apps/board/src/board/board-data.ts`) drops the number from cards that need no answer, so they
   draw with no number, buttons or tabs and take no note.
2. **One meaning, the card's words.** `packages/actions/src/action-words.ts` (`MEANINGS`,
   `actionWord`) is the one table of what a button means on a kind: ✓ and ✗ say "Yes" and "No" on a
   question, ✓ "Done" on an action, in their tooltips; the accessible name keeps the registry's word.
   The key help lists "Acknowledge (Yes, Done)" and "Drop (No)" from the same table, and the agent
   reads the same words (`means` in `check_responses`, the numbered reply; api.md 121).
3. **Comment on any group.** The selection's Comment takes every selected card, any kinds: one note
   on exactly those cards (`selection-flow.ts` `comment`); one card alone is its own note.
4. **Counts and states.** The toolbar and container counts count only cards that need an answer
   (`counts`, `regionState`); a plain card's comment, more context or Later shows its usual state
   token on the card and counts nowhere. No new colour.
5. **Hide decided** keeps a decided card while the agent owes it an answer (`item.owed`, read into
   `pageConditions` `owedCards`), so the reply lands where the person can see it; it hides once
   nothing is owed (`decidedIds`).
6. Tests: `tests/pages/every-node.spec.ts` (numbers, tooltips, a plain card commented by key, a
   lasso of mixed cards commented once, counts, hide while owed, the flag off, axe light and dark);
   the gallery's node section shows the cards that ask and the cards that tell in every status each
   can reach.

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
