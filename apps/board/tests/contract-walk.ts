// The contract walk, shared by the API tests that must hold for every agent operation (N39 ruling 8:
// an archived board answers as an unknown one; N40 ruling 7: a locked board refuses every write).
// The operations come from openapi.json (`x-agent: true`), never from a hand-written list, each with
// its input for one board: its path parameters from `PATH` and its body from `BODY`. A new agent
// operation without a value here fails the walk at once, so it is covered or the test fails. An
// operation `writes` when its method is anything but GET, as HTTP says.
import assert from 'node:assert/strict';
import type { OperationId } from '../../../packages/format/src/index.ts';
import type { CallInput, Client } from '../../../packages/client/src/index.ts';
import { ApiProblem } from '../../../packages/client/src/index.ts';
import type { Harness } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { checkAnswer, deref, ops } from './openapi-ajv.ts';

/** The container every walked board draws its cards in. */
export const WALK_REGION = 'ideas';

/** One agent operation with its input for the walked board. */
export interface AgentOp {
  id: OperationId;
  method: string;
  input: CallInput;
  /** It names the board, in its path or its body. */
  namesBoard: boolean;
  /** Only an agent's secret may call it. */
  agentOnly: boolean;
  /** Any method but GET: it may write. */
  writes: boolean;
}

/** A value for each path parameter an agent operation takes. */
const pathValues = (board: string): Record<string, unknown> => ({ board, n: 1, region: WALK_REGION });

/** A body for each agent operation that takes one. */
const bodies = (board: string): Partial<Record<OperationId, unknown>> => ({
  write_board: { items: [{ type: 'node', node: { region: WALK_REGION, kind: 'question', title: 'Which idea first?' }, key: 'walk-1' }] },
  request_grant: { board, reason: 'Drawing the ideas.' },
  join: { label: 'Walk chat' },
});

/** Every agent operation, in openapi.json's order, with its input for `board`. */
export function agentOps(board: string): AgentOp[] {
  const PATH = pathValues(board);
  const BODY = bodies(board);
  return ops.filter((o) => o.op['x-agent'] === true).map(({ id, method, op }) => {
    const input: CallInput = {};
    for (const p of (op.parameters ?? []).map(deref)) {
      if (p.in !== 'path') continue;
      assert.ok(p.name in PATH, `${id}: give its path parameter "${p.name}" a value in contract-walk.ts`);
      input[p.name] = PATH[p.name];
    }
    if (op.requestBody) {
      assert.ok(id in BODY, `${id}: give it a body in contract-walk.ts`);
      input.body = BODY[id as OperationId];
    }
    const namesBoard = 'board' in input || (input.body as Rec | undefined)?.board !== undefined;
    const security: Rec[] = op.security ?? [];
    const agentOnly = security.length > 0 && security.every((s) => Object.keys(s).includes('agentSecret'));
    return { id: id as OperationId, method, input, namesBoard, agentOnly, writes: method !== 'GET' };
  });
}

/** What one call answers: its status and body (a problem whole), held to the spec. */
export async function answer(h: Harness, id: OperationId, input: CallInput, as: Client): Promise<{ status: number; body: unknown }> {
  try { await as.call(id, input); } catch (err) { if (!(err instanceof ApiProblem)) throw err; }
  const a = h.last();
  checkAnswer(id, a);
  return { status: a.status, body: a.body };
}
