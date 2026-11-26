---
task_name: The history badge says when the agent last wrote the card's text
created: 2026-11-26
completed: 2026-11-26
status: completed
categories: [board-ui]
type: implementation
model: standard
persona: Staff front-end engineer for collaborative canvases — the person can tell at a glance how old a card's text is, from data the page already holds.
skills: [cortex-architecture]
tracker:
---

# Task: The history badge says when the agent last wrote the card's text

## Problem
The person can't tell how old a card's text is, so can't tell whether it changed since they asked for a change.

## Rulings (maintainer, chat points 827-839)
1. The time is the newest `drawn` entry in the card's history (`packages/actions/src/card-times.ts`, `CardTime`
   kind `drawn`, its `at` and `agent`): the agent's last text change. Ticks, crosses, notes, replies and moves do
   not count. The same text sent again counting as an update is accepted (837).
2. The change badge's tooltip gets two lines: `Updated 26 Nov '26, 11:42 by Claude` (24-hour clock, the viewer's
   time zone, agent by its label as history rows name it), then the badge's current label with its (H) key.
3. The history badge shows on every card, a card that never changed included (a quiet "v1"), so every card can be
   hovered (839). No board-menu switch (830).
4. No new screenshots, no full page suite (834).

## Steps
1. Words first: the "Updated …" line and its date format in the node words (`packages/ui/src/words/node.ts`);
   reuse any date formatter the history box already uses before writing one.
2. Data: the node's marks gain the written time and agent from the page's fold (`s.times`); no ledger read.
3. Badge: `BadgeMark` (`packages/ui/src/node/node-marks.ts`) no longer `none` for a drawn card; tooltip two lines
   on the shared tip. Behind a flag in `packages/format/src/flags.ts`, on by default.
4. Pattern docs (`pattern.json`), gallery state if one is missing, contrast unchanged (existing tokens).
5. Tests: unit tests for the time pick (newest `drawn`, ignores check/cross/notes) and the words; update targeted
   specs that assumed no badge on an unchanged card; `npm run verify`. A look in light and dark.
