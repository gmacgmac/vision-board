# Handover after compaction (2026-10-01, end of day)

Paste-able resume brief for the next session. Durable state lives in the files below; this note
carries the nuance that isn't written anywhere else.

## Read first, in order

1. `.kiro/steering/vision-board-proj.md` (rules, v0.2), `docs/principles.md`, `docs/vision.md`
2. `cortex-tasks/tracker.md` (queue: U1 board v3; N1–N4; M1–M3; L1–L3; W1, W3)
3. `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` (Execution record, resume point) and `PLAN.md`
4. `docs/decisions.md` D-005, D-009 to D-016 (all Accepted); D-001–D-004, D-006, D-007 still Proposed
5. `docs/specification/modules.md` (generated), `.kiro/steering/svelte-conventions.md`

## Where we are

- Last commits: foundation (D-016, `scripts/verify.mjs`, module map, READMEs), then the steering
  status and "Where things live" rows. Cortex kernel v3.3.1 (`docs.flag` tier, tracker queue template).
- `npm test` 33/33 and `npm run verify` both exit 0. One warning: `apps/board/public/src/main.ts`
  is 360 lines (Stage 2 removes it).
- **Next: board v3 Stage 2, step 1, which needs the maintainer's explicit go** (tracker rule 9). Install
  the D-014 dependencies (svelte 5.57.1, vite 8.3.1, @sveltejs/vite-plugin-svelte 7.3.1,
  typescript 6.0.3, svelte-check 4.7.6; exact pins, `.npmrc` keeps scripts off), create
  `docs/specification/dependencies.md` (verify requires each package there), then move the canvas
  from `apps/board/public/` to Svelte + Vite in `apps/board/src/` with `runes: true`, keeping
  every current behaviour. After that, the rest of Stage 2: mode picker pill, region overlap fix,
  note callout (edit and delete), Architect styling within the APCA tiers.

## Decisions and preferences not obvious from the files

- Grant wants **Uplynk Architect's patterns** (`/Users/dev/AI-Work-VSCode/uplynk-architect`,
  copy in `prototypes/architect/`, running on :4455 as his own process; don't kill it): the note
  box beside the card, the lasso plus Shift/Cmd/Ctrl-click multi-select, notes becoming chips in the
  chat input that **reference** nodes (not copies), versions with Changed/New badges, soft card
  tints and the pink accent. **No bottom chat bar**: the chat lives in a right-hand panel (D-010).
- kiro-cli (`~/.local/bin/kiro-cli` 2.24.0, has `acp` and `chat --no-interactive`) runs on his Max
  subscription. Board updates are a **tool call** by kiro-cli, and its final text appears in the chat.
  Stage 5 is a spike in `temp/` first, with the narrowest tool set.
- Everything lives in a container, and a container is a thread. Drag items into "Later" to park
  them. No freeform mode (D-011).
- Node types: one generic `<vb-node>` element plus a registry of type definitions (outline of any
  shape, ports on any side and any count, fields, actions). The same goes for `<vb-link>` and
  `<vb-region>`. Shared parts are plain web components; Svelte only builds the app shell (D-005, D-015).
  He **rejected React Flow/Svelte Flow** (D-013) and SvelteKit for now (D-012).
- Mode picker: a small pill showing the current mode, which opens a tiled picker (Grid, Flow, Lanes,
  Radial, List) on hover or click.
- The Gardener **never edits docs**: `REGISTRY.md` has an empty `docs.include`, a `docs.flag` list,
  and the deep scan off. Cortex is his own system; don't change kernel `cortex-*` files.
- The tracker is a queue: delete rows when done, Dropped rows get a LOG line, and tasks name rows in
  `tracker:`. He drives tracker → task → execution with the orchestrator.
- Reply style: one numbered list whose numbers keep counting across headings, short items. Long
  replies go **on the board** (dogfooding): write `sessions/<id>/view-vN.json`, validate it, then
  link `http://localhost:4466/#<id>`. His replies come back pasted until Stage 4 (`vb wait`, W3).
  The `first-look` session holds v1 and v2 with his answers.
- Protected files (steering, AGENTS, CLAUDE, decisions, principles, tokens) change only with his yes,
  proposed as exact wording.

## Environment gotchas

- Use `PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"`, because `/usr/local/bin/node` is 22.14 and
  can't run `.ts` (W1). He has been given the sudo commands to remove it; check whether he has.
- The board server: `node apps/board/server.ts` on :4466. `sessions/` and `temp/` are gitignored.
- In `temp/smoke.ts`, the "bad Host" check fails falsely (Node `fetch` can't set Host); curl gets the correct 403.
- Known board bugs, to fix in Stage 2: region packing overlaps containers, and the mode buttons
  overflow on narrow regions. Some connectors take odd routes (M2).
