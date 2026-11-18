---
category: board-ui
type: decisions-draft
status: draft
created: 2026-11-15
scope: The node anatomy, skins and board layout being designed for the next board; in flux until the maintainer settles it, then moved into docs/decisions.md with his yes
skills: [cortex-architecture, vision-board]
---

# Design decisions (draft)

A working list, rewritten freely while the design settles. Nothing here binds until it is moved into
`docs/decisions.md` (protected, append-only) with the maintainer's yes. Each line names the artboard
that shows it on the design canvas "Vision Board node directions", page "Node anatomy".

## Settled

- **DD-01 A theme is a skin.** A skin may change the look and where the controls sit; the six
  actions, their keys and what they do are the same in every skin (artboards 10, 11, 12).
  *Built, T_04:* `packages/ui/src/skins.ts` `SKIN_DEFS` (a skin is a row, never a branch in the node;
  `packages/ui/tests/node-skins.test.ts`).
- **DD-02 Six actions:** Tick, Cross, Comment, Bookmark, Save for later, History. Keys A, X, C, B,
  L, H. Right-click (long press on touch) lists all six with their keys (10).
  *Built, T_04:* `packages/ui/src/node/node-menus.ts` `contextMenu`; `apps/board/src/board/cards/mark-flow.ts`
  (right-click, long press, the menu key); keys `apps/board/src/board/input/keys.ts`.
- **DD-03 The flag becomes Bookmark.** A wording change: needs a `docs/decisions.md` entry and the
  words files.
  *Built, T_04:* format 20's `bookmark` and `unbookmark` acts (D-099 2; the 19-to-20 step renames old flags),
  `packages/actions/src/bookmarks.ts` `bookmarksOn`.
- **DD-04 The number is the bookmark.** Click bookmarks; holding offers Bookmark and Save for later.
  Later leaves the node's face (9, 10, 12).
  *Built, T_04:* `packages/ui/src/node/node-edges.ts` `numberMark`, `node-menus.ts` `numberMenu`; held
  `apps/board/src/board/cards/mark-flow.ts` `HOLD_MS`.
- **DD-05 Notes on every node.** Quiet when empty, a count when not, filled when the agent replied
  and it is unread. It opens the conversation beside the node: rounded, pointing at the node, top
  aligned, a compact header, a one-line field that grows to three, Ask now and Add note side by
  side, keys in tooltips. It floats over neighbours, never moves them, and scales with the board
  (9, 10).
  *Built, T_04:* `packages/ui/src/note-bubble/conversation-template.ts`, `apps/board/src/board/notes/note-box.ts`,
  Ask now `apps/board/src/board/controller/ask-now.ts`; placed by `cards/mark-place.ts` `placeBeside`.
- **DD-06 History from the change badge.** "New" or "N updates"; once seen it settles to "vN"; a
  node that never changed has none (9, 10).
  *Built, T_04:* `packages/ui/src/node/node-edges.ts` `badgeMark`, `node-marks.ts` `nodeMarks`.
- **DD-07 Answering.** Default skin: the disc, top right; click opens tick and cross beside it, never
  on it; no opening on hover. Command Lens: the switch along the bottom, one click; pressing the lit
  half clears it. A ticked or crossed node is not recoloured (10, 12).
  *Built, T_04:* `node-edges.ts` (the disc, the switch), `node-menus.ts` `answerPicker`,
  `apps/board/src/board/cards/item-acts.ts`.
- **DD-08 Waiting** is the disc in the node's kind colour with a dark dot (10).
  *Built, T_04:* `packages/ui/src/node/node-edges.css` (`data-answer="waiting"`).
- **DD-09 Selection** is the node's own border, brighter and thicker; no outer ring. The selection
  bar sits above one node or several: Bookmark all, Save for later, Width, Match widths, Ask about
  the selection (9, 10).
  *Built, T_04:* the border `node-edges.css`; the bar `apps/board/src/board/input/commands.ts` `SELECTION_COMMANDS`,
  `selection/bar-acts.ts`; Ask about the selection is Comment's conversation box with Ask now (`notes.ts` `group`);
  Match widths stays a container tool.
- **DD-10 Width** moves to the selection bar; nodes size themselves (9).
  *Built, T_04:* `selection/bar-acts.ts` `width`; no size control on the node.
- **DD-11 Zoom.** Menus open at a fixed size at any zoom and stay open while zooming; edge marks keep
  a minimum size zoomed out and stay on their column (10).
  *Built, T_04:* `packages/ui/src/zoom-rules.ts` `ZOOM_RULES`, `apps/board/src/board/canvas/viewport.ts`
  `markGrow` (D-101; FIX_02's far breakpoint).
- **DD-12 Edges, default skin.** Number top left on the border; kind tab top centre (the handle);
  disc top right; change badge bottom left; notes bottom right. Disc, icon tile and notes share one
  vertical line (10).
  *Built, T_04:* `node-edges.ts` `edgesMarkup`, `node-edges.css`.
- **DD-13 Architecture content.** An icon tile (40 px, icon 24 px) at the right of the body; a drag
  grip in the middle of the top line; a kind word on every node, grey when the node only tells (10).
  *Built, T_04:* `node-edges.ts` `heading` (the tile and the kind word on a node with an icon; without one the kind
  tab stays), the icon set `packages/ui/src/icons/`.
- **DD-14 Decision moves off the accent pink** (to fuchsia in the drawings), so pink means notes and
  buttons only. A token change: protected, needs the maintainer's yes.
  *Built, T_04:* `packages/tokens/src/tokens.css` `--vb-kind-decision` (D-100 4).
- **DD-16 Two skins chosen:** the default skin (with Architecture content) and Command Lens. In
  Command Lens the plate holds number, kind, history badge and notes; the switch is the answer; the
  bookmark is the number square with a notched tail below the plate. Both work in dark and light
  (10, 12; `design/mockups/node-skins/`).
  *Built, T_04:* `packages/tokens/src/skins.css`, `packages/ui/src/node/node-plate.css`.
- **DD-17 Agent rewriting** is drawn as changes appearing in the node, underlined and struck, with an
  "Agent writing" mark (12). It needs streamed board updates, which the board does not have yet
  (tracker M51).
  *Not built* (out of scope; tracker M51).
- **DD-18 A board's skin** is set in the ledger when the board is made, by whoever makes it, and the
  person can change it on the board.
  *Built, T_04:* `BoardEvent.skin` and the `skin` act (format 20), `packages/actions/src/skins.ts` `skinOf`; the
  "⋯" menu's skin rows (`apps/board/src/board/chrome/ToolbarMenu.svelte`).
- **DD-19 Seen.** On a board that isn't read-only, clicking a node marks it seen (clears New and
  updated), and clicking anywhere inside a container marks the container seen.
  *Built, T_04, as point 308 changed it:* a card's `seen` as before; a click inside a container clears its pill on
  the person's screen only, nothing stored (`apps/board/src/board/cards/container-seen.ts` `createContainerSeen`).
- **DD-15 App cards** lose Later; the app window's drawer pushes its neighbours aside (handover § 5).
  A node's conversation floats instead (DD-05).
  *Built, T_04:* `packages/ui/src/node/node-window.ts` `windowMarkup`, the drawer
  `apps/board/src/board/notes/app-drawer.ts`; no Save for later in its menus (`node-menus.ts`).

## Layout guidance (for the agent skill and the layout engine)

Headline guidance, not hard rules. The skill change needs `npm run eval:bot` before it merges.

- **DL-01 A flow lives in one container.** Draw a sequence inside a single container and make it read
  well there, rather than linking cards across containers.
  *Built, T_03/T_04:* `skills/vision-board/SKILL.md` § Layout.
- **DL-02 Links between containers are few, tidy and simple:** the shortest clean route, no weaving.
  *Built, T_03/T_04:* the skill's guidance (§ Layout).
- **DL-03 Routing around cards is the fallback,** used only when no clean path exists. A fork
  continues as rows from the fork (tracker N51); rows or columns is a board choice (tracker N52).
  *Built, T_04:* `packages/layout/src/modes/branches.ts` `branchRows` (N51); a flow's direction, the `direction` act
  and the header's Flows menu (N52, D-100 5).

## Open

- **DO-01 A tone per node, set by the agent.** Recommended: an optional named colour from about
  eight palette tones; it tints the body, top line and icon tile, while the kind keeps its tab or
  dot. A contract change.
  *Built, T_04 (decision 17):* `packages/format/src/view.ts` `TONES`, `isTone` (a name or a hue), the tints in
  `tokens.css`, `packages/ui/src/node/node-edges-apply.ts` `applyTone`.
- **DO-03 States not yet drawn:** saved for later, moved, locked, a write that failed.
  *Built, T_04 (drawn by DESIGN_01):* the number's menu (Save for later, Moved by you · Put back), the marks'
  `data-saving`, `data-failed`, `data-locked` (`apps/board/src/board/cards/mark-acts.ts`).
- **DO-04 Thread Drawers skin:** parked.
  *Not built.*
- **DO-05 Seen on a read-only board.** A locked or read-only board can't record what the person has
  looked at, which makes it hard to keep track; left for later.
  *Not built* (left as it is, PLAN decision 16).
