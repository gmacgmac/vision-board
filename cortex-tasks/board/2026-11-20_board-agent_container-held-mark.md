---
task_name: Container Held Mark
created: 2026-11-20
completed:
status: pending
categories: [board-agent]
type: implementation
model: strong
persona: Principal API designer for agent tools — a read must answer the caller's next question before it is asked, and must never disagree with what the write will do.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Container Held Mark

---

## Problem Statement

An agent in the chat panel read a board with `get_board`, then rewrote 27 cards in six containers another agent
session had made. Every item came back `needs-grant`, so the whole batch's tokens were wasted. The read marks
`held: true` on a board the caller holds (`apps/board/server/engine/caller-marks.ts` `markBoard`), but a container
only lists its holders as agent ids (`packages/actions/src/reads.ts` `boardAccess`), and a panel agent is never told
its own id. So the read said "you hold the board" and nothing usable about the containers.

Fix: each read marks every container the caller may write, so the read answers the question before anything is sent
(maintainer, points 679 to 684).

---

## Steps

1. **Contract first.** Find the source the reads' answers are checked against (`apps/board/tests/openapi-ajv.ts`
   `checkAnswer` and what it loads). Add an optional `held: true` on a container in `get_board`'s answer and on
   `show_container`'s container. Presence-only, `true` or absent, the same convention as the board's `held`.
2. **The rule, one source.** A container is `held` for the caller when
   `packages/actions/src/permissions.ts` `mayAnswerIn` is true for it: the `region` row of `PERMISSIONS`, the same
   test a write into it goes through. Do not write a second rule from `holders`.
   - The folder's one agent (`OpCtx.one`, `singleAgent`) holds every container, as it holds every board (`holds`).
   - The person, or a client with no agent, gets no marks. The `botToolRules` flag off gives no marks, as before.
3. **Mark it.** In `caller-marks.ts`: add the containers the caller holds to `CallerMarks` (from `marksFor`); have
   `markBoard` mark them on `get_board`'s container objects. In `apps/board/server/engine/reads.ts`, `show_container`
   marks its container the same way. Pick the container object a bot reads as "the container" in each answer, and
   say which in Implementation Notes.
4. **Test, failing first** (`apps/board/tests/bot-tool-rules.test.ts`). Hold the read and the write to each other:
   for an agent caller on a board with containers it made, containers another agent made, and one granted to it,
   every container marked `held` takes a `node` write into it without `needs-grant`, and every unmarked one answers
   `needs-grant`. Also: the one agent sees every container held; the person and flag off see none; the answers pass
   `checkAnswer`.
5. **Words.**
   - `apps/board/server/words/plugin-tools.ts`: the `request_grant` and `get_board` descriptions say a board's
     `held` lets you add containers, and a container's own `held` says you may write in it.
   - `packages/format/src/flags.ts`: the `botToolRules` description names the container mark.
   - `packages/mcp/src/words/info.ts`, if it states the grant rule.
6. **Skill** (`skills/vision-board/SKILL.md` § Access). Add one rule, in the skill's plain style: write only into
   containers your read marks `held`. For any other existing container, call `request_grant` with `board` and
   `region` first, and wait. A board's `held` lets you make new containers; it does not open another agent's. Keep the
   rest of § Access as it is. Bump the skill's version line as the file does it.
7. **Docs.** `docs/specification/api.md` (the `held` rule near its `{ held: true }` mention) and any spec line
   describing the read's marks: state the container mark, cite `caller-marks.ts` and the test.
8. **Checks.**
   - Run the tests for the files you changed: `bot-tool-rules.test.ts`, `api-schemas.test.ts`, `engine.test.ts`,
     the actions permissions tests, and the MCP package tests if words there changed.
   - Run `npm run verify` and `npm run eval:bot` (the skill changed, so eval must pass before merge). Report the eval
     score against the last one, 113/114 with one known miss.
   - This is a server-only change; no page tests are needed. If you run any, use `VB_TEST_PORT=6000` and a temporary
     HOME.

---

## Files Involved

| File | Purpose |
|------|---------|
| the reads' answer schema `checkAnswer` loads | Contract: container `held` |
| `apps/board/server/engine/caller-marks.ts` | Marks: containers the caller holds |
| `apps/board/server/engine/reads.ts` | `get_board`, `show_container` apply the mark |
| `packages/actions/src/permissions.ts` | `mayAnswerIn`: the rule (reuse; change only if a public helper is needed) |
| `apps/board/tests/bot-tool-rules.test.ts` | Tests |
| `apps/board/server/words/plugin-tools.ts` | Tool descriptions |
| `packages/format/src/flags.ts` | `botToolRules` description |
| `packages/mcp/src/words/info.ts` | Only if it states the grant rule |
| `skills/vision-board/SKILL.md` | § Access rule |
| `docs/specification/api.md` | The mark, documented |

> Modify only the files listed here. Need a change elsewhere? Don't make it; list it under `REQUESTS`.

---

## Constraints

- **DO NOT** tell the agent its own id, add a dry-run to writes, or change any write or grant behaviour.
  The fix is a mark on the read only.
- **DO NOT** add a second permission rule; the mark must come from `mayAnswerIn` / `PERMISSIONS`.
- **DO NOT** touch protected files (steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, tokens, existing
  `docs/decisions.md` entries).
- Never port 4466. Tests never touch the real home folder.
- No git commands that change state; the orchestrator commits.
- **STOP** and report if `eval:bot` drops below 113/114, or if the mark and the write disagree for any case.
- No PII in examples.

---

## Success Criteria

- [ ] `get_board` and `show_container` mark `held: true` on exactly the containers a write into would not answer
      `needs-grant`, for an agent caller with the flag on. The test holds this.
- [ ] One agent: all held. Person, or flag off: no marks.
- [ ] Words, flag description, skill and api.md say it; `npm run verify` passes.
- [ ] `npm run eval:bot` at 113/114 or better.
- [ ] Task file updated with completion notes.

---

## References

- `apps/board/server/engine/caller-marks.ts` (`holds`, `marksFor`, `markBoard`)
- `packages/actions/src/permissions.ts` (`PERMISSIONS`, `mayAnswerIn`)
- `packages/actions/src/reads.ts` (`boardAccess`)
- `apps/board/server/engine/writes.ts` (`requestGrant`)
- `docs/specification/api.md`, `docs/specification/words.md`

---

## Implementation Notes

_To be completed by agent after task execution._

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry, one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-agent] Completed: Container Held Mark → Task: [[cortex-tasks/board/2026-11-20_board-agent_container-held-mark.md]]`
3. Don't commit; the orchestrator commits.
