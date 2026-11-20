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

## Implementation Notes

- **Identity** (`apps/board/server/chat-identity.ts` `chatIdentity`): the newest session in this ledger's index whose
  agent has joined the ledger, with a fresh secret; else a new one (`chat-access.ts` `newIdentity`). Claude and Kiro,
  board and folder sessions all share it. `joinAndGrant` now skips the `join` for a joined identity and the board
  grant when it already holds the board; an open request of its own for the board is answered rather than duplicated
  (`grantTo`). Secrets are still never stored: each start stores one more hash, as `rekey` does.
- **Adoption** (`adoption`, `adopt`): due only on the first start again of an earlier session's agent (it has exactly
  one session in the index, read before the new entry is added), so it runs once with no new stored marker; a crash
  before the index entry is written retries, and the diff writes only what is still missing. Grants, as the person's
  grant with the new reason `anEarlierChatHeldThis`: each container another chat agent of the ledger holds where it
  holds the board too, else that board. Skipped, so the identity never widens past the person's clicks: what only an
  MCP agent holds, locked or archived boards (`isLocked`), and any board or container the person revoked from the
  identity or refused it (a `revoke` of it, a `deny` of its request).
- **Folder session attach** (`chat-sessions.ts` `offAppend`): `findLast`, the newest folder session of that agent.
- Tests: new `apps/board/tests/api-chat-identity.test.ts` (adoption once, Kiro/Claude/folder share it, a removal
  stays, writes in an earlier chat's container unasked, MCP agent's container and a revoked one need a grant,
  read-only refuses start and writes). `api-chat-sessions.test.ts`: the second session is the same agent and writes
  no line. Spec: `docs/specification/chat.md` § The pieces, point 7.

### Caught Beyond the Brief

- **Words file outside ownership**: the adoption grant's reason is a new sentence, so it went into
  `apps/board/server/words/server-chat.ts` (`anEarlierChatHeldThis`, under `// ---- chat-access.ts`); reusing
  "The person started a chat on this board." would put a false sentence in the ledger for grants on other boards.
- **Stale contract text (T_01's files)**: `docs/specification/api.md` 106 still says the server joins an agent per
  `start_chat` (with an old label form) and 122 that a folder session joins its agent; `openapi.json` `start_chat`
  could say the session's agent is the folder's one chat agent (D-114).
- **Old sessions resumed** keep their own agent ids (only starts share the identity); what they make after adoption is
  not adopted. Conservative by design.
- **Shared identity attach side effect**: a board created by the identity from a board session now also moves the
  newest folder session of that ledger to it (the ledger line names the agent, not the session).
- **Locked mid-start**: before, a board locked while the CLI started made the grant fail and the start close; now an
  identity already holding the board writes no grant, so the session starts (its writes still answer `locked`;
  `chat.ts` refuses a locked board up front as before).
- **Security note**: agent secret hashes never expire (pre-existing); with one identity per ledger, every earlier
  session's secret authenticates as the agent that now holds the adopted grants. The CLIs holding them are closed on
  replace, and the secrets were only ever in their MCP environment, so the exposure is unchanged in kind.
- `apps/board/tests/api-ledgers.test.ts` "the folder open now, still in the old layout, moves…" fails on HEAD too
  (no `set-cookie` without a built page); unrelated.
