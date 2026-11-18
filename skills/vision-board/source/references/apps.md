# Apps on the board

Build an app when the person wants something to use, not to read: it runs in an `app` card.

- **Files**, in the open ledger's `apps/<id>/`, beside its `images/` (`<id>` like a board id), each under 1 MB: `app.json`
  (`{ "id": "unit-converter", "title": "Unit converter", "version": "1.0.0", "size": { "w": 360,
  "h": 240 } }`, `id` the folder's name; optional: `env`, the `.env` keys its tools read, and
  `csp`; an unknown field is refused), `panel.html` and, when it has work to do, `tools.mjs`.
- **The panel**: one page, script and style inline. It reaches nothing outside itself (no fetch,
  no outside fonts or scripts; images as `data:`), storage throws, `alert` does nothing, and a
  `<form>` never submits: use buttons and handle Enter. It speaks JSON-RPC 2.0 with
  `parent.postMessage({ jsonrpc: '2.0', ... }, '*')`; answers are `message` events from `parent`
  with the same `id`.
  - `ui/initialize`, `params: { protocolVersion: '2026-01-26', appCapabilities: {} }`: set each of
    `result.hostContext.styles.variables` on `document.documentElement.style` and `color-scheme`
    to its `theme`; then send `ui/notifications/initialized` (no `id`). If `result.hostContext`
    has `"vision-board/state"`, it is what the panel last saved: show that place again.
  - `tools/call`, `params: { name, arguments }`: `result.structuredContent` is what the tool
    returned; with `result.isError`, `result.content[0].text` is its message. An `error` answer is
    the board refusing: on `error.data.problem` `needs-approval` say "Press Allow on the card",
    else show `error.message`.
  - `vision-board/save-state`, `params: { state }`: saves any JSON value (at most 64 KB) for this
    card; the answer is `{}`. Each save replaces the one before. Ignore a failed save quietly: the
    app still works.
  - `ui/notifications/host-context-changed` brings a new `theme` and `styles` in `params`: apply
    them. On Esc send `ui/notifications/escape`: focus goes back to the card.
  - `ui/notifications/size-changed`, `params: { height }`: your content's height in px; the card
    fits it (120 to 1080, though `h` itself stays 120 to 800; the width stays your `w`). Send it
    whenever it changes:
    `let told = 0; function tellHeight() { const html = document.documentElement, was = html.style.height; html.style.height = 'max-content'; const height = Math.ceil(html.getBoundingClientRect().height); html.style.height = was; if (height !== told) parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: (told = height) } }, '*'); } new ResizeObserver(tellHeight).observe(document.body);`
    Call `tellHeight()` too after content changes inside a box of fixed height (a list that scrolls).
- **The tools**: `export default { tools: [{ name, description, inputSchema, outputSchema, async
  run(input, ctx) { return { ... }; } }] }`, names in lower case with `_`; the board checks input
  and output against both JSON Schemas (`type: "object"`). `throw new Error('Type a number')` to
  refuse: the panel gets your words. One file, importing only Node's built-ins; its own process
  reads only its folder, writes no files, starts no processes, has 10 seconds a call, and forgets
  what it holds after 5 idle minutes. `ctx.env` has the `env` keys: never a key in the code; ask
  the person to put it in the project's `.env`.
- **Keep the person's place**: the board closes a panel it has too many of and starts it again
  later, and a reload or restart does the same. So save where the person is (the step, what they
  typed or chose, the open tab) with `vision-board/save-state` a moment after each change (wait
  about half a second, so typing sends one save), and put it back when `ui/initialize` answers
  with `"vision-board/state"`. Keep it small, and check its shape before using it (it may be from
  an older version of the app). Never put a secret or a key in it, and don't save what a tool can
  work out again. A tool is for work, not for remembering the person's place: it forgets after 5
  idle minutes.
- **Good to use**: the app is your own design: give it a restrained, professional look. Take
  neutral surfaces, text and lines from the host's variables, each with a fallback
  (`--color-background-primary`, `--color-background-secondary`, `--color-text-primary`,
  `--color-text-secondary`, `--color-border-secondary`, `--color-text-danger`, `--font-sans`,
  `--border-radius-md`), so it matches light and dark. Add at most one accent you choose yourself
  (a `light-dark()` pair), for the main button only. Never use the board's accent as the app's
  colour: `--color-background-inverse` and `--color-ring-primary` are the board's, fallbacks at
  most. Hover and selected states are quiet tints of the neutral, never saturated fills. The focus
  ring shows on `:focus-visible` only, never `:focus`, so a click draws none. Text contrast: reading
  text Lc 60, short coloured labels Lc 45, icons and rings Lc 30 (APCA), in light and dark. Your own
  SVG, icons and layout are welcome; no outside fonts or files. Also: a visible label on every
  field, real buttons, Enter for the main action, results and errors in plain words in an
  `aria-live` region. Keep 12 px of padding at the panel's top: the card's number and APP tab
  overlap the top edge. Size: `w` 280 to 960, `h` 120 to 800 px (360 × 320 unset), the smallest that
  fits every control; set `h` near the content's height, so the card is drawn close to the height
  the panel then tells (which may reach 1080). The model: the calculator, `skills/vision-board/examples/apps/calculator/` in
  the Vision Board repo (contract: its `docs/specification/apps.md`), or a copy in the open ledger's
  `apps/`. When a note asks to restyle an app ("make it look more pro"), change only
  `panel.html`'s style, never what it does.
- **Show it**: `list_apps`, and fix every `problems` entry until it reads `needs-approval` or
  `ready`; the board loads `tools.mjs` only after Allow (`tools` is `[]` until a tool runs), so
  check it well. Draw a `node` of kind `app` with `app: { id, w, h }` and no `size`: it takes a
  note and Later, never ✓ or ✗.
- **Allow**: tools run only after the person presses **Allow** on the card; a change to `app.json`
  or `tools.mjs` asks again (`panel.html` doesn't). You can't allow it and never call its tools:
  say only "Done. Press Allow on card 4 to use it."
- **Problems later** ("the app card has problems"): read `list_apps`, fix what it names, read it
  again, and say only "Done. Press **Check again** on card 1, then Allow." `broken` (it crashed too
  often): fix the code; the person presses **Restart**.
