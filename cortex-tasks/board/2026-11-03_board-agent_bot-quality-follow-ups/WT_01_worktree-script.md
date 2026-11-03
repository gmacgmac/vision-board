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

