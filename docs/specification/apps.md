---
category: project-docs
type: specification
status: active
created: 2026-10-17
updated: 2026-11-03 (the folders' place from the paths module); 2026-10-27
scope: The app card contract — an app's folder, manifest, panel protocol, saved panel state, tools module, limits, approval and states
---

# App cards

An app card shows a small app the agent built, inside a card, where the person can use it (D-047).
The board owns the card, the frame it draws, the server that runs the app's tools, the rules and the
approvals. The agent owns everything in the app's folder and may change it whenever it likes; the
board never writes there.

This page is the contract for both sides: the agent that builds an app, and the board code that
shows and runs it. Its sources: the manifest's JSON Schema
(`packages/format/schema/app/manifest.schema.json`), the shared table
(`packages/format/src/apps.ts`), the ledger's app card and acts (api.md 150-151) and the two
operations, `list_apps` and `call_app_tool` (api.md 152-153); a card's saved panel state has its own
schema (`packages/format/schema/app/panel-state.schema.json`) and two operations (api.md 157). The
example app is
`skills/vision-board/examples/apps/calculator/`.

The app host is the standalone app's: the engine has none, so `list_apps` is `x-hosts: standalone`
(api.md 46) and a plugin bot is not given it. A host with no app host of its own turns the `appCards` flag
off in its settings (`BoardHost.settings`): an app card is then a plain card saying so, and the board asks
for nothing.

## The folder

An app is one folder in the open ledger's folder: `.visionboard/apps/<id>/` in the open project, or with ledger
folders (D-084, api.md 113a) `.visionboard/<ledger>/apps/<id>/`, so each ledger has its own apps (`ledgerFiles` `apps`
of `ledgerFolder` in `packages/format/src/data-folder.ts`, the one home of the data folder's layout; `appsDir(project,
ledger)` in `apps/board/server/apps/manifest.ts`, which the app host calls with the open ledger, `apps/host.ts`
`createAppHost` `ledgerName`). The move into `main/` carries the apps with the ledger (`apps/board/tests/ledger-move.test.ts`). The id is the folder's name,
with the pattern of every other id: lower-case letters, digits and hyphens, not starting with a
hyphen (`APP_ID`). The folder holds:

- `app.json`, the manifest (§ The manifest);
- the panel, one HTML file (`panel.html` unless the manifest names another);
- the tools module, an ES module file (`tools.mjs` unless the manifest names another). An app with
  no tools file has a panel only.

The board reads only the open ledger's `apps/*`. It checks an id against the pattern before it builds any
path, takes the manifest's file names only as plain names inside the folder (no `/`, no `..`, not
hidden), and refuses any resolved path that leaves the folder, a link out included. A folder whose
name is not an id is not an app: `list_apps` leaves it out. No file may be over `fileBytes`
(§ Limits).

## The manifest

`app.json`, checked against `manifest.schema.json`. Unknown fields are refused.

| Field | Needed | What it is |
|---|---|---|
| `id` | yes | The app's id, the same as its folder's name. |
| `title` | yes | The app's name, as the card shows it. |
| `version` | yes | Your version number, such as `1.0.0`. |
| `panel` | no | The panel file; default `panel.html`. Ends in `.html`. |
| `tools` | no | The tools file; default `tools.mjs` when the folder has one. Ends in `.mjs`. |
| `size` | no | `{ w, h }`: the panel's size for a card that sets none (§ Panel size). |
| `env` | no | The keys in the project's `.env` the tools may read, such as `["RATES_API_KEY"]`. |
| `csp` | no | `{ connectDomains, resourceDomains }`: places beyond the board the panel may reach (§ Panel CSP). |

## Panel size

The agent sets the panel's size on the card, in px: `app: { id, w, h }` on the `node` item. Left
out, the size is the manifest's `size`, else the default (`appSize`); `list_apps` sends it while
`size` itself is good, even when app.json has other problems. The card is as wide as the
panel plus its own padding; the person's S, M and L sizes don't apply to an app card, and an app
card takes no `size` word. Limits (`APP_SIZE`; the schema holds the same numbers):

| Side | Least | Most | Default |
|---|---|---|---|
| `w` | 280 | 960 | 360 |
| `h` | 120 | 800 | 320 |

A panel can tell the board its content's height, so the card fits it (the `appFit` flag, on by
default): it sends MCP Apps' `ui/notifications/size-changed` with `{ height }` in px, and the board
sets the frame to that height, rounded and held to 120 to `toldHeight` (1080, § Limits;
`packages/ui/src/app-frame/app-frame-size.ts` `panelHeight`). A told height may be taller than the
`h` the agent may ask for (800, the table above) because it is never stored: the agent's `h` is in the
ledger, so its limit is part of the ledger format (the schema's `appHeight`), and a told height is
not, so raising its limit changes no format. The card is measured again and the
cards under it move with it; nothing is written to the ledger or the panel's saved state. The width
stays the agent's `w`: a `width` in the message is ignored. The agent's `h` is the height until the
panel tells one, and again once its frame is removed (the panel starts again at it); a frozen panel
keeps its last height. A height equal to the frame's does nothing, and the message counts towards
`panelMessagesPerSecond`, so a panel whose content grows with its frame stops at 1080. A panel that
tells nothing keeps the agent's size; with the flag off, `size-changed` is ignored. `containerDimensions`
in the host context stays the agent's `w` and `h`, and the board sends no `host-context-changed` for
a height the panel told (MCP Apps leaves that to the host: "MAY").

So set `h` near the content's height, so the first draw is close, and send the height whenever it
changes: measure the document at `height: max-content` (its content's own height, not the frame's)
and send it when a `ResizeObserver` on the body says the size changed (the skill,
`skills/vision-board/SKILL.md` § Apps on the board, has the lines; the example calculator does it).

## The panel

One self-contained HTML document: its script and style sit inside it (inline `<script>` and
`<style>`); images and fonts are `data:` URLs unless the manifest's `csp` names where they come from.
The board shows it in a frame inside the card:

- `<iframe sandbox="allow-scripts">`, never `allow-same-origin`, `allow-top-navigation`,
  `allow-popups` or `allow-forms`. The panel has an opaque origin: it can't read the board's page,
  cookies or storage, and can't call `/api`.
- `src` is the board's panel route, `/app-panels/<id>`, outside `/api`; `title` names the app.
- The frame is made the first time its card is on screen and the board is zoomed in enough to use
  it (the toolbar shows 55% or more), then kept loaded (D-050): while the card is off
  screen or the board is zoomed out past that, the panel is frozen, still running and holding what
  it holds, but taking no click or key (`inert`) and not painted, the placeholder in its place; back
  on screen, it carries on as it was. A panel may be frozen at any time, so its timers may run
  while nobody sees it. The page keeps at most `LIVE_PANELS` loaded (`apps/board/src/board/apps/app-cards.ts`):
  past it, the least recently used frozen panel is removed (a panel on screen never is). A frame is
  also removed when its card goes or its state shows no panel. A removed panel starts again when
  it comes back, as it does after a page reload, so keep nothing in the panel that a restart would
  lose unless the panel saves it (§ Saving the panel's state).

### Panel CSP

The panel route answers with its own `Content-Security-Policy`:

```
sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data:; font-src data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none';
form-action 'none'
```

The manifest's `csp` widens it, with MCP Apps' names: each of `connectDomains` adds to
`connect-src` (fetch and sockets), and each of `resourceDomains` to `img-src`, `font-src` and
`style-src`. Each is one https origin with an exact host, such as `https://api.example.com`: no
wildcard, no path. The board page itself allows frames from its own server only (`frame-src 'self'`).

The route (`apps/board/server/apps/panel.ts` `servePanel`, `panelCsp`) sends the panel file as
`text/html` with `Cache-Control: no-store` and no cookie. It answers 404 for an id that isn't one
(it is never decoded), an app that is `missing` or `invalid`, and when app cards are off; the 404
carries the panel's policy too (the one above, with no manifest's domains), so a card's frame that
asks after the folder went loads the refusal instead of a blank the board page's own
`frame-ancestors 'none'` would make, and the board page reads `list_apps` again when it loads. The
`sandbox` directive keeps the panel on an opaque origin even when it is opened on its own.

## The panel protocol

The panel talks to the board only by messages: JSON-RPC 2.0 objects sent with
`window.parent.postMessage(message, '*')`, in MCP Apps' shape (version `APP_PROTOCOL_VERSION`). The
board answers with `postMessage` to the panel's window. It takes a message only from the card's own
frame, checks every one, and answers a request it doesn't know with an error. Nothing reaches the
panel before it says it is ready.

1. The panel sends `ui/initialize` and gets the host context.
2. The panel sends `ui/notifications/initialized`. From now on the board may send it messages.
3. The panel sends `tools/call` whenever it wants a tool to run, and gets the tool's result.
4. The panel sends `vision-board/save-state` whenever its place changes, to get it back when it
   starts again (§ Saving the panel's state).

The board's own methods start with `vision-board/`, the board's `hostInfo.name` (`APP_HOST_NAME`).
MCP Apps' panel methods start with `ui/`, beside MCP's `tools/call` and `ping`, so a method MCP Apps
adds later can't collide with one of the board's. `ui/notifications/escape` came before this rule
and keeps its name.

### Panel to board

| Method | Kind | What it does |
|---|---|---|
| `ui/initialize` | request | Params: `{ protocolVersion, appCapabilities? }`. Answers `{ protocolVersion, hostInfo, hostCapabilities, hostContext }`. |
| `ui/notifications/initialized` | notification | The panel is ready for messages. |
| `tools/call` | request | Params: `{ name, arguments? }`. Answers the tool's result (§ Tool results). |
| `ping` | request | Answers `{}`. |
| `ui/notifications/size-changed` | notification | Params: `{ height }`, the content's height in px; sets the panel's height (§ Panel size). A `width` is ignored. |
| `ui/notifications/escape` | notification | The board's own: the person pressed Esc in the panel; focus goes back to the card. |
| `vision-board/save-state` | request | The board's own. Params: `{ state }`. Answers `{}` (§ Saving the panel's state). |

### Board to panel

| Method | What it carries |
|---|---|
| `ui/notifications/host-context-changed` | The parts of the host context that changed: `theme` and `styles` when the board's theme changes. |

### Host context

The `hostContext` in the answer to `ui/initialize`:

- `theme`: `light` or `dark`, the board's theme now.
- `containerDimensions`: `{ width, height }`, the panel's size in px as the agent drew it (a height the
  panel told is not sent back, § Panel size).
- `styles.variables`: the board's neutral look as MCP Apps style variables, each the resolved value
  of one board token in the board's theme (`APP_STYLE_VARIABLES`): backgrounds, text, borders, the
  fonts, text sizes and corner radii. They are for surfaces, text and lines, and for fallbacks until
  a panel has its own, so light and dark still match the board. They are not the app's brand: the
  app is the agent's own design, with a restrained palette and at most one accent of its own.
  `--color-background-inverse` (the board's accent fill), `--color-text-inverse` and
  `--color-ring-primary` (the board's focus ring) are the board's own colours; a panel does not
  reach for them. A panel draws its focus ring under `:focus-visible` only, never `:focus`, so a
  click shows none. The skill teaches this (`skills/vision-board/SKILL.md`, § Apps on the board,
  "Good to use"); nothing checks an app's colours.
- `platform`: `web`.
- `vision-board/state` (`APP_STATE_KEY`): the value the panel last saved for this card (§ Saving the
  panel's state); left out when nothing is saved. The board's own field, named under the board's
  `hostInfo.name` as its methods are, so a field MCP Apps adds later can't collide. It is in the
  answer to `ui/initialize` only, never in `host-context-changed`.

`hostInfo` is `{ name: "vision-board", version }`; `hostCapabilities` is `{ serverTools: {} }` (the
board passes tool calls on).

### Tool results

The answer to `tools/call` is MCP's tool result: `{ content, structuredContent?, isError }`.
`content` holds the result as text; `structuredContent` the object the tool returned; `isError` is
true when the tool threw, and `content` then holds its message. Show that message to the person.

### Errors

A request that can't be answered gets a JSON-RPC error, `{ code, message, data? }` (`PANEL_ERRORS`):

| Code | When |
|---|---|
| -32600 | Not a JSON-RPC 2.0 request: no `jsonrpc: "2.0"`, a bad `id` or `method`. |
| -32601 | No such method. |
| -32602 | Bad params, such as `tools/call` without a tool name, or `vision-board/save-state` without a `state` or with one that is not JSON. |
| -32000 | The board refused or the tool failed: `message` says why in plain words, and `data.problem` holds the board's problem code (§ Approval and § Limits): `needs-approval`, `invalid`, `app-invalid`, `app-failed`, `app-busy`, `app-timeout`, `too-large`, `app-not-found`, or `not-found` when app cards are off; `data.detail`, when there is one, the server's own words, for the person who writes the panel. |

A panel should handle `needs-approval` by saying the person must press Allow on the card.

### Saving the panel's state

A panel starts again whenever its frame loads afresh (§ The panel): after a page reload or a board
restart, or on another computer that opens the folder. To carry on where it was, it saves its state
and gets it back when it starts:

- **Save.** Send the request `vision-board/save-state` with params `{ state }`: any JSON value, at
  most `stateBytes` (§ Limits) as compact UTF-8 JSON (`appStateProblem`). Save what the panel needs
  to show the person the same place, such as the step they are on and what they typed or chose; not
  what a tool can work out again. Each save replaces the one before. The board answers `{}` once it
  holds the value; a value with no `state`, or not JSON, is -32602, and one over the limit is
  -32000 with `too-large` (§ Errors).
- **Restore.** The answer to `ui/initialize` carries the value last saved for this card as
  `hostContext["vision-board/state"]`, left out when nothing is saved (§ Host context). Check its
  shape before you use it: an older version of the panel may have saved it.
- **How the page keeps it.** The board page holds each card's latest value at once and writes it to
  the board's server a moment after the last save (`SAVE_DELAY_MS`), one write at a time per card,
  the latest winning; the answer `{}` comes once the write that carried the value is done, and a
  write the server refused is that answer's error (-32000 with its problem). The person sees
  nothing of a refused save. A panel that starts again gets the value from the page's memory, else
  from one read of the server, waited for at most `LOAD_WAIT_MS`, after which it starts without
  (`apps/board/src/board/apps/panel-states.ts`).
- **Where it is kept.** Per card, not per app: two cards showing one app keep two states. The board
  keeps it in the project, `.visionboard/app-state/<card identity>.json` (`ledgerFiles` `appState`), beside the ledger, through
  its two person-only operations (api.md 157). A card that now names another app starts that app
  with no state; removing the card keeps the file. No agent reads it, and an app's tools don't get
  it: a panel passes what a tool needs in its call.

`vision-board/save-state` is the board's own method (§ The panel protocol). MCP Apps has no way for
a view to save its state: its 2026-01-26 specification and its draft list "state persistence and
restoration" as future work, and the open proposal names no method yet (`modelcontextprotocol/ext-apps`,
`specification/2026-01-26/apps.mdx`, `specification/draft/apps.mdx`, issue 417; checked 2026-10-19).

## The tools module

An app's backend: an ES module file whose default export is `{ tools: [...] }`. Each tool is MCP's
tool shape plus `run`:

```js
export default {
  tools: [{
    name: 'evaluate',
    description: 'Work out a sum.',
    inputSchema: { type: 'object', properties: { expression: { type: 'string', maxLength: 200 } }, required: ['expression'] },
    outputSchema: { type: 'object', properties: { value: { type: 'number' } }, required: ['value'] },
    async run(input, ctx) { return { value: work(input.expression) }; },
  }],
};
```

- `name`: lower-case letters, digits and `_`, starting with a letter (`APP_TOOL_NAME`).
- `description`: what the tool does, in a sentence or two.
- `inputSchema`: a JSON Schema for an object. The board checks the arguments against it before the
  tool runs; arguments that don't fit never reach `run` (`invalid`). The board reads your schemas
  leniently: a keyword or format it doesn't know is ignored, a top-level `$schema` is not read, and
  a `$ref` may point only inside the schema.
- `outputSchema` (optional): a JSON Schema for an object. The board checks the answer against it;
  an answer that doesn't fit is `app-failed`.
- `run(input, ctx)`: may be `async`. `input` is the checked arguments. `ctx.env` holds only the
  keys the manifest's `env` names that the project's `.env` sets (`KEY=value` lines; `export`,
  quotes and `#` comments allowed); `ctx.signal` is an `AbortSignal` that fires when the panel
  goes away before the answer, so the tool can stop its work. A call that runs out of time has its
  whole process stopped (§ Limits).
- What `run` returns: an object becomes `structuredContent`, and its JSON the `content` text; a
  string becomes the `content` text alone. Anything else is `app-failed`.
- To refuse bad input in your own words, throw an `Error` with a plain message: the panel gets
  `isError: true` and your message.

The shape of a tool, less `run`, is `manifest.schema.json` `$defs/tool`; the board checks every tool
the module exports against it, and an app whose module doesn't load, doesn't finish loading within
`callMs`, or doesn't fit is `invalid` until its code changes, with the reason in `problems`. The
board learns this, and the tools' names, only by loading the module, which runs nothing before the
person allows it: so `list_apps` gives `tools` (and these problems) once the person allowed this
version and the panel first called a tool; before that `tools` is empty.

**One file.** The tools module imports only Node's built-in modules (`node:crypto`, `node:fs`, …),
never another file: the hash the person allows covers the manifest and this one file (§ Approval),
so code in a second file would run without being allowed. The board holds you to it: an `import`
or `require` of anything but a built-in is refused, so a module that imports another file doesn't
load (`invalid`), and an import inside a tool is that call's error. The module may read data files
in its own folder.

**Where it runs.** In its own process, one per app, started on the app's first call, never when the
board starts, with the app's folder as its working folder. The process can read its own folder and
nothing else of the disk, can't write files, start processes or workers, or load addons (Node's
permission model), and gets no other part of the board's environment. What it writes to stderr is
kept, and the end of it shows in `problems` when the app breaks. It
may reach the network: calling other systems is what tools are for. The board itself makes no call
to anyone else (rule 18).

## Approval

An app with tools runs nothing until the person presses **Allow** on one of its cards. A panel-only
app needs no approval.

- The version the person allows is the app's hash: the SHA-256, in lowercase hex, of the bytes of
  `app.json` followed by the bytes of the tools file (`APP_HASH_PATTERN`). `list_apps` gives it.
- Allow writes the person's act `app-allow { app, hash }`; **Stop app** writes `app-revoke { app }`
  (api.md 150). Only the person can do either, after a confirm: agents can never allow (rule 8).
- When the agent changes `app.json` or the tools file, the hash changes: tool calls answer
  `needs-approval` again and the card says the code changed and asks again. A changed hash also stops
  the app's running process.
- An allow is on the app, not on a card or a board: removing the card keeps it, and a locked board
  doesn't hold it.

## Limits

One table, `APP_LIMITS`, which the app host and the panel's frame both read:

| Limit | Value | What it means |
|---|---|---|
| `callMs` | 10000 | How long one tool call may run, in ms. Then the process is stopped and the call answers `app-timeout`; the next call starts it again. The tools module has as long to load. |
| `outputBytes` | 262144 | The most one answer may hold, in bytes of JSON. More answers `too-large`. |
| `inFlight` | 4 | Tool calls running at once, per app. More wait in line. |
| `queue` | 16 | Tool calls waiting in line, per app. One more answers `app-busy`. |
| `crashes` | 3 | Crashes within `crashWindowMs` that mark the app `broken` until its code changes. A crash before that restarts the process on the next call, after a short wait. |
| `crashWindowMs` | 60000 | The time, in ms, the crashes are counted over. |
| `restartMs` | 250 | How long the next call waits, in ms, before a crashed process starts again. It doubles with each crash in the window. |
| `idleMs` | 300000 | How long a process waits for a call, in ms, before it stops. |
| `memoryMb` | 128 | The memory a process's heap may use, in MB. |
| `fileBytes` | 1048576 | The most one of the app's files (`app.json`, the panel, the tools file) may hold, in bytes. A bigger one is a problem to fix. |
| `panelMessagesPerSecond` | 50 | Messages a panel may send in one second. The board ignores the rest; a request among them gets error -32000 with `app-busy`. |
| `stateBytes` | 65536 | The most a panel's saved state may hold, in bytes of compact UTF-8 JSON. More answers error -32000 with `too-large`. |
| `toldHeight` | 1080 | The tallest a panel may make its frame by telling its height (`size-changed`, § Panel size), in px. Taller is held to it. Never stored, so it is not the agent's `h` limit. |

## States

What `list_apps` says of each app (`APP_STATES`), worked out fresh by one function in the app host
each time it is asked; the board page and agents read that, never their own copy. The card draws
every state; none is ever a blank or an error.

| State | When | The card shows |
|---|---|---|
| `missing` | A card names the app, and no folder has it. | "App <id> not found", and **Check again**. Adding the folder back brings it back. |
| `invalid` | The manifest or the files have problems, or the tools module didn't load (`problems`). | The problems, for the agent to fix. |
| `needs-approval` | It has tools the person has not allowed at this version. | The panel, and **Allow**; with `changed`, "The app's code changed" too. |
| `ready` | Its panel shows and its tools run. | The panel. |
| `broken` | Its tools crashed too often. | That it stopped, and **Restart**, which tries again once the code changed. |

The card also has states of its own: loading (the frame is starting), and a light placeholder with
the app's title before the frame first loads, over a frozen frame when the board is zoomed far out
or the card is off screen, and with no frame when a past version of the board is showing
(read-only). With the `appCards` flag off, an app card is a plain
card saying "App cards are off", and the panel route and `call_app_tool` answer `not-found`. The
server's own switch is `VB_FLAGS=-appCards` (`apps/board/server.ts`); the page's flags are its own.

## Drawing an app card

1. Write the folder, then call `list_apps` (MCP tool `list_apps`, `vb list-apps`). Fix any
   `problems` until the app is `ready` or `needs-approval`.
2. Draw the card with `write_board`: a `node` item of kind `app`, naming the app and, if you want,
   the panel's size:

   ```json
   { "type": "node", "key": "calc-card", "node": { "region": "tools", "kind": "app", "title": "Calculator", "app": { "id": "calculator", "w": 360, "h": 440 } } }
   ```

   An app card takes a note and Later like any card that tells; it never asks for ✓ or ✗. Only an
   app card names an app, and it takes no `size` word.
3. If the app has tools, tell the person to press Allow on the card. `list_apps` says `allowed:
   true` once they have. You don't call the app's tools through the board: run your own code
   yourself. Only the panel calls them, through `call_app_tool`, the board page's operation.

## A minimal app

A panel-only app needs two files. `.visionboard/apps/hello/app.json`:

```json
{ "id": "hello", "title": "Hello", "version": "1.0.0", "size": { "w": 320, "h": 160 } }
```

`.visionboard/apps/hello/panel.html`:

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Hello</title>
<style>body { margin: 0; padding: 16px; font: 14px var(--font-sans, system-ui); background: var(--color-background-primary); color: var(--color-text-primary); }</style>
<p id="say">Hello.</p>
<script>
  let next = 1;
  const send = (method, params) => parent.postMessage({ jsonrpc: '2.0', id: next++, method, params }, '*');
  addEventListener('message', ({ data }) => {
    const ctx = data?.result?.hostContext;
    if (!ctx) return;
    for (const [name, value] of Object.entries(ctx.styles?.variables ?? {})) document.body.style.setProperty(name, value);
    document.getElementById('say').textContent = `Hello, in ${ctx.theme}.`;
    parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized' }, '*');
  });
  send('ui/initialize', { protocolVersion: '2026-01-26', appCapabilities: {} });
</script>
</html>
```

The calculator in `skills/vision-board/examples/apps/calculator/` adds a tools module, keyboard use,
Esc back to the card, theme changes and the approval state.

## Kept true by

- The tables on this page (§ The manifest, § Panel size, § Limits, § States, § Panel to board,
  § Board to panel, § Errors) are read from this file by `packages/format/tests/apps.test.ts` and
  compared with the manifest schema, `APP_SIZE`, `APP_LIMITS`, `APP_STATES`, `PANEL_METHODS`,
  `HOST_NOTIFICATIONS` and `PANEL_ERRORS`.
- The manifest, a tool's shape, the app card and acts, the two operations' bodies and a card's saved
  panel state (the kept file, the save and the answers): `apps/board/tests/schema-apps.test.ts`
  (both validators, and the schema's numbers against `packages/format`). What a panel may save
  (`appStateProblem`) and the board's own method names (`APP_HOST_NAME`, `PANEL_SAVE_STATE`):
  `packages/format/tests/apps.test.ts`.
- The saved panel state through the real server (`apps/board/server/apps/panel-state.ts`): kept by
  identity and read back, the limit, every refusal, a removed card's file kept, another app's state
  not handed over, a bad file or a link read as nothing, a folder leading out, the person only, and
  no agent read changed (`apps/board/tests/api-panel-state.test.ts`); the write whole by a rename
  (`atomic-file.test.ts`).
- The allow fold, the registry entries and the act rules: `packages/actions/tests/apps.test.ts`.
- Who may call the operations: `apps/board/tests/api-apps-auth.test.ts`, `route-table.test.ts`,
  `openapi.test.ts`.
- The app host (`apps/board/server/apps.ts` and `apps/`), through the real server on a temp
  project with the test apps in `apps/board/tests/fixtures/apps/`: approval by hash and again after
  a change, the time limit, crashes and `broken`, what the process may not do, `env`, the one-file
  rule, the output cap and both schemas, every state of `list_apps`, and the size it sends from a
  broken app.json (`apps/board/tests/api-apps.test.ts`); the line of calls and `app-busy`, the idle stop, Stop app,
  the memory limit, a folder switch and the server closing, each checked by the process's pid
  (`app-host.test.ts`); the panel route's headers, its CSP and its 404s, `frame-src 'self'` and the
  flag (`app-panel.test.ts`); the folder, file names and links, the hash, the state function's
  order and the `.env` reader (`app-folder.test.ts`).
- The example app: its parser and both tools, its manifest and tool schemas against the real
  schema, and its folder holding only an app's own files
  (`skills/vision-board/examples/apps/calculator.test.mjs`); this repo's own copy in
  `.visionboard/apps/calculator/` equals it byte for byte (`apps/board/tests/repo-example-app.test.ts`).
- The panel protocol in the frame, with fake windows: `packages/ui/tests/app-frame-core.test.ts`
  and `app-frame-limits.test.ts`; the panel's own height (`panelHeight`, `fitHeight`: rounded, held
  to `APP_SIZE.h.min` and `APP_LIMITS.toldHeight`, the same height once, a width ignored, a loop ending at the clamp, the message cap,
  and ignored without it) in `app-frame-fit.test.ts`; the save request checked as its schema, answered when the page
  settles or refused, and the saved value in the `ui/initialize` answer only, under
  `APP_STATE_KEY` (`app-frame-state.test.ts`; the key's name and this page naming it,
  `packages/format/tests/apps.test.ts`). The page's debounce, one write in flight, the latest
  winning, and the bounded restore: `apps/board/tests/panel-states.test.ts`.
- The board page, in a real browser, on a temp project holding a copy of the example
  (`tests/pages/app-server.ts`): an agent draws the calculator, Allow, `12*3=` worked out by its
  `evaluate` tool and listed by `history`, Tab into the panel and out, Esc back to the card, a code
  change asking again, Stop app, and app cards off on the server and the page
  (`tests/pages/app-cards.spec.ts`); every card state at one size, the frame made only on screen
  and at or above FAR_K and frozen off screen and below it, and a past version at the manifest's
  size (`app-states.spec.ts`); a loaded panel keeping what it holds in memory, loaded once, through
  a far zoom, a pan two screens away, a new version of its card, a relayout, a selection and a new
  size, a frozen panel taking no click or Tab, and the cap unloading the least recently used frozen
  panel, with a zoom step on 12 app cards inside the one-change budget, and a panel getting back
  what it saved after a page reload and after the cap unloaded it (from the page's memory), and a
  save the server refuses shown to nobody but the panel (`app-alive.spec.ts`; the
  cap's rule, `overCap`, in `apps/board/tests/app-live-cap.test.ts`); a deleted
  folder seen once the card is selected and brought back by Check again, a code change seen on
  select before any call and with no timer, and Allow, a code change and Stop app keeping the card's
  size, and a card with no size of its own keeping its box when app.json breaks or the folder
  goes (`app-follow.spec.ts`); the panel's opaque origin, its CSP and messages
  from other windows ignored (`app-safety.spec.ts`); the gallery's samples and its live panel
  (`app-gallery.spec.ts`); a panel that tells its height fitting its card from 120 to 1080 at the
  agent's width, the card under it moving with it, no ledger write, a width ignored, a frozen panel
  keeping its height, a panel that tells nothing keeping the agent's size, and the gallery's calculator
  asked for 600 fitting its 440, light and dark and with the flag off (`app-fit.spec.ts`).
