---
task_name: Search and Finding
created: 2026-10-28
completed:
status: in-progress
categories: [board-app, board-ui]
tracker: cortex-tasks/tracker.md#M7
---

# Search and Finding - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-10-28

---

## Instructions for Agents

1. **Read PLAN.md first**, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column**: do not start a task whose wave has not been reached
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component
5. **Touch only the files you own** (File Ownership below). Need a change elsewhere? List it under
   `REQUESTS` in your return block; the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`**: `planned` → `in-progress` when you start. Closing the set is the orchestrator's job
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:` line
   here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commits**: the orchestrator commits after each wave's gate
11. **Your port**: the one in your row's Notes (`VB_TEST_PORT`; workers take +10 each). Never 4466
12. **No full page suite in a task**: unit tests, `check`, `verify`, `gen-api --check` and the page specs
    for what you changed; the orchestrator runs the full suite at each gate
13. **A bug fix starts with the failing test**: write it, see it fail, then fix

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | SEARCH_01 | 1 | strong | Search engineer who has shipped find-as-you-type in editors — a person types half a word in any order and expects the card they mean first; a match they can't see the reason for, or a box that lags a keystroke, is a failure. | [The search engine and the board's documents](./SEARCH_01_search-engine.md) | Pending | port 5100 |
| 2 | FIND_01 | 1 | standard | Interaction designer for review tools — looking is not reading: a mark the person is still working through must survive every way of finding the card, and go only when they engage with it. | [Finding never clears a card's marks](./FIND_01_finding-keeps-marks.md) | Pending | port 5200 |
| 3 | ACCESS_01 | 1 | standard | Trust-and-safety designer for permission prompts — one decision per bot, named so the person knows who is asking; a wall of identical rows teaches people to click Allow without reading. | [Access requests grouped by bot](./ACCESS_01_requests-by-bot.md) | Pending | port 5300 |
| 4 | SEARCH_02 | 2 | strong | Senior product designer for canvas tools (whiteboards, maps) — search must show where the matches are on the canvas at a glance, step through them without losing your place, and get out of the way with one key. | [The search box on the board](./SEARCH_02_search-box.md) | Pending | port 5400 |
| 5 | REVIEW_01 | 2 | standard | — | [Review opens a list](./REVIEW_01_review-list.md) | Pending | port 5500 |
| 6 | VERIFY_01 | 3 | strong | A person using the board for the first time on a 60-card board, with no history of these changes — wants to find "the pricing card" by typing, step through matches, review three proposals and answer two bots asking for access, without losing which cards are still new. | [Verification](./VERIFY_01_search-verification.md) | Pending | port 5600 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order. Same number = safe to run in parallel.

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `packages/search` (`searchIndex`, `search`, `SearchDoc`, `SearchHit`): normalise, match, rank, ranges | SEARCH_01 | SEARCH_02, (later) nclite's Journal |
| `packages/actions` `boardSearchDocs`: the board's cards as `SearchDoc`s (title, text, notes, replies, container) | SEARCH_01 | SEARCH_02 |
| The finding go path: going to a card with `{ find: true }` selects and shows it without marking it seen (`board/find/go-to-card.ts`, the controller's `arrive`) | FIND_01 | SEARCH_02, REVIEW_01 |
| Access rows grouped by agent id (`board/access/access.ts`) | ACCESS_01 | VERIFY_01 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | SEARCH_01 | `packages/search/**` (new), `packages/actions/src/search-docs.ts` (new) and its export line in `packages/actions/src/index.ts`, `packages/actions/tests/search-docs*.test.ts`, `docs/specification/modules.md` § notes only if hand-written (the table is generated) |
| 1 | FIND_01 | `apps/board/src/board/find/**`, `apps/board/src/board/controller.ts` (`arrive` only), `apps/board/src/board/cards/update-flow.ts`, `apps/board/src/board/selection/**`, `packages/actions/src/answers/updates.ts`, `packages/actions/src/conditions.ts`, their tests, `tests/pages/go-to-card*.spec.ts`, `tests/pages/open-list*.spec.ts`, `tests/pages/fresh*.spec.ts`, `tests/pages/find-keeps-marks.spec.ts` (new), `docs/specification/components.md` § Finding |
| 1 | ACCESS_01 | `apps/board/src/shell/AccessRequests.svelte`, `apps/board/src/shell/words/shell-access.ts`, `apps/board/src/board/access/**`, `apps/board/src/board/words/access.ts`, `apps/board/server/chat-access.ts`, `apps/board/src/gallery/` (the access section), `tests/pages/access*.spec.ts`, `apps/board/tests/chat-access*.test.ts`, `skills/vision-board/SKILL.md` (the `join` line, its version line) and `NOTES.md` |
| 2 | SEARCH_02 | `apps/board/src/shell/GoToCard.svelte`, `apps/board/src/shell/words/shell-go-to-card.ts`, `apps/board/src/board/find/go-to-card.ts`, `apps/board/src/board/words/go-to-card.ts`, `apps/board/src/board/input/commands.ts`, `apps/board/src/board/input/keys.ts`, `apps/board/src/shell/App.svelte`, the stage and card CSS for ring and dim (`apps/board/src/styles/board.css`, `packages/ui/src/node/node.css`), `apps/board/src/gallery/` (the go-to-card section), `tests/pages/search*.spec.ts`, `tests/pages/go-to-card*.spec.ts`, `tests/pages/key-help*.spec.ts`, `apps/board/src/shell/KeyHelp.svelte` (the `/` row) |
| 2 | REVIEW_01 | `apps/board/src/shell/ProposalsBar.svelte`, `apps/board/src/shell/words/shell-proposals.ts`, `apps/board/src/board/cards/proposal-flow.ts`, `apps/board/src/board/find/finder.ts` (a proposal row helper only), `apps/board/src/gallery/proposals-section.ts`, `tests/pages/proposals*.spec.ts` |
| — | flags | `packages/format/src/flags.ts`: the orchestrator added all four flags (`findKeepsMarks`, `accessByBot`, `cardSearch`, `reviewList`), default on, before wave 1. A task may change only its own flag's `description` (one line, re-read the file just before); anything else is a `REQUEST` |
| 3 | VERIFY_01 | its task file's notes, `VERIFY_01_findings.md` |
| — | orchestrator | `package.json`, `package-lock.json`, `docs/decisions.md`, `cortex-tasks/tracker.md`, `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/nclite-contract-reply.md`, generated files (`npm run map`, `gen-api`), unexpected screenshot baselines |

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### SEARCH_01
_Status:_ Pending  
_Notes:_ 

### FIND_01
_Status:_ Pending  
_Notes:_ 

### ACCESS_01
_Status:_ Pending  
_Notes:_ 

### SEARCH_02
_Status:_ Pending  
_Notes:_ 

### REVIEW_01
_Status:_ Pending  
_Notes:_ 

### VERIFY_01
_Status:_ Pending  
_Notes:_ 

---

## The Run (orchestrator)

| Wave | Tasks | Commit · tag | Gate |
|------|-------|--------------|------|
| 1 | SEARCH_01, FIND_01, ACCESS_01 | — | — |
| 2 | SEARCH_02, REVIEW_01 | — | — |
| 3 | VERIFY_01 | — | — |

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] The maintainer looks in a browser, light and dark: search on a big board, the Review list, grouped requests
- [ ] LOG entry created

---

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`
2. Set LOG entry: `[[YYYY-MM-DD HH:MM]] [board-app] Completed set: Search and Finding → Task: [[cortex-tasks/board/2026-10-28_board-app_search-and-finding/TASK-STATUS.md]]`
3. Delete tracker row M7; remind the maintainer that plugin mode is next (tracker M8, M12–M15, M21–M22)
