# Plugin Mode - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-31 · **From**: maintainer points 337, 341, 343, 373 · **Research**: [RESEARCH_plugin-seam.md](./RESEARCH_plugin-seam.md)

---

## Problem Statement

The board's destination is a plugin in nclite, built once here and shared. Today a host gets the canvas but none of
its controls, and our own chat reaches the board around the host contract in seven places, so "works here" doesn't
mean "works there". The aim: **the standalone app is just another host of the same plugin**, using the same
mechanisms, so working here means working there, and an update there is a build and a reload.

---

## Current State

- Good: the page already mounts the board by `mount(root, host)` (`apps/board/src/board/mount.ts`, `shell/page-host.ts`),
  and the server side is already an engine with no server of its own (`apps/board/server/engine`, `createEngine`:
  `route`, `resolve`, `turn`, `tools`, `watch`). The CSS is already scoped and proven under a hostile host (D-061).
- Around the host (RESEARCH § 3): the composer's one chip and Send (`chat-bridge.ts`, `chat-panel.ts` `boardSend`,
  while `page-host.ts` `addToChat` is empty), a change chip zooming (`BoardSide.zoom`, `switchTo`), the stepper's link
  to the chat (`side.source`), a first board opening (`BoardSide.jump`), the agent's working mark and news
  (`chat-news.ts`), and a change chip's facts parsed from a tool result (`claude-stream.ts` `boardWriteSummary`).
- The controls are the page's: about 2,500 lines of Svelte in `apps/board/src/shell/` (toolbar, strips, dialogs, search, help).
- Not hosted cleanly: saved view in `sessionStorage` keyed by board only (M13), a raw `fetch` for images, page-wide
  keys and Esc (M21, M22), module switches for flags (M12), and no name for the view (M14).
- nclite (read only here): Svelte in Tauri. Its contract (`docs/plugins.md`, draft v0.1) is implemented only in a
  prototype; nothing in its `engine/` or `app/` yet. Its bot runs in a container with its own MCP server; tools
  either run there or call the engine through the run door. Attachments: its chat uploads on submit to the
  workspace's `media/inbound/` and tells the bot the path.

---

## Proposed Solution

Three layers, and one seam they meet at. Keep it general: plain ESM, JSON Schema, MCP's tool shape. Nothing here names nclite.

| Part | Holds |
|---|---|
| **The plugin** (built here) | The canvas, all the board's controls, its engine and tools, manifest, words, skill |
| **Standalone host** (thin) | Folder picking, the chat sidebar and its attachments, the web server and the agent adapters |
| **Another host** (nclite) | Its pane and pane header, its chat, a folder per bot, its theme |

### The seam

**View side.** `mount(root, host): BoardView`, a plain ESM export.
- The host gives: `api`, `events`, `settings`, `notify(text, tone?)`, `confirm(ask)`, and `chat`: `chat.attach(key, chip | null)`
  (add, replace or remove a chip, so the live selection and the answers use one path), `chat.send()` (send what is staged, with no
  words), `chat.status` (idle, working or asking, read only), and optionally `chat.reveal(ref)` (show the chat's line that changed a card).
- The view gives: `unmount`, `unsaved`, `leave`, `pageChip`, and `reveal({ board?, n?, seq?, cards? })`.
- `BoardSide` is deleted. The standalone chat uses only these. That is the test of the seam.

**Engine side**, async and MCP-shaped.
- `route(req, { caller, signal })`.
- `tools.list()` gives `{ name, description, inputSchema }`; `tools.call(name, input, ctx)` gives an MCP `CallToolResult`. The host
  checks input against the JSON Schema. The same list goes over two transports: standalone's `vb-mcp`; another host's own MCP server.
- `resolve(kind, ref)` turns a chip into its current text; `watch(onChange)` says what changed.

**Manifest**: JSON checked by a JSON Schema; its tools generated from the tool table (`openapi.json`, as now).

### How an update travels

`npm run build:plugin` writes one folder, `dist/plugin/board/` (manifest, bundled view and styles, bundled engine, words, skill). A
host links or copies it. A contract test with a fake host mounts the built folder, so a break shows here.

---

## Dependencies

- SEAM_01 first: the contract, then standalone moved onto it. Everything after builds on it.
- CHROME_01 before PROOF_01: controls move, then what they assume is cleaned up. BUILD_01 needs both. CONTRACT_01 needs the built folder. VERIFY_01 last.
- No new dependency. External: nclite's contract is a draft; what we need from it goes in the requests list, CONTRACT_01.

---

## House Rules

- **Orchestrator-only files**: `docs/decisions.md`, `docs/specification/modules.md`, `cortex-tasks/tracker.md`, `package.json` and the lockfile, `packages/format/src/flags.ts`, `.gitignore`.
- **Commits**: the orchestrator commits and tags per wave (`plugin/wave-N`); sub-agents never commit.
- **Project checks**: `npm run verify`, `check`, `gen-api --check`, tests by tier (`cortex-task-exe` § Testing by Tier); the full page suite after a wide wave and when the set closes.
- **Test time limit**: 15 minutes for the full suite, 5 for a spec group. A run that hangs is a failure to report.
- **The machine**: the maintainer dictates while this runs. Every test run uses `nice -n 15` and `VB_TEST_WORKERS=3`.
- **Flags**: `pluginSeam` and `boardChromeInMount` until the move is proven, then on. No `--omit=optional` on an install: it breaks vite.
- **Never** port 4466; never write in `~/ai/nclite`; existing screenshots change only if a look shows the change is wanted, and moving code should change none.

---

## Decisions

- **Standalone is a host of the plugin**, through the same mechanisms another host uses (maintainer, 2026-10-31). Keep it general and standard where possible.
- **The controls stay Svelte, compiled inside the plugin's bundle** (point 373): nclite is Svelte too, and it only ever calls `mount`. This amends tracker M8's "framework-free", and the host contract's "framework-free view" means framework-free to the host.
- **Local is master** (points 337, 341): nclite takes the built folder from here. GitLab gets only the cleaned export.
- **Tools reach any bot as MCP tools.** Recommended for nclite, from RESEARCH § 2: one generic plugin pass-through in its existing container MCP server, to the run door, to `engine.tools.call`. Its choice; we hand it the list and the call.
- **Attachments belong to the host's chat** (D-068 ruling 6). The plugin never sees a file. `read_attachment` and the PDF frame stay with the standalone chat (`x-hosts: standalone`, M15); `packages/documents` stays reusable. In nclite the reader runs in its container, which already has these tools.
- **The answers since the last Send are a chip**, through `chat.attach` and `resolve`: no extra prompt hook. It keeps the seam small. Planner's call under the maintainer's "keep it general": it can be overruled in review.
- The maintainer reviews the final spec, `docs/specification/plugin.md`, and may change any of these there.

---

## Out of Scope

- Building nclite's host, or any change in nclite. We write what it needs (CONTRACT_01); someone there builds it.
- Kiro V3, the Uplynk APIs, PowerPoint and Visio, a second board per page beyond what the contract asks.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Moving 2,500 lines of controls breaks something quietly | Move, don't rewrite; the page suite and its screenshots hold it, and a screenshot that changes is a bug here |
| The standalone chat depends on `BoardSide` in ways not listed | SEAM_01 starts from RESEARCH § 3's table; delete the type, and the compiler finds the rest |
| Bundling Svelte clashes with a host's Svelte | The bundle carries its own runtime and exports only `mount`; CONTRACT_01's fake host runs a different Svelte beside it |
| A dialog or menu reaches outside `root` | PROOF_01: everything inside the mount root or the host's `confirm`; `dismissable` and Esc per M21 |
| The contract drifts in nclite | The spec names its version; CONTRACT_01's test is ours; requests are listed, not assumed |
| Engine bundling carries `ajv` and `fflate` twice | The bundle is one ESM file; a host never imports its parts |

---

## References

- [RESEARCH_plugin-seam.md](./RESEARCH_plugin-seam.md); `docs/principles.md` § The board is a plugin; `docs/decisions.md` D-061, D-068 to D-073
- `apps/board/src/board/host.ts`, `mount.ts`; `apps/board/src/shell/page-host.ts`, `chat-bridge.ts`; `apps/board/server/engine/`; `packages/mcp/`
- `tests/pages/board-host-fixture.ts`, `host-styles.spec.ts`; nclite (read only): `docs/plugins.md`, `prototypes/plugin-host/`

---

## Success Criteria

- [ ] `BoardSide` is gone; the standalone chat reaches the board only through the seam; every chat spec still passes
- [ ] The board's controls draw inside `mount`'s root; a fake host gets the whole board with no help; no existing screenshot changes
- [ ] `npm run build:plugin` writes one folder; a fake host mounts that folder and exercises every hook and every tool
- [ ] `docs/specification/plugin.md` says what any host implements, generally, and the list of what nclite's contract needs
- [ ] All tests pass; a live look with the standalone app built from the plugin folder
