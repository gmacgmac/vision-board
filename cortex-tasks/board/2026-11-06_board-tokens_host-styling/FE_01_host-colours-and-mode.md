# FE_01: Host colours and mode

> **Set**: [PLAN.md](./PLAN.md) · **Wave** 2 · **Skills**: cortex-architecture, cortex-docs

## Objective

Make the plugin's board wear a host's `--host-*` colours and follow `--host-color-scheme`, scoped to the mount root,
live, behind `hostStyling`, while a host that sets nothing (and standalone) renders exactly as today.

## Inputs

`plugin.md` § Theme and host styling (T_01); PLAN Current State and Decisions; `packages/tokens/src/tokens.css`;
`apps/board/plugin/theme.css`, `color-scheme.css`, `view.ts`; `apps/board/vite.plugin.config.ts`
(`hostKeepsColorScheme`, `viewBuild`); `apps/board/tests/plugin-theme.test.ts`; `tests/plugin/guest.spec.ts` "theme",
"a host's color-scheme"; `tests/plugin/fake-host/`.

## Steps

1. **Baseline first.** Build the plugin (`npm run build:plugin -- --out temp/host-styling/before`) and record, in the
   fake host, the computed value of every `--vb-*` colour token on `.vb-board`, light and dark, plus screenshots.
2. **Failing tests first**, in a new `tests/plugin/host-styling.spec.ts`, one per name T_01 gave: no host property =
   the baseline; each property lands where the table says; derived accents follow the accent; `--host-color-scheme`
   dark on a light system and the reverse; set only on the mount root; two mounts differ; a change while mounted
   updates without a remount; flag off = baseline even with properties set.
3. **Native `light-dark()`**: give the view build a CSS target that keeps it (`build.cssTarget` listing the browsers
   that have it, e.g. Chrome 123, Safari 17.5, Firefox 120) and confirm the built sheet has no `--lightningcss-*`.
   Rework `hostKeepsColorScheme` (its rule count) to what the new sheet holds. Standalone's `vite.config.ts` untouched.
4. **Tokens read the host** (`tokens.css`): each mapped token reads `var(--host-…, <its light-dark() as today>)`; the
   literal stays once. Derived members use `color-mix()` from the host accent and surface, falling back to today's
   literal when no accent is given (a custom property that references an unset property with no fallback is invalid,
   so `var(--derived, <literal>)` takes the literal). Declare the colour tokens on the board's root as well as
   `:root` so they resolve where the host set its properties. Choose the flag's mechanism (e.g. the root carries
   `data-vb-host-styling` when `hostStyling` is on, read in `view.ts`) so flag off cannot see a host colour.
5. **Mode** (`color-scheme.css`): the board's root takes `var(--host-color-scheme, light dark)`; the `data-theme` rules
   on `<html>` still force one when no `--host-color-scheme` is given.
6. **Harness page**: in the fake host, a small palette switcher (five accents, light and dark, forced against the
   system) that sets the properties on the mount root, for VERIFY_01 to look at.
7. Update `plugin-theme.test.ts` (defaults held equal) and `guest.spec.ts` "theme" to the new promise; `npm run verify`.

## Validation

`npm test`, `npm run test:plugin` with `VB_TEST_PORT=9100`, the baseline comparison clean, screenshots of the harness
in light and dark under `temp/host-styling/` (absolute paths in your notes). Report any APCA pair under its tier.

## Constraints

Deviation → stop and tell the user. No PII. No commits. Never port 4466. Time limit and `nice -n 15` on every run.
Writes over 50 lines in chunks. Update this file's notes on completion.

## Implementation Notes

**Status**: Completed 2026-11-06, but one test of the 11 waits on a request (R1 below, `ui-scale.css`).

**Done**
- **Flag mechanism**: `plugin/view.ts` `mount` sets `data-vb-host-styling` on the root when `flagOf(host, 'hostStyling')`
  (read at mount) and takes it off in `unmount`. `theme.css` passes each `--host-*` colour and `--host-color-scheme` into a
  `--vb-host-*` only on `.vb-board[data-vb-host-styling]`; the tokens read `var(--vb-host-x, <own light-dark()>)`. So the
  `:root` tokens never see a host, and flag off nothing reaches one. The literal stays once (tokens.css); the
  `var(--host-…)` reads are all in `theme.css` (its head lists them; the unit test holds the list).
- **Tokens** (`tokens.css`): the palette block is now `:root, .vb-board` (non-colour tokens stay on `:root`); each mapped
  token fronts its `--vb-host-*`; `--vb-focus` falls back to `var(--vb-accent)`; accent soft/line front
  `--vb-host-accent-soft/-line`, which `theme.css` mixes as `color-mix(in srgb, var(--host-accent) 10% / 30%,
  var(--vb-surface-card))` (10% and 30% read off today's soft and line against the surface, light and dark).
- **Mode** (`color-scheme.css`): `.vb-board { color-scheme: var(--vb-host-color-scheme, light dark) }` and the two
  `:root[data-theme] .vb-board` rules with `light` / `dark` as the fallback, so the host's wins, then `data-theme`, then
  the system.
- **Native `light-dark()`**: `viewBuild` `cssTarget: CSS_TARGET` (`chrome123`, `safari17.5`, `firefox120`); the built
  sheet has no `--lightningcss-*`. `hostKeepsColorScheme` now strips `color-scheme` from the three bare rules (`:root`,
  `[data-theme=light|dark]`) and drops a rule left empty; still exactly 3 or the build stops. `vite.config.ts` untouched;
  the standalone build still lowers, and lowers inside the `var(--vb-host-*, …)` fallback correctly (checked in a temp build).
- **T_01-R1**: the three type properties on `:root, .vb-board` in `theme.css`. `--host-font` and `--host-font-mono` now
  work on the root alone; `--host-text-scale` does not yet (R1 below).
- **T_01-R3**: `--vb-rail-rest` is one value on `:root` (0.5 in both modes, D-052); the per-mode media and
  `:root[data-theme]` rules are gone, with a comment that a per-mode number would need a mode the board's root can be
  selected by.
- **T_01-R2**: the 10 tests in `tests/plugin/host-styling.spec.ts` with T_01's titles, plus "the harness palettes" (every
  palette pair meets the host table, by `tests/pages/apca.ts` `lc`); `apps/board/tests/plugin-theme.test.ts` "the spec's
  host table…" (parses the colour table; every `var(--host-…)` in the three sheets has a row; each row's Feeds are exactly
  the tokens that read it through `theme.css`; each default equals the token's `light-dark()`), and the existing three
  updated (two rules now, the attribute held equal to `view.ts`).
- **Harness**: `tests/plugin/fake-host/palettes.js` (+ `.d.ts`): five palettes (orange, green, blue, violet, red; warm
  and cool grounds), light and dark, all pairs over their tier; `/?palette` draws two selects in the host bar (palette,
  mode) that dress every board root; `window.fakeHost.dress(name, mode)` for specs.
- `guest.spec.ts` "theme": title says the type properties, a comment on native `light-dark()`; assertions unchanged.

**Baseline** (step 1): before and after, every one of 55 palette tokens resolved on the fake host's board root, light
and dark, equal (`temp/host-styling/before-tokens.json` vs `after-tokens.json`, 0 diffs), and the board's screenshots
byte-identical: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/host-styling/before-light.png`,
`…/before-dark.png`, `…/after-light.png`, `…/after-dark.png`. Capture script: `temp/host-styling/baseline.spec.ts`
(`npx playwright test --config temp/host-styling/pw.config.ts baseline`, `VB_LABEL=before|after`).

**Harness screenshots** (each palette forced against the system, a card selected): `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/host-styling/palette-{own,orange,green,blue,violet,red}-{light,dark}.png`
(script `temp/host-styling/palettes.spec.ts`).

**APCA under its tier** (the board's own defaults on the host table, `host-styling.spec.ts` "contrast:" logs them):
`--vb-line-strong` on card / canvas Lc 27.6 / 21.7 light, 0.0 / 0.0 dark; `--vb-line-contrast` 39.7 / 33.7 light,
10.8 / 11.7 dark. The table's "`--host-line-strong` … Lc 30" row does not hold for the board's own lines ("faint by
design; not a contrast tier", tokens.css § Lines), so the test measures and logs them but holds only `--vb-focus` at 30.
Every other pair passes (muted on deep 60.5 light, 60.1 dark; on-fill on fill 60.4 dark are the closest).

**Requests**
- R1 (blocking for "scope: on the mount root alone"): `apps/board/src/styles/ui-scale.css`: `:root` → `:root, .vb-board`.
  Its `--vb-ui-text-*` multiply `--vb-ui-text-scale` where they are declared, so a `--host-text-scale` on the root alone
  never reaches them (the test sees 16px for 13px). One selector; same values, standalone unchanged.
- R2 (non-blocking): `docs/specification/plugin.md` § Theme and host styling: (a) the Contrast table's `--host-line-strong`
  … Lc 30 row: the board's own lines are under it (above); drop line-strong from that row or say lines are not a tier, and
  the "contrast:" test then needs no exception; (b) "**Colours** (`packages/tokens/src/tokens.css`)": the reads are in
  `apps/board/plugin/theme.css`, the defaults in tokens.css.

**Notes**
- Port 9100 is held by another app on this machine (KiroCrew's file explorer); every run here used `VB_TEST_PORT=9110`.
- `palettes.js` blue sets its own `--host-focus`; the others leave it to the accent, so both paths show.
