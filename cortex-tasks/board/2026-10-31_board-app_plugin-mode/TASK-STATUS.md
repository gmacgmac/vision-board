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
| 3 | PROOF_01 | 3 | strong | Engineer who embeds third-party widgets — anything assuming it owns the page is a bug: storage, keys, modals, globals. | [Nothing assumes it owns the page](./PROOF_01_host-proofing.md) | Completed | port 6700. M12, M13, M15, M21, M22, the image route and the zoomed view; `BoardHost` gains optional `store` and `imageRoute`, the engine `image`; no screenshot changed |
| 4 | BUILD_01 | 4 | standard | Release engineer — one command, one folder, the same bytes every time, and nothing a host must know about how it was made. | [The plugin folder](./BUILD_01_plugin-folder.md) | Completed | port 6800. `npm run build:plugin` (`apps/board/bin/build-plugin.ts`, not `scripts/`: verify); engine reads nothing beside itself (BUILD-R1); skill and tool words per host (BUILD-R2); standalone's build byte-identical |
| 5 | CONTRACT_01 | 5 | strong | Integration engineer on the receiving team, with only the spec — if the spec doesn't say it, it doesn't exist. | [The spec and the contract test](./CONTRACT_01_spec-and-test.md) | Completed | port 6900. `docs/specification/plugin.md`; `npm run test:plugin`, 46 tests on the built folder, beside nclite's Svelte 5.56.1; CONTRACT-R1 to R6 done. Run 2: a tip open at `unmount` leaves nothing (`whenGone`), `staged` really optional (`markAttached`), the pill under the controls, `tsconfig`, `api.md` 160; no screenshot moved |
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
| 4 | BUILD_01 | `apps/board/vite.plugin.config.ts` (new), `scripts/build-plugin.mjs` (new), `apps/board/plugin/**` (new: the manifest, its schema, the entry, the theme map), `scripts/words-homes.mjs` for the words file, tests. **Widened before dispatch:** `apps/board/src/board/index.ts` or wherever `#board` points, `package.json` scripts and `imports` (`#board`, `#board/styles.css`, `#board/engine`, `build:plugin`; no new dependency), `.gitignore` if `dist/` needs it, `skills/vision-board/SKILL.md` (the plugin's variant and its drift test), the words in `packages/format/schema/openapi.json` tool descriptions if the plugin's bot would be told wrong, `docs/specification/words.md`, `apps/board/README.md` |
| 5 | CONTRACT_01 | `docs/specification/plugin.md` (new), `tests/plugin/**` (new). **Widened before dispatch:** `docs/specification/{images,components}.md`, `apps/board/src/styles/**` for the window-sized caps |
| 6 | VERIFY_01 | `VERIFY_01_findings.md`, its task file; no code |

## Implementation Notes

### Wave gates
- Set-up: `boardChromeInMount` added (off until proven). PLAN's `pluginSeam` is not added: SEAM_01 changes no behaviour and deletes `BoardSide`, so there is no off branch for a flag to switch.
- SEAM_01 rulings (orchestrator, by the principles; the maintainer reviews them in the spec): `chat.send(record)`, `chat.status` with optional `agent`, `held`, `staged`, chip kinds `selection` and `answers` with optional `preview`, and a spent chip until its `ref` changes are accepted. The standalone chat's `deliver` must resolve the answers chip through `engine.resolve`, so the first host uses the path another host depends on.
- Wave 1 gate: map, verify, check, gen-api clean; unit green; full page suite 833 passed (13.8m); no screenshot changed.
- Wave 2 gate: map, verify, check, gen-api clean; unit green; full page suite 824 passed, 1 failed (the picker flake, tracker M40, same error at `closest`), 10 budget tests not run as a result; `chat-panel.spec.ts` then 36/36 with `--repeat-each=3`, and `perf.spec.ts` with its dependencies 831 passed (9.1m). `boardChromeInMount` on. No screenshot re-baselined.
- Wave 3 gate: map, verify, check, gen-api clean; unit green; full page suite 832 passed, 1 failed (`host-styles` pane comparison, dark: the toolbar's hidden status text differed between passes, load 13 to 19), 10 budget tests not run as a result; `host-styles.spec.ts` then 24/24 with `--repeat-each=3`; budgets run alone. No screenshot re-baselined.
- Wave 4 gate (normal tier, standalone's build byte-identical, so the page suite waits for wave 6): map, verify, check, gen-api, unit.
- Wave 5 gate: map, verify, check, gen-api, unit, test:plugin 51 clean; full page suite 842 passed, 1 failed (`perf.spec.ts` selecting 50, tracker M29, under the full run); budgets then re-run alone. No screenshot re-baselined.
- After wave 5: `boardChromeInMount` and its off branch removed before VERIFY_01, so it checks the final code (check, verify, unit, test:plugin 51, 8 page specs 96). `perf.spec.ts` selecting 50 given 90 s: the test takes about 26 s alone at low priority against the default 30 s, and its budget is the counts (M29's cause).

### Security
- PROOF_01, `x-hosts` (M15): `engine.tools` gives exactly what the table marks `plugin`. `join` is `standalone`: the host names its bot and `tools.call` takes the caller only from `ctx`, so a minted secret is useless and all `join` could do is write ledger lines naming agents, with a label the bot chooses. `request_grant` is for both: `needs-grant` happens under any host, it only asks, and granting is the person's click. `list_apps` is `standalone`: the app host stays with the standalone server. `read_attachment` is `standalone` (D-068 ruling 6). No tool edits the ledger directly or answers ✓, ✗ or an approval: those are `x-agent: false`, and `x-hosts` on one stops the build.
- PROOF_01, `engine.image`: holds a picture to the standalone route's checks (`images.ts` `openImage`), reads only `dir`'s images folder, and sends the svg policy and no-sniff itself, since a host's server has no header of ours.

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
| SEAM_01 | `docs/specification/plugin.md` | Standalone-only ways round the seam left after SEAM_01 (`MountedBoard.board`, `EngineOptions.onSend`, `engine.ledger`, `engine.agents`): state or remove | Done (CONTRACT_01) |
| CHROME_01 | `docs/specification/modules.md` | `npm run map`: `board/chrome/` and the moved files | Open (orchestrator) |
| CHROME_01 | `packages/format/src/flags.ts` | `adaptiveHeader`'s description names `shell/header-tier.ts`; it is `board/chrome/header-tier.ts` | Open (orchestrator) |
| CHROME_01 | `.kiro/steering/svelte-conventions.md` | § Where Svelte is used says "only the app around the board"; `board/chrome/` is Svelte inside the board (protected, propose) | Open (orchestrator) |
| PROOF_01 | `docs/specification/modules.md` | `npm run map`: `shell/kept.ts` moved, `#ui`'s public API changed (`setMarkdown*` gone, `MarkdownOptions` in) | Open (orchestrator) |
| PROOF_01 | `packages/format/src/flags.ts` | `svgImages`'s description names `setMarkdownSvg`; say "by the board's Markdown, as its host's settings say" | Open (orchestrator) |
| PROOF_01 | `docs/specification/images.md` | Row "Off (`svgImages`)": the page's flag reaches the renderer through `renderMarkdown`'s `svg`, not `setMarkdownSvg`; § the route: another host answers it with the engine's `image` | Open (orchestrator) |
| PROOF_01 | `apps/board/README.md` | § the renderer (125, 126) names `setMarkdownImages` and `setMarkdownSvg`: the flags now reach it per board, `board/host.ts` `markdownOf` | Open (orchestrator) |
| PROOF_01 | `apps/board/src/styles/{header,key-help,proposals}.css` | Window-sized caps in a host's pane: `100dvh` and `100vh` caps (`.vb-menu-surface`, `.vb-keys-body`) need the root's height (the root's container is inline-size only, so no `cqh`), and `100vw` in `key-help.css` and `proposals.css` can be `100cqw` | Open, non-blocking |
| PROOF_01 | `scripts/gen-tools.mjs` | `x-hosts` could move from `gen-api.mjs` into `toolTable` | Open, non-blocking |
| SEAM_01 | `apps/board/plugin/**`, `scripts/build-plugin.mjs` | The engine imports `#agent` and `#mcp` by their roots (tree-shaking); `TOOLS_FILE` is read from disk beside its module | Routed to BUILD_01 |
| PROOF_01 | `docs/specification/modules.md` | `npm run map` | Done (wave 3 gate) |
| PROOF_01 | `flags.ts`, `apps/board/README.md`, `docs/specification/images.md` (the `setMarkdownSvg` row) | Stale names of the removed switches | Done (orchestrator) |
| PROOF_01 | `docs/specification/images.md` § The route | Another host answers it with the engine's `image` | Done (CONTRACT_01) |
| PROOF_01 | `apps/board/src/styles/{header,key-help,proposals}.css` | `100dvh`, `100vh`, `100vw` caps assume the window: a host's pane needs the root's size (`100cqw`; the height needs the root's height, since its container is inline-size only) | Done (CONTRACT_01) |
| PROOF_01 | `scripts/gen-tools.mjs` | Move the `x-hosts` reader from `gen-api.mjs` | Closed: it works, a test holds it, tidy only |
| PROOF_01 | `docs/decisions.md` | Draft entry for `x-hosts`, `store`, `imageRoute`, `engine.image` | For the maintainer in the morning (new entries need their yes) |
| PROOF_01 | `cortex-tasks/tracker.md` | M12, M13, M15, M21, M22 done | Orchestrator, at set close |
| PROOF_01 | the skill and tool descriptions | The skill tells a bot to call `join`; `write_board` says "from `list_apps`"; `list_open` and `check_responses` say "with your secret": wrong for a plugin bot, whose caller is the host's | Routed to BUILD_01 (what the plugin ships) |
| PROOF_01 | `docs/specification/plugin.md` | A host sets `appCards` off unless it hosts apps; skips a key with `defaultPrevented`; a capture-phase listener runs first; its CSP must allow `imageRoute`; a page holds one version of the plugin (custom elements are global); the zoomed view is a real modal, so the page is inert while open | Done (CONTRACT_01) |
| SEAM_01 | `apps/board/plugin/**`, `scripts/build-plugin.mjs` | The engine bundle depends on tree-shaking; `TOOLS_FILE` read beside its module | Done (BUILD_01): `treeshake.moduleSideEffects: false`, `server/format-files.ts` swapped for embedded data; a test runs the engine alone under Node's permission model |
| PROOF_01 | the skill and tool descriptions | `join`, `list_apps`, "with your secret" are wrong for a plugin bot | Done (BUILD_01): `skill.md` and the engine's tool list are per host (`plugin/words/skill-edits.ts`, `server/words/plugin-tools.ts`); standalone's words untouched; `plugin-skill.test.ts` |
| BUILD_01 | `docs/specification/modules.md` | `npm run map`: `#board` names, `board/index.ts`, `bin/build-plugin.ts`, `plugin/`, `server/format-files.ts` | Open (orchestrator) |
| BUILD_01 | `docs/specification/plugin.md` | State: the folder's parts and exports; the manifest has no `settings` or `icon` (the board declares none); the theme's three `--host-*` properties and that colours follow `color-scheme`; the plugin skill and tool words differ from standalone's; a page holds one built version | Done (CONTRACT_01) |
| BUILD_01 | `plugin.md`, the plugin skill | Pictures: the plugin skill has no Images section, since a bot cannot be told the folder `engine.image` reads (`<dir>/images`) and a host's bot may not reach it. A host that wants pictures needs a way to tell its bot where to put one | For the maintainer (a decision), CONTRACT_01 states it |
| BUILD_01 | `docs/decisions.md` | Draft: **the plugin folder is built from `apps/board/bin/build-plugin.ts`; what a plugin bot is told is the standalone words less listed edits, held by a test** (`skill-edits.ts`, `plugin-tools.ts`) | For the maintainer in the morning |
| BUILD_01 | `cortex-tasks/tracker.md` | M14 done (`#board`, the folder) | Orchestrator, at set close |
| BUILD_01 | `scripts/verify.mjs` | None needed: the build lives in `apps/board/bin/` because verify refuses `scripts/` importing an app. If the maintainer wants `scripts/build-plugin.mjs` as the PLAN named it, the rule needs a named exception | Non-blocking |
| BUILD_01 | `docs/specification/modules.md` | `npm run map` | Done (wave 4 gate) |
| BUILD_01 | `docs/specification/plugin.md` | The folder's parts and exports, no `settings` or `icon`, the three `--host-*` properties, per-host skill and tool words, one built version per page | Done (CONTRACT_01) |
| BUILD_01 | Pictures | A plugin bot's skill has no Images section, because no folder can be named for it; `engine.image` reads `<dir>/images` | For the maintainer: `plugin.md` Open point 1, with a recommendation |
| BUILD_01 | `docs/decisions.md` | Draft: the build's home in `apps/board/bin/`, and a plugin bot's words as standalone's less listed edits | For the maintainer in the morning |
| BUILD_01 | `cortex-tasks/tracker.md` | M14 done | Orchestrator, at set close |
| CONTRACT_01 | `packages/ui/src/tip/hover-tip.ts` | A hover tip open at `unmount` leaves `dismissable`'s two listeners on the document (also its grace timer): the same for the key help, a card's popover, a container's title and a link mark | Done (CONTRACT_01 Run 2) |
| CONTRACT_01 | `tsconfig.json` | Add `tests/plugin/**/*.ts` to `include` | Done (CONTRACT_01 Run 2) |
| CONTRACT_01 | `apps/board/src/board/host.ts` | `ChatStatus`'s comment says a board with only `now` works, "with Send enabled only by what the board itself holds", but the selection chip is the board's own and doesn't enable Send. | Done (CONTRACT_01 Run 2): the board counts its own chip |
| CONTRACT_01 | `packages/ui/src/selection-bar/selection-bar.css` | The "1 selected" pill paints over "⋯" and the key help when they overlap, seen in a short pane | Done (CONTRACT_01 Run 2): `--vb-z-open` |
| CONTRACT_01 | `docs/specification/api.md` (160) | Name what the folder's `createEngine` takes: `dir`, `name`, `warn`, `flags`; `ledger` and `onSend` are standalone's | Done (CONTRACT_01 Run 2) |
| CONTRACT_01 | `docs/decisions.md` | Draft: **the folder's entries give a host exactly what `plugin.md` says, and the root is a size container, so what opens caps by the pane**; text in the task's Run 2 notes | For the maintainer in the morning |
| CONTRACT_01 | `docs/specification/modules.md` | `npm run map`: `plugin/view.ts`, `plugin/engine.ts` | Open (orchestrator) |
| CONTRACT_01 | VERIFY_01, set gate | Add `npm run test:plugin` (the page suite does not run it) | Open (orchestrator) |
| CONTRACT_01 | `packages/tokens/src/tokens.css` | `--vb-z-selection` is now unused, and the `--vb-z-lasso` comment lists the selection bar (protected: propose removing it and fixing the comment) | For the maintainer, non-blocking |
| CONTRACT_01 | `packages/tokens/src/tokens.css` | `--vb-z-selection` unused; `--vb-z-lasso`'s comment | For the maintainer (protected) |
| CONTRACT_01 | `docs/decisions.md` | Draft in the task's Run 2 notes | For the maintainer in the morning |
