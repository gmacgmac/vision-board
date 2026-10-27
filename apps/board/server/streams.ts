// The standalone server's change streams (api.md 44, 78-80): server-sent events built on the
// engine's `watch`. A host like nclite sends the same changes through its own events instead.
import type { Ctx, Handler, HandlerTable } from './dispatch.ts';
import { requireBoard } from './visibility.ts';

type Send = (event: string, data: object) => void;

/** End a stream when its folder closes. */
export function endWhenClosed(res: Ctx['res'], closed: AbortSignal): void {
  const end = () => res.end();
  closed.addEventListener('abort', end, { once: true });
  res.on('close', () => closed.removeEventListener('abort', end));
}

/** A server-sent event stream: `retry` first, `change { seq }` on every ledger change (`watch`), a
 * comment every 20 s. `more` adds other events and returns their off switches. It ends when the
 * folder closes (a switch, api.md 111), so the page reconnects to the new folder. */
function stream({ res, engine, closed }: Ctx, more: (send: Send) => (() => void)[] = () => []): void {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  const send: Send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const offs = [engine.watch(({ head }) => send('change', { seq: head })), ...more(send)];
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  endWhenClosed(res, closed);
  res.on('close', () => { for (const off of offs) off(); clearInterval(beat); });
}

/** One board's stream; refused with `not-found` for an unknown board. */
const watchBoard: Handler = (ctx) => {
  requireBoard(ctx.ledger.state(), ctx.params.board);
  stream(ctx);
};

/** The whole project's stream, which answers on an empty project too. In watch mode it also sends
 * `build { build }` on connect and whenever the page is rebuilt (api.md 78-80). */
const watchProject: Handler = (ctx) => stream(ctx, (send) => {
  const { build } = ctx;
  if (!build) return [];
  send('build', { build: build.id() });
  return [build.onChange((id) => send('build', { build: id }))];
});

export const STREAMS: Pick<HandlerTable, 'watch_board' | 'watch_project'> = { watch_board: watchBoard, watch_project: watchProject };
