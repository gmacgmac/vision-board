# Host styling for the plugin, a row by default, a tooltip for layouts - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-11-06 · **From**: nclite's handoff `HANDOFF_vision-board_host-styling.md` (nclite tracker N577),
> asked for by the maintainer; talked through in chat, points 447-450.

---

## Problem Statement

Under nclite the board keeps its own magenta accent and cool grey canvas beside a bot that is orange or green, and it
follows the system's light or dark even when the person forced nclite's mode the other way. A host must be able to
dress the board in its own colours and mode, while standalone stays exactly as today. In the same bundle: a new
container lays out as a row, and choosing a layout shows a tooltip instead of the big overlay.

---

## Current State

- **Host properties**: only `--host-font`, `--host-font-mono`, `--host-text-scale` (`apps/board/plugin/theme.css`).
  Every colour is a `--vb-*` token, one `light-dark()` each, on `:root` (`packages/tokens/src/tokens.css`).
- **Light and dark**: tokens set `color-scheme: light dark` on `:root`, `[data-theme='light'|'dark']` forces one. The
  plugin's own root `.vb-board` gets its `color-scheme` from `apps/board/plugin/color-scheme.css`; the build strips the
  tokens' `color-scheme` off `:root` (`apps/board/vite.plugin.config.ts` `hostKeepsColorScheme`).
- **Lowered `light-dark()`**: Vite 8 minifies CSS with lightningcss for the `es2022` target, which rewrites every
  `light-dark()` into `--lightningcss-light/-dark` switched by `@media (prefers-color-scheme)` and `[data-theme]`
  (seen in the built `view/board.css`). So the colours follow the media query, not the `color-scheme` at the element.
- **Tokens resolve at `:root`**: a `var(--host-…)` inside a token declared on `:root` reads the host property at
  `:root`, so a property set only on the mount root would never reach it (plugin.md open point 8).
- **Container mode is required** in every container shape (`packages/format/schema/events/region.schema.json`
  `$defs.region` `required: ["id","title","mode"]`; `api/view.schema.json`), and a person cannot create a container.
  So today no container is ever made "without a layout" (handoff item 8's premise): see Decision 6.
- **Layout picker**: the container rail's layout popover draws a tile per mode with its hint
  (`packages/ui/src/region/region-template.ts`, `.vb-mtile`, `MODE_HINT` in `region-core.ts`) and a hint line
  (`region-row.ts` `highlight`, `.vb-mode-line`).
- **JS colour reads**: only `packages/ui/src/app-frame/vb-app-frame.ts` (app cards, off under a host).

---

## Proposed Solution

Adaptive, no switch inside the board (maintainer, point 450): a host that sets nothing gets today's board; a host that
sets the `--host-*` colours gets its own look. The "board's own look / match the bot" choice lives in the host (it sets
the properties or not). The project's flag rule still applies: the new behaviour sits behind one flag, on by default,
as a kill switch.

### Key Changes

1. **Contract first** (`docs/specification/plugin.md` § Theme → "Host styling"): the property table (handoff item 1,
   names kept: `--host-accent`, `--host-accent-strong`, `--host-on-accent`, `--host-canvas`, `--host-surface`,
   `--host-surface-sunken`, `--host-ink`, `--host-ink-muted`, `--host-line`, `--host-line-strong`, `--host-focus`,
   plus `--host-color-scheme`), each with what it feeds and the board's default; the mode rule; the scoping rule; the
   contrast rule; the seam stays 1. A draft decision entry for the maintainer (refines D-009).
2. **Tokens read the host** (`packages/tokens/src/tokens.css`, approved point 449): each mapped token reads its
   `--host-*` with its own `light-dark()` as the fallback, the literal still written once. Derived members
   (`--vb-accent-soft`, `--vb-accent-line`, …) mix the host accent into the host surface with `color-mix()` only when
   the host gives an accent, else stay today's literal. The colour tokens are declared on the board's root as well as
   `:root`, so a property on the mount root or any ancestor reaches them, and two boards can differ.
3. **Native `light-dark()` in the plugin build** (`apps/board/vite.plugin.config.ts`): a CSS target that keeps
   `light-dark()` (WebKit and Chromium both have it), so colours resolve against the `color-scheme` at the board's root.
   `hostKeepsColorScheme` and `plugin/color-scheme.css` are reworked to match. The standalone build is untouched.
4. **Mode** (`apps/board/plugin/color-scheme.css`): the board's root takes `var(--host-color-scheme, light dark)`;
   `data-theme="light|dark"` on `<html>` keeps forcing one when the host gives no `--host-color-scheme` (the seam's
   current promise stands, so the seam does not move).
5. **A host palette page** in the fake host (`tests/plugin/fake-host/`): a few accents, light and dark, forced against
   the system, to look at.
6. **Layout tooltip** (`packages/ui/src/region/`): each layout control names itself and says what it does from the
   words already there, on hover and focus, as its accessible description; the big overlay does not open by default.
7. **Row default** (gated, Decision 6).

---

## Dependencies

- T_01 (contract, words, flag, decision draft) before FE_01 and FE_02; FE_03 waits on the maintainer's answer to
  Decision 6. VERIFY_01 last.
- No new dependencies. Vite and lightningcss are already pinned; only the plugin build's CSS target changes.

---

## House Rules

- **Worktree** `.claude/worktrees/host-styling`, branch `feat/host-styling`, from main `36d3222`. Never port 4466,
  never the main checkout's `.visionboard/`. `VB_TEST_PORT` 9100 (FE_01), 9200 (FE_02), 9300 (FE_03, VERIFY_01).
- **Orchestrator-only**: `docs/decisions.md` (an entry is appended only with the maintainer's yes, as exact wording),
  `package-lock.json`, `dist/`.
- **Commits**: none by sub-agents; the orchestrator commits per wave only when the maintainer asks.
- **Project checks**: `npm run verify` (300/500 lines, layers), `npm test`, `npm run test:plugin`; page specs for what
  changed while working, the full page suite once in VERIFY_01 (`VB_TEST_WORKERS=3`, `nice -n 15`, a time limit on
  every run, full spec paths).
- **Done** (project rule): every state, accessibility and APCA contrast (light and dark), tests, a gallery entry where
  a pattern changes, and a look in a browser in light and dark.
- **Words**: every new sentence in its area's words file (`docs/specification/words.md`), never in code.
- **Writes over 50 lines in chunks.**

---

## Decisions

1. **Tokens file may change** for this (maintainer, point 449): "as long as it's in the best interest of our current
   application and as a plugin".
2. **Adaptive, the switch is the host's** (point 450): no host property set = today's board; the host decides whether
   to set them. No board setting for it beyond the kill-switch flag.
3. **Standalone unchanged**: with no `--host-*` set, standalone and plugin render as today (screenshots unchanged).
4. **Seam stays 1**: everything is additive and optional; `data-theme` on `<html>` keeps its meaning.
5. **Mode by property, not by inheritance** (planner's call, to confirm with nclite): the board cannot tell an
   inherited `color-scheme: normal` (a host that says nothing, which would make every `light-dark()` light) from a
   host's choice, so the host says it with `--host-color-scheme` next to its other properties. Without it, the board
   follows the system as today.
6. **Row default: both** (maintainer, 2026-11-06, point 451: "either way, I want that row"). `mode` is required
   wherever a container is made today; the bot picks `column` because `skills/vision-board/SKILL.md` § layouts table
   says "A few cards in each: `column`s side by side". So: (a) `mode` optional on write, defaulting to `row` (schema,
   the write path; stored lines always carry the resolved mode, so the ledger version stays), and (b) that table row
   and the plugin's skill say `row` unless the agent has a reason for another; `npm run eval:bot` passes.
7. **Overlay**: off, with no option to bring it back, unless the maintainer asks (handoff item 9: "a way to keep it
   from showing at all").

---

## Out of Scope

- The standalone build's CSS target and its `data-theme` switch.
- Host overrides of the card kinds (`--vb-kind-*`), state colours, scrim, dot grid: they stay the board's, checked for
  contrast on host grounds.
- nclite's side (vendoring, `loader.ts`): a reply to nclite at the end lists what to set.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Native `light-dark()` changes the plugin's computed colours | Compare computed colours of every token, light and dark, before and after, with no host property; screenshots unchanged |
| A host's colours fail APCA on the board's own colours (kinds, states) | The contrast rule puts the host's pairs on the host; VERIFY_01 measures the board's fixed colours on each palette of the harness page and reports any under its tier |
| Tokens on the board's root double the declarations | Same values, one literal each; `apps/board/tests/plugin-theme.test.ts` holds them equal |
| `color-mix()` derivations read wrong in dark | Derive against the host surface, measured on the harness page in both modes |

---

## References

- nclite handoff (outside this repo): `~/AI/nclite/.claude/worktrees/plugins/cortex-tasks/nclite/2026-11-05_nclite-core_plugin-host/HANDOFF_vision-board_host-styling.md`
- `docs/specification/plugin.md` § Theme, § A guest in the host's page, open point 8, § The types and the seam version
- `docs/principles.md` § Design tokens and contrast, § The board is a plugin; `docs/decisions.md` D-009
- `packages/tokens/src/tokens.css`, `apps/board/plugin/theme.css`, `apps/board/plugin/color-scheme.css`,
  `apps/board/vite.plugin.config.ts`, `apps/board/tests/plugin-theme.test.ts`, `tests/plugin/guest.spec.ts` "theme"
- `packages/ui/src/region/` (`region-template.ts`, `region-row.ts`, `region-core.ts` `MODE_HINT`)

---

## Success Criteria

- [ ] No host property: standalone and plugin look as today (screenshots, computed token colours)
- [ ] Each host property shows where the table says; derived accents follow one accent
- [ ] `--host-color-scheme: dark` on a light system gives a dark board, and the reverse
- [ ] Properties set only on the mount root apply; two mounts can differ
- [ ] A property changed while mounted updates the board without a remount
- [ ] Layout controls show their tooltip on hover and focus; no overlay opens
- [ ] Row default per Decision 6
- [ ] plugin.md "Host styling" written, the bundle rebuilt, a reply for nclite with the names and the commit
- [ ] All tests pass
