# WT_01: one command makes a task's worktree

**Skills**: cortex-architecture · **Model**: standard · **Point**: 400

## Objective

`npm run worktree -- <name> [--base <branch>]` makes the worktree a sub-agent works in, so a brief can name one
absolute path and the agent never starts in the wrong checkout.

## Steps

1. `scripts/worktree.mjs` (node only, no dependency): from the repository's main checkout (`git rev-parse
   --git-common-dir`), `git worktree add <main>/.claude/worktrees/<name> -b feat/<name> <base>` (base: the current
   branch); symlink `node_modules` to the main checkout's; print, one per line: the absolute path, the branch, and a
   free `VB_TEST_PORT` (first of 6010, 6110, … up to 7910 with nothing listening on it or the next 9 ports; never 4466).
2. Refuse, with one plain line and a non-zero exit: a name that isn't kebab-case, an existing folder or branch.
3. Script words: if `scripts/words.test.mjs` requires sentences in a words file, follow its rule.
4. `package.json`: `"worktree": "node scripts/worktree.mjs"`.
5. Test (`scripts/worktree.test.mjs` or beside the other script tests): name checks and the port pick, without
   creating a real worktree (make the git and port probes injectable). Try it once for real on a throwaway name in
   `temp/`-style fashion and remove it (`git worktree remove`, `git branch -D`), and say so in your notes.
6. In your notes, draft the one line every brief should carry, e.g. "Your worktree: <absolute path>. Work only there."

## Validation

`npm run verify`, `npm run check`, unit tests; all `nice -n 15`.

## Constraints

No commits, no LOG, no PII. Your worktree only. Anything outside File Ownership goes in `REQUESTS`.

## Implementation Notes


**Status**: completed (2026-11-03)

- `scripts/worktree.mjs`: node only. Main checkout = parent of `git rev-parse --git-common-dir` (so it works from any
  worktree). Adds `<main>/.claude/worktrees/<name>` on `feat/<name>` from `--base` or the current branch, symlinks
  `node_modules` to the main checkout's, prints path, branch, `VB_TEST_PORT=<n>` (one per line). Port: first of 6010,
  6110 … 7910 where that port and the next 9 cannot be bound (any interface); never reaches 4466.
- Refuses with one stderr line and exit 1: not kebab-case, bad arguments, existing folder, existing branch, main
  checkout without `node_modules`, detached HEAD with no `--base`, no free port. All checks run before `git worktree add`.
- Words: `scripts/*.mjs` is outside the words scan (`SOURCE` is `.ts`/`.svelte`; `scripts` is not a part), so the
  script's lines stay in code like `board-watch.mjs`; `words.test.mjs` passes unchanged.
- `scripts/worktree.test.mjs` (7 tests): names, arguments, port pick with injected `isBusy`, the real bind probe on a
  listening and a freed port, the plan (git calls, link, output) with faked git/files/ports, each refusal touching nothing.
- Real trial: `npm run worktree -- wt-trial-delete-me` from this worktree made the folder under the main checkout on
  `feat/wt-trial-delete-me` at the current commit with the `node_modules` link; a second run, a bad name and no
  arguments each refused. Then `git worktree remove --force` and `git branch -D`; `git worktree list` and
  `git branch --list 'feat/wt*'` show it gone.
- Gates: `npm run verify` ok (no warning for these files), `npm run check` 0 errors, `scripts/*.test.mjs` 87 pass.

**Line every brief should carry**: "Your worktree: <absolute path>. Work only there; begin every Bash command with
`cd <absolute path> &&` and use absolute paths for Read/Edit/Write. Never touch the main checkout or another worktree.
Your test port: VB_TEST_PORT=<n>." (Make it with `npm run worktree -- <name>`, which prints the path and port.)
