---
task_name: Host Styling, Row Default, Layout Tooltip
created: 2026-11-06
completed: 2026-11-06
status: completed
categories: [board-tokens, board-app, board-ui, board-format]
tracker:
---

# Host Styling, Row Default, Layout Tooltip - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: 2026-11-06

---

## Instructions for Agents

1. **Read PLAN.md first**, its Decisions above all.
2. **Read notes from completed tasks** before starting yours.
3. **Respect the Wave column.** FE_03 also waits on PLAN Decision 6.
4. **Reuse Shared Foundations**; import, never reinvent.
5. **Touch only the files you own**; anything else goes under `REQUESTS`.
6. **If you need to deviate, STOP and inform the user.**
7. **Update frontmatter `status`** per `cortex-task-exe`.
8. **Update your row** below when you finish.
9. **Add implementation notes** to your task file and brief notes here.
10. **No git commits.**

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | T_01 | 1 | strong | API designer for embeddable components — a host may rely only on what the page says, and every promise has a test behind it. | [Contract: Host styling](./T_01_host-styling-contract.md) | Completed | Spec § Theme and host styling, both flags, no new words, D-094 draft |
| 2 | FE_01 | 2 | strong | Design-systems engineer — one literal per colour, a host's look reaches only what it is meant to, and nothing moves for a host that sets nothing. | [Host colours and mode](./FE_01_host-colours-and-mode.md) | Completed | Host colours and mode behind `data-vb-host-styling`, native light-dark(), harness palettes; 1 test waits on FE_01-R1 |
| 3 | FE_02 | 2 | standard | Accessibility engineer — a tooltip is a description that keyboard and screen-reader users get too, and it never covers what it explains. | [Layout tooltip, no overlay](./FE_02_layout-tooltip.md) | Completed | Tooltip per icon on the shared hover tip; flag-off page path needs FE_02-R1 |
| 4 | FE_03 | 2 | standard | API designer — a default is part of the contract, said in the schema, the code and the agent's instructions alike. | [Row by default](./FE_03_row-default.md) | Completed | `mode` optional on sent, default row in schema, `withMode`, SKILL v3.31 |
| 5 | VERIFY_01 | 3 | standard | Product designer at a host app, with no builder context — the board should feel built in, in every bot colour, light and dark. | [Final verification](./VERIFY_01_testing.md) | Completed | Gates green but 59 gallery screenshots (VERIFY_01-R1); eval:bot $0.1360; reply to nclite drafted |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

---

## Shared Foundations

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `docs/specification/plugin.md` § Host styling (the property table, mode, scope and contrast rules) | T_01 | FE_01, VERIFY_01 |
| Flag `hostStyling` in `packages/format/src/flags.ts` | T_01 | FE_01 |
| Words for the layout tooltip, if any are new (`board.region.*`) | T_01 | FE_02 |

---

## File Ownership

| Wave | Owner | Files |
|------|-------|-------|
| 1 | T_01 | `docs/specification/plugin.md`, `packages/format/src/flags.ts`, words files it names |
| 2 | FE_01 | `packages/tokens/src/tokens.css`, `apps/board/plugin/theme.css`, `apps/board/plugin/color-scheme.css`, `apps/board/plugin/view.ts`, `apps/board/vite.plugin.config.ts`, `apps/board/tests/plugin-theme.test.ts`, `tests/plugin/guest.spec.ts`, new `tests/plugin/host-styling.spec.ts`, `tests/plugin/fake-host/*` |
| 2 | FE_02 | `packages/ui/src/region/*`, its tests and `pattern.json`, `tests/pages/` specs of the layout control, the gallery entry |
| 2 | FE_03 | `packages/format/schema/**`, `packages/format/src/view.ts`, `apps/board/server/write-*.ts`, `skills/vision-board/SKILL.md`, `apps/board/plugin/words/skill-edits.ts` |
| — | orchestrator | `docs/decisions.md`, `package-lock.json`, `dist/`, the set's `cortex/LOG.md` entry |

---

## Requests

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| T_01-R1 | T_01 | `apps/board/plugin/theme.css`: the three type properties on `.vb-board` as well as `:root` | FE_01 | Done (text scale needs FE_01-R1) |
| T_01-R2 | T_01 | `tests/plugin/host-styling.spec.ts`, `apps/board/tests/plugin-theme.test.ts`: the 11 tests T_01 named (spec-truth fails until then) | FE_01 | Done |
| T_01-R3 | T_01 | `packages/tokens/src/tokens.css`: `--vb-rail-rest` follows the media query and `:root[data-theme]`, not the board's `color-scheme` | FE_01 | Done (one value, D-052) |
| T_01-R4 | T_01 | `docs/decisions.md`: D-094 (amends D-081 rule 3, refines D-009), exact wording in T_01 notes | orchestrator (maintainer's yes) | Done (point 453) |
| T_01-R5 | T_01 | `docs/principles.md` (protected): a host's pairs are the host's promise | orchestrator (maintainer's yes) | Done (point 454) |
| FE_03-R1 | FE_03 | `dist/plugin/board`: rebuild so the built plugin skill carries SKILL.md v3.31, then re-run `npm run eval:bot` | VERIFY_01 | Done (built skill has v3.31 row; dry 75/75, live 13/13, $0.1360) |
| FE_01-R1 | FE_01 | `apps/board/src/styles/ui-scale.css`: `:root, .vb-board` so `--host-text-scale` on the root alone reaches the text sizes | orchestrator | Done |
| FE_01-R2 | FE_01 | `docs/specification/plugin.md`: lines are not a contrast tier; the colours' pointer names `theme.css` | orchestrator | Done |
| FE_01-R3 | FE_01 | Port 9100 is held by another app on this machine | VERIFY_01 (use 9310) | Done |
| FE_02-R1 | FE_02 | `controller.ts`, `canvas/draw.ts`, `canvas/render.ts`: carry `layoutTooltip` to `RegionFrameOptions` | FE_02 (run 2) | Done |
| FE_02-R2 | FE_02 | `docs/specification/components.md`: the layout tooltip, the popover as the flag-off form | FE_02 (run 2) | Done |
| FE_02-R3 | FE_02 | `tests/pages/lock-board.spec.ts` "gallery: the lock section" screenshot shifts a few px (light, dark): cause not established | VERIFY_01 | Done (cause found: VERIFY_01-R1; 59 specs, not only this) |
| VERIFY_01-R1 | VERIFY_01 | `apps/board/src/gallery/layout-tip-section.ts` / `gallery.css`: the new group adds 792.938 px to the region section; make it a whole number of px so the sections below keep their offsets and 59 gallery screenshots match unchanged; then re-run `npm run test:pages` once. Blocking for a green suite | FE_02 (or orchestrator) | Done |
| VERIFY_01-R2 | VERIFY_01 | `docs/specification/api.md`, `components.md`: bump `updated:` for this set. Non-blocking | orchestrator | Done |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### T_01: Contract
_Status:_ Completed  
_Notes:_ `plugin.md` § Theme and host styling: 12 colour/mode properties, defaults, Derived, the board's own, Mode, Scope,
Live, Contrast, Off; Styles sentence, open point 8, seam "Not breaking", Not covered updated. Flags `hostStyling`,
`layoutTooltip` (on). No new words (FE_02: name over hint needs none; a one-line "Column: one card…" would). FE_01 must
write the 11 named tests (T_01 notes); spec-truth's "every test the spec names exists" fails on ENOENT until then. D-081
rule 3 is what this overturns, not only D-009; D-094 draft in T_01 notes.

### FE_01: Host colours and mode
_Status:_ Completed  
_Notes:_ Gate: `view.ts` sets `data-vb-host-styling` on the root when `hostStyling` is on; `theme.css` passes each `--host-*`
into a `--vb-host-*` only there; tokens (palette block now on `:root, .vb-board`) read `var(--vb-host-x, <own light-dark()>)`.
Mode in `color-scheme.css` (host's, else `data-theme`, else system). View build `cssTarget` keeps `light-dark()` native;
`hostKeepsColorScheme` reworked (still 3). Baseline: 55 tokens × light/dark equal before/after, screenshots byte-identical.
Harness `/?palette` + `fakeHost.dress`, five palettes all over their tier. 21/22 of my specs pass; "scope: on the mount root
alone" fails on text scale until FE_01-R1 (`ui-scale.css`). Board's own `--vb-line-strong` under the table's Lc 30
(FE_01-R2). Port 9100 is taken by another app here: runs used 9110.

### FE_02: Layout tooltip
_Status:_ Completed  
_Notes:_ Each layout icon carries `.vb-mode-tip` (name over hint) on `bindHoverTip`; the hint is its `aria-describedby`; no popover is drawn
(`RegionFrameOptions.layoutTooltip`, default `flagOn('layoutTooltip')`). The overlay was opened by `region-row.ts` `openModes` from icon mouseover,
icon focusin and `showPanel('modes')`. First Esc dismisses a tip, a second collapses a short rail. 8 of 9 new page tests pass; the flag-off one
and the popover specs moved to `?flags=-layoutTooltip` (layout-tiles, board.spec x3, lock-board, container-rail-states) wait on FE_02-R1.
Screenshots: `temp/layout-tooltip/`.

### FE_03: Row by default
_Status:_ Completed  
_Notes:_ Done (wide). Contract: `region.schema.json` `$defs.region` no longer requires `mode`; `mode.default` is `"row"`, the one See FE_03_row-default.md.

### VERIFY_01: Final Verification
_Status:_ Completed (one open finding)  
_Notes:_ `npm test` 2418+14 pass, `verify` ok, `test:plugin` 94 pass, `build:plugin` (no `--lightningcss-*`, seam 1), `perf` 10 pass. `test:pages`: 928 pass, 59 fail, all gallery
section screenshots; not on 36d3222. Cause: the new layout-tip gallery group makes the region section 792.938 px taller, so every section below moves by a
fraction of a pixel; padding it to a whole 793 px makes the lock baseline match (VERIFY_01-R1, FE_02-R3 answered). Palettes (5 x light/dark, forced
against the system) and an undressed board beside, kinds/states/wires under no tier on any ground, tooltip hover and focus: looked at. eval:bot dry
75/75, live two-turns+draw 13/13, $0.1360. The reply to nclite is in VERIFY_01 notes. Screenshots: `temp/host-styling/verify/`.

---

## Completion Checklist

- [x] All implementation tasks complete
- [x] Verification task complete
- [x] Every request `Done` or `Closed`
- [x] Decision entry appended with the maintainer's yes
- [x] LOG entry created

---

## On Completion

Append to `cortex/LOG.md`:
`[[YYYY-MM-DD HH:MM]] [board-tokens] Host styling for the plugin, row default, layout tooltip → Task: [[cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md]]`

Run 2: FE_02-R1 and R2 done (flag passed through controller.ts, draw.ts, render.ts; components.md updated); flag-off specs pass; lock-board gallery screenshot shows a small shift in the lock section, not from FE_02.

Run 3: VERIFY_01-R1 fixed (group of a whole 804 px, pattern.json header text and rail notes back to main's length); full page suite exit 0, 1005 passed; only 6 baselines of FE_02's own sections updated; plugin palette screenshots in temp/layout-tooltip/.
Close: D-094 (point 453) and the principles line (454) appended. Point 455: the decision kind and the commented state keep the board's own pink under a host (tokens.css `--vb-board-accent`, `-text`, `-soft`); before it, a host's accent turned decision cards into its colour, the same as another kind's under every palette but pink. plugin.md § Derived, host-styling.spec.ts BOARDS_OWN and "derived accents", plugin-theme.test.ts updated. npm test 2418+14, verify ok, test:plugin 94, palettes looked at light and dark.
