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

### Run 1 (2026-11-05, worktree `.claude/worktrees/md-01`, branch `feat/md-01`, `VB_TEST_PORT` 7200)

**Changes Made**
- `packages/ui/src/markdown/table.ts` (new): `splitRow`, `delimiterRow`, `headerFits`, `tableHtml`, `MAX_COLUMNS` (4).
- `packages/ui/src/markdown/line-starts.ts` (new): `atx` (moved out of `blocks.ts`, unchanged) and `thematicBreak`; moved to keep `blocks.ts` under 300 lines.
- `blocks.ts`: `parseBlocks(src, more)`; with `more`, block types `hr` and `table`; `tableStart` (GFM: a delimiter row under an open paragraph whose last line has the same number of cells; the lines before stay a paragraph). Tables are tried last, as in cmark-gfm, so `---` is a break and `- | -` a list item.
- `render.ts`: `MarkdownOptions.more` (default `flagOn('markdownMore')`); `heading`: `vb-md-h1` / `vb-md-h2` / `vb-md-label`, same `role` and `aria-level` as before; `<hr class="vb-md-rule">`; `tableHtml`.
- `markdown.css`: h1/h2 sizes are `--vb-md-text` plus one or two type-scale steps (xl−md, lg−md), so 18/15 px on a card and 20/17 px in a popover; no new token. Rule in `--vb-line-strong`. Table: `width: 100%`, `table-layout: fixed`, cells `overflow-wrap: anywhere`, padding `--vb-space-1`, header on `--vb-surface-sunken`.
- `pattern.json`: states, subset (headings, tables, breaks), classes, files.
- `packages/layout/src/size.ts`: `measureBody` reports `table`; `autoTier(body, tables = flagOn('markdownMore'))` makes a card with a table L; `sizeTier(node, personSize, tables?)`; `TABLE_COLUMNS` (4), held equal to `MAX_COLUMNS` by the page spec's agreement test.
- Gallery `markdown-section.ts`: a markdownMore group (heading sizes; a table at L; a table with long words at S; breaks; five columns staying text), drawn with `?flags=` honoured for its own cards.
- `docs/specification/components.md`: § Markdown (the new list, each claim with symbol and test) and § Node size (a table makes the auto tier L).

**Verification** (tier: normal)
- Unit: `packages/ui/tests/*.test.ts` and `packages/layout/tests/*.test.ts`, 431 pass. New: `markdown-more.test.ts` (sizes, breaks, setext-free `---`, tables, 4 vs 5 columns, flag off as D-023, GFM examples 198-205). CommonMark: the Thematic breaks section added; #77, #234 and #246 now pass (removed from `EXCLUDED`); #48 (indented) and #59 (setext) added. Adversarial: 11 table and break inputs; timing test passes under 50 ms.
- Layout `size.test.ts`: table → L, 5 columns, flag off, list-item delimiter, heading header, code fence.
- `npm run check` 0 errors; `npm run build`, then `npm run verify` ok (no warning on my files).
- Page: new `tests/pages/markdown-more.spec.ts`, 7 pass (sizes differ and scale with `--vb-md-text`; a 4-column table with long words has no overflow at L and S; the break draws; Lc ≥ 60 for h1, h2, th, td; axe; screenshots `markdown-more-{dark,light}`; flag off; the renderer and `measureBody` agree on 15 inputs). Also run: `gallery.spec.ts`, `size.spec.ts`, `popover-thread.spec.ts`, `note-polish.spec.ts`. They fail only on screenshots of sections below Markdown in the gallery (see Caught Beyond the Brief).
- Browser: gallery at 1400 px, light and dark; a seeded board at 1400, 900 and 600 px, light and dark. No sideways scroll and no overflowing cell; a chat-like container sized to its content keeps the table at full width.

**Caught Beyond the Brief**
- `overflow-wrap: anywhere` with the automatic table layout broke short words ("Pri ce", "Sea ts", "Unli mited") as soon as one cell held a sentence: breaking anywhere shrinks every column's narrowest width to one character, so the long column takes almost all the width. Switched to `table-layout: fixed` (equal columns; still the table "that never overflows"). A cell size container was ruled out: an agent's chat message (`chat-message[data-from='agent']`, `align-self: flex-start`) sizes to its content and would collapse it.
- Gallery fixture card 61 ("Plain text outside the subset", `packages/format/fixtures/gallery.ledger.jsonl`) holds `| a | b |\n|---|---|`, which is now a table. That changes `gallery.spec.ts`'s `markdown-{dark,light}` screenshots. The taller Markdown section also moves every section below it by a fraction of a pixel, so `gallery-node-*` (each-section test) and `size.spec.ts` `node-size-*` differ by anti-aliasing. All passed on the base with my changes stashed. Not mine to re-take: REQUESTS.
- `?flags=-markdownMore` reaches only what passes `more`: the page's `pageMarkdown` (`apps/board/src/flags.ts`), the host's `markdownOf` (`apps/board/src/board/host.ts`) and `tierOf` (`apps/board/src/board/cards/size.ts`) don't pass it yet, so on the board the flag stays at its default (on). Unit tests prove `more: false` is D-023 exactly. REQUESTS.
- At S, a 4-column table still breaks words longer than about seven letters: a quarter of 246 px holds no more.

**Deviations**: none from the PLAN. `role="heading"` and `aria-level` kept as before: all three sizes use the caller's level (the brief says "as today").

### Run 2 (2026-11-05, granted requests MD_01-R1, R2, R4)
Wired the flag through the page and the host: `apps/board/src/flags.ts` `pageMarkdown` now passes `more` (R1), and `apps/board/src/board/host.ts` `markdownOf` passes `more: flagOf(host, 'markdownMore')` (R2, one line). Gallery fixture card 61 now shows a 5-column table, which stays text (R4). The gallery section now uses `pageMarkdown()` as it is. New board test in `markdown-more.spec.ts`: with the flag on, a drawn card shows the large heading, the table and the line; with `?flags=-markdownMore` it shows the label and the plain text. Results: `npm run check` 0 errors; the spec, 8 pass; the format, actions heads and gallery-fixture unit tests, 147 pass. R3 (tierOf) went to FE_01; the screenshots to VERIFY_01.


## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] MD_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/MD_01_markdown-more.md]]`, ending in a
newline; the return block.
