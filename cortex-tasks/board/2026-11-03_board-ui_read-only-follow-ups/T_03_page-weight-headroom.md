# T_03_page-weight-headroom: The board page back under its budget

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The board page is back under 200 KB gzip (`docs/specification/performance.md`, `scripts/verify.mjs` `PAGE`) with real
headroom (aim: 195 KB or under), without raising the budget and with no change a person sees.

## Context

`npm run verify` fails: 200.6 KB after wave 2 (200.0 at its base; `ledgers/done` and `ro-follow-ups/wave-1` passed).
The ledgers, read-only and follow-up work all added page code and flag descriptions (`packages/format/src/flags.ts`
ships in the page). D-049 keeps code reached only by `import()` out of the count (the chat panel's drawing,
`shell/chat-view.ts`, is the model).

## Inputs

- **Files to modify**: what the measurement points to, within your ownership (TASK-STATUS File Ownership, wave 3);
  `packages/format/src/flags.ts` is granted to you this wave (descriptions may leave the page if only the gallery and
  docs read them: check every reader); `docs/specification/performance.md` (what moved, the new figure)
- **Reuse**: the `import()` split of `shell/chat-view.ts`; the build's own output for what weighs what
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Measure what the start bundle holds, biggest first (the build's chunk report, a byte count per module); name the
   candidates and their gzip weight.
2. Move what the page does not need at start behind `import()` (dialogs opened on a press, gallery-only text,
   read-only or ledger menus), or out of the page when no page code reads it. No behaviour or look change.
3. The page specs of whatever moved (a dialog loaded late still opens on the first press, focus and all), and the
   `verify` figure before and after.

## Validation

- [x] `npm run verify` passes, figure noted; specs of moved parts green; `check`; unit tests of what changed

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. The budget itself is not changed.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Completed (2026-11-03)

### Changes Made
- Measured (step 1): the start is `index` (21.4 KB gzip) + the shared `chat-rules` chunk (158.7 JS, 20.5 CSS) = 200.6 KB.
  Per module (each gzipped alone, so a ranking, not a sum): `packages/format/src/flags.ts` 9.2 KB, the biggest single
  module, nearly all of it the 61 flags' `description` sentences; then `board/controller.ts` 5.0, `chrome/Toolbar.svelte`
  4.5, svelte's `batch.js` 4.2, `ledger-shape.ts` 3.7, `markdown/inline.ts` 3.3, `conditions.ts` 3.3, `AccessRequests.svelte`
  3.2, `shell/chat-panel.ts` 3.1, `FolderPicker.svelte` 2.9.
- Readers of a flag's description (every one checked): `packages/format/tests/flags.test.ts`, `images-svg.test.ts`, and
  people reading the source. No page code, no gallery code, no doc test reads one (the gallery reads `flagOn`/`isFlag` only).
- Moved (step 2): `packages/format/src/flags.ts` `FLAGS` holds `{ default }` only; the sentences are a second table in the
  same file, `FLAG_DESCRIPTIONS` (`satisfies Record<FlagName, string>`, so a name missing from either table fails `check`).
  Nothing in the page imports it, so the build drops it. `FlagDef` loses `description`. Same file on purpose:
  `scripts/words-homes.mjs` `DEVELOPER_TEXT` and `words.md` § Developer text name `flags.ts` as the home of these sentences
  (a separate `flag-descriptions.ts` failed `words.test.mjs`, and both files are outside this task's ownership).
- `packages/format/tests/flags.test.ts`: every flag has a description and no description an unknown name; new test: `FLAGS`
  entries carry only `default`, and no page file (`apps/board/src` but the gallery, `packages/*/src` but `flags.ts`) names
  `FLAG_DESCRIPTIONS` (a planted name in `apps/board/src/board/` failed it, then removed). `images-svg.test.ts` reads
  `FLAG_DESCRIPTIONS.svgImages`.
- `docs/specification/performance.md` § Budgets: "What the page leaves out of its start weight" (the two ways, the test
  that holds the flags one, the figure).
- Figure: **200.6 → 192.3 KB gzip** (`npm run build`, then `npm run verify`: ok). The built page is byte-identical in
  behaviour: no page code read the sentences.

### Verification
- `npm run verify` ok (warnings unchanged but for `flags.ts` 352 → 361 lines, already over 300); `npm run check` 0 errors;
  `gen -- --check` current; `map` no change; unit suite (`packages`, `apps`, `scripts`, `skills`, `tests/plugin`,
  `tests/evals`) 2367/0.
- Page specs (`VB_TEST_PORT=6800`, 3 workers, chromium): `board.spec.ts` (matched `new-board.spec.ts` too) and
  `flag-retire.spec.ts`, 51/51, screenshots and axe in light and dark included. Nothing moved behind `import()`, so no
  late-loaded dialog to test; no look change (screenshots match), so no browser look was needed beyond them.

### Caught Beyond the Brief
- `docs/specification/components.md` § Feature flags says `FLAGS` is name → `{ default, description }` and adding a flag is
  one entry: now two entries in the same file (request).
- `words.md` § Developer text and `scripts/words-homes.mjs` say the descriptions are read "in the gallery's flag list": no
  gallery code reads them (stale before this task; request).
- Next candidates if the page needs room again (start weight, opened on a press): `shell/FolderPicker.svelte` 2.9,
  `chrome/BoardDialog.svelte` 1.8, `chrome/GoToCard.svelte` 1.8, `shell/LedgerForm.svelte` 1.5, `chrome/KeyHelp.svelte` 1.5,
  `shell/pdf-pages.ts` 2.0 (in `index`, the PDF viewer), `chrome/AccessRequests.svelte` 3.2 (only with requests waiting).
  Not moved: 192.3 KB already gives the 195 KB aim, and each would need a first-press focus spec.

### Deviations from Plan
- None. (Step 2's `import()` route not needed: the weight left the page altogether.)

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[project-tooling] T_03: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_03_page-weight-headroom.md]]`,
ending in a newline; the return block.
