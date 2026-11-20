// The folder's chat identity (D-114): every chat session the person starts in a folder's ledger, Claude's
// or Kiro's, is one agent, so it holds what earlier chats there made. `chatIdentity` picks it from the
// sessions the index keeps (chat-index.ts): the newest session's agent that has joined this ledger, else
// a new one (chat-access.ts `newIdentity`). The first time an earlier session's agent is started again,
// `adopt` grants it, once, every board and container another chat agent of this ledger holds, as the
// person's grant (every chat was the person's click). Never past those clicks: nothing only an MCP agent
// holds, nothing on a board that is locked or archived, nothing the person revoked from it or refused
// it, and a container only where that chat agent holds its board too (a container's grant brings its
// board). Agents outside the panel keep their own ids. A read-only ledger refuses the start before any
// of this (chat-sessions.ts `refuseReadOnly`).
import type { LedgerState } from '#actions';
import { holders } from '#actions';
import type { LedgerEvent } from '#format';
import { accessKey } from '#format';
import type { Agents } from './agents.ts';
import type { Identity } from './chat-access.ts';
import { grantTo, newIdentity } from './chat-access.ts';
import type { StoredSession } from './chat-index.ts';
import type { Ledger } from './ledger.ts';
import { newToken } from './secrets.ts';
import { isLocked } from './visibility.ts';
import * as serverChatWords from './words/server-chat.ts';

/** A board, or with `region` a container on it. */
export interface Held { board: string; region?: string }

/** The identity a new session of this ledger starts as: the newest of `sessions` whose agent joined the
 * ledger, with a fresh secret (secrets are never stored), else a new one. */
export function chatIdentity(ledger: Ledger, agents: Agents, sessions: readonly StoredSession[]): Identity {
  const joined = ledger.state().index.agents;
  const newest = sessions.findLast((e) => joined.has(e.agentId));
  return newest ? { agentId: newest.agentId, secret: newToken(), joined: true } : newIdentity(ledger, agents);
}

/** The boards and containers (`accessKey`) the person took from `agent` or refused it: a `revoke` of it,
 * or a `deny` of its request. Adoption never gives them back. */
function refusedTo(s: LedgerState, events: readonly LedgerEvent[], agent: string): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.type !== 'act') continue;
    if (e.action === 'revoke' && e.holder === agent) out.add(accessKey(e.board!, e.region));
    const r = e.action === 'deny' ? s.index.requests.get(e.request!) : undefined;
    if (r?.agent === agent) out.add(accessKey(r.board, r.region));
  }
  return out;
}

/** What adopting `agent` grants (`sessions`: the ledger's before this start): nothing unless this is the
 * first start again of an earlier session's agent (it has exactly one session); then each container
 * another chat agent holds with its board, and each board one holds where no such container is, that
 * `agent` does not hold, on a board open to writes, never one refused to it. */
export function adoption(s: LedgerState, events: readonly LedgerEvent[], sessions: readonly StoredSession[], agent: string): Held[] {
  if (sessions.filter((e) => e.agentId === agent).length !== 1) return [];
  const earlier = new Set(sessions.map((e) => e.agentId).filter((a) => a !== agent && s.index.agents.has(a)));
  if (earlier.size === 0) return [];
  const refused = refusedTo(s, events, agent);
  const out: Held[] = [];
  for (const [board, regions] of s.index.boards) {
    const onBoard = holders(s, board).filter((a) => earlier.has(a));
    const mine = holders(s, board).includes(agent);
    if (onBoard.length === 0 || isLocked(s, board) || (refused.has(board) && !mine)) continue;
    const containers = [...regions].filter((region) => !refused.has(accessKey(board, region))
      && holders(s, board, region).some((a) => onBoard.includes(a)) && !holders(s, board, region).includes(agent));
    out.push(...containers.map((region) => ({ board, region })));
    if (!mine && containers.length === 0) out.push({ board });
  }
  return out;
}

/** Grant `agent` what `adoption` names, as the person's grant. A second start finds nothing to grant. */
export function adopt(ledger: Ledger, sessions: readonly StoredSession[], agent: string): void {
  for (const held of adoption(ledger.state(), ledger.events(), sessions, agent)) grantTo(ledger, agent, held, serverChatWords.anEarlierChatHeldThis);
}
