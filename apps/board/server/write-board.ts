// `write_board` (api.md 24-25, 29-37): one agent's batch of write items for the board in the
// path, run in order, one result each. Per item: the write-item schema, then the cards it names
// (board numbers and `{ key }`s, write-refs.ts), then its own retry key (before grants; write-replay.ts), then
// `base`, then the board, a proposal's card kind, the grant and a retire's owed cards, then the
// ledger module's own checks as it appends. One failure never stops the rest, except items naming a
// failed item's key, directly or through another failed item. Results name cards by board number.
import { LIMITS, codePoints, isRecord, latest } from '#format';
import type { LedgerState, RetireTarget, WriteItem } from '#actions';
import { ACTION_OUT, actionIn, canWrite, numberOf, proposeProblem, retireProblem } from '#actions';
import { WRITE_ITEM_ID, itemExample, itemTypes } from './examples.ts';
import type { Ledger } from './ledger.ts';
import type { PointerError } from './problem.ts';
import { ProblemError } from './problem.ts';
import { LEDGER_SCHEMA_BASE, schemaProblems } from './schema.ts';
import type { ItemProblem } from './write-problem.ts';
import { ItemFailed, fail, under } from './write-problem.ts';
import { replay } from './write-replay.ts';
import type { WriteResult } from './write-result.ts';
import { written } from './write-result.ts';
import type { Batch } from './write-refs.ts';
import { refsOf, resolve, retireLine, storedFor } from './write-refs.ts';
import * as writesWords from './words/writes.ts';

export type { ItemProblem } from './write-problem.ts';
export type { WriteResult } from './write-result.ts';
export { WRITE_ITEM_ID };

const KEY_ID = `${LEDGER_SCHEMA_BASE}common.schema.json#/$defs/key`;

type Rec = Record<string, unknown>;

/** Item types that carry the path's board on the stored line. */
const ON_BOARD = new Set(['board', 'region', 'node', 'retire']);
/** The item's key, when it is a valid one (it is echoed in the result). */
function keyOf(raw: unknown): string | undefined {
  const key = isRecord(raw) ? raw.key : undefined;
  return typeof key === 'string' && schemaProblems(KEY_ID, key).length === 0 ? key : undefined;
}

/** The ledger line an item becomes: `base` dropped, the path's board on the lines that carry one
 * (api.md 34), and a retire's cards filled in (api.md 126). */
function eventOf(b: Batch, item: Rec): Rec {
  const { base: _base, ...rest } = item;
  const e = ON_BOARD.has(String(item.type)) ? { ...rest, board: b.board } : rest;
  return e.type === 'retire' ? retireLine(b.ledger.state(), e) : e;
}

/** An `append` as the `node` line it is stored as (api.md 95): the version it adds to (the latest,
 * or on a retry the one before the line its key stored) with `text` after a blank line at the end
 * of the body, every other field as it was. `item.n` is the card's identity by now. */
function appended(b: Batch, i: number, item: Rec, key: string | undefined): Rec {
  const s = b.ledger.state();
  const id = item.n as number;
  const node = s.nodes.get(id)!;
  const stored = key === undefined ? undefined : storedFor(b, key);
  const from = stored?.type === 'node' && stored.id === id ? node.versions[stored.ver - 2] : undefined;
  // An old card's `item` mark stays behind: a v11 line names none (api.md 118).
  const { ver: _ver, at: _at, agent: _agent, item: _item, ...was } = from ?? latest(node);
  const body = was.body === undefined ? String(item.text) : `${was.body}\n\n${String(item.text)}`;
  if (codePoints(body) > LIMITS.body) {
    fail('invalid', writesWords.withThisTextNodeS(numberOf(s, id), codePoints(body), LIMITS.body),
      { errors: [{ pointer: `/items/${i}/text`, detail: writesWords.theBodyWouldBeOver(LIMITS.body) }] });
  }
  return { type: 'node', board: b.board, n: id, node: { ...was, body }, ...(item.key !== undefined && { key: item.key }) };
}

/** A node update based on a version that is no longer the latest is a `conflict` carrying the
 * current `ver` (api.md 30). */
function checkBase(s: LedgerState, i: number, item: Rec, e: Rec): void {
  if (e.type !== 'node' || typeof e.n !== 'number' || typeof item.base !== 'number') return;
  const node = s.nodes.get(e.n);
  if (!node) return; // an unknown node is the ledger's to report
  const ver = latest(node).ver;
  if (ver === item.base) return;
  const n = numberOf(s, e.n);
  fail('conflict', writesWords.nodeIsAtVersionNot(n, ver, item.base, ver),
    { ver, errors: [{ pointer: `/items/${i}/base`, detail: writesWords.nodeIsAtVersion(n, ver) }] });
}

/** Every card an item names must be on the board in the path (api.md 24): a `{ key }` can name a
 * card made on another board. */
function checkBoard(b: Batch, s: LedgerState, i: number, e: Rec): void {
  for (const f of refsOf(e.type)) {
    const id = e[f];
    const node = typeof id === 'number' ? s.nodes.get(id) : undefined;
    if (!node || node.board === b.board) continue;
    const n = numberOf(s, id as number);
    fail('invalid', writesWords.thisCallWritesBoardAnd(b.board, n, node.board),
      { errors: [{ pointer: `/items/${i}/${f}`, detail: writesWords.nodeIsOnBoardNot(n, node.board, b.board) }] });
  }
}

/** A proposal only on a card that needs an answer (api.md 120): ✓ and ✗ are on no other kind. */
function checkProposal(s: LedgerState, i: number, e: Rec): void {
  const why = e.type === 'propose' && typeof e.n === 'number' ? proposeProblem(s, e.n) : undefined;
  if (why === undefined) return;
  fail('invalid', writesWords.youCanProposeOnlyOn(why),
    { errors: [{ pointer: `/items/${i}/n`, detail: why }] });
}

/** No grant, no write (api.md 25, 83-84): the permissions table's answer for this item. */
function checkGrant(b: Batch, s: LedgerState, i: number, e: Rec): void {
  const need = canWrite(s, b.agent, e as unknown as WriteItem);
  if (need === 'ok') return;
  if (need === 'creator') {
    const person = s.index.creators.get(b.board) === undefined; // no agent creator: the person made it (D-034)
    fail('forbidden', writesWords.changeItsTitleAndSummary(person ? writesWords.onlyThePersonCan : writesWords.onlyTheAgentThatCreated(b.board)),
      { errors: [{ pointer: `/items/${i}/type`, detail: writesWords.boardWas(b.board, person ? writesWords.madeByThePerson : writesWords.createdByAnotherAgent) }] });
  }
  const maker = s.index.creators.get(need.board) === undefined ? writesWords.thePerson : writesWords.anotherAgent;
  const what = need.region === undefined
    ? writesWords.youMayNotWriteOn(need.board, maker)
    : writesWords.youDoNotHoldThe(need.region, need.board);
  fail('needs-grant', writesWords.waitForThePersonS(what),
    { board: need.board, ...(need.region !== undefined && { region: need.region }) });
}

/** A retire waits while a card it takes still owes the person something (api.md 126, assumption B). */
function checkOwed(b: Batch, s: LedgerState, i: number, item: Rec, e: Rec): void {
  if (e.type !== 'retire') return;
  const t: RetireTarget = e.region === undefined ? { board: b.board, id: (e.cards as number[])[0]! } : { board: b.board, region: String(e.region) };
  const why = retireProblem(s, t, e.cards as number[]);
  if (why === undefined) return;
  fail('invalid', writesWords.youCanTRetireThis(why),
    { errors: [{ pointer: `/items/${i}/${item.region === undefined ? 'n' : 'region'}`, detail: why }] });
}

/** Append through the ledger module; its problems point into this item. A `/board` pointer
 * names the path's board, which the item does not carry, so it points at the item; a retire's
 * `/cards` pointer is about the card or container the item named. */
function append(b: Batch, i: number, key: string | undefined, item: Rec, e: Rec): WriteResult {
  try {
    const stored = b.ledger.append(e, { by: 'agent', agent: b.agent }, { board: b.board });
    return written(b.ledger.state(), i, key, stored);
  } catch (err) {
    if (!(err instanceof ProblemError)) throw err;
    const { status: _status, errors, ...rest } = err.body;
    const named = item.region === undefined ? '/n' : '/region';
    const fixed = (errors ?? []).map((x) => (x.pointer === '/board' ? { ...x, pointer: '' } : x.pointer.startsWith('/cards') ? { ...x, pointer: named } : x));
    throw new ItemFailed({ ...rest, ...(fixed.length > 0 && { errors: under(i, fixed) }) });
  }
}

/** A `propose` names ✓ `check` and ✗ `cross` (D-045, api.md 147): the old `ack` and `drop` are
 * refused by name, before the schema, so the reason says the new word. */
function checkProposeWord(i: number, raw: unknown): void {
  const word = isRecord(raw) && raw.type === 'propose' && typeof raw.action === 'string' && Object.hasOwn(ACTION_OUT, raw.action)
    ? ACTION_OUT[raw.action as keyof typeof ACTION_OUT] : undefined;
  if (word === undefined) return;
  const old = String((raw as Rec).action);
  fail('invalid', writesWords.proposeAsCheckAndAs(word, old),
    { errors: [{ pointer: `/items/${i}/action`, detail: writesWords.isNow(old, word) }] });
}

/** The item as the ledger names it: a proposal's `check` or `cross` stored as `ack` or `drop`. */
const storedNames = (item: Rec): Rec => (item.type === 'propose' ? { ...item, action: actionIn(String(item.action)) } : item);

/** A refused item (api.md 40): one naming a known `type` comes back with that form's example; one
 * with a missing or unknown `type` lists the ten types. */
function refuse(i: number, raw: unknown, errors: readonly PointerError[]): never {
  const example = itemExample(isRecord(raw) ? raw.type : undefined);
  if (example === undefined) {
    fail('invalid', writesWords.eachItemNeedsAType(itemTypes().map((t) => `\`${t}\``).join(', ')), { errors: under(i, errors) });
  }
  fail('invalid', writesWords.thisItemDoesNotFit, { errors: under(i, errors), example });
}

function writeOne(b: Batch, i: number, raw: unknown, key: string | undefined): WriteResult {
  checkProposeWord(i, raw);
  const errors = schemaProblems(WRITE_ITEM_ID, raw);
  if (errors.length) refuse(i, raw, errors);
  const item = storedNames(raw as Rec);
  const e = item.type === 'append' ? appended(b, i, resolve(b, i, item), key) : eventOf(b, resolve(b, i, item));
  const replayed = key === undefined ? undefined : replay(b, i, key, e);
  if (replayed) return replayed;
  const s = b.ledger.state();
  checkBase(s, i, item, e);
  checkBoard(b, s, i, e);
  checkProposal(s, i, e);
  checkGrant(b, s, i, e);
  checkOwed(b, s, i, item, e);
  return append(b, i, key, item, e);
}

/** Write `items` for `agent` on `board`, in order, one result each (api.md 34). `keyHelp`: a key conflict says what the
 * key holds (write-replay.ts). */
export function writeItems(ledger: Ledger, agent: string, board: string, items: readonly unknown[], keyHelp = false): WriteResult[] {
  const b: Batch = { ledger, agent, board, failed: new Set(), keyHelp };
  return items.map((raw, i) => {
    const key = keyOf(raw);
    try {
      return writeOne(b, i, raw, key);
    } catch (err) {
      if (!(err instanceof ItemFailed)) throw err;
      if (isRecord(raw) && typeof raw.key === 'string') b.failed.add(raw.key);
      return { index: i, ...(key !== undefined && { key }), ok: false, problem: err.problem };
    }
  });
}
