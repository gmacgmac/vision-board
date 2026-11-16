# FE_01_node-edges-and-icon-set: The Node's Edges and the Icon Set

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make the `vb-node` pattern draw the new node in the default skin (edge marks, icon tile, tone, no footer) behind
`nodeEdges`, and create the icon set, the skin registry and the menu markup later tasks reuse.

---

## Context

PLAN.md § Decisions 1 to 8, 11, 12, 17. The look is `design/mockups/node-skins/default-skin-dark.html` and
`-light.html`; the states those pages lack are in `design/mockups/node-states/` as the maintainer agreed them
(TASK-STATUS.md notes for DESIGN_01). This task is `packages/ui` and the gallery only: it builds markup, styles and
state; the page's clicks, menus opening and acts are FE_02. Extend the pattern; do not write a second node.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/node/` (core, template, styles, `pattern.json`, `vb-node.ts`,
  `node-history.ts`, `node-updates.ts`), `packages/ui/src/icons/` (new), `packages/ui/src/skins.ts` (new),
  `packages/ui/src/menu/` (new, or the existing menu look made a pattern), `packages/ui/src/words/`,
  `packages/ui/src/patterns.ts`, `packages/ui/src/index.ts`, `packages/ui/src/styles.css`, `packages/ui/tests/`,
  `packages/format/fixtures/gallery.ledger.jsonl` (cards with an icon and a tone), `apps/board/src/gallery/`,
  `tests/pages/` (a new spec for the node with the flag on, and its screenshots),
  `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 1; `packages/ui/src/node/node-template.ts` (`footer`, `tabs`,
  `bottomTabs`, `flagButton`, `historyButton`, `sizeControl`); `packages/ui/src/node/node-icons.ts` (`svgIcon`);
  `packages/ui/src/region/region-icons.ts`; the `.vb-menu-list`, `.vb-size-menu` and `.vb-region-menu` markup (the
  board's menus today)
- **Patterns to follow**: core, template, element (`docs/principles.md` § Component model); update in place
- **Shared artifacts to reuse**: T_01's `ICON_NAMES`, `TONES`, `SKINS`, `bookmarksOn`; T_02's tokens. Import
  them; do not re-create them
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Icon set** (`packages/ui/src/icons/`): `ICONS`, a record from every `ICON_NAMES` name and every mark's
       icon (bookmark, clock, history, notes, tick, cross, grip, more) to a 24-box stroke drawing, and
       `icon(name, cls)` built on `svgIcon`. Draw them here in one consistent stroke style; the shapes in the
       mockups are the reference. The compiler fails when a name has no drawing. The existing kind, action and mode
       icon records stay as they are.
2. [ ] **Skin registry** (`packages/ui/src/skins.ts`): `SKIN_DEFS`, one row per `SKINS` name saying where the
       answer sits (`disc` or `switch`) and where the marks sit (`edges` or `plate`). Add the `default` row and a
       `command-lens` row that FE_04 completes. The template reads a row, never a skin's name.
3. [ ] **Core**: the node's state gains what the marks show: bookmarked, the answer (none, waiting, ticked,
       crossed), the notes mark (none, count, unread), the change badge (none, new, updates, settled version), icon,
       tone. Pure, unit-tested, from the same inputs the footer used.
4. [ ] **Template**, when `opts.edges` is set: no footer; the number is a button (Bookmark, pressed when set);
       the kind tab, or for a node with an icon a grip and a kind word; the answer disc on nodes that ask; the
       change badge bottom left (it opens the history box, which also holds the "N updates" stepper); the notes
       mark bottom right; the icon tile; `data-tone`. Proposal, handover and the other states as DESIGN_01 placed
       them. With `opts.edges` unset the markup is byte-for-byte what it is today.
5. [ ] **Menus** as markup only, one fixed-size menu look: the number menu (Bookmark, Save for later), the answer
       picker (Tick, Cross; it opens beside the disc), the right-click list (the six actions with their keys; no
       Tick or Cross on a node that only tells). Reuse the board's existing menu look; make it one pattern with its
       own `pattern.json` if it is not one yet.
6. [ ] **Styles** from tokens only: every state in `docs/principles.md` § Every state, selection as the node's own
       border, the disc, the icon tile and the notes mark on one vertical line, a hit area of at least 24 px per
       mark, a visible focus ring on the node and on each mark.
7. [ ] **Accessibility**: each mark is a real button with a name from the words file that says its state ("28,
       bookmarked", "3 notes, agent replied"); reading and tab order follow the visual order.
8. [ ] **Gallery and tests**: gallery sections for every new state, drawn from the fixture through the core, shown
       with the flag on; unit tests for the core and the template; one test that the server and the element build
       the same markup; a page spec with screenshots, light and dark. Update `pattern.json` and `components.md`.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; the new page spec passes with `?flags=nodeEdges`
- [ ] With the flag off: `npm run test:pages -- every-node.spec.ts gallery.spec.ts board.spec.ts` passes with no
      new baseline
- [ ] axe finds nothing on the new gallery sections; every mark is reachable and named by keyboard
- [ ] Side by side with `design/mockups/node-skins/default-skin-*.html` in a browser, light and dark, the node
      matches; differences are listed in your notes with the reason

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_01_node-edges-and-icon-set.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
