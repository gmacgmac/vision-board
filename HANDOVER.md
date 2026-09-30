# Handover: board canvas walking skeleton (2026-09-30)

Task: `cortex-tasks/board/2026-09-30_board-canvas_walking-skeleton.md`.
Nothing here has been run or tested (maintainer asked for files only).

## Start here (new agent)

**Read in this order before touching anything:**
1. `AGENTS.md`
2. `.kiro/steering/vision-board-proj.md` (the rules; protected)
3. `docs/principles.md` (the reasoning behind them)
4. `docs/vision.md` (what the product is)
5. `cortex-tasks/tracker.md` (the roadmap)
6. This file

**Git state:**
- Last commit is tagged `checkpoint-02-founding-docs`.
- Everything in "What was built" below is **uncommitted**.
- `git status` shows exactly what's new.
- Commit before you change anything, so this work can be restored.

**Constraints the maintainer set:**
- Always reply in one numbered list. Group it under category headings, but keep the numbers counting up across categories so they can answer "1 ok, 4 skip".
- Move fast, but follow the principles.
- Never edit protected files without their yes: the steering file, `AGENTS.md`, `CLAUDE.md`, `docs/decisions.md`, `docs/principles.md` and the tokens.
- No new dependencies without approval. So far there are none; the whole thing runs on Node 22.18+ alone.
- Cortex setup (project categories in `cortex/PROFILE.md` and `REGISTRY.md`) is deliberately deferred.
- Log finished work as one line appended to `cortex/LOG.md`.
- Interim test files go in `temp/`.

**Decisions:**
- D-001 to D-008 in `docs/decisions.md` are Proposed, and the maintainer has said the rules and principles are good.
- Still open: the framework (the app is plain TypeScript for now, with no framework), and the layout engine (our own code is written; ELK has not been tried).

**Reference:**
- `prototypes/architect/` is the Uplynk prototype this grew from. Read it only, never build on it.
- Uplynk Studio (`~/WORK/uplynk-studio`) is where `packages/tokens` (the contrast gate) and `packages/ui` (the button pattern) come from.

**Fixed since writing:**
- A global `[hidden] { display: none !important; }` in `board.css`. Without it, the Reply panel, the message overlay and hidden decided cards would have stayed visible.

## Try it

```sh
node apps/board/server.ts          # Node 22.18+; no install, no dependencies
open http://localhost:4466         # seeds sessions/roadmap and sessions/login-review
node apps/board/bin/reply.ts roadmap
node packages/format/bin/validate.ts packages/format/fixtures/*.json
```

Then commit and tag: `git add -A && git commit -m "Board walking skeleton" && git tag -a checkpoint-03-canvas -m "Canvas skeleton"`.

## What was built

1. **Formats** (`packages/format`): `view.ts` (regions, 5 modes, 7 kinds, stable item numbers,
   forbidden coordinate keys), `transcript.ts` (9 actions), `validate.ts` (`validateView`, lists
   every problem), CLI `bin/validate.ts`, two fixtures (the roadmap, and a sample code review).
2. **Layout engine** (`packages/layout`, pure, no DOM): `grid`, `list`, `flow` (layered +
   barycentre sweeps, from Architect), `lanes` (shared column grid across lanes; lanes by kind
   when a region is switched to lanes without declaring any), `radial` (wedges sized by leaf
   count, rings grow to fit). `board.ts` packs regions into rows, applies pins, routes links.
   `route.ts`: right-angle connectors with rounded corners, fixed sides, ports spread by the far
   end's position, works across regions.
3. **Coordinates you can remember**: dragging a card (or Alt + arrows) records a `pin` in the
   transcript in region-local coordinates. Layout re-applies pins, so places survive reloads,
   mode switches back, and new views. "Reset places" per region, or R on a card. The agent's
   view still holds no coordinates (rule 9, amended in the steering file).
4. **Action layer** (`packages/actions`): one registry (labels, keys, person-only, status,
   reply word), `validateRecord` run in both browser and server, `reduceTranscript`, `counts`,
   `replyText` (the numbered reply: "1 ok, 4 drop, 7 more context: ...").
5. **Item pattern** (`packages/ui/src/item`): core (kinds, which buttons each kind offers,
   labels) and template (pure markup), `pattern.json` listing its states.
6. **Tokens** (`packages/tokens/src/tokens.css`): `--vb-*`, one `light-dark()` per colour,
   item-state and kind tokens, reduced-motion.
7. **Server** (`apps/board/server.ts` + `server/`): localhost only, Host and Origin checks, JSON
   only, 64 KB body cap, id allow-list plus path containment, CSP, validates views on read and
   records before append, stamps records as `person`, server-sent events on file change, serves
   the packages' TypeScript to the browser type-stripped by Node (`node:module`
   `stripTypeScriptTypes`), so there is no build step.
8. **Canvas** (`apps/board/public`): per-region mode switcher, pan (drag/scroll), zoom
   (Ctrl/Cmd + scroll, +/-), Fit, Hide decided, card buttons + keyboard (A X C M L, J/K, Alt+arrows,
   R), note dialog, focused card highlights its connectors, live reload when the agent writes a
   new view, Reply panel with Copy, theme toggle. Cards update in place so focus survives.
9. **Agent skill draft** (`skills/vision-board/SKILL.md`): how to write a view and read replies.
10. **Steering**: added "How to respond to the maintainer" (numbered lists that keep counting
    across categories) and the pin rule to rule 9.

## Known gaps and risks

11. **Untested.** Expect small runtime bugs on first run; the likeliest spots are
    `render.ts` (SVG `innerHTML`) and `layoutBoard` origin maths with pins.
12. No unit tests yet, though `package.json` has a `test` script. Layout is pure, so it's easy to test.
13. Contrast values in `tokens.css` are hand-picked, not gated. Port Studio's `contrast.mjs`.
14. `main.ts` is about 360 lines, over the 300 warning. Split out `actions-ui.ts` next.
15. Not in this skeleton: versions/diff highlights, Confirm these, Approve, lasso, multi-node notes.
16. Radial places a spanning tree only, so extra links cross it as ordinary connectors.
    Connectors don't avoid cards yet.
17. `skills/` is a new top-level folder, which needs a decision entry per rule 1.
18. No `tsc` type-check, which needs a dependency decision (Studio used TypeScript 7.0.2).

## Suggested next

19. Run it, fix first-run bugs, commit and tag `checkpoint-03-canvas`.
20. Unit tests for every layout mode, `validateView`, `validateRecord`, `reduceTranscript`.
21. Decision entries: no-build TypeScript serving, `skills/` folder, own layout engine (not ELK).
22. Versions with change highlights, then Confirm these and Approve.
23. Dogfood: have the agent put its next long reply on the board.
