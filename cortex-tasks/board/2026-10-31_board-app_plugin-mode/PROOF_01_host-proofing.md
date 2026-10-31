# PROOF_01_host-proofing: Nothing assumes it owns the page

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The board behaves as a guest in any page: tracker M12, M13, M15, M21, M22, plus the image route and the zoomed image view. RESEARCH § 4 "where the board strays".

## Steps

Each with its failing test first, in a fixture host with its own keys, its own storage and two boards from different folders.

1. **M12**: every flag comes from `host.settings`, with its default; no module switch (`setMarkdownImages`, `setMarkdownSvg`).
2. **M13**: the saved view goes through the host, keyed so two bots with a board "plans" never clash. Standalone keeps sessionStorage in its host.
3. **M21**: an open board menu takes Esc only when focus is in the board. **M22**: every key the board acts on is `preventDefault`ed, and typing includes `[contenteditable]`, so a host can tell.
4. **M15**: `x-hosts` on each tool in `openapi.json`, generated into the table: what a plugin bot gets. `read_attachment` is `standalone`. `list_apps`, `join` and `request_grant` are settled here, with the reasoning noted.
5. **Images**: a host's route prefix works for `io/image.ts` and `/board-images`; no bare `fetch` to a fixed path.
6. **The zoomed image view** draws inside `root`, or says plainly why it can't. A check that no document-level listener outlives `unmount`, and every selector stays scoped.

## Validation

- [ ] Two mounts in one page don't share a view or a listener; unmount leaves nothing behind (a test counts listeners)
- [ ] `host-styles` holds; standalone's specs pass

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

### What changed
- **M12**: no module switch left. `renderMarkdown(src, { images, svg, imageRoute })`, each left out reading its flag's default. `host.ts` `markdownOf(host)` is read once per board and goes to every surface: `NodeTemplateOptions.markdown`, `RegionFrameOptions.markdown`, `VbNoteBubbleElement.show(v, card, md)`. The standalone chat and the gallery take `flags.ts` `pageMarkdown()`.
- **M13**: `BoardHost.store` (`BoardStore`: `get`, `set`, strings). Optional: left out, `memoryStore()` for the mount, so switching boards still restores a view. Keys are the board's (`view.<board>`, `proposals-hidden`); the host keeps folders apart by giving each its own store. Standalone: `shell/kept.ts` `pageStore`, the same storage keys as before (`vb.view.<board>` in sessionStorage, `vb.proposals-hidden` in localStorage). `board/kept.ts` went back to `shell/`: nothing under `board/` reads storage now (`apps/board/tests/board-no-page.test.ts`).
- **M21**: `dismissable`'s `escape` may be an element; `escapeIsOurs` then takes Esc only with focus in that element's board, or nowhere (the body: WCAG 1.4.13, a tip under the pointer must still close). The hover tip passes itself. It is the only caller that had `escape`.
- **M22**: `route` marks H, R and an Esc that did something; `StageHandlers.escape` returns whether it did. `[contenteditable]` joins the typing test. Under a host `bindKeys` and `KeyHelp` listen on the root, not the document: a host's document listener registered first would otherwise read `defaultPrevented` before the board had set it. A modal's keys stop at the root (`mount.ts` `keepModalKeys`), since a `preventDefault` would stop the browser's own Esc.
- **M15**: `x-hosts` on all 12 agent operations, read by `gen-api.mjs` `toolTableWithHosts` (a missing or stray one stops the build), written to the tool table's `hosts`. `engine.tools` gives what is marked `plugin`; a test holds the two equal.
- **Images**: `BoardHost.imageRoute`, used by `<img src>`, the versioned address and `imageVersion`. `engine.image({ method, path, ifNoneMatch })` answers it with the standalone route's checks: `images.ts` split into `openImage`, `serveImage` and `imageReply`. `EngineOptions.flags` for `svgImages`.
- **Zoomed view**: inside the root, beside the stage (`stage.parentElement`, so its keys and pointer never reach the stage, and with `boardChromeInMount` off it is the body, as before). It fills the root's box, not the window; on the standalone page that is the window, so no pixel moved. `disconnectedCallback` drops its `resize` listener: unmounting with it open used to leave one.

### Security (M15's reasoning)
- `join`: `standalone`. A plugin bot is named by its host (nclite's run ticket), and `tools.call` takes the caller only from `ctx`, so a secret from `join` could not be used. All it could do is write ledger lines naming agents, with a label the bot chooses, that show in the access strip. A host registers its bot once through `route` (`POST agents`).
- `request_grant`: both. A person's board or another agent's answers `needs-grant` under any host; without this the bot could only stop. It writes only a request; granting is the person's click (`act`, `x-agent: false`).
- `list_apps`: `standalone`. The app host stays with the standalone server (api.md 161), and the engine could not answer it. A host without one sets `appCards` off (apps.md).
- `read_attachment`: `standalone`, as told. D-068 ruling 6.
- No operation that edits the ledger directly, or answers ✓, ✗ or an approval, is a tool: `act` and the rest are `x-agent: false`, and `x-hosts` on one stops the build.

### Decided alone (reversible; for review)
1. `store` and `imageRoute` are optional on `BoardHost`, so a host with neither still gets a working board.
2. `imageRoute` is a string, not `host.api`: a browser loads `<img src>` by address, so the version question goes the same way, on the browser's cookies. It is still a `fetch`, in `io/image.ts`, the page's one I/O layer, but to the host's address. A host whose route needs a header can't use `<img>` at all.
3. An Esc with focus nowhere closes a tip under a host too, and stops there. The host loses that Esc only when it has no focus anywhere and a board's tip is open under the pointer.
4. The zoomed view stays a real modal: a host's page is inert while it is open. That is what "says plainly" comes to: it draws inside the root, but `showModal` is the page's, as for the board's other dialogs (CHROME_01). Non-modal would mean rebuilding focus handling and would risk its screenshots.
5. The x-hosts reader is in `gen-api.mjs`, not `gen-tools.mjs`, because the row names only `gen-api.mjs`. It would read better in `gen-tools.mjs` `toolTable` (REQUESTS).

### Draft for docs/decisions.md (orchestrator)
**D-0xx. What a plugin bot gets, and what the board keeps through its host.** `x-hosts` on each agent operation in `openapi.json` says who gives its tool; `engine.tools` is exactly those marked `plugin`. `join`, `list_apps` and `read_attachment` are `standalone`; `request_grant` is for both. `BoardHost` gains two optional parts, `store` and `imageRoute`, and the engine gains `image`. Why: a host names its bot, so a bot has no need of an identity of its own; the app host and the chat's reader stay with the standalone host; a request only asks, and the person's click decides.

### Noticed, for later tasks
- CONTRACT_01: a plugin bot still reads about `join` in the skill, and `write_board`'s description tells it to get an app id `from list_apps`. `list_open` and `check_responses` say "with your secret". The spec should say what those mean under a host, or the words need a host-neutral form (protected: agent words).
- CONTRACT_01: state that a host sets `appCards` off unless it hosts apps, or the board's `listApps` goes to `host.api` and fails. Also state "skip a key whose `defaultPrevented` is true", that a host's capture-phase listener on the window or document runs before the board's, and that `imageRoute` needs an `img-src` that allows it in the host's CSP.
- BUILD_01: `images.ts` is now in the engine's import graph (`node:http` as types only).
- Two versions of the plugin on one page: custom elements are global and `defineBoardElements` defines each once, so the first bundle's classes win. Not hit by one plugin; the spec should say a page holds one version.
- `watchTheme` (`apps/app-cards.ts`) reads `data-theme` on the host's `<html>`, read only. A host that themes differently will not redraw app panels on a change.
- The `MediaQuery` in `Toolbar.svelte` (`max-width: 1500px`) only applies with `adaptiveHeader` off, and `window.innerWidth` there is a first guess until the bar's `ResizeObserver` reports. Both are window-sized, harmless with the flag on; they go when that flag's off branch does.
- Toolbar and styles left as they are (REQUESTS): the vertical caps and one `100vw` in `apps/board/src/styles/`, outside this task's row.

### Tests
`tests/pages/board-guest.spec.ts` (new, 8 tests; all failed on the code before this task, two of them, pictures and the zoomed view, also for a mistake in the spec: a picture waits until its card is near, so they zoom to it first), fixture additions in `board-host-fixture.ts`; `apps/board/tests/board-no-page.test.ts` (new); `keys.test.ts`, `kept.test.ts`, `engine.test.ts`, `markdown-images.test.ts`, `base-layer.test.ts`, `gen-tools.test.mjs` extended. No gallery entry: no new pattern. No screenshot changed; none re-baselined.

## On Completion

Notes; your row; one LOG line (`[board-security] PROOF_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
