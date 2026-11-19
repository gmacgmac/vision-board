# T_01 — The folder chooser: wider, wrapping, and the system's own

Model: strong · Skills: cortex-architecture, cortex-docs · Port: 8420

## Objective

The Open folder dialog is wide enough to read, every folder name wraps, and on macOS a "Choose in Finder…" button
opens the system's own folder chooser; the folder picked there opens wherever it is, unless hidden (PLAN § Decisions
1-2, 6; D-110). Our own list stays, as the fallback.

## Inputs

- PLAN.md (§ Decisions, § House Rules). `docs/principles.md`; the `cortex-architecture` skill.
- Server: `apps/board/server/folders.ts` (`resolveFolder`, `isUnder`, `skipped`), `open-folder.ts` (`list_folders`,
  `open_project`), `recent.ts` (line `isUnder(fs.realpathSync(home), real)`), `project.ts` (`addRecent` only under home).
- Contract: `packages/format/schema/openapi.json` (`/api/folders`, `open_project`), `docs/specification/api.md` 109-113,
  `packages/format/src/flags.ts` (`openFolder`, `currentFolder`), server words `apps/board/server/words/server-folders.ts`.
- Page: `apps/board/src/shell/FolderPicker.svelte`, `FolderDialog.svelte`, `words/folders.ts`, the dialog styles,
  the gallery's `folder-section.ts` and `current-folder-section.ts`; tests `apps/board/tests/folder-path.test.ts`,
  `api-cloud-places.test.ts`, the folder page specs under `tests/pages/`.

## Steps

1. **Contract first.** A new person-only operation (cookie; never `x-agent`), e.g. `choose_folder`: the server opens the
   system chooser and answers the picked folder as `list_folders` heads one (`path`, `name`, `found`, `boards`), or that
   the person cancelled. The listing (or `get_project`) says whether the server can offer it (`chooser: true` on macOS),
   so the page shows the button only then. Words in their words files. A flag in `flags.ts` (on by default, off with
   `?flags=-…`), described in its `FLAG_INFO`-style line.
2. **The server's chooser.** `osascript` by `execFile` (no shell, fixed arguments; the prompt from the words file),
   starting in the open folder; one at a time (a second call while one is open is refused, `conflict`). Bring the
   dialog to the front (it must not open behind the browser). Make the runner injectable so tests never open a real
   dialog. Resolve the pick with `realpath`; refuse a hidden part (D-110) with words saying so; remember the real path
   as trusted for this run.
3. **Open and Recent.** `open_project` accepts an outside-home path only when trusted (picked this run, or in the
   server's recent list); everything else keeps `resolveFolder`'s rule. A trusted outside-home folder joins Recent and
   may be where the server starts (`recent.ts`). Names outside home show as absolute paths (`displayName` does).
   Audit every `isUnder(home, …)` and home-relative assumption a folder outside home meets (the chat's working folder,
   `caller-folder.ts`, permissions, the MCP's `ledgersIn`); change only what an outside folder strictly needs, and
   list anything you would change beyond that under `REQUESTS` (PLAN decision 6).
4. **The dialog.** Wider (use the space: about 720px, never past the window, the same at phone width with its
   gutter); every folder name and the current path wrap (`overflow-wrap: anywhere`), never an ellipsis. The button
   "Choose in Finder…" near the list (a native button, reachable by Tab), only when offered; while the system dialog is
   open the page says so and stays usable for Cancel; the pick then shows as the chosen folder with Open or Create,
   exactly as a listed one does. A refusal (hidden) says why in the dialog's problem line.
5. **Gallery and states**: the dialog wide with a long name wrapping; the button; waiting on the system dialog; a
   hidden pick refused. Light and dark, axe clean.
6. **Tests** for what changed: the trust rule (picked outside home opens; the same path typed is refused; a hidden pick
   refused; home refused), the recent rule, the one-at-a-time refusal, the injected runner; the page specs for the
   dialog. `npm run verify`, `npm test`, the folder page specs. Renew only the baselines you change; name them.
7. **Docs**: `docs/specification/api.md` (the new operation and the trust rule, citing D-110), the flag, and any spec
   that states the home-only rule (find them; `cortex-docs`). Do not edit `docs/decisions.md` (the orchestrator
   appends D-110).
8. **Look** at it in a browser yourself, light and dark, on port 8420 with a temporary `HOME` (never 4466).

## Validation

- A folder picked in the system chooser outside home (an injected runner in tests) opens and joins Recent; the same
  path sent without the chooser is refused as today; a hidden pick is refused with words; home is refused.
- Long names wrap in every list and the current path; nothing is cut. Light and dark checked by eye.
- `npm run verify`, `npm test` and the changed page specs pass.

## Constraints

Touch only the files above and their tests; anything else is a `REQUESTS` line. No dependency. No git command that
changes state. No PII in examples. A deviation from PLAN.md: stop and say so (`DEVIATION`).

## Implementation Notes

_Fill in on completion: what changed (files and symbols), baselines renewed, budgets measured, anything caught
beyond the brief._
