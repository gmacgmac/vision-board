# Node Overhaul - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-16

Start here, then read, in this order: `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md`
(what was decided, DD-01 to DD-19), `design/README.md` and the four pages in `design/mockups/node-skins/` (what it
looks like: open them in a browser, dark and light), `.kiro/steering/vision-board-proj.md` and `docs/principles.md`
(how we build).

---

## Problem Statement

The board's node carries its controls in a footer row, which makes every node busy and hides the sparse look the
maintainer wants. A new node was designed over 2026-11-11 to 11-16: every action sits on the node's edge, the look is a
swappable skin, and two skins are chosen. This set builds it, with the zoom, selection, layout and app-window work the
design depends on.

---

## Decisions

Every ruling is the maintainer's, from the design conversation of 2026-11-11 to 11-16. The decisions draft holds the
same list with the artboard that shows each one; where they differ, stop and ask.

1. **A theme is a skin** (DD-01). A skin may change how a node looks and where its controls sit. The six actions,
   their keys and what they do are the same in every skin. Function never forks by skin.
2. **Six actions on a node** (DD-02): Tick, Cross, Comment, Bookmark, Save for later, History. Keys A, X, C, B, L, H
   (A, X, C and L exist today). Right-click, or a long press on touch, lists all six with their keys; a node that
   only tells shows no Tick or Cross.
3. **The flag becomes Bookmark** (DD-03, yes at point 211). The person's private mark, never sent to an agent, is
   now called Bookmark everywhere: screen words, code, docs. Ledger lines already written with the old act still
   read. The bookmark glyph, which today means Save for later, now means Bookmark; Save for later takes the clock.
4. **The number is the bookmark** (DD-04). Clicking the number tag toggles Bookmark; holding the pointer on it opens
   a two-row menu, Bookmark and Save for later. A bookmarked number fills with the bookmark colour and grows a
   notched tail. Save for later leaves the node's face.
5. **Notes on every node** (DD-05). The notes mark is always there: quiet when empty, a count when not, filled when
   an agent's reply is unread. It opens one conversation box, to read and to write: beside the node, rounded,
   pointing at it, top-aligned, a compact header (number and title), a reply field of one line that grows to three,
   two buttons sharing the width, **Ask now** and **Add note**, their keys in tooltips (Cmd Enter, Enter; Shift
   Enter is a new line). It floats over neighbours and never moves them. It scales with the board.
6. **History from the change badge** (DD-06). "New" or "N updates" bottom left opens history. Once seen it settles to
   a quiet "vN". A node that never changed has no badge.
7. **Answering** (DD-07). Default skin: a disc, top right, in the node's kind colour with a dark dot while waiting
   (DD-08); a click opens Tick and Cross beside the disc, never on it; nothing opens on hover; answered, the disc
   fills green with a tick or red with a cross. Command Lens: a full-width Tick | Cross switch along the bottom, one
   click; pressing the lit half clears it. A ticked or crossed node is not otherwise recoloured. Today's guard stays:
   a second press within 400 ms is ignored.
8. **Selection** (DD-09) is the node's own border, brighter and thicker. No outer ring. The notes mark and the
   badges keep their thin border when the node is selected.
9. **The selection bar** (DD-09, U18) appears above one selected node or several. It keeps today's commands
   (Comment, Move, Reset places, Remove, Zoom) and gains Bookmark all, Save for later and Width. Width leaves the
   node (DD-10). Comment on a selection is the way to ask about several nodes, and gets Ask now as a node's notes
   do. Match card widths stays a container tool.
10. **Zoom** (DD-11, U15). Three groups. Scales with the board: nodes, links, container frames, the conversation
    box. Fixed size at any zoom: menus, the Tick/Cross picker, the number menu, history, the right-click list, the
    selection bar, the toolbar. Scales but never under a minimum: a node's edge marks. A container's title line and rail
    keep one size, as today. An open menu stays open while the person zooms. Edge marks grow in place, so the disc, the icon tile and the notes mark
    stay on one vertical line.
11. **Edges, default skin** (DD-12): number top left on the border; kind tab top centre, which is the drag handle;
    disc top right; change badge bottom left; notes bottom right, on the disc's vertical line.
12. **Architecture content** (DD-13): an optional icon per node, drawn in a 40 px tile (icon 24 px) at the right of
    the body; a node with an icon has no kind tab, shows its kind as a small word above the title (grey when the
    node only tells), and is dragged by a grip in the middle of its top line.
13. **Decision moves off the accent pink** (DD-14, yes at point 211), to fuchsia, so pink means notes and buttons
    only. Token changes that the two chosen skins define are approved under the same point; each task that changes
    `packages/tokens/src/tokens.css` lists its exact diff in its notes and the orchestrator shows it at the gate.
14. **Two skins** (DD-16): `default` and `command-lens`. In Command Lens the plate along the top is the handle and
    holds the number, the kind, the change badge and the notes button; the switch is the answer; a dark plate and a
    switch mean the node needs an answer, a light plate and no switch mean it only tells; the bookmark is the number
    square with a notched tail below the plate.
15. **A board's skin** (DD-18) is stored with the board in the ledger, set by whoever makes the board, and the person
    can change it on the board.
16. **Seen** (DD-19). On a board that isn't read-only, clicking a node marks it seen, and clicking anywhere inside a
    container marks the container seen (this also settles tracker N47). Read-only boards are left as they are
    (DO-05).
17. **A tone per node** (DO-01, U19): an agent may give a node an optional tone, one name from a fixed palette. It
    tints the body, the top line and the icon tile. The kind keeps its own tab, word or dot, and Tick and Cross keep
    their colours. The maintainer raised it and accepted the planner's form of it (point 211); T_01 confirms the
    palette's names with him before the contract lands.
18. **App cards** (DD-15, U20): no Save for later; a thin title bar with Open, the bookmark and a drawer arrow; the
    drawer pushes its neighbours aside and is the same conversation as DD-05.
19. **Layout guidance** (DL-01 to DL-03): a flow is drawn inside one container; links between containers are few,
    tidy and simple; routing around cards is a fallback. Headline guidance in the agent skill, not hard rules.
20. **Layouts** (U16, L8): each container shows one layout control with the others behind it. Radial stays. Which
    of the six modes are kept is the maintainer's to decide after trying them; no mode is removed in this set.
21. **Fonts are self-hosted** (L5, point 200): Figtree, Bricolage Grotesque, Space Grotesk, JetBrains Mono, all
    under the SIL Open Font License; no font is loaded from the network.
22. **Apps stay out of nclite** (handover § 5): app work targets the standalone board. The node, skins and zoom work
    must keep working when the board is hosted (D-094, D-096).

---

## Current State

`CODE-MAP.md` in this folder maps the code this set touches (files and symbols, surveyed 2026-11-16). In short:

- **The node** is the `vb-node` pattern (`packages/ui/src/node/`): `nodeTemplate` builds the markup, `footer()` the
  footer row with the review buttons, `flagButton`, `historyButton`; `tabs()` the number and kind tabs (the kind tab
  is the drag handle, `HANDLE` in `apps/board/src/board/input/pointer.ts`); `bottomTabs()` the proposal, handover,
  updates and NEW tabs. Icons are path strings keyed by kind or action (`node-icons.ts`).
- **The contract** is `packages/format/schema/openapi.json` and the JSON Schemas it names; `npm run gen` writes the
  types, the route table, the CLI commands, the MCP tools and `docs/specification/api-reference.md`. `ViewNode` has
  no icon, tone or skin field. A board is `BoardEvent { board, title, summary? }`; per-board person state is private
  acts (`BOARD_MARKS`). `LEDGER_FORMAT` is 19.
- **The private mark** is the acts `flag` and `unflag` (`CARD_MARKS`, fold `packages/actions/src/card-flags.ts`
  `flagsOn`, page `apps/board/src/board/cards/flag-flow.ts`, key Shift+F, feature flag `cardFlag`).
- **Seen**: selecting a card already writes a `seen` line (`apps/board/src/board/cards/update-flow.ts`); nothing is
  stored for a container (`packages/actions/src/fresh.ts` derives it).
- **Notes** are the `vb-note-bubble` pattern with modes new, edit, sent and thread ("Conversation on N" is thread
  mode). Nothing sends one note straight to the agent; Send (`controller.ts` `send`) sends everything unsent.
- **Zoom**: `Viewport` writes `--vb-zoom` on the regions layer; a container's title line and rail counter-scale
  with it; "the cards layer never takes it". Overlays live on the stage and are placed in stage pixels.
- **Selection**: `placeBar` and `pillGap` place the bar above the selection; `zoom-selection` (key Z) already fits
  the union box of every selected card (`selection-flow.ts` `zoomTo`).
- **Containers** draw one button per mode (`modeButton`, six `MODES`) and collapse by container queries; a
  popover of mode tiles exists (`modePopover`).
- **Layout**: `flow` is left to right only and stacks a fork's branches in the next column; `row` and `column` lay
  cards in card order and route any links around them.
- **Theme** is light, dark or system (`data-theme`); nothing like a skin exists. Fonts are system fonts; no font
  file ships.
- **The spike** on this branch (flags `appStage`, `cardDetails`) is described in the handover; 13 page tests fail
  from the Open button in the app card's footer.

---

## Proposed Solution

Build the new node as an extension of the `vb-node` pattern, not a second pattern. The contract changes first. All
new drawing is behind flags that stay off by default until the maintainer has used the result; the last task turns
them on and renews the screenshots.

### Key Changes

1. **Contract** (T_01): node `icon` and `tone`; a board's `skin`; Bookmark replaces flag; a container can be marked
   seen; every flag this set uses is declared. Ledger format 20; lines in formats up to 19 still read.
2. **Undrawn states** (DESIGN_01): where proposal, handover, awaiting, saved for later, moved, locked and failed
   states sit on the new node, drawn for the maintainer before the node is built.
3. **Tokens, skin layer and fonts** (T_02): tokens for the edge marks, tones, Decision's new colour and Command
   Lens; a skin is a set of token values under `[data-vb-skin]`; fonts self-hosted.
4. **The node's edges and the icon set** (FE_01): the pattern draws the marks; one icon set renders icons by name; a
   skin registry says where each skin puts the answer and the marks.
5. **The board wires the edges** (FE_02): clicks, the number menu, the answer picker, right-click, keys, bookmark,
   seen, the skin picker.
6. **One conversation box** (FE_03), **the Command Lens skin** (FE_04), **zoom groups** (FE_05), **the selection
   bar and Z** (FE_06), **one layout control** (FE_07), **flow branching and direction** (BE_01), **the app window**
   (FE_08), **the agent skill** (T_03), **verification** (VERIFY_01), **switch over and remove the old** (T_04).

### How it meets the principles

- **Reuse before create**: every piece extends an existing pattern or module, named in its task. New: one icon set
  (`packages/ui/src/icons/`), one skin registry (`packages/ui/src/skins.ts`), both Shared Foundations.
- **Contract first**: T_01 lands the schema, the generated files and their tests before any drawing.
- **One action layer**: Bookmark, Save for later, seen and the skin choice are acts through the one sender; Tick and
  Cross stay the person's clicks; no agent path changes.
- **Registries**: skins are rows in one table; a second skin is a row and a stylesheet, never a branch in the node.
- **Words**: every new sentence goes in its area's words file, named in each task.
- **Tokens**: colour only in `packages/tokens/src/tokens.css`; skins change token values, never literals in a
  pattern.
- **Flags**: `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, all off by default until T_04.

---

## Dependencies

- The set is sequential except wave 1, where T_01 and DESIGN_01 run together (DESIGN_01 writes only under
  `design/`).
- T_01 first: everything reads its types, flags and acts. T_02 before any drawing: patterns read only tokens.
- FE_01 before FE_02, FE_03, FE_04, FE_06, FE_08: they use the icon set, the skin registry and the node's marks.
- DESIGN_01's pages need the maintainer's yes before FE_01 starts (a gate the orchestrator holds).
- FE_03 before FE_08: the app window's drawer is the conversation box.
- T_04 only after VERIFY_01 and the maintainer's yes.
- No new npm package. Four font families are vendored (T_02), each download needing the maintainer's go.

---

## House Rules

- **Where**: worktree `.claude/worktrees/app-window`, branch `spike/stage-apps`. Never the main checkout: the
  maintainer's board runs there. Never port 4466. `VB_TEST_PORT` per task: T_01 6110, DESIGN_01 6210, T_02 6310,
  FE_01 6410, FE_02 6510, FE_03 6610, FE_04 6710, FE_05 6810, FE_06 6910, FE_07 7010, BE_01 7110, FE_08 7210, T_03
  7310, VERIFY_01 7410, T_04 7510.
- **Orchestrator-only files**: `docs/decisions.md` (the drafted entries below, appended on the maintainer's yes),
  `docs/principles.md`, `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `package-lock.json`,
  `docs/specification/modules.md` (run `npm run map` after a task changes imports), `cortex-tasks/tracker.md`.
- **Protected, with a named owner**: `packages/tokens/src/tokens.css` is changed only by T_02 (and by FE_04 for a
  Command Lens value T_02 missed), under decision 13; the task lists its exact diff in its notes and the
  orchestrator shows it to the maintainer at the gate.
- **Commits**: the orchestrator commits each checked task on `spike/stage-apps`; nothing is pushed. No sub-agent
  runs a git command that changes state.
- **Flags**: every flag this set adds is off by default until T_04, and so is the spike's `appStage` from T_01 on. Existing tests and screenshots must pass with
  the flags off after every task. New behaviour is tested with its flag on (`?flags=`).
- **Project checks**, after every task: `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`,
  and the page specs for what changed. The full page suite runs once, in VERIFY_01, and again in T_04
  (`VB_TEST_WORKERS=3`, `nice -n 15`). Every run has a time limit: 10 minutes for unit tests, 25 for the full page
  suite.
- **Done** for a UI task means every state, accessibility and contrast pass (APCA tiers, light and dark), unit
  tests, page specs, a gallery entry, `pattern.json` updated, and a look in a browser in light and dark.
- **Words**: every new sentence in its area's words file (`docs/specification/words.md`), never in code.
- **Docs**: a task that changes code a doc describes updates that doc in the same task (`cortex-docs`).
- **Interim files** go in `temp/` (git-ignored). **Writes over 50 lines in chunks.**
- **Models**: `strong` is Opus 5.5, `standard` is Sonnet 5.5; every sub-agent is started with its model named.
- **Stop and ask** when a task would change what an existing action, mode or record means beyond what this plan
  says, or when a design page and the decisions draft disagree.

---

## Planner's calls to confirm at kickoff

Choices the planner made where the conversation left room. The orchestrator reads these to the maintainer before
wave 1 and records any change here.

1. **Ask now** adds the note and then runs the board's Send, so everything unsent goes, as Send does today. A send
   scoped to one node is not built.
2. **Tone names**: `teal`, `blue`, `violet`, `magenta`, `amber`, `orange`, `green`, `slate`.
3. **Keys**: B toggles Bookmark (Shift+F retires), H opens History. A, X, C, L, O and Z are unchanged.
4. **Type**: the default skin uses Figtree for text and Bricolage Grotesque for titles on every node; Command Lens
   uses the system font for text, Space Grotesk for titles and JetBrains Mono for labels. Under a host that gives
   `--host-font`, the host's font wins.
5. **Icons** are chosen by name from a fixed set of about 48, drawn in this repo; an agent never sends its own SVG
   as a node icon. No icon package is installed.
6. **States not drawn** keep today's place unless DESIGN_01 moves them: the proposal and handover tabs stay on the
   bottom border between the change badge and the notes mark.
7. **Flow direction** (N52) is a per-board view preference kept by the page (as zoom is), not a ledger line, and
   applies to `flow` containers.
8. **The old footer** stays behind `nodeEdges` off until T_04, which deletes it with every other old code path and the flags (kickoff answer below).
9. **History** opens one box holding what the "N updates" stepper and the history list show today.

---

### Kickoff answers (maintainer, 2026-11-16, points 219-231)

- **Confirmed as written**: calls 2, 3, 4, 6, 9; drafts D-099 to D-102 (appended together, in order, once the ledger
  review below is in, since D-099 point 2 and D-100 point 3 touch the ledger); the font downloads, if safe (T_02);
  the live skill run, on Haiku 5.5 as the reference model (T_03); the tokens diff shown at T_02's gate.
- **Call 1 changed: Ask now is node-scoped.** Add note queues a note for the board-wide Send, as today. Ask now sends
  that one message for that node at once, and the reply comes back in the node's conversation box. How much context
  the agent gets (the node, the node plus the board, or the board's own session) is undecided: the record must keep
  those modes open. Shape comes from the ledger review; T_01 and FE_03 are amended before they run.
- **Call 4 extended: fonts ship with the plugin**, and `plugin.md` tells a host what the plugin brings (T_02 step 5a).
- **Call 5 changed: agents may add their own icons** to a board's icon set (cleaned single-colour drawings, stored
  in the project's `.visionboard/icons/`, used by name), so the set grows over time and is reused. The agent's spec
  is a few bullets in the skill (T_03): how to make one, where it goes, name it for reuse, reuse before adding. An
  agent adds one through the action layer (cleaned and checked), never by writing the file. Storage and naming
  details come from the ledger review.
- **Agent colours (point 242)**: a node's tone is a palette name or any hue the agent picks; the board derives the
  tints from the hue so contrast passes in light and dark (T_01 contract, T_02 tokens).
- **Call 7 changed: flow direction has a default per view**, set by whoever writes the view, and the person can
  change it on the board. Where it is stored comes from the ledger review; BE_01 and FE_07 are amended before they run.
- **Calls 8 and old code: no legacy.** T_04 makes the new node the only node and deletes the old footer, the flags
  and every old code path; old ledger lines go through a migration, not a second reader.
- **Ledger review**: a separate session (Fable 5.2) reviews the ledger format for health, scale, versioning and
  migration, and the overhaul's ledger changes. Result:
  `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md`. T_01 waits for it.
- **Speed**: the maintainer needs the board in nclite soon. Where later waves touch no common files, the
  orchestrator may run them together.

## Decision entries to append

Drafts for `docs/decisions.md`, in its format. The orchestrator shows them to the maintainer at kickoff and appends
them, word for word, on his yes (points 211 and 212 already approve their substance). It also makes this one change
to `.kiro/steering/vision-board-proj.md` § Words, with the same yes: `flag (the person's private mark, never sent to
an agent)` becomes `bookmark (the person's private mark, never sent to an agent)`.

```
## D-099 A node's actions live on its edges, and the flag becomes Bookmark
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 211-212) · **From**: the node design, 2026-11-11 to 11-16 (design/mockups/node-skins)
- **Decision**:
  1. A node offers six actions: Tick, Cross, Comment, Bookmark, Save for later, History (keys A, X, C, B, L, H). Right-click or a long press lists them. Each mark on the node's edge is the control for what it shows: the number (Bookmark; held, Save for later too), the answer (Tick, Cross), the change badge (History), the notes mark (the conversation). The footer row goes.
  2. The person's private mark is called Bookmark, in words, code and docs. Lines written as `flag` and `unflag` still read. The bookmark glyph means Bookmark; Save for later takes the clock.
  3. Notes open one conversation box, to read and to write, with Add note and Ask now. Selection is the node's own border. Width moves to the selection bar.
  4. Clicking a node marks it seen; clicking inside a container marks the container seen. A read-only board is unchanged.
  5. An app node offers no Save for later: it is a window, with a title bar and a drawer for its conversation.
- **Why**: the footer made every node busy and hid the sparse look; marks that are also controls keep a node calm and every action one click or one key away.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md

## D-100 A board has a skin; a skin changes the look, never the function
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 211-212) · **From**: the node design, artboards 10 and 12
- **Decision**:
  1. A skin sets how nodes look and where their controls sit. The actions, their keys and what they do are the same in every skin. Two skins: `default` and `command-lens`.
  2. A board's skin is stored with the board, set by whoever makes it, and the person can change it on the board.
  3. A node may carry an icon, by name from the board's icon set, and a tone, by name from a fixed palette. A tone tints the node; the kind keeps its own mark, and Tick and Cross keep their colours.
  4. Decision's colour moves off the accent pink, so pink means notes and buttons only.
- **Why**: one board serves planning, architecture and operations; the look should fit the work without forking how the board behaves.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md

## D-101 What scales with zoom
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 189, 212) · **From**: the node design, artboard 10
- **Decision**: Nodes, links, container frames and the conversation box scale with the board. Menus, the answer picker, history, the right-click list, the selection bar and the toolbar keep one size at every zoom, and an open menu stays open while zooming. A node's edge marks scale but never below a minimum, growing in place. A container's title line and rail keep one size, as before.
- **Why**: the person must be able to read state and act from a distance.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md

## D-102 The board's fonts are self-hosted
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, point 200) · **From**: tracker L5
- **Decision**: Figtree, Bricolage Grotesque, Space Grotesk and JetBrains Mono (SIL Open Font License) ship with the board as files and are recorded in `docs/specification/dependencies.md`. No font is loaded from the network. Under a host that gives a font, the host's font is used.
- **Why**: the skins need their type, and the board makes no third-party network call.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md
```

---

## Out of Scope

- Streamed board updates and the "Agent writing" state (tracker M51, DD-17).
- Containers as screens and a board as big as its content (L7); the radial view for relationship nodes (L8).
- A Thread Drawers skin (DO-04); seen on a read-only board (DO-05).
- Removing any layout mode; removing the old footer's code; folding the existing kind, action and mode icons into
  the icon set (each becomes a tracker row in T_04).
- Anything for nclite beyond not breaking the hosted board: no plugin contract change, no app work for a host.
- Real feeds for apps (handover § 5, step 7).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| The real node has states the mockups never drew (proposal, handover, awaiting, moved, locked) | DESIGN_01 places them in wave 1; the maintainer agrees them before FE_01 |
| A skin forks behaviour over time | One skin registry; a test that every skin offers the same actions; skins are tokens and placement only |
| Hundreds of screenshots change | Flags stay off until T_04, which renews the baselines once, after the maintainer's yes |
| The hosted board breaks (nclite) | Skins set only `--vb-*`; host colours and fonts still win (D-094); `npm run test:plugin` in T_02, FE_04, VERIFY_01 |
| Renaming flag to Bookmark loses old marks | `flag` and `unflag` lines read as before; a test folds a format-19 ledger |
| Fonts add weight or a network call | Latin subsets, `woff2`, loaded only by the skin that uses them; page tests already block the network |
| Edge marks shrink below a usable size | FE_05's minimum size, and hit areas of at least 24 px at 100% |
| `nodeEdges` and the spike's flags interact | FE_08 owns the app card with every flag on and off |

---

## References

- `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md`
- `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/HANDOVER.md`
- `design/README.md`, `design/mockups/node-skins/`, `design/mockups/node-directions/`
- `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/CODE-MAP.md`
- `docs/principles.md`, `docs/decisions.md`, `docs/specification/` (`api.md`, `components.md`, `words.md`,
  `plugin.md`, `apps.md`, `dependencies.md`)
- `.kiro/steering/vision-board-proj.md`, `.kiro/steering/svelte-conventions.md`
- `cortex-tasks/tracker.md` rows U14 to U20, N47, N51, N52, L5

---

## Success Criteria

- [ ] With the flags on, a board draws both skins as `design/mockups/node-skins/` shows them, dark and light
- [ ] Every action in decision 2 works by its mark, its key and right-click, in both skins
- [ ] A format-19 ledger opens unchanged; old flags show as bookmarks
- [ ] With the flags off, the board, its tests and its screenshots are as before the set
- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, `npm run test:pages` and
      `npm run test:plugin` pass
- [ ] The gallery shows every new state; `pattern.json` files and the specification docs match the code
- [ ] `npm run eval:bot` passes for the skill change, with the maintainer's go for the live run
- [ ] The maintainer has used the result and said yes before T_04 turns the flags on
