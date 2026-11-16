// The project's icon library (D-100 3, api.md 185-186; ledger review § 4 O4): one drawing per name in a folder the
// engine is given (`EngineOptions.icons`: the project's `.visionboard/icons/` standalone, `dir/icons` under a host),
// shared by every ledger of the project; each ledger's `icon` lines say which drawing a name means (the file's
// sha-256). An agent's SVG is hostile until cleaned: `reduceSvg` keeps path data and nothing else, refusing what paths
// can't say; the file is written in the one fixed form (`iconFileText`) and only where no file has that name. Every
// read checks the file again (`iconFileProblem`, shared with the page), because a file can arrive by hand, by git or by
// a sync: a file that fails, or whose hash is not the ledger's latest for its name, is a problem and its paths are
// never served. No XML parser: a tag is matched as a whole or refused.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IconDrawing, LedgerEvent } from '#format';
import { ICON_BOX, ICON_LIMITS, iconFileProblem, iconFileText, iconPathProblem, iconPathsOf, iconTitleProblem, isLibraryIcon } from '#format';
import type { Ledger } from './ledger.ts';
import { problem } from './problem.ts';
import * as iconsWords from './words/icons.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The presentation attributes an svg or a path may carry, all dropped: the board draws every icon in its own stroke
 * and colour. */
const PRESENTATION = ['fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit'];
const SVG_ATTRS = new Set(['xmlns', 'viewBox', 'width', 'height', ...PRESENTATION]);
const PATH_ATTRS = new Set(['d', ...PRESENTATION]);
/** The most bytes a library file is read to: the fixed form's most characters, three bytes each at worst. */
const MAX_BYTES = ICON_LIMITS.fileChars * 3;

/** One whole tag: `<name attr="v" ...>`, `</name>` or `<name .../>`. A value holding `<` is no tag. */
const TAG = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=<>/"']+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
const ATTR = /([^\s=<>/"']+)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/g;
/** An XML declaration at the very start, with only its own three attributes: dropped. */
const XML_DECL = /^<\?xml(?:\s+(?:version|encoding|standalone)\s*=\s*(?:"[^"<>?]*"|'[^'<>?]*'))*\s*\?>/;
/** The entities a title's text may hold; any other `&` is refused. */
const TITLE_AMP = /&(?!(?:amp|lt|gt|quot|apos);)[^\s<]{0,12}/;

const refuse = (detail: string): never => { throw problem('invalid', detail, { errors: [{ pointer: '/svg', detail }] }); };
const clipped = (s: string): string => JSON.stringify(s.length > 40 ? `${s.slice(0, 40)}…` : s);
const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** One tag's attributes by name; a name given twice is refused (two readers could take different ones). */
function attrsOf(text: string, on: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(ATTR)) {
    if (out.has(m[1]!)) refuse(iconsWords.svgTwice(clipped(m[1]!), on));
    out.set(m[1]!, m[2] ?? m[3] ?? '');
  }
  return out;
}

/** The svg element's attributes: only those it may carry, the namespace and the box checked; all dropped. */
function checkSvg(attrs: Map<string, string>): void {
  for (const name of attrs.keys()) if (!SVG_ATTRS.has(name)) refuse(iconsWords.svgAttribute(clipped(name), 'svg'));
  const ns = attrs.get('xmlns');
  if (ns !== undefined && ns !== SVG_NS) refuse(iconsWords.svgNamespace(clipped(ns)));
  const box = attrs.get('viewBox');
  if (box === undefined) return refuse(iconsWords.svgNoBox(ICON_BOX));
  if (box.trim().split(/[\s,]+/).map(Number).join(' ') !== `0 0 ${ICON_BOX} ${ICON_BOX}`) refuse(iconsWords.svgBox(clipped(box), ICON_BOX));
}

/** Path `n`'s `d`, its line breaks and runs of space folded to one space, held to the path grammar. */
function pathOf(attrs: Map<string, string>, n: number): string {
  for (const name of attrs.keys()) if (!PATH_ATTRS.has(name)) refuse(iconsWords.svgAttribute(clipped(name), 'path'));
  const raw = attrs.get('d');
  if (raw === undefined) return refuse(iconsWords.svgNoD);
  const d = raw.replace(/[\t\n\r\f ]+/g, ' ').trim();
  const why = iconPathProblem(d);
  return why === undefined ? d : refuse(iconsWords.svgPath(n, why));
}

/** One opening tag, in the elements open around it: the one root svg, then title and path straight inside it. Answers
 * whether the root has been seen. */
function element(name: string, attrs: Map<string, string>, open: readonly string[], root: boolean, paths: string[]): boolean {
  const parent = open.at(-1);
  if (name === 'svg') {
    if (parent !== undefined) refuse(iconsWords.svgPlace('svg', parent));
    if (root) refuse(iconsWords.svgRoot);
    checkSvg(attrs);
    return true;
  }
  if (name !== 'title' && name !== 'path') refuse(iconsWords.svgElement(clipped(name)));
  if (parent !== 'svg') refuse(parent === undefined ? iconsWords.svgRoot : iconsWords.svgPlace(name, parent));
  const first = attrs.keys().next();
  if (name === 'title' && !first.done) refuse(iconsWords.svgAttribute(clipped(first.value), 'title'));
  if (name === 'path') paths.push(pathOf(attrs, paths.length + 1));
  return root;
}

/** Text between tags: a title's is dropped (the request's title is the icon's) but may hold only the five plain
 * entities; anywhere else only white space. */
function textBetween(chunk: string, inside: string | undefined): void {
  if (inside === 'title') {
    const amp = TITLE_AMP.exec(chunk);
    if (amp) refuse(iconsWords.svgEntity(clipped(amp[0])));
  } else if (chunk.trim() !== '') refuse(iconsWords.svgText(clipped(chunk.trim())));
}

/** The paths of an agent's `svg`, or a refusal (`invalid` at `/svg`) saying what it holds that paths can't say. Only
 * svg, title and path elements: on svg the namespace, the box (`ICON_BOX`) and presentation attributes, all dropped;
 * on a path a `d` and presentation attributes, dropped. A byte-order mark, line ends and an XML declaration are dropped
 * too: the file the server writes is its own fixed form, never the agent's text. */
export function reduceSvg(svg: string): string[] {
  const text = svg.trim().replace(XML_DECL, '').trim();
  const paths: string[] = [];
  const open: string[] = [];
  let root = false;
  for (let at = 0; at < text.length;) {
    if (text[at] !== '<') {
      const next = text.indexOf('<', at);
      const chunk = text.slice(at, next < 0 ? text.length : next);
      textBetween(chunk, open.at(-1));
      at += chunk.length;
      continue;
    }
    if (text.startsWith('<!', at) || text.startsWith('<?', at)) refuse(iconsWords.svgMarkup(clipped(text.slice(at, at + 12))));
    TAG.lastIndex = at;
    const m = TAG.exec(text) ?? refuse(iconsWords.svgTag(clipped(text.slice(at, at + 40))));
    at += m[0].length;
    const [, close, name = '', rest = '', self] = m;
    if (close) {
      const top = open.pop();
      if (top !== name) refuse(top === undefined ? iconsWords.svgRoot : iconsWords.svgUnclosed(top));
      continue;
    }
    root = element(name, attrsOf(rest, name), open, root, paths);
    if (!self) open.push(name);
  }
  if (open.length) refuse(iconsWords.svgUnclosed(open.at(-1)!));
  if (!root) refuse(iconsWords.svgRoot);
  if (!paths.length) refuse(iconsWords.svgNoPath);
  if (paths.length > ICON_LIMITS.paths) refuse(iconsWords.svgTooManyPaths(paths.length, ICON_LIMITS.paths));
  return paths;
}

/** A library file read and checked: its drawing and the sha-256 of its bytes, or why it can't be used (`missing` when
 * there is no file at all). */
export type IconRead = { hash: string; drawing: IconDrawing } | { problem: string; missing?: true };

/** Icon `name`'s file in library `folder`, checked as it is now (`iconFileProblem`). Opened without following a link
 * and without waiting on a pipe; only a plain file of at most `MAX_BYTES` is read, as strict UTF-8 (a byte-order mark
 * kept, so the check refuses it). */
export function readIcon(folder: string, name: string): IconRead {
  const { O_RDONLY, O_NOFOLLOW = 0, O_NONBLOCK = 0 } = fs.constants;
  let fd: number;
  try { fd = fs.openSync(path.join(folder, `${name}.svg`), O_RDONLY | O_NOFOLLOW | O_NONBLOCK); } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return { problem: iconsWords.fileMissing, missing: true };
    return { problem: code === 'ELOOP' ? iconsWords.fileNotPlain : iconsWords.fileUnreadable };
  }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) return { problem: iconsWords.fileNotPlain };
    if (st.size > MAX_BYTES) return { problem: iconsWords.fileTooBig(st.size, MAX_BYTES) };
    const bytes = fs.readFileSync(fd);
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return { problem: iconsWords.fileNotUtf8 }; }
    const drawing = iconPathsOf(text);
    return drawing ? { hash: sha256(bytes), drawing } : { problem: iconsWords.fileRefused(iconFileProblem(text)!) };
  } finally { fs.closeSync(fd); }
}

/** A usable library icon: its name, title, checked paths and hash. */
export interface LibraryIcon { name: string; title: string; paths: string[]; hash: string }
/** The library as one ledger sees it: the icons it may draw, and what is wrong with the others. */
export interface Library { icons: LibraryIcon[]; problems: { name: string; detail: string }[] }

/** A title for a file that has none (one a person dropped in): its name's words. */
const titleOf = (name: string, drawing: IconDrawing): string => drawing.title ?? name.slice(2).replace(/-/g, ' ');

/** Every library name in `folder` (`<name>.svg`, a name `isLibraryIcon` passes; anything else there is not the
 * library's) and every name ledger index `held` (name -> hash) knows, each read and checked now. A file that fails,
 * a name the ledger holds with no file, and a file whose hash is not the ledger's latest for its name are problems,
 * and their paths are never served. A file this ledger has no line for yet is listed: its first use writes the line. */
export function readLibrary(folder: string, held: ReadonlyMap<string, string>): Library {
  let files: string[] = [];
  try { files = fs.readdirSync(folder); } catch { /* no folder yet: an empty library */ }
  const names = new Set(held.keys());
  for (const f of files) if (f.endsWith('.svg') && isLibraryIcon(f.slice(0, -4))) names.add(f.slice(0, -4));
  const out: Library = { icons: [], problems: [] };
  for (const name of [...names].sort()) {
    const r = readIcon(folder, name);
    const trusted = held.get(name);
    if ('problem' in r) out.problems.push({ name, detail: r.problem });
    else if (trusted !== undefined && trusted !== r.hash) out.problems.push({ name, detail: iconsWords.fileChanged });
    else out.icons.push({ name, title: titleOf(name, r.drawing), paths: r.drawing.paths, hash: r.hash });
  }
  return out;
}

/** Write `text` to `file` only if no file has that name, never replacing one: a temp file beside it is linked into
 * place (which fails if the name exists) and then removed, so a reader sees no file or the whole one. Answers false
 * when the name was taken. */
function writeNew(file: string, text: string): boolean {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, text, { flag: 'wx' });
  try {
    fs.linkSync(tmp, file);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw err;
  } finally { fs.rmSync(tmp, { force: true }); }
}

/** What `add_icon` takes, its body already checked by the operation's schema. */
export interface AddIconBody { name: string; title: string; svg: string; key?: string | undefined }
/** What `add_icon` answers: the name and the hash its `icon` line holds; `replayed` when nothing new was written. */
export interface AddIconAnswer { status: 200 | 201; body: { name: string; hash: string; replayed?: true } }

const taken = (name: string): never => { throw problem('conflict', iconsWords.nameTaken(name), { errors: [{ pointer: '/name', detail: iconsWords.nameTaken(name) }] }); };

/** A retry of `key` (api.md 29): the first answer when its line is this icon with this drawing; else a conflict. */
function keyed(ledger: Ledger, agent: string, key: string, answer: { name: string; hash: string }): AddIconAnswer | undefined {
  const seq = ledger.state().keys.get(agent)?.get(key);
  if (seq === undefined) return undefined;
  const line = ledger.events().find((e) => e.seq === seq);
  if (line?.type === 'icon' && line.name === answer.name && line.hash === answer.hash) return { status: 200, body: { ...answer, replayed: true } };
  throw problem('conflict', iconsWords.keyUsedBefore(key), { errors: [{ pointer: '/key', detail: iconsWords.keyHolds }] });
}

/** Add an agent's drawing to library `folder` (api.md 186): the title checked, the svg reduced to paths, the file made
 * in the fixed form and checked again, and its hash taken. A name is given once: the same drawing again is a replay
 * (no second file or line), another drawing is refused with words that point at the one there. The file is written
 * first, only where no file has the name, then the ledger's `icon` line, which names no board. `agent` is asked only
 * once the drawing passes, so a refused one joins nobody (`OpCtx.writer`). */
export function addIcon(ledger: Ledger, folder: string, agent: () => string, { name, title, svg, key }: AddIconBody): AddIconAnswer {
  const bad = iconTitleProblem(title);
  if (bad !== undefined) throw problem('invalid', iconsWords.titleRefused(bad), { errors: [{ pointer: '/title', detail: bad }] });
  const text = iconFileText(reduceSvg(svg), title);
  const off = iconFileProblem(text);
  if (off !== undefined) refuse(iconsWords.notTheFixedForm(off));
  const answer = { name, hash: sha256(text) };
  const writer = agent();
  const replay = key === undefined ? undefined : keyed(ledger, writer, key, answer);
  if (replay) return replay;
  const held = ledger.state().index.icons.get(name);
  if (held !== undefined && held !== answer.hash) taken(name);
  ledger.checkWritable({ by: 'agent', agent: writer });
  const now = readIcon(folder, name);
  if (!('missing' in now) && !('hash' in now && now.hash === answer.hash)) taken(name);
  const wrote = 'missing' in now && writeNew(path.join(folder, `${name}.svg`), text);
  if ('missing' in now && !wrote) { const raced = readIcon(folder, name); if (!('hash' in raced) || raced.hash !== answer.hash) taken(name); }
  if (held === answer.hash) return wrote ? { status: 201, body: answer } : { status: 200, body: { ...answer, replayed: true } };
  ledger.append({ type: 'icon', name, hash: answer.hash, ...(key !== undefined && { key }) }, { by: 'agent', agent: writer });
  return { status: 201, body: answer };
}

/** The `icon` line a node's first use of `icon` needs (api.md 185): a library name this ledger has no line for, whose
 * file is there and passes the check, gives the line with the file's hash; one whose file is missing or fails gives
 * the reason. Undefined when no line is needed: a built-in, or a name the ledger holds. */
export function firstUse(ledger: Ledger, folder: string, icon: unknown): { name: string; hash: string } | { problem: string } | undefined {
  if (typeof icon !== 'string' || !isLibraryIcon(icon) || ledger.state().index.icons.has(icon)) return undefined;
  const r = readIcon(folder, icon);
  return 'problem' in r ? { problem: r.problem } : { name: icon, hash: r.hash };
}

/** The person accepts icon `name`'s drawing as its file is now (PLAN call 12): a person `icon` line with the hash the
 * server computes, never one a caller gives; refused while the file is missing or fails the check. The page's control
 * for it is a tracker row; this is its server half. */
export function acceptIcon(ledger: Ledger, folder: string, name: string): LedgerEvent {
  const r: IconRead = isLibraryIcon(name) ? readIcon(folder, name) : { problem: iconsWords.fileMissing };
  if ('problem' in r) throw problem('invalid', iconsWords.cannotAccept(name, r.problem));
  return ledger.append({ type: 'icon', name, hash: r.hash }, { by: 'person' });
}
