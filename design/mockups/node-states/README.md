# Node states

The places on the new node for every state that the chosen pages (`../node-skins/`) never drew.
They follow the maintainer's rulings of 2026-11-17 (PLAN.md § "Design review of DESIGN_01" in
`cortex-tasks/board/2026-11-16_board-ui_node-overhaul/`). Each state has one design, the
decided one. Open the pages in a browser; they make no network call, and the fonts fall back to
the system's.

| Page | What it places |
|---|---|
| `default-answers-*`, `command-lens-answers-*` | A proposal waiting, a proposal withdrawn, Awaiting and an arrived handover, a write on its way, a write that failed, a locked board and a read-only ledger |
| `default-places-*`, `command-lens-places-*` | Saved for later (Bring back), moved by you (Put back), dragging, emphasis, tags, the note kind, and a note on several nodes (the box's tabs) |
| `default-input-*`, `command-lens-input-*` | Keyboard focus, hover, history holding the stepper, the conversation (a note queued for Send; Ask now waiting, answered and failed) and an icon from the project's library. Command Lens also draws its right-click here |
| `default-app-*`, `command-lens-app-*` | The app node as a window, in every state of today's app card, with the drawer open |

- **Dark and light:** each page comes in both. The light page is the dark page with `light` added
  to the root class (`v9` or `cl`).
- **Styles:** `default.css` and `command-lens.css` copy the skin pages' styles, then add the
  states below a "Node states" line. `default-app.css` and `command-lens-app.css` add the window.
- **Layout:** boxes and menus are drawn next to their node. All of them keep one size at any zoom
  (D-101).

## The rulings, as drawn

- **Proposal waiting:**
  - Default skin: the disc shows a dashed ring with the proposed mark. A click opens the proposal
    to the disc's right, styled like the conversation box: who proposes, what and why, then
    Reject and Accept.
  - Command Lens: a "Proposal" chip in the plate opens the same box beside the node. The proposed
    half of the switch is outlined, and pressing it means Accept.
- **Proposal out of date:** there is no amber state. The disc (or the switch) goes back to
  waiting, and history gets the entry "Proposal withdrawn: the node changed", next to the change
  that caused it.
- **Handover:**
  - While the agent owes it, "Awaiting" sits on the bottom edge, after the change badge (in
    Command Lens, in the plate). It is quiet grey and not a control.
  - Once the handover arrives, the tab goes. The handover becomes part of the node: a "Handover"
    section in its body, written in Markdown as the agent likes.
- **Write on its way:** the disc shows a ring with one bright arc, or the half shows "Saving". It
  appears only past about 150 ms.
- **Write that failed:** the pressed mark is outlined in the softened red with "!". The tip shows
  by itself for a few seconds, then comes back on hover. This lasts until the next press, which
  tries again. The answer from before the press stays.
- **Locked or read-only board (point 328):**
  - At rest nothing changes: every disc looks as it would on an open board, and an answered node
    keeps its tick or cross. The board's banner says that it is locked or read-only.
  - A press turns the pressed disc, half or mark into a lock for a moment, with "Board is locked"
    or "This ledger is read-only" beside it.
  - Read-only also stops Bookmark; a lock never does.
- **Moved by you:** there is no mark on the node. "Moved by you · Put back" (R) is a row in the
  number's menu and in right-click, shown only on a moved node.
- **Tags:** tinted with the node's own colour (its tone, else its kind), stronger than the old
  grey. No tag has a colour of its own.
- **A note on several nodes:**
  - It is counted on every member's notes mark, with a two-bubble glyph.
  - The conversation box gets tabs: this node first, then one tab per group note.
- **Keyboard focus:**
  - The order is the node, then number, disc (or halves), badge, notes.
  - Rings show only after Tab, never after a click or a modifier key.
  - Colours: default skin, a calm slate (`#8b9bb8` dark, `#5a6478` light). Command Lens, white
    toned down (`#b9bfc8` dark, `#4a4e57` light), staying light on the dark plate.
- **Hover:** no halo on marks. A tooltip appears after a deliberate hover of about two seconds;
  keyboard focus shows it at once.
- **History:** the stepper sits on top (Back, Next). "You're up to date" shows past the last step,
  and then the badge settles to "vN".
- **Waiting for a reply:** the notes mark shows no dots and just counts. The box says "Waiting for
  the agent", and the mark fills when the reply arrives with the box closed.
- **Unchanged from the first run:**
  - Saved for later: the node sits in the Later container; Bring back (L) is in the number's menu
    and in right-click.
  - Dragging: the drop look is drawn in ink.
  - Emphasis, the note kind, the conversation's queued and failed rows, and the app window are as
    before.

## The softened error red (a `tokens.css` change, for T_02 to show the maintainer)

| Theme | Today | Softened | APCA Lc (0.0.98G-4g) |
|---|---|---|---|
| Dark | `#f07474` (Lc −43.9 on the tip box `#2c2c30`, under 45) | `#dc8f88` | −51.3 on the surface `#1a1a1c`, −48.4 on the box `#2c2c30`, −51.2 / −52.2 on Command Lens's surface `#1a1b1f` and plate `#0e1115`, −51.7 on the light theme's dark plate `#16171a` |
| Light | `#cc3b3b` | `#b2554f` | 73.3 on `#ffffff`, 67.4 on the ground `#f5f5f6`, 57.5 on the box `#e4e4e7`, 66.7 on Command Lens's `#f5f4f0` |

- **Tier:** every value passes Lc 45, the tier for short coloured labels.
- **Calmer:** the new reds are less saturated, not lighter.
- **Scope:** the red of Cross (`--bad`, the fills) is unchanged. The new red is used only for
  errors.

## How every state of today's node maps

Sources: `packages/ui/src/node/pattern.json` and `node-template.ts`. "Skins" means already drawn
in `../node-skins/`.

| Today | Now | Where |
|---|---|---|
| open, acknowledged, dropped, selected, noted, new, flagged (Bookmark), narrow, zoomed far | As drawn | Skins |
| commented ("Replied") | No word on the face; the box says "Waiting for the agent" | input |
| later | In the Later container; Bring back (L) | places |
| answered by the agent, reply | The notes mark fills until read; the reply sits in the box | Skins, input |
| focus, pointer focus | A ring after Tab only | input |
| dragging, pinned (moved) | Lifted; Put back in the menus, no mark | places |
| hidden, see-through, app cards off | Unchanged | — |
| note sent, bubble open, group note | Rows in the box; tabs for group notes | input, places |
| note preview, time, highlight, notes hidden | Retire with the notes block: notes live in the box (DD-05) | input |
| proposal, popover open, out of date, updates and proposal in one tab | On the disc (or chip and half); withdrawn into history; nothing shares a tab | answers |
| updates, stepping, up to date, history | Badge, then history with the stepper | input |
| awaiting, handover | Quiet tab, then a section in the body | answers |
| paused (locked, read-only, past version) | Normal at rest; a lock on press | answers, app |
| every app state, allow loading, allow error, menu open; app title hidden retires | The window | app |
| emphasis, tags, the note kind | Wider with a top line; tinted chips; dashed | places |
| footer, review buttons, flag button, ⓘ, note pin, size control | Retire: edge marks, right-click and the selection bar replace them | Skins |

## For the builders

- **Marks drawn 22 px tall:** the number, badge, notes and Awaiting tab each need a hit area of at
  least 24 px (a transparent edge around the mark).
- **Colour is never the only signal:** a proposal is dashed, an error has "!", a queued note is
  dashed and says so, and a press on a locked board shows a lock and words.
- **Library icons:** `24 × 24`, lines only in `currentColor`, stroke 1.7, round caps and joins,
  names starting `x-`. They must also read at 14 px in Command Lens's plate.
- **New sentences on these pages are drafts** for the words files, among them "Board is locked",
  "This ledger is read-only", "Proposal withdrawn: the node changed", "Moved by you · Put back",
  "Bring back", "Tick not saved. Press to try again.", "Waiting for the agent", "not sent yet ·
  goes with Send", "With 28".
- **Two calls these pages make, which the rulings do not state:**
  - Keys and right-click on a locked board answer like a press: the lock and the popover show by
    the mark.
  - The tab row appears only when a node is in a group note.
