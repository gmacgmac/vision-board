# FIX_02_app-card-state: App cards follow their files and never jump

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix VERIFY_01 findings 1, 2, 3 and 6 (TASK-STATUS.md § VERIFY_01, with steps and screenshots): an app
card shows its app's real state without the person trying the app first, a past version keeps the
panel's size, and no state change moves the card.

## Context

The page keeps one copy of `list_apps` (`apps/board/src/board/app-state.ts`, FE_02) and reads it again only
on app ledger lines, Allow/Stop, Check again/Restart and a refused call. So a deleted folder, a restored
folder or a changed `tools.mjs` stays unseen. Page weight is 149.7 of 150 KB gzip after FIX_01's few
bytes: keep the change small and trim within the app-card code if needed; never raise the budget. If the
budget truly cannot hold, report DEVIATION with the smallest option.

## Inputs

- **Finding 1** (rulings 10, 11): a deleted app folder never says "not found"; the frame reloads to a
  blank grey box because the panel route's 404 carries the page's `frame-ancestors 'none'`; restoring the
  folder never heals the card. Fix: read `list_apps` again when a frame loads or fails to load; give the
  `missing` state a Check again button (copy from `node-app.ts` `COPY`, plain words); the panel route's 404
  (`apps/board/server/apps/panel.ts`) carries the panel's own frame headers (`frame-ancestors 'self'`) so a
  failed load is seen, not blank.
- **Finding 2** (ruling 7, 11): a changed `tools.mjs` shows "Code changed. Allow it again?" only after
  the person presses `=`. Fix: read `list_apps` again when an app card is selected (select hook in
  `draw.ts` or wherever selection is handled) and when its frame loads (same seam as 1). One read for many
  cards selected at once; no timers, no polling.
- **Finding 3** (rulings 3, 10): a past version draws app cards at 360×320, ignoring the manifest size.
  Fix: `app-cards.ts` `input()` keeps the app's known `info` (its `size`) with `past: true`; assert the
  size in `tests/pages/app-states.spec.ts` "a past version".
- **Finding 6** (great UX; components.md § App card's claim "a state change never moves the card"):
  Allow removes the ask line, the card shrinks 44 px and the container below jumps. Fix: keep that row's
  height in every app state (e.g. the ready state holds Stop app in that row), so Allow, Stop app and a
  code change never change the card's height. Files: `packages/ui/src/node/node-template.ts`
  `appStateMarkup`, `node-app.css`, `node-app.ts` header, components.md stays true.
- **Patterns**: reuse `app-state.ts` (one cache), `io.ts` `listApps`, the existing Check again path; no
  second copy of state.
- **Skills**: `cortex-architecture` (one state source, one I/O layer) · `design:design-critique` and
  `design:accessibility-review` on the changed states, light and dark · `cortex-docs` (components.md,
  apps.md, `apps/board/README.md` if a claim changes).

## Steps

1. [ ] Page tests first, each seen failing: folder deleted on screen → "not found" without a reload, and
   restored → the panel back; `tools.mjs` changed + card selected → "Code changed" before any call; a past
   version keeps the manifest size; Allow, Stop app and a code change leave the card's height unchanged
   (assert the box). Put them where they fit (`app-states.spec.ts`, `app-cards.spec.ts`; split a file
   before it passes 300 lines).
2. [ ] The fixes. Then the gallery app states: view every screenshot diff light and dark before updating.
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] The four findings no longer reproduce (name the test for each); all gates exit 0; page weight held.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_02: app cards follow their files and never jump → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_02_app-card-state.md]]`
