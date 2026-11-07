# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Prove the Goal State as a host would meet it, and run the project's full gates once.

---

## Context

You are the host's integration engineer: you have the board's folder, nclite's contract and docs, and no knowledge of
how the board was built. **Read previous task notes in TASK-STATUS.md before starting.** Report; do not fix. A
problem goes back as a REQUEST naming the owner's file.

---

## Inputs

- **Files to reference**: PLAN Goal State and Success Criteria; `docs/specification/plugin.md`;
  `tests/plugin/contract/plugin-host.ts`; nclite (read-only) `docs/plugins.md`, `shared/plugin-adapters/board.ts`,
  `engine/plugins/stylesheet.ts`.
- **Skills**: `cortex-docs` (the doc audit of plugin.md and api.md against the code).

---

## Steps

1. [ ] Gates: `npm run verify`, `npm test`, `npm run test:plugin`, then the full page suite once
   (`VB_TEST_PORT=9900 VB_TEST_WORKERS=3 nice -n 15 npm run test:pages`, time-limited). Report every failure with its
   output; say which are known flakes, with evidence.
2. [ ] For each adapter piece in nclite's `shared/plugin-adapters/board.ts`, show it is no longer needed: the board's
   build gives what the contract expects (a short script in `temp/`, against `dist/plugin/board`).
3. [ ] nclite's `checkStylesheet` on `dist/plugin/board/view/board.css`: 0 failures. `skill.md` size in bytes.
4. [ ] A host with `singleAgent` on and a bot id that never joined (e.g. `bot-0123456789abcdef`) writes a board, writes
   on a board the person made, reads its answers; the same write on a locked board is refused. With the switch off,
   standalone behaviour is unchanged (existing specs).
5. [ ] Look in a browser: standalone (`npm run board` on your own port, not 4466, a temp project folder) and the fake
   host (`tests/plugin/fake-host/`), light and dark: the toolbar narrow and wide, a change line in the fake host's chat
   and its reveal, Send.
6. [ ] Doc audit: every promise in plugin.md § The view, § The engine, § The bot, § Tools, § The manifest names a test
   that exists and passes (spec-truth does part; check the rest by reading).

---

## Validation

- [ ] Every Success Criterion in PLAN.md ticked or reported.

---

## Implementation Notes

**Status**: Completed (one blocking finding: VERIFY_01-R1)  
**Completed**: 2026-11-07

### Results
- Gates: `npm run verify` ok; `npm test` 2435/2435 + timing 14/14; `npm run test:plugin` 103/103; full page suite (`VB_TEST_PORT=9900 VB_TEST_WORKERS=3`) 1008 passed in 12.0 min, no failures, no flakes. `npm run eval:bot -- --dry` 75/75 (live not run).
- The contract fixture's sha256 still equals nclite's `shared/plugin-host.ts` (63622aad...).
- Built folder (`temp/v-plugin`, script `temp/verify-host.mjs`, engine run from the built `engine.js`): seam 2; `changeWords` 3 keys, text word for word; `_meta['plugin/change']` within `CHANGE_LIMITS` and `REF_LIMITS`; reveal `{ board, cards }`; board-only write count 0 with `cards: []`; a replay and a read carry none; `skill.md` 8,178 B (<= 8,192).
- Adapter pieces: `register` not needed (an unjoined `bot-...` id writes; the engine joins itself once, label from `name()`); `storedChangeOf` (key is `plugin/change`, nclite must read that key); `ackOf` (`resolve('answers')` gives `ack: { board, head }`); `revealOf` (plain Ref); `host` (view takes the contract's host; Send went in the browser); `css.reviewedSha256` (no waiver needed, 0 selector problems). NOT removable: `css.reads` (R1). `icon: 'board'` is the host row's (the manifest has no `icon`, by design).
- Single agent: unjoined `bot-0123456789abcdef` wrote a board, wrote on a person-made board with no grant, read the person's note via `check_responses`; a second derived id also wrote; one folder agent stored, no `bot-` id in the ledger; `request_grant` answers `held`; the same write on a locked board refused.
- Browser (built-in tools): standalone (port 9951, temp project) and fake host (port 9950), light and dark, toolbar wide (1200) and narrow (420; the fake host's pane forced to 360 through CSSOM, tier `third`), a change line and its reveal (zoomed to the new card), a card ✓ then Host send (chip spent, nothing refused). No visual defect.

### Issues & Resolutions
- VERIFY_01-R1 (blocks deleting the adapter): the built `view/board.css` reads `var(--app-w)`, `var(--app-h)`, `var(--region)`; nclite's `checkStylesheet(css, { scope: 'vb' })` gives 3 problems (not `--host-*`, not `--vb-*`, not declared) and passes only with the adapter's `css.reads`. Without the adapter nclite would refuse the board. Rename to `--vb-app-w`, `--vb-app-h`, `--vb-region` (setters `packages/ui/src/node/node-app-apply.ts`, `packages/ui/src/region/vb-region.ts`; readers in `packages/ui` `app-frame.css`, `node-app.css`, `node.css`, `region.css`, `region-narrow.css`, `pattern.json`), and have the plugin-build test run `checkStylesheet` with no `reads`.

### Caught Beyond the Brief
- Doc audit by reading plugin.md § The view, § The engine, § The bot, § Tools, § The manifest: every cited test exists (spec-truth) and passes. The manifest field table and flag table cite no test per row; spec-truth "the manifest's fields" and engine-switches "every flag the engine reads" hold them. No false promise found.
- `eval:bot --dry` wrote a report under `tests/evals/bot/out/`; check it is ignored.

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only), category `[board-app]`,
   trail `→ Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/VERIFY_01_testing.md]]`.
