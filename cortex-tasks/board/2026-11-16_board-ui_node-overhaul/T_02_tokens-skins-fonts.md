# T_02_tokens-skins-fonts: Tokens, Skin Layer and Fonts

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Add the tokens the new node and both skins read, make a skin a set of token values, and ship the fonts with the
board.

---

## Context

PLAN.md § Decisions 13, 14, 17, 21 and § Planner's calls 2, 4. Colour literals live only in
`packages/tokens/src/tokens.css`, each as one `light-dark()` value fronted by its `--vb-host-*` where a host may give
it (`CODE-MAP.md` § 11). That file is protected: this task changes it under decision 13 and lists its exact diff.
The mockups' values are in the `<style>` of `design/mockups/node-skins/*.html`; they were picked by eye, so measure
them.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/tokens/src/tokens.css`, `packages/tokens/src/` (a new `skins.css`, `fonts.css`),
  `packages/tokens/fonts/` (new), `packages/tokens/README.md`, `packages/tokens/tests/` or the contrast tests that
  list token pairs, `apps/board/plugin/theme.css`, `apps/board/server/` (only to serve the font files and keep the
  CSP right), `apps/board/vite*.config.ts` (only so the build and the plugin build carry the fonts),
  `docs/specification/dependencies.md`, `docs/specification/plugin.md` § Theme and host styling
- **Files to reference**: `design/mockups/node-skins/*.html`; `tests/pages/apca.ts`; `apps/board/tests/plugin-theme.test.ts`;
  `packages/format/src/view.ts` (`TONES`, `SKINS`, from T_01)
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **Semantic tokens** for: the answer (waiting, ticked fill, crossed fill, the mark on a fill), the bookmark
       (fill and ink; it replaces `--vb-state-flag`, which stays as an alias until FE_02 removes its last use), the
       notes mark (quiet, counted, unread), the change badge (new, updated, settled), the icon tile, one
       `--vb-tone-<name>` per name in `TONES`, selection (how much brighter and thicker), and the minimum mark size
       FE_05 uses. Decision's new colour (decision 13) applies only under `[data-vb-edges]`, the root attribute
       FE_02 sets when `nodeEdges` is on, so no existing screenshot changes; T_04 makes it the token's own value.
2. [ ] **Measure** every new foreground and background pair with APCA in light and dark and add it to the pair
       list the tests check (Lc 60 reading text, 45 short coloured labels, 30 decoration). A failing colour is fixed
       by lightness within its hue. Report any pair you could not bring to its tier.
3. [ ] **The skin layer**: a skin is token values under `[data-vb-skin='<name>']` on the board's root, in
       `skins.css`. `default` needs no block. `command-lens` sets its surfaces, plates, radii, type and grid. A
       pattern never names a skin. A test fails if a `SKINS` name has no block or a block names an unknown skin.
4. [ ] **Hosts**: host colours and `--host-font` still win over a skin (D-094); extend
       `plugin-theme.test.ts` to hold that, and say it in `plugin.md`.
5. [ ] **Fonts** (needs the maintainer): list, for each of Figtree, Bricolage Grotesque, Space Grotesk and
       JetBrains Mono, the file name, the source URL (the family's own repository or Google Fonts), the size, the
       licence and a checksum, and **stop for the maintainer's go before any download**. Then vendor Latin-subset
       `woff2` files into `packages/tokens/fonts/` with each licence file, add `@font-face` rules
       (`font-display: swap`) in `fonts.css`, and type tokens (`--vb-font-display`, the skin's text and label
       fonts) that fall back to today's system stacks. A font loads only when a skin uses it.
6. [ ] **Register** the fonts in `dependencies.md` under a new section for vendored assets (name, version, source,
       licence, why).
7. [ ] Put the exact `tokens.css` diff in your notes.

---

## Validation

- [ ] `npm run verify` (no colour literal outside the tokens), `npm run check`, `npm test`, `npm run test:plugin` pass
- [ ] The contrast tests list and pass every new pair, light and dark
- [ ] With the network blocked (the page tests' default) the board loads its fonts from itself; with the font
      files removed it falls back with no error
- [ ] With no flag on, `npm run test:pages -- board.spec.ts every-node.spec.ts host-styles.spec.ts` passes with no
      new baseline

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-tokens] T_02: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_02_tokens-skins-fonts.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
