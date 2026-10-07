# BE_01_ledger-lock: One server per ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Key change 1,
> ruling 5) · **Tracker**: U8 · **Model**: Sonnet 5.5

## Objective

A second board server, on this computer or another sharing the folder, refuses to start while
another one holds the ledger, and says which computer holds it.

## Rulings (do not reopen)

1. `.visionboard/lock`, JSON: `{ host, pid, port, started, beat }` (`os.hostname()`, ISO times).
   Taken in `apps/board/server.ts` before `openLedger`, written atomically (temp file + rename,
   as `apps/board/server/agents.ts` does), and added to `.visionboard/.gitignore` the way
   `ignoreAgents` adds `agents.json`.
2. `beat` is rewritten every 30 s. A lock is live when its `beat` is under 2 minutes old and,
   if it is on this host, its `pid` is still running (`process.kill(pid, 0)`). A live lock held
   by anyone else: print who holds it (host, port, since) and exit 1. A stale lock is replaced,
   with one line saying so.
3. Release on exit in every mode: `SIGINT`, `SIGTERM` and normal exit remove the lock only if it
   is still ours. Move the signal handling in `server.ts` out of the watch-only branch so all
   modes close cleanly; `board-watch.mjs` keeps working (its restarts release and retake).
4. `server.listen` gets an `error` handler: `EADDRINUSE` prints a plain message and exits 1,
   releasing the lock.
5. The lock lives in its own module (`apps/board/server/lock.ts`), unit-tested with an injected
   clock, host and process check; no dependency.

## Steps

1. [x] Failing tests first (`apps/board/tests/lock.test.ts`): take, refuse a live lock (same
   host live pid; other host fresh beat), replace a stale one (dead pid; old beat), release only
   our own, heartbeat updates `beat`.
2. [x] `lock.ts`; wire into `server.ts`; signal handling for all modes; `listen` error handler.
3. [x] By hand: start `VB_PORT=4485 VB_PROJECT=temp/lock-check node apps/board/server.ts`, then a
   second on 4486 with the same project: refused with the message; stop the first; the second
   now starts. Kill one with `kill -9`: the next start replaces the stale lock. Clean up `temp/`.
4. [x] `docs/specification/api.md` or `apps/board/README.md`: one paragraph on the lock (where a
   person reads it); README § Running mentions one server per ledger.

## Validation

- [x] The five gates exit 0; step 3 noted with what was seen.

## Implementation Notes

**Status**: Completed (2026-10-07)

- `apps/board/server/lock.ts`: `takeLock(dir, port, env)` returns `{ ok, lock, replaced? }` or `{ ok: false, holder }`; `holderMessage` words the refusal. `LockEnv` (clock, host, pid, `alive`) is injected in tests. A lock file that cannot be read counts as stale. `BEAT_MS` 30 s, `STALE_MS` 120 s.
- `server.ts`: lock taken before the seed copy and `openLedger` (so two servers cannot both seed); `exit` event releases (covers `process.exit(1)` paths); `SIGINT`/`SIGTERM` now handled in every mode (release, close the watch, close connections, exit); `server.on('error')` prints a plain `EADDRINUSE` message and exits 1.
- `agents.ts`: `ignoreAgents` became the exported `ignoreInGit(dir, name)` so the lock reuses it (no second copy); behaviour unchanged.
- Docs: paragraph in `apps/board/README.md`; one line in README § Running.
- By hand (scratch project `temp/lock-check`, ports 4485/4486, removed after): first server wrote the lock and `.gitignore` entry; second was refused naming the computer, process, port and start, exit 1; SIGTERM on the first removed the lock, the second then started; `kill -9` left the lock, the next start printed "Replaced a stale lock ..." and ran; SIGINT removed it; a second project on a taken port printed the `EADDRINUSE` message, exit 1, and left no lock.
- Gates: `npm test` 598 pass + 4 timing, `npm run check` 0, `npm run verify` ok, `npm run gen -- --check` current, `npm run test:pages` 149 pass.
- No deviation. `board-watch.mjs` untouched (its child restarts under `node --watch-path` get SIGTERM, which now releases the lock; not exercised by hand beyond SIGTERM).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] BE_01: …`).
