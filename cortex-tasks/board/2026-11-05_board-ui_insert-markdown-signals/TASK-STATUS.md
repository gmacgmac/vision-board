---
task_name: Insert, Markdown and Update Signals
created: 2026-11-05
status: in-progress
categories: [board-actions, board-ui, board-tokens, board-app, board-agent]
skills: [cortex-architecture, cortex-docs]
---

# Insert, Markdown and Update Signals - Task Status

> **Plan**: [PLAN.md](./PLAN.md) · **Created**: 2026-11-05 · **Checkpoint**: tag `insert-md/start`

## Instructions for Agents

1. Read PLAN.md (Decisions, House Rules), `docs/principles.md`, and the `cortex-architecture` skill
2. Work in the worktree your brief names; check `git branch --show-current` first
3. Touch only the files you own (File Ownership); a need elsewhere goes under `REQUESTS`
4. Your row here and one LOG line: in the main checkout. No git commits. Never port 4466
5. Tests by tier (`cortex-task-exe`), `nice -n 15`, `VB_TEST_WORKERS=3`, your `VB_TEST_PORT`, a time limit on every run

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | ACT_01 | 1 | strong | API designer for agents — one item does one thing a person would name, all or nothing, and a refusal says exactly what to fix. | [Insert a card into a flow](./ACT_01_insert-into-flow.md) | Completed | `insert` on the node item, `inserted` in the result; R1 done: the engine passes the flag |
| 2 | MD_01 | 1 | strong | Typesetter for small screens — a heading tells you where you are, a table reads at a glance, and nothing scrolls sideways. | [Heading sizes, tables, breaks](./MD_01_markdown-more.md) | Completed | Fixed table layout (auto + anywhere broke short words); gallery fixture card 61 is now a table; 3 screenshot sets + flag wiring under REQUESTS |
| 3 | FE_01 | 1 | strong | Visual designer for monitoring screens — what changed is the brightest thing on the board until you've looked, then it steps back. | [Updated in amber; the agent's reply edge](./FE_01_update-signals.md) | Completed | `--vb-state-updated` light-dark(#a66800, #ffc21a); requests FE_01-R1..R3 |
| 4 | FE_02 | 1 | strong | Interaction designer — a two-state setting is one control that shows its state and flips on a press. | [Read-only as one toggle](./FE_02_read-only-toggle.md) | Completed | Toggle behind `readOnlyToggle`; new spec `read-only-toggle.spec.ts`; old spec pinned to flag off; requests: editing.css fill, words, components.md |
| 5 | BOT_01 | 2 | strong | Prompt engineer who treats instructions as code — every line earns its place by a scenario. | [Bot instructions and check_responses](./BOT_01_skill-and-reads.md) | Completed | SKILL v3.30, 4 eval scenarios; eval plugin 73/74, standalone 37/38 (narration flake); $7.21; reworded reason breaks 2 unit tests + 4 page specs not owned: REQUESTS |
| 6 | VERIFY_01 | 2 | strong | A product manager using the board daily on a dark screen, with no builder context — scans a busy board for what changed. | [Review the set](./VERIFY_01_review.md) | Completed | 3 blocking: light amber ≈ action amber (token, maintainer); `read-only-controls.spec.ts` "last" selector; card NEW tab pink. Docs and 46 screenshots done |

| 7 | FIX_01 | 3 | strong | Visual designer for monitoring screens — what changed is the brightest thing on the board until you've looked, then it steps back. | [Wave 2 findings and signal follow-ups](./FIX_01_findings.md) | Completed | Light `--vb-state-updated` #d66e00 (ΔE76 ≥ 20 from action, changed, flag, risk; Lc 45.6 on deep); hover keeps amber; NEW tab and "N new" chip teal (`newTone`); frame replies muted; tables as a content-sized grid; ~30 specs' gallery shots re-taken (shift); read-only* shots and dot/template under REQUESTS |
| 8 | FIX_02 | 3 | strong | Content designer — the words name what the person sees on the screen, the same in every place they appear. | ["Switch to Editing" everywhere](./FIX_02_edit-wording.md) | Completed | Words, tests, schema (`makes it editable`), docs; key `readOnlySwitchToEditing`; 4 screenshots; `live-read-only.test.ts` quotes the chat words: REQUEST |
**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

## Ports

| Task | `VB_TEST_PORT` | Task | `VB_TEST_PORT` |
|---|---|---|---|
| ACT_01 | 7100 | BOT_01 | 7500 (eval's door: 6010) |
| MD_01 | 7200 | VERIFY_01 | 7600 |
| FE_01 | 7300 | orchestrator | 7900 |
| FE_02 | 7400 | FIX_01 | 7700 |
| FIX_02 | 7800 | | |

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| Flags `insertBetween`, `markdownMore`, `updateSignals`, `readOnlyToggle` (on) | orchestrator, SETUP | ACT_01, MD_01, FE_01, FE_02 |
| `insert` on the node item, its result and refusals | ACT_01 | BOT_01 |
| Heading sizes, tables (≤ 4 columns), breaks | MD_01 | BOT_01 |
| `--vb-state-updated` | FE_01 | VERIFY_01 (reports the value) |
| Write result (`key`, `n`, `title`), `list_open` | earlier sets | BOT_01 |

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| — | orchestrator | `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`, `package.json`, the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`, `.git/**` |
| 1 | ACT_01 | `packages/format/schema/events/node.schema.json`, `packages/format/schema/api/write-*.schema.json`, `packages/format/schema/openapi.json`, every output of `npm run gen` (`*.generated.*`, `packages/mcp/src/tools.generated.json`, `packages/cli/src/commands.generated.ts`, `docs/specification/api-reference.md`), `apps/board/server/write-*.ts`, `apps/board/server/examples.ts`, the server's words file for write refusals, `packages/actions/src/**`, `docs/specification/api.md`, unit tests of these, a new page spec of its own if one is needed |
| 1 | MD_01 | `packages/ui/src/markdown/**`, `packages/ui/src/words/markdown.ts`, `packages/ui/tests/markdown*`, `packages/layout/src/size.ts` and its tests, `apps/board/src/gallery/markdown-section.ts`, a new `tests/pages/markdown-more.spec.ts`, `docs/specification/components.md` |
| 1 | FE_01 | `packages/tokens/src/tokens.css` (the one token), `packages/tokens/README.md`, `packages/ui/src/node/**`, `packages/ui/src/region/region-fresh.*`, `packages/ui/src/note-bubble/**`, `packages/ui/src/words/{node-notes,node-updates,note-bubble}.ts` and the region-fresh words, `apps/board/src/board/{cards,canvas}/**`, gallery `{fresh,updates,note-bubble,group-notes,node}-section.ts`, `tests/pages/{fresh-cards,card-updates,notes,note-polish,group-note}.spec.ts` and a new spec of its own |
| 1 | FE_02 | `apps/board/src/shell/{EditChip.svelte,editing.ts}`, `apps/board/src/shell/words/editing.ts`, `apps/board/src/board/chrome/**`, `apps/board/src/board/host.ts`, gallery `{editing,read-only-controls,header,toolbar}-section.ts`, `tests/pages/{read-only,read-only-writes,read-only-controls,header-tiers}.spec.ts` and a new spec of its own |
| 1 | FE_01 (granted by orchestrator) | one line each: `apps/board/src/board/controller.ts` (the `data-update-signals` toggle beside `data-fresh-cards`), `apps/board/src/gallery/main.ts` (the matching gallery line, and the new last section with its import), new `apps/board/src/gallery/update-signals-section.ts`, `packages/ui/src/region/vb-region.ts` (`applyFresh`: `fillFreshPill` and its import) |
| 3 | FIX_01 | `packages/ui/src/markdown/markdown.css` (table widths), `tests/pages/markdown-more.spec.ts`, `tests/pages/__screenshots__/{markdown-more,gallery}.spec.ts/*` it changes, `packages/tokens/src/tokens.css` (`--vb-state-updated` light value and its mixes only), `packages/tokens/README.md`, `packages/ui/src/node/node-popover.css`, `tests/pages/update-signals.spec.ts`, `docs/specification/components.md`, `apps/board/src/gallery/{update-signals,editing,fresh,updates}-section.ts`, `packages/ui/src/region/region-note.css`, `packages/ui/src/node/node-steps.css`, the toolbar's "N new" chip files in `apps/board/src/board/chrome/**`, and whatever VERIFY_01's blocking findings name (the orchestrator lists them in the brief); the specs and screenshots those touch |
| 3 | FIX_02 | `apps/board/tests/{api-read-only,ledger-move}.test.ts`, `tests/pages/{read-only,read-only-writes,read-only-controls,read-only-toggle}.spec.ts` and their screenshots, `apps/board/server/words/server-chat.ts`, `apps/board/src/shell/words/{chat,editing}.ts`, `apps/board/src/gallery/read-only-controls-section.ts`, `packages/format/schema/api/common.schema.json` and every output of `npm run gen`, `docs/specification/{api,plugin}.md`, `packages/actions/src/{read-only.ts,words/actions-refusals.ts}` and the readers of the renamed key; a `gallery.spec.ts` screenshot its words change goes under REQUESTS (FIX_01 owns those) |
| 1 | each | the screenshots of the specs it owns, under `tests/pages/__screenshots__/` |
| 2 | BOT_01 | `packages/actions/src/words/actions-refusals.ts` and `apps/board/server/words/server-folders.ts` (FE_02-R2 wording only), `skills/vision-board/**`, `apps/board/plugin/words/skill-edits.ts`, `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/**`, `packages/format/schema/openapi.json` (descriptions) and every output of `npm run gen` |
| 2 | VERIFY_01 | `tests/pages/{header-tiers,ledgers,read-only}.spec.ts` (FE_01-R1 selectors only), `docs/specification/**` except `modules.md` and `api-reference.md` (doc requests), any screenshot under `tests/pages/__screenshots__/` the merged wave changed and no wave-1 task re-took; findings only for code |

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| ACT_01-R1 | ACT_01 | `apps/board/server/engine/writes.ts` `writeBoard`: pass `flagOn('insertBetween', ctx.flags)` to `writeItems` so flag off refuses `insert` | ACT_01 (granted, wave 1) | Done |
| FE_02-R1 | FE_02 | `apps/board/src/styles/editing.css`: the toggle's on state takes the shared pressed look, so on and off differ clearly in dark; APCA again | FE_02 (granted, wave 1) | Done |
| FE_02-R2 | FE_02 | "press Edit" no longer matches what a sighted person sees with the toggle on: `packages/actions/src/words/actions-refusals.ts` `readOnlyPressEditTo`, `apps/board/server/words/server-folders.ts`, `skills/vision-board/SKILL.md`: reword so it reads true with the toggle (and off) | BOT_01 (files added to its ownership) | Done (BOT_01) |
| FE_02-R3 | FE_02 | `docs/specification/components.md` EditChip / EditButton: the toggle under `readOnlyToggle` | VERIFY_01 | Done |
| FE_02-R4 | FE_02 | Accessible name "Edit" (constant, `aria-pressed`) vs the visible "Read-only" / "Editing": WCAG 2.5.3 half met | maintainer (at close) | Open |
| MD_01-R1 | MD_01 | `apps/board/src/flags.ts` `pageMarkdown`: `more: flagOn('markdownMore', flags)` | MD_01 (granted, wave 1) | Done |
| MD_01-R2 | MD_01 | `apps/board/src/board/host.ts` `markdownOf`: `more: flagOf(host, 'markdownMore')` | MD_01 (granted, wave 1; FE_02 done) | Done |
| FE_01-R1 | FE_01 | `tests/pages/{header-tiers,ledgers,read-only}.spec.ts` "the section is last": exclude `[data-feature="updateSignals"]` (the new last gallery section) | VERIFY_01 (files added to its ownership) | Done |
| FE_01-R2 | FE_01 | Re-take `gallery.spec.ts` "screenshot of each section" and `parking-replies.spec.ts` gallery screenshots (the replies' amber edges) | VERIFY_01 | Done |
| FE_01-R3 | FE_01 | `packages/ui/src/region/region-note.css` `.vb-nblock-reply`: the muted amber edge under `[data-update-signals]`, as card replies (container replies stay grey on the frame) | FIX_01 (wave 3) | Open |
| MD_01-R3 | MD_01 | `apps/board/src/board/cards/size.ts` `tierOf`: the flag as `sizeTier`'s `tables` argument | orchestrator after merge (FE_01's branch has no `tables` argument) | Done (`tierOf` takes `tables`, `draw.ts` passes `d.markdown?.more`) |
| MD_01-R4 | MD_01 | `packages/format/fixtures/gallery.ledger.jsonl` card 61: a 5-column table as the "outside the subset" example | MD_01 (granted, wave 1) | Done |
| MD_01-R5 | MD_01 | Re-take `gallery.spec.ts` `markdown-*`, `gallery-node-*`, `size.spec.ts` `node-size-*` after merge | VERIFY_01 | Done |
| ACT_01-R2 | ACT_01 | `write_board`'s tool description names `insert`; `LIST_CAP` (`packages/mcp/tests/tools.test.ts`) now 32,000, about 150 characters left | BOT_01 | Done (BOT_01) |
| VERIFY_01-R1 | VERIFY_01 | Light `--vb-state-updated` `#a66800` reads as the action amber (ΔE76 9.0, darker); `update-signals.spec.ts` checks light too | FIX_01 item 5 (value reported; maintainer may change it, point 429) | Open |
| VERIFY_01-R2 | VERIFY_01 | `tests/pages/read-only-controls.spec.ts` gallery "last" selector skips `updateSignals` | FIX_02 item 2 | Open |
| VERIFY_01-R3 | VERIFY_01 | `packages/ui/src/node/node-popover.css` card NEW tab pink, pill "new" teal | FIX_01 item 4 | Open |
| VERIFY_01-R4 | VERIFY_01 | FIX_01's file carried ACT_01's Run 1 notes | orchestrator | Done |
| VERIFY_01-R5 | VERIFY_01 | `update-signals-section.ts` box shorter than its cards; `editing-section.ts` meta says `readOnlyStart` off | FIX_01 item 7 | Open |
| VERIFY_01-R6 | VERIFY_01 | Findings 7 (selecting one card clears the container's pill while its cards keep their tabs, D-054) and 11 (two links entering one card: one label not drawn) | tracker N48, N49 | Done |
| VERIFY_01-R7 | VERIFY_01 | Finding 4: a `#` heading (18px, 680) is bigger than the card's title (15px, 550) | maintainer (at close) | Open |
| BOT_01-R1 | BOT_01 | Tests quoting the reworded sentences: `api-read-only.test.ts`, `ledger-move.test.ts`; `tests/pages/{read-only,read-only-writes,read-only-controls}.spec.ts` `REASON`; re-take `read-only-toggle` screenshots | FIX_02 item 1 | Open |
| BOT_01-R2 | BOT_01 | "press Edit" left in `server-chat.ts`, `shell/words/{chat,editing}.ts`, `read-only-controls-section.ts`, `common.schema.json` `readOnly`, `docs/specification/{api,plugin,components}.md` | FIX_02 item 3 (components.md: FIX_01 item 6) | Open |
| BOT_01-R3 | BOT_01 | Rename `readOnlyPressEditTo` with its words file | FIX_02 item 4 | Open |
| BOT_01-R4 | BOT_01 | `eval:bot` not green every run: chat narration, mostly `summary-card` `done-only`, about 1 in 3, present on v3.29 too; spend $7.21, over the $6 budget | maintainer (at close) | Open |
| FIX_02-R1 | FIX_02 | `apps/board/tests/live-read-only.test.ts` regex follows "Switch to Editing" | FIX_02 (granted, wave 3) | Done |
| FIX_02-R2 | FIX_02 | Rename `readOnlyPressEdit` (`shell/words/editing.ts`) and its reader `stateTip` (`shell/editing.ts`) | FIX_02 (granted, wave 3) | Done |
| FIX_02-R3 | FIX_02 | Comments in `board-state.ts`, `status.ts`, `lock-flow.ts`, `problem.schema.json` `$comment` say "presses Edit" | FIX_02 (granted, wave 3) | Done |
| FIX_02-R4 | FIX_02 | `apps/board/src/gallery/editing-section.ts` description says "presses Edit"; `read-only` and `read-only-toggle` screenshots then re-taken | FIX_01 (text, done), FIX_01 Run 2 (screenshots, on the merged branch) | Open |
| FIX_02-R5 | FIX_02 | `components.md` quote of `stateTip`: "Read-only: switch to Editing to change this ledger" | FIX_01 item 6 | Done |
| FIX_01-R1 | FIX_01 | Re-take `read-only`, `read-only-toggle`, `read-only-controls`, `read-only-writes` screenshots on the merged branch | FIX_01 Run 2 | Open |
| FIX_01-R2 | FIX_01 | `apps/board/src/styles/header.css` `.vb-count-dot`: the narrowest bar's "new" dot still pink; teal under `updateSignals`. Also the toolbar's "N updated" chip for other boards still pink: amber (Decision 10) | FIX_01 Run 2 | Open |
| FIX_01-R3 | FIX_01 | `region-template.ts` `nblockRepliesMarkup`: a container's reply is never marked unseen (no "seen" rule for containers yet), so it shows only the muted edge | tracker N47 | Done |
| FIX_01-R4 | FIX_01 | `docs/specification/modules.md`: `chip-tone.ts` | closed: modules.md names modules, not chrome files; `verify` passes | Closed |

**Status Values**: `Open` | `Done` | `Closed`

## Implementation Notes

_Each task's notes are in its own file._
