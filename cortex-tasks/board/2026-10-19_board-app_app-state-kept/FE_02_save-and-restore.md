# FE_02_save-and-restore: Panels save and restore their state

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The board takes a panel's save request, stores it for that card through the client, and gives the
last saved value back when the panel starts.

## Context

PLAN.md § Key Changes 2. Uses BE_01's contract (message name, `APP_LIMITS.stateBytes`,
`hostContext.state`, the client call) and FE_01's lifecycle. **Read previous task notes in
TASK-STATUS.md before starting** — BE_01's names are the source; don't restate them.

## Orchestrator decision (2026-10-19, after BE_01)

The restored value travels in the `ui/initialize` answer's host context under the **namespaced key
`"vision-board/state"`**, not `state`: a future MCP Apps `hostContext.state` with another meaning
can't collide (the board's methods are already `vision-board/…`, BE_01's naming rule). Change the
contract where BE_01 wrote `hostContext.state` (schema / `AppHostContext` type, apps.md § Host
context and § Saving the panel's state, api.md if it names it) before building on it. AGENT_01 is
writing the skill and calculator against this key in parallel. Also handle `vision-board/save-state`
as its own request in `createAppBridge` (today it falls into the `tools/call` branch), using
`appStateProblem` from `packages/format/src/apps.ts` for the check (one check, rule 1) and
`APP_HOST_NAME` instead of a literal.

## Inputs

- **Files to modify**: `packages/ui/src/app-frame/app-frame-core.ts` (`createAppBridge`: accept the
  save request, check size and shape, answer; put `state` in `hostContext`), `vb-app-frame.ts`
  (`wire` gets `saveState` / `loadState` deps), `apps/board/src/board/app-cards.ts` (wire them to
  the client: in-memory latest per card, debounce, one write in flight, restore from memory first,
  else the client), tests `packages/ui/tests/app-frame-core.test.ts`, page tests, gallery if a
  state shows, `docs/specification/apps.md` (§ The panel protocol table rows), `components.md`
- **Shared artifacts to reuse**: BE_01's constants, schema types and client function; FE_01's frame
  lifecycle. Import them; never copy.
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

## Steps

1. [x] **Tests first**: bridge unit tests (save accepted, oversize refused with the contract's error,
   bad shape refused, `hostContext.state` present / absent); page tests with a test app (or the
   calculator once AGENT_01 updates it — use a fixture app if not yet): save, reload the page →
   restored; the LRU-unloaded ninth-oldest panel restores on return; a save that fails on the server
   shows nothing to the person but the panel's request gets an error.
2. [x] Bridge: validate against the schema (rule 7: validate what comes in), answer per contract.
3. [x] Page: the latest value per card in memory; writes debounced (e.g. 500 ms) with one in flight
   per card and the latest winning; on start, `hostContext.state` from memory, else read once
   through the client before answering `ui/initialize` (bounded wait; on failure, start without).
4. [x] Docs and pattern states; report the gzip delta (200 KB start budget, D-049).

## Validation

- [x] New tests failed first and pass; app page specs pass; `npm test`, `npm run verify` pass

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose, don't edit.
- The maintainer's board on port 4466: never stop, restart or kill it, or any process you didn't
  start. Page tests under the lock: `until mkdir temp/pages.lock 2>/dev/null; do sleep 10; done; …; rmdir temp/pages.lock`.
- Use the Bash tool's working directory rather than `cd path &&`; writes over 50 lines in chunks.

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19

### Changes Made
- Contract first (orchestrator decision): `packages/format/src/apps.ts` `APP_STATE_KEY` (`"vision-board/state"`,
  `APP_HOST_NAME` + `/state`); `AppHostContext[APP_STATE_KEY]?`; apps.md § Host context and § Saving the panel's
  state name the key (no bare `state`); test in `packages/format/tests/apps.test.ts`. The schema and api.md never
  named `hostContext.state`, so they are unchanged.
- Tests first (all failed before): `packages/ui/tests/app-frame-state.test.ts` (9: schema `$defs/save` = the
  check, save accepted as JSON and answered after the page settles, bad shape / not JSON -32602, oversize -32000
  `too-large` in `appStateProblem`'s words, page refusal -32000 `SAVE_WORDS` + problem, no page `not-found`,
  answer dropped after close, key present / absent / failed load, never in host-context-changed, restart
  drops the earlier answer); `apps/board/tests/panel-states.test.ts` (7); three page tests in
  `tests/pages/app-alive.spec.ts` (calculator `12` back after a reload; the cap-unloaded calculator back with `7`
  from memory, one GET; a save the real server refuses (413, via an over-limit body) answers the panel -32000
  `too-large`, no toast).
- Bridge: `app-frame-core.ts` `createAppBridge` handles `PANEL_SAVE_STATE` as its own request (`saveState` option),
  `ui/initialize` waits on `loadState` when given and puts the value under `APP_STATE_KEY`; `hostInfo.name` is
  `APP_HOST_NAME`; shared `liveFrom` / `refusal` with tools/call. Check in new `app-frame-state.ts` `checkSave`
  (keys = `{ state }`, `appStateProblem`/`appStateBytes`, JSON-normalised value), `SAVE_WORDS` (kept core at 300).
- Element: `vb-app-frame.ts` `AppFrameWiring.saveState?` / `loadState?` passed to the bridge.
- Page: new `apps/board/src/board/panel-states.ts` `createPanelStates` (memory per card+app, `SAVE_DELAY_MS` 500
  debounce, one write in flight per card, latest wins, each save answered by the write that carried it; restore
  from memory else one read bounded by `LOAD_WAIT_MS` 2000, a late read never overwrites a newer save).
  `app-cards.ts` `wire` gives each frame `saveState`/`loadState` for (board, card number, app); new dep
  `board()` (controller passes `() => S.id` on its existing line: no line added). `io.ts`: `callAppTool` and
  `savePanelState` share `forPanel` (refusal `{ problem, detail }`), so a save refusal keeps its code; io.ts
  302 -> 301 lines.
- Docs: apps.md (§ Host context key, Restore, new "How the page keeps it", Kept true by); components.md (App card
  6 protocol, `wire` signature, Frames, new "Saved panel states"); `pattern.json` (core files, `wire`);
  `modules.md` regenerated (`npm run map`). The "keep state in a tool" line was already gone from apps.md.

### Issues & Resolutions
- First page run: focus stayed in the calculator after a click, so goToCard's digits went to the panel; the test
  focuses the card first.
- `app-frame-core.ts` reached 308 lines; the save check moved to `app-frame-state.ts` (300 now).

### Deviations from Plan
- None. Verification: `npm test` 1559 + 10 pass; `npm run verify` ok (3 existing length warnings: controller 305,
  io 301, fold 308); `npm run check` clean; page specs app-alive (6), app-cards, app-states, app-follow,
  app-safety, app-gallery, gallery pass (no screenshot baselines changed by this task). Browser check
  (Playwright on the app test server's own port): calculator `4×5`, reload, still `4×5`. Gzip: 153,143 ->
  154,215 bytes (+1,072, 150.6 KB of the 200 KB start budget).

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and your notes section in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append **one** line to `cortex/LOG.md` (ending in a newline):
   `[[YYYY-MM-DD HH:MM]] [board-app] FE_02: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/FE_02_save-and-restore.md]]`
