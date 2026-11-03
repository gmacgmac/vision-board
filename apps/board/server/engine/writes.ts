// The write operations. The caller is the host's (the standalone server works it out from the
// operation's `security`, callers.ts): the person for `act`, `mark_seen`, `put_board` and
// `retire_cards`, an agent for `request_grant` and `write_board`, nobody for `join`, the one
// credential-free write. Each body fits the operation's request schema first (pointers into the
// body, api.md 38), its cards turn from board numbers into identities (edge.ts), then the ledger
// module's own checks as it appends. Answers name cards by board number.
import { eventOut, holders, openContainers, openItems, retireCards as cardsOf } from '#actions';
import type { OperationId } from '#format';
import { flagOn, openRequestOf } from '#format';
import { newToken } from '../secrets.ts';
import { cardsIn } from '../edge.ts';
import { bodyExample } from '../examples.ts';
import { problem } from '../problem.ts';
import { SPECS, bodyProblems } from '../spec.ts';
import { writeItems } from '../write-board.ts';
import { agentSees, personBoard, requireBoard, requireUnlocked, writeTarget } from '../visibility.ts';
import type { Op, OpCtx } from './operations.ts';
import { reply, whereAnswer } from './operations.ts';
import { compileSchema } from '../schema.ts';
import * as writesWords from '../words/writes.ts';

const KIB = 1024;
/** `join` takes 4 KiB; `write_board` 512 KiB and as many items as its schema allows (api.md 28);
 * every other body the host's default (64 KiB in the standalone server). */
const JOIN_LIMIT = 4 * KIB;
const WRITE_LIMIT = 512 * KIB;

/** The most items one `write_board` takes: its request schema's `items.maxItems`. */
const maxItems = (): number =>
  (compileSchema(SPECS.write_board.body!).schema as { properties: { items: { maxItems: number } } }).properties.items.maxItems;

export const invalid = (errors: { pointer: string; detail: string }[], id?: OperationId) =>
  problem('invalid', writesWords.theRequestDoesNotFit, { errors, ...(id && bodyExample(id)) });

/** `value`, checked against the operation's request schema. */
export function checkBody(id: OperationId, value: unknown): Record<string, unknown> {
  const errors = bodyProblems(id, value);
  if (errors.length) throw invalid(errors, id);
  return value as Record<string, unknown>;
}

const body = async (id: OperationId, ctx: OpCtx, limit?: number) => checkBody(id, await ctx.body(limit));

/** The agent the host passed (an agent operation always has one). */
function agentOf(caller: OpCtx['caller']): string {
  if (caller?.by !== 'agent') throw new Error('an agent operation ran without an agent caller');
  return caller.agent;
}

/** One person action from the action registry, on the board in the path (rule 8). A Send is the
 * host's to record (`onSend`): the standalone one records it once the board's chat session has the
 * person's answers (api.md 121, point 383). */
const act: Op = async (ctx) => {
  const { params, ledger } = ctx;
  const board = personBoard(ledger.state(), params.board);
  const e = cardsIn(ledger.state(), board, await body('act', ctx), 'act');
  const record = (head?: number) => ledger.append(head === undefined ? e : { ...e, head }, { by: 'person' }, { board });
  const stored = e.action === 'send' ? await ctx.onSend(board, record) : record();
  return reply(201, eventOut(ledger.state(), stored));
};

/** The person has seen version `ver` of card `n` on the board in the path (D-018), or has looked
 * at the board up to line `head` (api.md 87). */
const markSeen: Op = async (ctx) => {
  const { params, ledger } = ctx;
  const board = personBoard(ledger.state(), params.board);
  const e = await body('mark_seen', ctx);
  if (e.board !== undefined && e.board !== board)
    throw invalid([{ pointer: '/board', detail: writesWords.thisNamesBoardButWas(String(e.board), board) }]);
  const stored = ledger.append({ ...cardsIn(ledger.state(), board, e, 'seen'), type: 'seen' }, { by: 'person' });
  return reply(201, eventOut(ledger.state(), stored));
};

/** The person creates the board in the path, or renames it (api.md 90, D-034): a person `board`
 * line. A board the person made has no agent creator, so every agent asks for it. */
const putBoard: Op = async (ctx) => {
  const { params, ledger } = ctx;
  const board = String(params.board);
  const b = await body('put_board', ctx);
  const created = !ledger.state().boards.has(board);
  return reply(created ? 201 : 200, ledger.append({ ...b, type: 'board', board }, { by: 'person' }));
};

/** The person removes cards, or a container with every card in it now, from the board in the path
 * (N24, api.md 141): the same `retire` line an agent's item writes, by the person, with no owed check
 * (ruling 3). The ledger module refuses a retired card, an unknown or built-in container, an archived
 * or a locked board. Answers the stored line, its cards by board number. */
const retireCards: Op = async (ctx) => {
  const { params, ledger } = ctx;
  const board = personBoard(ledger.state(), params.board);
  const b = cardsIn(ledger.state(), board, await body('retire_cards', ctx), 'retire');
  const region = b.region === undefined ? undefined : String(b.region);
  const cards = region === undefined ? b.cards : cardsOf(ledger.state(), { board, region });
  const stored = ledger.append({ type: 'retire', board, ...(region !== undefined && { region }), cards }, { by: 'person' }, { board });
  return reply(201, eventOut(ledger.state(), stored));
};

/** A new agent: id and secret, shown once. The hash is stored before the `join` line is
 * appended, so a secret the board hands out is always one it knows (api.md 21). */
const join: Op = async (ctx) => {
  const { ledger, agents } = ctx;
  const { label } = await body('join', ctx, JOIN_LIMIT);
  const store = agents();
  const agent = store.mint(ledger.state().index.agents);
  const secret = newToken();
  store.add(agent, secret);
  ledger.append({ type: 'join', label }, { by: 'agent', agent });
  return reply(201, { agent, secret, ...whereAnswer(ctx) });
};

/** Ask the person for one container, or with no `region` for the board (api.md 25-26, 81): a
 * locked board refuses it (api.md 139); a holder is told so, an open request from this agent is returned again, a retry key sent before
 * returns its request; else a new one. */
const requestGrant: Op = async (ctx) => {
  const { ledger, caller } = ctx;
  const agent = agentOf(caller);
  const b = await body('request_grant', ctx);
  const s = ledger.state();
  const board = requireBoard(s, b.board);
  requireUnlocked(s, board); // a locked board takes no request, nor answers one (N40 ruling 3)
  const region = b.region === undefined ? undefined : String(b.region);
  if (region !== undefined && !s.index.boards.get(board)?.has(region)) {
    throw problem('not-found', writesWords.thereIsNoRegionOn(region, board));
  }
  const what = { board, ...(region !== undefined && { region }) };
  if (holders(s, board, region).includes(agent)) return reply(200, { ...what, held: true });
  const open = openRequestOf(s.index, agent, board, region);
  if (open !== undefined) return reply(200, { request: open, ...what, replayed: true });
  // A key used on a board agents don't see is free again (visibility.ts `agentSees`).
  const used = typeof b.key === 'string' ? s.keys.get(agent)?.get(b.key) : undefined;
  const line = used === undefined ? undefined : ledger.events().find((e) => e.seq === used);
  const keyed = line && agentSees(s, line) ? used : undefined;
  if (keyed !== undefined) {
    const r = s.index.requests.get(keyed);
    if (r?.board !== board || r.region !== region || s.grantNotes.get(keyed)?.reason !== b.reason) {
      throw invalid([{ pointer: '/key', detail: writesWords.keyReusedForDifferentContent }]);
    }
    return reply(200, { request: keyed, ...what, replayed: true });
  }
  const e = ledger.append({ ...b, type: 'grant-request' }, { by: 'agent', agent });
  return reply(201, { request: e.seq, ...what });
};

/** One batch of write items (api.md 34, 37): a body that cannot be read at all, an unknown board
 * with no `board` item, a batch making a board whose id isn't available (api.md 136), or a batch
 * on a locked board (api.md 139), is one problem; otherwise 200 with a result per item. */
const writeBoard: Op = async (ctx) => {
  const { params, ledger, caller } = ctx;
  const agent = agentOf(caller);
  const value = await ctx.body(WRITE_LIMIT);
  const items = (value as { items?: unknown } | null)?.items;
  const most = maxItems();
  if (Array.isArray(items) && items.length > most) {
    throw problem('too-large', writesWords.theBatchHasItemsAnd(items.length, most));
  }
  // Each item is checked on its own as it runs, so one bad item never fails the batch.
  const top = bodyProblems('write_board', value).filter((p) => !/^\/items\/\d+(\/|$)/.test(p.pointer));
  if (top.length) throw invalid(top, 'write_board');
  const list = items as unknown[];
  const board = String(params.board);
  writeTarget(ledger.state(), board, list.findIndex((x) => (x as { type?: unknown } | null)?.type === 'board'));
  const results = writeItems(ledger, agent, board, list, flagOn('botToolRules', ctx.flags));
  const s = ledger.state();
  const pending = s.boards.has(board) ? openItems(s, board, agent).filter((x) => x.pending !== undefined) : [];
  const containers = s.boards.has(board) ? openContainers(s, board, agent) : [];
  return reply(200, { results, head: s.seq, pending, ...(containers.length > 0 && { containers }) });
};

export const WRITES = {
  act, mark_seen: markSeen, put_board: putBoard, retire_cards: retireCards, join, request_grant: requestGrant, write_board: writeBoard,
} satisfies Record<string, Op>;
