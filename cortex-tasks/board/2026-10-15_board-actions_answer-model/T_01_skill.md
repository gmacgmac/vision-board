# T_01_skill: Skill

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach agents the answer model and the consolidation proposal, tested against the scenarios before
release (project rule 17).

## Context

PLAN.md rulings 10 and 11. BE_01 has landed: read its notes (the words `check_responses` now uses).

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md` (✓/✗ table and bullets, More context
  bullets, "Consolidation is the person's call", "Retiring and distilling"), `skills/vision-board/scenarios.md`,
  `skills/vision-board/NOTES.md`.
- **Files to reference**: `cortex-tasks/board/2026-10-11_board-agent_skill-conversation-board.md`
  (how the last skill change was tested), `packages/mcp/src/info.ts` (after BE_01).

## Steps

1. [x] Rewrite the answer rules: ✓ and ✗ are the person's two marks, read in the light of what the
   card asks (no rule to spell out their meaning on each card; propose any wording to the
   maintainer); `check_responses` reads `check` / `cross`; your answer to a note clears the
   card, so ask again when you still need a ✓ or ✗; a note may be a question,
   so answer it with `reply` or `append` and leave the card open; a note never settles a card; never
   two asks on one card; say where a card applies when the context needs it. No length rule.
2. [x] Consolidation (ruling 11): when every card that asks in a container is answered, propose with
   one `decision` card; on ✓ write one summary card and retire the cards it replaces; never without
   that ✓.
3. [x] Scenarios: add one where the person's note is a question on a decision (the card stays open,
   the agent replies and asks again), and one for a consolidation proposal. Run them as the last skill change did;
   record the runs in NOTES.md.
4. [x] Bump the skill's version and say what changed in NOTES.md.

## Validation

- [x] Each new scenario passes in at least one recorded run.
- [x] The five gates exit 0 (the skill is checked by `npm run verify`).

## Constraints

- Agent instructions are code (rule 17): reviewed and tested before release.
- If deviation is needed, stop and say so. No git commits. No PII in examples.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**Skill** (`skills/vision-board/SKILL.md`, v3.4; 300 lines in v3.3, 324 now). The answer model
(ruling 10): ✓ and ✗ are the person's two marks, read in the light of what the card asks (the
Kinds table no longer gives ✓ "yes" or "done"); `check_responses` reads `check` / `cross`, answer
lines `2 (question): ✗`, "the ones I ticked" are the lines reading ✓; a note never answers a card
and is owed unless ✓ or ✗ came after it; your answer (a `reply` to the latest note, or a new
version) clears the earlier ✓, ✗ and Later, so ask again in it; a note that asks or reads like an
answer leaves the card open; one ask per card; say where a card applies when the context needs it;
an old `context` is a note; each card's latest mark, not every click (`reopen` is a clear). No
length rule, and no rule to spell out ✓ and ✗ on each card (ruling 10 as softened). Consolidation
(ruling 11): "only when the person asks, or after their ✓ on your proposal"; a new "Propose
consolidating a container" bullet (one `decision` card once every card that asks there is answered
and nothing is owed; on ✓ one summary card, the problem, what was decided, where it landed, then a
`retire { n }` per card replaced, the proposal included; on ✗ leave it).

**Scenarios** (`scenarios.md`, v3.4): 2, 10, 13, 15, 16 and 19 updated (✓/✗ lines, a note never
answers, More context as a note); 22 (a note that asks, on a decision) and 23 (a consolidation
proposal, two turns) new.

**Runs** (NOTES.md § Skill v3.4). `claude` 2.1.284's login had expired ("OAuth session expired and
could not be refreshed", also outside the sandbox), so I ran the scenarios with `kiro-cli` 2.24.0
(a workspace agent in the temp project with the skill as its prompt and only `vb` tools, model
`claude-sonnet-5.5` in the agent file; the CLI's `--model` flag answered "Method not found", so
the model actually used is not established). Panel-style: an agent joined over HTTP, its secret as
`VB_AGENT_SECRET`, the person's acts over HTTP (cookie, Origin), each message built by the panel's
`promptFor` / `roundOf`; servers on 4497-4499 with `HOME` and `VB_PROJECT` in the system temp
folder, `VB_KIRO_AGENT=0`, stopped after. Scenario 22 passed (a reply to each note, each asking for
the mark again; 2 and 3 `open`, `unseen`, `unseenAnswer`, nothing pending; no new card, no
propose). Scenario 23 passed (turn 1: one proposal card in "Venue", no retire, nothing for
"Travel"; turn 2 after ✓: one summary card, retire 1-5 and the proposal; two `write_board` calls,
only the second wrote). Scenario 10 (updated) passed (one reply to the group note asking ✓ on 5; 5
open). Slip: a second closing line after "Done." in two of three runs.

**Left for VERIFY_01**: a Claude Code run of 22 and 23 (the CLI login), and the page side of a
cleared card (FE_01's marker), which these runs saw only through the API.

**Gates** (mine): `npm run verify` 0 (ok, 0 warnings; it does not scan `skills/`), `npm run check`
0, `packages/agent` tests 61/61. `npm test` and `npm run test:pages` are FE_01's while it works
(not run, by instruction).

**For the maintainer**: (a) optional Kinds line, not added: "When ✓ and ✗ could read more than one
way, say on the card what each does (✓ keep · ✗ rename)"; the agent did it unasked in every reply.
(b) `claude` needs signing in again before Claude Code runs the panel.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-agent] T_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-actions_answer-model/T_01_skill.md]]`
