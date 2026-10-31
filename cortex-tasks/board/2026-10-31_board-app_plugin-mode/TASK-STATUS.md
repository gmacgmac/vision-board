---
task_name: Plugin Mode
created: 2026-10-31
completed:
status: in-progress
categories: [board-app, board-agent, board-ui]
skills: [cortex-architecture, cortex-docs]
tracker: [M8, M12, M13, M14, M15, M21, M22, M27]
---

# Plugin Mode - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-10-31

## Instructions for Agents

1. **Read PLAN.md first**, its Decisions above all, then `docs/principles.md`, and consult the `cortex-architecture` skill
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column**
4. **Reuse Shared Foundations**: check that table before writing a helper, type, or component
5. **Touch only the files you own**. Need a change elsewhere? `REQUESTS`
6. **Deviating?** Decide by the principles if it's small and say so; stop if it changes a Decision
7. **Frontmatter `status`**: `planned` → `in-progress` when you start; closing is the orchestrator's
8. **Update your row**; notes in your task file. Re-run? A `Run N:` line here and a `### Run N` block there
9. **No git commits**; never port 4466; never write in `~/ai/nclite`; never `cortex/AUDITED.md`
10. **Tests**: by tier (`cortex-task-exe`); `nice -n 15`, `VB_TEST_WORKERS=3`, your port in Notes; a time limit on every run; no full page suite (orchestrator's); no real CLI
11. **Work in the worktree**, never a scratch copy. Check `git branch --show-current` first

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | SEAM_01 | 1 | strong | Platform engineer who designs host contracts — a seam is only real when the first host can't cheat, so if standalone reaches around it, the seam is wrong. | [The seam, with standalone on it](./SEAM_01_host-seam.md) | Completed | port 6500. Run 2: view half done after ownership widened; the standalone chat is on the seam, `BoardSide` gone |
| 2 | CHROME_01 | 2 | strong | Front-end engineer who moves working UI for a living — a move changes no pixel and no behaviour, and the tests are the proof. | [The controls inside mount](./CHROME_01_controls-in-mount.md) | Completed | port 6600. `boardChromeInMount` on; the off branch is thin; no screenshot changed |
| 3 | PROOF_01 | 3 | strong | Engineer who embeds third-party widgets — anything assuming it owns the page is a bug: storage, keys, modals, globals. | [Nothing assumes it owns the page](./PROOF_01_host-proofing.md) | Pending | port 6700 |
| 4 | BUILD_01 | 4 | standard | Release engineer — one command, one folder, the same bytes every time, and nothing a host must know about how it was made. | [The plugin folder](./BUILD_01_plugin-folder.md) | Pending | port 6800 |
| 5 | CONTRACT_01 | 5 | strong | Integration engineer on the receiving team, with only the spec — if the spec doesn't say it, it doesn't exist. | [The spec and the contract test](./CONTRACT_01_spec-and-test.md) | Pending | port 6900 |
| 6 | VERIFY_01 | 6 | strong | QA engineer new to this project, handed the built folder and the spec — does a host get a whole, working board, and does standalone behave exactly as before? | [Verification](./VERIFY_01_plugin-verification.md) | Pending | port 7000 |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `BoardHost` with `chat`, `BoardView.reveal` with `cards`, the engine's `tools.list` and `tools.call` (`apps/board/src/board/host.ts`, `apps/board/server/engine/`) | SEAM_01 | all |
| The board's controls under `mount` | CHROME_01 | PROOF_01, BUILD_01 |
| `#board`, `#board/styles.css`, `dist/plugin/board/` | BUILD_01 | CONTRACT_01, VERIFY_01 |
| `docs/specification/plugin.md` | CONTRACT_01 | VERIFY_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 0 | orchestrator | `packages/format/src/flags.ts`, `docs/decisions.md`, `modules.md`, `tracker.md`, `package.json`, lockfile |
| 1 | SEAM_01 | `apps/board/src/board/{host,mount,chat-side}.ts`, `apps/board/src/shell/{page-host,chat-bridge,chat-panel,chat-news}.ts`, `apps/board/server/engine/**`, `apps/board/server/chat*.ts`, `packages/agent/src/claude-stream.ts` and `kiro-turn.ts` (the change's facts), `packages/mcp/**`, tests. **Widened at SEAM_01's block (the planner's row was too narrow; alone in its wave, so no clash):** `apps/board/src/board/**`, `apps/board/src/shell/**`, `apps/board/server/**`, `packages/actions/src/answers/**` and `packages/actions/src/index.ts`, `docs/specification/{api,components,chat}.md` |
| 2 | CHROME_01 | `apps/board/src/shell/**`, `apps/board/src/board/mount.ts`, `apps/board/src/styles/**`, `apps/board/index.html`, specs that select by page structure. **Widened before dispatch, after SEAM_01's block:** `apps/board/src/board/**` (the new `chrome/` folder and what it needs), `tests/**`, `scripts/words-homes.mjs` and the verify layer rules if a move needs them, `docs/specification/{components,words}.md`, the default of `boardChromeInMount` in `packages/format/src/flags.ts` |
| 3 | PROOF_01 | `apps/board/src/board/**`, `apps/board/src/shell/page-host.ts` and what the standalone host needs for storage and settings, `apps/board/src/flags.ts`, `apps/board/server/**` for the image route and `x-hosts`, `packages/agent/**` and `packages/mcp/**` for `x-hosts`, `packages/ui/src/markdown/**` (M12's module switches), `scripts/gen-api.mjs` (widened before dispatch), `packages/ui/src/base/layer.ts`, `apps/board/src/board/input/keys.ts`, `packages/ui/src/image-view/**`, `packages/format/schema/openapi.json` (`x-hosts`), generated files, tests |
| 4 | BUILD_01 | `apps/board/vite.plugin.config.ts` (new), `scripts/build-plugin.mjs` (new), `apps/board/plugin/**` (new: the manifest, its schema, the entry, the theme map), `scripts/words-homes.mjs` for the words file, tests |
| 5 | CONTRACT_01 | `docs/specification/plugin.md` (new), `tests/plugin/**` (new) |
| 6 | VERIFY_01 | `VERIFY_01_findings.md`, its task file; no code |

## Implementation Notes

### Wave gates
- Set-up: `boardChromeInMount` added (off until proven). PLAN's `pluginSeam` is not added: SEAM_01 changes no behaviour and deletes `BoardSide`, so there is no off branch for a flag to switch.
- SEAM_01 rulings (orchestrator, by the principles; the maintainer reviews them in the spec): `chat.send(record)`, `chat.status` with optional `agent`, `held`, `staged`, chip kinds `selection` and `answers` with optional `preview`, and a spent chip until its `ref` changes are accepted. The standalone chat's `deliver` must resolve the answers chip through `engine.resolve`, so the first host uses the path another host depends on.
- Wave 1 gate: map, verify, check, gen-api clean; unit green; full page suite 833 passed (13.8m); no screenshot changed.
- Wave 2 gate: map, verify, check, gen-api clean; unit green; full page suite 824 passed, 1 failed (the picker flake, tracker M40, same error at `closest`), 10 budget tests not run as a result; `chat-panel.spec.ts` then 36/36 with `--repeat-each=3`, and `perf.spec.ts` with its dependencies 831 passed (9.1m). `boardChromeInMount` on. No screenshot re-baselined.

### Security
- 

### Requests
| From | File | What | Status |
|------|------|------|--------|
| SEAM_01 | `apps/board/src/board/controller.ts`, `controller/board-types.ts` | Drop `side`/`BoardSide`; `Board` gives `mount` what it reads (selection, drawn data, ledger, past version, zoom to cards, jump, stepper link) | Done, Run 2 |
| SEAM_01 | `apps/board/src/board/status.ts` | `chatWork` (and Send's held and staged) in `BoardStatus`, so `chat.status` drives the mark | Done, Run 2 |
| SEAM_01 | `apps/board/src/board/words/board.ts` | The chip labels ("N answers", "N selected") the view now makes | Done, Run 2 |
| SEAM_01 | `apps/board/src/shell/App.svelte`, `chat-panel-types.ts` | One bridge given to `createPageHost`; no `bridge.board(v.board.side)`, no `chat.boardSend(v.send)`, no `work` dep | Done, Run 2 |
| SEAM_01 | `apps/board/server/handlers.ts` | `engine.route(req, { caller, signal })` | Done, Run 2 |
| SEAM_01 | `packages/actions/src/answers/chips.ts`, `src/index.ts` | `selection` and `answers` chip kinds and their `resolveChip` | Done, Run 2 |
| SEAM_01 | `docs/specification/modules.md` | `npm run map`: `#mcp`'s public API changed (`verify` fails until then) | Done (wave 1 gate) |
| SEAM_01 | `docs/specification/api.md` (159) | `tools` is now `list` and `call` in MCP's shapes, with `_meta` `vb/change` | Done, Run 2 |
| SEAM_01 | `docs/specification/components.md`, `chat.md` | Their `BoardSide` and `addToChat` claims, once the view half lands | Done, Run 2 |
| SEAM_01 | `docs/specification/plugin.md` | Standalone-only ways round the seam left after SEAM_01 (`MountedBoard.board`, `EngineOptions.onSend`, `engine.ledger`, `engine.agents`): state or remove | Routed to CONTRACT_01 |
| CHROME_01 | `docs/specification/modules.md` | `npm run map`: `board/chrome/` and the moved files | Open (orchestrator) |
| CHROME_01 | `packages/format/src/flags.ts` | `adaptiveHeader`'s description names `shell/header-tier.ts`; it is `board/chrome/header-tier.ts` | Open (orchestrator) |
| CHROME_01 | `.kiro/steering/svelte-conventions.md` | § Where Svelte is used says "only the app around the board"; `board/chrome/` is Svelte inside the board (protected, propose) | Open (orchestrator) |
| SEAM_01 | `apps/board/plugin/**`, `scripts/build-plugin.mjs` | The engine imports `#agent` and `#mcp` by their roots (tree-shaking); `TOOLS_FILE` is read from disk beside its module | Routed to BUILD_01 |
