// The image route, `GET /board-images/<path>` (D-048 rulings 19-21, docs/specification/images.md):
// the open project's images, and only those, for the `<img>` a card's Markdown draws. Outside /api,
// like an app's panel. The path is decoded once and held to `imagePathProblem`, the same check the
// Markdown renderer makes; then the file's real path must stay inside the real images folder (a
// link out is refused, as is anything that isn't a file); the file is opened once and everything
// after is read from that one open file: its size (over its type's cap: 413), its first bytes (they
// must be the type its name says, or for svg an svg that says its size: 415) and then the body.
// Every answer carries an ETag (size and time) and `no-cache`, so the page asks again cheaply and gets
// 304 until the file changes; the no-sniff header comes from app.ts for every response. An svg (the
// svgImages flag, D-064) also carries `SVG_CSP`, on its 304 too, so a cached copy keeps it: opened at
// its own address it is a sandboxed document that runs no script and loads nothing. Only this
// folder's images are read.
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream';
import type { FlagOverrides } from '#format';
import {
  IMAGE_HEAD_BYTES, IMAGE_LIMITS, IMAGE_WORDS, flagOn, imageCap, imageHeadProblem, imagePathProblem, imageTypeByName, ledgerFiles, ledgerFolder,
} from '#format';
import { isUnder } from './folders.ts';
import { ProblemError, problem } from './problem.ts';
import * as httpWords from './words/http.ts';

const missing = () => problem('not-found', IMAGE_WORDS.missing);

/** An svg's own policy, in place of the board's (app.ts): nothing loads and no script runs, its own
 * inline styles and data: pictures and fonts draw, nothing may frame it, and `sandbox` gives it an
 * opaque origin, so opened on its own it can't reach the board's page, cookies, storage or /api.
 * Every directive is the board's or stricter, but for inline style, which is the file's own and
 * reaches nothing (D-064). In an <img> the browser runs no script and loads nothing anyway. */
export const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-ancestors 'none'; base-uri 'none'; sandbox";

/** The words for a type that is not allowed, with the svgImages flag on and off. */
const TYPE_WORDS: ReadonlySet<string> = new Set([IMAGE_WORDS.type, IMAGE_WORDS.typeNoSvg]);

/** The path as the request wrote it, decoded once; a bad `%` code is refused like any odd character. */
function decoded(raw: string): string {
  try { return decodeURIComponent(raw); } catch { throw problem('not-found', IMAGE_WORDS.chars); }
}

/** The real path of image `rel` in the images folder, which must hold it: a missing
 * folder or file is 404, and so is a link that leads out of the folder. */
function locate(images: string, rel: string): string {
  let root: string;
  let file: string;
  try {
    root = fs.realpathSync(images);
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

/** The image, open and checked: what either way of answering needs. Throws the problem when it may not be shown. */
interface OpenImage { fd: number; size: number; etag: string; contentType: string; headers: Record<string, string> }

function onlyRead(method: string | undefined): void {
  if (method !== 'GET' && method !== 'HEAD') throw problem('method-not-allowed', httpWords.getAndHeadOnly, { headers: { Allow: 'GET, HEAD' } });
}

/** Open image `raw` (the route's text after the prefix) in the images folder `images`, under `flags` (svgImages). */
function openImage(raw: string, images: string, flags: FlagOverrides): OpenImage {
  const rel = decoded(raw);
  const why = imagePathProblem(rel, { svg: flagOn('svgImages', flags) });
  if (why) throw problem(TYPE_WORDS.has(why) ? 'unsupported-media-type' : 'not-found', why);
  const type = imageTypeByName(rel)!; // the check above passed, so the extension names a type
  const file = locate(images, rel);
  // Opened without following a link at the last step, so the file read is the file checked.
  let fd: number;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { throw missing(); }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw missing();
    const cap = imageCap(type);
    if (stat.size > cap.bytes) throw problem('too-large', cap.words);
    const head = Buffer.alloc(IMAGE_HEAD_BYTES);
    const read = fs.readSync(fd, head, 0, head.length, 0);
    const notShown = imageHeadProblem(type, head.subarray(0, read));
    if (notShown) throw problem('unsupported-media-type', notShown);
    const etag = etagOf(stat);
    const headers = { ETag: etag, 'Cache-Control': 'no-cache', ...(type === 'svg' && { 'Content-Security-Policy': SVG_CSP }) };
    return { fd, size: stat.size, etag, contentType: IMAGE_LIMITS.types[type].contentType, headers };
  } catch (err) {
    fs.closeSync(fd);
    throw err;
  }
}

/** Answer a request for image `raw` in folder `project` (its real path), under the server's `flags`: from
 * the folder of its ledger `ledger` (none: the old layout's). */
export function serveImage(req: IncomingMessage, res: ServerResponse, raw: string, project: string, flags: FlagOverrides = {}, ledger?: string): void {
  onlyRead(req.method);
  const { fd, size, etag, contentType, headers } = openImage(raw, ledgerFiles(ledgerFolder(project, ledger)).images, flags);
  let streaming = false;
  try {
    if (matches(req.headers['if-none-match'], etag)) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Type': contentType, 'Content-Length': size });
    if (req.method === 'HEAD') { res.end(); return; }
    streaming = true;
    pipeline(fs.createReadStream('', { fd, start: 0, end: size - 1 }), res, () => {});
  } finally {
    if (!streaming) fs.closeSync(fd);
  }
}

/** The same answer for a host with no socket of the board's (the engine's `image`), its bytes whole: at
 * most the image's cap. A host's own server has no header of ours, so the no-sniff header comes with it. */
/** Why the image route would not show picture `path` (as a card's Markdown names it) from the images folder `images`, in
 * `IMAGE_WORDS`' words, or undefined when it would: the same checks a request for it meets (`openImage`). */
export function imageProblem(path: string, images: string, flags: FlagOverrides = {}): string | undefined {
  try {
    fs.closeSync(openImage(path, images, flags).fd);
    return undefined;
  } catch (err) {
    if (!(err instanceof ProblemError)) throw err;
    return err.message;
  }
}

export function imageReply(req: { method: string; ifNoneMatch?: string | undefined }, raw: string, images: string, flags: FlagOverrides = {}): { status: number; body: Buffer | null; headers: Record<string, string> } {
  onlyRead(req.method);
  const { fd, size, etag, contentType, headers } = openImage(raw, images, flags);
  try {
    const sent = { ...headers, 'X-Content-Type-Options': 'nosniff' };
    if (matches(req.ifNoneMatch, etag)) return { status: 304, body: null, headers: sent };
    const all = { ...sent, 'Content-Type': contentType, 'Content-Length': String(size) };
    if (req.method === 'HEAD') return { status: 200, body: null, headers: all };
    const body = Buffer.alloc(size);
    fs.readSync(fd, body, 0, size, 0);
    return { status: 200, body, headers: all };
  } finally {
    fs.closeSync(fd);
  }
}
