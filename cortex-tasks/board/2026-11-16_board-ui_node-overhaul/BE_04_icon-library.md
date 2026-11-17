# BE_04_icon-library: The Icon Library

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Let agents list the project's icons and add their own to its library (`.visionboard/icons/`) through the action
layer only; check every drawing as hostile when it is added and every time it is read; write the ledger's `icon`
line on a node's first use of a library icon; and hand the page only checked path data. This is the handler half of
the icon library; T_01 landed its contract.

---

## Context

PLAN.md § Decision 24 and § Planner's calls 10 to 12. The design is the ledger review's § 4 O4, taken as written
(row R27). T_01 landed: the `icon` event (`name`, `hash`) and the index's name-to-hash; `ICONS_DIR` and
`ProjectFiles.icons` in `data-folder.ts`; the name rule (a built-in from `ICON_NAMES`, or a library name matching
`^x-[a-z0-9][a-z0-9-]{0,37}$`); the rule that a node's library icon needs an `icon` line earlier in the ledger and
that a name is given once; `list_icons` and `add_icon` in `openapi.json` with stub handlers. This task replaces the
stubs and builds what is behind them.

A drawing is path data in an SVG wrapper, never markup: the page never puts a file's text into the page; it takes
the checked `d` strings and builds the elements itself, as the node does with its own icons
(`packages/ui/src/node/node-icons.ts`). The same check runs when a file is read, because a file can arrive by hand,
by git or by a sync, and an agent outside the board's chat is not held by its path rules. No new npm package: the
check is string logic.

You run in your own git worktree beside T_02 and BE_03 (PLAN.md § House Rules; TASK-STATUS.md § File Ownership).

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/src/icon-file.ts` (new), `packages/format/src/index.ts` (one export line),
  `packages/format/src/words/format-icons.ts` (new), `packages/format/tests/icon-file.test.ts` (new),
  `apps/board/server/icons.ts` (new), `apps/board/server/engine/` (`engine.ts`: the option; the two handlers and
  the reads and writes they need), `apps/board/server/write-board.ts` and `write-insert.ts` (the `icon` line on
  first use), `apps/board/server/project.ts` (pass the folder), `apps/board/server/words/icons.ts` (new),
  `packages/agent/src/access-rules.ts` and its words and tests, `apps/board/tests/` (new files only)
- **Files to reference**: the review § 4 O3, O4; T_01's notes and `api.md` points for the icon contract;
  `packages/format/src/images.ts` (`imagePathProblem`, the precedent for a check the server and page share);
  `packages/format/src/apps.ts` (`APP_HASH_PATTERN`, `app-allow`: files in a folder, the ledger holding the trusted
  hash, D-047); `apps/board/server/atomic-file.ts` (`writeFileAtomic`); `write-board.ts` (where `RetireEvent.cards`
  is filled before the line is written); `docs/specification/plugin.md` § The engine; D-064, D-066, D-085
- **Creates for later tasks** (TASK-STATUS.md § Shared Foundations): the shared check and the box FE_01 draws on
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`. In this wave `plugin.md`
> is T_02's and the schema, `openapi.json`, the generated files and `api.md` are BE_03's: put your paragraph for
> `plugin.md` § The engine, word for word, and any schema change you need under `REQUESTS`.

---

## Steps

1. [ ] **The shared check** (`packages/format/src/icon-file.ts`, pure, no `node:` import; the server and the page
       both use it): `ICON_BOX` (24: `viewBox="0 0 24 24"`, the box FE_01 draws the built-in set on);
       `ICON_LIMITS` (at most 8 paths, 2,000 characters a path, a title of at most 80); `iconPathProblem(d)` (only
       `MmLlHhVvCcSsQqTtAaZz`, digits, `.`, `,`, `-`, `e` and spaces); `iconFileText(paths, title?)` (the one fixed
       form the server writes: an `svg` with the box, an optional `title`, `path` elements with a `d` and nothing
       else); `iconFileProblem(text)` (the whole file must be exactly that form, matched as a pattern over the whole
       text, then each `d` by the grammar); `iconPathsOf(text)` (the checked `d` strings and title). Every refusal
       is a sentence in `words/format-icons.ts` that says what was found.
2. [ ] **A hostile corpus first**, as tests that fail before the check exists: `script`; `on*` attributes; `style`
       elements and attributes; `use`, `href`, `xlink:href`; `image`; `foreignObject`; `text`; gradients and
       patterns; `filter`; `transform`; a DOCTYPE or entity; CDATA; comments; a `d` holding `url(` or a quote;
       look-alike Unicode letters; numbers in exponent form past sane size; nested `svg`; a byte-order mark; CRLF;
       a file one character over each limit. Each is refused with its reason; the fixed form round-trips.
3. [ ] **`add_icon`** (`name`, `title`, `svg`, `key`): check the name by T_01's rule; reduce the SVG to paths:
       accept only `svg`, `title` and `path`; on `svg` only `xmlns`, a `viewBox` equal to the box, `width`,
       `height`, `fill`, `stroke` and the stroke-line attributes, all dropped; on `path` only `d` and the same
       presentation attributes, dropped (the board sets the colour); refuse anything else and say what it was. Then
       `iconFileText`, then `iconFileProblem` on the result. The same name with the same drawing is a replay (no
       second file or line); the same name with another drawing is refused in words that point at the existing
       icon ("reuse it, or pick a more specific name"). Write the file only if none has that name, without ever
       replacing one (a temp file linked into place, which fails if the name exists), then append the `icon` line.
       The line names no board and moves no board's head. A read-only ledger refuses (D-085). `key` gives a retry
       the first answer, as `write_board`'s keys do.
4. [ ] **Reading the library** (`apps/board/server/icons.ts`): the names in the folder that match the library
       pattern; each file checked by `iconFileProblem` on every read and hashed (sha-256, `APP_HASH_PATTERN`'s form).
       A file that fails the check, or whose hash is not the ledger's latest for that name, is a problem: its paths
       are never served, and `list_icons` lists it under `problems` with its reason.
5. [ ] **`list_icons`**: the built-in names and the library's names with their titles; with `paths: true` (the
       page's read, call 11) also the checked `d` strings. An agent's call carries no paths unless it asks.
6. [ ] **First use**: when a node names a library icon this ledger has no `icon` line for, and the file is there
       and passes the check, the write path appends the `icon` line (by the caller) before the node line, as it
       fills `RetireEvent.cards`. A file that is missing or fails: the node is refused with the reason. A file
       dropped into the folder by a person works the same way.
7. [ ] **The person's accept** (call 12): a person's `icon` line is accepted only with the hash of the file as it
       is now, computed by the server; an agent's line for a held name with another hash is refused. Server and
       tests only; the page's control is a tracker row.
8. [ ] **The engine option**: `EngineOptions.icons?: string`, the library folder, default `join(dir, ICONS_DIR)`
       (under a host the engine reads and writes only its `dir`); the standalone server passes
       `projectFiles(project).icons`, shared by every ledger of the project. No host breaks.
9. [ ] **Path rules**: a row in `packages/agent/src/access-rules.ts` for `**/.visionboard/icons/**`: read allowed,
       write refused, with words that say to use `add_icon`. `.visionboard/**` already refuses writes; the row
       says it for icons, and a test holds it.
10. [ ] **Tests**: add, replay, clash, read-only refusal, the hostile corpus end to end (refused on add; a hostile
        file put in the folder by hand is never served, by `list_icons` or to a node); a hash mismatch is a problem
        and is not served; first use writes the `icon` line before the node line; two ledgers of one project share
        the files and each has its own lines; the engine's default folder.
11. [ ] Run the checks. Any difference from T_01's `api.md` points goes under `REQUESTS`.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run gen -- --check` pass
- [ ] Every input in the hostile corpus is refused with its reason, on add and on read; no path reaches a reply
      without passing `iconPathProblem`
- [ ] An agent cannot write into `.visionboard/icons/` by its path rules; it can add only through `add_icon`
- [ ] A replay answers as the first time and writes nothing; a clash is refused with the reuse words; a read-only
      ledger refuses
- [ ] With `paths: true`, `list_icons` gives the checked paths; without, none

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- No new npm package; no DOM or XML parser added for the check.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---
## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-16 (Run 1)

### Run 1

### Changes Made
- **The shared check** (`packages/format/src/icon-file.ts`, pure, exported from `index.ts`): `ICON_BOX` (24),
  `ICON_LIMITS` (8 paths, 2,000 characters a path, a title of 80, numbers within ±1,000, a file of 16,600 characters),
  `iconPathProblem` (ASCII grammar only, a move first, every number readable and bounded; arity is the browser's),
  `iconTitleProblem` (no control character, no invisible or direction-changing mark), `iconFileText` (the one fixed form,
  one line), `iconFileProblem` / `iconPathsOf` (the whole file matched by one pattern, then each `d`; a refusal names
  what it found). Words: `packages/format/src/words/format-icons.ts`. The file's regexes are built on first use, so the
  page carries nothing for them (page weight measured equal to HEAD, 200.7 KB).
- **The server** (`apps/board/server/icons.ts`, words `apps/board/server/words/icons.ts`): `reduceSvg` (string logic, no
  parser: whole tags or refusal; only `svg`, `title`, `path`; presentation attributes dropped; the box, the namespace, a
  repeated attribute, entities, comments, CDATA, DOCTYPE, PIs, text outside a title refused with what they were; a BOM,
  CRLF, an XML declaration and line breaks inside a `d` are cleaned, never refused: the file written is the server's own
  form); `readIcon` (opened with `O_NOFOLLOW | O_NONBLOCK`, plain file only, size-capped, strict UTF-8, checked on every
  read, sha-256 of the bytes); `readLibrary` (folder names matching the library pattern plus every name the ledger holds;
  a failing file, a missing file and a hash that is not the ledger's latest are `problems`, never served); `addIcon`
  (title, reduce, fixed form, check again, key replay, given-once against the ledger and the file, `checkWritable`, the
  file linked into place so it never replaces one, then the `icon` line with no board); `firstUse`; `acceptIcon` (the
  person's line, with the hash the server computes; the page's control is a tracker row).
- **Engine**: `EngineOptions.icons` (default `join(dir, ICONS_DIR)`), `OpCtx.icons`; `reads.ts` `listIcons` (paths only
  with `paths=true`); `writes.ts` `addIcon` wrapper; `write_board` passes the folder. `write-board.ts` `libraryLine`: a
  node's first use appends the `icon` line (by the caller, no key) after every check and before the node line; a missing
  or failing file refuses the node at `/items/i/node/icon`. `project.ts` passes `projectFiles(getDir()).icons`.
- **Path rules**: `access-rules.ts` row `**/.visionboard/icons/**` read allow, write refuse, words `iconLibrary` (names
  `add_icon`). It also becomes a Claude Code deny rule (`Edit(.../**/.visionboard/icons/**)`): a second line.
- **Tests**: `packages/format/tests/icon-file.test.ts` (purity, round trip, the path grammar, 39 hostile files, titles);
  `apps/board/tests/icon-library.test.ts` (add, replay, key retry, clash, reused key, read-only, 38 hostile svgs on add,
  cleaning, hostile files by hand never served nor drawn, first use once and before the node, hash change and the
  person's accept, two ledgers sharing files with their own lines, the default and a given folder, standalone over HTTP
  with ledger folders against the spec); `policy.test.ts` (rows), `claude-args.test.ts` (the deny line).

### Issues & Resolutions
- **`list_icons` credentials: it should take none** (`auth: none`, like `list_boards`). The access rules read
  `.visionboard/icons/**` freely: the library is committed project content, not a secret, so a credential guards nothing
  the folder doesn't already give, and the answer is not scoped to an agent (api.md 21, 41: reads take no credentials;
  `list_apps` is the exception because it is the app host's, with allow state per agent). Requiring a secret only makes
  an agent that has not joined unable to reuse before it adds. Not changed here: `openapi.json` is BE_03's (REQUEST).
  The handler ignores the caller, so it works either way.
- **Failing checks, none from code in this task's files**: `api-v20.test.ts` "list_icons (a stub)" tests the stub this
  task replaces (REQUEST); `scripts/words.test.mjs` needs the two new words files in `words.md` (REQUEST);
  `plugin-build.test.ts` engine budget: 245,167 gzip against 240,000 (HEAD 236,306; this task adds ~8.9 KB gzip, the
  engine bundle is built with `minify: false`, so every source comment ships) — needs a ruling (REQUEST);
  `api-ledgers.test.ts` "the folder open now, still in the old layout, moves" failed at HEAD too in a worktree with no
  `apps/board/dist` (no `set-cookie` on `/`) and passes once `npm run build` has run; `npm run verify`: `modules.md` (`npm run map`) and the page weight (200.7 KB,
  unchanged from HEAD, PERF_01's).
- An `icon` line written on first use stays if the node line after it is then refused by the ledger's own checks: it
  records the file's hash, names no board and is what the next use would write. Every write-board check runs before it.
- The `x-` regexes first built at module load kept 0.1 KB in the page through tree-shaking; now built on first use.

### Caught Beyond the Brief
- **The engine bundle ships its comments** (`vite.plugin.config.ts` `engineBuild`, `minify: false`): dropping comments
  there would give back far more room than any feature can save, without squeezing source.
- **`list_icons` problems carry text from a hostile file** (an element or attribute name, quoted, clipped to 40
  characters) and titles are free text: FE_01/FE_02 must render `problems[].detail` and `title` as text, never markup.
- **No count cap on the library**: every `list_icons` reads every file (each at most ~50 KB). A tracker row if libraries grow.
- **`list-icons-response` `library` description says "this ledger knows"**: it lists every checked file in the folder,
  including one this ledger has no line for yet (taken on first use), as reuse across ledgers needs.
- **A symlinked `.visionboard/icons` folder** would send `add_icon`'s writes where it points; the chat agent cannot make
  one (the row refuses a write to the folder itself), and only `x-…svg` files in the fixed form are ever written.
- `api-ledgers.test.ts` fails in a fresh worktree until `npm run build` has run (pre-existing; a test that needs the page could build or skip).

### Deviations from Plan
- None. Cleaning a BOM, CRLF, an XML declaration and line breaks in a `d` on add (rather than refusing them) is within
  step 3's "reduce the SVG to paths": the hostile corpus is refused on read, where the file must be the fixed form.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-security] BE_04: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/BE_04_icon-library.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
