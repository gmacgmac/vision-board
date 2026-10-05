# U7_FE_01_node-size: Three card widths, picked by content or by hand

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Decision**: D-030 · **Pattern**:
> `docs/specification/components.md` § Node size · **Look**: mockup
> `prototypes/board-v3-design/mockups/07-node-sizing.html`, option A · **Model**: Opus 5.5

## Objective

Cards take one of three widths. Layout picks one from the body; the agent may suggest one; the
person's pick, made from a small corner control, wins and is saved as a `size` act. Behind the
`nodeSize` feature flag, which this task also introduces as the project's flag pattern (rule 12).

## Context

- **Work in the worktree** `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board-wt-u7`
  (branch `u7-node-size`, cut from `board-v3`). Another agent is changing the server and
  `apps/board/src/board/io.ts` in the main checkout; never touch the main checkout, and do not
  edit `apps/board/src/board/io.ts` or anything under `apps/board/server*` (send the act through
  the existing `sendAct` function). Run `npm ci` first. Node 22.23.1 via nvm.
- Done already: the ledger has `node.size` (agent suggestion) and the person-only `size` act
  (`size: s|m|l|auto`); the fold gives `BoardState.sizes` (`n` → size) and `ViewNode.size`.
- Read first: `docs/specification/components.md` (all of it, especially § Node size), the
  mockup (open it in a browser and read its CSS and script), `prototypes/board-v3-design/README.md`
  § 07, `packages/tokens/src/tokens.css`, `packages/ui/src/node/*`, `packages/ui/src/region/region.css`
  (the hover-reveal mode picker), `packages/layout/src/*`, `apps/board/src/board/render.ts`
  (`measure`), `apps/board/src/board/controller.ts`, `tests/pages/*`, `temp/research/u7-sizing-brief.md`.
- The maintainer approved the size tokens (2026-10-05, chat 557). The tokens file is otherwise
  protected: change only what step 1 says.

## Steps

1. **Tokens**: add `--vb-card-w-s: 280px`, `--vb-card-w-m: 360px`, `--vb-card-w-l: 464px`.
   Keep `--vb-card-w` and `--vb-card-w-wide` for when the flag is off. Nothing else changes.
2. **Feature flags** (new pattern, one definition): `packages/format/src/flags.ts` exports
   `FLAGS` (name → `{ default, description }`) with `nodeSize: { default: false }`, and
   `flagOn(name, overrides)`. The page reads overrides from the URL (`?flags=nodeSize`) and from
   `localStorage` key `vb.flags`; tests and the gallery pass them directly. Document the pattern
   in a short § Feature flags in `docs/specification/components.md`.
3. **Tier** (`packages/layout`, pure): `sizeTier(node, personSize?)` per § Node size points 2-3:
   auto from the body Markdown (over 480 characters → `l`; over 140, a code block, or more than 6
   list items → `m`; else `s`), the agent's `node.size` above that, the person's pick above both,
   emphasis one tier up (max `l`). Export from the layout front door.
4. **Apply**: when the flag is on, render sets `data-size` on each `<vb-node>` from `sizeTier`
   before `measure()` runs; `node.css` maps `data-size` to the three width tokens; with the flag
   off nothing changes (emphasis keeps `--vb-card-w-wide`).
5. **Control** (option A, matching the mockup exactly): a faint width glyph in the card's
   top-right border gap; on hover or keyboard focus an S / M / L / Auto pill lifts above the card's
   top edge; 26px buttons; visible focus ring; only the glyph is in the tab order until it opens;
   Esc closes; label "Card size: S, automatic. Change size" (or "…, your pick"); a picked size
   shows as "◆ S". Choosing sends the `size` act through the existing act path; Auto sends
   `size: "auto"`. Reuse the region mode picker's reveal pattern; tokens only; no inline styles.
   On a small card the "Moved by you" tab shrinks to "◆" so both fit.
6. **Gallery**: a Node size section showing the three tiers and the control at rest, revealed and
   focused, in dark and light, from sample data with the flag on.

## Tests (write them first)

- `packages/layout/tests/size.test.ts`: every threshold edge, code block, 7-item list, agent
  suggestion, person pick, `auto`, emphasis bump and cap.
- `packages/format/tests/flags.test.ts`: defaults, overrides, unknown flag names refused.
- Page tests: with `?flags=nodeSize`, a long card is wider than a short one; opening the control
  by keyboard, picking L, and reloading keeps L; Auto brings the automatic width back; axe passes;
  new screenshots for the gallery section, looked at before they are stored. With the flag off,
  every existing screenshot is unchanged.

## Done when

- In the worktree: `npm test`, `npm run check`, `npm run verify` exit 0. Run `npm run test:pages`
  only after the orchestrator tells you the main checkout is idle, or not at all; the
  orchestrator runs it after merging (its port 4468 is shared).
- Commit once on `u7-node-size` in the worktree (`U7_FE_01: three card widths behind nodeSize`);
  do not push, do not touch `board-v3`.
- Report: files changed, screenshots you looked at, every existing test changed and why, and any
  difference from the mockup. Do not edit `docs/decisions.md`, steering, `AGENTS.md`, `CLAUDE.md`,
  `docs/principles.md`, or any token besides step 1. Files over 50 lines: create with the first
  section, then append in chunks.
