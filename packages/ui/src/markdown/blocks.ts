// Markdown, block layer (D-023): lines into paragraphs, lists, `#` headings, `>` quotes and fenced
// code, following CommonMark's two-phase block algorithm (match the open containers, start new
// blocks, add the rest of the line). With `more` (the markdownMore flag) also thematic breaks and
// GFM tables (table.ts); setext headings are never recognised, so `---` under a paragraph line is a
// break. Everything else (HTML blocks, reference definitions, indented code; without `more`, tables
// and breaks) is not recognised, so it stays paragraph text. No DOM: render.ts turns the tree into
// HTML and inline.ts renders each block's text.
import { atx, thematicBreak } from './line-starts.ts';
import type { Align } from './table.ts';
import { delimiterRow, headerFits } from './table.ts';

export type BlockType = 'doc' | 'quote' | 'list' | 'item' | 'para' | 'code' | 'head' | 'hr' | 'table';

export interface Block {
  t: BlockType;
  kids: Block[];
  parent: Block | null;
  open: boolean;
  /** First and last source line, for CommonMark's tight/loose rule. */
  start: number;
  end: number;
  /** Nesting depth of containers, capped so a hostile input cannot nest without end. */
  depth: number;
  /** Paragraph and heading lines; code lines with their line endings; table rows, the header first. */
  lines: string[];
  /** list: numbered, the bullet or delimiter character, the first number, tight. */
  ordered?: boolean;
  bullet?: string;
  startNum?: number;
  tight?: boolean;
  /** item: the marker as written ('-', '3.') and the column its content starts at. */
  marker?: string;
  width?: number;
  /** code: the opening fence and its indentation. */
  fence?: string;
  fenceIndent?: number;
  /** head: 1 to 6. */
  level?: number;
  /** table: each column's alignment, from the delimiter row. */
  aligns?: Align[];
}

interface Parser {
  doc: Block; tip: Block; oldtip: Block; lastMatched: Block; allClosed: boolean; more: boolean;
  line: string; lineNo: number; offset: number;
  /** Next non-space index, its indent from `offset`, and whether the rest of the line is blank. */
  nn: number; indent: number; blank: boolean;
}

const MAX_DEPTH = 16;
const CONTAINERS: BlockType[] = ['doc', 'quote', 'item'];

const canContain = (parent: BlockType, child: BlockType): boolean =>
  parent === 'list' ? child === 'item' : CONTAINERS.includes(parent) && child !== 'item';

function block(t: BlockType, parent: Block | null, start: number): Block {
  return { t, kids: [], parent, open: true, start, end: start, depth: parent ? parent.depth + 1 : 0, lines: [] };
}

/** Tabs to spaces at four-column stops, so a column is an index. */
function expandTabs(line: string): string {
  if (!line.includes('\t')) return line;
  let out = '';
  for (const c of line) out += c === '\t' ? ' '.repeat(4 - (out.length % 4)) : c;
  return out;
}

function isBlank(s: string, from: number): boolean {
  for (let i = from; i < s.length; i += 1) if (s[i] !== ' ') return false;
  return true;
}

function scan(p: Parser): void {
  let i = p.offset;
  while (p.line[i] === ' ') i += 1;
  p.nn = i;
  p.indent = i - p.offset;
  p.blank = i >= p.line.length;
}

/** Closes a block. An item ends with its last child, a list with its last item (CommonMark). */
function finalize(p: Parser, b: Block, line: number): void {
  b.open = false;
  b.end = line;
  if (b.t === 'item') b.end = b.kids.at(-1)?.end ?? b.start;
  if (b.t === 'list') {
    b.end = b.kids.at(-1)!.end;
    const gap = (a: Block, c: Block | undefined) => c !== undefined && c.start > a.end + 1;
    b.tight = b.kids.every((item, i) => !gap(item, b.kids[i + 1]) && item.kids.every((k, j) => !gap(k, item.kids[j + 1])));
  }
  p.tip = b.parent ?? p.doc;
}

/** Adds a child to the tip, closing blocks that cannot hold it. */
function add(p: Parser, t: BlockType): Block {
  while (!canContain(p.tip.t, t)) finalize(p, p.tip, p.lineNo - 1);
  const b = block(t, p.tip, p.lineNo);
  p.tip.kids.push(b);
  p.tip = b;
  return b;
}

function closeUnmatched(p: Parser): void {
  if (p.allClosed) return;
  while (p.oldtip !== p.lastMatched) {
    const up = p.oldtip.parent!;
    finalize(p, p.oldtip, p.lineNo - 1);
    p.oldtip = up;
  }
  p.allClosed = true;
}

/** Whether an open block continues on this line: 0 yes, 1 no, 2 the line closed it (a fence). */
function matches(p: Parser, b: Block): 0 | 1 | 2 {
  const s = p.line;
  switch (b.t) {
    case 'quote':
      if (p.indent > 3 || s[p.nn] !== '>') return 1;
      p.offset = p.nn + (s[p.nn + 1] === ' ' ? 2 : 1);
      return 0;
    case 'item':
      if (p.blank) { if (!b.kids.length) return 1; p.offset = p.nn; return 0; }
      if (p.indent < b.width!) return 1;
      p.offset += b.width!;
      return 0;
    case 'list': return 0;
    case 'para': case 'table': return p.blank ? 1 : 0;
    case 'code': return fenceLine(p, b);
    default: return 1;
  }
}

/** Inside a fence: a closing fence ends it; otherwise drop up to the fence's own indentation. */
function fenceLine(p: Parser, b: Block): 0 | 2 {
  const s = p.line, f = b.fence!;
  if (p.indent <= 3 && s[p.nn] === f[0]) {
    let n = 0;
    while (s[p.nn + n] === f[0]) n += 1;
    if (n >= f.length && isBlank(s, p.nn + n)) { finalize(p, b, p.lineNo); return 2; }
  }
  for (let k = b.fenceIndent!; k > 0 && s[p.offset] === ' '; k -= 1) p.offset += 1;
  return 0;
}

/** GFM: a delimiter row under an open paragraph whose last line has as many cells opens a table; the
 * paragraph's earlier lines stay a paragraph. */
function tableStart(p: Parser, para: Block): boolean {
  const aligns = delimiterRow(p.line.slice(p.nn));
  const header = para.lines.at(-1)!;
  if (!aligns || !headerFits(header, aligns)) return false;
  closeUnmatched(p);
  para.lines.pop();
  if (para.lines.length) finalize(p, para, p.lineNo - 2);
  else para.parent!.kids.pop();
  if (p.tip === para) p.tip = para.parent!;
  Object.assign(add(p, 'table'), { aligns, lines: [header], start: p.lineNo - 1 });
  p.offset = p.line.length;
  return true;
}

/** A list marker at the next non-space: bullet `-*+` or `1.`/`1)` (up to nine digits). */
function listMarker(p: Parser, container: Block): { marker: string; ordered: boolean; bullet: string; num: number; end: number } | null {
  const s = p.line, i = p.nn;
  let end = i + 1;
  let num = 0;
  const ordered = s[i]! >= '0' && s[i]! <= '9';
  if (ordered) {
    while (end < i + 9 && s[end]! >= '0' && s[end]! <= '9') end += 1;
    if (s[end] !== '.' && s[end] !== ')') return null;
    num = Number(s.slice(i, end));
    end += 1;
  } else if (s[i] !== '-' && s[i] !== '*' && s[i] !== '+') return null;
  if (end < s.length && s[end] !== ' ') return null;
  // A paragraph is interrupted only by an item with content, and a numbered one only from 1.
  if (container.t === 'para' && (isBlank(s, end) || (ordered && num !== 1))) return null;
  return { marker: s.slice(i, end), ordered, bullet: s[end - 1]!, num, end };
}

function listItem(p: Parser, container: Block): boolean {
  const m = listMarker(p, container);
  if (!m) return false;
  const s = p.line;
  let sp = 0;
  while (sp < 5 && s[m.end + sp] === ' ') sp += 1;
  const narrow = sp >= 5 || sp < 1 || isBlank(s, m.end);
  const padding = m.marker.length + (narrow ? 1 : sp);
  const width = p.indent + padding;
  p.offset = narrow ? m.end + (s[m.end] === ' ' ? 1 : 0) : m.end + sp;
  closeUnmatched(p);
  const tip = p.tip;
  if (tip.t !== 'list' || tip.ordered !== m.ordered || tip.bullet !== m.bullet) {
    Object.assign(add(p, 'list'), { ordered: m.ordered, bullet: m.bullet, startNum: m.num });
  }
  Object.assign(add(p, 'item'), { marker: m.marker, width });
  return true;
}

/** Tries each block start at the next non-space: 0 none, 1 a container opened, 2 a leaf opened. */
function startBlock(p: Parser, container: Block): 0 | 1 | 2 {
  if (p.indent > 3) return 0;
  const s = p.line, c = s[p.nn];
  const room = container.depth < MAX_DEPTH;
  if (c === '>' && room) {
    p.offset = p.nn + (s[p.nn + 1] === ' ' ? 2 : 1);
    closeUnmatched(p);
    add(p, 'quote');
    return 1;
  }
  const head = c === '#' ? atx(s, p.nn) : null;
  if (head) {
    closeUnmatched(p);
    Object.assign(add(p, 'head'), { level: head.level, lines: [head.text] });
    p.offset = s.length;
    return 2;
  }
  if (p.more && thematicBreak(s, p.nn)) {
    closeUnmatched(p);
    add(p, 'hr');
    p.offset = s.length;
    return 2;
  }
  if (c === '`' || c === '~') {
    let n = 0;
    while (s[p.nn + n] === c) n += 1;
    if (n >= 3 && !(c === '`' && s.indexOf('`', p.nn + n) >= 0)) {
      closeUnmatched(p);
      Object.assign(add(p, 'code'), { fence: c.repeat(n), fenceIndent: p.indent });
      p.offset = s.length;
      return 2;
    }
  }
  if (room && listItem(p, container)) return 1;
  return p.more && container.t === 'para' && tableStart(p, container) ? 2 : 0;
}

/** One source line through CommonMark's three steps. */
function incorporate(p: Parser, raw: string): void {
  p.line = expandTabs(raw);
  p.lineNo += 1;
  p.offset = 0;
  p.oldtip = p.tip;
  let container = p.doc;
  for (let kid = container.kids.at(-1); kid?.open; kid = container.kids.at(-1)) {
    scan(p);
    const r = matches(p, kid);
    if (r === 2) return;
    if (r === 1) break;
    container = kid;
  }
  p.allClosed = container === p.oldtip;
  p.lastMatched = container;
  while (container.t !== 'code') {
    scan(p);
    const r = startBlock(p, container);
    if (r === 0) { p.offset = p.nn; break; }
    container = p.tip;
    if (r === 2) break;
  }
  addRest(p, container);
}

/** Step 3: a lazy paragraph line, a code line, a paragraph line, or nothing for a blank. */
function addRest(p: Parser, container: Block): void {
  const rest = p.line.slice(p.offset);
  if (!p.allClosed && !p.blank && p.tip.t === 'para') { p.tip.lines.push(rest); return; }
  closeUnmatched(p);
  if (container.t === 'code') { if (container.start !== p.lineNo) container.lines.push(`${rest}\n`); return; }
  if (container.t === 'para') { container.lines.push(rest); return; }
  if (container.t === 'table') { if (rest) container.lines.push(rest); return; }
  if (container.t !== 'head' && container.t !== 'hr' && !p.blank) add(p, 'para').lines.push(rest);
}

/** Markdown source to a block tree (the document). `more`: thematic breaks and tables too (markdownMore). */
export function parseBlocks(src: string, more = false): Block {
  const doc = block('doc', null, 0);
  const p: Parser = { doc, tip: doc, oldtip: doc, lastMatched: doc, allClosed: true, more, line: '', lineNo: 0, offset: 0, nn: 0, indent: 0, blank: true };
  const lines = src.replace(/\0/g, '\uFFFD').split(/\r\n|\r|\n/);
  if (lines.at(-1) === '') lines.pop();
  for (const line of lines) incorporate(p, line);
  while (p.tip !== doc) finalize(p, p.tip, p.lineNo);
  return doc;
}
