// The API test harness: a real board server on a free port, over a temporary project seeded from
// the roadmap fixture plus a v3 board written through the ledger module. Every call goes through
// packages/client, and every answer is held to openapi.json with `checkAnswer` (api.md 54).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { OperationId } from '../../../packages/format/src/index.ts';
import type { CallInput, CallOptions, Client } from '../../../packages/client/src/index.ts';
import { ApiProblem, createClient } from '../../../packages/client/src/index.ts';
import { createBoardServer } from '../server/app.ts';
import type { Caller, Ledger } from '../server/ledger.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import type { Answer } from './openapi-ajv.ts';
import { ROOT, checkAnswer } from './openapi-ajv.ts';

export const AGENT: Caller = { by: 'agent', agent: 'a-k3m9x2pq' };
export const PERSON: Caller = { by: 'person' };
const FIXTURE = path.join(ROOT, 'packages/format/fixtures/roadmap.ledger.jsonl');

/** What the seed wrote, by name, so tests can name `seq`s and node numbers. */
export interface Seeded { comment: number; reply: number; propose: number; later: number; request: number; q: number; d: number }

/** A second, v3 board on top of the roadmap fixture (36 lines): a joined agent, a region, two
 * items, a link, a proposal, a comment and its reply, a "later", a seen mark, a size pick, a
 * newer version the person has not seen, and an open grant request. */
function seedMore(ledger: Ledger): Seeded {
  const add = (e: Record<string, unknown>, by: Caller = AGENT) => ledger.append(e, by);
  add({ type: 'join', label: 'Pricing chat' });
  add({ type: 'board', board: 'pricing', title: 'Pricing options', key: 'pricing-board' });
  add({ type: 'region', board: 'pricing', region: { id: 'options', title: 'Options', mode: 'grid', columns: 2 } });
  const node = (title: string, kind: string, n?: number) =>
    add({ type: 'node', board: 'pricing', ...(n && { n }), node: { region: 'options', kind, title, item: true } });
  const q = node('Flat fee or per seat?', 'question') as { n: number };
  const d = node('Choose the launch price', 'decision') as { n: number };
  add({ type: 'link', from: q.n, to: d.n, label: 'blocks' });
  const propose = add({ type: 'propose', n: q.n, ver: 1, action: 'ack', reason: 'Settled in chat: per seat.' }).seq;
  const comment = add({ type: 'act', action: 'comment', n: q.n, ver: 1, text: 'Why per seat?' }, PERSON).seq;
  const reply = add({ type: 'reply', n: q.n, text: 'Teams grow; a flat fee stops fitting.', to: comment }).seq;
  const later = add({ type: 'act', action: 'later', n: d.n, ver: 1 }, PERSON).seq;
  add({ type: 'seen', n: q.n, ver: 1 }, PERSON);
  add({ type: 'act', action: 'size', n: q.n, size: 's' }, PERSON);
  node('Flat fee or per seat? (with the numbers)', 'question', q.n);
  add({ type: 'act', action: 'comment', n: 1, ver: 1, text: 'Rule 6 needs an example.' }, PERSON);
  const request = add({ type: 'grant-request', board: 'roadmap', region: 'review', reason: 'I need to update the review items.' }).seq;
  return { comment, reply, propose, later, request, q: q.n, d: d.n };
}

export interface Harness {
  base: string;
  client: Client;
  ledger: Ledger;
  seeded: Seeded;
  /** The last answer `client` received, parsed by media type. */
  last(): Answer;
  /** Call through the client, check the answer against the spec, return the value. */
  ok<T = any>(id: OperationId, input?: CallInput, opts?: CallOptions): Promise<T>;
  /** Call through the client, expect a problem with this status and code, check it against the spec. */
  fails(id: OperationId, input: CallInput, status: number, code: string): Promise<ApiProblem>;
  close(): Promise<void>;
}

const mediaOf = (h: Headers) => (h.get('content-type') ?? '').split(';')[0]!.trim();

async function parsed(res: Response, media: string): Promise<unknown> {
  if (media === 'text/event-stream') return undefined; // never ends; read by the test itself
  const text = await res.text();
  if (media === 'application/jsonl') return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return text ? JSON.parse(text) : undefined;
}

export async function startBoard(): Promise<Harness> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-api-'));
  const file = ledgerPath(dir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(FIXTURE, file);
  const ledger = openLedger(file, () => {});
  const seeded = seedMore(ledger);
  const server = createBoardServer({ ledger, dist: dir });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let last: Answer | undefined;
  const recording: typeof fetch = async (url, init) => {
    const res = await fetch(url, init);
    const media = mediaOf(res.headers);
    last = { status: res.status, headers: res.headers, media, body: await parsed(res.clone(), media) };
    return res;
  };
  const client = createClient({ base, fetch: recording });
  const h: Harness = {
    base, client, ledger, seeded,
    last: () => last ?? assert.fail('no answer yet'),
    async ok(id, input, opts) {
      const value = await client.call(id, input, opts);
      checkAnswer(id, h.last());
      return value as any;
    },
    async fails(id, input, status, code) {
      try { await client.call(id, input); } catch (err) {
        assert.ok(err instanceof ApiProblem, String(err));
        assert.deepEqual([err.status, err.code], [status, code], err.detail);
        checkAnswer(id, h.last());
        return err;
      }
      return assert.fail(`${id} answered ${h.last().status}, not ${status} ${code}`);
    },
    close: () => new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => { fs.rmSync(dir, { recursive: true, force: true }); resolve(); });
    }),
  };
  return h;
}
