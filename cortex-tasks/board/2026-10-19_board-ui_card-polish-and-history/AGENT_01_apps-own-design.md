# AGENT_01_apps-own-design: Apps bring their own design

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Teach the agent skill that an app is the agent's own design — a restrained "pro" palette of its
own, not the board's pink accent — with focus rings shown only for keyboard use.

---

## Context

Maintainer, 2026-10-19: the clip-and-export app came out pink everywhere (checkboxes, slider,
selected rows, buttons, focus rings) because the skill says "colours and fonts only from the host's
variables", and the host hands apps the board's accent (`APP_STYLE_VARIABLES`,
`packages/format/src/apps.ts`: `--color-background-inverse` → `--vb-accent-fill`,
`--color-ring-primary` → `--vb-focus`). The maintainer wants agents to design apps themselves, so
apps can grow richer over time (SVG, their own visual language), with a "pro" look by default.
Agent instructions are code (rule 17): versioned, reviewed, checked against scenarios.
**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `skills/vision-board/SKILL.md` (§ Apps on the board, "Good to use"; the
  `status:` line, v3.9), `skills/vision-board/scenarios.md` (scenario 29 "Build a new app", and a
  new scenario for restyling an app on a note), `skills/vision-board/NOTES.md` (why),
  `docs/specification/apps.md` (§ host styles: what the variables are for — fallbacks and surfaces,
  not the app's brand)
- **Files to reference**: `skills/vision-board/examples/apps/calculator/` (the model app),
  `packages/format/src/apps.ts` `APP_STYLE_VARIABLES`, the repo's APCA tiers (steering rule 3)
- **Skills**: `cortex-docs` — load before starting

---

## Steps

1. [x] Rewrite "Good to use" so: the app has its own palette — neutral surfaces and text from the
   host's surface/text variables (so light and dark still match the board), plus at most one
   restrained accent of the app's own choosing, never the board's accent as the app's brand colour;
   `--color-background-inverse` / `--color-ring-primary` are fallbacks, not defaults to reach for.
   Focus rings on `:focus-visible` only, never `:focus`. Selection and hover states quiet (tints of
   the app's neutral, not saturated fills). Contrast meets the board's APCA tiers in light and dark.
   Apps may use their own visual language (SVG, icons, layout) — still no network fonts or calls.
2. [x] Keep it short: the skill is read every turn; a few lines, plain words, no new jargon.
3. [x] Scenarios: update 29 so a passing run shows its own neutral palette and `:focus-visible`;
   add one where the person's note says "make it look more pro" and the agent restyles without
   touching behaviour. Record a dry run of both against the new text in NOTES.md (how earlier skill
   versions were checked).
4. [x] Check the calculator example still matches the rules; if its focus ring uses `:focus`, switch
   it to `:focus-visible` (its tests in `apps/board/tests/app-*.test.ts` must pass).
5. [x] Bump the skill's `status:` to v3.9 with a one-line summary; `cortex-docs` audit on apps.md.

---

## Validation

- [x] `npm test` passes (skills tests and app tests); `npm run verify` fails only on `modules.md` out of date (siblings' files; `npm run map` is theirs to run)
- [x] The new text read cold answers: "what colours do I use?", "how do focus rings show?"

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19 14:00  

### Changes Made
- `skills/vision-board/SKILL.md`: "Good to use" rewritten (own design; neutral surfaces, text and
  lines from the host with fallbacks; at most one accent of the app's own, `light-dark()`, main
  button only; the board's accent and ring only fallbacks; quiet hover and selection;
  `:focus-visible` only; APCA tiers; own SVG and layout welcome, no outside fonts or files; a note
  to restyle changes only the panel's style). `status:` is v3.9. 415 lines (407 before).
- `skills/vision-board/scenarios.md`: 29 updated, 32 (restyle on a note) new, v3.9 header line.
- `skills/vision-board/NOTES.md`: § Skill v3.9 (why, calculator, dry run).
- `docs/specification/apps.md` § Host context: the variables are for surfaces, text, lines and
  fallbacks, not the app's brand; the accent, inverse text and ring are the board's own; ring on
  `:focus-visible`. States that nothing checks an app's colours.
- Calculator (`skills/vision-board/examples/apps/calculator/panel.html`): its ring was already
  `:focus-visible`, but its main key and ring took the board's accent. They are now the ink
  (surface-coloured text; tint towards the surface). Copied to `.visionboard/apps/calculator/panel.html`
  because `repo-example-app.test.ts` holds the two equal byte for byte.

### Issues & Resolutions
- `.visionboard/apps/calculator/panel.html` is outside the files this task lists; touching it was
  needed to keep that test green. `panel.html` is not part of the Allow hash, so the maintainer's
  calculator card does not ask again.
- The dry run is a read-through, not a live Claude Code / Kiro run (the maintainer's board and its
  chats were left alone). Both scenarios should be run live before relying on them.
- Kiro gets the new text when the maintainer next starts the board (it writes
  `~/.kiro/agents/vision-board.json` from SKILL.md at start).
- `npm run verify` fails on `docs/specification/modules.md` out of date (siblings' changes), not here.

### Deviations from Plan
- None. (Calculator visual change went one step beyond "switch :focus to :focus-visible", since the
  example would otherwise teach the pink; flagged above.)

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] AGENT_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/AGENT_01_apps-own-design.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
