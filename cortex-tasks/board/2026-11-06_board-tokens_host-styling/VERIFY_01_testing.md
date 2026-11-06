# VERIFY_01: Final verification

> **Set**: [PLAN.md](./PLAN.md) · **Wave** 3 · **Skills**: cortex-docs

## Objective

Check the set against PLAN Success Criteria as a host would see it, and prepare the reply to nclite.

## Steps

1. `npm test`, `npm run verify`, `npm run test:plugin`, then the full page suite once (`npm run test:pages`,
   `VB_TEST_WORKERS=3`, `VB_TEST_PORT=9300`, `nice -n 15`, a time limit). Read the exit codes yourself.
2. `npm run build:plugin`; confirm no `--lightningcss-*` in `view/board.css` and `seam` still 1.
3. In a browser, the harness page: each of the five accents, light and dark, forced against the system; a board
   with no host property beside today's. Measure with APCA the board's own fixed colours (kinds, states, wires) on
   each host ground and report any pair under its tier. Screenshots under `temp/host-styling/verify/`.
4. The layout tooltip on hover and focus, light and dark; no overlay anywhere.
5. `cortex-docs` audit of every doc the set touched (`plugin.md`, specs, `words.md`).
6. Draft the reply to nclite in your notes: the final property names, `--host-color-scheme` instead of inheritance
   (PLAN Decision 5) and the line nclite adds for it, the seam (unchanged), the commit to vendor (the orchestrator
   fills it), and items 8 and 9 as landed.

## Constraints

Deviation → stop and tell the user. No PII. No commits. Never port 4466. Update this file's notes on completion.

## Implementation Notes

Status: COMPLETED with one open finding (59 gallery screenshots, below). Nothing built, no baseline changed.

**Gates** (logs in `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/host-styling/verify/`)
- `npm test`: exit 0, 2418 + 14 tests pass (`npm-test.log`).
- `npm run verify`: exit 0, 35 warnings, all long-file "aim for about 300" (`verify.log`).
- `npm run test:plugin` (`VB_TEST_PORT=9310`, free when checked): exit 0, 94 passed (`test-plugin.log`).
- `npm run build:plugin`: exit 0; `grep -c lightningcss dist/plugin/board/view/board.css` = 0; `manifest.json` `seam` = 1; the built `skill.md` carries the v3.31 row text (a `row` per container, "leave `mode` out and a new container is a `row`").
- `npm run test:pages` (3 workers, 9300, nice, 45 min limit): exit 1, 928 passed, 59 failed, 18 did not run (the `budgets` project waits on `chromium`). Ran `perf.spec.ts` alone (`--project=budgets --no-deps`): 10 passed (`perf.log`). The 59 are all gallery section screenshots, no other kind (`test-pages.log`).
- `npm run eval:bot -- --dry`: 75/75 checks, 13 runs, $0.0000. Live `--only two-turns,draw --port 6310` (it rebuilds the plugin itself, then uses the built skill): 13/13 checks, 2 runs, **$0.1360** ($0.0591 + $0.0769), sonnet (claude-sonnet-5-5). Reports: `tests/evals/bot/out/2026-11-06T15-26-25-013Z/report.md` (dry), `.../2026-11-06T15-26-33-095Z/report.md` (live; its `skill.md` holds the v3.31 row). FE_03-R1 done.

**The 59 failures and FE_02-R3** (the lock section is one of them)
- Same on main? No. On a plain export of 36d3222 (`git archive` into the scratchpad, `node_modules` linked, ports 9380; the main checkout untouched) `lock-board`, `access-by-bot`, `toolbar` pass (37 passed). So this set moved them.
- Cause: the new gallery group (`layout-tip-section.ts`, called in `region-section.ts`) makes the `region` section 792.938 px taller (5079.109 -> 5872.047, `gallery-y.txt`), not a whole number. Every section below it moves down 792.938 px, so its fractional offset changes (lock section top .375 -> .313) and frame edges and text round to other pixels. Inside the lock section nothing moved (parts identical to 36d3222 within it, but for the removed `vb-mode-pop`; `lock-probe.txt`). Proof: in a temp spec, padding the region section by 0.0625 px (so the growth is a whole 793 px) makes the lock section match the committed baseline in light and dark (`lock-hypothesis.spec.ts`: 4/4 pass; 0.062 px, not a 1/64-multiple, did not). The access-by-bot diff is text anti-aliasing only.
- It is a side effect of the intended gallery growth, not a visual change, so I did not update 59 baselines (118 PNGs). Fix is VERIFY_01-R1 (below): make the new group's height a whole number of px; then no baseline moves. If that is not wanted, the alternative is `npm run test:pages -- --update-snapshots` for these 59, which has to be redone at every later gallery growth.

**Browser, `/?palette`** (fake host; 1500x900; each palette forced against the system: light shots on a dark system, dark on a light one; a card selected, 7 kinds and a link drawn)
- Screenshots: `palette-{own,orange,green,blue,violet,red}-{light,dark}.png`, and a board with no host property beside a dressed one, system dark: `beside-orange-light-system-dark.png`, `beside-green-dark-system-dark.png` (all in `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board/.claude/worktrees/host-styling/temp/host-styling/verify/`). Each palette dresses the whole board (canvas, cards, accent button, selection, focus), the mode follows `--host-color-scheme`, the undressed board beside it follows the system. Kinds, states and wires keep their own colours on every ground.
- APCA (APCA-W3 0.0.98G-4g, `apca-report.txt`): the board's own fixed colours (7 card kinds, 8 states, `--vb-wire`, `--vb-wire-hot`, `--vb-agent`; labels held to Lc 45, wires and agent to 30) on each palette's canvas and card, light and dark: none under its tier. Closest: `state-updated` on canvas Lc 55.3 to 55.6 (light), `state-drop` on card Lc 46.9 (dark, every palette). The grounds of the five palettes are close to the board's own, so the numbers barely move; a host with a very different ground is outside what the spec measures (plugin.md "Not covered"). That row now says "not measured by a test": this run measured it once by a temp spec only.
- Not done: the layout tooltip under a host palette. The plugin harness board opens at 38% zoom, where I could not reach the layout icons by a locator, and I stopped there. It draws from the same tokens the pages above show; flagged, not looked at.

**Layout tooltip** (standalone board, `tooltip-hover-{light,dark}.png`, `tooltip-focus-{light,dark}.png`, `tooltip-focus-full-{light,dark}.png`): hover and keyboard focus on Flow each show one tip, name over hint ("Flow" / "Connected steps and where they branch"), to the right of the icon, covering no icon and no card; no `.vb-mode-pop` or `.vb-mtile` exists in either state. Note: right after the pointer left a container title (zoomTo), the title's own tip was still up beside the layout tip for under 1.5 s; after a 1.5 s wait it is gone. A grace delay, not a bug I can show; not in the set.

**cortex-docs audit** (`plugin.md`, `api.md`, `components.md`; `words.md` not touched, no new words)
- Every test and symbol the changed claims name exists (`bindLayoutTips` in `region-layout-tip.ts`, `modeButton`, `withMode`, `layout-tooltip.spec.ts`, `api-row-default.test.ts`, `host-styling.spec.ts`), and spec-truth passes inside `npm test`.
- `api.md` and `components.md` frontmatter `updated:` was not bumped for this set (still 2026-11-05 entries on top); `plugin.md` was. Non-blocking (VERIFY_01-R2).
- `plugin.md` "Not covered" says the board's own colours on a host's grounds are "looked at, not measured by a test": true of the suite; this run measured them once (above). Worth keeping as is.
- `plugin.md` § Off: "the type's three still apply" with the flag off, fine. FE_01-R2 text is in.

**Draft reply to nclite** (plain, short; `<commit>` for the orchestrator)

> The host styling you asked for (N577) is in the board, commit `<commit>` (vendor the plugin folder from it). Nothing else about the seam moved: `seam` is still 1, and a host that sets none of this sees the board as before.
>
> **Properties** (set on the mount root or any ancestor, read by the board, never set by it): `--host-accent`, `--host-accent-strong`, `--host-on-accent`, `--host-canvas`, `--host-surface`, `--host-surface-sunken`, `--host-ink`, `--host-ink-muted`, `--host-line`, `--host-line-strong`, `--host-focus` (falls back to the accent), and `--host-color-scheme`. The three type properties (`--host-font`, `--host-font-mono`, `--host-text-scale`) now work on the root too. Give each colour as one finished colour for the mode the board is in, and change it when your mode changes. A colour you leave out keeps the board's own. The accent's soft ground and edge are mixed from your accent and surface. The card kinds, the state colours, the wires and the shadows stay the board's.
>
> **Mode (your decision 5).** The board does not inherit `color-scheme` from you: an unset page says `normal`, which would turn every colour light. It reads `--host-color-scheme` (`light`, `dark` or `light dark`) on the root instead. The line nclite adds: set `--host-color-scheme` on the pane's root from its `data-mode` (not from `data-theme`, which holds your palette names and which the board ignores). Without it, `data-theme="light|dark"` on `<html>` forces one, else the system's.
>
> **Contrast is yours.** In each mode you give, `--host-ink` and `--host-ink-muted` on surface, canvas and sunken are Lc 60 or more; `--host-on-accent` on the accent and accent-strong, 60; `--host-accent-strong` as text on surface and canvas, 45; `--host-focus` on surface and canvas, 30 (APCA-W3 0.0.98G-4g). The spec's table has it; the fake host's five palettes (orange, green, blue, violet, red, light and dark) meet it.
>
> **Item 8 (the sheet and `:root`)**: landed. The tokens are on `:root` and on the board's root, so a property on your mount root reaches them and two boards in a page may differ; `light-dark()` is kept native in the plugin's sheet. **Item 9 (a new container is a row)**: landed. A container sent with no `mode` is a `row`, an existing one keeps its layout, and the stored line always names its mode; the bot's skill says so (v3.31). Also in this bundle: the layout icons show a tooltip on hover and focus instead of the big popover (flag `layoutTooltip`, on; `hostStyling` is the flag for the colours, on). One flag turns each off.

**Requests**
- VERIFY_01-R1 (blocking for a green page suite): FE_02's gallery group (`apps/board/src/gallery/layout-tip-section.ts`, `gallery.css`): make the group's added height a whole number of px (now 792.938), so the sections below keep their fractional offsets and the 59 section screenshots match unchanged. Then re-run `npm run test:pages` once.
- VERIFY_01-R2 (non-blocking): `docs/specification/api.md`, `components.md`: bump `updated:` for this set (cortex-docs).
