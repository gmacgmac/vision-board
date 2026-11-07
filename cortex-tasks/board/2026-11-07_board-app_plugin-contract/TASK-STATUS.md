---
task_name: The Board Built to the Host's Plugin Contract
created: 2026-11-07
completed: 2026-11-07
status: completed
categories: [board-app, board-agent, board-security, board-ui, project-docs]
tracker:
---

# The Board Built to the Host's Plugin Contract - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-11-07

---

## Instructions for Agents

1. **Read PLAN.md first**: its Goal State and Decisions above all.
2. **Read notes from completed tasks** before starting yours.
3. **Respect the Wave column.**
4. **Reuse Shared Foundations**; import, never reinvent.
5. **Touch only the files you own**; anything else goes under `REQUESTS`.
6. **If you need to deviate, STOP and report** (`DEVIATION`).
7. **Update your row** below when you finish, and add notes to your task file.
8. **No git commits.** nclite is read-only.

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | API designer for embeddable components — a host may rely only on what the page says, and every promise has a test behind it. | [Contract first](./T_01_contract-first.md) | Completed | Seam 2 written down; 15 cited tests await BE_01/BE_02/FE_01 (task notes list them); D-096 drafted |
| 2 | BE_01 | 2 | strong | Platform engineer integrating third-party plugins — one shape at the seam, no adapter, and a type check that fails the build the day the shapes drift. | [Seam 2 shapes](./BE_01_seam-2-shapes.md) | Completed | Seam 2 (`SEAM_TYPES` 4937e920…); B1/B2/B4 + view `singleAgent`; contract test by identity; "the bot: singleAgent" is `test.fixme` for BE_02; T_01-R5 done |
| 3 | BE_02 | 3 | strong | Security engineer — a switch that loosens a check is a liability until it is off by default, narrow, and proven to leave the lock and the person's decisions alone. | [Engine switches](./BE_02_engine-switches.md) | Completed | `callerOf` (engine.ts) the one place; no grants/scoping, lock and read-only kept; `followOtherWriters` gates `follow`; 7 tests; "the bot: singleAgent" un-fixmed; `PluginChange` kept |
| 4 | FE_01 | 3 | standard | Front-end engineer for embeddable widgets — a guest's styles reach only its own elements, and the page looks identical after the rewrite. | [Scoped stylesheet](./FE_01_scoped-stylesheet.md) | Completed | 151 selectors nested under their vb anchor (same reach, same weight); nclite `checkStylesheet` 0 problems; root `position` is `:where(&)` nested, no mount.ts call; T_01-R2 done; guards' old form kept in shell.css for the gallery |
| 5 | T_02 | 4 | strong | Prompt engineer — every byte in a prompt rides every turn, and a cut is proven by the evals, not by reading. | [Skill description and size](./T_02_skill-size.md) | Completed | Plugin `skill.md` 27,641 → 8,178 B (≤ 8 KiB); final eval 75/75 twice; $4.96 in all; description one line (SKILL.md v3.32, standalone 19/19); `show_layout` redraw rule in its description; harness: no sign-up under `singleAgent` |
| 6 | VERIFY_01 | 5 | standard | Integration engineer at the host app, with no builder context — vendor it, delete the adapter, and nothing breaks. | [Final verification](./VERIFY_01_testing.md) | Completed | Gates green (verify, 2435 tests, plugin 103, pages 1008); browser look clean; one blocking finding: sheet reads `--app-w/--app-h/--region` (R1) |
| 7 | FE_02 | 6 | standard | Front-end engineer for embeddable widgets — a guest reads only what it owns. | [The sheet reads only its own properties](./FE_02_sheet-reads-own-properties.md) | Completed | 3 custom properties renamed `--vb-*`; nclite check 0 problems with no `reads`; gates green |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `docs/specification/plugin.md` for seam 2 (every member, the flags, the change line, the bot) | T_01 | BE_01, BE_02, FE_01, T_02, VERIFY_01 |
| Flags `singleAgent` (default off) and `followOtherWriters` (default on) in `packages/format/src/flags.ts` | T_01 | BE_01 (view), BE_02 (engine) |
| Change words `board.change.board|card|cards` (a words file under `apps/board/plugin/words/`) | T_01 | BE_01 |
| Contract fixture `tests/plugin/contract/plugin-host.ts` + its `README.md` (source path, nclite commit, sha256, the one change) | T_01 | BE_01, VERIFY_01 |
| `CHANGE_META` key `plugin/change`, one home in the board's code (named by T_01, made by BE_01) | BE_01 | VERIFY_01 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `docs/specification/plugin.md`, `docs/specification/api.md`, `packages/format/src/flags.ts` (+ its test), new words file(s) under `apps/board/plugin/words/`, `tests/plugin/contract/*`, `tests/plugin/spec-truth.test.ts` only if a rule must move |
| 2 | BE_01 | `apps/board/plugin/*` (view, engine, seam, manifest, schema), `apps/board/bin/plugin-*.ts`, `apps/board/server/engine/tools.ts`, `apps/board/src/board/*` (host, mount, controller, chat-side, live), `apps/board/src/shell/*`, `packages/actions/src/answers/*`, `packages/agent/*` only if needed, `tests/plugin/**` (but `contract/`), `tests/pages/board-host-*`, `apps/board/tests/plugin-*.test.ts`, `apps/board/tests/engine.test.ts` (change meta), chat-bridge tests |
| 3 | BE_02 | `apps/board/server/engine/*` (but `tools.ts`), `apps/board/server/write-*.ts`, `apps/board/server/ledger.ts`, `apps/board/server/visibility.ts`, `packages/actions/src/permissions.ts`, `packages/format/src/ledger-index.ts` only if needed, new tests under `apps/board/tests/` for the switches |
| 3 | FE_01 | `apps/board/src/styles/*.css`, `packages/ui/src/**/*.css`, `scripts/verify-style.mjs` (+ test), `apps/board/src/board/chrome/Toolbar.svelte`, a new page spec for the root's position |
| 4 | T_02 | `skills/vision-board/SKILL.md`, `apps/board/plugin/words/skill-edits.ts`, `apps/board/server/words/plugin-tools.ts`, `packages/format/schema/openapi.json` tool descriptions (+ `npm run gen` output), `apps/board/tests/plugin-skill.test.ts` |
| 5 | VERIFY_01 | report only; fixes go back as REQUESTS |
| — | orchestrator | `docs/decisions.md`, `docs/principles.md`, `package-lock.json`, `dist/`, the set's LOG entry, the nclite handover |

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| T_01-R1 | T_01 | `package.json`: `npm test` glob `tests/plugin/**/*.test.ts` so the contract fixture test runs | orchestrator | Done |
| T_01-R2 | T_01 | `apps/board/tests/plugin-build.test.ts`: "the built sheet stays in its scope" (cited by plugin.md) | FE_01 (owns that test in wave 3) | Done |
| T_01-R3 | T_01 | `docs/principles.md` § The board is a plugin: contradicts Decision 1, names the folder differently | orchestrator (maintainer's yes) | Done (point 496) |
| T_01-R4 | T_01 | `docs/decisions.md`: D-096 from T_01's notes | orchestrator (maintainer's yes) | Done (point 496) |
| T_01-R5 | T_01 | A `write_board` that appended nothing still gets a change line (count 0): leave it out | BE_01 (and the spec line) | Done |
| BE_01-R1 | BE_01 | `apps/board/server/engine/engine.ts`: `EngineChange` a type alias, so `PluginEngine` picks `watch` again in place of `plugin/engine.ts` `PluginChange` | BE_02 (may then drop `PluginChange` in `plugin/engine.ts`) | Done (alias; `PluginChange` kept: see BE_02 notes) |
| BE_01-R2 | BE_01 | `tests/plugin/tools.spec.ts` "the bot: singleAgent": `test.fixme` → `test` once the engine switch lands | BE_02 (granted that file) | Done |
| BE_01-R3 | BE_01 | `docs/specification/components.md` § The host's chat: `record(null)`, `status.agent` ignored under `singleAgent`, `reveal`/`hasLine` `{ board, cards: n }` | orchestrator | Done |
| BE_01-R4 | BE_01 | nclite handover: hand back exactly the acks `resolve` gave (`[]` leaves the answers chip spent until another answer) | orchestrator (handover) | Open |
| BE_02-R1 | BE_02 | `apps/board/server/project.ts`: the standalone server must not pass `singleAgent` / `followOtherWriters` from `VB_FLAGS` to its engine | orchestrator | Done (`#format` `HOST_FLAGS`, `withoutHostFlags`; flags.test "the host-only flags never reach") |
| BE_02-R2 | BE_02 | Drop `PluginChange` for `Engine['watch']` (moves `SEAM_TYPES` and plugin-types.test) | — | Declined: optional, no behaviour; seam stays as built |
| BE_02-R3 | BE_02 | nclite handover: under `singleAgent` the bot writes on the person's own boards without a grant (the lock is the guard); never open one folder both standalone and in a host | orchestrator (handover) | Open |
| BE_02-R4 | BE_02 | plugin.md § The bot: the join label is clipped to 80 characters, blank → folder name | orchestrator | Done (with the one-folder-one-host line and the standalone flag rule) |
| FE_01-R1 | FE_01 | plugin.md § A guest: top-level rules hold the first-compound rule; nested rules are under their parent | orchestrator | Done (subject held by review, said) |
| FE_01-R2 | FE_01 | Neither check reads a selector's subject (`.vb-a { & + p {…} }` would pass): nclite's rule to tighten if wanted | orchestrator (handover) | Open |
| T_02-R1 | T_02 | plugin.md § The bot "Words differ per host": the skill is cut per section to what a host's bot needs, ≤ 8 KiB, evals before a change | orchestrator | Done |
| T_02-R2 | T_02 | words.md skill-edits row: cut per section, not only what it loses | orchestrator | Done |
| T_02-R3 | T_02 | nclite handover: the board row can drop `skillBytes: 28672`; evals ran with `singleAgent,-followOtherWriters,botToolRules` | orchestrator (handover) | Open |
| VERIFY_01-R1 | VERIFY_01 | Built `board.css` reads `--app-w`, `--app-h`, `--region`: nclite refuses them without the adapter's `css.reads`; rename to `--vb-*` in `packages/ui` (setters `node-app-apply.ts`, `vb-region.ts`; readers `app-frame.css`, `node-app.css`, `node.css`, `region.css`, `region-narrow.css`, pattern.json) and make the plugin-build test run `checkStylesheet` with no `reads` | FE_02 (wave 6) | Done |
| T_02-R4 | T_02 | A `singleAgent` edit set for the MCP instructions and `write_board`'s description (no grants, no `app` cards) | — | Deferred: a prompt change of its own, with evals; follow-up |

---

## Implementation Notes

### Wave gates

- **Wave 1** (T_01): Completed. spec-truth test 1 red on 15 titles waiting on wave 2/3 (listed in T_01 notes), as planned. One out-of-ownership row in `docs/specification/words.md` (the words test needs it): accepted.
- **Wave 2** (BE_01): Completed. `npm test` 2424/2425 (spec-truth test 1, on wave-3 citations only), test:plugin 102 + 1 fixme, chat/host page specs 41/41. Out-of-row edits forced by renamed types (`packages/actions` index and test, `live-read-only.test.ts`, plugin.md's T_01-R5 sentence, `modules.md` by `npm run map`): accepted. The drift check runs in `npm test`, not the build (the fixture is a test file): accepted.
- **Wave 3** (BE_02, FE_01): Completed. Gate run by the orchestrator: `npm run verify` ok, `npm test` 2435/2435 + timing 14/14. FE_01 ran the full page suite (997 + 1 flake passing alone) and test:plugin 103. FE_01's real count was 151 selectors (nclite's report prints 10 "and N more"), done by CSS nesting; its edit of `apps/board/plugin/color-scheme.css` (BE_01's folder, idle): accepted. BE_02-R1 done by the orchestrator (`withoutHostFlags`).
- **Wave 4** (T_02): Completed. Plugin `skill.md` 27,641 → 8,178 B; live `eval:bot` 75/75 twice (baseline 74/75), standalone 19/19, $4.96 in all. Eval host now signs nobody up under `singleAgent` (id `bot-0123456789abcdef`). spec-truth, plugin-skill, words tests 24/24 after the orchestrator's doc edits.
- **Wave 5** (VERIFY_01): Completed. All gates green (pages 1008/1008); every adapter piece shown unneeded but `css.reads` (R1). Browser look clean, light and dark.
- **Wave 6** (FE_02, from R1): Completed. `--vb-app-w`, `--vb-app-h`, `--vb-region`. Final gate by the orchestrator on a fresh `dist/plugin`: nclite `checkStylesheet(css, { scope: 'vb' })` with no `reads`: 0 problems; seam 2; `changeWords` 3; `skill.md` 8,178 B; `npm run verify` ok; `npm test` 2435/2435 + 14/14; `npm run test:plugin` 103/103; full page suite 997 passed + the 10 performance budgets passed (`--no-deps`); one pixel check (`host-styles.spec.ts` "the gallery's samples … (dark)", 4 px against 2, 2.2 min under load) failed once and passed alone and in VERIFY_01's full run: a load flake.

