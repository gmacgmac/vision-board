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

## On Completion

Notes in the main checkout's copy; one LOG line, `[board-ui] Big titles: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_big-titles.md]]`, ending in a newline.
