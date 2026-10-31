// A Word file as Markdown: headings, lists and tables, merged cells included, and its pictures as bytes,
// named, with a marker where each stood. It writes nothing. A merged cell's text is repeated in every
// place it covers, so each row reads on its own: Markdown has no merging, and a blank would read as empty.
// A drawing stands as a marker: `ooxml-drawing.ts` says what it reads of one, `found` says what the host should tell.
// Ported in part from KiroCrew (`src/kiro_crew/doc_blocks.py`, Apache-2.0, see this package's NOTICE):
// heading styles, numbering through `numId` and `abstractNum`, a style's own numbering, `w:numId` 0 as
// cancelling it, reaching through `w:sdt` and `w:customXml`, and a budget that stops at a whole unit and
// says so. Changed: rewritten in TypeScript; Markdown, not blocks; `gridSpan`, `vMerge`, pictures, text
// boxes, tracked changes, list levels and counting are ours; a style's heading also comes from its name.
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import type { OoxmlPackage, OoxmlRelationship } from './ooxml.ts';
import { openPackage } from './ooxml.ts';
import type { Numbering } from './docx-numbering.ts';
import { readNumbering } from './docx-numbering.ts';
import { canBeSeen, chartText, markerSafe, pictureName, readDrawing, shapesText, smartArtText } from './ooxml-drawing.ts';
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
  found: DocxFound;
}

/** What the document holds that a reader of its Markdown should be told of: each stands as a marker too. */
export interface DocxFound {
  smartArt: number;
  charts: number;
  shapes: number;
  connectors: number;
  /** Drawings of a kind this reader has nothing for. */
  otherDrawings: number;
  /** Saved pictures in a format a model can't be shown. */
  unseeable: string[];
  /** Embedded objects' kinds (`Visio.Drawing.15`). */
  embedded: string[];
  hiddenRuns: number;
  trackedChanges: boolean;
}

const HEADING_ID = /^heading[ _-]?([1-9])$/i;
const TITLE = /^title$/i;
/** A style's heading level by what it is called: a writer may leave out its definition. */
const headingNamed = (name: string) => (TITLE.test(name) ? 1 : Number(HEADING_ID.exec(name)?.[1] ?? 0) || undefined);
const NOT_READ: Record<string, RegExp> = { headers: /^word\/header\d*\.xml$/, footers: /^word\/footer\d*\.xml$/, footnotes: /^word\/footnotes\.xml$/, endnotes: /^word\/endnotes\.xml$/, comments: /^word\/comments\.xml$/ };
/** Not on the page, or not the current text. */
const LEFT_OUT = new Set(['rPr', 'pPr', 'del', 'moveFrom', 'delText', 'instrText', 'Fallback', 'tblPr', 'tblGrid', 'tcPr', 'trPr', 'sectPr', 'docPr']);
/** Wrappers around what they hold. */
const WRAPPERS = new Set(['sdt', 'sdtContent', 'customXml', 'ins', 'moveTo', 'smartTag', 'AlternateContent', 'Choice']);

interface Style { heading?: number | undefined; numId?: string | undefined; level?: number | undefined; basedOn?: string | undefined }

interface Walk {
  file: OoxmlPackage;
  limits: Limits;
  styles: Map<string, Style>;
  numbering: Numbering;
  relationships: Map<string, OoxmlRelationship>;
  pictures: Map<string, DocxPicture>;
  found: DocxFound;
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
    const numPr = childNamed(pr, 'numPr');
    const numLevel = childNamed(numPr, 'ilvl')?.attrs['val'];
    out.set(id, { heading: level, numId: childNamed(numPr, 'numId')?.attrs['val'], level: numLevel === undefined ? undefined : Number(numLevel), basedOn: childNamed(s, 'basedOn')?.attrs['val'] });
  }
  return out;
}

/** The style's own value of `key`, or the nearest it is based on: a style names its parent, so a loop is possible and stopped. */
function inherited<K extends 'heading' | 'numId' | 'level'>(styles: Map<string, Style>, id: string, key: K): Style[K] {
  const seen = new Set<string>();
  for (let at: string | undefined = id; at !== undefined && !seen.has(at); at = styles.get(at)?.basedOn) {
    seen.add(at);
    const value = styles.get(at)?.[key];
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
    picture = { name: pictureName(w.pictures.size + 1, target), bytes: w.file.bytes(target) };
    w.pictures.set(target, picture);
    if (!canBeSeen(picture.name)) w.found.unseeable.push(picture.name);
  }
  return `![${markerSafe(alt)}](${picture.name})${canBeSeen(picture.name) ? '' : ' [picture in a format a model can\'t be shown]'}`;
}

/** A `w:drawing` as its markers: nothing in it goes with no word. */
function drawingMarkers(w: Walk, node: XmlNode): string {
  const d = readDrawing(node);
  const out = d.pictures.map((p) => pictureMarker(w, p.rel, p.alt)).filter(Boolean);
  for (const rel of d.diagrams) {
    w.found.smartArt++;
    out.push(`[SmartArt: ${markerSafe(smartArtText(w.file, w.relationships.get(rel), w.limits)) || 'its words could not be read'}]`);
  }
  for (const rel of d.charts) {
    w.found.charts++;
    out.push(`[chart: ${markerSafe(chartText(w.file, w.relationships.get(rel), w.limits)) || 'its words could not be read'}]`);
  }
  if (d.shapes.length + d.connectors.length > 0) {
    w.found.shapes += d.shapes.length;
    w.found.connectors += d.connectors.length;
    out.push(`[drawing: ${markerSafe(shapesText(d, w.limits))}]`);
  }
  if (out.length === 0) {
    w.found.otherDrawings++;
    out.push('[drawing of a kind not read]');
  }
  return out.join(' ');
}

/** An old-style drawing (VML): any picture or words, and a marker that a shape stood here. */
function oldDrawing(w: Walk, node: XmlNode): string {
  const text = inline(w, node).trim();
  if (text.startsWith('!') || text.startsWith('[embedded')) return text;
  w.found.shapes++;
  return text ? `[drawing: ${markerSafe(text)}]` : '[drawing of a kind not read]';
}

/** An embedded object: only its kind, from the file's own words, made plain. */
function embedded(w: Walk, node: XmlNode): string {
  const kind = (node.attrs['ProgID'] ?? 'object').replace(/[^A-Za-z0-9._-]+/g, '').slice(0, 64) || 'object';
  if (!w.found.embedded.includes(kind)) w.found.embedded.push(kind);
  return `[embedded ${kind}, not read]`;
}

/** A link keeps where it goes, when that is outside the document. */
function hyperlink(w: Walk, node: XmlNode): string {
  const text = inline(w, node);
  const rel = w.relationships.get(node.attrs['id'] ?? '');
  return rel?.external && text ? `[${markerSafe(text)}](${rel.target.replace(/[\s()]+/g, '')})` : text;
}

const isOn = (node: XmlNode | undefined) => node !== undefined && !['0', 'false', 'off'].includes(node.attrs['val'] ?? '');

/** A paragraph's or a run's text, in order, with what stands inside it. */
function inline(w: Walk, node: XmlNode): string {
  let out = '';
  for (const c of elements(node)) {
    if (c.name === 'del' || c.name === 'moveFrom' || c.name === 'ins' || c.name === 'moveTo') w.found.trackedChanges = true;
    if (LEFT_OUT.has(c.name)) continue;
    if (c.name === 't') out += directText(c);
    else if (c.name === 'tab' || c.name === 'ptab') out += ' ';
    else if (c.name === 'br' || c.name === 'cr') out += '\n';
    else if (c.name === 'noBreakHyphen') out += '-';
    else if (c.name === 'drawing') out += drawingMarkers(w, c);
    else if (c.name === 'pict') out += oldDrawing(w, c);
    else if (c.name === 'imagedata') out += pictureMarker(w, c.attrs['id'], c.attrs['title'] ?? '');
    else if (c.name === 'OLEObject') out += ` ${embedded(w, c)}`;
    else if (c.name === 'hyperlink') out += hyperlink(w, c);
    else if (c.name === 'r' && isOn(childNamed(childNamed(c, 'rPr'), 'vanish'))) { w.found.hiddenRuns++; out += `[hidden: ${markerSafe(inline(w, c))}]`; }
    else if (c.name === 'p' || c.name === 'tbl') out += ` ${inline(w, c)} `;
    else out += inline(w, c);
  }
  return out;
}

/** `numId` and level of a paragraph's number: direct numbering outranks its style's, and 0 cancels it. */
function listOf(w: Walk, pr: XmlNode | undefined): { numId: string; level: number } | undefined {
  const direct = childNamed(pr, 'numPr');
  const style = childNamed(pr, 'pStyle')?.attrs['val'];
  const numId = direct ? childNamed(direct, 'numId')?.attrs['val'] : style === undefined ? undefined : inherited(w.styles, style, 'numId');
  if (numId === undefined || numId === '0') return undefined;
  const given = Number(childNamed(direct, 'ilvl')?.attrs['val'] ?? (style === undefined ? undefined : inherited(w.styles, style, 'level') ?? w.numbering.levelOfStyle(numId, style)) ?? 0);
  return { numId, level: given >= 0 && given <= 8 ? given : 0 };
}

function paragraph(w: Walk, p: XmlNode): string {
  const text = inline(w, p).trim();
  if (!text) return '';
  const pr = childNamed(p, 'pPr');
  const style = childNamed(pr, 'pStyle')?.attrs['val'];
  const heading = style === undefined ? undefined : inherited(w.styles, style, 'heading') ?? headingNamed(style);
  const list = listOf(w, pr);
  const marker = list ? w.numbering.next(list.numId, list.level) : '';
  const line = text.replace(/\s*\n\s*/g, ' ');
  if (heading !== undefined) return `${'#'.repeat(heading)} ${marker && marker !== '-' ? `${marker} ` : ''}${line}`;
  return list && marker ? `${'  '.repeat(list.level)}${marker} ${line}` : text;
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
  elements(tc).filter((c) => !LEFT_OUT.has(c.name)).map((c) => (c.name === 'p' ? paragraph(w, c) : inline(w, c)).trim()).filter(Boolean).join('\n');

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
  const styles = readStyles(file, limits);
  const numbering = readNumbering(file, limits, (style) => inherited(styles, style, 'numId'));
  const found: DocxFound = { smartArt: 0, charts: 0, shapes: 0, connectors: 0, otherDrawings: 0, unseeable: [], embedded: [], hiddenRuns: 0, trackedChanges: false };
  const w: Walk = { file, limits, styles, numbering, relationships: file.relationships(part), pictures: new Map(), found, chars: 0, cut: false };
  const out: string[] = [];
  blocks(w, childNamed(root, 'body') ?? root, out);
  const names = file.names();
  const notRead = Object.keys(NOT_READ).filter((kind) => names.some((n) => NOT_READ[kind]!.test(n)));
  return { markdown: out.join('\n\n'), cut: w.cut, pictures: [...w.pictures.values()], notRead, found };
}
