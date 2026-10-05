// `write_board` (api.md 24-25, 29-37): one agent's batch of write items for the board in the
// path, run in order, one result each. Per item: the write-item schema, then its `{ key }` node
// references, then its own retry key (before grants), then `base`, then the board and the grant,
// then the ledger module's own checks as it appends. One failure never stops the rest, except
// items naming a failed item's key, directly or through another failed item.
import { createHash } from 'node:crypto';
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import { latest } from '../../../packages/format/src/index.ts';
import type { LedgerState, WriteItem } from '../../../packages/actions/src/index.ts';
import { canWrite } from '../../../packages/actions/src/index.ts';
import type { Ledger } from './ledger.ts';
import type { PointerError, ProblemBody, ProblemCode, ProblemExtras } from './problem.ts';
import { ProblemError, problem } from './problem.ts';
import { schemaProblems } from './schema.ts';

export const WRITE_ITEM_ID = 'https://vision-board.invalid/schema/api/write-item.schema.json';
const KEY_ID = 'https://vision-board.invalid/schema/ledger/6/common.schema.json#/$defs/key';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A failed item's problem: the problem document without `status` (api.md 38). */
export type ItemProblem = Omit<ProblemBody, 'status'>;

export type WriteResult =
  | { index: number; key?: string; ok: true; seq: number; n?: number; ver?: number; replayed?: true }
  | { index: number; key?: string; ok: false; problem: ItemProblem };

/** An item that cannot be written, with its problem. */
class ItemFailed extends Error {
  readonly problem: ItemProblem;
  constructor(p: ItemProblem) {
    super(p.detail);
    this.problem = p;
  }
}

function fail(code: ProblemCode, detail: string, extras: ProblemExtras = {}): never {
  const { status: _status, ...body } = problem(code, detail, extras).body;
  throw new ItemFailed(body);
}

/** Pointers into one item become pointers into the request body (`/items/2/node/title`). */
const under = (i: number, errors: readonly PointerError[]): PointerError[] =>
  errors.map((e) => ({ pointer: `/items/${i}${e.pointer}`, detail: e.detail }));

/** Fields that hold a node number or `{ key }` (api.md 35). */
const REFS = ['n', 'from', 'to'] as const;
/** Item types that carry the path's board on the stored line. */
const ON_BOARD = new Set(['board', 'region', 'node']);
/** Stamped or server-held fields, left out when two items are compared (api.md 29). */
const NOT_CONTENT = ['v', 'seq', 'at', 'by', 'agent', 'person', 'key', 'base', 'n', 'ver'];

/** The same JSON for the same value, whatever order its keys came in. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (!isRec(v)) return JSON.stringify(v);
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

/** A hash of what an item says, without its stamp, key or server-assigned numbers. A node's own
 * `n` and `ver` are server-held, so they are compared apart (`sameNode`); `propose`'s `ver` is
 * content. */
function contentHash(e: Rec): string {
  const content: Rec = {};
  for (const [k, v] of Object.entries(e)) {
    if (NOT_CONTENT.includes(k) && !(k === 'ver' && e.type === 'propose') && !(k === 'n' && e.type !== 'node')) continue;
    content[k] = v;
  }
  return createHash('sha256').update(canonical(content)).digest('hex');
}

/** A node item names the same node as the stored line: the same `n`, or none when it was new. */
const sameNode = (item: Rec, stored: Rec): boolean =>
  item.type !== 'node' || (item.n === undefined ? stored.ver === 1 : item.n === stored.n);

/** One batch: the ledger, the writing agent, the path's board, and the keys of items that failed. */
interface Batch { ledger: Ledger; agent: string; board: string; failed: Set<string> }

/** The line this agent's retry key is stored on, across the project (api.md 29). */
function storedFor(b: Batch, key: string): LedgerEvent | undefined {
  const seq = b.ledger.state().keys.get(b.agent)?.get(key);
  return seq === undefined ? undefined : b.ledger.events().find((e) => e.seq === seq);
}

/** The item's key, when it is a valid one (it is echoed in the result). */
function keyOf(raw: unknown): string | undefined {
  const key = isRec(raw) ? raw.key : undefined;
  return typeof key === 'string' && schemaProblems(KEY_ID, key).length === 0 ? key : undefined;
}

/** `{ key }` references as node numbers: a node made earlier in this batch or by an earlier call
 * from this agent (api.md 35); a key whose item failed fails this item too (api.md 34). */
function resolve(b: Batch, i: number, item: Rec): Rec {
  const out: Rec = { ...item };
  for (const f of REFS) {
    const ref = item[f];
    if (!isRec(ref)) continue;
    const key = String(ref.key);
    const pointer = `/items/${i}/${f}`;
    if (b.failed.has(key)) {
      fail('depends-on-failed', `This item names the key "${key}", and the item with that key failed. Fix that item, then send both again with the same keys.`,
        { errors: [{ pointer, detail: `the item with key "${key}" failed` }] });
    }
    const e = storedFor(b, key);
    if (e?.type !== 'node') {
      fail('invalid', `No node you made has the key "${key}". Name the node by its number, or by the key of the node item that made it.`,
        { errors: [{ pointer, detail: `no node you made has the key "${key}"` }] });
    }
    out[f] = e.n;
  }
  return out;
}

/** The ledger event an item becomes: `base` dropped, and the path's board on the lines that
 * carry one (api.md 34). */
function eventOf(b: Batch, item: Rec): Rec {
  const { base: _base, ...rest } = item;
  return ON_BOARD.has(String(item.type)) ? { ...rest, board: b.board } : rest;
}

function written(i: number, key: string | undefined, e: LedgerEvent, replayed = false): WriteResult {
  return {
    index: i, ...(key !== undefined && { key }), ok: true, seq: e.seq,
    ...(e.type === 'node' && { n: e.n, ver: e.ver }), ...(replayed && { replayed: true as const }),
  };
}

/** A key sent before: the same content returns the first result and writes nothing; other
 * content is a `conflict` (api.md 29). Undefined when the key is new. */
function replay(b: Batch, i: number, key: string, e: Rec): WriteResult | undefined {
  const stored = storedFor(b, key);
  if (!stored) return undefined;
  const line = stored as unknown as Rec;
  if (contentHash(line) !== contentHash(e) || !sameNode(e, line)) {
    fail('conflict', `The key "${key}" was used before for different content. Use a new key for new content, or resend the same content to get the first result.`,
      { errors: [{ pointer: `/items/${i}/key`, detail: 'key reused for different content' }] });
  }
  return written(i, key, stored, true);
}

/** A node update based on a version that is no longer the latest is a `conflict` carrying the
 * current `ver` (api.md 30). */
function checkBase(s: LedgerState, i: number, item: Rec, e: Rec): void {
  if (e.type !== 'node' || typeof e.n !== 'number' || typeof item.base !== 'number') return;
  const node = s.nodes.get(e.n);
  if (!node) return; // an unknown node is the ledger's to report
  const ver = latest(node).ver;
  if (ver === item.base) return;
  fail('conflict', `Node ${e.n} is at version ${ver}, not ${item.base}: it changed since you read it. Read it again with show_node, then send your change with base ${ver}.`,
    { ver, errors: [{ pointer: `/items/${i}/base`, detail: `node ${e.n} is at version ${ver}` }] });
}

/** Every node an item names must be on the board in the path (api.md 24). */
function checkBoard(b: Batch, s: LedgerState, i: number, e: Rec): void {
  for (const f of REFS) {
    const n = e[f];
    const node = typeof n === 'number' ? s.nodes.get(n) : undefined;
    if (!node || node.board === b.board) continue;
    fail('invalid', `This call writes board "${b.board}", and node ${String(n)} is on board "${node.board}". Send the item to that board's write_board.`,
      { errors: [{ pointer: `/items/${i}/${f}`, detail: `node ${String(n)} is on board "${node.board}", not "${b.board}"` }] });
  }
}

/** No grant, no write (api.md 25). */
function checkGrant(b: Batch, s: LedgerState, e: Rec): void {
  const need = canWrite(s, b.agent, e as unknown as WriteItem);
  if (need === 'ok') return;
  fail('needs-grant', `You do not hold the container "${need.region}" on board "${need.board}". Call request_grant once, wait for the person's answer in check_responses, then resend the same items with the same keys.`,
    { board: need.board, region: need.region });
}

/** Append through the ledger module; its problems point into this item. A `/board` pointer
 * names the path's board, which the item does not carry, so it points at the item. */
function append(b: Batch, i: number, key: string | undefined, e: Rec): WriteResult {
  try {
    return written(i, key, b.ledger.append(e, { by: 'agent', agent: b.agent }, { board: b.board }));
  } catch (err) {
    if (!(err instanceof ProblemError)) throw err;
    const { status: _status, errors, ...rest } = err.body;
    const fixed = (errors ?? []).map((x) => (x.pointer === '/board' ? { ...x, pointer: '' } : x));
    throw new ItemFailed({ ...rest, ...(fixed.length > 0 && { errors: under(i, fixed) }) });
  }
}

function writeOne(b: Batch, i: number, raw: unknown, key: string | undefined): WriteResult {
  const errors = schemaProblems(WRITE_ITEM_ID, raw);
  if (errors.length) {
    fail('invalid', 'This item does not fit the write-item schema. Fix the fields listed in errors and send it again.', { errors: under(i, errors) });
  }
  const item = raw as Rec;
  const e = eventOf(b, resolve(b, i, item));
  const replayed = key === undefined ? undefined : replay(b, i, key, e);
  if (replayed) return replayed;
  const s = b.ledger.state();
  checkBase(s, i, item, e);
  checkBoard(b, s, i, e);
  checkGrant(b, s, e);
  return append(b, i, key, e);
}

/** Write `items` for `agent` on `board`, in order, one result each (api.md 34). */
export function writeItems(ledger: Ledger, agent: string, board: string, items: readonly unknown[]): WriteResult[] {
  const b: Batch = { ledger, agent, board, failed: new Set() };
  return items.map((raw, i) => {
    const key = keyOf(raw);
    try {
      return writeOne(b, i, raw, key);
    } catch (err) {
      if (!(err instanceof ItemFailed)) throw err;
      if (isRec(raw) && typeof raw.key === 'string') b.failed.add(raw.key);
      return { index: i, ...(key !== undefined && { key }), ok: false, problem: err.problem };
    }
  });
}
