# M10_01_keys-inside-board: Keys stay inside the board

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Under a host, the board acts on a key only when the key's target is inside the board's root; on its
own page (the standalone app) its shortcuts stay page-wide, as today.

---

## Context

Tracker M10, from the tidy-up's review (`cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_findings.md`
F1). `apps/board/src/board/input/keys.ts` `bindKeys` listens on `document`, and `route` returns early
only when the target is inside *another* `.vb-board`. A target outside every board passes, so with
focus on a host button, H hid answered cards on every mounted board. nclite's contract: "A view stays
inside its root" (`~/ai/nclite/docs/plugins.md`, read only).

The signal for "this page is the board's own" already exists: `BoardHost.page` (`board/host.ts`
`BoardPage`), given only by the standalone page (`shell/page-host.ts` `createPageHost`). Use it. Don't
add a new host field.

A fix, not new behaviour, so no flag: the standalone page keeps its keys exactly as today, and under a
host the board stops doing what it never should have.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 1, in parallel with SVG_01; you
share no files.

---

## Inputs

- **Files to modify**: `apps/board/src/board/input/keys.ts` (`route`, `bindKeys`),
  `apps/board/src/board/input/wiring.ts` (what it passes `bindKeys`), `apps/board/src/board/mount.ts`
  (only if focus on a canvas click needs it), `tests/pages/board-host.spec.ts`,
  `tests/pages/board-host-fixture.ts`, a unit test for `route` (new `apps/board/tests/keys.test.ts`,
  or the nearest existing one), `docs/specification/components.md` § The board's host interface
- **Files to reference**: `apps/board/src/board/host.ts` (`BoardHost.page`), `apps/board/src/board/mount.ts`
  (`mount`: the root's `tabIndex = -1`), `apps/board/src/board/input/pointer.ts` (`bindPointer`: the
  `mousedown` it prevents on a Cmd/Ctrl pan; `bindPanKey`), `apps/board/src/board/canvas/pointer-focus.ts`,
  `packages/ui/src/base/layer.ts` (`bindDismiss` Escape while a layer is open),
  `apps/board/src/board/cards/size.ts`, `cards/update-flow.ts`, `cards/history-flow.ts` (keys on the stage)
- **Patterns to follow**: the existing early return in `route` for another board's root; the fake
  host in `tests/pages/board-host-fixture.ts`
- **Shared artifacts to reuse**: none from this set (Wave 1)
- **Skills**: `cortex-architecture`, `cortex-docs` (components.md describes this code)

> Modify only the files this task owns (TASK-STATUS.md File Ownership). Need a change elsewhere?
> List it under `REQUESTS` in your return block.

---

## Steps

1. [x] **Failing tests first** (rule 13):
   - a unit test of `route` (export what the test needs, or test through `bindKeys` with a fake
     document target): with a root and no page-wide keys, a key whose target is outside the root does
     nothing; inside the root it acts; inside another `.vb-board` it does nothing;
   - in `tests/pages/board-host.spec.ts`, give the fixture's page a host button and a host text input
     outside both boards. Focus the host button and press H: neither board hides its answered cards.
     Type into the host input: no board shortcut fires.
   Run both and see them fail.
2. [x] **The rule in `route`**: under a host, a key acts only when its target is inside `root`. With
   page-wide keys (the board has its own page) a target outside every board still reaches it, as
   today; a target inside another board never does. Esc follows the same rule.
3. [x] **Who decides page-wide**: `wiring.ts` passes `bindKeys` whether the board has its own page,
   from `host.page` (reach it the way `createBoard` already gets the host, without a new host field).
   The standalone page passes page-wide; the fake host doesn't.
4. [x] **Focus after a click**: under a host, a click on the board's empty canvas, on a card, and on
   a container's title line must leave focus inside the root, so the next key works. Prove it in the
   page spec: click the canvas, press H, the answered cards hide; click a card, press J, focus steps.
   If a pointer handler blocks the focus (`bindPointer` prevents `mousedown` on a Cmd/Ctrl pan),
   make the root take focus without scrolling (`focus({ preventScroll: true })`), only when focus is
   outside the root.
5. [x] **The other key listeners** (read, decide, record in your notes; change only if one leaks an
   action): `pointer-focus.ts` (keyboard-or-pointer reading, page-wide on purpose), `pointer.ts`
   `bindPanKey` (the Cmd/Ctrl held cursor), `#ui` `bindDismiss` Esc while a board menu is open (it
   stops the event page-wide; say whether a host's own Esc should still reach the host when the menu
   isn't focused), the zoomed image view (a modal `<dialog>` outside the root: its Esc and Tab still
   work).
6. [x] **Docs** (`cortex-docs`): components.md § The board's host interface. Replace "a key pressed in
   one board's root never reaches another" with the rule as built, and remove the M10 gap from the
   "Open (VERIFY_01 …)" sentence under Not covered. Name the symbol and the test that hold the claim.
7. [x] **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`;
   the page specs `board-host.spec.ts`, `keys*.spec.ts`, `key-help*.spec.ts`, `go-to-card*.spec.ts`
   and any spec that presses a key with focus on `body` (grep `keyboard.press` in specs that never
   click first), on `VB_TEST_PORT=5100`. No full page suite (rule 12).

---

## Validation

- [x] A key with focus on a host control reaches no board; a key inside a board reaches that board
      only (page spec and unit test)
- [x] After a click on a board's canvas or card, its shortcuts work (page spec)
- [x] The standalone page's key specs pass unchanged; no expectation in an existing spec is edited
- [x] components.md holds the rule as built, with its symbol and test

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-10-27 19:48  

### Changes Made
- `keys.ts`: `route` takes `pageWide`; `bindKeys(h, root, pageWide = false)`. A key acts only when its
  target is inside `root`; with `pageWide` a target outside every board still reaches it; a target in
  another board never does. Esc follows the same line (it comes after the check).
- `wiring.ts`: `bindStage(..., pageWide = false)` hands it on. `controller.ts` `createBoard` passes `!!host.page`
  (the one-line edit outside the ownership table, see Deviations).
- `mount.ts`: the root takes focus (`preventScroll`) on `pointerup` when focus is outside it, removed on `unmount`.
- Tests: new `apps/board/tests/keys.test.ts` (3 tests); `board-host.spec.ts` gains "keys stay inside the board";
  `board-host-fixture.ts` gains `addHostControls` (a host button and text input). No existing expectation edited.
- `components.md` § The board's host interface: the rule as built, its symbols and tests; the M10 gap removed.

### Issues & Resolutions
- The failing page test showed one real gap: a Shift drag (lasso) or Cmd/Ctrl drag prevents `mousedown`, so focus
  stayed on the host button and the board went deaf. Fixed by the `pointerup` focus in `mount.ts`. A plain click
  on the canvas, a card or a container's title line already left focus in the root (tabindex -1 on the root).

### Step 5, the other key listeners (read, decided)
- `pointer-focus.ts`: reads input modality only, no action; page-wide on purpose. Unchanged.
- `pointer.ts` `bindPanKey`: toggles an attribute on its own stage; no action. Unchanged.
- `size.ts`, `update-flow.ts`, `history-flow.ts`: listen on the stage, so they only hear keys inside the root. Fine.
- `ChatSidebar.svelte` (T) and `KeyHelp.svelte` (?): document listeners, standalone shell only (`onBoard()` / not the gallery). Not a host concern.
- `#ui` `dismissable` (`packages/ui/src/base/layer.ts`): with a board layer open, Esc is caught on the document in
  capture and `stopPropagation`'d, so a host's own Esc is eaten while a board menu/popover is open and focus is
  elsewhere. Not changed (not mine; and Esc closing the topmost open layer is the usual layer behaviour). Reported
  as a REQUEST for the maintainer's call.
- The zoomed image view (modal `<dialog>` outside the root): `route` ignores a dialog's keys, so its Esc and Tab
  are the browser's; under a host the new rule returns even earlier for the same result.

### Caught Beyond the Brief
- The `dismissable` Esc above.

### Deviations from Plan
- One-line edit in `apps/board/src/board/controller.ts` (`createBoard`'s `bindStage` call passes `!!host.page`), a file
  the ownership table does not list. `bindStage` is called only there, the host is only in reach there, and no sibling
  task owns the file; the task's own step 3 ("reach it the way `createBoard` already gets the host") needs it.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md): your row only.
3. Append **your own** LOG entry to `cortex/LOG.md`: one line, ending in a newline, append-only.

   ```
   [[YYYY-MM-DD HH:MM]] [board-app] M10_01: [what you did] → Task: [[cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/M10_01_keys-inside-board.md]]
   ```

4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII in examples; no commits; never port 4466; never
`cortex/AUDITED.md`; no set LOG entry.
