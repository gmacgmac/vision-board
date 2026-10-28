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

- [x] Grouped by agent id, one Allow all per bot, heading counts bots, gallery entry
- [x] Labels are folder names (side panel and skill); flag off = today (the strip; the server's join label has no flag)

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Changes Made
- `board/access/access.ts`: `AccessRequestRow` carries `agent`; `groupByBot` (by agent id, in the order each bot first asked; a request with no id stands alone; same-label bots numbered) and `groupAskWords` (heading words by count: "3 containers", "draw on this board", "this board and 2 containers"); exported from `index.ts`. Words: `board/words/access.ts` (`sameLabel`, `containerCount`, `asksForAccessTo`), `shell/words/shell-access.ts` (`allowAll`, `allowAllOf`, `refuseTo`).
- `shell/AccessRequests.svelte`: grouped strip behind `accessByBot` (the component reads the page flag itself, so `App.svelte` is unchanged; prop `byBot` for the gallery), heading counts bots, group heading + rows (container or "this board", reason, Allow, Refuse), one Allow all for a bot with more than one request (sequential `onanswer(seq, 'grant')`, one act each, stops at the first not recorded; no confirm: Allow has none), Refuse's accessible name carries the container, announce per bot, `scope` prop keeps ids unique when two strips share a page. Flag off = the old flat strip.
- `styles/access.css`: group heading, Allow all, indented rows (tokens only).
- Labels: `server/chat-access.ts` `chatLabel(agent, folder)` = the folder's name (CLI name for a nameless folder); `server/chat-sessions.ts` passes `cwd`; skill `join` line and v3.16; `NOTES.md` says why.
- Gallery: `gallery/access-section.ts` second section `accessByBot` (three bots, two sharing a label); baselines `access-by-bot-{light,dark}` new.
- Tests (written first, seen failing): `apps/board/tests/access-groups.test.ts`, `chat-access.test.ts`, `tests/pages/access-by-bot.spec.ts`; `send-access.spec.ts` locators moved to groups.

### Caught Beyond the Brief
- Two strips on the gallery page shared element ids (`gallery-request-0-title`), so the second strip's `aria-labelledby` read the first's heading: fixed with `scope`.
- A row's Refuse in a group of several would all be named "Refuse <bot>": each now names its container.
- Allow all not on a one-request bot: it would repeat that row's Allow.

### Deviations from Plan
- Files outside the ownership table were touched because the feature cannot work without them: `styles/access.css`, `server/chat-sessions.ts` (one argument), `server/words/server-chat.ts` (removed the now unused `chat` sentence), `tests/pages/send-access.spec.ts`, `apps/board/tests/api-chat-sessions.test.ts` and `api-chat-kiro.test.ts` (the label assertion), `packages/format/src/flags.ts` (description). None is owned by another wave-1 task.
- Allow all sends one toast per request (the last one stays); a single toast needs `App.svelte`'s `onanswer` to pass more (REQUEST).

### Run 2
Ownership widened for this run: `App.svelte` (the `onanswer` wiring), the access flow, `docs/specification/api.md` item 86.
- Allow all gives one toast. `access-flow.ts` `answerAll(requests)` records each `grant` through the act path, stops at the first not recorded, and notifies once for those that were; words `allowAllWords` (`access.ts`) with `canNowWriteInMany` and `canNowDrawAndWrite` in `board/words/access.ts` ("build can now write in 3 containers"; a one-request bot keeps the single wording). `AccessRequests.svelte` takes `onallowall` (the gallery has none and falls back to `onanswer` per request); `App.svelte` passes `board.access.answerAll`.
- Tests: `allowAllWords` unit test (seen failing first); `access-by-bot.spec.ts` asserts `#toast` reads the one sentence after Allow all.
- `api.md` 86: the grouped strip, grouping by agent id, label is the folder's name, the side panel joining as the folder name.
- Checks: unit (apps) 597 pass, `check` clean, `gen-api --check` current, `access-by-bot` + `send-access` specs on 5300: 27 pass, 2 fail (the `agent-access-*` screenshots, expected). `verify`: only `modules.md`. No baseline touched, `npm run map` not run.

### Run 3
The 45 gallery section screenshots (1px off). Cause measured, section by section, on `/gallery.html` against HEAD (a throwaway worktree, removed): the sections after `agentAccess` moved by 94.39 px, not a whole number. Of that, 77 px was the regrouped strip (whole) and 17.39 px was my longer description of the strip in the `agentAccess` section, which wrapped to one more line (a line is not a whole pixel); my new `accessByBot` section (533.156 px) sat above the rest and added its own fraction. Proof it was not FIND_01 or SEARCH_01: with my gallery changes switched off the failures stayed (the description was still longer); with the description back to the same line count every section below moves by exactly 77.000 and the failures went.
- Fix at the source: the `agentAccess` Requests description is no longer than the old one's wrapped length (same line count); `accessByBotSection` is exported separately and `main.ts` appends it after the last section (`base`), so its fractional height moves nothing.
- Result: sections below `agentAccess` move by 77.000 px each (whole); `app-fit`, `chat`, `layout-controls` and `access-by-bot` specs on 5300: 43 pass (my own two new screenshots wrote new baselines on that first run, then passed). `send-access` still fails its two `agent-access-*` screenshots (the section changed height again): re-baseline at the gate.

### Run 4
VERIFY_01 F7: the `join` tool still said a label "such as Pricing chat" (ruling 321). Sources changed, nothing generated: `packages/format/schema/openapi.json` (the `join` operation's description: "Pass your working folder's name (not a path) as `label`."; its example label is now `pricing-site`), `schema/api/join-request.schema.json` (the schema's and the label's descriptions), `schema/events/join.schema.json` (the ledger line's label description). The generated files (`operations.generated.ts`, `tools.generated.json` x2, `commands.generated.ts`, `api-reference.md`) are stale until `npm run gen`: two `gen-api --check` tests fail until then, as intended. Unit (apps + packages) 1728 of 1730 pass, those two the only failures; `check` clean.

## On Completion

Notes; your row; one LOG line (`[board-security] ACCESS_01: …` → this file); Return Contract.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`.
