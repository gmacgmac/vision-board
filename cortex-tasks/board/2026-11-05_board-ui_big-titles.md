---
model: strong
skills: [cortex-architecture, cortex-docs]
persona: Editorial designer — a card has one headline; structure underneath steps down from it, never past it.
---

# Big titles on structured cards (point 437)

> **Created**: 2026-11-05 · **From**: maintainer, point 437 · **Flag**: `bigTitles`

## Problem

A card body's `#` (D-086: large, 18px on a card) is bigger than the card's own title (15px), so a summary card
reads as if its title were a sub-heading. A test (8 runs, Sonnet and Opus, SKILL v3.30): bots treat the title as the
card's heading and start the body at `##`; none wrote `#`. The maintainer liked the big presentable heading.

## Decision (maintainer, 437)

The title stays the card's one heading. A card whose body has structure (a `#`/`##` heading or a table) shows its
title large, at today's `#` size; in a body, `#` then draws at the `##` size (medium), `##` medium too, `###` the
small label as today. Other cards are unchanged. Behind a new flag `bigTitles` (on) in
`packages/format/src/flags.ts` + `FLAG_DESCRIPTIONS`; off = today.

## Steps

1. Failing page test first (new `tests/pages/big-titles.spec.ts`): a structured card's title is larger than any of
   its body headings and equals today's `#` size; a plain card's title is unchanged; flag off = today; light and
   dark, APCA (Lc 60) and axe.
2. The mark: the card knows its body has structure (the renderer or `measureBody` in `packages/layout/src/size.ts`
   already sees headings and tables: reuse it, don't re-parse), e.g. `data-structured` on `vb-node`; CSS in
   `packages/ui/src/node/node.css` (title) and `packages/ui/src/markdown/markdown.css` (`.vb-md-h1` steps down under
   it), tokens only. The title's wrap, the card's size tier and the header's height must still fit.
3. Gallery: the Markdown section shows a structured card (title + `##` + table) and a plain card side by side.
4. Screenshots for the maintainer, in context: on a scratch board you draw through the API (own server, port 8200,
   scratch home and project folders), a busy board of several containers: plain questions and findings, a few
   cards with notes and replies, and one summary card titled "Vision Board now: what, where, next" whose body is
   the text of `/private/tmp/claude-501/-Users-dev-Dropbox--Personal--Developer-web-apps-vision-board/9804d243-de16-4d0a-9d36-efd821f0c0b5/scratchpad/card-435.md`
   but with its first line changed to `## Vision Board, November 2026` (a bot's way). Take the same view with the
   flag on and off (`?flags=-bigTitles`), light and dark, at 1400 px: whole board and a close crop of the summary
   card. Save to the worktree's `temp/big-titles/`, list absolute paths.
5. `docs/specification/components.md` (Markdown and node title passages); SKILL.md is not yours: if its Body line
   needs a word, put it under REQUESTS.

## Constraints

Worktree `.claude/worktrees/big-titles` (branch `feat/big-titles`, from main), `VB_TEST_PORT` 8200. Never port 4466,
the repo's own `.visionboard/`, or `node_modules`. No git commits. No PII. Writes >50 lines in chunks. Time limit on
every run, `nice -n 15`, `VB_TEST_WORKERS=3`, full spec paths. `npm run build` once before page tests.

## Implementation Notes

**Done (2026-11-05, worktree `feat/big-titles`, not committed).**

- **Flag**: `bigTitles` (on) in `packages/format/src/flags.ts` `FLAGS` + `FLAG_DESCRIPTIONS`.
- **The mark**: no `data-structured` attribute and no parse. The CSS reads the renderer's own output with
  `:has()` (precedent: `node.css` already uses `:has` on `vb-node`): `node.css`
  `[data-big-titles] vb-node .vb-node-content:has(> .vb-node-body :is(.vb-md-h1, .vb-md-h2, .vb-md-table)) > .vb-node-title`
  takes `--vb-text-xl` (today's `#` on a card). `markdown.css` now sizes `#`/`##` through a local
  `--vb-md-step` (xl / lg), and the step-down rule sets `#` to the `##` step inside such a body. It follows a
  redraw for free and works on both render paths. `measureBody` was not touched (it sees tables, not headings).
- **Flag wiring**: `apps/board/src/board/controller.ts` flag-attribute list gains `['data-big-titles', 'bigTitles']`;
  the gallery's `main.ts` toggles the same attribute.
- **Fit**: title wraps inside its card (tested: no horizontal overflow); card height is measured from the DOM,
  so the tier and layout absorb the extra ~4 px; the tier rule is unchanged.
- **Gallery (deviation from step 3, reported)**: the samples first went into the Markdown section; the full page
  suite then failed 70 gallery screenshots (every section below moved by ~1 px). Following the gallery's own rule
  ("last of all, so no section moves", `main.ts`), they are a section of their own, `big-titles-section.ts`,
  appended last (structured card: title + `##` + table + `###`; plain card beside it). `markdown-section.ts`
  exports `moreCard`/`MoreSample` for it.
- **Tests**: new `tests/pages/big-titles.spec.ts` (board: structured `#`+`##`+table, table-only, `###`-only and
  plain cards; title = today's `#`, larger than every body heading, `#` = `##`; flag off = today; gallery samples;
  Lc ≥ 60 and axe in light and dark; new screenshots `big-titles-{light,dark}`). `markdown-more.spec.ts`: the
  renderer-size test now opens the gallery with `-bigTitles` (its "Heading sizes" sample is itself structured);
  its two group screenshots re-baselined (structured samples' titles larger, `#` medium).
  Written with the implementation rather than strictly before it (the maintainer was waiting on screenshots).
- **Docs**: `docs/specification/components.md` § Markdown, a "Big titles" passage; `packages/ui/src/markdown/pattern.json` `headings`.
- **Screenshots** (scratch server on 8205, HOME and project under the worktree's `temp/big-titles/`, board drawn
  by `temp/big-titles/draw.mjs`, shot by `temp/big-titles/shoot.mjs`): `temp/big-titles/board-{on,off}-{light,dark}.png`
  (whole board, 1400 px, 2x) and `summary-{on,off}-{light,dark}.png` (close crop, card zoomed with Z).

- **Last-section tests**: `header-tiers`, `ledgers`, `read-only`, `read-only-controls` specs assert their gallery
  section is last except `updateSignals`; each now also excepts `bigTitles` (the same edit updateSignals made).
  New baselines: `gallery-bigTitles-{light,dark}`; re-baselined: `gallery.spec.ts` `markdown-{light,dark}`.
- **Gates (worktree)**: `npm test` 2400 + 14 pass; `npm run check` 0 errors; `npm run verify` ok; full
  `npm run test:pages` 955 passed (VB_TEST_PORT 8200, 3 workers, 13.0 min).

**Caught Beyond the Brief**

- The big title keeps the title's medium weight; the body's `##` is bold. At 18 vs 15 px the title leads, but at
  the board's zoomed-out scale the bold `##` right under it competes. A bold title (today's `#` weight) would make
  the one headline unmistakable: a maintainer call, not taken.
- SKILL.md's Body line still says "`#` and `##` headings (large, medium)"; under bigTitles both draw medium in a
  card body. Listed under REQUESTS (not this task's file).

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Big titles: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_big-titles.md]]`, ending in a newline.
