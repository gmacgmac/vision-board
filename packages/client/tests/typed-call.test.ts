// `call` is typed by its operation (cortex-architecture rule 4): its input and its answer are the
// types generated from the schemas (api-types.generated.ts), so a caller that disagrees with a schema
// fails `npm run check`. The checks are the types below; tsc runs them, and a `@ts-expect-error`
// that no longer errors fails too. The test itself only proves the file loads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActionId, OperationInput, OperationOutput } from '#format';
import { createClient } from '../src/index.ts';

/** True only when A and B are the same type. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const client = createClient({ transport: async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) });

/** Never run: tsc checks it. */
async function typed(): Promise<unknown[]> {
  const boards = await client.call('list_boards');
  const head: number = boards.head;
  const folder = await client.call('get_project');
  const found: boolean = folder.found;
  const session = await client.call('start_chat', { board: 'roadmap', body: { agent: 'claude' } });
  const agent: 'claude' | 'kiro' = session.agent;
  // @ts-expect-error: get_board needs its `board`
  await client.call('get_board', {});
  // @ts-expect-error: list_boards' answer has no `nope`
  void boards.nope;
  // @ts-expect-error: an act's action is one of the registry's
  await client.call('act', { board: 'roadmap', body: { type: 'act', action: 'shout' } });
  // @ts-expect-error: `after` is a number
  await client.call('read_ledger', { after: 'yesterday' });
  // @ts-expect-error: start_chat's agent is claude or kiro
  await client.call('start_chat', { board: 'roadmap', body: { agent: 'someone' } });
  return [head, found, agent];
}

// The action registry's ids and the schema's act actions are one list.
const sameActions: Same<ActionId, OperationInput<'act'>['body']['action']> = true;
// The page reads a folder's entries as the server's listing gives them.
const sameEntry: Same<OperationOutput<'list_folders'>['folders'][number], { name: string; path: string; hasBoard: boolean }> = true;

test('call is typed by its operation (checked by tsc)', () => {
  assert.equal(typeof typed, 'function');
  assert.deepEqual([sameActions, sameEntry], [true, true]);
});
