---
task_name: An App Card Fits Its Content
created: 2026-10-27
completed: 2026-10-28
status: completed
categories: [board-ui]
type: implementation
model: strong
persona: Senior front-end engineer for embedded widgets — a frame that leaves a blank band under its content, or cuts it off, looks broken; and a frame that lets its content resize the page without limits is a hole.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: An App Card Fits Its Content

---

## Problem Statement

An app card's panel is exactly the `w` × `h` the agent set (`packages/format/src/apps.ts` `appSize`,
`docs/specification/apps.md` § Panel size), and the board ignores the panel's own
`ui/notifications/size-changed` (`packages/ui/src/app-frame/app-frame-core.ts` `notify`). The agent
can't know the height its app's content will take, so cards show a blank band below the content or
cut it off. Example: the maintainer's "Data flow" app asks for 900 × 640 and its content ends about
100 px early. The maintainer asked (2026-10-27, point 312) that app cards fit their content, now.

**The design, decided at planning (the maintainer's yes on the decision entry comes at the end):**

- The panel tells its height with MCP Apps' own `ui/notifications/size-changed` (`{ height }`; a
  `width` is ignored). The board sets the frame's height to it, rounded, clamped to
  `APP_SIZE.h` (120 to 800). Width stays the agent's `w`: a panel never widens its card.
- The agent's `h` is the height before the panel speaks, and the height of a frame not yet made or
  removed. A frozen panel keeps its last height.
- The card's measured height follows the frame, through the board's existing re-measure path for a
  card whose height changes (find it: images loading and note bubbles already change a card's
  height). The layout stays a pure function of measured sizes: no coordinates, no ledger write.
- `containerDimensions` in the host context stays `{ width: w, height: h }` (what the agent set);
  send `host-context-changed` with the new `containerDimensions` only if MCP Apps' shape says a host
  does after a resize (check its spec; say what you found).
- Guard: the existing panel message rate limit (`APP_LIMITS.panelMessagesPerSecond`) still applies;
  a height equal to the current one does nothing; a resize loop (content that grows with its frame)
  ends at the clamp.
- Behind a new flag in `packages/format/src/flags.ts`, default on. Off: ignored, as today.
- The skill (`skills/vision-board/SKILL.md` § Apps on the board) tells agents to send the height
  (a few lines: a `ResizeObserver` on the document's content posting `size-changed`) and to set `h`
  near the content's height so the first draw is close. The skill's example app
  (`skills/vision-board/examples/apps/calculator/`) does it. Prompts are code: bump the skill's
  version line, record the change in `NOTES.md`.

---

## Steps

1. **Read first**: `docs/principles.md`, `docs/specification/apps.md` (§ Panel size, § The panel,
   § The panel protocol), `docs/decisions.md` D-047 and any entry on panel size, and where the board
   measures a card whose height changes (`apps/board/src/board/cards/`, `apps/board/src/board/apps/app-cards.ts`).
   Check MCP Apps' spec for `ui/notifications/size-changed` (params, and what a host does after it).
2. **Draft the decision** in your notes (§ Proposed decision), next number after the last in
   `docs/decisions.md`: the panel sets its height, the clamp, width stays the agent's, the agent's
   `h` as the start, the flag. Say what it amends. The orchestrator takes it to the maintainer.
3. **Failing tests first**: a unit test beside `packages/ui/tests/app-frame-limits.test.ts` (today's
   "size-changed is ignored" case changes meaning: with the flag on, a height inside the limits sets
   the frame's height; above 800 it is 800; below 120 it is 120; the same height twice does nothing;
   a width is ignored; flag off, ignored as today). A page spec (an app card spec in `tests/pages/`)
   with a small fixture app whose content is shorter than its `h`, then grows: the card fits it each
   time, and the cards below move with it. See them fail.
4. **The contract**: `docs/specification/apps.md` (§ Panel size, the Panel to board table row) and
   `packages/format/src/apps.ts` (the method's comment, any limit name you add to `APP_SIZE`/`APP_LIMITS`,
   never a second table).
5. **The code**: `app-frame-core.ts` `notify` takes the height through one function that clamps and
   applies it; the frame element and the card re-measure as an image's load does. Reuse the card's
   existing re-measure; don't write a second one.
6. **The flag** (`packages/format/src/flags.ts`): name it in the existing style, description, default on.
7. **The skill and its example**: § Apps on the board, the size lines; the calculator panel sends its
   height. Version line bumped; `NOTES.md` records why.
8. **Every state, in the gallery**: the app card section shows a panel that fits its content (light
   and dark). New baselines for new entries only.
9. **Checks**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`, the
   app card page specs (`tests/pages/app*.spec.ts`), the gallery spec and `host-styles.spec.ts`, on
   `VB_TEST_PORT=5500`. No full page suite (the orchestrator runs it).

---

## Files Involved

| File | Purpose |
|------|---------|
| `packages/ui/src/app-frame/` | The frame: take the height, clamp, apply |
| `packages/ui/tests/app-frame*.test.ts` | Unit tests |
| `packages/format/src/apps.ts`, `packages/format/src/flags.ts` | Limits, method comment, the flag |
| `apps/board/src/board/apps/`, `apps/board/src/board/cards/` | Only if the card's re-measure needs wiring |
| `apps/board/src/gallery/` (the app card section) and its fixtures | The gallery state |
| `tests/pages/app*.spec.ts` and a fixture app under `tests/pages/` | Page specs |
| `docs/specification/apps.md` | The contract |
| `skills/vision-board/SKILL.md`, `NOTES.md`, `examples/apps/calculator/` | What agents are told; the example |

> Modify only these. Another change runs at the same time in `apps/board/src/styles/board.css` and
> `tests/pages/app-pan-key.spec.ts` (Cmd over an app card): don't touch them. Need a change
> elsewhere? List it under `REQUESTS`. `docs/decisions.md` and generated files are the orchestrator's.

---

## Constraints

- **DO NOT** let a panel change its card's width, or exceed `APP_SIZE.h`.
- **DO NOT** write the height to the ledger or the saved panel state.
- **STOP** and alert the user if MCP Apps' `size-changed` means something else than a content size
  the host may apply, or if fitting needs the board to read inside the frame (it can't: opaque origin).
- No PII in examples; no commits; never port 4466; never `cortex/AUDITED.md`.

---

## Success Criteria

- [ ] A panel that sends its height gets a card that fits it, within 120 to 800, light and dark
- [ ] A panel that sends nothing looks exactly as today; flag off, nothing changes
- [ ] The cards below move with it; no ledger write
- [ ] The decision text is in the notes; apps.md, the skill and its example say what's true
- [ ] Tests seen failing first, then passing; gallery entry added
- [ ] Task file updated with completion notes

---

## References

- `docs/specification/apps.md` § Panel size, § The panel protocol
- `docs/decisions.md` D-047
- `packages/ui/src/app-frame/app-frame-core.ts` `notify`, `hostContextOf`
- `packages/format/src/apps.ts` `APP_SIZE`, `appSize`, `PANEL_METHODS`

---

## Implementation Notes

_To be completed by agent after task execution._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Completed**: 2026-10-28 00:02

### Proposed decision

## D-065 An app card fits its panel's content (amends D-047 ruling 3)
- **Date**: 2026-10-27 · **Status**: Proposed (awaiting the maintainer's yes) · **From**: maintainer
  point 312; app-panel-fits-content task
- **Decision**: A panel may tell the board its content's height with MCP Apps' own
  `ui/notifications/size-changed` (`{ height }` in px). Behind the `appFit` flag, on by default:
  1. The board sets the frame's height to it, rounded and held to `APP_SIZE.h` (120 to 800). A
     `width` is ignored: the width stays the agent's `w`, so a panel never widens its card.
  2. The agent's `h` is the height until the panel tells one, and again once the frame is removed
     (the panel starts again at it). A frozen panel keeps its last height. A panel that tells
     nothing keeps the agent's size.
  3. The card is measured again through the board's one re-measure path for a card that changed
     height by itself (the one images use), so the cards under it move; layout stays a pure function
     of measured sizes. Nothing is written to the ledger or the saved panel state.
  4. A height equal to the last does nothing; the message counts towards
     `panelMessagesPerSecond`; content that grows with its frame stops at 800.
  5. `containerDimensions` stays the agent's `{ width: w, height: h }`, and the board sends no
     `host-context-changed` after a told height (MCP Apps: a host "MAY" send it).
  6. Off (`?flags=-appFit`), size-changed is ignored, as before.
- **Why**: the agent can't know the height its app's content takes, so cards showed a blank band
  under the content or cut it off.
- **Rejected**: the board reading the panel's height itself (the opaque origin forbids it); the
  panel setting its width too (a panel would widen cards and the container); sending the new height
  back as `containerDimensions` (the agent's size stays the panel's statement of what was asked).
- **Open point for the maintainer** (not decided here): MCP Apps' `containerDimensions` names a fixed
  side `height` ("Host controls the size") and a flexible one `maxHeight` ("View controls the size,
  up to the specified maximum"). With this decision the board's height is in fact flexible, so the
  spec-true shape would be `{ width: w, maxHeight: 800 }`. Kept as `{ width, height }` here, as the
  task said; a panel built on MCP Apps' SDK may fill a fixed height rather than tell its content's.
- **Task**: cortex-tasks/board/2026-10-27_board-ui_app-panel-fits-content.md

### Changes Made
- MCP Apps' spec checked (ext-apps `specification/2026-01-26/apps.mdx`, and the SDK's
  `setupSizeChangedNotifications` in `src/app.ts`): `size-changed` is the View's content size
  (`{ width?, height? }`), which a host with flexible dimensions MUST apply; `host-context-changed`
  after a resize is MAY. So it is a content size the host may apply: no STOP.
- `packages/ui/src/app-frame/app-frame-size.ts` (new): `panelSize` moved here from the core,
  `panelHeight` (round, hold to `APP_SIZE.h`, undefined for no finite number) and
  `APP_FRAME_RESIZE_EVENT`; the core re-exports them, so `#ui` is unchanged.
- `app-frame-core.ts`: a notification carries its params; `notify` sends size-changed's height
  through `panelHeight` to the new option `fitHeight`, once per new height; without `fitHeight`
  it is ignored as before.
- `vb-app-frame.ts`: wiring `fit?` (the flag; left out, its default); the bridge gets `fitHeight`
  when on; `fitTo` sets `--app-h` to the told height (the host context keeps the agent's size),
  back to `data-h` on unload, and fires `vb-app-frame-resize` when the height changed.
- `apps/board/src/board/cards/card-images.ts`: that event goes to the existing `grew` → `grown` →
  draw.ts `resized` path (the one re-measure). `app-cards.ts`: optional `fit` dep passed to each
  frame's wiring.
- `packages/format/src/flags.ts` `appFit` (default on); `apps.ts` comments on `APP_SIZE` and
  `PANEL_METHODS`. `docs/specification/apps.md`: § Panel size, the Panel to board row, Host
  context, Kept true by. `pattern.json` for the frame.
- Skill v3.15 (`SKILL.md` § Apps on the board: the message and the lines that send it; `h` near
  the content's height), `NOTES.md` § Skill v3.15. The calculator tells its height (`tellHeight`,
  `main { min-height: 440px }`, its keypad's own height = its app.json `h`, so it fits exactly as
  before; a long history grows it).
- Tests: `packages/ui/tests/app-frame-fit.test.ts` (new, 10 cases; seen failing first), the limits
  test renamed; `tests/pages/app-fit.spec.ts` (new) with the fixture app
  `tests/pages/fixtures/apps/grow/` (seen failing first: 5 of 6); gallery section `appFitSection`
  (`apps/board/src/gallery/app-section.ts`, registered in `main.ts`) with new baselines
  `app-fit-light/dark-darwin.png` (looked at: light and dark right). `app-alive.spec.ts` (a new size
  from the agent: the height stays the calculator's 440) and `app-states.spec.ts` (opens with
  `-appFit`, so each state is compared at the agent's one size).

### Caught Beyond the Brief
- The browser holds back rendering (and so `ResizeObserver`) in a cross-origin frame out of view: a
  panel tells its height only once it is in view. Fine on the board (frames load on screen); the
  gallery tests scroll the section into view first.
- A panel that alternates two heights can relayout the board up to 50 times a second (the message
  cap), batched to one re-measure per frame by `grew`. Bounded, not debounced; say if you want a
  debounce.
- MCP Apps' fixed/flexible `containerDimensions` shape: see the decision's open point.
- `apps/board/src/board/canvas/draw.ts` `resized` says "(an image loaded)": now also an app panel.

### Deviations from Plan
- The board page honours `?flags=-appFit` only once `controller.ts` passes the flag to
  `createAppCards` (`fit: on('appFit')`), a file outside this task: a blocking REQUEST. Verified
  with that line applied temporarily (app-states and every app spec green), then reverted.
- `.visionboard/apps/calculator/panel.html` must be copied from the skill's example
  (`repo-example-app.test.ts` fails until then): a blocking REQUEST.
- Security: no new surface. The height is a number from the card's own frame only (source and
  origin checked as before), rounded and clamped, under the existing message cap; it never reaches
  the ledger, the saved state or another card.

---

## On Completion

1. Fill in Implementation Notes; set `status: completed` and `completed:`.
2. Append your own LOG entry to `cortex/LOG.md`, one line ending in a newline:
   `[[YYYY-MM-DD HH:MM]] [board-ui] App card fits its content → Task: [[cortex-tasks/board/2026-10-27_board-ui_app-panel-fits-content.md]]`
3. Return the `cortex-task-exe` Return Contract, with the decision as a blocking `REQUEST` to
   `docs/decisions.md`.

### Run 2

**Completed**: 2026-10-28 00:10 (the orchestrator routed Run 1's requests back, widening the files to these three)

- `apps/board/src/board/controller.ts`: `fit: on('appFit')` in createBoard's `createAppCards(...)`, so
  the board page honours `?flags=-appFit` (app-states.spec.ts opens with it).
- `.visionboard/apps/calculator/panel.html`: copied byte for byte from the skill's example
  (`cmp` same; `repo-example-app.test.ts` passes).
- `apps/board/src/board/canvas/draw.ts`: the header and `resized`'s comment name an app panel's told
  height (and its frame going) beside an image.
- Checks: npm test 1770/1770 and timing 10/10; npm run check 0 errors; npm run verify ok (no new
  warning beyond Run 1's app-frame-core.ts 303 lines); gen-api --check current; page specs on
  VB_TEST_PORT=5500: app-fit, app-alive, app-cards, app-follow, app-gallery, app-safety, app-states,
  app-pan-key, gallery, host-styles: 71 passed.
- `docs/decisions.md` untouched: D-065 (§ Proposed decision above) goes to the maintainer.

### Run 3

**Stopped before any change** (2026-10-28): raising `APP_SIZE.h.max` from 800 to 1080 (maintainer
point 315; D-065 approved) needs more than the number.
- `packages/format/schema/common.schema.json` `appHeight` is part of ledger format v18 (`$id`
  `.../schema/ledger/18/`, `LEDGER_FORMAT = 18`, `LEDGER_FORMATS` up to 18). A node line written as v18
  with `app.h` 1000 would be refused as invalid by any build that holds today's v18 schema, while it
  claims a format that build reads. The project's rule is that a format change comes first with a
  schema version bump (components.md, "change the format first"; api.md's ledger v17 and v18 points);
  every earlier change went v(N) to v(N+1). No test catches a widened maximum without a bump (old
  lines stay valid), so the tests would not say so.
- What it would take: `LEDGER_FORMAT` 19 and `LEDGER_FORMATS` with 19; every ledger `$id` moved to
  `.../schema/ledger/19/` (and each `$ref` to them); `openapi.json` `info.version` bumped; a new
  numbered point in `docs/specification/api.md` (ledger v19: app height to 1080, only widens, v18
  lines still read) with a "v18 lines still read" test; then regenerated files:
  `packages/format/src/tools.generated.json` and `packages/mcp/src/tools.generated.json` (both hold
  `"maximum": 800` for the height), and whatever else gen-api writes from the `$id`s.
- Or, if the maintainer rules that widening a limit is not a format change, only the number, with
  the generated files regenerated by the orchestrator. That is a ruling to record, not mine to make.

**Run 3, continued** (2026-10-28; the orchestrator's ruling, D-065 updated by it): neither a v19 bump
nor the number alone. A told height is never stored, so it has its own limit and the ledger format
stays v18.
- The agent's `h` keeps `APP_SIZE.h` (120 to 800): schema, generated tool files and `LEDGER_FORMAT`
  unchanged (gen-api --check current with no regeneration).
- `packages/format/src/apps.ts`: `APP_LIMITS.toldHeight` = 1080, with a comment saying why it
  differs (never stored, so no part of the ledger format); the `APP_SIZE` and `PANEL_METHODS`
  comments point at it. `app-frame-size.ts` `panelHeight` clamps to `APP_SIZE.h.min` ..
  `APP_LIMITS.toldHeight`; the frame's comment, `pattern.json` and the `appFit` flag's description say
  the same.
- `docs/specification/apps.md`: § Panel size (the agent's `h` 120 to 800, a told height up to 1080,
  and why), the Limits table row `toldHeight` (held by `packages/format/tests/apps.test.ts`), "stops at
  1080", Kept true by.
- `skills/vision-board/SKILL.md`: both places, folded into the v3.15 line; `NOTES.md` § Skill v3.15.
- Tests: `app-frame-fit.test.ts` (a told 1000 is 1000, 1200 and 5000 are 1080, the loop ends at
  1080); `app-fit.spec.ts` (title 120 to 1080; 24 rows = 984 fits, 30 rows held to 1080). The gallery
  entry's text says 120 to 1080, so its two new baselines were made again (looked at: right).
- Checks: npm test 1770/1770 and timing 10/10; check 0 errors; verify ok (no new warnings); gen-api
  --check current; page specs on VB_TEST_PORT=5500 (app-fit, app-alive, app-cards, app-follow,
  app-gallery, app-safety, app-states, app-pan-key, gallery, host-styles): 71 passed.
