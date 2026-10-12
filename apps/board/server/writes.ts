// The write operations. The caller is already known (callers.ts, from the operation's `security`):
// the person for `act`, `mark_seen` and `put_board`, an agent for `request_grant` and `write_board`, nobody for
// `join`, the one credential-free write. Each body fits the operation's request schema first
// (pointers into the body, api.md 38), its cards turn from board numbers into identities (edge.ts),
// then the ledger module's own checks as it appends. Answers name cards by board number.
import { eventOut, holders, openContainers, openItems } from '../../../packages/actions/src/index.ts';
import type { OperationId } from '../../../packages/format/src/index.ts';
import { openRequestOf } from '../../../packages/format/src/index.ts';
import { newSecret } from './agents.ts';
import { BODY_LIMIT, KIB, readJson } from './body.ts';
import { openName } from './caller-folder.ts';
import type { Ctx, Handler } from './dispatch.ts';
import { cardsIn } from './edge.ts';
import { problem } from './problem.ts';
import { sendJson } from './respond.ts';
import { bodyProblems } from './spec.ts';
import { writeItems } from './write-board.ts';
import { agentSees, personBoard, requireBoard, writeTarget } from './visibility.ts';

/** `join` takes 4 KiB; `write_board` 512 KiB and 200 items (api.md 28). */
const JOIN_LIMIT = 4 * KIB;
const WRITE_LIMIT = 512 * KIB;
const MAX_ITEMS = 200;

const invalid = (errors: { pointer: string; detail: string }[]) =>
  problem('invalid', 'The request does not fit the schema. Fix the fields listed in errors and send it again.', { errors });

/** The body, checked against the operation's request schema. */
export async function body(id: OperationId, req: Ctx['req'], limit = BODY_LIMIT): Promise<Record<string, unknown>> {
  const value = await readJson(req, limit);
  const errors = bodyProblems(id, value);
  if (errors.length) throw invalid(errors);
  return value as Record<string, unknown>;
}

/** The agent the dispatcher authenticated (an agent operation always has one). */
function agentOf(caller: Ctx['caller']): string {
  if (caller?.by !== 'agent') throw new Error('an agent operation ran without an agent caller');
  return caller.agent;
}

/** One person action from the action registry, on the board in the path (rule 8). A Send also
 * hands the board's chat session the person's answers (api.md 121), after the answer: a session
 * that can't be loaded leaves the Send as it was. */
const act: Handler = async ({ req, res, params, ledger, chats }) => {
  const board = personBoard(ledger.state(), params.board);
  const e = cardsIn(ledger.state(), board, await body('act', req));
  const stored = ledger.append(e, { by: 'person' }, { board });
  sendJson(res, 201, eventOut(ledger.state(), stored));
  if (stored.type === 'act' && stored.action === 'send') {
    chats().round(board, stored.seq).catch((err) => console.error(`chat: the Send's answers were not handed over: ${err instanceof Error ? err.message : String(err)}`));
  }
};

/** The person has seen version `ver` of card `n` on the board in the path (D-018), or has looked
 * at the board up to line `head` (api.md 87). */
const markSeen: Handler = async ({ req, res, params, ledger }) => {
  const board = personBoard(ledger.state(), params.board);
  const e = await body('mark_seen', req);
  if (e.board !== undefined && e.board !== board)
    throw invalid([{ pointer: '/board', detail: `this names board "${String(e.board)}" but was sent to board "${board}"` }]);
  const stored = ledger.append({ ...cardsIn(ledger.state(), board, e), type: 'seen' }, { by: 'person' });
  sendJson(res, 201, eventOut(ledger.state(), stored));
};

/** The person creates the board in the path, or renames it (api.md 90, D-034): a person `board`
 * line. A board the person made has no agent creator, so every agent asks for it. */
const putBoard: Handler = async ({ req, res, params, ledger }) => {
  const board = String(params.board);
  const b = await body('put_board', req);
  const created = !ledger.state().boards.has(board);
  sendJson(res, created ? 201 : 200, ledger.append({ ...b, type: 'board', board }, { by: 'person' }));
};

/** A new agent: id and secret, shown once. The hash is stored before the `join` line is
 * appended, so a secret the server hands out is always one it knows (api.md 21). */
const join: Handler = async ({ req, res, ledger, agents, project }) => {
  const { label } = await body('join', req, JOIN_LIMIT);
  const store = agents();
  const agent = store.mint(ledger.state().index.agents);
  const secret = newSecret();
  store.add(agent, secret);
  ledger.append({ type: 'join', label }, { by: 'agent', agent });
  sendJson(res, 201, { agent, secret, project: openName(project) });
};

/** Ask the person for one container, or with no `region` for the board (api.md 25-26, 81): a
 * holder is told so, an open request from this agent is returned again, a retry key sent before
 * returns its request; else a new one. */
const requestGrant: Handler = async ({ req, res, ledger, caller }) => {
  const agent = agentOf(caller);
  const b = await body('request_grant', req);
  const s = ledger.state();
  const board = requireBoard(s, b.board);
  const region = b.region === undefined ? undefined : String(b.region);
  if (region !== undefined && !s.index.boards.get(board)?.has(region)) {
    throw problem('not-found', `There is no region "${region}" on board "${board}". Call get_board to see its regions.`);
  }
  const what = { board, ...(region !== undefined && { region }) };
  if (holders(s, board, region).includes(agent)) return sendJson(res, 200, { ...what, held: true });
  const open = openRequestOf(s.index, agent, board, region);
  if (open !== undefined) return sendJson(res, 200, { request: open, ...what, replayed: true });
  // A key used on a board agents don't see is free again (visibility.ts `agentSees`).
  const used = typeof b.key === 'string' ? s.keys.get(agent)?.get(b.key) : undefined;
  const line = used === undefined ? undefined : ledger.events().find((e) => e.seq === used);
  const keyed = line && agentSees(s, line) ? used : undefined;
  if (keyed !== undefined) {
    const r = s.index.requests.get(keyed);
    if (r?.board !== board || r.region !== region || s.grantNotes.get(keyed)?.reason !== b.reason) {
      throw invalid([{ pointer: '/key', detail: `key reused for different content; use a new key for a new request` }]);
    }
    return sendJson(res, 200, { request: keyed, ...what, replayed: true });
  }
  const e = ledger.append({ ...b, type: 'grant-request' }, { by: 'agent', agent });
  sendJson(res, 201, { request: e.seq, ...what });
};

/** One batch of write items (api.md 34, 37): a body that cannot be read at all, an unknown board
 * with no `board` item, or a batch making a board whose id isn't available (api.md 136), is one
 * problem; otherwise 200 with a result per item. */
const writeBoard: Handler = async ({ req, res, params, ledger, caller }) => {
  const agent = agentOf(caller);
  const value = await readJson(req, WRITE_LIMIT);
  const items = (value as { items?: unknown } | null)?.items;
  if (Array.isArray(items) && items.length > MAX_ITEMS) {
    throw problem('too-large', `The batch has ${items.length} items and the limit is ${MAX_ITEMS}. Split the items across several calls.`);
  }
  // Each item is checked on its own as it runs, so one bad item never fails the batch.
  const top = bodyProblems('write_board', value).filter((p) => !/^\/items\/\d+(\/|$)/.test(p.pointer));
  if (top.length) throw invalid(top);
  const list = items as unknown[];
  const board = String(params.board);
  writeTarget(ledger.state(), board, list.findIndex((x) => (x as { type?: unknown } | null)?.type === 'board'));
  const results = writeItems(ledger, agent, board, list);
  const s = ledger.state();
  const pending = s.boards.has(board) ? openItems(s, board, agent).filter((x) => x.pending !== undefined) : [];
  const containers = s.boards.has(board) ? openContainers(s, board, agent) : [];
  sendJson(res, 200, { results, head: s.seq, pending, ...(containers.length > 0 && { containers }) });
};

export const WRITES = {
  act, mark_seen: markSeen, put_board: putBoard, join, request_grant: requestGrant, write_board: writeBoard,
} satisfies Record<string, Handler>;
