---
skills: [cortex-architecture]
---
# T_02_switch-on: Switch On

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

After the maintainer's yes: remove the flag `boardFiles` and its guards, tests, words and docs, so nothing points at
it. Port 8810. Full gates after.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Completed

- Removed the flag from `packages/format/src/flags.ts` (definition and its words) and its test in `flags.test.ts`. Guards gone in `controller.ts` (`createBoardFiles` always built; `files` always passed), `chrome.svelte.ts` (`files` from the host's hooks alone: a host without a hook hides that item), `BoardChrome.svelte` (files dialog always mounted), `board-types.ts` (`files` no longer null), `gallery/main.ts` (files section always drawn). Comments, `files-section.ts` words, `api.md` 200 and header, `plugin.md` rows cleaned.
- The gallery section's `data-feature` is now `exportImportPrint`. The agent refusal word `words.boardFiles` (a different thing: the board's own files) is renamed `boardOwnFiles` in `packages/agent`, so grep finds the flag name only in task files and the LOG.
- Specs: `board-files.spec.ts` lost its flag-off cases and `?flags=` queries; `toolbar.spec.ts` "⋯" row list now has Print…, Export…, Import…; `read-only`, `header-tiers`, `ledgers`, `read-only-controls` specs exclude the new last gallery section from their "last section" rule.
- Baselines: new only, `gallery-exportImportPrint-{dark,light}-darwin.png`; none renewed.
- Verified: `npm test` 2777 pass; `npm run check` 0 errors; `npm run verify` ok (47 warnings, none new from this change); page specs board-files, toolbar, gallery, read-only, header-tiers, ledgers, read-only-controls, board-chrome, open-folder, current-folder, picker-archive all pass (port 8810). Full page suite left to the orchestrator.
