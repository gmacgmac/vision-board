---
category: board-app
type: task-status
status: in-progress
created: 2026-10-01
---

# Board v3: status

## Execution record (read this first if resuming)

- Plan: `PLAN.md` in this folder. Stages run in order, and each one is committed when it ends.
- Node: use 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`). `/usr/local/bin/node` is 22.14 and
  can't run `.ts`.
- Server: `node apps/board/server.ts` on http://localhost:4466. The review session is `first-look`.
- Gate: `npm test`, plus `temp/smoke.ts` with the server running. Read the exit code yourself.

| Stage | Status | Commit | Notes |
|---|---|---|---|
| 1 Plan and decisions | Done | — | D-010, D-011, vision, tracker |
| 2 Card and container basics | Planned | | |
| 3 Selection and moving | Planned | | |
| 4 Send and vb wait | Planned | | |
| 5 kiro-cli spike | Planned | | |
| 6 Chat panel | Planned | | |
| 7 Verification | Planned | | |
