---
task_name: Plugin Mode
created: 2026-10-31
completed:
status: planned
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
| 1 | SEAM_01 | 1 | strong | Platform engineer who designs host contracts — a seam is only real when the first host can't cheat, so if standalone reaches around it, the seam is wrong. | [The seam, with standalone on it](./SEAM_01_host-seam.md) | Pending | port 6500 |
| 2 | CHROME_01 | 2 | strong | Front-end engineer who moves working UI for a living — a move changes no pixel and no behaviour, and the tests are the proof. | [The controls inside mount](./CHROME_01_controls-in-mount.md) | Pending | port 6600 |
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
| 1 | SEAM_01 | `apps/board/src/board/{host,mount,chat-side}.ts`, `apps/board/src/shell/{page-host,chat-bridge,chat-panel,chat-news}.ts`, `apps/board/server/engine/**`, `apps/board/server/chat*.ts`, `packages/agent/src/claude-stream.ts` and `kiro-turn.ts` (the change's facts), `packages/mcp/**`, tests |
| 2 | CHROME_01 | `apps/board/src/shell/**`, `apps/board/src/board/mount.ts`, `apps/board/src/styles/**`, `apps/board/index.html`, specs that select by page structure |
| 3 | PROOF_01 | `apps/board/src/board/**`, `packages/ui/src/base/layer.ts`, `apps/board/src/board/input/keys.ts`, `packages/ui/src/image-view/**`, `packages/format/schema/openapi.json` (`x-hosts`), generated files, tests |
| 4 | BUILD_01 | `apps/board/vite.plugin.config.ts` (new), `scripts/build-plugin.mjs` (new), `apps/board/plugin/**` (new: the manifest, its schema, the entry, the theme map), `scripts/words-homes.mjs` for the words file, tests |
| 5 | CONTRACT_01 | `docs/specification/plugin.md` (new), `tests/plugin/**` (new) |
| 6 | VERIFY_01 | `VERIFY_01_findings.md`, its task file; no code |

## Implementation Notes

### Wave gates
- 

### Security
- 

### Requests
| From | File | What | Status |
|------|------|------|--------|
