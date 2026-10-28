---
title: Search and Finding
created: 2026-10-28
categories: [board-app, board-ui]
tracker: cortex-tasks/tracker.md#M7
---

# Search and Finding

## Problem

- A card can be found only by its number (tracker M7). On a 60-card board, finding "the card about
  annual pricing" means reading every card.
- Finding a card changes it: going to a card (Go to card, the open, new and updated lists) selects it,
  and selecting marks it seen (`packages/actions` `seenOnSelect`, conditions `clearedBy: ['select', 'act']`),
  so its NEW or "updated" mark goes although the person only looked for it.
- The proposals notice's Review opens the first proposal's box where the card is, without moving the
  board, so on a large or zoomed-out board nothing seems to happen.
- Access requests: nine from one bot show as nine rows and "9 agents ask for access"
  (`shell/words/shell-access.ts` `askForAccess` counts requests). A bot's label says little ("Claude
  Code chat 493e31fb").

## The maintainer's rulings (2026-10-28)

- **317**: search opens with `/` (and a click on the box). Digits still go to a card by number.
- **322** (the maintainer's own words): looking for or finding a card never changes its state;
  engaging with it does: the person's own click on the card, or acting on it (✓, ✗, a note, Accept,
  Reject). Search, Go to card, every finder list and the Review list go to a card without clearing
  NEW or "updated".
- **319**: Review opens a list of the cards with proposals, like the other lists; choosing one goes to
  the card (by 322) and opens its proposal box.
- **320 / 321**: access requests are grouped by bot (its agent id, which the server stamps on every
  request; api.md 21), with one Allow all per bot, and the heading counts bots. A bot's label is its
  folder's name: the skill tells an MCP bot to `join` with its working folder's name; the side
  panel's chat joins with the board's folder name. A bot that loses its secret joins again as a new
  bot; that is fine.
- Search's look (tracker M7): words in any order, part of a word, case and accents ignored, best
  matches first, which part matched (title, text, note, reply, container); the box takes letters;
  matches get a ring, the rest dim; "3 of 12"; ↓/↑ step; Enter goes; Esc clears. Refine after.

## Proposed solution

| Piece | Reuses | Contract first | Words |
|---|---|---|---|
| A search engine, framework-free, shared with nclite's Journal (principles § Shared pieces are shared) | none fits; a new `packages/search` (no dependencies) | its types: `SearchDoc`, `SearchHit` with field and ranges | none (no sentences) |
| The board's searchable documents | `packages/actions` (ledger queries: `boardData`, `liveNotes`, replies) | `boardSearchDocs(state, board, view)` | none |
| Finding never clears (322) | the controller's `arrive` and the go path (`board/find/go-to-card.ts` `to`), `update-flow.ts` seen marking | one `go(n, { find: true })` path every finder uses | none new |
| The search box (`/`) | `shell/GoToCard.svelte` and `board/find/go-to-card.ts` grow into it; `commands.ts`/`keys.ts` for `/` | the box's state type (`GoBox` widened) | `shell/words/shell-go-to-card.ts`, `board/words/go-to-card.ts` |
| Ring and dim | the stage's data attributes and the fresh-card ring's tokens | a stage attribute and a card attribute | the "3 of 12" count in the box's words |
| Review list | `shell/MenuSelect.svelte` rows (`board/find/finder.ts` `MenuRow`, the open list) | `proposal-flow.ts` `review(n?)` | `shell/words/shell-proposals.ts` |
| Requests by bot | `shell/AccessRequests.svelte`, `board/access/access.ts` rows | rows grouped by agent id | `shell/words/shell-access.ts` |
| Bot labels | `server/chat-access.ts` label; the skill's `join` line | none | the skill |

New behaviour ships behind flags in `packages/format/src/flags.ts`: `cardSearch` (the box takes
letters, `/`), `findKeepsMarks` (322), `reviewList` (319), `accessByBot` (320). All default on.

## Dependencies and waves

- **Wave 1** (in parallel, no shared files): SEARCH_01 (the engine and the board's documents),
  FIND_01 (finding never clears), ACCESS_01 (requests by bot, labels).
- **Wave 2**: SEARCH_02 (the box, `/`, ring and dim, stepping; uses SEARCH_01 and FIND_01) and
  REVIEW_01 (the Review list; uses FIND_01).
- **Wave 3**: VERIFY_01.

## House rules

- Work in the worktree on branch `feat/search` (from main). The maintainer's board runs from the main
  checkout: never port 4466.
- Orchestrator-only files: `package.json`, `package-lock.json` (a new workspace for `packages/search`
  is added by the orchestrator, from SEARCH_01's REQUEST), `docs/decisions.md`, `cortex-tasks/tracker.md`,
  the nclite reply, generated files (`npm run map`, `gen-api`), unexpected screenshot baselines.
- Sub-agents never commit; the orchestrator commits after each wave's gate, tagged `search/wave-N`.
- A bug fix starts with the failing test. Each task runs unit tests, `check`, `verify`, `gen-api --check`
  and the page specs for what it changed; the orchestrator runs the full suite at each gate.
- Ports (`VB_TEST_PORT`, 100 apart): SEARCH_01 5100, FIND_01 5200, ACCESS_01 5300, SEARCH_02 5400,
  REVIEW_01 5500, VERIFY_01 5600; the gate 4710.
- Done means every state in the gallery, light and dark, accessibility and contrast, and a look.

## Out of scope

- Searching across boards, or past versions other than the one showing.
- A bot asking for several containers in one request (the tool's shape stays).
- Search for agents (an MCP tool); the Journal's own use of the engine.

## Risks

| Risk | Answer |
|---|---|
| Search slows a 200-card board while typing | The documents are built once per state change; matching is per keystroke over plain strings; `perf.spec.ts` budgets hold (SEARCH_02 checks) |
| `/` clashes with a host's own key | Under a host the board hears only keys inside its root (M10, the host-fixes-and-svg set) |
| Dimming hides what the person needs | Esc or an empty box clears it; dim is opacity, never hidden; contrast of dimmed text is decoration, not reading text |
| Finding not clearing NEW leaves marks forever | The person's own click on the card and every act still clear them (322) |

## Success criteria

- [ ] `/` opens the box; letters search; digits still go by number; Esc clears
- [ ] Matches ring, the rest dim, "3 of 12", ↓/↑ step, Enter goes; which part matched is shown
- [ ] Going to a card from search, Go to card, any list or the Review list never clears NEW or updated; a click on the card or an act does
- [ ] Review opens a list; choosing a row goes to the card and opens its proposal box
- [ ] Requests group by bot, one Allow all per bot, the heading counts bots; labels are folder names
- [ ] Every state in the gallery, light and dark; full suite green; the maintainer looks
