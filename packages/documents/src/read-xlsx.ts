// An Excel file keeps its shape (D-071 ruling 2): with no sheet its sheets and their real sizes, counted
// from the cells, a hidden sheet marked as such; with a sheet and a range, each cell's address, value and
// formula, both, up to a cap that says where it stopped. It calculates nothing and writes nothing.
import type { Cell, Range } from './a1.ts';
import { WHOLE_SHEET, addressOf, inRange, rangeText, readRange } from './a1.ts';
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import { openPackage } from './ooxml.ts';
import { refuse } from './refused.ts';
import type { CellType, SheetCell, SheetContext } from './xlsx-cells.ts';
import { readSheet } from './xlsx-cells.ts';
import { childNamed, childrenNamed, xmlEvents, xmlTree } from './xml.ts';

export interface SheetSummary {
  name: string;
  hidden: boolean;
  rows: number;
  columns: number;
  cells: number;
  formulas: number;
  /** The range from the first cell with anything in it to the last; left out when there is none. */
  used?: string;
}
export interface WorkbookSummary { kind: 'workbook'; sheets: SheetSummary[]; cut: boolean }

export interface CellOut {
  address: string;
  type: CellType;
  value: string | number | boolean | null;
  formula?: string;
  serial?: number;
  truncated?: true;
  /** The merged range the cell stands in. */
  merged?: string;
}
export interface SheetAnswer {
  kind: 'sheet';
  sheet: string;
  range: string;
  cells: CellOut[];
  merged: string[];
  /** Where to go on when the cap stopped it: a range starting at the row of the first cell not given. */
  cut?: { shown: number; next: string };
}

const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
/** A number format is a date when, outside its quotes, escapes and brackets, it has a date letter. */
const LITERAL = /"[^"]*"|\\.|\[[^\]]*\]|_.|\*./g;
const DATE_LETTER = /[ymdhs]/i;
const isDateFormat = (code: string) => DATE_LETTER.test(code.replace(LITERAL, ''));

function readDateStyles(file: OoxmlPackage, limits: Limits): boolean[] {
  const xml = file.text('xl/styles.xml');
  if (xml === undefined) return [];
  const root = xmlTree(xml, limits);
  const custom = new Map(childrenNamed(childNamed(root, 'numFmts') ?? root, 'numFmt').map((f) => [f.attrs['numFmtId'], f.attrs['formatCode'] ?? '']));
  return childrenNamed(childNamed(root, 'cellXfs') ?? root, 'xf').map((xf) => {
    const id = xf.attrs['numFmtId'] ?? '0';
    const code = custom.get(id);
    return code === undefined ? BUILTIN_DATES.has(Number(id)) : isDateFormat(code);
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
  for (const e of xmlEvents(xml, limits)) {
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
interface Book { file: OoxmlPackage; sheets: SheetPart[]; context: () => SheetContext }

function openBook(bytes: Uint8Array, limits: Limits): Book {
  const file = openPackage(bytes, limits);
  const main = file.main('xl/workbook.xml');
  const root = xmlTree(file.text(main)!, limits);
  const rels = file.relationships(main);
  const sheets = childrenNamed(childNamed(root, 'sheets') ?? root, 'sheet').map((s) => ({
    name: (s.attrs['name'] ?? '').slice(0, limits.cellChars), hidden: (s.attrs['state'] ?? 'visible') !== 'visible', part: rels.get(s.attrs['id'] ?? '')?.target,
  }));
  const pr = childNamed(root, 'workbookPr')?.attrs['date1904'];
  let context: SheetContext | undefined;
  return {
    file, sheets,
    context: () => (context ??= { sharedStrings: readSharedStrings(file, limits), dateStyles: readDateStyles(file, limits), date1904: pr === '1' || pr === 'true', limits }),
  };
}

/** One sheet's real size, counted from its cells: a `dimension` record is not asked. */
function summary(book: Book, s: SheetPart): SheetSummary {
  const out: SheetSummary = { name: s.name, hidden: s.hidden, rows: 0, columns: 0, cells: 0, formulas: 0 };
  const xml = s.part === undefined ? undefined : book.file.text(s.part);
  if (xml === undefined) return out;
  const rows = new Set<number>();
  const box = { minCol: Infinity, maxCol: 0, minRow: Infinity, maxRow: 0 };
  for (const c of readSheet(xml, book.context()).cells) {
    out.cells++;
    if (c.formula) out.formulas++;
    rows.add(c.row);
    box.minCol = Math.min(box.minCol, c.col); box.maxCol = Math.max(box.maxCol, c.col);
    box.minRow = Math.min(box.minRow, c.row); box.maxRow = Math.max(box.maxRow, c.row);
  }
  if (out.cells === 0) return out;
  out.rows = rows.size;
  out.columns = box.maxCol - box.minCol + 1;
  out.used = rangeText({ from: { col: box.minCol, row: box.minRow }, to: { col: box.maxCol, row: box.maxRow } });
  return out;
}

/** The workbook's sheets and their sizes. */
export function readWorkbook(bytes: Uint8Array, limits: Limits = LIMITS): WorkbookSummary {
  const book = openBook(bytes, limits);
  const sheets = book.sheets.slice(0, limits.sheets).map((s) => summary(book, s));
  return { kind: 'workbook', sheets, cut: book.sheets.length > limits.sheets };
}

function cellOut(c: SheetCell, merges: { text: string; range: Range }[]): CellOut {
  const merged = merges.find((m) => inRange(m.range, c))?.text;
  return {
    address: addressOf(c), type: c.type, value: c.value,
    ...(c.formula !== undefined && { formula: c.formula }), ...(c.serial !== undefined && { serial: c.serial }),
    ...(c.truncated && { truncated: true as const }), ...(merged !== undefined && { merged }),
  };
}

const charsOf = (c: SheetCell) => String(c.value ?? '').length + (c.formula?.length ?? 0);

/** The cells of `range` on `sheet` (the whole sheet when left out), each with its value and formula. */
export function readCells(bytes: Uint8Array, sheet: string, range: string | undefined, limits: Limits = LIMITS): SheetAnswer {
  const wanted = range === undefined ? WHOLE_SHEET : readRange(range);
  const book = openBook(bytes, limits);
  const folded = sheet.toLowerCase();
  const found = book.sheets.find((s) => s.name === sheet) ?? book.sheets.find((s) => s.name.toLowerCase() === folded);
  if (!found) return refuse('noSheet');
  const xml = found.part === undefined ? undefined : book.file.text(found.part);
  const read = readSheet(xml ?? '<worksheet/>', book.context());
  const kept: SheetCell[] = [];
  let chars = 0;
  let stopped: Cell | undefined;
  for (const c of read.cells) {
    if (!inRange(wanted, c) || stopped) continue; // on to the end: the merged ranges come after the cells
    chars += charsOf(c);
    if (kept.length >= limits.cells || chars > limits.sheetChars) stopped = c;
    else kept.push(c);
  }
  const merges = read.merged.flatMap((text) => {
    try { return [{ text, range: readRange(text) }]; } catch { return []; }
  }).filter(({ range: r }) => r.from.col <= wanted.to.col && r.to.col >= wanted.from.col && r.from.row <= wanted.to.row && r.to.row >= wanted.from.row);
  return {
    kind: 'sheet', sheet: found.name, range: rangeText(wanted),
    cells: kept.map((c) => cellOut(c, merges)), merged: merges.map((m) => m.text),
    ...(stopped && { cut: { shown: kept.length, next: rangeText({ from: { col: wanted.from.col, row: stopped.row }, to: wanted.to }) } }),
  };
}
