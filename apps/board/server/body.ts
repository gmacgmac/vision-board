// Request bodies (api.md 28, 37): the media type is parsed exactly, the size is capped before
// and while reading, and the text must be JSON. Each failure is one problem; nothing is written.
// `body` then holds it to the operation's request schema, as the engine does (`checkBody`).
import type { IncomingMessage } from 'node:http';
import type { OperationId } from '#format';
import { checkBody } from './engine/index.ts';
import { problem, sizeWords } from './problem.ts';
import * as httpWords from './words/http.ts';

export const KIB = 1024;
/** The default body limit; `join` and `write_board` set their own (api.md 28). */
export const BODY_LIMIT = 64 * KIB;

/** `application/json`, with an optional `charset=utf-8`, and nothing else (api.md 28). */
export function isJsonMediaType(header: string | undefined): boolean {
  if (header === undefined) return false;
  const [type, ...params] = header.split(';').map((s) => s.trim());
  if (type?.toLowerCase() !== 'application/json') return false;
  if (params.length === 0) return true;
  return params.length === 1 && /^charset\s*=\s*(?:utf-8|"utf-8")$/i.test(params[0]!);
}

const tooLarge = (limit: number) =>
  problem('too-large', httpWords.theBodyIsOverThe(sizeWords(limit)));

/** The body as parsed JSON. Refuses a wrong media type (415), a body over `limit` (413) and text
 * that is not JSON (400). */
export async function readJson(req: IncomingMessage, limit = BODY_LIMIT): Promise<unknown> {
  if (!isJsonMediaType(req.headers['content-type'])) {
    throw problem('unsupported-media-type', httpWords.sendTheBodyAsApplication);
  }
  // An over-limit body is read to its end (up to 16 times the limit) and dropped, so the caller
  // gets the 413 instead of a reset connection.
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 16 * limit) throw tooLarge(limit);
    if (size <= limit) chunks.push(chunk as Buffer);
  }
  if (size > limit) throw tooLarge(limit);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw problem('bad-request', httpWords.theBodyIsNotValid);
  }
}

/** The body, read with `readJson` and checked against the operation's request schema: the
 * standalone server's own operations (chat, folders, apps). */
export async function body(id: OperationId, req: IncomingMessage, limit = BODY_LIMIT): Promise<Record<string, unknown>> {
  return checkBody(id, await readJson(req, limit));
}
