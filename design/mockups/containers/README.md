# Containers with open corners

A container drawn as four rules that stop short of its corners: the top rule broken by the title (as today),
a bottom rule, and side rules that end before the corners. It reads as a group around rounded nodes, not a
box around them. Proposal for the maintainer (DESIGN_02); nothing here is built.

| Page | What it shows |
|---|---|
| `default-states-*`, `command-lens-states-*` | At rest; in use (hovered, the rail on the left rule, the handle tinted); selected; new and updated (teal rules and the pill); a drop target with a node dragged in; a locked board in use (the rail paused, a press shows the lock and "Board is locked"); three sizes of open corner; the line colours with their APCA tiers |
| `default-board-*`, `command-lens-board-*` | Three containers (a grid, a column, a row) at 100%; the same board at about 40% beside today's closed frame; six containers at about 40% |

- **Dark and light:** each page comes in both; the PNG beside it is the full page at 1440 px.
- **Styles:** the pages load `../node-states/default.css` or `command-lens.css` for the nodes, then
  `containers.css` for the frame. Standalone, no network; fonts fall back to the system's.
- **Not drawn:** a container inside another. The board does not allow it: `packages/format/src/view.ts`
  `MODES` are six flat layouts, and no container names a parent.
- **Kept from today:** the title line (mono, uppercase, centred in the top rule's gap, one size at any zoom,
  D-101), the count, the pill, the rail (`toolRail`, `railOnHover`) and the paused controls on a locked board.

## Line colours (APCA-W3 0.0.98G-4g, on the canvas)

| Line | Default dark | Default light | Command Lens dark | Command Lens light | Tier |
|---|---|---|---|---|---|
| At rest, 1.5px | `#7a7a83` 31.8 | `#b5b5bd` 33.7 | `#7a7c84` 32.5 | `#b7b3a8` 32.6 | 30 |
| In use, 1.5px | `#9696a0` 45.5 | `#9a9aa2` 47.9 | `#9698a0` 46.3 | `#9a968b` 47.7 | 45 |
| Selected, 2px | `#c7c7cc` 72.4 | `#3f3f46` 88.3 | `#c5c7cd` 72.3 | `#3e4148` 85.4 | 45 |
| New and updated (`--vb-state-fresh`) | `#2dd4bf` 67.4 | `#0d9488` 58.6 | `#2dd4bf` 67.5 | `#0d9488` 56.1 | 45 |
| Drop target, dashed | `#c7c7cc` 72.4 | `#3f3f46` 88.3 | `#c5c7cd` 72.3 | `#3e4148` 85.4 | 45 |

Today's frame line, `--vb-line-contrast`, reads Lc 11.7 in the default dark theme (`#4a4a52`) and 12.3 in
Command Lens dark (`#4a4c53`): under the decoration tier. Light passes (33.7, 32.6).

## Seen while drawing

- At about 40% a narrow frame's title (full size, D-101) is wider than its top rule, so the rule disappears
  and the frame is held by its bottom and side rules alone (Decisions on the board pages). Today's closed
  frame keeps its corners there; the open one leans on the title more.
- The Command Lens nodes at 40% are drawn plainly scaled: the plate's minimum sizes (FIX_02) are not drawn.

## Choices to confirm

1. **How open the corners are.** Recommend **28px, the frame's padding** (`REGION_PAD`): the top and
   bottom rules then span exactly what the frame holds. 14px reads almost as a box from a distance; side
   rules a third long loosen the group on a tall frame.
2. **The dark rest line.** Recommend lifting it to the decoration tier (`#7a7a83`; Command Lens `#7a7c84`)
   through a new frame token (say `--vb-region-line`), so the other uses of `--vb-line-contrast` keep their
   value. A `tokens.css` change, for your yes.
3. **The drop target closes the corners.** Recommend yes: the one state that turns the group into a box,
   dashed and in ink with a soft fill, so "it will land here" is unmistakable. The other way keeps the
   corners open and only dashes and brightens the rules.
4. **In use, the rules step up to Lc 45** with the rail. Recommend yes: on a board of open frames it is the
   clearest "you are in this one". Today only the rail appears.
5. **Selected keeps the corners open** (ink, 2px). Recommend yes, so selected never reads as the drop
   target. Whether a container is selected on its own today is not established in the sources; this is
   drawn as asked.
