# FE_02_sheet-reads-own-properties: The Sheet Reads Only Its Own Properties

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

The plugin sheet reads no custom property outside `--vb-*` and `--host-*`: rename `--app-w`, `--app-h` and `--region`
to `--vb-app-w`, `--vb-app-h` and `--vb-region`, so nclite's `checkStylesheet(css, { scope: 'vb' })` passes with **no**
`reads` (VERIFY_01-R1: without nclite's adapter, a plugin gets no `reads`).

---

## Context

VERIFY_01's notes (R1). The script sets these on elements (`packages/ui/src/node/node-app-apply.ts`,
`packages/ui/src/region/vb-region.ts`, maybe `region-core.ts`, `app-frame/vb-app-frame.ts`); the sheets read them.
**`--region` is also a command-line option** (`packages/cli/tests/run.test.ts`): rename only CSS custom properties, never
a CLI flag, and never a longer name that merely starts with these (check each hit). **Read TASK-STATUS notes first.**

---

## Inputs

- **Files to modify**: the `packages/ui/src/{node,region,app-frame,note-bubble}` files that set or read them (CSS, TS,
  `pattern.json`), `apps/board/tests/plugin-build.test.ts` ("the built sheet stays in its scope": no reads allowed now),
  `scripts/verify-style.mjs` if it lists them, `docs/specification/plugin.md` and `components.md` where they name them.
- **Skills**: `cortex-architecture`, `cortex-docs`.

---

## Steps

1. [ ] Rename setters and readers together; keep values and fallbacks as they are.
2. [ ] The plugin-build test and `checkScope` allow only `--vb-*`, `--host-*` and properties the sheet declares.
3. [ ] nclite's check (read-only, from a script in `temp/`) on a fresh build: `checkStylesheet(css, { scope: 'vb' })`, no
   `reads`: 0 problems.
4. [ ] Docs: every mention in plugin.md (§ A guest, the scope rule) and components.md moves with the code.

---

## Validation

- [ ] `npm run verify`, `npm test`, `npm run test:plugin` pass (`VB_TEST_PORT=9950`).
- [ ] Page specs of app cards, regions and notes with pixels (`tests/pages/` specs naming app, region, container,
      narrow, note-bubble) pass with no screenshot change.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-07

### Changes Made
- `--app-w`, `--app-h`, `--region` are now `--vb-app-w`, `--vb-app-h`, `--vb-region`: setters (`node-app-apply.ts`, `vb-app-frame.ts`, `vb-region.ts`, `region-core.ts` comment), readers (`app-frame.css`, `node-app.css`, `node.css`, `region.css`, `region-fresh.css`, `note-bubble.css` comment), the three `pattern.json`, plugin.md and components.md. Values and fallbacks unchanged; `--region-line-w` and the CLI `--region` flag untouched.
- `plugin-build.test.ts` "the built sheet stays in its scope": the `reads` allowance is gone; a `var()` reads `--host-*`, `--vb-*` or a property the sheet declares.
- plugin.md § A guest says so.

### Issues & Resolutions
- nclite `checkStylesheet(css, { scope: 'vb' })`, no `reads`, on a fresh build (`temp/fe02-check.ts`): 0 problems. verify ok; npm test 2435 pass; test:plugin 103 pass; 132 page specs (app, container, note, group-note, key-bubble) pass, no screenshot change.
- The test does not call nclite's check itself (the board names no host); that stays a script in `temp/`.

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only), category `[board-ui]`,
   trail `→ Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/FE_02_sheet-reads-own-properties.md]]`.
