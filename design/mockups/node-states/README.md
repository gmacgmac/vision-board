# Node states

Where every state of today's node sits on the new node, for the states the chosen pages
(`../node-skins/`) never drew (DESIGN_01 of `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/`).
Open the pages in a browser; they need no network (fonts fall back to the system's).

| Page | What it places |
|---|---|
| `default-answers-*`, `command-lens-answers-*` | A proposal and one out of date, handover and Awaiting, a write on its way and one that failed, a locked board, a read-only ledger, right-click on both |
| `default-places-*`, `command-lens-places-*` | Saved for later (the Later container, Bring back), moved by you, dragging, emphasis, tags, the note kind, a note on several nodes |
| `default-input-*`, `command-lens-input-*` | Keyboard focus and hover on the node and each mark, history holding the stepper, the conversation (a note queued for Send; Ask now waiting, answered, failed), an icon an agent added; Command Lens also its right-click |
| `default-app-*`, `command-lens-app-*` | The app node as a window, in every state of today's app card, with the drawer open |

Each page comes dark and light: the light page is the dark page with `light` added to the root
class (`v9` or `cl`) and "(light)" in the title. The styles are shared: `default.css` and
`command-lens.css` copy the skins pages' styles unchanged, then add the states below a
"Node states" line; `default-app.css` and `command-lens-app.css` add the window. Icons are one
`<symbol>` sprite at the top of each page.

On every page a state with two honest answers shows both: the one marked **Recommended** first,
then the other and what it costs. Boxes and menus are drawn under their node to save room; on the
board they open beside the mark that opens them, at one size at any zoom (D-101).

## Every state of today's node, and where it sits

From `packages/ui/src/node/pattern.json` (`states`, `flaggedStates`, `parts`, `attributes`) and
`node-template.ts` (`tabs`, `bottomTabs`, `proposalsMarkup`, `handoverMarkup`). "Skins" means
already drawn in `../node-skins/`.

| Today | On the new node | Where |
|---|---|---|
| open | The disc, kind colour and dark dot; Command Lens the switch | Skins |
| acknowledged, dropped | The filled disc; the lit half | Skins |
| commented ("Replied", with the agent) | No word on the face (the footer goes); the notes mark shows three dots while a note waits for its answer; the node's name keeps "Replied" | input |
| later | The node moves into the Later container and looks as it did; the number's menu and right-click offer Bring back (L) in the row of Save for later | places |
| answered by the agent, reply | The notes mark fills until read; the reply sits in the conversation | Skins; input |
| focus | The node's ring outside its border (never read as selection); each mark its own ring; Tab runs number, disc (or the halves), badge, notes | input |
| selected | The node's own border | Skins |
| dragging | Lifted, the handle grabbed; boxes close; the target container's drop look in ink | places |
| pinned (moved by you, ◆) | A quiet ◆ on the top border left of the disc (in the plate after the kind); not a control | places |
| hidden | Unchanged: a hidden node is not drawn | none |
| noted | The notes mark's count | Skins |
| note sent; a note not yet sent | In the conversation: "not sent yet · goes with Send" (dashed) or "asked now"; the mark's outline dashed while a note waits for Send | input |
| bubble open | The conversation box | Skins (default); input (Command Lens) |
| see-through (wireLayers) | Unchanged: fill tokens only | none |
| note-preview, note time shown, note highlighted, notes hidden, notes hidden with a new reply | Retire with the notes block under the body: notes live in the conversation box (DD-05), which shows each note's time and scrolls to and rings a note it opens on (choice 10) | input |
| proposal, popover open | On the disc: a dashed ring with the proposed mark; a click opens the proposal (Reject, Accept). Command Lens: a "Proposal" chip in the plate and the proposed half outlined | answers |
| proposal out of date | The ring and the chip turn amber; Accept aria-disabled with its reason | answers |
| updates and a proposal in one tab | Retires: with the proposal on the disc nothing shares a tab (back if choice 1 goes the other way) | answers |
| updates, stepping, up to date | The badge opens history; its stepper is on top (Back, Next), "You're up to date" past the end, then the badge settles to "vN" | input |
| new | The "New" badge | Skins |
| awaiting, handover | A tab on the bottom edge (default) or a chip in the plate (Command Lens): "Awaiting" dashed, not a control; "Handover" opens the sections | answers |
| app checking, needs approval, code changed, ready, missing, invalid, broken, past version | The window: one bar (number, name, Allow or Allowed ▾, drawer, Open); a state view in place of the app where it can't run | app |
| app allow loading, app allow error, app menu open | Allow busy; Allow outlined with "!" until the next press; Allowed ▾ opens Stop app | app |
| app title hidden | Retires: the window always has its bar | app |
| app cards off | Unchanged: a plain node | none |
| paused (lockBoard) | Marks in place and in the tab order, aria-disabled; a padlock in the waiting disc and on the halves; a lit answer keeps its colour; Bookmark still works; right-click names the reason and dims the writes | answers |
| paused (read-only, past version) | As locked, and the number pauses too (dashed, or a padlock in the square) | answers; app (past version) |
| flagged | Bookmark: the filled number with its notched tail | Skins |
| history (cardHistory) | The change badge opens history | Skins; input |
| group note | Counted on every member's notes mark with a two-bubble glyph; the conversation names every member | places |
| A write on its way, a write refused (any mark) | Busy: the disc a ring with one arc, the half "Saving", shown only past about 150 ms; a second press within 400 ms is ignored. Refused: the pressed mark outlined in red with "!", and a tip naming what failed, until the next press | answers |
| Parts: number, kind tab | The number tab is the bookmark; the kind tab the handle (not a tab stop: Alt+Arrows move) | Skins |
| Parts: title, body, tags | Title and body unchanged; tags are grey chips under the body | places |
| Parts: note pin, notes block, footer, review buttons, flag button, ⓘ | Retire: the notes mark, the six actions on the edge and right-click replace them; the old footer is removed | Skins |
| Parts: size control (nodeSize) | Retires: Width is in the selection bar (DD-10) | Skins (selection bar) |
| Parts: step section, stepper | Inside history | input |
| Parts: bottom tabs, card popover | Handover and Awaiting keep a bottom-edge tab; the proposal moves to the disc; boxes keep one size | answers |
| emphasis | One width tier up and a full line in the kind's colour along the top (Command Lens: along the plate) | places |
| the note kind | Dashed, no fill, no shadow; tells only | places |
| data-zoom far | Edge marks keep a minimum size | Skins (zoom) |
| pointer focus | Unchanged: a click gives focus without a ring | none |
| narrow node, big numbers | | Skins |
| Kickoff: a note queued, Ask now sent, waiting, answered | Drawn without saying how much of the board the agent sees | input |
| Kickoff: an agent's own icon | Drawn exactly as a set icon in the tile | input |

## Rules the drawings hold, for the builders

- Nothing on a node at rest is a control except its edge marks. "Awaiting", the ◆ and tags are
  marks, not controls.
- The disc, the icon tile and the notes mark keep one vertical line in every state drawn.
- Hit areas: the number, the badge, the bottom tabs and the notes mark are drawn 22 px tall, as on
  the skins pages; each takes a hit area of at least 24 px (a transparent edge around it), so the
  look stays and the rule holds. The disc is 28 px.
- Colour is never the only signal: a proposal is dashed, an error has "!", a queued note is dashed
  and says so, locked shows a padlock, unread is a fill (a change of shape, not only of hue).
- Pink means notes and buttons only (DD-14), so the drop look is drawn in ink.
- An agent's icon: a `24 × 24` box with 2 px clear at each side, lines only in `currentColor`,
  stroke 1.7 at 24 px, round caps and joins, no fill but dots of 2 px or less, no colour, text,
  image, gradient, filter, script or link, a kebab-case name unique on the board. Cleaned when
  added; one that can't be cleaned is refused with its reason and the node shows no tile. It must
  also read at 14 px, where Command Lens draws the kind's icon in the plate.
- Sentences on these pages that are new ("Board is locked. Unlock it to answer.", "Tick not saved.
  Press to try again.", "Bring back", "Read conversation", "not sent yet · goes with Send", "asked
  now", "Waiting for the agent", "Not sent.", "Try again", "Moved by you · R puts it back", "Drag to
  move · Alt+arrows", "Not allowed.") are drafts for the words files, not settled words.

## Choices for the maintainer

1. **A proposal:** on the disc, dashed with the proposed mark (recommended), or a "Proposal" tab on
   the bottom edge (planner's call 6). Command Lens: a plate chip plus the proposed half outlined
   (recommended), or the chip alone.
2. **Handover and Awaiting:** a tab on the bottom edge, a chip in Command Lens's plate
   (recommended), or the handover as the agent's message in the conversation (no place for Awaiting).
3. **Moved by you:** a quiet ◆ at rest (recommended), or only while selected.
4. **A note on several nodes:** counted on every member's notes mark (recommended), or one group mark
   on the lowest-numbered node, as today.
5. **An app's bookmark:** the number fills and keeps its notch inside the bar (recommended), or the
   usual tail hangs over the app.
6. **Ask now and this node's queued notes:** does Ask now take this node's unsent notes with it?
   Recommended yes, in order (they are about the same node); the cost is that it is no longer "that
   one message".
7. **Ask now with no agent listening:** drawn as "Not sent. Try again"; should it instead keep the
   message as a note for Send, and say so?
8. **The app bar at 400 px:** the reason beside Allow ("Not allowed yet", "Code changed") cuts the
   app's name. Keep the reason in the bar (drawn), or move it to Allow's tip and name; the change
   badge is left out of the bar while "Code changed" shows.
9. **Reset place:** the right-click list stays at the six actions (R and the selection bar's Reset
   places do it), as drawn; or a seventh row on a moved node.
10. **The notes block under the body retires:** notes, their times and the Hide or Show toggle live
    only in the conversation box. Confirm.
