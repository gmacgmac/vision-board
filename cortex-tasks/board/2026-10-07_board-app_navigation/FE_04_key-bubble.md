# FE_04_key-bubble: Key commands bubble

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 4) ·
> **Tracker**: N20 · **Model**: Sonnet 5.5

## Objective

The key help along the bottom becomes a small "?" bubble in the bottom-left corner that lists
every command on hover or focus.

## Rulings (do not reopen)

1. The list is generated from the one command table (`commands.ts` `COMMANDS` keys) and the
   action registry (`packages/actions/src/registry.ts` `ACTIONS` keys), never hand-written; the
   hard-coded `.vb-help` markup in `App.svelte` goes. A test fails if a command or action with a
   key is missing from the list.
2. A round "?" button, bottom left (the bar's place), using `bindHoverTip`
   (`packages/ui/src/tip/hover-tip.ts`): hover or focus shows the list, Esc closes, it stays while
   the pointer is on it (WCAG 1.4.13). Grouped: Items, Selection, Board, View.
3. Keyboard: `?` (Shift+/) opens it too.

## Steps

1. [x] Failing tests first: unit (every keyed command and action appears once); page (hover and
   focus show it, Esc closes, axe both themes).
2. [x] Generator, component, styles from tokens; remove the old bar.

## Validation

- [x] The five gates exit 0; looked at in a browser, dark and light.

## Implementation Notes

**Status**: Completed

- `apps/board/src/board/key-help.ts` `keyGroups()`: Items = every registry action with a key and
  `onItem`; Selection / Board / View = the commands `GROUP_OF` assigns (a `Record<CommandId, ...>`, so
  a new command without a group fails the type check). Only inputs neither table owns (J/K, Space,
  Alt+arrows, H, pointer gestures) sit in `OTHER`. `keyText` is now exported from `commands.ts`.
- `shell/KeyHelp.svelte` + `styles/key-help.css`: round 32px "?" bottom left, `bindHoverTip` (anchor
  button, tip `.vb-keys-tip`, attr `data-keys-open`); `?` (Shift+/) handled by the component's own
  document listener (skips text fields and dialogs; toggles), so `controller.ts` and `keys.ts` are
  untouched (`controller.ts` still 300). The list is a two-column box above the button; the list scrolls
  inside on a short window. The old `.vb-help` markup and CSS are gone.
- `bindHoverTip` (and its types) exported from `packages/ui/src/index.ts` (the front door; verify
  refuses back-door imports).
- Flag `keyBubble` (rule 12), on by default; off, the board shows no key help at all (the ruling
  removes the old markup, so there is no "old bar" to fall back to). Gallery section "Key commands"
  (`gallery/key-help-section.ts`), shown with the flag on.
- Tests: `apps/board/tests/key-help.test.ts` (every keyed command and action listed once, groups in
  order); `tests/pages/key-bubble.spec.ts` (placement, hover and the list staying open, focus, Esc, `?`,
  `?` in a text field, flag off, axe shut and open in both themes, gallery section). New baselines
  `key-bubble.spec.ts/*`; `board-*.png` updated (the bar's strip became the bubble: diff viewed, only the
  bottom-left strip changed); the gallery full-page screenshot now also uses `-keyBubble`.
- All five gates exit 0 (`npm test` 647 pass; `test:pages` 175 passed; `check`, `verify`,
  `gen -- --check`). Looked at on the board and in the gallery, dark and light.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_04: …`).
