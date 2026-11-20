---
task_name: Container Held Mark
created: 2026-11-20
completed: 2026-11-20
status: completed
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

Executed 2026-11-20 by a sub-agent (Opus 5.5). Stopped at step 8: `eval:bot` came in under 113/114 (see Verification).
Steps 1 to 7 are done; nothing is committed.

**What was built**
- **The container object chosen.** `get_board`: each region of `view.regions` (`view.schema.json` `$defs/region`), the
  object a bot reads as "the container" there (id, title, mode). `show_container`: the top level of its answer, beside
  `holders` and `board`, not the `region` object: that is the stored ledger line (`events/region.schema.json`
  `$defs/region`), and widening it would let `held` into ledger lines and write items. Both presence-only, `true` or
  absent. `get_board`'s board `held` description now says a board's `held` lets you add containers and opens no other
  agent's.
- **One rule.** `caller-marks.ts` `marksFor` gives `heldIn(region)`: `mayAnswerIn(s, agent, { board, region })` (the
  `region` row of `PERMISSIONS`), or true for the folder's one agent (`scopeOf` undefined, as `holds`). No person or flag
  off marks, because `marksFor` is undefined there. `markContainer` marks an object; `markBoard` maps it over
  `view.regions`; `reads.ts` `showContainer` applies it. A retired container leaves `index.boards`, so `mayAnswerIn`
  is false and it is never marked.
- **Tests** (`bot-tool-rules.test.ts`, written failing first): "a container the caller may write in is `held`..." holds
  every region of `plans` against a real `node` write, for three agents: the maker of `now`, another agent granted the
  board that made `theirs` and `shared`, with `shared` granted back to the first, and an agent holding nothing. For each,
  get_board's mark, show_container's mark and "the write answered needs-grant" are checked together; both answers pass
  `checkAnswer`; a host bot's `get_board` and `request_grant` words are checked. "the container mark: the folder's one
  agent..." covers the one agent (all held), the person (none) and the flag off (none).
- **Words.** `plugin-tools.ts` `ruleEdits` (flag on, host bots): `get_board` says what a board's and a region's `held`
  mean; `request_grant` says to ask for any container not marked `held`, and that a board's `held` opens no other
  agent's. The singleAgent edits still remove both for the one agent (its `get_board` edit runs to ` `locked: true``,
  past the new words). `flags.ts` `botToolRules` names the container mark. `info.ts` `toDrawOnABoard` (the standalone
  and plugin MCP instructions) adds one sentence: write only in a container your read marks `held`, else
  `request_grant` with `board` and `region` first. The plugin instruction edits and the singleAgent removal still match.
- **Skill** v3.39: one rule in the standalone `access` slot of `source/differences.md`, rebuilt with
  `npm run build:skill`. `SKILL.md` says to edit only under `source/`, so the rule went there, not into `SKILL.md`. The
  plugin skill has no § Access and is unchanged.
- **Docs.** `api.md` 85 and 171 point to a new 212 (the mark, the rule, why, the tests).
- **Generated.** `npm run gen` rewrote `packages/format/src/api-types.generated.ts`, the only generated file the schema
  change touched (`gen --check` passes).

**Verification**
- `bot-tool-rules.test.ts` 14/14 (2 new). With `api-schemas`, `engine`, actions `permissions`, MCP package tests,
  `openapi`, `board-data`, `plugin-skill` and the skill's `build.test.mjs`: 140 of 141 pass. The one failure is
  `plugin-skill.test.ts` "the plugin bot's tool descriptions are the tool table's...". It assumes only tools named in
  `descriptionEdits` differ from the table, but the new `ruleEdits` touch `get_board` and `request_grant`, which are not
  in that list. The one-line fix (count `ruleEdits` too) was tried and passed 17/17; the file was then restored, since it
  is outside this task's files. It is listed as a request.
- `npm run verify`: ok (51 warnings; one new, `bot-tool-rules.test.ts` at 352 lines, under the 500 limit). `tsc -p tsconfig.json`: clean.
- `npm run eval:bot -- --model haiku` (claude-haiku-5-5, plugin, singleAgent off, so the bot read the new words):
  **102/111, $0.5390**, report `tests/evals/bot/out/2026-11-20T13-17-44-792Z/report.md`. Of that, 8 checks are one
  summary-card attempt that stalled at 78 s and counts $0.50. Its retry passed 8/8, but the retry used the 16th run
  slot, so one scenario never ran. Leaving the stalled attempt out, it is 100/103 over 15 scenarios. Misses:
  `insert-step/reads-references` (known), `refusals/no-propose-without-source` (proposed a ✓ and a ✗ itself), and
  `new-card-number/no-guessed-number` (named "card 4" before the answer gave it). Neither new miss touches grants or
  `held`. [INFERENCE] They look like live-model variance, but that is not established: a repeat of the two with
  `--only` would settle it. The dry run scored 114/114. **Stopped here, as the task says.**

**Caught Beyond the Brief**
- `request_grant` and the write disagree in one case: `writes.ts` `requestGrant` answers `held` for a region when the
  agent is among that container's `holders` and checks no board. The write (`PERMISSIONS.region` / `node`) needs the
  board too. A board revoke deletes only the board's holder key (`ledger-index.ts` `revoke`), so an agent granted a
  container whose board was later revoked gets `request_grant` saying `held` while every write answers `needs-grant`
  naming the board. The new mark follows the write (not `held`). Not changed: grant behaviour is out of scope.
- The standalone bot's tool descriptions (`openapi.json`, through `vb-mcp`) say nothing of `held`, board or container.
  It learns of the mark only from the skill and the MCP instructions. No standalone eval scenario writes into another
  agent's container, so no eval holds the 27-card case.
- `openapi.json` `info.version` was not bumped (1.46.0): `openapi.test.ts` pins it, and that file is outside this task.

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry, one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-agent] Completed: Container Held Mark → Task: [[cortex-tasks/board/2026-11-20_board-agent_container-held-mark.md]]`
3. Don't commit; the orchestrator commits.

### Orchestrator close (2026-11-20)
- Eval gate resolved by reruns on Haiku 5.5: the plugin's three missed scenarios passed 23/23; the four standalone scenarios that missed, run twice side by side, scored 70/78 on v3.38 (without this change) and 69/78 on v3.39, with the same misses (timeline, import, copy). The misses predate this change; none concerns grants or `held`.
- `plugin-skill.test.ts` counts `ruleEdits` as edits (the agent's request); API version 1.46.0 → 1.47.0 for the new optional field (`openapi.test.ts`, `npm run gen`).
- Follow-ups, not done here: `request_grant` answers `held` for a container from its holder list without the board check the write makes; no eval scenario writes into another agent's container.
