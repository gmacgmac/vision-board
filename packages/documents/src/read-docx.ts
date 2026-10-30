// A Word file as Markdown: headings, lists and tables, merged cells included, and its pictures as bytes,
// named, with a marker where each stood. It writes nothing. A merged cell's text is repeated in every
// place it covers, so each row reads on its own: Markdown has no merging, and a blank would read as empty.
// Ported in part from KiroCrew (`src/kiro_crew/doc_blocks.py`, Apache-2.0, see this package's NOTICE):
// heading styles, numbering through `numId` and `abstractNum`, a style's own numbering, `w:numId` 0 as
// cancelling it, reaching through `w:sdt` and `w:customXml`, and a budget that stops at a whole unit and
// says so. Changed: rewritten in TypeScript; Markdown, not blocks; `gridSpan`, `vMerge`, pictures, text
// boxes, tracked changes, list levels and counting are ours; a style's heading also comes from its name.
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import { openPackage } from './ooxml.ts';
import type { XmlNode } from './xml.ts';
import { childNamed, childrenNamed, directText, xmlTree } from './xml.ts';

export interface DocxPicture { name: string; bytes: Uint8Array }
export interface DocxDocument {
  markdown: string;
  /** Whether a limit stopped it: what is here is the beginning, whole units only. */
  cut: boolean;
  pictures: DocxPicture[];
  /** Parts with words this reader leaves out, by kind. */
  notRead: string[];
}

const HEADING_ID = /^heading[ _-]?([1-9])$/i;
const TITLE = /^title$/i;
/** A style's heading level by what it is called: a writer may leave out its definition. */
const headingNamed = (name: string) => (TITLE.test(name) ? 1 : Number(HEADING_ID.exec(name)?.[1] ?? 0) || undefined);
const NOT_READ: Record<string, RegExp> = { headers: /^word\/header\d*\.xml$/, footers: /^word\/footer\d*\.xml$/, footnotes: /^word\/footnotes\.xml$/, endnotes: /^word\/endnotes\.xml$/, comments: /^word\/comments\.xml$/ };
const PICTURE_EXTENSION = /\.(?:png|jpe?g|gif|bmp|tiff?|webp|svg|emf|wmf)$/i;
/** Not on the page, or not the current text. */
const LEFT_OUT = new Set(['rPr', 'pPr', 'del', 'moveFrom', 'delText', 'instrText', 'Fallback', 'tblPr', 'tblGrid', 'tcPr', 'trPr', 'sectPr', 'docPr']);
/** Wrappers around what they hold. */
const WRAPPERS = new Set(['sdt', 'sdtContent', 'customXml', 'ins', 'moveTo', 'smartTag', 'AlternateContent', 'Choice']);

interface Style { heading?: number | undefined; numId?: string | undefined; basedOn?: string | undefined }

interface Walk {
  file: OoxmlPackage;
  limits: Limits;
  styles: Map<string, Style>;
  /** Per `numId`, the format of each level. */
  numbering: Map<string, string[]>;
  relationships: Map<string, { type: string; target: string }>;
  pictures: Map<string, DocxPicture>;
  counters: Map<string, number[]>;
  chars: number;
  cut: boolean;
}

const elements = (n: XmlNode) => n.children.filter((c): c is XmlNode => typeof c !== 'string');

function readStyles(file: OoxmlPackage, limits: Limits): Map<string, Style> {
  const out = new Map<string, Style>();
  const xml = file.text('word/styles.xml');
  if (xml === undefined) return out;
  for (const s of childrenNamed(xmlTree(xml, limits), 'style')) {
    const id = s.attrs['styleId'];
    if (id === undefined) continue;
    const named = headingNamed(childNamed(s, 'name')?.attrs['val'] ?? '') ?? headingNamed(id);
    const pr = childNamed(s, 'pPr');
    const outline = childNamed(pr, 'outlineLvl')?.attrs['val'];
    const level = named ?? (outline !== undefined && /^[0-8]$/.test(outline) ? Number(outline) + 1 : undefined);
    out.set(id, { heading: level, numId: childNamed(childNamed(pr, 'numPr'), 'numId')?.attrs['val'], basedOn: childNamed(s, 'basedOn')?.attrs['val'] });
  }
  return out;
}

function readNumbering(file: OoxmlPackage, limits: Limits): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const xml = file.text('word/numbering.xml');
  if (xml === undefined) return out;
  const root = xmlTree(xml, limits);
  const abstract = new Map(childrenNamed(root, 'abstractNum').map((a) => [a.attrs['abstractNumId'], childrenNamed(a, 'lvl')]));
  for (const num of childrenNamed(root, 'num')) {
    const levels = abstract.get(childNamed(num, 'abstractNumId')?.attrs['val']) ?? [];
    const formats: string[] = [];
    for (const lvl of levels) {
      const at = Number(lvl.attrs['ilvl'] ?? 0);
      if (at >= 0 && at <= 8) formats[at] = childNamed(lvl, 'numFmt')?.attrs['val'] ?? 'bullet';
    }
    if (num.attrs['numId'] !== undefined) out.set(num.attrs['numId'], formats);
  }
  return out;
}

/** The style's own value of `key`, or the nearest it is based on: a style names its parent, so a loop is possible and stopped. */
function inherited<K extends 'heading' | 'numId'>(w: Walk, id: string, key: K): Style[K] {
  const seen = new Set<string>();
  for (let at: string | undefined = id; at !== undefined && !seen.has(at); at = w.styles.get(at)?.basedOn) {
    seen.add(at);
    const value = w.styles.get(at)?.[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

/** The picture behind relationship `id`, kept once, and its marker; nothing when it isn't an inside part, or past the limit. */
function pictureMarker(w: Walk, id: string | undefined, alt: string): string {
  const target = id === undefined ? undefined : w.relationships.get(id)?.target;
  if (target === undefined || !w.file.has(target)) return '';
  let picture = w.pictures.get(target);
  if (!picture) {
    if (w.pictures.size >= w.limits.pictures) { w.cut = true; return ''; }
    const extension = PICTURE_EXTENSION.exec(target)?.[0].toLowerCase() ?? '.bin';
    picture = { name: `picture-${w.pictures.size + 1}${extension}`, bytes: w.file.bytes(target) };
    w.pictures.set(target, picture);
  }
  return `![${alt.replace(/[\]\[\r\n]+/g, ' ').trim()}](${picture.name})`;
}

/** The alt text a drawing gives itself, one or two levels down. */
function altOf(drawing: XmlNode): string {
  const direct = childNamed(drawing, 'docPr') ?? elements(drawing).map((c) => childNamed(c, 'docPr')).find(Boolean);
  return direct?.attrs['descr'] ?? '';
}

/** A paragraph's or a run's text, in order, with the pictures and text boxes inside it. */
function inline(w: Walk, node: XmlNode, alt = ''): string {
  let out = '';
  for (const c of elements(node)) {
    if (LEFT_OUT.has(c.name)) continue;
    if (c.name === 't') out += directText(c);
    else if (c.name === 'tab' || c.name === 'ptab') out += ' ';
    else if (c.name === 'br' || c.name === 'cr') out += '\n';
    else if (c.name === 'noBreakHyphen') out += '-';
    else if (c.name === 'drawing' || c.name === 'pict' || c.name === 'object') out += inline(w, c, altOf(c));
    else if (c.name === 'blip') out += pictureMarker(w, c.attrs['embed'], alt);
    else if (c.name === 'imagedata') out += pictureMarker(w, c.attrs['id'], c.attrs['title'] ?? alt);
    else if (c.name === 'p' || c.name === 'tbl') out += ` ${inline(w, c, alt)} `;
    else out += inline(w, c, alt);
  }
  return out;
}

/** `numId` and level of a paragraph's list item: direct numbering outranks its style's, and 0 cancels it. */
function listOf(w: Walk, pr: XmlNode | undefined): { numId: string; level: number } | undefined {
  const direct = childNamed(pr, 'numPr');
  const style = childNamed(pr, 'pStyle')?.attrs['val'];
  const numId = direct ? childNamed(direct, 'numId')?.attrs['val'] : style === undefined ? undefined : inherited(w, style, 'numId');
  if (numId === undefined || numId === '0') return undefined;
  const level = Number(childNamed(direct, 'ilvl')?.attrs['val'] ?? 0);
  return { numId, level: level >= 0 && level <= 8 ? level : 0 };
}

/** One list item's marker: `-`, or the item's number at its level, counted since its level last began. */
function marker(w: Walk, { numId, level }: { numId: string; level: number }): string {
  const format = w.numbering.get(numId)?.[level] ?? 'bullet';
  if (format === 'bullet' || format === 'none') return '-';
  const counts = w.counters.get(numId) ?? [];
  counts[level] = (counts[level] ?? 0) + 1;
  counts.length = level + 1;
  w.counters.set(numId, counts);
  return `${counts[level]}.`;
}

function paragraph(w: Walk, p: XmlNode): string {
  const text = inline(w, p).trim();
  if (!text) return '';
  const pr = childNamed(p, 'pPr');
  const style = childNamed(pr, 'pStyle')?.attrs['val'];
  const heading = style === undefined ? undefined : inherited(w, style, 'heading') ?? headingNamed(style);
  if (heading !== undefined) return `${'#'.repeat(heading)} ${text.replace(/\s*\n\s*/g, ' ')}`;
  const list = listOf(w, pr);
  return list ? `${'  '.repeat(list.level)}${marker(w, list)} ${text.replace(/\s*\n\s*/g, ' ')}` : text;
}

/** `parent`'s children named `name`, reaching through wrappers, never into a nested table. */
function reach(parent: XmlNode, name: string): XmlNode[] {
  return elements(parent).flatMap((c) => (c.name === name ? [c] : WRAPPERS.has(c.name) ? reach(c, name) : []));
}

/** Charge `n` characters: false when the document is over its budget, which is then spent. */
function charge(w: Walk, n: number): boolean {
  if (w.chars + n > w.limits.markdownChars) { w.chars = w.limits.markdownChars; w.cut = true; return false; }
  w.chars += n;
  return true;
}

const cellText = (w: Walk, tc: XmlNode) =>
  elements(tc).filter((c) => !LEFT_OUT.has(c.name)).map((c) => inline(w, c).trim()).filter(Boolean).join('\n');

/** The table's rows as a grid, spans and merges filled in, a column past the limit and a hostile span cut to it. */
function tableGrid(w: Walk, tbl: XmlNode): string[][] {
  const grid: string[][] = [];
  const above = new Map<number, string>();
  for (const tr of reach(tbl, 'tr')) {
    const row: string[] = [];
    let col = Number(childNamed(childNamed(tr, 'trPr'), 'gridBefore')?.attrs['val'] ?? 0) || 0;
    for (const tc of reach(tr, 'tc')) {
      const pr = childNamed(tc, 'tcPr');
      const merge = childNamed(pr, 'vMerge');
      const continues = merge !== undefined && merge.attrs['val'] !== 'restart';
      const text = continues ? above.get(col) ?? '' : cellText(w, tc);
      const span = Math.max(1, Number(childNamed(pr, 'gridSpan')?.attrs['val'] ?? 1) || 1);
      if (col + span > w.limits.tableColumns) w.cut = true;
      for (let at = col; at < Math.min(col + span, w.limits.tableColumns); at++) {
        if (!charge(w, text.length + 3)) return grid;
        row[at] = text;
        above.set(at, text);
      }
      col += span;
      if (col >= w.limits.tableColumns) break;
    }
    grid.push(row);
  }
  return grid;
}

const tableCell = (text: string | undefined) => (text ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

function table(w: Walk, tbl: XmlNode): string {
  const grid = tableGrid(w, tbl);
  const width = Math.max(0, ...grid.map((r) => r.length));
  if (width === 0) return '';
  const line = (cells: (string | undefined)[]) => `| ${cells.join(' | ')} |`;
  const rows = grid.map((r) => line(Array.from({ length: width }, (_, i) => tableCell(r[i]))));
  return [rows[0], line(Array.from({ length: width }, () => '---')), ...rows.slice(1)].join('\n');
}

/** Every block under `parent`, in order, until the budget is spent. */
function blocks(w: Walk, parent: XmlNode, out: string[]): void {
  for (const c of elements(parent)) {
    if (w.cut && w.chars >= w.limits.markdownChars) return;
    if (WRAPPERS.has(c.name)) { blocks(w, c, out); continue; }
    if (c.name !== 'p' && c.name !== 'tbl') continue;
    if (c.name === 'tbl') {
      const t = table(w, c);
      if (t) out.push(t);
    } else {
      const text = paragraph(w, c);
      if (text && charge(w, text.length + 2)) out.push(text);
    }
  }
}

/** The document in `bytes`: an archive with a Word document part, or a refusal. */
export function readDocx(bytes: Uint8Array, limits: Limits = LIMITS): DocxDocument {
  const file = openPackage(bytes, limits);
  const part = file.main('word/document.xml');
  const root = xmlTree(file.text(part)!, limits);
  const w: Walk = { file, limits, styles: readStyles(file, limits), numbering: readNumbering(file, limits), relationships: file.relationships(part), pictures: new Map(), counters: new Map(), chars: 0, cut: false };
  const out: string[] = [];
  blocks(w, childNamed(root, 'body') ?? root, out);
  const names = file.names();
  const notRead = Object.keys(NOT_READ).filter((kind) => names.some((n) => NOT_READ[kind]!.test(n)));
  return { markdown: out.join('\n\n'), cut: w.cut, pictures: [...w.pictures.values()], notRead };
}
