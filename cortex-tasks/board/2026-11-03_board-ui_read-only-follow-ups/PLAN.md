# Read-only Follow-ups - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md) · **Created**: 2026-11-03 · **From**: maintainer chat 2026-11-03,
> points 407-413, after the set `cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/` (see its CLOSING.md)
> · **Tracker**: N44, N45, M51, M52, M53, M54 · **Checkpoint**: tag `ledgers/done` (main)

**How to start (orchestrator):** in the main checkout, cut `feat/ro-follow-ups` from `main`; per task,
`npm run worktree -- <id-kebab> --base feat/ro-follow-ups`, using the port from TASK-STATUS's Ports table, not the
printed one. Then wave by wave with `cortex-task-exe`, as the previous set ran (House Rules below).

## Problem Statement

The ledgers-and-read-only set closed with six items left (its CLOSING.md, tracker rows). The maintainer chose to
deal with them now: buttons that look pressable on a read-only board, faint dialog text in dark, a ledger chip that
can go missing, page memory shared across ledgers, standalone bot instructions checked only by hand, and a
screenshot check that reads a half pixel.

## Decisions (maintainer, points 407-413; binding)

1. **N44 (407)**: every write control a person can press on a read-only ledger is disabled and says why, in the
   read-only words already used (`READ_ONLY_PERSON`, `packages/actions/src/read-only.ts`; the page's
   `blockedReason(…, readOnly)`, `apps/board/src/shell/chat-rules.ts`): the access strip's Allow all / Allow / Refuse
   (`board/chrome/AccessRequests.svelte`), the Agents panel's remove (`board/chrome/BoardAgents.svelte`), an app
   card's Allow app (`#ui`), and the card toolbar tooltips VERIFY_01 F10 names. The server already refuses each.
2. **N45 (408, option b)**: the dialog text passes by fixing the token, as `docs/principles.md` § Design tokens and
   contrast says ("by lightness within the same hue, never per screen"; muted text is the reading tier, Lc 60).
   `--vb-ink-subtle` dark is `#9e9ea6`: Lc 48.8 on the card/dialog surface `#1a1a1c`, 47.7 on sunken, 45.8 on deep.
   Same hue, `#b3b3bb` reaches 60.2 on card (59.1 sunken, 57.2 deep); `#b8b8c0` reaches 60 on every surface. The
   tokens are protected: T_01 measures which surfaces the subtle ink is text on, names the one value, and **stops for
   the maintainer's yes** before writing it. Light (`#6b6b74`, Lc 60.5-76.2) is unchanged.
3. **M51 (409)**: the ledger chip, its "⋯" row and New ledger… show whenever `get_project` names a ledger, whatever
   the page's own `ledgerFolders` flag (the page parts are built after the folder is read).
4. **M52 (410)**: the page's memory (`apps/board/src/shell/kept.ts` `pageStore`: zoom, proposals hidden, the
   board's view) is keyed by folder and ledger as well as board; board ids do not change. `main` of the folder open
   before keeps its old keys, so nothing a person set is lost (the pattern LEDGER_UI_01 used for the last board).
5. **M53 (411)**: `eval:bot` gains a standalone mode: the real SKILL.md as the instructions, the real `vb-mcp` against
   a test board server, scored by the same checks. Scenarios for it: a picture lands in the open ledger's `images/`;
   the bot reads another ledger when the person names one (what it then does is the person's ask — summarising into
   main was one idea, not the flow); join's `ledger` is checked. Budget: about $0.08 a run; a whole standalone eval
   under $3.
6. **M54 (412)**: `tests/pages/host-styles.spec.ts` `sameUnderHost` compares shots clipped to whole pixels inside the
   box, so a partial edge row never decides the check. The F16 exclusion of the standalone-only ledger section
   stays (its own reason).
7. Not in scope (recorded): 404 apps keep running on a read-only ledger; 405 tracker N46; 406 the host's own.

## Architecture (cortex-architecture, applied)

- Reuse: read-only state from `BoardState.readOnly` / `live.readOnly` and `blockedReason`; words from
  `READ_ONLY_PERSON` and the area words files (`board/words/chrome-access.ts`, `shell/words/ledgers.ts`); `#ui`'s
  paused/disabled pattern (`packages/ui/src/paused/paused.ts`) for the app card; the eval's `Stage`, checks and
  report (`tests/evals/bot/{types,checks,report}.ts`) for the standalone mode, and SKILL_01's manual recipe
  (`claude -p` with SKILL.md, `vb-mcp` on a test server; its notes in the previous set's `SKILL_01_bot-instructions.md`).
- No contract change. No new dependency. New sentences in words files only.
- Flags: N44 and M51 behaviour sits under `readOnlyStart` / `ledgerFolders` (both on); M52 under `ledgerFolders`.

## House Rules

As the previous set's PLAN § House Rules, with these differences:
- Models (project steering): `standard` = Sonnet 5.5, `strong` = Opus 5.5.
- Orchestrator-only files: `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`,
  `package.json` and the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`, `.git/**`.
- Protected: `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, existing
  `docs/decisions.md` entries, and `packages/tokens/src/tokens.css` — T_01 writes it only after the maintainer's yes
  on the exact value, relayed by the orchestrator.
- Sub-agents write their TASK-STATUS row and their one LOG line in the main checkout; everything else in their
  worktree. Only the orchestrator commits; it merges each branch after the wave gate, tags `ro-follow-ups/wave-N`.
- Never port 4466, the repo's own `.visionboard/`, `~/ai/nclite`. `nice -n 15`, `VB_TEST_WORKERS=3`, time limits:
  5 min a spec group, 15 the full page suite, 20 `eval:bot`. `eval:bot` (real, not dry) only in BOT_01.
- Done for UI: every state, axe and APCA, a gallery entry, a look in light and dark at 1400, 900 and 600 px.
- Wave gates: `map`, `verify`, `check`, `gen -- --check`, `npm test`, `test:plugin`; the full page suite after
  wave 2 (the close).

## Success Criteria

- [ ] No write control a person can press on a read-only ledger looks enabled; each says why
- [ ] Dialog and muted text pass Lc 60 in dark on the surfaces it is text on (token changed with the maintainer's yes)
- [ ] The ledger chip shows whenever the server names a ledger
- [ ] Two ledgers' same-id boards keep their own zoom and proposals-hidden; nothing a person set is lost
- [ ] `eval:bot` runs standalone with the three scenarios, and both modes pass
- [ ] host-styles compares whole pixels; full gates green
