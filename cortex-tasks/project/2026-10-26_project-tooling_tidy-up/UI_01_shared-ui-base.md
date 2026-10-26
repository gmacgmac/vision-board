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

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-ui] UI_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/UI_01_shared-ui-base.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
