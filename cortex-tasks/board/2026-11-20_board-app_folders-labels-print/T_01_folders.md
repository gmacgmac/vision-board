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

**Status**: Completed 2026-11-20 (T_01, worktree `flp-folders`).

### What changed
- **One rule** (decision 1): `apps/board/server/folders.ts` `placeProblem(places, real)` says why a real path can't be a
  project folder (`hidden`, `holds-home`, `other-home`, `system`) or nothing: home itself and under it, under `/Volumes/`
  (not `/Volumes` itself), `/Users/Shared` and under it. `resolvePicked` and `resolveVouched` now take `Places`
  (`placesOf(home, roots)`: `/Volumes`, `/Users/Shared`, `/Users`); D-110's trust rule is unchanged (outside home only a
  chooser pick or the server's recent list). Words: `words/server-folders.ts` `holdsHome` (reworded), `otherHome`,
  `systemFolder`, each ending with where a project may be; `chooseAProjectFolderUnder` removed (server and page).
- **Home itself opens**: `open-folder.ts` drops the `HOME_ITSELF` refusal; `FolderPicker.svelte` drops `isHome`, so home
  shows Open or Create like any folder.
- **Roots injectable**: `createBoardServer({ places })` (app.ts) → `ServerEnv`/`Ctx` `places` (dispatch.ts);
  `startFolder({ roots })` (recent.ts); the API harness and `tests/pages/folder-server.ts` pass them through.
- **No hunting** (decision 2): `packages/client/src/project.ts` `projectOf` is `VB_PROJECT` resolved against the working
  folder, else the working folder, exactly (an empty `VB_PROJECT` counts as unset). `vb-mcp.ts` always names a folder.
  `caller-folder.ts` untouched (open folder or inside it).
- **Docs**: api.md 110, 111, 112, 114, 116, 162, 209, 210, 211 (cite D-111); `packages/mcp/README.md` § Settings;
  SETUP.md step 3 and the `wrong-folder` row.
- **Tests**: new `apps/board/tests/folder-places.test.ts` (each kind, pure); `api-folder-chooser.test.ts` now runs in a
  temp root standing in for `/Users`, `/Users/Shared`, `/Volumes` and adds the D-111 refusals and home/Shared opening;
  `api-project.test.ts` (home itself opens), `api-cloud-places.test.ts`, `recent.test.ts` (start: drive root, system
  folder, home itself); `packages/mcp/tests/project.test.ts` (no walk; `ledgersIn` kept its coverage as a direct test);
  `packages/mcp/tests/support.ts` + `session.test.ts` start `vb-mcp` in the board's open folder, as a client would.
  Page specs: `open-folder.spec.ts` (home: "No Vision Board here", Create enabled), `folder-chooser.spec.ts` (drive under a
  temp `/Volumes` stand-in; a `/usr` pick refused with words). Renewed baselines: `folder-picker-{light,dark}` and
  `folder-chooser-{light,dark}` (only the gallery's Home state changed: status, Create enabled, its description).

### Caught Beyond the Brief
1. **Home open means every agent under home is accepted.** The caller rule (open folder or inside it) is unchanged, so
   with `~` open an agent started anywhere under home reaches that board. It follows from the ruling; the person chose
   it. Worth one line in the board's words if it surprises anyone.
2. **Clients that start MCP servers outside the project now get `wrong-folder` on every call** unless the entry sets
   `VB_PROJECT` (before, a client started with no board above it sent no header and was never checked). Intended by
   decision 2; README and SETUP.md say so. Which clients start servers where is not established in sources.
3. `caller-folder.ts` `realPath` falls back to `path.resolve` for a folder that does not exist, so a header through a link
   to a not-yet-made subfolder is not resolved and is `wrong-folder`. Read-only for this task; an agent's working folder
   always exists, so low risk.
4. No flag: steering asks new behaviour behind a flag in `packages/format/src/flags.ts`; the plan names none and that file
   is not this task's. Both rulings narrow access, so a flag would mean shipping the old wider rule; noted for the
   orchestrator.
5. `packages/format/schema/openapi.json` (and the generated `api-reference.md`) still say home itself is refused and a pick
   may be "anywhere": REQUEST below.
