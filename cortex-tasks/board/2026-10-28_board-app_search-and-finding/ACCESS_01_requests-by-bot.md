# ACCESS_01_requests-by-bot: Access requests grouped by bot

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The requests strip shows one group per bot, named by its folder, with each container's row and
reason and one Allow all for that bot; the heading counts bots, not requests.

## Context

One bot ("User split build") sent nine `grant-request` lines in one second, one per container of
another bot's board (D-027, D-034); the strip showed nine rows under "9 agents ask for access"
(`shell/words/shell-access.ts` `askForAccess(requests.length)`). Every request carries the requesting
agent's id, stamped by the server (api.md 21). Rulings 320/321: group by that id; a bot's label is
its folder's name. Behind a new flag `accessByBot` (default on).

## Inputs

- **Files to modify**: see TASK-STATUS.md File Ownership (ACCESS_01)
- **Files to reference**: `packages/actions` `grantRequests` (`GrantRequestView`), `board/access/access.ts`
  `AccessRequestRow`, `shell/AccessRequests.svelte`, `server/chat-access.ts` (`sessionLabel` or the
  label it builds, `joinAndGrant`), the skill's § Getting started (`join` with a short label)
- **Skills**: `cortex-architecture`, `cortex-docs`; the `vision-board` skill (you edit its `join` line:
  prompts are code: bump the version line, record why in `NOTES.md`)

## Steps

1. **Failing tests first**: page spec (`tests/pages/access*.spec.ts`): two bots, one asking for three
   containers and one for the whole board: two groups, each headed by its label; the heading says
   "2 agents ask for access"; one Allow all grants that bot's three and nothing of the other's; a
   single row's Allow and Refuse still work alone. Unit: rows grouped by agent id, in the order each
   bot first asked. See them fail.
2. **Rows by bot** (`board/access/access.ts`): the row type carries the agent id; a grouping function
   beside it. Two bots with the same label are told apart in the group heading (say how; e.g. the
   label and a short number) without showing ids.
3. **The strip**: group heading "<label> asks for access to N containers" (or "to draw on this board"),
   its rows under it, Allow all for the group with a confirm only if the board's confirm rules ask
   for one; each Allow is still the person's act through the act path (one `grant` line per request).
   Words in `shell/words/shell-access.ts`; the heading counts bots.
4. **Labels are folder names**: the side panel's chat joins as the board's folder name (`chat-access.ts`);
   the skill tells an MCP bot to `join` with its working folder's name (its repository or worktree
   folder, not a path). Bump the skill's version; `NOTES.md` says why (ruling 321).
5. **Gallery**: the strip with two bots, light and dark (new baselines for the new entry only).
6. **The flag** `accessByBot` is already in `flags.ts` (the orchestrator's); read it from there, and change only its description if what you built differs.
7. **Checks**: unit, `check`, `verify`, `gen-api --check`; `access*` page specs and the gallery spec on 5300.

## Validation

- [ ] Grouped by agent id, one Allow all per bot, heading counts bots, gallery entry
- [ ] Labels are folder names (side panel and skill); flag off = today

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row; one LOG line (`[board-security] ACCESS_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
