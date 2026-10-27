# UI_01_shared-ui-base: Shared UI Base

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Menus, dismissable layers, dialogs, buttons and popover surfaces are built once in `packages/ui`, with
every state and keyboard path, and every screen reuses them.

## Context

Review §4 and §8. Five menu implementations; the dismiss logic (Esc, outside press, focus back) eight
times; four dialogs repeating `showModal`/`close`; `packages/ui` emitting classes styled only in
`apps/board/src/styles/board.css`; the popover surface 9+ times in CSS, buttons 4, focus ring 29, pressed
22. A sibling plugin (Journal, Organizer) needs these on day one. Runs in wave 3 beside ARCH_02 and
ARCH_04: touch only your files.

Under nclite's plugin contract (PLAN § The Plugin Contract; `~/ai/nclite/docs/plugins.md` § The view
and its host, § Panes; read only) the board's styles share a page with the app's: nothing of ours may
reach the app, and the app's element rules reach in (it draws every `h2` small and in capitals; it
styles `p`, `button`, `input`, `select` globally). The board opens in a pane beside the chat, about
550 px wide when two plugins are open. The draft asks for every rule under the view's root class; our
names are already namespaced (`vb-` elements and classes, `--vb-` tokens), so propose under `REQUESTS`
that a `vb-`-prefixed selector counts as scoped, and build to that.

## Inputs

- **Files to modify**: as listed for UI_01 in TASK-STATUS File Ownership.
- **Files to reference**: `docs/principles.md` § Component model (core, template, element; pattern.json;
  update in place); `packages/ui/src/tip/close-grace.ts` (D-058); WAI-ARIA menu and dialog patterns.
- **Shared artifacts to reuse**: the module names and CSS front door from ARCH_01.
- **Skills**: `cortex-architecture` (rules 1, 9).

## Steps

1. [ ] **Base pieces** in `packages/ui/src/base/`, framework-free, each with a core and tests: `menu`
   (roles, roving focus, the keys now in `apps/board/src/board/menu-keys.ts` `menuKeydown`), `layer`
   (Esc, outside press, focus return, the close grace where hover opens it), `dialog` (open, close,
   backdrop, focus trap and return).
2. [ ] **CSS recipes** in `packages/ui` behind its CSS front door: button, popover surface, menu, chip,
   kbd, visually-hidden, focus ring, pressed. Tokens only. Decide the popover surface differences
   (review 18) by eye with screenshots, and say which you kept.
3. [ ] **Move every caller onto them**: the 5 menus, the 8 dismiss copies, the 4 dialogs, and the classes
   `packages/ui` emits but the app styles (`vb-menu-item`, `vb-menu-list`, `vb-app-menu`). The app keeps
   only board-specific rules.
4. [ ] **Tokens**: draft `--vb-z-*`, `--vb-control-*`, `--vb-focus-offset` (values from today's
   literals) as a `REQUEST`; tokens are protected. Use them only once the orchestrator confirms the
   maintainer's yes; until then keep today's values.
5. [ ] **Verify**: fail on a colour literal outside `packages/tokens`, and on network or file I/O outside
   its layer (`docs/principles.md` § Dependencies says verify checks both). Tests failing first.
6. [ ] **Styles that live in a host's page**: every rule in `packages/ui` and the board's stylesheets
   names only `vb-`-prefixed elements or classes, or sits under the board's root class; rules on
   `html`, `body` or bare elements live only in the standalone shell's stylesheet. The board sets every
   property it relies on for the elements a host styles globally (`h1`–`h3`, `p`, `button`, `input`,
   `select`, `dialog`). `verify` fails on an unscoped selector (tests failing first).
7. [ ] **Sized by its own width**: layout inside the board responds to the board's width (container
   queries on its root), not the window's (today's three `@media … width` rules).
8. [ ] **A page test under a hostile host**: the board drawn inside a page whose stylesheet restyles
   `h2` (small capitals), `p`, `button` and `input`, and at a 550 px pane: screenshots unchanged from the
   board's own.
9. [ ] Gallery: the base pieces in every state; `pattern.json` for each.

## Validation

- [ ] One implementation each of menu keys, dismiss and dialog open/close (`grep`)
- [ ] `verify` passes the scoping rule; the hostile-host and 550 px screenshots match
- [ ] No screenshot changes except the popover surfaces you unified, each listed and shown
- [ ] `npm test`, `npm run verify`, `npm run check`; menus, dialogs, notes, toolbar, gallery specs on your port; axe passes

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed (two items handed on: the gallery wiring and the tokens, under Requests)
**Completed**: 2026-10-27

### Changes Made
- **Base pieces** (`packages/ui/src/base/`, exported from `#ui`), each a pure core with tests and a
  framework-free browser side that touches nothing at import:
  - menu: `menu-core.ts` `menuStep` (Up/Down wrap, Up with none focused goes to the last, Home, End,
    Esc back, Tab on, extra back keys); `menu.ts` `menuKeydown` (the keys, `{ back, stop }`),
    `openMenu` (keys, press outside, opener's aria-expanded, first enabled row focused, focus back on
    Esc; `key` hook for a row's shortcut), `menuItems`, `firstItem`.
  - layer: `layer-core.ts` `focusBackOn`, `isClick`; `layer.ts` `dismissable({ within, dismiss,
    escape?, clickWithin? })`, capture phase, returns the stop.
  - dialog: `dialog-core.ts` `modalStep`, `onBackdrop`; `dialog.ts` `syncModal`, `backdropClick`,
    `whenShut` over the native modal `<dialog>` (focus trap and return are the browser's).
  - tests: `packages/ui/tests/base-{menu,layer,dialog}.test.ts` (18).
- **Callers moved**: the 5 menus (Move to list `move-menu.ts` and the app card's "Allowed ▾"
  `app-cards.ts` `createAppMenus` on `openMenu`; the toolbar's "⋯" `ToolbarMenu.svelte` on `openMenu`
  with H as its `key` hook; the region settings menu `region-row.ts` on `menuKeydown` + `dismissable`;
  the Stop app menu is the app card's); the 8 dismiss copies (`move-menu`, `app-cards`,
  `selection-pill`, `note-outside` (click only), `ToolbarMenu`, `region-row`, `region-note`,
  `hover-tip`) on `dismissable`; the 4 dialogs (`ConfirmDialog`, `BoardDialog`, `FolderDialog`,
  `ArchivedDialog`) on `syncModal`/`backdropClick`/`whenShut`. `board/menu-keys.ts` is now one line
  passing `menuKeydown` on from `#ui` for `history-flow.ts` (not mine). One implementation each:
  `grep "'ArrowDown'"` finds only `menu-core.ts`, the board's shortcuts (`keys.ts`), the layout row's
  own arrows (`region-row.ts` `onRowKey`) and `history-flow.ts`'s key set; no `document` pointerdown
  dismiss outside `base/layer.ts`; `showModal()` only in `base/dialog.ts` and the image viewer.
- **CSS recipes** behind `#ui/styles.css`, first in it: `base/root.css` (`.vb-board` root: type, ink,
  the `vb-board` container; the scope `[class*='vb-']`: box-sizing, `[hidden]`; the host guard),
  `a11y.css` (focus ring, visually hidden, folding 3 pattern copies), `text.css` (kbd, code),
  `surface.css` (`.vb-surface-pop`, `.vb-surface-panel`), `button.css`, `chip.css`, `menu.css`,
  `dialog.css`. Moved out of `board.css`: buttons, chips, the menu, the dialog, kbd, code, visually
  hidden. The app classes `packages/ui` emitted but the app styled (`vb-menu-item`, `vb-menu-list`,
  `vb-app-menu`) are now styled by ui; `region.css`'s second `.vb-menu-item` keeps only its column
  layout. Focus ring: 29 full declarations to 8 (the base ring and pattern offsets only where 2px does
  not fit; the 8 left: the base's, the standalone page's, three drawn states (`data-look`), the
  card's (3px and its z-index), the grip's and the image's ring on its picture). Pressed:
  the button, chip button and menu row presses are the base's; the pattern controls keep their own
  (17), a state of their pattern.
- **Standalone page sheet** `apps/board/src/styles/shell.css` (`@import`ed first by `board.css`):
  `*`, `[hidden]`, `html`, `body` (now the `vb-board` container), `:focus-visible`, `kbd`, `code` for
  the page itself (the gallery's notes, the chat panel). Every other rule names a vb- class or element.
- **Sized by its own width**: the three `@media (max-width)` rules (`board.css` ×2, `current-folder.css`)
  are `@container vb-board (…)`; body is the container on the standalone page, `.vb-board` in a host.
- **verify** (`scripts/verify-style.mjs`, run by `verify.mjs`; tests `scripts/verify-style.test.mjs`,
  written first and failing): `checkColours` (a colour literal outside `packages/tokens` fails; the
  chat's own palette warns, out of scope per PLAN), `checkIO` (network calls only in `io.ts` and
  `#client`; `node:fs`/`http`/`net`/`child_process` only in the server, bins, agent, MCP and the CLI's
  `node-io.ts`), `checkScope` (every selector in `packages/ui/src/**/*.css` and
  `apps/board/src/styles/*.css` names a vb- class, element or class attribute, except `shell.css` and
  `chat-host.css`; no `@media` by width). The tree passes all three.
- **Hostile host page test** `tests/pages/host-styles.spec.ts`: the board at 1600 and 550px wide and
  every gallery sample's outermost board element, light and dark, pixel-identical before and after a
  host sheet restyles h1-h3 (small capitals), p, button, input, select, textarea and dialog.
- **Gallery** (ready, not wired: see Deviations): `apps/board/src/gallery/base-section.ts`
  `baseSamples` (button, chip, menu rows and a live menu, dialog, key, code, focus) and the base's
  pattern.json, drafted at `temp/ui01/base-pattern.json`. Looked at in light and dark on a scratch page
  (`temp/ui01/probe-{light,dark}.png`); the live menu's keys, Esc back and the press outside driven.

### Verification
- `npm test` 1690 pass (with the base's 18 and verify-style's 8); `npm run check` 0 errors;
  `npm run verify` ok but for `docs/specification/modules.md` (the map, out of date with this wave's
  new exports: orchestrator's `npm run map`; with it regenerated, `verify: ok`).
- Page specs on 4730 (the 27 with screenshots, menus, dialogs, notes, toolbar, focus ring, hover tip,
  selection pill, move and later, app cards, containers, every node, gallery, host-styles): 475 passed,
  no screenshot changed; the two gallery host tests then failed on a 30s timeout only and pass with
  their own (host-styles 6/6); gallery, toolbar, move-and-later, focus-ring, current-folder,
  send-access rerun after the last CSS: 92 passed. axe passes in every spec that runs it.
- Computed styles before and after (board and gallery, light and dark, every focus ring, the open
  menus): no difference but those listed under Issues. Scratch: `temp/ui01/` (the before/after
  builds are removed; `after.sh` needs a before build in `temp/ui01/dist-before` to run again).

### Issues & Resolutions
- **Cascade order.** The recipes moved from `board.css` (before the patterns) to `#ui/styles.css`
  (after `access`, `key-help`, `go-to-card`, `proposals`). A computed-style diff of every element on
  the board and the gallery, light and dark, plus every focusable element's ring and the open menus
  (`temp/ui01/snap.mjs`, `diff.mjs`, `after.sh`; 0 differences run against itself) found the
  collisions, each fixed in its own rule: `.vb-btn.vb-menu-btn` (its `padding: 0` lost to `.vb-btn`),
  `.vb-chip.vb-menu-face:hover` (lost to a chip tone), `.vb-send[data-state='error']:hover` (hover
  would have won), `.vb-stage:focus-visible { outline: none }` (the base ring would have drawn on the
  stage). Final diff: none but `body`'s `container-type`, the Move to list's class names and two inert
  values on its block rows (`align-items`, `gap`); the folder chip's width differs only by the scratch
  servers' random folder names.
- **Node's EventTarget** does not match a bare `true` capture on removal; `dismissable` passes
  `{ capture: true }` (the browser treats both alike).
- **Gallery samples under the host sheet** moved by fractions of a pixel when the gallery's own notes
  restyled; the spec keeps the gallery's `g-` notes out of the host rules (`:where(:not([class^='g-']))`,
  no added weight) and leaves the chat panel's samples out (the chat is the standalone page's).
- **Without the guard** the same host sheet changes 4,932 kinds of (element, property) on the board's
  own elements (`temp/ui01/hgroup.mjs` against the build before this task); with it, none.

### Caught Beyond the Brief
- `vb-image-view`'s dialog opens with `showModal()` itself (its open and close motion); left, named in
  the base's pattern.json `whenNotToUse`.
- `localStorage` is read and written in five places (`flags.ts`, `start-board.ts`, `Toolbar.svelte`,
  `kept.ts`, `gallery/main.ts`); `checkIO` does not cover it (ARCH_03's `settings` is its home).
- `.vb-reply`, `.vb-agents-panel` and `.vb-go` carry the panel and popover surfaces' values by hand
  in the app's sheets; their markup (Svelte files not mine) can take `.vb-surface-panel` /
  `.vb-surface-pop`.
- The narrow toolbar's visually-hidden words (`board.css` `[data-narrow] :is(…)`) repeat the recipe's
  declarations because they hide only when narrow; left.
- The menu keys differed in one edge: Up with no row focused went to the second-last row
  (`menuKeydown`) or the last (`region-row.ts`). The base takes the last (WAI-ARIA).

### Deviations from Plan
- **Files outside the File Ownership row**: `packages/ui/src/index.ts` (seven export lines appended:
  the base is reached by `#ui`), `scripts/verify-style.mjs` + `scripts/verify-style.test.mjs` (new,
  beside `verify.mjs`, so it stays under 300 lines), `tests/pages/host-styles.spec.ts` (new), and
  `apps/board/src/gallery/base-section.ts` (new, not yet imported).
- **Step 9 not wired.** Adding the base to `PATTERNS` (`packages/ui/src/patterns.ts`) and the gallery
  (`gallery/main.ts` `SAMPLES`) adds a section at the top of the full gallery and so changes
  `gallery-{light,dark}.png`: a changed screenshot is the orchestrator's call, and both files are
  outside this row. Ready: move `temp/ui01/base-pattern.json` to `packages/ui/src/base/pattern.json`,
  add `import base from './base/pattern.json' with { type: 'json' };` and `base` to `PATTERNS`, add
  `base: (body) => baseSamples(body),` to `SAMPLES` with its import, and refresh the two baselines.
- **Step 4 tokens**: drafted below, not used (protected).
- **Step 8's pane**: the 550px test is the board in a 550px window; the board inside a 550px pane of
  a wider page needs `mount(root, host)` (ARCH_03).
- `page.ts` (not mine) still lists `board.css` first; `shell.css` comes in through `board.css`'s
  `@import`, so it sits where its rules sat.

### Drafts for the maintainer
- **Tokens** (`packages/tokens/src/tokens.css`; values are today's literals, nothing changes):
  `--vb-z-raised: 1` (top wire layer, link marks), `--vb-z-hover: 2` (a hovered or focused card),
  `--vb-z-drag: 3` (a dragged card, the mode row), `--vb-z-open: 4` (an open frame, popover, tip, card
  menu), `--vb-z-chrome: 5` (toolbar, strips, banner, Go to card), `--vb-z-panel: 6` (reply panel),
  `--vb-z-chrome-open: 7` (toolbar with a menu open), `--vb-z-skip: 10`, `--vb-z-toast: 20`, and on the
  stage `--vb-z-lasso: 27`, `--vb-z-selection: 28`, `--vb-z-menu: 29`, `--vb-z-bubble: 30`;
  `--vb-control-h: 32px` (button, select, menu row, icon button), `--vb-control-h-small: 26px` (small
  button, the access note), `--vb-control-target: 24px` (the smallest target: chip, grip, link mark),
  with 22px and 28px left as they are until a third use says what they are; `--vb-focus-offset: 2px`,
  `--vb-focus-offset-tight: 1px`, `--vb-focus-offset-inset: -2px`, `--vb-focus-offset-card: 3px`.
  Recommendation: yes; then the base and the patterns read them in one pass (no picture change).
- **For nclite's contract** (PLAN § The Plugin Contract): a selector that names a `vb-` class, a `vb-`
  element or `[class*='vb-']` counts as scoped; the board's root class is `vb-board`, which is also
  its container (`@container vb-board`); the board guards the elements a host styles globally at
  specificity 0,0,2 (`:is(h1, h2, h3, p, button, input, select, textarea, dialog)` inside its scope:
  `all: revert`), so a host's element rules do not reach in and the host's own classes still can.
- **Popover surfaces (review 18), decided by eye** (`temp/ui01/surface-*.png`): unified the ones that
  were already alike (menus, settings menu, size pill, note preview: raised, strong line, md radius;
  dialogs: raised, quiet line, lg radius), no picture changed. Kept apart on purpose: the layout
  popover (card surface, quiet line, lg radius: it holds bordered tiles, a strong line would compete),
  the hover tip (contrast line: one line of words over anything, cards included), the note bubble (its
  edge in its state's colour). Recommendation: keep.

### Screens to check by eye (light and dark)
- The toolbar's "⋯" menu open (rows, tick, H key), the Move to list (Shift+M on a selection), a
  container's settings menu (cog), an app card's "Allowed ▾" menu.
- New board / Rename, Open folder…, Archived (N)…, and a confirm (Remove access, Accept all): open,
  Esc, Cancel, a click on the backdrop; focus back where it came from.
- A hover tip and the container note preview: hover away (the grace), Esc, a tap then a press outside.
- The note bubble read-only: a click outside closes it, a pan does not.
- The selection pill: a press outside closes it.
- The toolbar at 1200, 1000 and 768px wide (the container queries).

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-ui] UI_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/UI_01_shared-ui-base.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
