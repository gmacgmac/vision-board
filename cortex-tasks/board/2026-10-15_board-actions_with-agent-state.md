---
category: board-actions
status: completed
completed: 2026-10-16
created: 2026-10-15
---

# "With agent": a note takes a card off the person's open list

> **From**: maintainer, 2026-10-15 (chat 130, 136: "open means that we have to respond to it … we've
> reacted, so why would it still be open?"; go: "all ok, proceed") · **Model**: Opus 5.5 · **Builds on**:
> D-045 and `cortex-tasks/board/2026-10-15_board-actions_answer-model/` (read its PLAN and notes)

## Rulings (maintainer; do not reopen)

1. **Open means "needs the person".** A card that asks is in exactly one of: **open** (needs the
   person), **with agent** (the person's latest note on it is owed an answer by the agent),
   **answered** (✓ or ✗), **later**.
2. **A note moves a card to "with agent".** It is not answered and not open. Only ✓ or ✗ answers a card
   (D-045 unchanged).
3. **The agent's answer moves it back to open.** Its `reply` to the latest note (or a new version)
   already clears the card (D-045, `packages/actions/src/clears.ts`); the card is then open, unmarked,
   with "1 update" until seen, as built.
4. **Words.** Header: "N open · N with agent · N answered · N later" (the "with agent" part shows only
   when N > 0). The footer word on such a card reads "With agent" (today "Commented"). The container
   count "N of M answered" is unchanged. "Hide answered" is unchanged.
5. **Agents read it too.** Wherever an agent reads counts or a card's state (`get_board`, `list_open`,
   `show_node`), "with agent" is reported the same way (one word at the API edge, beside `STATUS_OUT`).
6. **D-046**, appended on completion (approved with chat 136):

```
## D-046 A note puts a card with the agent; open means the person is needed
- **Date**: 2026-10-15 · **Status**: Accepted · **From**: maintainer (chat 130, 136)
- **Decision**: A card that asks is open (needs the person), with the agent (the person's latest note
  is owed an answer), answered (✓ or ✗) or later. A note moves it to the agent; the agent's answer
  moves it back to open. Only ✓ or ✗ answers it (D-045 unchanged).
- **Why**: a card the person had reacted to still counted as open, so "open" stopped meaning "needs
  you".
- **Rejected**: letting a note answer the card, which brought back questions closing cards (D-045).
- **Task**: cortex-tasks/board/2026-10-15_board-actions_with-agent-state.md
```

## Steps

1. [x] **Tests first** (unit, `packages/actions/tests/`; page, `tests/pages/`): a note on an open
   decision → with agent, not counted open or answered; the agent's reply → open again; ✓ after a
   note → answered; Later after a note → later; a note on a card that informs changes no count; the
   header words, the footer word, and the API words.
2. [x] Action layer: one derived state for "with agent" from the owed note (`pending.ts` already knows
   what is owed; reuse it, no second rule); `board-state.ts` `counts` gains `withAgent`; `statusOf` /
   the item status the page reads says it. API edge word beside `STATUS_OUT` in `registry.ts`.
3. [x] Contract: OpenAPI minor bump; `api.md` item under "The answer model"; `npm run gen`, `npm run map`.
4. [x] Page: header chip (`apps/board/src/board/toolbar-counts.ts`, the shell toolbar), footer word
   (`packages/ui/src/node/node-core.ts` `STATUS_LABEL` / `statusWord`), key help if it lists the
   counts; gallery row; screenshots viewed before updating.
5. [x] Skill: `skills/vision-board/SKILL.md` says a note puts the card with the agent and its answer
   brings it back to the person (wording only; version bump in the skill-rule task).
6. [x] Append D-046 to `docs/decisions.md` exactly as above.

## Validation

- [x] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
  `npm run gen`, `npm run test:pages`).

## Constraints

- Project rules: contract first, one action layer, tests first, tokens only, files about 300 lines.
- If deviation is needed, stop and say so. No git commits. Never touch `.visionboard/`; don't use the
  board on 4466. One page-test run at a time. Scratch in the system temp folder.
- Fill Implementation Notes and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-16)

**One rule (step 2).** `conditions.ts`: `owedOn` split into `owedNote` (the note half of
`item.owed`, unchanged logic) and the owed park; new `cardStatus(s, node)`: ✓, ✗ or Later as
marked, else `commented` while `owedNote` holds, else `open`. The fold's status (`notes.ts`
`itemOf`) now holds the marks alone (`markOf`): a note sets no status there, so there is no second
"commented" rule. `boardState` (the page), `reads.ts` `nodeDetail` and `openItems` read
`cardStatus`. `counts` returns `{ total, open, withAgent, answered, later }`. `registry.ts`
`STATUS_OUT` gains `commented: 'with-agent'`. The internal word stays `commented` (as
`acknowledged` stays for ✓): the node CSS, `data-status` and tokens are untouched.

**Interpretations (for the maintainer).**
1. ✓, ✗ and Later win over an owed note: ✓ then a note stays answered (the ✓ is still lit) until
   the agent's answer clears it (D-045); "Later after a note → later" as the step asks.
2. Note → ✓ → clear (or Later → clear): the note is owed again (`item.owed` already said so), so
   the card reads "With agent", where it read "Open" before. Unit test.
3. Not changed: the numbered reply's / Send message's "Still open: …" (`reply.ts`) still lists
   with-agent cards (every card that asks with no ✓, ✗ or Later). Rule 5 names `get_board`,
   `list_open`, `show_node`; whether "Still open" should leave with-agent cards out is open.
4. `packages/mcp/src/info.ts` not changed (it names no status); the `itemStatus` description tells
   agents what `with-agent` means.

**Contract (step 3).** OpenAPI 1.25.0 (minor, as 1.23.0/1.24.0); `common.schema.json` `itemStatus`
enum `open, checked, crossed, with-agent, context, later` and description; five response examples
`commented` → `with-agent`; `openapi.test.ts` 1.25.0; api.md 148 under "The answer model";
`npm run gen` (tools.generated.json, api-reference.md); `npm run map` (no change).

**Page (step 4).** `STATUS_LABEL` commented/context "With agent" (footer and name); toolbar chip
"N with agent" between open and answered, only above 0 (`Toolbar.svelte`, `shell.counts.withAgent`,
`toolbar-counts.ts`), `data-tone='agent'` in `board.css` from existing tokens
(`--vb-state-comment` on `--vb-state-comment-soft`: APCA Lc 64.0 light, 49.1 dark, over the 45
label tier). Key help lists no counts (unchanged). Gallery: the matrices' row "With agent" and the
group description. `pattern.json`, `components.md` § The answer model item 8. No counts sample in
the gallery (there was none before).

**Skill (step 5).** `SKILL.md` § What the person's answers mean and § Answering, and
`scenarios.md` scenario wording: a note puts the card with you (`with-agent`, "With agent"); your
answer brings it back to the person, open. No version bump (skill-rule task).

**D-046 (step 6)** appended verbatim.

**Tests first.** `packages/actions/tests/with-agent.test.ts` (new, 7 tests; 6 failed before the
build): note → with agent, not open or answered; reply or newer version → open; ✓/✗/Later after a
note; ✓ cleared after a note → with agent; note removed → open; a note on a finding changes no
count; `with-agent` in `show_node`, `list_open`, `get_board`. `node-core.test.ts` footer/name
test; `tests/pages/answer-model.spec.ts` "a note puts a card with the agent…" (failed on
"Commented"). Expected test updates: counts objects and `commented` → `with-agent` in
`actions.test.ts`, `every-node.test.ts`, `answer-model.test.ts`.

**Screenshots.** 6 changed, every diff viewed light and dark: `gallery-light/dark` and
`markdown-light/dark` (only "Commented" → "With agent" footers, the row label and the group
description; no layout shift); `board-light/dark` (only the header's "v113 → v123" and "3 → 4
boards updated": the new page test draws one more board earlier in the run). Baselines are the
run's actual images.

**Gates** (one after another): `check` 0; `npm test` 1276/1276 and timing 7/7; `verify` 0
(0 warnings); `gen` current; `test:pages` 463 passed.

## On Completion

1. Fill Implementation Notes; set `status: completed`.
2. Append one LOG line to `cortex/LOG.md`:
   `[[YYYY-MM-DD HH:MM]] [board-actions] With agent state: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-actions_with-agent-state.md]]`
