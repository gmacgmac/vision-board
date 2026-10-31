// An Excel file keeps its shape (D-071 ruling 2): with no sheet its sheets and their real sizes, counted
// from the cells, a hidden sheet marked, its names, links and pictures; with a sheet and a range, each cell's
// address, value and formula, both, up to a cap that says where it stopped. It calculates nothing and writes nothing.
import type { Cell, Range } from './a1.ts';
import { WHOLE_SHEET, addressOf, inRange, rangeText, readRange } from './a1.ts';
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import { openPackage } from './ooxml.ts';
import { refuse } from './refused.ts';
import type { CellStyle, CellType, SheetCell, SheetContext } from './xlsx-cells.ts';
import { readSheet } from './xlsx-cells.ts';
import { countedSizes } from './xlsx-sizes.ts';
import type { DefinedName, ExternalLink, PictureNames, SheetComment, SheetDrawing } from './xlsx-parts.ts';
import { readComments, readDefinedNames, readExternalLinks, readSheetDrawings } from './xlsx-parts.ts';
import type { XmlNode } from './xml.ts';
import { childNamed, childrenNamed, xmlEvents, xmlTree } from './xml.ts';

export interface SheetSummary {
  name: string;
  hidden: boolean;
  /** Sizes are left out when `counted` is false: too much to count for a list, or damaged. A range may still read it. */
  counted?: false;
  rows?: number;
  columns?: number;
  cells?: number;
  formulas?: number;
  /** The range from the first cell with anything in it to the last; left out when there is none. */
  used?: string;
  pictures?: number;
  charts?: number;
  diagrams?: number;
  shapes?: number;
  comments?: number;
}
export interface WorkbookPicture { name: string; bytes: Uint8Array }
export interface WorkbookSummary {
  kind: 'workbook';
  sheets: SheetSummary[];
  /** Sheets past the list's limit. */
  cut: boolean;
  names: DefinedName[];
  namesCut: boolean;
  links: ExternalLink[];
  pictures: WorkbookPicture[];
  picturesCut: boolean;
}

export interface CellOut {
  address: string;
  type: CellType;
  value: string | number | boolean | null;
  formula?: string;
  serial?: number;
  format?: string;
  truncated?: true;
  hidden?: true;
  /** The merged range the cell stands in. */
  merged?: string;
}
export interface SheetAnswer {
  kind: 'sheet';
  sheet: string;
  range: string;
  cells: CellOut[];
  merged: string[];
  comments: SheetComment[];
  drawings: SheetDrawing[];
  /** How many cells here have a formula and no value: the file was never calculated. */
  uncalculated: number;
  /** Where to go on when the cap stopped it: `next`, and when that only finishes a row, `then`. */
  cut?: { shown: number; next: string; then?: string };
}

/** The built-in date formats, the zh, ja and ko ones too (27-36, 50-58; ECMA-376 18.8.30 [INFERENCE: from memory, no CJK Excel here]). */
const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
/** The built-in formats that change what a number means. */
const BUILTIN_FORMATS: Record<number, string> = { 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??', 37: '#,##0_);(#,##0)', 38: '#,##0_);[Red](#,##0)', 39: '#,##0.00_);(#,##0.00)', 40: '#,##0.00_);[Red](#,##0.00)', 48: '##0.0E+0' };
const LONGEST_FORMAT = 64;
/** What one row of the list costs in JSON, its name apart. */
const SHEET_ROW_CHARS = 110;
const NAME_ROW_CHARS = 40;
const LINKS_LISTED = 32;
/** `[h]:mm` is a count of hours, which a date would state as a wrong day. */
const ELAPSED = /\[(?:h+|m+|s+)\]/i;
/** A number format is a date when, outside its quotes, escapes and brackets, it has a date letter. */
const LITERAL = /"[^"]*"|\\.|\[[^\]]*\]|_.|\*./g;
const DATE_LETTER = /[ymdhs]/i;
const isDateFormat = (code: string) => !ELAPSED.test(code) && DATE_LETTER.test(code.replace(LITERAL, ''));

function readStyles(file: OoxmlPackage, limits: Limits): CellStyle[] {
  const xml = file.text('xl/styles.xml');
  if (xml === undefined) return [];
  const root = xmlTree(xml, limits);
  const custom = new Map(childrenNamed(childNamed(root, 'numFmts') ?? root, 'numFmt').map((f) => [f.attrs['numFmtId'], f.attrs['formatCode'] ?? '']));
  return childrenNamed(childNamed(root, 'cellXfs') ?? root, 'xf').map((xf) => {
    const id = xf.attrs['numFmtId'] ?? '0';
    const code = custom.get(id);
    if (code === undefined) return { date: BUILTIN_DATES.has(Number(id)), format: BUILTIN_FORMATS[Number(id)] };
    return { date: isDateFormat(code), format: code.length > 0 && code !== 'General' ? code.slice(0, LONGEST_FORMAT) : undefined };
  });
}

/** The shared strings: each `si`'s own text in order, never its phonetic guide. The count and the text are limited. */
function readSharedStrings(file: OoxmlPackage, limits: Limits): string[] {
  const xml = file.text('xl/sharedStrings.xml');
  if (xml === undefined) return [];
  const out: string[] = [];
  let at = -1;
  let inT = false;
  let phonetic = 0;
  for (const e of xmlEvents(xml, { ...limits, xmlNodes: Infinity })) {
    if (e.type === 'text') { if (inT && phonetic === 0 && out[at]!.length <= limits.cellChars) out[at] += e.text; continue; }
    if (e.name === 'rPh') phonetic += e.type === 'open' ? 1 : -1;
    else if (e.name === 't') inT = e.type === 'open';
    else if (e.name === 'si' && e.type === 'open') {
      if (++at >= limits.sharedStrings) refuse('tooMany');
      out[at] = '';
    }
  }
  return out;
}

interface SheetPart { name: string; hidden: boolean; part: string | undefined }
interface Book {
  file: OoxmlPackage;
  root: XmlNode;
  main: string;
  sheets: SheetPart[];
  context: () => SheetContext;
  /** Every sheet's drawings, once: a picture's name is the same whichever sheet is read. */
  drawings: () => { bySheet: Map<SheetPart, SheetDrawing[]>; pictures: PictureNames };
}

function openBook(bytes: Uint8Array, limits: Limits): Book {
  const file = openPackage(bytes, limits);
  const main = file.main('xl/workbook.xml');
  const root = xmlTree(file.text(main)!, limits);
  const rels = file.relationships(main);
  const sheets = childrenNamed(childNamed(root, 'sheets') ?? root, 'sheet').map((s) => ({
    name: (s.attrs['name'] ?? '').slice(0, limits.sheetNameChars), hidden: (s.attrs['state'] ?? 'visible') !== 'visible', part: rels.get(s.attrs['id'] ?? '')?.target,
  }));
  const pr = childNamed(root, 'workbookPr')?.attrs['date1904'];
  const date1904 = pr === '1' || pr === 'true';
  let context: SheetContext | undefined;
  let drawings: ReturnType<Book['drawings']> | undefined;
  return {
    file, root, main, sheets,
    context: () => (context ??= { sharedStrings: readSharedStrings(file, limits), styles: readStyles(file, limits), date1904, limits }),
    drawings: () => {
      if (drawings) return drawings;
      const pictures: PictureNames = { names: new Map(), cut: false };
      const bySheet = new Map(sheets.map((s) => [s, s.part === undefined ? [] : readSheetDrawings(file, s.part, pictures, limits)]));
      return (drawings = { bySheet, pictures });
    },
  };
}

const countOf = (drawings: SheetDrawing[], kind: SheetDrawing['kind']) => drawings.filter((d) => d.kind === kind).length;
const nonZero = (counts: Record<string, number>) => Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0));

/** The workbook's sheets and their sizes, names, links, and the pictures on its sheets, for the host to save. */
export function readWorkbook(bytes: Uint8Array, limits: Limits = LIMITS): WorkbookSummary {
  const book = openBook(bytes, limits);
  const budget = Math.floor(limits.answerChars / 2);
  const shown: SheetPart[] = [];
  let used = 0;
  for (const s of book.sheets.slice(0, limits.sheets)) {
    used += s.name.length + SHEET_ROW_CHARS;
    if (used > budget) break;
    shown.push(s);
  }
  const counted = countedSizes(book.file, shown, limits);
  const { bySheet, pictures } = book.drawings();
  const sheets = shown.map((s): SheetSummary => {
    const d = bySheet.get(s) ?? [];
    return {
      name: s.name, hidden: s.hidden, ...counted.get(s),
      ...nonZero({ pictures: countOf(d, 'picture'), charts: countOf(d, 'chart'), diagrams: countOf(d, 'diagram'), shapes: countOf(d, 'shapes'), comments: s.part === undefined ? 0 : readComments(book.file, s.part, limits).length }),
    };
  });
  const { names, cut: namesCut } = readDefinedNames(book.root, book.sheets.map((s) => s.name), limits);
  let left = budget / 2;
  const fitting = names.filter((n) => (left -= n.name.length + n.refersTo.length + NAME_ROW_CHARS) >= 0);
  return {
    kind: 'workbook', sheets, cut: shown.length < book.sheets.length, names: fitting, namesCut: namesCut || fitting.length < names.length,
    links: readExternalLinks(book.file, book.root, book.main, limits).slice(0, LINKS_LISTED),
    pictures: [...pictures.names].map(([target, name]) => ({ name, bytes: book.file.bytes(target) })), picturesCut: pictures.cut,
  };
}

function cellOut(c: SheetCell, merges: { text: string; range: Range }[]): CellOut {
  const merged = merges.find((m) => inRange(m.range, c))?.text;
  return {
    address: addressOf(c), type: c.type, value: c.value,
    ...(c.formula !== undefined && { formula: c.formula }), ...(c.serial !== undefined && { serial: c.serial }), ...(c.format !== undefined && { format: c.format }),
    ...(c.truncated && { truncated: true as const }), ...(c.hidden && { hidden: true as const }), ...(merged !== undefined && { merged }),
  };
}

/** What a cell costs in the answer: as JSON, with room for a merged range. */
const costOf = (c: SheetCell) => JSON.stringify(cellOut(c, [])).length + CELL_ROOM;
const CELL_ROOM = 16;

/** As many of `items` as fit `chars` in JSON. */
function fitting<T>(items: T[], chars: number): T[] {
  let left = chars;
  const out: T[] = [];
  for (const item of items) {
    left -= JSON.stringify(item).length + 1;
    if (left < 0) break;
    out.push(item);
  }
  return out;
}

/**
 * The cells of `range` on `sheet` (the whole sheet when left out), each with its value and formula. It stops at a
 * cap and says where to go on: from the row of the first cell not given, or, when that is the row it began on, along
 * that row and then the rows after, so `next` always moves on.
 */
export function readCells(bytes: Uint8Array, sheet: string, range: string | undefined, limits: Limits = LIMITS): SheetAnswer {
  const wanted = range === undefined ? WHOLE_SHEET : readRange(range);
  const book = openBook(bytes, limits);
  const folded = sheet.toLowerCase();
  const found = book.sheets.find((s) => s.name === sheet) ?? book.sheets.find((s) => s.name.toLowerCase() === folded);
  if (!found) return refuse('noSheet');
  const xml = found.part === undefined ? undefined : book.file.text(found.part);
  const read = readSheet(xml ?? '<worksheet/>', book.context());
  const cellsBudget = Math.floor(limits.answerChars * CELLS_SHARE);
  const kept: SheetCell[] = [];
  let chars = 0;
  let stopped: Cell | undefined;
  for (const c of read.cells) {
    if (!inRange(wanted, c) || stopped) continue; // on to the end: the merged ranges come after the cells
    chars += costOf(c);
    if (kept.length > 0 && (kept.length >= limits.cells || chars > cellsBudget)) stopped = c;
    else kept.push(c);
  }
  const merges = read.merged.flatMap((text) => {
    try { return [{ text, range: readRange(text) }]; } catch { return []; }
  }).filter(({ range: r }) => r.from.col <= wanted.to.col && r.to.col >= wanted.from.col && r.from.row <= wanted.to.row && r.to.row >= wanted.from.row);
  const extras = (limits.answerChars - cellsBudget) / EXTRA_LISTS;
  const comments = found.part === undefined ? [] : readComments(book.file, found.part, limits).filter((c) => {
    try { const r = readRange(c.address); return inRange(wanted, r.from); } catch { return false; }
  });
  return {
    kind: 'sheet', sheet: found.name, range: rangeText(wanted),
    cells: kept.map((c) => cellOut(c, merges)), merged: fitting(merges.map((m) => m.text), extras),
    comments: fitting(comments, extras), drawings: fitting(book.drawings().bySheet.get(found) ?? [], extras),
    uncalculated: kept.filter((c) => c.type === 'empty').length,
    ...(stopped && { cut: { shown: kept.length, ...goingOn(wanted, stopped) } }),
  };
}

const CELLS_SHARE = 0.7;
const EXTRA_LISTS = 3;

/** The range to ask for after a cut at `stopped`, which always moves on. */
function goingOn(wanted: Range, stopped: Cell): { next: string; then?: string } {
  if (stopped.row > wanted.from.row) return { next: rangeText({ from: { col: wanted.from.col, row: stopped.row }, to: wanted.to }) };
  const next = rangeText({ from: stopped, to: { col: wanted.to.col, row: stopped.row } });
  const below = { from: { col: wanted.from.col, row: stopped.row + 1 }, to: wanted.to };
  return { next, ...(below.from.row <= below.to.row && { then: rangeText(below) }) };
}
