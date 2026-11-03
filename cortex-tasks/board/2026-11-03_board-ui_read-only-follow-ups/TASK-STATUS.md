---
task_name: Read-only Follow-ups
created: 2026-11-03
completed:
status: in-progress
categories: [board-ui, board-tokens, board-agent, project-tooling]
skills: [cortex-architecture, cortex-docs]
tracker: cortex-tasks/tracker.md#N44, #N45, #M51, #M52, #M53, #M54
---

# Read-only Follow-ups - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-11-03 · **Checkpoint**: tag `ledgers/done`

## Instructions for Agents

1. Read PLAN.md (Decisions, House Rules), `docs/principles.md`, and the `cortex-architecture` skill
2. Work in the worktree your brief names; check `git branch --show-current` first
3. Touch only the files you own (File Ownership); a need elsewhere goes under `REQUESTS`
4. Your row here and one LOG line: in the main checkout. No git commits. Never port 4466
5. Tests by tier (`cortex-task-exe`), `nice -n 15`, `VB_TEST_WORKERS=3`, your `VB_TEST_PORT`, a time limit on every run

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | FE_01 | 1 | standard | Interaction designer — a control that can't act looks it, and says why, before anyone presses it. | [Write controls while read-only](./FE_01_read-only-controls.md) | Completed | Allow all/Allow/Refuse, Remove access, Allow app and Stop app, card tips paused with the reason; own spec, gallery section |
| 2 | FE_02 | 1 | strong | Front-end engineer who owns page state — what the server says decides what the page shows, and one person's settings never leak into another place. | [Ledger chip and page memory per ledger](./FE_02_ledger-chip-and-memory.md) | Completed | Ledger parts are getters over the server's folder (M51); `pageStore` keyed by `ledgerScope`, `main` keeps `vb.<key>`; the board mounts after the folder read (M52). 2 requests |
| 3 | T_02 | 1 | standard | Test engineer — a check fails only for a real difference, never for how a pixel was rounded. | [Whole-pixel host-styles shots](./T_02_whole-pixel-shots.md) | Completed | Whole-pixel clip in sameUnderHost; 3 green runs, deliberate rule fails |
| 4 | BOT_01 | 1 | strong | Evaluation engineer for agents — an instruction counts as working when a scored run shows it, not when one hand check did. | [Standalone bot eval](./BOT_01_standalone-eval.md) | Completed | `eval:bot -- --standalone`: 3 scenarios, standalone 52/54 over 9 runs (`other-ledger/done-only` 1/3: SKILL.md finding), plugin 48/48; $1.4685 |
| 5 | T_01 | 3 | standard | Accessibility engineer — reading text reads, in every theme, on every surface it sits on. | [Subtle ink to the reading tier](./T_01_subtle-ink-contrast.md) | Run 1 done, BLOCKED for the maintainer's yes | Run 1: `--vb-ink-subtle` dark `#b8b8c0` (darkest same-hue at Lc 60 on every text surface; 60.1 on deep, 60.9 on the Note chip, 63.0 on card); light unchanged. Awaiting the yes for Run 2. |
| 6 | FE_03 | 2 | standard | Interaction designer — a tool shows where the person is working, and stays reachable by keyboard everywhere else. | [Rail icons only on the container in use](./FE_03_rail-on-hover.md) | Completed | `railOnHover`: frame `data-rail-hover` + `data-use` (board's `bindRegionUse`, the cards are a layer above the frames); hidden = opacity 0 incl. the row's box; new spec `container-rail-hover.spec.ts` red first then green; touched files outside the wave-2 ownership row (request); `npm run verify` fails on 200.4 KB gzip (base 200.0, already failing) |
| 7 | BOT_02 | 2 | strong | Prompt engineer who treats instructions as code — every line earns its place by a scenario, and a change that breaks another case is reverted. | [Bot wording: no recap, one-line mismatch](./BOT_02_skill-wording.md) | Completed | SKILL v3.29, 3 standalone-only lines (plugin skill byte-identical); `join-ledger` `one-line` check. Final text: `other-ledger/done-only` 3/3 (base 0/2), `join-ledger` 2/2 (base 1/2 short-chat); plugin 47/48 then `refusals` 5/5 on re-run (unchanged text); $1.9631 |
| 8 | FE_02 Run 2 | 2 | strong | (FE_02's) | [`main` memory per folder (decision 11)](./FE_02_ledger-chip-and-memory.md) | Completed | Run 2: every `pageStore` key carries folder and ledger (`ledgerScope`: the path for `main`); an old `vb.<key>` is read once by `main` of the open folder, then moved. Last-board keys already follow; its global `vb.lastBoard` fallback doesn't (request). Base fails the page budget (200.0 KB) |
| 9 | T_03 | 3 | strong | Performance engineer — the page loads what the person needs first; a budget is met by moving weight, never by moving the line. | [The board page back under its budget](./T_03_page-weight-headroom.md) | Pending | |
| 10 | FE_02 Run 3 | 3 | strong | (FE_02's) | [Last board per folder, read once (FE_02-R3)](./FE_02_ledger-chip-and-memory.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Ports

| Task | `VB_TEST_PORT` | Task | `VB_TEST_PORT` |
|---|---|---|---|
| FE_01 | 6100 | BOT_01 | 6400 (eval's door: 6010) |
| FE_02 | 6200 | T_01 | 6500 |
| T_02 | 6300 | orchestrator | 7300 |
| FE_03 | 6600 | BOT_02 | 6700 (eval's door: 6010) |
| T_03 | 6800 | FE_02 Run 3 | 6200 |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Read-only state and words: `BoardState.readOnly`, `blockedReason` (`shell/chat-rules.ts`), `READ_ONLY_PERSON` (`packages/actions/src/read-only.ts`), `#ui` paused (`packages/ui/src/paused/paused.ts`) | earlier set | FE_01 |
| Ledger page parts (`board/host.ts` `ledgerChip` / `ledgerField` / `ledgerRow`), `header-tier.ts` `ledger`, `get_project` `ledger` / `ledgers` | earlier set | FE_02 |
| Eval harness: `Stage` (incl. `readOnly`), checks, report (`tests/evals/bot/`) | earlier sets | BOT_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`, `package.json`, the lockfile, `packages/format/src/flags.ts`, `.git/**` |
| 1 | FE_01 | `apps/board/src/board/chrome/{AccessRequests,BoardAgents}.svelte`, `apps/board/src/board/access/**`, `apps/board/src/board/words/chrome-access.ts`, card toolbar files F10 names in `apps/board/src/board/**` (not `chrome/` header files below), `packages/ui/**`, `apps/board/src/gallery/**` except `ledger-section.ts`, new `tests/pages/read-only-controls.spec.ts` and the access/agents/app specs it must update |
| 1 | FE_02 | `apps/board/src/shell/**`, `apps/board/src/board/host.ts`, `apps/board/src/board/chrome/{Toolbar,ToolbarEnd,ToolbarMenu,HeaderFields}.svelte`, `chrome/header-tier.ts`, `apps/board/src/gallery/ledger-section.ts`, `tests/pages/{ledgers,header-tiers,last-board}.spec.ts` and a new spec of its own, `tests/pages/{board-page,folder-server}.ts`, `docs/specification/{components,words}.md` |
| 1 | T_02 | `tests/pages/host-styles.spec.ts` |
| 1 | BOT_01 | `tests/evals/bot/**`, `skills/vision-board/scenarios.md`, `skills/vision-board/NOTES.md` |
| 2 | FE_03 | `packages/ui/src/region/**`, `apps/board/src/gallery/rail-section.ts`, `tests/pages/container-rail*.spec.ts` and a new spec of its own |
| 2 | BOT_02 | `skills/vision-board/**`, `apps/board/plugin/words/skill-edits.ts`, `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/**` |
| 2 | FE_02 Run 2 | `apps/board/src/shell/{kept,page-host}.ts`, `apps/board/tests/kept.test.ts`, `tests/pages/ledger-memory.spec.ts`, `docs/specification/components.md` |
| 3 | T_01 | as wave 2's row above, plus `apps/board/src/board/chrome/ProposalsBar.svelte`, `apps/board/src/styles/access.css`, `apps/board/src/gallery/ledger-section.ts`, every screenshot under `tests/pages/__screenshots__/**` that changes (FE_03's included) |
| 3 | T_03 | `packages/format/src/flags.ts` (granted this wave), `docs/specification/performance.md`, and the page code the measurement points to: `apps/board/src/shell/**` except `page-host.ts` and `folder.ts`, `apps/board/src/board/**` except `chrome/ProposalsBar.svelte`, `packages/**` except `packages/tokens/**` and `packages/ui/src/base/dialog.css`; specs of what it moves |
| 3 | FE_02 Run 3 | `apps/board/src/shell/{page-host,folder}.ts`, `tests/pages/last-board.spec.ts`, `apps/board/tests/kept.test.ts`, `tests/pages/ledger-memory.spec.ts` |
| 3 (was 2) | T_01 | `packages/tokens/src/tokens.css` (after the maintainer's yes), `packages/tokens/README.md`, `packages/ui/src/base/dialog.css`, `tests/pages/__screenshots__/**` it must re-take, `docs/specification/components.md` (FE_01's doc requests) |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| FE_01-R1 | FE_01 | `docs/specification/components.md`: AccessRequests `readOnly` (Allow all / Allow / Refuse paused, title `READ_ONLY_PERSON`); BoardAgents `readOnly` (Remove access paused); `#ui` `explainPaused` and the app card's Allow / Stop app paused; `button.css` `.vb-btn[data-paused]` quiet look; the gallery section "Write controls on a read-only ledger" | T_01 Run 2 | Open |
| FE_01-R2 | FE_01 | `apps/board/src/board/chrome/ProposalsBar.svelte`: Accept all gets `data-paused={readOnly \|\| undefined}` for the quiet look | T_01 Run 2 (added to its ownership) | Open |
| FE_01-R3 | FE_01 | `apps/board/src/styles/access.css`: "Allow all" wraps at 600 px; `white-space: nowrap` on `.vb-access-allow-all` | T_01 Run 2 (added to its ownership) | Open |
| FE_02-R1 | FE_02 | `apps/board/src/gallery/ledger-section.ts` meta line → "on by default · off with ?flags=-ledgerFolders"; re-take `tests/pages/__screenshots__/ledgers.spec.ts/ledgers-{light,dark}-darwin.png` | T_01 Run 2 (screenshots are its) | Open |
| FE_02-R2 | FE_02 | `packages/format/src/flags.ts` `ledgerFolders` comment: the page reads it only for gallery samples | orchestrator | Done (wave 1 gate) |
| BOT_01-R1 | BOT_01 | `skills/vision-board/SKILL.md`: after a summary from another ledger the standalone bot recaps the cards in the chat (other-ledger/done-only 1 of 3); on a ledger mismatch it offers the other ledger in 3-4 sentences (one line, no offer, is the rule); then `eval:bot -- --standalone` | maintainer (point 417) | Open |
| FE_02-R3 | FE_02 Run 2 | `apps/board/src/shell/page-host.ts` (`opened`, `wanted`) and `folder.ts` `lastBoardKey`: the global `vb.lastBoard` is still written on every open and read as the last fallback, so folder B can open folder A's last board of the same id; make it read once into the folder's key, as `pageStore`; drop `lastBoardKey`'s `\|\| f.path`; `last-board.spec.ts` follows | FE_02 Run 3 (wave 3) | Open |
| FE_02-R4 | FE_02 Run 2 | The board page is 200.0 KB gzip at the wave 2 base, over the 200 KB budget (`verify` fails) | T_03 (wave 3; 200.6 KB after wave 2) | Open |
| FE_03-R1 | FE_03 | `docs/specification/components.md` tool-rail section: `railOnHover`, `data-rail-hover` (render option `railHover`), `data-use` from `bindRegionUse` (`apps/board/src/board/canvas/region-use.ts`); hidden unless in use, rest strength in use, full on the rail; badge shows; touch shows; held by `tests/pages/container-rail-hover.spec.ts` | T_01 Run 2 (wave 3) | Open |
| FE_03-R2 | FE_03 | Screenshots `tests/pages/__screenshots__/container-rail-states.spec.ts/rail-{light,dark}-darwin.png` changed (the section grew) | T_01 Run 2 (wave 3) | Open |

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

### Wave gates (orchestrator)
- Setup: `feat/ro-follow-ups` cut from `main` (after `ledgers/done` and the 403-406 commit). T_01 Run 1 (measure only, writes nothing but its notes) runs beside wave 1, so the maintainer's yes on the token value comes early; its Run 2 (the write) stays wave 2.
- Wave 1: FE_01, FE_02, T_02, BOT_01 and T_01 Run 1 merged (no conflict). Orchestrator: `ledgerFolders` comment (FE_02-R2). `map` (no change), `verify` ok, `check` 0 errors, `gen --check` current, `build`, `npm test` 2365/0, `test:plugin` 83/83. Accepted: FE_01 touched `BoardChrome.svelte` (one prop) and one selector in `read-only.spec.ts`, unowned this wave; FE_02 read decision 4 literally (`main` keeps the old keys, so `main` boards of two folders still share as before; other ledgers keyed by folder and ledger). T_01 Run 1 proposes `#b8b8c0` (maintainer point 415). BOT_01 spend $1.47; two SKILL.md habits to the maintainer (417). Tag `ro-follow-ups/wave-1`.
- Wave 2: FE_03, BOT_02, FE_02 Run 2 merged (no conflict). Gate order fixed from here: `build` before `verify` (earlier gates measured the previous build; `ledgers/done` and `ro-follow-ups/wave-1` re-measured fresh: both pass). `map` (no change), `check` 0 errors, `gen --check` current, `npm test` 2366/0, `test:plugin` 83/83; `verify` fails only on the page weight (200.6 KB; 200.0 at the base, tipped by the `railOnHover` description) → T_03. Accepted: FE_03 edited `board/canvas/{draw,render,region-use}.ts`, `controller.ts`, `gallery/main.ts` and two specs outside its row (the cards are a layer above the frames: hover needs `bindRegionUse`); BOT_02's SKILL v3.29 is live on merge (the main checkout is on this branch), eval passed both modes ($1.96). Tag `ro-follow-ups/wave-2`.
- Wave 3 and close:

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`; tracker rows N44, N45, M51, M52, M53, M54 deleted.
2. Set LOG entry: `[[YYYY-MM-DD HH:MM]] [board-ui] Completed set: Read-only Follow-ups → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/TASK-STATUS.md]]`
3. Merge `feat/ro-follow-ups` into `main`, tag `ro-follow-ups/done`.
