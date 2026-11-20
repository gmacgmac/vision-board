# T_02: One chat identity per folder

**Objective**: Every chat panel session the person starts in a folder's ledger is one agent, holding what earlier
chats there made (PLAN.md Decision 5, D-114). **Skills**: cortex-architecture · **Port**: `VB_TEST_PORT=6200`

## Steps
1. Read `apps/board/server/chat-access.ts` (`newIdentity`, `joinAndGrant`, `rekey`) and where a session starts and
   stores its agent (`chat-index.ts` `ChatSession`). Secrets are never stored; keep it so (`rekey` per start).
2. Add the folder's chat identity: the ledger's chat agent, found from the sessions the server keeps (most recent);
   a session starts as it, else mints one as today. Kiro and Claude sessions share it.
3. Adoption, once per ledger: grant the chat identity every board and container any earlier chat agent of this
   ledger holds, as the server records the board grant today (the person's act). Never anything an MCP agent holds
   that no chat agent held. Idempotent: a second start writes nothing.
4. The label stays the folder's name. Board grant at start stays as today.
5. Tests first, in the chat server's tests: two sessions in one folder are one agent; the second writes in a
   container the first made with no grant request; an MCP agent's container still needs a grant; adoption writes once;
   a read-only ledger still refuses every write.
6. `docs/specification/chat.md` states it, citing the test. Run the tests you changed and `npm run verify`.

## On completion
Notes here and your row; one LOG line `[board-app] Completed: T_02 …`; the return block. The orchestrator appends D-114.
