// The stdio transport: newline-delimited JSON-RPC on stdin and stdout, nothing else on stdout.
// Requests run concurrently (a `check_responses` wait must not hold up the rest) and answer in
// any order, correlated by id. `notifications/cancelled` aborts that request and its answer is
// never sent. Closing stdin ends the server: in-flight calls are aborted and it resolves.
import { createInterface } from 'node:readline';
import type { McpServer } from './protocol.ts';
import type { Id, RpcResponse } from './rpc.ts';
import { isRecord } from '#format';
import { parseLine } from './rpc.ts';

export interface StdioStreams {
  readonly input: NodeJS.ReadableStream;
  readonly output: NodeJS.WritableStream;
}

/** Serve `server` over the streams until the input ends. */
export async function serveStdio(server: McpServer, streams: StdioStreams): Promise<void> {
  const inFlight = new Map<Id, AbortController>();
  const pending = new Set<Promise<void>>();
  const send = (response: RpcResponse) => { streams.output.write(`${JSON.stringify(response)}\n`); };

  const lines = createInterface({ input: streams.input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseLine(line);
    if (!parsed.ok) { send(parsed.response); continue; }
    const { message } = parsed;
    if (message.method === 'notifications/cancelled') {
      const id = isRecord(message.params) ? message.params.requestId : undefined;
      if (typeof id === 'string' || typeof id === 'number') inFlight.get(id)?.abort();
      continue;
    }
    const controller = new AbortController();
    if (message.id !== undefined) inFlight.set(message.id, controller);
    const work = server.handle(message, controller.signal).then((response) => {
      if (message.id !== undefined) inFlight.delete(message.id);
      if (response && !controller.signal.aborted) send(response);
    });
    pending.add(work);
    void work.finally(() => pending.delete(work));
  }
  for (const controller of inFlight.values()) controller.abort();
  await Promise.allSettled([...pending]);
}
