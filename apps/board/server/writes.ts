// The write operations. The person's `act` and `mark_seen` append one line each, after the body
// fits the operation's request schema (pointers into the body, api.md 38) and the ledger module's
// own checks. `join`, `request_grant` and `write_board`, with the person cookie and Bearer
// secrets, arrive in 2_BE_05; until then they answer `not-found`.
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import type { OperationId } from '../../../packages/format/src/index.ts';
import { BODY_LIMIT, readJson } from './body.ts';
import type { Handler } from './dispatch.ts';
import { problem } from './problem.ts';
import { requireBoard } from './reads.ts';
import { sendJson } from './respond.ts';
import { bodyProblems } from './spec.ts';

/** The body, checked against the operation's request schema. */
async function body(id: OperationId, req: Parameters<Handler>[0]['req'], limit = BODY_LIMIT): Promise<Record<string, unknown>> {
  const value = await readJson(req, limit);
  const errors = bodyProblems(id, value);
  if (errors.length) {
    throw problem('invalid', 'The request does not fit the schema. Fix the fields listed in errors and send it again.', { errors });
  }
  return value as Record<string, unknown>;
}

/** One person action from the action registry, on the board in the path (rule 8). */
const act: Handler = async ({ req, res, params, ledger }) => {
  const board = requireBoard(ledger.state(), params.board);
  const e = await body('act', req);
  sendJson(res, 201, ledger.append(e, { by: 'person' }, { board }));
};

/** The node must be on the board in the path. */
function onBoard(s: LedgerState, board: string, n: unknown): void {
  const node = s.nodes.get(Number(n));
  if (node && node.board !== board) {
    throw problem('invalid', 'The node is on another board.', {
      errors: [{ pointer: '/n', detail: `node ${String(n)} is on board "${node.board}", not "${board}"` }],
    });
  }
}

/** The person has seen version `ver` of node `n` (D-018). */
const markSeen: Handler = async ({ req, res, params, ledger }) => {
  const board = requireBoard(ledger.state(), params.board);
  const e = await body('mark_seen', req);
  onBoard(ledger.state(), board, e.n);
  sendJson(res, 201, ledger.append({ ...e, type: 'seen' }, { by: 'person' }));
};

const notYet = (name: string): Handler => () => {
  throw problem('not-found', `${name} is not available on this server yet. Read with the read operations for now.`);
};

export const WRITES = {
  act, mark_seen: markSeen,
  join: notYet('join'), request_grant: notYet('request_grant'), write_board: notYet('write_board'),
} satisfies Record<string, Handler>;
