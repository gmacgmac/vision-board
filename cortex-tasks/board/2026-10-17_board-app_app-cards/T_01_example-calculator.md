# T_01_example-calculator: Example app: calculator panel and plugin

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Write the example app agents will learn from: a calculator whose panel is the UI and whose plugin
computes the answers, following `docs/specification/apps.md` exactly.

## Context

PLAN.md ruling 16. BE_01 has landed: read `apps.md` and the manifest schema
(`packages/format/schema/app/manifest.schema.json`). You write only app files; the board code is
BE_02's and FE_01's, built beside you.

## Inputs

- **Files to create**: `skills/vision-board/examples/apps/calculator/`
  - `app.json`: `id: "calculator"`, `title: "Calculator"`, `version: "1.0.0"`, `panel`, `tools`,
    `size {w: 360, h: 440}`; no `env`, no `csp` (it needs neither).
  - `panel.html`: one self-contained document. A display (an `output` with `aria-live="polite"`), a
    keypad of real `<button>`s with labels (digits, `.`, `+ − × ÷`, `(`, `)`, `%`, `=`, `C`, `⌫`), and
    keyboard input (digits, operators, Enter for `=`, Escape → `ui/notifications/escape`, Backspace).
    Talks only by the protocol in `apps.md`: `ui/initialize`, uses the host context's theme and token
    colours and font for every colour and the font (light and dark), `ui/notifications/initialized`,
    then `=` sends `tools/call evaluate {expression}` and shows the result or the error message; a
    "History" toggle calls `tools/call history {}` and lists the results. States: idle, working (a
    call in flight: the `=` key shows busy and is disabled), error (the plugin's message, readable),
    needs approval (the board's error `needs-approval`: "Allow this app on its card to calculate").
    No network, no external fonts, no `eval`. Under about 300 lines.
  - `tools.mjs`: default export `{ tools: [evaluate, history] }` in the MCP tool shape of `apps.md`.
    `evaluate` input `{expression: string, maxLength 200}`, output `{value: number, expression}`;
    `history` input `{}`, output `{items: [{expression, value}]}` (last 20, kept in the process).
  - `calculator-parser.mjs` (imported by `tools.mjs`): a small recursive-descent parser for numbers
    (decimals), `+ - * /` and `×` `÷`, unary minus, `%` (percent of the left value, as a pocket
    calculator: `50+10%` = 55; alone, `10%` = 0.1), parentheses (depth limit 32), and clear errors
    ("Division by zero", "Unexpected ')' at 4"). Results rounded to 12 significant digits. No `eval`,
    no `Function`, no regex backtracking on input.
  - `calculator-parser.test.mjs` next to it, run by `npm test` (add the folder to the root `test`
    glob in `package.json` if it is not covered; say so in your notes): every operator, precedence,
    unary minus, percent rules, parentheses, depth limit, length limit, division by zero, junk input,
    rounding.
  - `README.md` is **not** created (skill rule: the skill and `apps.md` explain the example).
- **Patterns to follow**: `apps.md`; the accessibility rules (rule 5): labelled buttons, visible focus,
  contrast from the host tokens.
- **Skills**: none beyond reading `apps.md`.

## Steps

1. [x] Parser tests first, seen failing; then the parser.
2. [x] `tools.mjs`, with a unit test that imports it and calls `run` directly (no board needed):
   shape matches `apps.md`, `evaluate` and `history` work, bad input gives the tool's error.
3. [x] `panel.html` (it is exercised end to end by FE_02's page test; here, open it in Playwright with a
   tiny fake host page under the system temp folder that answers the protocol, to check it renders,
   handles light and dark, and sends the right messages; record what you checked).
4. [x] Gates (see notes: the failures left are other tasks'): `npm test` and `npm run verify` exit 0. **Not** `npm run test:pages` (wave 2 runs in
   parallel; the orchestrator runs page tests after the wave).

## Validation

- [x] Parser and tools tests pass; the fake-host check is recorded; no `eval`/`Function` in the folder
  (`grep -rn "eval(\|Function(" skills/vision-board/examples` finds nothing).

## Constraints

- Touch only `skills/vision-board/examples/apps/calculator/` (and the root `test` glob if needed).
  No git commits. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**Made** (all in `skills/vision-board/examples/apps/`): `calculator/app.json`, `calculator/panel.html` (303 lines),
`calculator/tools.mjs` (170 lines) and, outside the app folder, `calculator.test.mjs` (19 tests). The root `test`
glob gained `"skills/**/*.test.mjs"`. The folder holds only the three files an app holds (apps.md § The folder),
so the example is copied as it is; the tests sit beside it, and a test checks the folder holds nothing else.

**Orchestrator decision followed**: no `calculator-parser.mjs`. The parser is in `tools.mjs` and exported by name
(`calculate`) for the tests; `tools.mjs` imports nothing (a test checks every import is `node:`).

**Deviations, all inside ruling 16** (plain words, per the maintainer's standing instruction):
1. Messages: "Type a sum first", "Too long: 200 characters at most", "Can't use "x"", "Check the brackets",
   "Too many brackets", "Can't divide by zero", "Number too big", "Finish the sum", "Check the sum", "Check the
   number "1.2.3"". No positions ("at 4"): the person types on a keypad, a position helps nobody. The task's
   "Division by zero" and "Unexpected ')' at 4" are not used.
2. Panel copy for `needs-approval`: "Press Allow on the card to calculate" (names the card's button; shorter than
   the task's wording). Other board errors show the board's own message; no answer in 12 s: "No answer. Try again."
3. A number may carry a power of ten (`1e+21`) so an answer shown that way can be used again. `%`: alone a hundredth;
   on the right of + or - a share of everything to its left (`100+10%+10%` is 121); after * or / a hundredth.
4. `run` is `async`; tool schemas use `additionalProperties: false`; `history` is newest first.
5. The panel's keypad stops nonsense before the tool sees it (second dot, a leading ×, `)` with nothing open,
   a new operator replaces the old one, `2(` becomes `2×(`); the tool stays the one place that works a sum out.
   Esc closes History first, and only then sends `ui/notifications/escape`.

**Checks**
- Tests: seen failing first (module missing), then 19 pass. Mutation check: breaking percent, the zero check, the
  bracket limit, rounding or the history size each made the tests fail. The tests validate `app.json` and both tools
  against the real manifest schema (`compileSchema` from `apps/board/server/schema.ts`) and each tool's schemas under
  ajv strict. **Coupling**: that import means a sibling's half-edited `schema.ts` made one run fail once; it passed on
  rerun.
- Fake host (scratch, system temp, not committed: Playwright, a sandboxed frame served with apps.md's exact panel CSP,
  a host page answering the protocol and running the real `tools.mjs`): 15 of 15 steps, no console or CSP problem.
  Checked: handshake (`ui/initialize` with `2026-01-26`, then `initialized`, nothing else); keypad and keyboard
  sums (`2+3×4`, `12/4*3`, `50+10%`, carry on from an answer, new sum); errors shown and cleared; `=` busy and
  disabled with a second Enter sending nothing; `needs-approval` then retry; History (empty, newest first, use a
  result, Esc order, typing closes it, focus kept); Tab order and visible ring; Enter on a Tab-focused key presses that
  key, Enter after a click means equals; host colours applied and a theme change followed (`host-context-changed`);
  WCAG contrast of every text pair, and hover and pressed, light and dark (lowest 4.9:1); axe-core clean on idle,
  error, answer and History, light and dark; a silent board gives a message, not a stuck `=`. Screenshots viewed.
- Design skills: accessibility review found and fixed (a) `blur()` after a click dropped focus (now Enter after a
  pointer press means equals, tracked with `pointerdown`/`focusin`; `:focus-visible` could not tell, a key press
  makes it match), (b) the History list clipped its focus rings, (c) typing while a History item had focus lost the
  focus (it goes to History), (d) the filled keys' hover lowered contrast in light (4.46:1, axe flagged it; fixed),
  (e) forced-colours mode lost the open-History cue. UX copy review: "Finish the sum" (verb first like the others),
  "Backspace", "Divided by", "No answer. Try again.", "That didn't work. Try again.", empty History says how to start,
  History items read "Use 14 from 2+3×4", "Answer:" not "Result:" for screen readers.
- Gates: `grep -rn "eval(\|Function(" skills/vision-board/examples` finds nothing. `npm test`: 1401 tests, 1384 pass,
  17 fail, all in BE_02's unfinished `app-folder`, `app-host` and `app-panel` tests (none mine). `npm run verify`: one
  failure, `docs/specification/modules.md: out of date` from the siblings' new folders (`apps/board/server/apps/`,
  `packages/ui/src/app-frame/`); `skills/` is not scanned. The orchestrator runs `npm run map` and the full gates after
  the wave. I did not run `npm run build` or `npm run test:pages`.

**For the wave 3 tasks**: the panel assumes `ui/notifications/host-context-changed` carries `params` as the partial
host context (`{ theme, styles: { variables } }`), sets the `styles.variables` and `color-scheme` on its document,
takes messages only from `window.parent`, sends `tools/call` with `arguments: {}` for `history`, and reads
`error.data.problem === 'needs-approval'` and `isError` + `content[0].text` as apps.md says. apps.md § Kept true by
could list `skills/vision-board/examples/apps/calculator.test.mjs` (I did not touch apps.md).

**Long File Strategy**: two files were written in one write over 50 lines (the first test file, 141 lines, and
`tools.mjs`'s parser, 120 lines); no connection error followed. Everything else went in chunks.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/T_01_example-calculator.md]]`
