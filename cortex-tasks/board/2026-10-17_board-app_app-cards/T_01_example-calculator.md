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

1. [ ] Parser tests first, seen failing; then the parser.
2. [ ] `tools.mjs`, with a unit test that imports it and calls `run` directly (no board needed):
   shape matches `apps.md`, `evaluate` and `history` work, bad input gives the tool's error.
3. [ ] `panel.html` (it is exercised end to end by FE_02's page test; here, open it in Playwright with a
   tiny fake host page under the system temp folder that answers the protocol, to check it renders,
   handles light and dark, and sends the right messages; record what you checked).
4. [ ] Gates: `npm test` and `npm run verify` exit 0. **Not** `npm run test:pages` (wave 2 runs in
   parallel; the orchestrator runs page tests after the wave).

## Validation

- [ ] Parser and tools tests pass; the fake-host check is recorded; no `eval`/`Function` in the folder
  (`grep -rn "eval(\|Function(" skills/vision-board/examples` finds nothing).

## Constraints

- Touch only `skills/vision-board/examples/apps/calculator/` (and the root `test` glob if needed).
  No git commits. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/T_01_example-calculator.md]]`
