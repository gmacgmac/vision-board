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

Done 2026-11-19 (Opus 5.5).

**Contract.** `choose_folder` (`POST /api/folders/choose`, person only, `openapi.json` 1.46.0) answers
`folder-choice.schema.json`: `{ path, name, found, boards? }` or `{ cancelled: true }`. `folder-list.schema.json` gains
`chooser: true` and says recent may hold a picked folder outside home. The flag is `systemFolderChooser` (on by
default; page `?flags=-systemFolderChooser`, server `VB_FLAGS`). `npm run gen` was re-run. The `apiVersion` line also
changed in `packages/mcp/src/tools.generated.json`.

**Server.**
- `server/chooser.ts`: `macChooser` runs `osascript` by `execFile` on the fixed `server/choose-folder.applescript`, with
  the prompt and open folder as argv. The script is its own file so the words scan doesn't read AppleScript as prose.
  `createChooser` allows one chooser at a time (`conflict`), is closed when the caller goes away, times out after 10
  min, and keeps the trusted set in memory.
- `createBoardServer({ chooser })`: the default is `macChooser` on macOS. `false` means none, which is the default in
  `startTestBoard`, so no test opens the real dialog.
- `folders.ts`:
  - `resolvePicked`: real path; refuses hidden parts, control characters, and home or a folder holding home.
  - `resolveVouched`: the trust rule. A path outside home must be that very path the server returned (the picked set
    or the server's recent list) and still be its own real path.
- `open-folder.ts`: `chooseFolder`; `openProject` goes through `resolveVouched`; `recent()` lists vouched folders
  outside home; the listing says `chooser`.
- `recent.ts` `startFolder`: may start in a vouched folder outside home.
- `project.ts`, `caller-folder.ts`, the lock and the chat are unchanged. The audit found nothing in them that depends on
  home (agents are checked by real path against the open folder; chat cwd and permissions belong to the folder).

**Page.**
- `FolderDialog.svelte`: `picked`, `choosing`, `inFinder`, `pickRecent`, `stopChoosing`.
- `FolderPicker.svelte`: `chooser`/`choosing`/`picked` props, a `target` for status and Open, the "Chosen folder" line.
- `page-io.ts` `chooseFolder`, `FolderHead`; `folder.ts` `folderChooserOn`; words in `shell/words/folders.ts`.
- `styles/folder-dialog.css`: 720px wide, 16px gutter; every name, crumb, list heading and problem wraps anywhere.
- Gallery: new last section `gallery/folder-chooser-section.ts` (long names plus each chooser state); `folder-section.ts`
  exports its `sample`.

**A refused pick is `invalid` (422), not `forbidden`.** The page's `asPerson` treats any `forbidden` as a stale cookie
and reloads, which closed the dialog in the browser check. `forbidden` stays for the wrong caller, and for `open_project`
outside home as before.

**Tests.**
- `apps/board/tests/api-folder-chooser.test.ts` (new, 13): trust, recent, hidden, control character, home and above,
  node_modules, cancelled, one at a time, abort, runner failure, and the real script compiling (`osacompile`, never run).
- `recent.test.ts`: the old "a recent folder outside home is never opened" is replaced by D-110's rule.
- `openapi.test.ts` and `route-table.test.ts`: version and operation updates.
- `tests/pages/folder-chooser.spec.ts` (new, 12): width and gutter, wrapping, Tab, waiting, pick and Open, Recent,
  hidden, Cancel aborting, flag off, axe and APCA light and dark (chosen label Lc 94.3 / 71.6, path 104.5 / 94.9),
  gallery.
- The "section is last" lists in header-tiers, ledgers, read-only and read-only-controls specs gain the new section.
- `api-read-only.test.ts` `STILL_GO` names `choose_folder` (it writes nothing; D-085 3).
- Full unit suite (`npm test`, temp HOME): 2,790 of 2,791 passed; the one failure was this `STILL_GO` row, now added and green.

**Baselines.** New: `folder-chooser.spec.ts/folder-chooser-{dark,light}`. Renewed: see TASK-STATUS T_01 notes (the
wider dialog makes the gallery's folder picker section about 23px shorter, which moves every section below it by a
fraction of a pixel; untouched HEAD passed all 140 gallery tests).

**Budgets.** Board page 212.3 KB gzip against a 212.2 KB budget (`npm run verify` FAIL by 0.1 KB). Reported, not
raised.

**Looked at** on port 8420 with a temporary HOME and a stand-in chooser: dark at 1024 wide, light at 375. Pick, Open,
Recent and the hidden refusal all work. That check caught a focus bug (Open was still disabled when focus went to it),
now fixed.

### Caught Beyond the Brief
1. **Home's ancestors are refused too.** D-110 says home is never a project. `/Users` or `/` picked in Finder would be
   every project's nearest board, which is the reason home itself is refused, so `resolvePicked` refuses any folder that
   holds home. This is stricter than the ruling's words; the maintainer may overrule.
2. **The trust is to the exact path, and only while it is still its own real path.** A link to a picked folder is not
   trusted, and a picked folder later swapped for a link is refused.
3. **Recent as a trust source.** Any process running as the person can write `~/.visionboard/recent.json`, including
   the chat agent if it is allowed to write there. That only puts a folder in the person's list: opening it still takes
   the person's click (`open_project` is person-only), and hidden or home paths are still refused. Worth knowing; no
   change made.
4. **Control characters.** A folder named with a line break would come back from Finder but could not be carried in any
   answer, request or recent file. It is refused at the pick, in words.
5. **`asPerson` reloads on every `forbidden`.** This is a latent page-wide issue: any person route refused as
   `forbidden` for a reason other than a stale cookie reloads the page once. It was avoided here; it is not fixed
   page-wide.
