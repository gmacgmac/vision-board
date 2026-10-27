// The image route, `GET /board-images/<path>` (D-048 rulings 19-21, docs/specification/images.md):
// the open project's images, and only those, for the `<img>` a card's Markdown draws. Outside /api,
// like an app's panel. The path is decoded once and held to `imagePathProblem`, the same check the
// Markdown renderer makes; then the file's real path must stay inside the real images folder (a
// link out is refused, as is anything that isn't a file); the file is opened once and everything
// after is read from that one open file: its size (over the limit: 413), its first bytes (they
// must be the type its name says: 415) and then the body. Every answer carries an ETag (size and
// time) and `no-cache`, so the page asks again cheaply and gets 304 until the file changes; the
// no-sniff header comes from app.ts for every response. Only this folder's images are read.
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream';
import {
  IMAGES_DIR, IMAGE_HEAD_BYTES, IMAGE_LIMITS, IMAGE_WORDS, imageNotReal, imagePathProblem, imageTypeByName, imageTypeOf,
} from '#format';
import { isUnder } from './folders.ts';
import { DATA_DIR } from './ledger.ts';
import { problem } from './problem.ts';

const missing = () => problem('not-found', IMAGE_WORDS.missing);

/** The path as the request wrote it, decoded once; a bad `%` code is refused like any odd character. */
function decoded(raw: string): string {
  try { return decodeURIComponent(raw); } catch { throw problem('not-found', IMAGE_WORDS.chars); }
}

/** The real path of image `rel` in the project's images folder, which must hold it: a missing
 * folder or file is 404, and so is a link that leads out of the folder. */
function locate(project: string, rel: string): string {
  let root: string;
  let file: string;
  try {
    root = fs.realpathSync(path.join(project, DATA_DIR, IMAGES_DIR));
    file = fs.realpathSync(path.join(root, rel));
  } catch { throw missing(); }
  if (!isUnder(root, file)) throw problem('not-found', IMAGE_WORDS.outside);
  return file;
}

/** The quoted tag for this size and time. */
const etagOf = (stat: fs.Stats): string => `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs * 1000).toString(16)}"`;

/** `If-None-Match` names this tag (a list; weak tags compare as strong; `*` is any). */
const matches = (header: string | undefined, etag: string): boolean =>
  header !== undefined && header.split(',').some((t) => { const v = t.trim().replace(/^W\//, ''); return v === '*' || v === etag; });

/** Answer a request for image `raw` (the route's text after the prefix) in folder `project` (its real path). */
export function serveImage(req: IncomingMessage, res: ServerResponse, raw: string, project: string): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw problem('method-not-allowed', 'GET and HEAD only.', { headers: { Allow: 'GET, HEAD' } });
  const rel = decoded(raw);
  const why = imagePathProblem(rel);
  if (why) throw problem(why === IMAGE_WORDS.type ? 'unsupported-media-type' : 'not-found', why);
  const type = imageTypeByName(rel)!; // the check above passed, so the extension names a type
  const file = locate(project, rel);
  // Opened without following a link at the last step, so the file read is the file checked.
  let fd: number;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { throw missing(); }
  let streaming = false;
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw missing();
    if (stat.size > IMAGE_LIMITS.maxBytes) throw problem('too-large', IMAGE_WORDS.tooBig);
    const head = Buffer.alloc(IMAGE_HEAD_BYTES);
    const read = fs.readSync(fd, head, 0, head.length, 0);
    if (imageTypeOf(head.subarray(0, read)) !== type) throw problem('unsupported-media-type', imageNotReal(type));
    const etag = etagOf(stat);
    const headers = { ETag: etag, 'Cache-Control': 'no-cache' };
    if (matches(req.headers['if-none-match'], etag)) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Type': IMAGE_LIMITS.types[type].contentType, 'Content-Length': stat.size });
    if (req.method === 'HEAD') { res.end(); return; }
    streaming = true;
    pipeline(fs.createReadStream('', { fd, start: 0, end: stat.size - 1 }), res, () => {});
  } finally {
    if (!streaming) fs.closeSync(fd);
  }
}
