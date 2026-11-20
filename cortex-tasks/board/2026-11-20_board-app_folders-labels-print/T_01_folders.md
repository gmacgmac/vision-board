# T_01 — Which folders open, and no hunting for a board

Model: strong · Skills: cortex-architecture, cortex-docs · Rulings: PLAN § Decisions 1-2 (D-111)

## Objective
Folders open by D-111's rule, and an agent's board tools never search upward for a board.

## Inputs
`apps/board/server/folders.ts` (`resolveFolder`, `resolvePicked`, `resolveVouched`, `isUnder`), `open-folder.ts`,
`recent.ts`, `chooser.ts`; the page's `apps/board/src/shell/FolderPicker.svelte` (`isHome` disables Open on home);
`packages/mcp/` (`VB_PROJECT` default: "the nearest folder at or above ... with a Vision Board", `#client`
`ledgersIn`), `packages/client/`, `apps/board/server/caller-folder.ts` (keep its rule: open folder or inside it);
`packages/mcp/README.md` § Settings, `SETUP.md`, `docs/specification/api.md` (110-113, 116, 208-211); words files;
tests `apps/board/tests/api-folder-chooser.test.ts`, the MCP's and client's tests, folder page specs.

## Steps
1. Folder rule (decision 1): one function says whether a real path may be a project; home itself now allowed when
   chosen (list or Finder), `/Volumes/**` and `/Users/Shared` allowed, all else refused with words saying why
   (system folder, holds home, another person's home, hidden). Keep D-110's trust rule.
2. No hunting (decision 2): the MCP server's folder is `VB_PROJECT`, else its working folder, exactly; remove the
   upward search. Keep the board's caller rule. Say it in `packages/mcp/README.md` § Settings and in SETUP.md (start
   agents in the project's folder or inside it; `wrong-folder` otherwise).
3. Tests for each allowed and refused kind (temp folders standing in for `/Volumes/...` where needed: make the roots
   injectable), the MCP's folder without a walk, and the page's Open enabled on home. Docs (api.md) cite D-111; do not
   edit `docs/decisions.md`.

## Validation
`npm run verify`, `npm test` (temporary HOME), the changed page specs pass.

## Constraints
Own files only (TASK-STATUS File Ownership); others are REQUESTS. No git command that changes state. No PII.

## Implementation Notes
