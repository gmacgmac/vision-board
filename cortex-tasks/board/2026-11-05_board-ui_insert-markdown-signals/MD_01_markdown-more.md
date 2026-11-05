# MD_01_markdown-more: Heading sizes, tables and breaks

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Flag**: `markdownMore`

## Objective

Cards, notes and replies render `#` large, `##` medium, `###`-`######` as today's small label; GFM tables of
up to 4 columns that wrap and never scroll; and `---`/`***`/`___` as a horizontal line (PLAN Decisions 7-9).

## Context

D-023's renderer is our own, a fixed subset, tested with CommonMark's examples. Headings parse at every level
(`blocks.ts` `atx`) but all draw as one label (`render.ts`, `case 'head'`, `vb-md-label`). Tables, thematic
breaks and setext headings are not recognised (`blocks.ts` header comment). Cards size by tier
(`packages/layout/src/size.ts` `measureBody`; fenced code already pushes a card up).

## Inputs

- `packages/ui/src/markdown/{blocks,inline,render}.ts`, `markdown.css`, `pattern.json`; tests
  `packages/ui/tests/markdown-{commonmark,render,safety}.test.ts`, `markdown-adversarial.ts`, `markdown.timing.ts`
- GFM spec examples for tables (and CommonMark's for thematic breaks), as the existing tests use CommonMark's
- `packages/layout/src/size.ts`; gallery `apps/board/src/gallery/markdown-section.ts`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Failing tests first, from the specs' examples for what we support; a 5-column table stays text; `---` under a
   paragraph line is a break, not a heading; adversarial table input stays linear (the safety test).
2. Headings: three sizes by source level, from tokens only (type scale tokens; none new). Keep `role="heading"`
   and `aria-level` as today. Size steps fit a card, a note and a popover (`--vb-md-text` scales them).
3. Tables: real `<table>` with `<th>`; alignment from the delimiter row; inline Markdown in cells; cells wrap,
   long words break (`overflow-wrap: anywhere`), the table is the card's width, `table-layout` that never
   overflows. `measureBody` counts a table: the card is `l`.
4. Breaks: one quiet rule from the line tokens.
5. Gallery section: every new construct in light and dark; APCA for heading and cell text (Lc 60 reading tier);
   axe. New page spec `tests/pages/markdown-more.spec.ts`: the three heading sizes differ, a 4-column table with
   long words has no horizontal overflow at the card's widest and narrowest tier, the break draws.
6. `docs/specification/components.md` § Markdown: the new list.

## Validation

- [ ] Markdown unit suites (CommonMark, render, safety, timing) green; layout tests; `check`; `npm test`; the new
      spec and `tests/pages/markdown*.spec.ts` in light and dark; a look at 1400, 900, 600 px; flag off = as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind your flag (PLAN Decision 12), on by default; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] MD_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/MD_01_markdown-more.md]]`, ending in a
newline; the return block.
