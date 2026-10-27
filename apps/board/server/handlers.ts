// The handler table (api.md 53): one handler per operationId of the route table. The type makes
// a missing or extra entry a type error, and api-errors.test.ts checks the keys at run time. The
// engine's operations go to the open folder's engine (`route`), with the body read here under the
// operation's limit and a signal that ends a held read when the caller goes away or the folder
// closes; the rest are the standalone server's own (streams, chats, folders, apps).
import { ROUTE_PREFIX } from '#format';
import type { OperationId } from '#format';
import { APP_HANDLERS } from './apps.ts';
import { readJson } from './body.ts';
import { CHAT } from './chat.ts';
import type { Handler, HandlerTable } from './dispatch.ts';
import type { EngineOperation, EngineReply } from './engine/index.ts';
import { ENGINE_OPERATIONS } from './engine/index.ts';
import { OPEN_FOLDER } from './open-folder.ts';
import { problem } from './problem.ts';
import { sendJsonLines, sendReply, wantsJsonLines } from './respond.ts';
import { STREAMS } from './streams.ts';

/** One of the engine's operations, answered by the open folder's engine. `read_ledger` goes out as
 * JSON Lines when the caller asks for them (api.md 44). */
const viaEngine = (id: OperationId): Handler => async ({ req, res, url, engine, caller, closed }) => {
  const gone = new AbortController();
  const end = () => gone.abort();
  res.on('close', end);
  closed.addEventListener('abort', end, { once: true });
  let reply: EngineReply | null;
  try {
    reply = await engine.route({
      method: req.method ?? 'GET', path: url.pathname.slice(ROUTE_PREFIX.length), query: url.searchParams,
      body: (limit?: number) => readJson(req, limit), caller, signal: gone.signal,
    });
  } finally {
    res.off('close', end);
    closed.removeEventListener('abort', end);
  }
  if (!reply) throw problem('not-found', 'No operation has this path.');
  if (res.destroyed || res.writableEnded) return;
  if (id === 'read_ledger' && reply.status === 200 && wantsJsonLines(req)) return sendJsonLines(res, (reply.body as { events: unknown[] }).events);
  sendReply(res, reply);
};

const ENGINE = Object.fromEntries(ENGINE_OPERATIONS.map((id) => [id, viaEngine(id)])) as Record<EngineOperation, Handler>;

export const HANDLERS: HandlerTable = { ...ENGINE, ...STREAMS, ...CHAT, ...OPEN_FOLDER, ...APP_HANDLERS };
