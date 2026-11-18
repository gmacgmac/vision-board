# Node Overhaul - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-16

Start here, then read, in this order: `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md`
(what was decided, DD-01 to DD-19), `design/README.md` and the four pages in `design/mockups/node-skins/` (what it
looks like: open them in a browser, dark and light), `.kiro/steering/vision-board-proj.md` and `docs/principles.md`
(how we build). For the ledger work (BE_02, T_01, BE_03, BE_04), also
`cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` (§ 3, § 4).

---

## Problem Statement

The board's node carries its controls in a footer row, which makes every node busy and hides the sparse look the
maintainer wants. A new node was designed over 2026-11-11 to 11-16: every action sits on the node's edge, the look is a
swappable skin, and two skins are chosen. This set builds it, with the zoom, selection, layout and app-window work the
design depends on, and the ledger migration its new records need (the ledger review).

---

## Decisions

Every ruling is the maintainer's, from the design conversation of 2026-11-11 to 11-16 and the kickoff and
ledger-review answers (points 219-246). The decisions draft holds the same list with the artboard that shows each
one; where they differ, stop and ask.

1. **A theme is a skin** (DD-01). A skin may change how a node looks and where its controls sit. The six actions,
   their keys and what they do are the same in every skin. Function never forks by skin.
2. **Six actions on a node** (DD-02): Tick, Cross, Comment, Bookmark, Save for later, History. Keys A, X, C, B, L, H
   (A, X, C and L exist today). Right-click, or a long press on touch, lists all six with their keys; a node that
   only tells shows no Tick or Cross.
3. **The flag becomes Bookmark** (DD-03, yes at point 211). The person's private mark, never sent to an agent, is
   now called Bookmark everywhere: screen words, code, docs. Ledgers written before format 20 are migrated: `flag`
   and `unflag` become `bookmark` and `unbookmark` (decision 23); nothing reads the old acts. The bookmark glyph, which today means Save for later, now means Bookmark; Save for later takes the clock.
4. **The number is the bookmark** (DD-04). Clicking the number tag toggles Bookmark; holding the pointer on it opens
   a two-row menu, Bookmark and Save for later. A bookmarked number fills with the bookmark colour and grows a
   notched tail. Save for later leaves the node's face.
5. **Notes on every node** (DD-05). The notes mark is always there: quiet when empty, a count when not, filled when
   an agent's reply is unread. It opens one conversation box, to read and to write: beside the node, rounded,
   pointing at it, top-aligned, a compact header (number and title), a reply field of one line that grows to three,
   two buttons sharing the width, **Ask now** and **Add note**, their keys in tooltips (Cmd Enter, Enter; Shift
   Enter is a new line). It floats over neighbours and never moves them. It scales with the board. **Add note** keeps
   the note for the board's Send, as today. **Ask now** is node-scoped (kickoff): it sends that one message for its
   node at once, apart from Send, and the reply comes back in the node's box. The ledger records it as an `ask` act
   naming the lines it carried and the context the agent was given (`node`, `board` or `session`), so how much
   context the agent gets can change later without a format change (call 1).
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
12. **Architecture content** (DD-13): an optional icon per node, by name from the built-in set or the project's icon
    library (decision 24), drawn in a 40 px tile (icon 24 px) at the right of
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
16. **Seen** (DD-19; changed by point 308). On a board that isn't read-only, clicking a node marks it seen, as today.
    Clicking anywhere inside a container clears its new-and-updated pill on the person's screen only: page-local
    state, like zoom, until the container's next change. Nothing is stored for a container and D-054 stands; a
    `seen` names a card or a board, never a container. Read-only boards are left as they are (DO-05).
17. **A tone per node** (DO-01, U19, points 211, 242, 246): an agent may give a node an optional tone, a palette
    name or a hue (a whole number from 0 to 359, the OKLCH hue angle). The board derives the tints from the hue so
    contrast passes in light and dark, proven by a sweep of every hue (T_02). It tints the body, the top line and the
    icon tile. The kind keeps its own tab, word or dot, and Tick and Cross keep their colours. The kind's colour is
    the default; a tone sets apart the parts of a flow and shows which nodes belong together (T_03).
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
23. **Ledgers are migrated, never read in old formats** (D-103; kickoff "no legacy"; the ledger review R1, § 3).
    When the format changes, a migration upgrades older ledgers line for line: it never adds, removes or reorders
    a line and never changes `seq` or a card's identity. It runs under the ledger's lock, after a backup, replaces
    the file in one step, and changes nothing when run twice. A ledger opened read-only is upgraded in memory only.
    The reader, the schema and the fold know only the current format. A ledger in a newer format opens read-only
    and says why.
24. **The project's icon library** (kickoff call 5, point 242; review O4). Agents add icons to `.visionboard/icons/`,
    shared by every board of the project, only through `add_icon`, which keeps path data and nothing else; every
    drawing is checked when added and every time it is read. `list_icons` lists the built-in set and the library;
    agents reuse before they add. The ledger holds one `icon` line per name with the file's hash; a node stores the
    name only; a name is given once; only the person can accept a changed drawing.
25. **Flow direction** (kickoff call 7; review O5). A `flow` container runs across or down. Whoever draws it sets it
    on the container, with any redraw; the person changes it for one container or for the whole board, and Auto
    gives back the agent's. Both are stored in the ledger.

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
- **Versions** (the ledger review, H6, H7): older lines are read where they lie, through about ten version branches
  in the schema, the shape rules, the index and the fold; no migration, backup or snapshot code exists. A line in a
  newer format is skipped and the ledger stays writable.
- **The private mark** is the acts `flag` and `unflag` (`CARD_MARKS`, fold `packages/actions/src/card-flags.ts`
  `flagsOn`, page `apps/board/src/board/cards/flag-flow.ts`, key Shift+F, feature flag `cardFlag`).
- **Seen**: selecting a card already writes a `seen` line (`apps/board/src/board/cards/update-flow.ts`); nothing is
  stored for a container (`packages/actions/src/fresh.ts` derives it), and nothing will be (point 308).
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

Build the new node as an extension of the `vb-node` pattern, not a second pattern. The ledger learns to migrate
first, then the contract changes, then the reader drops the old formats. All new drawing is behind flags that stay off by default until the maintainer has used the result; the last task turns
them on and renews the screenshots.

### Key Changes

1. **Ledger migration** (BE_02): today's fixtures and their folds frozen first; a pure upgrade chain; a runner with
   lock, backup and one atomic replace, idempotent; an in-memory upgrade for a read-only open; `npm run
   ledger:migrate`; a ledger in a newer format opens read-only and says why.
2. **Undrawn states** (DESIGN_01): where proposal, handover, awaiting, saved for later, moved, locked and failed
   states sit on the new node, drawn for the maintainer before the node is built.
3. **Contract** (T_01): node `icon` (built-in or library) and `tone` (a palette name or a hue); a board's `skin`;
   Bookmark replaces flag; the `ask` act; `direction` on a region and the
   `direction` act; the `icon` line, `list_icons`, `add_icon` and the library's folder; every flag the set uses.
   Ledger format 20, with its 19-to-20 step in the chain.
4. **Tokens, skin layer and fonts** (T_02): tokens for the edge marks, tone tints derived from a hue and swept for
   contrast, Decision's new colour and Command Lens; a skin is a set of token values under `[data-vb-skin]`; fonts
   self-hosted.
5. **One format in the reader** (BE_03): the version branches go; fixtures and test lines are brought to format 20
   through the chain.
6. **The icon library** (BE_04): the handlers, the check shared by server and page, the `icon` line on first use,
   the engine's option.
7. **The node's edges and the icon set** (FE_01): the pattern draws the marks; one icon set renders icons by name,
   built-in or from the library; a skin registry says where each skin puts the answer and the marks.
8. **The board wires the edges** (FE_02): clicks, the number menu, the answer picker, right-click, keys, bookmark,
   a container's pill cleared on screen by a click (page-local, point 308), the library's drawings, the skin picker.
9. **One conversation box** with Ask now (FE_03), **the Command Lens skin** (FE_04), **zoom groups** (FE_05), **the
   selection bar and Z** (FE_06), **flow branching and direction** (BE_01), **one layout control** (FE_07), **the
   app window** (FE_08), **the agent skill** (T_03), **verification** (VERIFY_01), **switch over and remove the
   old** (T_04).

### How it meets the principles

- **Reuse before create**: every piece extends an existing pattern or module, named in its task. New: the upgrade
  chain (`packages/format/src/migrate/`, beside the runner's precedent `ledger-move.ts`), one icon set
  (`packages/ui/src/icons/`), one skin registry (`packages/ui/src/skins.ts`), one icon check
  (`packages/format/src/icon-file.ts`, shared as `imagePathProblem` is), all Shared Foundations.
- **Contract first**: T_01 lands the schema, the generated files and their tests before any drawing; BE_02 before it
  makes the format cheap to change, and BE_03 after it leaves the reader one format.
- **One action layer**: Bookmark, Save for later, a card's seen, the skin choice, Ask now and a flow's direction are acts
  through the one sender; agents add icons only through `add_icon`, never by writing a file; Tick and Cross stay
  the person's clicks.
- **Registries**: skins are rows in one table; a second skin is a row and a stylesheet, never a branch in the node.
- **Words**: every new sentence goes in its area's words file, named in each task.
- **Tokens**: colour only in `packages/tokens/src/tokens.css`; skins change token values, never literals in a
  pattern.
- **Flags**: `nodeEdges`, `skins`, `layoutControl`, `flowDirection`, `appWindow`, all off by default until T_04. The
  migration has no flag (call 13).

---

## Dependencies

- Wave 1: BE_02 and DESIGN_01 together (DESIGN_01 writes only under `design/`). Wave 2: T_01. Wave 3: T_02, BE_03
  and BE_04 together, each in its own git worktree. Every later wave holds one task.
- BE_02 before T_01: T_01 adds its 19-to-20 step to BE_02's chain, and BE_02's frozen fixtures must be captured with
  today's code before the contract changes anything.
- T_01 before everything else: every later task reads its types, flags, acts and operations. BE_03 after T_01: it
  removes the old formats only once format 20 and its step exist. BE_04 after T_01: it fills T_01's stub handlers.
- T_02 and BE_04 before FE_01: patterns read only tokens, and FE_01 draws library icons through BE_04's check.
- DESIGN_01's pages need the maintainer's yes before FE_01 starts (a gate the orchestrator holds).
- FE_01 before FE_02, FE_03, FE_04, FE_06, FE_08: they use the icon set, the skin registry and the node's marks.
- FE_03 before FE_06 and FE_08: the selection's Ask now and the app window's drawer are the conversation box's.
- BE_01 before FE_07: the layout control's direction choice redraws only once the layout reads it.
- T_04 only after VERIFY_01 and the maintainer's yes.
- No new npm package. Four font families are vendored (T_02), each download needing the maintainer's go.

---

## House Rules

- **Where**: worktree `.claude/worktrees/app-window`, branch `spike/stage-apps`. Never the main checkout: the
  maintainer's board runs there. Never port 4466. `VB_TEST_PORT` per task: BE_02 6150, T_01 6110, DESIGN_01 6210,
  T_02 6250, BE_03 6350, BE_04 6450, FE_01 6410, FE_02 6510, FE_03 6610, FE_04 6710, FE_05 6810, FE_06 6910, BE_01
  7110, FE_07 7010, FE_08 7210, T_03 7310, VERIFY_01 7410, T_04 7510. Page workers use base + 10 to base + 59, so
  the ranges of tasks in one wave never overlap (wave 3's are 100 apart; T_02 moved from 6310 to 6250 for that).
- **Own worktrees** (the tasks marked `yes` in TASK-STATUS.md: BE_02, T_02, BE_03, BE_04): before dispatch the
  orchestrator commits the set's state on `spike/stage-apps`, then runs `npm run worktree -- <id-kebab> --base
  spike/stage-apps` (`scripts/worktree.mjs`: makes `.claude/worktrees/<id-kebab>` on `feat/<id-kebab>` with
  `node_modules` linked) and names the path and the port from the list above in the brief, never the printed port.
  The sub-agent checks `git branch --show-current` first. After the wave's gate the orchestrator merges each task's
  branch into `spike/stage-apps`, runs the project checks on the merge, removes the worktree (`git worktree
  remove`) and deletes the branch. A `no` task works in `.claude/worktrees/app-window`.
- **Orchestrator-only files**: `docs/decisions.md` (the drafted entries below, appended on the maintainer's yes),
  `docs/principles.md`, `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `package-lock.json`,
  `docs/specification/modules.md` (run `npm run map` after a task changes imports), `cortex-tasks/tracker.md`.
- **Protected, with a named owner**: `packages/tokens/src/tokens.css` is changed only by T_02, FE_02 (removing the
  `--vb-state-flag` alias only), FE_04 (a Command Lens value T_02 missed) and T_04 (Decision's colour), under
  decision 13; the task lists its exact diff in its notes and the
  orchestrator shows it to the maintainer at the gate.
- **Commits**: the orchestrator commits each checked task on `spike/stage-apps`; nothing is pushed. No sub-agent
  runs a git command that changes state.
- **Flags**: every flag this set adds is off by default until T_04, and so is the spike's `appStage` from T_01 on.
  Existing tests and screenshots must pass with the flags off after every task. New behaviour is tested with its
  flag on (`?flags=`). The ledger migration and the contract's records have no flag (call 13).
- **Ledgers**: no task opens the maintainer's `.visionboard/` or any real ledger; tests make their own folder under
  the OS temp folder. No task edits `packages/format/fixtures/legacy/` after BE_02 writes it.
- **Project checks**, after every task: `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`,
  and the page specs for what changed. The full page suite runs once, in VERIFY_01, and again in T_04
  (`VB_TEST_WORKERS=3`, `nice -n 15`). Every run has a time limit: 10 minutes for unit tests, 25 for the full page
  suite.
- **Temporary size budgets** (maintainer, point 351, until T_04 deletes the old node's code): the page's start
  budget 200 → 210 KB gzip (FIX_02 measured 210.2 and raised it to 211) (`scripts/verify-weight.mjs` `PAGE`, `performance.md`); the plugin's `view/board.js`
  190,000 → 202,200 and `view/board.css` 22,000 → 27,600 gzip (raised as tasks measured; 201,229 and 27,093 after the FE_08 merge; FIX_01 measured 202,147 and 27,530 and raised them to 202,200 and 27,600; FIX_02 measured 202,639 and raised `view/board.js` to 202,700) (`apps/board/tests/plugin-build.test.ts` `BUDGET`).
  Each task still loads on demand what opens on an action. T_04 restores 200 KB, 190,000 and 22,000.
  **Budgets never block a task in this set** (maintainer, 2026-11-17): if the work needs more, the task raises the
  temporary figure to what it measured, says so in its notes, and carries on. Size is optimised once, after the
  features are done (T_04 and a final pass). What keeps size down meanwhile is reuse: one pattern per control, used
  everywhere, per the design specifications.
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

1. **Ask now** (changed at kickoff; decision 5): Add note queues the note for the board's Send; Ask now writes the
   note and an `ask` act for it alone (T_01, FE_03). The context it gives is a page setting, `askContext`, default
   `board`, recorded on every `ask`. This set builds `board` only (the asked note with the board, as Send gives
   it); `node` and `session` stay values of the contract, with no control on screen until a second mode is built
   (a tracker row).
2. **Tone names**: `teal`, `blue`, `violet`, `magenta`, `amber`, `orange`, `green`, `slate`; or a hue from 0 to 359,
   the OKLCH hue angle (decision 17; review O3). No hue band is refused: the tints are low in strength, and T_02
   reports any hue that reads as the notes pink, Tick's green or Cross's red, for the maintainer to rule on.
3. **Keys**: B toggles Bookmark (Shift+F retires), H opens History. A, X, C, L, O and Z are unchanged.
4. **Type**: the default skin uses Figtree for text and Bricolage Grotesque for titles on every node; Command Lens
   uses the system font for text, Space Grotesk for titles and JetBrains Mono for labels. Under a host that gives
   `--host-font`, the host's font wins.
5. **Icons** (changed at kickoff; decision 24): by name, from a built-in set of about 48 drawn in this repo (FE_01)
   or from the project's library. An agent never puts its own SVG on a node: it adds a drawing to the library
   through `add_icon`, which keeps path data only. No icon package is installed.
6. **States not drawn** keep today's place unless DESIGN_01 moves them: the proposal and handover tabs stay on the
   bottom border between the change badge and the notes mark.
7. **Flow direction** (changed at kickoff; decision 25): stored in the ledger, on the container (the agent's) and by
   the person's `direction` act (`auto` clears it; no `region` means the whole board); never a page preference.
8. **The old footer** stays behind `nodeEdges` off until T_04, which deletes it with every other old code path and
   the flags (kickoff answer below).
9. **History** opens one box holding what the "N updates" stepper and the history list show today.
10. **Library names start `x-`** (review O4, R9), so a built-in added later can never clash with a project's icon.
    The prefix is the maintainer's to choose; `x-` unless he says otherwise at kickoff.
11. **The page gets library drawings from `list_icons` with `paths: true`**, read when a ledger opens and when an
    `icon` line arrives. The review had the board read carry them; the page builds its board from the ledger's
    lines, not from `get_board`, so this one read does it. An agent's `list_icons` carries no paths unless asked.
12. **A changed library drawing** draws the plain tile, and `list_icons` names the problem. The person accepts the
    new drawing with a person `icon` line (contract T_01, server BE_04); the page's control for it is a tracker
    row, and until then the person puts the file back.
13. **The migration has no flag**: from BE_03 on, the reader knows one format and depends on it. The backup and
    `--undo` are its safety.
14. **Under a host** the engine migrates when it opens a `dir` it may write, with no lock: `plugin.md` states that
    a host opens one `dir` with one engine at a time (BE_02). A host lock (review R20) stays later.
15. **D-054 is not edited** (an accepted entry never is), and after point 308 nothing of it is replaced: D-099 point 4
    keeps a container's seen on the person's screen only.
16. **BE_01 runs before FE_07**: a container's direction choice, in the layout control, redraws when it lands; the
    board-wide choice is BE_01's toolbar control.
17. **The review's other rows** (Should R12 to R16, Later R17 to R25) are tracker rows, not part of this set.

---

### Kickoff answers (maintainer, 2026-11-16, points 219-231)

- **Confirmed as written**: calls 2, 3, 4, 6, 9; drafts D-099 to D-102 (appended together, in order, once the ledger
  review below is in, since D-099 point 2 and D-100 point 3 touch the ledger; after the review D-099 and D-100 were
  reworded and D-103 added, § Decision entries); the font downloads, if safe (T_02);
  the live skill run, on Haiku 5.5 as the reference model (T_03); the tokens diff shown at T_02's gate.
- **Call 1 changed: Ask now is node-scoped.** Add note queues a note for the board-wide Send, as today. Ask now sends
  that one message for that node at once, and the reply comes back in the node's conversation box. How much context
  the agent gets (the node, the node plus the board, or the board's own session) is undecided: the record must keep
  those modes open. Shape comes from the ledger review; T_01 and FE_03 are amended before they run. Settled:
  decision 5, call 1.
- **Call 4 extended: fonts ship with the plugin**, and `plugin.md` tells a host what the plugin brings (T_02 step 5a).
- **Call 5 changed: agents may add their own icons** to a board's icon set (cleaned single-colour drawings, stored
  in the project's `.visionboard/icons/`, used by name), so the set grows over time and is reused. The agent's spec
  is a few bullets in the skill (T_03): how to make one, where it goes, name it for reuse, reuse before adding. An
  agent adds one through the action layer (cleaned and checked), never by writing the file. Storage and naming
  details come from the ledger review. Settled: the project's library, decision 24, calls 10 to 12.
- **Agent colours (point 242)**: a node's tone is a palette name or any hue the agent picks; the board derives the
  tints from the hue so contrast passes in light and dark (T_01 contract, T_02 tokens). Settled: decision 17.
- **How the agent uses tone (point 246)**: a node's kind keeps its own colour by default; when the kind already says
  it, leave the tone off. Use tone where it helps the person read the board: to set apart parts of a flow, and to
  show which nodes belong together (the same tone means related), for example a flow of many topic nodes. A few
  bullets in the skill (T_03). The feature can be turned off later without changing the contract.
- **Call 7 changed: flow direction has a default per view**, set by whoever writes the view, and the person can
  change it on the board. Where it is stored comes from the ledger review; BE_01 and FE_07 are amended before they
  run. Settled: in the ledger, decision 25, call 7.
- **Calls 8 and old code: no legacy.** T_04 makes the new node the only node and deletes the old footer, the flags
  and every old code path; old ledger lines go through a migration, not a second reader.
- **Ledger review**: a separate session (Fable 5.2) reviews the ledger format for health, scale, versioning and
  migration, and the overhaul's ledger changes. Result:
  `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md`. T_01 waits for it.
- **Point 308 (after T_01): a container's "seen" is not stored in the ledger.** A card's own `seen` is stored as
  before. Clicking inside a container clears its fresh pill on the person's screen only, page-local state like zoom,
  until the container's next change; D-054 ("nothing stored" for a container) stands unchanged. Format 20 had reached no real ledger (every real
  ledger is format 19), so T_01's container form of `seen` (`{ board, region, head }`, `containerSeenDue`, its schema,
  shape rules, fold, tests and api.md 187) was removed from format 20 outright: no migration step, no format bump. A
  `seen` carrying `region` is refused as an unknown field (api.md 187). Changed: decision 16, call 15, the D-099 draft
  point 4, FE_02 step 8, VERIFY_01 step 2. Tracker N47 (a container's reply bright until the container is seen) is no
  longer settled by a stored seen: the maintainer rules whether FE_02's page-local click also mutes those replies.

### Ledger review answers (maintainer, 2026-11-16)

- **R1, migrate**: older ledgers are migrated; nothing reads an old format, anywhere (decision 23, D-103).
- **R2, the four contradictions**: Ask now is node-scoped (decision 5); agents add icons to a project library in
  `.visionboard/icons/` (decision 24); flow direction is set by whoever draws it and the person can change it
  (decision 25); a tone is a palette name or a hue (decision 17).
- **The design**: the review's recommended records, O1 to O7, as written. Its Must rows and R28 are in this set: R3,
  R4, R5 (BE_02; the 19-to-20 step in T_01); R6 to R10, R26 and the contract half of R27 (T_01); R26's tints
  (T_02); R11 (BE_03); the handler half of R27 (BE_04); R28 (T_03). Its other rows are tracker rows (call 17).
- **The kickoff now includes the review**: the orchestrator reads calls 1, 2, 5, 7 and 10 to 17 to the maintainer
  with the rest, and D-103 with the other entries.
- **Speed**: the maintainer needs the board in nclite soon. Where later waves touch no common files, the
  orchestrator may run them together.

### Design review of DESIGN_01 (maintainer, 2026-11-17)

The maintainer reviewed `design/mockups/node-states/` (default skin, and Command Lens's input page). Where a page and
this list differ, **this list wins**. Anything not named here is accepted as the page's left column.

- **Proposal waiting**: left (dashed ring on the disc). The proposal box opens beside the disc, to its right, in the
  same style as the node's conversation box.
- **Proposal out of date**: no amber state. The disc goes back to waiting, and the history box gets an entry
  "Proposal withdrawn: the node changed".
- **Handover and Awaiting**: left (a tab on the bottom edge where New and updates sit), drawn plain and quiet grey,
  never bright. Once the handover arrives it is part of the node: a "Handover" section in the node's body, in
  Markdown the agent writes as it likes (the skill guides it, T_03); the tab goes.
- **A write on its way / a write that failed** (the person's own click being saved, not agent streaming): keep. The
  failure tip shows for a few seconds after it happens, then the mark keeps its "!" and the tip comes back on hover.
  The error red is softened: a calmer red that still passes its contrast tier (a `tokens.css` change shown to the
  maintainer).
- **Locked or read-only** (point 328): no lock is shown at rest; every disc looks as it would on an open board (an answered node keeps its tick or cross). Pressing a disc or a write mark turns it into a lock for a few moments with a small popover "Board is locked" (or "This ledger is read-only"), then it goes back.
- **Moved by you**: no mark on the node. "Moved by you · Put back" is an item in the number's menu and the right-click
  menu.
- **Tags**: tinted with the node's own colour (its tone, else its kind), stronger than today's faint grey. No colour
  per tag.
- **A note on several nodes**: left (counted on each member's notes mark). The node's conversation box gets tabs:
  the first is this node, then one per group note it belongs to.
- **Keyboard focus**: order as drawn. Rings show only after the person presses Tab, never after a click or a modifier
  key (`:focus-visible` from the keyboard only, both skins). The ring is calmer than bright white in the default
  skin; Command Lens may keep white, toned down.
- **Hover**: no halo on marks. A tooltip shows only after a deliberate hover of about two seconds; keyboard focus
  shows it at once.
- **Tone (point 366)**: when a node has a tone, everything coloured by the node follows it: the drag grip (tab), the
  top line, the hover and selected borders and the icon tile. The kind word ("FINDING") says the kind. FE_04 applies
  it to both skins; D-100 point 3's "the kind keeps its own mark" now means the kind word, not the grip's colour.
- **Boxes beside a node (points 362, 363, 366)**: one placement and one style for the conversation, proposal and
  history boxes: top aligned with the node, right if there is room else below, compact (about the node's width),
  the history box as designed (FE_03 run 2).
- **History box with the stepper**: as drawn.
- **Waiting for a reply**: no three dots on the notes mark; the filled mark when the reply arrives is enough.
- **Failed send in the conversation box**: same softened red as above.
- **Error red (point 338)**: not softened after all. Errors keep today's red (`#f07474` dark, `#cc3b3b` light); no
  red token changes. Where today's dark red misses Lc 45 (on the tip box), fix the tip's background, not the red.
  The focus ring colours are approved: default `#8b9bb8` dark / `#5a6478` light, Command Lens `#b9bfc8` / `#4a4e57`.
  The mock-ups' softened red (`#dc8f88` / `#b2554f`) is not used.
- **Far zoom (points 430-438, FIX_02)**: one breakpoint, about 37%; above it marks keep their minimum; below it nothing
  grows (marks scale down with the node from there), nothing jumps or hides; only container titles keep their size.
- **Mark presses (points 430-438, FIX_02)**: every mark takes its press, with the hand, above the far breakpoint; below
  it a press selects the node only, no hand; keyboard unchanged; axe `target-size` excused below 100% only for a mark
  drawing under 24px.
- **The box's pointer (points 430-438, FIX_02)**: it aims at the node's centre: beside, on the box's left edge at the
  node's vertical centre; below, the box centred on the node and the pointer at the middle of its top edge; still aimed
  there when the box moved to stay on screen.
- **The conversation box's zoom (point 444, FIX_02)**: one size below 80%, with the board from 80% to 120%, one size
  above (box scale = clamp(zoom, 0.8, 1.2)); the same for any box that scales with the board.
- **One zoom registry (point 445, FIX_02)**: every zoom rule is a row of `packages/ui/src/zoom-rules.ts`; the code
  reads it, the CSS reads only the variables it names, a test fails on a zoom number anywhere else.

## Decision entries to append

Drafts for `docs/decisions.md`, in its format. The orchestrator shows them to the maintainer at kickoff and appends
them, word for word, on his yes (points 211 and 212 already approve their substance). It also makes this one change
to `.kiro/steering/vision-board-proj.md` § Words, with the same yes: `flag (the person's private mark, never sent to
an agent)` becomes `bookmark (the person's private mark, never sent to an agent)`.

```
## D-099 A node's actions live on its edges, and the flag becomes Bookmark
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 211-337) · **From**: the node design, 2026-11-11 to 11-16 (design/mockups/node-skins)
- **Decision**:
  1. A node offers six actions: Tick, Cross, Comment, Bookmark, Save for later, History (keys A, X, C, B, L, H). Right-click or a long press lists them. Each mark on the node's edge is the control for what it shows: the number (Bookmark; held, Save for later too), the answer (Tick, Cross), the change badge (History), the notes mark (the conversation). The footer row goes.
  2. The person's private mark is called Bookmark, in words, code and docs. Ledgers written before format 20 are migrated (D-103): `flag` and `unflag` become `bookmark` and `unbookmark`. The bookmark glyph means Bookmark; Save for later takes the clock.
  3. Notes open one conversation box, to read and to write. Add note keeps the note for the board's Send; Ask now sends that message for its node at once, and the ledger records what context the agent was given with it. Selection is the node's own border. Width moves to the selection bar.
  4. Clicking a node marks it seen. Clicking inside a container clears its new-and-updated pill on the person's screen; nothing more is stored (D-054 stands). A read-only board is unchanged.
  5. An app node offers no Save for later: it is a window, with a title bar and a drawer for its conversation.
- **Why**: the footer made every node busy and hid the sparse look; marks that are also controls keep a node calm and every action one click or one key away.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md

## D-100 A board has a skin; a skin changes the look, never the function
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 211-337) · **From**: the node design, artboards 10 and 12
- **Decision**:
  1. A skin sets how nodes look and where their controls sit. The actions, their keys and what they do are the same in every skin. Two skins: `default` and `command-lens`.
  2. A board's skin is stored with the board, set by whoever makes it, and the person can change it on the board.
  3. A node may carry an icon and a tone. The icon is named from the built-in set or from the project's icon library (`.visionboard/icons/`), which agents add to through the action layer and reuse across boards. The tone is a palette name or a hue; the board derives the tints so contrast passes in light and dark. The kind keeps its own mark, and Tick and Cross keep their colours.
  4. Decision's colour moves off the accent pink, so pink means notes and buttons only.
  5. Flows run across or down. A setting in the board's header sets the default; whoever draws a container may set its own, the person can change either, and both are stored with the board.
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

## D-103 Ledgers are migrated, never read in old formats
- **Date**: 2026-11-16 · **Status**: Accepted (maintainer, points 219-246) · **From**: the ledger review (cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md)
- **Decision**:
  1. When the ledger format changes, a migration upgrades older ledgers to the current format, line for line. It never adds, removes or reorders a line, and never changes `seq` or a card's identity. It is the one rewrite an append-only ledger allows (D-017).
  2. It runs under the ledger's lock, after a backup, and replaces the file in one step; running it twice changes nothing. A ledger opened read-only is upgraded in memory only.
  3. The reader, the schema and the fold know only the current format.
  4. A ledger whose format is newer than the build opens read-only and says why.
- **Why**: reading old formats where they lie spreads version branches through the reader with every change; a migration keeps the code on one format and makes the next change cheap.
- **Task**: cortex-tasks/board/2026-11-16_board-ui_node-overhaul/TASK-STATUS.md
```

---

## Out of Scope

- Streamed board updates and the "Agent writing" state (tracker M51, DD-17).
- Containers as screens and a board as big as its content (L7); the radial view for relationship nodes (L8).
- A Thread Drawers skin (DO-04); seen on a read-only board (DO-05).
- Removing any layout mode; folding the existing kind, action and mode icons into the icon set (each becomes a
  tracker row in T_04). The old footer's code is removed, by T_04.
- The ledger review's Should rows R12 to R16 and Later rows R17 to R25 (tracker rows, call 17); the `$id` scheme of
  the ledger schemas.
- Ask now's `node` and `session` contexts beyond the record (call 1); the page's control to accept a changed library
  drawing (call 12).
- Anything for nclite beyond not breaking the hosted board: no app work for a host, and no plugin contract change
  beyond two that break no host: the engine's optional `icons` folder (BE_04) and the single-opener rule a migration
  relies on (call 14, BE_02).
- Real feeds for apps (handover § 5, step 7).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| The real node has states the mockups never drew (proposal, handover, awaiting, moved, locked) | DESIGN_01 places them in wave 1; the maintainer agrees them before FE_01 |
| A skin forks behaviour over time | One skin registry; a test that every skin offers the same actions; skins are tokens and placement only |
| Hundreds of screenshots change | Flags stay off until T_04, which renews the baselines once, after the maintainer's yes |
| The hosted board breaks (nclite) | Skins set only `--vb-*`; host colours and fonts still win (D-094); `npm run test:plugin` in T_02, FE_04, VERIFY_01 |
| Renaming flag to Bookmark loses old marks | The 19-to-20 step renames them; a format-19 ledger with flags migrates and folds to the same bookmarks |
| A migration loses, adds or reorders a line | One line in, one line out; checked line against line before the file is replaced; a backup first; frozen folds captured with today's code prove the board is the same (BE_02) |
| A crash or a second writer during a migration | Temp file, `fsync`, backup, one rename; a stale temp file is cleared; it runs only under the lock (standalone) or on the single-opener rule (host) |
| An older build opens a migrated ledger and writes after lines it skips | From this build on, a newer format opens read-only and says why (BE_02); a build older than this set cannot be fixed, and only the maintainer's ledgers are known |
| Removing the version branches changes a board | BE_03 proves every frozen file folds to its frozen result; where a branch decided behaviour it stops and reports |
| An agent's icon carries script or markup to the page | Path data only: the SVG is reduced on add, the file checked on every read, and the page draws only re-checked `d` strings it builds itself (BE_04, FE_01) |
| A free hue lands on a colour that already means something | Low-strength tints; T_02's sweep and report; the maintainer rules on any band (call 2) |
| `oklch()` is not drawn by a host's webview | T_02 checks Chromium and WebKit and stops if WebKit fails |
| Fonts add weight or a network call | Latin subsets, `woff2`, loaded only by the skin that uses them; page tests already block the network |
| Edge marks shrink below a usable size | FE_05's minimum size, and hit areas of at least 24 px at 100% |
| `nodeEdges` and the spike's flags interact | FE_08 owns the app card with every flag on and off |

---

## References

- `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md`
- `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/HANDOVER.md`
- `design/README.md`, `design/mockups/node-skins/`, `design/mockups/node-directions/`
- `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/CODE-MAP.md`
- `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` (§ 3, § 4 O1 to O7, § 7)
- `docs/principles.md`, `docs/decisions.md`, `docs/specification/` (`api.md`, `components.md`, `words.md`,
  `plugin.md`, `apps.md`, `dependencies.md`)
- `.kiro/steering/vision-board-proj.md`, `.kiro/steering/svelte-conventions.md`
- `cortex-tasks/tracker.md` rows U14 to U20, N47, N51, N52, L5

---

## Success Criteria

- [ ] With the flags on, a board draws both skins as `design/mockups/node-skins/` shows them, dark and light
- [ ] Every action in decision 2 works by its mark, its key and right-click, in both skins
- [ ] A format-19 ledger, and one mixing formats 7 to 19, migrate line for line to format 20 with a backup and fold
      to the same board; old flags show as bookmarks; a second run changes nothing; a read-only open writes nothing
- [ ] A ledger in a newer format opens read-only and says why
- [ ] The reader, the schema and the fold know one format: no version branch is left outside the upgrade chain
- [ ] Ask now sends one node's message and records an `ask`; the board's other answers wait for Send
- [ ] A flow's direction set by the agent draws; the person's choice, for a container or the board, wins; Auto
      gives the agent's back
- [ ] Agents list and add icons only through `list_icons` and `add_icon`; a library icon is reused across boards;
      no hostile drawing reaches the page
- [ ] Every tone, a palette name or any hue, passes contrast in light and dark, in both skins
- [ ] With the flags off, the board, its tests and its screenshots are as before the set, except that flag reads
      Bookmark and its key is B (FE_02)
- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check`, `npm run test:pages` and
      `npm run test:plugin` pass
- [ ] The gallery shows every new state; `pattern.json` files and the specification docs match the code
- [ ] `npm run eval:bot` passes for the skill change, with the maintainer's go for the live run
- [ ] The maintainer has used the result and said yes before T_04 turns the flags on
