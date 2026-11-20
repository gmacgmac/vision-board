---
task_name: Plugin Fonts
created: 2026-11-20
completed:
status: pending
categories: [board-tokens]
type: implementation
model: strong
persona: Staff front-end engineer who ships type systems into host apps — the board must render as designed wherever it runs, and a broken face must fail our build, not the host's vendoring.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Plugin Fonts

## Problem Statement

Inside nclite the board draws in the host's font, so cards are larger and looser than designed (sizes are set for
Figtree). nclite now lets a plugin bring its own faces: `/Users/dev/AI/nclite/cortex-tasks/nclite/2026-11-20_plugin-fonts-handover.md`
(read only; the contract is nclite's `docs/plugins.md` § A guest in the app's page, Fonts, and § The manifest).
Ship the four faces in the plugin and put the board's own face first in every stack (maintainer, points 721-723).
Keep it as small as an accurate, fully checked result needs.

## Steps

1. **Tokens (maintainer-approved exact change, point 722).**
   - `packages/tokens/src/tokens.css`: `--vb-font-text: 'vb-figtree', var(--vb-host-font, var(--vb-font));` and
     `--vb-font-display: 'vb-bricolage-grotesque', 'vb-figtree', var(--vb-host-font, var(--vb-font));`; `--vb-font-label`
     unchanged. Update the comment above them to say the board's faces come first and a host's font is the fallback (D-116).
   - `packages/tokens/src/skins.css` (Command Lens): `--vb-font-display: 'vb-space-grotesk', var(--vb-host-font, var(--vb-font));`
     and `--vb-font-label: 'vb-jetbrains-mono', var(--vb-host-font-mono, var(--vb-font-mono));`; text unchanged.
   No other token changes.
2. **Plugin build** (`apps/board/vite.plugin.config.ts`): remove `hostTakesNoFontFaces`; the built
   `dist/plugin/vision-board/view/board.css` declares each face at top level exactly as the handover's step 3 says,
   `src: url("fonts/<file>.woff2") format("woff2")`, with the faces copied (not hashed, not inlined) to `view/fonts/`
   with their OFL files from `packages/tokens/fonts/`. The standalone page keeps working as today.
3. **Manifest**: `view.fonts` lists the four paths (`view/fonts/…`). Update the board's manifest schema
   (`apps/board/plugin/manifest.schema.json`) and wherever the build writes the manifest.
4. **Our own check, in the existing plugin build test** (`apps/board/tests/plugin-build.test.ts`), the handover's
   rules: each `@font-face` top level, family `vb-…`, exactly one relative `.woff2` url (+ optional `format("woff2")`)
   naming a file `view.fonts` lists, only the six descriptors, no backslash escapes; each listed file exists, starts
   `wOF2`, at most 512 KiB; each has its licence in the folder. Update "a clean build writes exactly the folder".
5. **Docs**: `docs/specification/plugin.md` § Theme and host styling, Fonts, and open point 15 closed with nclite's
   answer (cite the handover and the test); `docs/specification/dependencies.md` if it names where the faces ship.
6. **Checks**: the tests you changed, `npm run build:plugin`, `npm run verify` (page and plugin budgets: the faces are
   separate files, so the sheet should not grow; report if it does), and the page specs that read font tokens or
   screenshot type (grep `--vb-font`; expect none to change on the standalone page, which has no host font). In a
   browser under the plugin harness (`tests/plugin/`), confirm the cards draw in Figtree with a host font set.

## Files Involved

| File | Purpose |
|------|---------|
| `packages/tokens/src/tokens.css`, `packages/tokens/src/skins.css` | Stack order (exact change above) |
| `apps/board/vite.plugin.config.ts` | Keep and place the faces |
| `apps/board/plugin/manifest.schema.json` and the manifest the build writes | `view.fonts` |
| `apps/board/tests/plugin-build.test.ts` | The handover's rules as our check |
| `docs/specification/plugin.md`, `docs/specification/dependencies.md` | Fonts, open point 15 |

## Constraints

- Change no token beyond step 1. Don't touch `/Users/dev/AI/nclite` (read only) or the vendored copy there.
- No new dependency. Never port 4466; use `VB_TEST_PORT=6600`, a temporary HOME and
  `PLAYWRIGHT_BROWSERS_PATH=/Users/dev/Library/Caches/ms-playwright`.
- No git commands that change state. STOP and report if a face can't be emitted in the exact form nclite checks.

## Success Criteria

- [ ] The built plugin folder has `view/fonts/` with four faces and their licences; `view.fonts` lists them; the sheet's
      faces pass our copy of nclite's rules.
- [ ] Board faces first in every stack that has one; standalone unchanged; tests and verify pass.
- [ ] Docs updated; open point 15 closed.

## Implementation Notes

_To be completed by agent after task execution._

## On Completion

1. Frontmatter `status: completed`, `completed: YYYY-MM-DD`.
2. One LOG line: `[[YYYY-MM-DD HH:MM]] [board-tokens] Completed: Plugin Fonts → Task: [[cortex-tasks/board/2026-11-20_board-tokens_plugin-fonts.md]]`
3. Don't commit; the orchestrator commits and appends D-116.
