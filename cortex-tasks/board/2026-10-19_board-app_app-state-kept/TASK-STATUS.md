---
task_name: Apps Keep Their State - Panels Stay Loaded, Save and Restore
created: 2026-10-19
completed: 2026-10-19
status: completed
categories: [board-app, board-format, board-security, board-agent]
tracker:
---

# Apps Keep Their State - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Go**: given 2026-10-19 (maintainer: 40B and 40C, "ensure the
> design meets our architecture principles") · **Branch**: `feat/app-cards`

---

## Instructions for Agents

1. **Read PLAN.md first** to understand full context
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component
5. **If you need to deviate, STOP and inform the user**
6. **Update frontmatter `status`** per `cortex-task-exe`'s Task-Set Frontmatter Lifecycle
7. **Update your row** in the Task List table below when you finish
8. **Add implementation notes** to your task file and brief notes here
9. **No git commits** throughout these tasks
10. **The maintainer may have a board open** on port 4466: never stop or restart it; page tests use
    their own servers, run under the lock `temp/pages.lock`

---

## Task List

| # | ID | Wave | Model | Task | Status | Notes |
|---|-----|------|-------|------|--------|-------|
| 1 | BE_01 | 1 | strong | [State contract, route and store](./BE_01_state-contract-and-store.md) | Completed | `vision-board/save-state`, `get_panel_state`/`put_panel_state`, `io.ts` `panelState`/`savePanelState` |
| 2 | FE_01 | 1 | strong | [Panels stay loaded, frozen off screen](./FE_01_panels-stay-loaded.md) | Completed | Loaded once; frozen (inert, unpainted) off screen / far; LRU cap 8; new versions keep the frame |
| 3 | FE_02 | 2 | strong | [Panels save and restore their state](./FE_02_save-and-restore.md) | Completed | Key `APP_STATE_KEY` (`vision-board/state`); bridge save + restore; `panel-states.ts`; +1.0 KB gzip |
| 4 | AGENT_01 | 2 | standard | [Skill: save state, top padding; calculator example](./AGENT_01_skill-app-state.md) | Completed | Skill v3.10, scenario 33, calculator saves `{ sum, answer }` |
| 5 | VERIFY_01 | 3 | standard | [Final verification](./VERIFY_01_testing.md) | Completed | All 7 criteria ticked; all suites green; 3 doc findings, no code defects |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| The state message's name and schema (`packages/format/schema/`, constant in `packages/format/src/apps.ts`), `APP_LIMITS.stateBytes`, `hostContext.state` | BE_01 | FE_02, AGENT_01 |
| The page↔server route in `openapi.json` and its `packages/client` call | BE_01 | FE_02 |
| The frame lifecycle: load once, freeze / thaw, LRU unload (`app-cards.ts`, `vb-app-frame.ts`) | FE_01 | FE_02 |

---

## Implementation Notes

### BE_01: State contract, route and store
_Status:_ Completed  
_Notes:_ MCP Apps has no state mechanism (future work; ext-apps issue 417), so a board-own request
`vision-board/save-state` (`PANEL_SAVE_STATE`, in `PANEL_METHODS`), params `{ state }`, answer `{}`; naming
rule `APP_HOST_NAME` + `/` (apps.md). One schema `app/panel-state.schema.json` (file, save, saved, read,
written). `appStateProblem` is the one size/JSON check (use it in the bridge). Route `GET|PUT
/api/boards/{board}/nodes/{n}/panel-state` (`get_panel_state` -> `{ state? }`, `put_panel_state` -> `{ bytes }`,
413 too-large). Page: `io.ts` `panelState(board, n)`, `savePanelState(board, n, state)`. For FE_02: the bridge
currently routes the new method into its tools/call branch; add the handler, `hostContext.state`
(absent when none) and its tests to apps.md § Kept true by. Shared atomic write: `server/atomic-file.ts`.

---

### FE_01: Panels stay loaded, frozen off screen
_Status:_ Completed  
_Notes:_ For FE_02: `app-cards.ts` `place()` is the lifecycle (load first time on screen and near, `freeze()`/`thaw()` otherwise, unload for no-panel state, card gone, or `overCap` past `LIVE_PANELS`); a panel restarts only after the cap, a reload or a no-panel state, so restore hooks there. `vb-node.ts` `render` keeps a loaded frame through a new version (`node-app-apply.ts` `renderKeepingPanel`). A kept panel never reloads by itself, so `onLoad`'s list_apps read now comes mostly from selection (app-follow deleted-folder test changed to select). Gallery full-page baselines updated (text only). `app-frame-core.ts` untouched.

---

### FE_02: Panels save and restore their state
_Status:_ Completed  
_Notes:_ Contract: `APP_STATE_KEY` = `"vision-board/state"` in `packages/format/src/apps.ts`, `AppHostContext`, apps.md
(no `hostContext.state` left; schema/api.md never named it). Bridge handles `vision-board/save-state` itself
(`app-frame-state.ts` `checkSave`: schema shape + `appStateProblem`; -32602 / -32000 `too-large` / -32000
`SAVE_WORDS` + page problem) and waits on `loadState` for `ui/initialize`. Page: `panel-states.ts` (memory, 500 ms
debounce, one write in flight, latest wins, bounded 2 s restore), wired in `app-cards.ts` `wire` (new dep `board`,
controller line edited, no line added); `io.ts` `forPanel` shared by `callAppTool`/`savePanelState` (301 lines).
For VERIFY_01: page tests in `app-alive.spec.ts` (reload, cap, refused save); no baselines changed; gzip +1,072 B.

---

### AGENT_01: Skill: save state, top padding; calculator example
_Status:_ Completed  
_Notes:_ Skill v3.10 teaches `vision-board/save-state` (`{ state }`) and restore from
`hostContext["vision-board/state"]` (orchestrator's key, not `state`), 12 px top padding, no state in a
tool. Calculator saves `{ sum, answer }` (400 ms debounce, failed save ignored) and restores it when
the shape is right; the repo copy is byte-equal. Scenario 33 and NOTES.md dry run (read-through only).
Kiro picks the skill up on the next board start. Left for others: `apps.md`'s "keep state in a tool"
line; if FE_02 ends up with another key name, SKILL.md, scenarios 33 and the calculator need the same change.

---

### VERIFY_01: Final Verification
_Status:_ Completed  
_Notes:_ Suites (19:3x, nothing else running, lock held): `npm test` 1559 + 10 timing pass, `npm run check` 0 errors,
`npm run verify` ok (3 warnings), `npm run test:pages` **573 passed, 0 failed** (12.2 min; `board.spec.ts`
screenshots pass in the full run, so no HEAD worktree was needed). Criteria: (1) `app-alive.spec.ts` test 1 (far
zoom, pan 3 widths, new version, relayout, selection, size; loaded once); (2) tests 3 and 5 (cap of 8 unloads the LRU,
which restarts with its saved value; `app-live-cap.test.ts`); (3) test 4 (reload) and my own browser walk on port 4489
(calculator "125": same after zoom out/in, pan away/back with window mark and one document load, and after reload the
sum came back with the mark gone; file `.visionboard/app-state/1.json` = `{v,app,state}`; no console errors);
(4) test 2 and walk (frozen: `inert`, `visibility: hidden`, 40 Tabs never reach the frame, `elementFromPoint` over it
is not the iframe); (5) route, own server: oversize 413 `too-large` (limit exactly 65536 passes, 65538 refused; body over
128 KB 413), text/plain and no type 415, bad JSON 400, no/extra `state` 422, bad board ids (`..`, `%2e%2e`, `%00`,
space, 300 chars, `\`) 400/404, bad card numbers 400/404, plain card/unknown card/board 404, wrong method 405, foreign
Origin and foreign Host on PUT 403 (Host also on GET), look-alike Origin 403, agent Bearer and no credentials 403
(GET and PUT); a saved marker string is absent from `get_board`, `show_node`, `check_responses`, `list_open`,
`list_boards`, `list_apps` (agent and person), `GET /api/ledger`, `ledger.jsonl`, and the agent write answer; a symlink
or over-limit file reads as `{}`; no stray temp files; no MCP tool or `vb` command exists for the route
(`tools.generated.json` only changed `apiVersion` 1.29.0). (6) Skill v3.10 and calculator (12 px `main` padding,
`save-state`, restore, repo copy equal): `repo-example-app.test.ts`, skill tests, read-through. (7) above.
Findings, none blocking: (a) `apps/board/README.md` (flagged doc, not edited) still says the frame is "loaded only
on screen and zoomed in enough, ruling 14"; (b) `io.ts` is now 301 lines, a new `verify` warning (controller.ts 305 was
already 305 at HEAD; fold.ts is not ours); (c) a GET of the route with a foreign Origin (and a valid cookie) answers,
as every GET does (`guard.ts` checks Origin on writes, Host on all), unreadable by a foreign page (no CORS headers);
`{ "state": null }` is stored as a value (reads back `{"state":null}`), per "any JSON value". Fixed one garbled
sentence in `components.md` (frame bullet, "handed to `saveState` as JSON"). D-050 is still not in
`docs/decisions.md` (waits for the maintainer's yes); the set's frontmatter and LOG line are the orchestrator's.
Scratch scripts were in `temp/verify01/` and are removed.

---

## On Completion

1. Frontmatter: `status: completed`, `completed: YYYY-MM-DD`.
2. Append the set LOG entry, one line:
   ```
   [[YYYY-MM-DD HH:MM]] [board-app] Completed set: Apps Keep Their State → Task: [[cortex-tasks/board/2026-10-19_board-app_app-state-kept/TASK-STATUS.md]]
   ```
