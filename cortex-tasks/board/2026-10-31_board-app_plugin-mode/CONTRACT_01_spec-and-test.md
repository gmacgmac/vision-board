# CONTRACT_01_spec-and-test: The spec and the contract test

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`docs/specification/plugin.md` says, generally, what any host implements. `tests/plugin/` proves a host written only from that spec gets a whole, working board.

## Steps

1. **The spec**: what a plugin is here; the folder; the view seam and the engine seam, each hook, what it promises and what happens without it; the manifest; tools over MCP, with the worked transports (stdio `vb-mcp`; a host's own MCP server calling `tools.call`); attachments (the host's chat; how a path reaches the agent); theme; how to link the folder and update. Plain, general, no host named in the seam. A last section: **what nclite needs**, as a list: its contract's gaps (RESEARCH § 4), each with why and a suggested change, and the recommended tool pass-through (RESEARCH § 2).
2. **The fake host**: `tests/plugin/fake-host/`, written from the spec alone, importing only `dist/plugin/board/`. It runs a different Svelte beside the bundle, hostile element styles, and its own keys.
3. **The test**: every view hook and every engine hook; every listed tool; a chip added, replaced and removed; Send; `reveal`; `unmount` leaves nothing. Add a board-to-chat round trip through a fake chat that uses only the seam.
4. **nclite's prototype**: mount the built folder in a copy of `prototypes/plugin-host/` under `temp/` (never write in nclite), and report what its `PluginHost` lacks. Not a test we keep: findings for the list.

## Validation

- [ ] The fake host imports nothing outside the built folder and the spec's shapes
- [ ] Each hook in the spec names its test (`cortex-docs`)

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

### What it is
- **The spec**: `docs/specification/plugin.md`: the folder, the view seam, the chat, a guest in the host's page, the engine seam, the bot and tools with two worked transports, attachments, theme, the manifest, standalone's own, Not covered, Open points, What nclite needs. Nothing before the last section names a host (a test holds it).
- **The fake host**: `tests/plugin/fake-host/`, from the spec alone. Its server reads the folder's manifest and loads its engine by that path; its page loads the styles and view by the manifest's paths, under a strict CSP, with loud element rules, its own keys, and the board nested in a pane drawn by its own Svelte. A test scans its imports.
- **The test**: `npm run test:plugin` (`tests/plugin/playwright.config.ts`; `global-setup.ts` runs `npm run build:plugin` first, so a missing folder can't pass): 46 tests. Every view hook, every engine hook, every listed tool, a chip added, replaced, removed and spent, Send, `reveal`, `unmount`, a board-to-chat round trip through a fake chat that uses only the seam, the short pane. `tests/plugin/spec-truth.test.ts` runs in `npm test`, no build: every test the spec names exists, every member of the seam is in it.
- **A different Svelte, really**: `guest.spec.ts` compiled and ran the fake host's pane with nclite's copy on disk (read only), **5.56.1 beside the bundle's 5.57.1**. Where that copy is absent, or by `VB_HOST_SVELTE`, it uses another; with only the repo's it is the same version, and the test's annotation and console line say so.

### The requests
- **CONTRACT-R1**: `apps/board/plugin/view.ts` `mount` and `plugin/engine.ts` `createEngine` give a host exactly what the spec says: `board`, `onSend`, an open `ledger`, `engine.ledger`, `engine.agents` and `dir` are not in the folder. Tests hold the absences. Standalone and `#board` are unchanged; the spec names them under § Standalone's own.
- **CONTRACT-R2**: `images.md` § The route. Also a `components.md` pointer, and its `board` sentence.
- **CONTRACT-R3**: the fake host's 420 by 300 pane showed the fault first: "⋯" 57 px below the root, the key help 227 px above it. Fixed with `100cqw` and `100cqh`: the root is now a size container (`board.css`, `.vb-board:not(.vb-stage)`), which asks nothing new of a host, since everything in it is absolute. 129 page specs (host-styles, board-chrome, board-guest, board-host, toolbar, proposals, gallery, key-bubble, header-tiers) pass with no screenshot changed.
- **CONTRACT-R4, R5, R6**: in the spec. Open points, pictures first, with a recommendation (a `put_image` tool).

### Found by writing the host from the spec
1. **`img-src` needs `data:`**: `.vb-md-img:not([src])` is a `data:` gif. In the spec; the fake host's CSP allows it.
2. **`staged` wasn't as optional as `host.ts` said**: with it off, a selection alone couldn't be sent. Fixed in Run 2.
3. **BUILD_01's "colours follow `color-scheme`" is not so**: the build lowers `light-dark()`, so a host's `color-scheme` moves nothing, and `data-theme` works only on the page's root (on a board's root, it does not). `theme.css`'s comment is corrected; the spec and a test say what is true. Open point 8.
4. **A real bug**: a hover tip open at `unmount` left `dismissable`'s two listeners on the document. Fixed in Run 2.
5. **In the look**: the "1 selected" pill painted over "⋯" and the key help in a short pane. Fixed in Run 2.

### nclite's prototype (a copy under `temp/`, removed; nothing written in nclite)
It needs no install, so it ran. `checkManifest` refuses the folder (icon, version, view, data, settings, flat tool inputs). With a throwaway manifest and engine shim it loads, and `mount` throws at `host.chat`, the first thing `createAppHost` lacks. The rest comes from reading. All in the spec's last section.

### Decided alone (reversible; in Open points)
The folder narrows at its entries, not in `mount` (`#board` keeps `board` until the flag's off branch goes); the root as a size container; `put_image` is a recommendation only, nothing built.

### Verification
Normal tier, with `test:plugin`. No gallery entry: no new pattern. A look at the fake host in light and dark, tall and short: the board whole, its menus inside the pane, the host's loud rules outside it. Skill scenarios not run (no real CLI).

### Run 2
What the first run's host found, fixed before VERIFY_01.
- **A tip open at `unmount`**: `packages/ui/src/tip/hover-tip.ts` `whenGone`: while a tip is open, a `MutationObserver` on its root node sees its host leave; `drop` then cancels the grace timer, resets the state and stops `dismissable`. It's in `bindHoverTip`, so every caller is covered, and a card a redraw takes away too, with no teardown to call. It stops a microtask after `unmount`, not within it. `view-gives.spec.ts` "unmount with a tip open leaves nothing" runs for the key help, a card popover, a container title and a link mark; the `test.fail` is gone. A probe of the other layers (a container's menu, a note bubble, the selection bar's menu, the zoom menu) left nothing either, with no change; the probe isn't kept.
- **`staged` is really optional**: `apps/board/src/board/chat-side.ts` `markAttached`: `chat.status.staged ?? (a chip of the board's own that hasn't gone)`. A chip has gone when a Send line lands on the board (`lastSend`), whoever recorded it, then it stays spent until its `ref` changes, the rule a host keeps too. `host.ts`'s and `status.ts`'s comments corrected; plugin.md's Open point 4 is now a plain statement (Open points has eleven).
- **Three things beyond the named files, each forced by that:** `shell/chat-bridge.ts` `statusNow` says `staged: false` before any panel exists, since the bridge exists with `chatPanel` off and standalone must not change. `apps/board/tests/chat-bridge.test.ts`: its "gives only what the agent is doing" test held the old answer (`chatAttached` false) and now holds the ruling; its fake panel gives `staged: false` as the real one does (`chat-panel.ts`); a new test holds the bridge's default. The no-chat sample in plugin.md gains `staged: false`, since nothing there carries a chip.
- **The pill**: small, done. `selection-bar.css` `vb-selection-bar` goes from `--vb-z-selection` (28) to the existing `--vb-z-open` (4): above the cards, under the header and, later in the page, the key help. `short-pane.spec.ts` "the selection pill paints under" checks with `elementFromPoint`. **`--vb-z-selection` is now unused in `packages/tokens/src/tokens.css`**, a protected file: I left it, and its comment still lists the selection bar. Propose removing the token and fixing the comment.
- **`tsconfig.json`**: `tests/plugin/**/*.ts` included; `npm run check` clean. **`api.md` 160**: names the folder's four options. `components.md`: the `staged` sentence. plugin.md § A guest gains **Layers**: the root makes no stacking context, so the board's `z-index`es meet a host's; under Not covered, since no test holds `isolation: isolate`.
- **No screenshot moved**: 206 page specs pass, none re-baselined (select, zoom-and-lasso, selection, board-host, board-chrome, board-guest, host-styles, chat-send, chat-context, chat-panel, gallery, send-access, toolbar, key-bubble, hover-tip, container-polish, layout-controls, note-polish).

**Draft for `docs/decisions.md` (orchestrator, with the maintainer's yes):** *The folder's entries give a host exactly what `docs/specification/plugin.md` says, and `mount`'s root is a size container, so what opens caps by the pane.* `apps/board/plugin/view.ts` and `plugin/engine.ts` leave out `board`, `onSend`, an opened `ledger`, `engine.ledger`, `engine.agents` and `dir`, which stay the standalone host's. `chat.status` needs only `now`: with no `staged`, a chip of the board's own that hasn't gone enables Send, and a `staged` given has the full say. Why: a host gets no way round the seam it can come to depend on, and a pane is not the window. Rejected: removing them from `#board` now (`App.svelte`'s test door still reads `board` until `boardChromeInMount`'s off branch goes); a `ResizeObserver` writing the root's height to a property (JavaScript for what CSS can do, since everything in the root is absolute).

## On Completion

Notes; your row; one LOG line (`[project-docs] CONTRACT_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
