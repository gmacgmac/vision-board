// A worksheet's cells, one at a time, from its own XML. The `dimension` record is never read: it can lie
// (KiroCrew `file_api/sheet.py` warns of stale ones), and nothing here counts by a row's number, so one
// row at 1,000,000 costs one cell (the same warning: a sparse row must not make a grid).
import type { Cell } from './a1.ts';
import { columnName, movedFormula, readAddress } from './a1.ts';
import type { Limits } from './limits.ts';
import { refuse } from './refused.ts';
import { xmlEvents } from './xml.ts';

export type CellType = 'number' | 'text' | 'boolean' | 'date' | 'error' | 'empty';

/** One style's meaning for a number: a date, and the format the person sees it in. */
export interface CellStyle { date: boolean; format?: string | undefined }

export interface SheetCell extends Cell {
  type: CellType;
  value: string | number | boolean | null;
  formula?: string | undefined;
  /** The cell's date as Excel keeps it: the number behind `value`. */
  serial?: number | undefined;
  /** Its text was over the limit, and what is here is the beginning. */
  truncated?: boolean | undefined;
  /** The number format: all that says `1000` is pounds or `0.31` a percent. */
  format?: string | undefined;
  /** Its row or column is hidden: the person doesn't see it. */
  hidden?: boolean | undefined;
}

export interface SheetContext {
  sharedStrings: string[];
  styles: CellStyle[];
  date1904: boolean;
  limits: Limits;
  /** Only counting: what a cell holds doesn't matter, so no string is looked up. */
  counting?: boolean | undefined;
}

const FIRST_REAL_DATE = 61; // Excel counts a 29 Feb 1900 that never was, at 60
const UNIX_EPOCH = 25569;
const EPOCH_1904 = 1462;
const LAST_DATE = 2958465; // 31 Dec 9999
const DAY_MS = 86_400_000;

/** A serial date as text, or undefined for a number no calendar has: `new Date` would throw on it. */
function dateText(serial: number, date1904: boolean): string | undefined {
  const days = date1904 ? serial + EPOCH_1904 : serial;
  if (!(days >= 0 && days <= LAST_DATE)) return undefined;
  const iso = new Date(Math.round((days - UNIX_EPOCH + (days < FIRST_REAL_DATE ? 1 : 0)) * DAY_MS)).toISOString();
  if (days < 1) return iso.slice(11, 19);
  return Number.isInteger(serial) ? iso.slice(0, 10) : iso.slice(0, 19);
}

/** `_xHHHH_` is how a workbook writes a character XML can't hold; `_x005F_` is a plain underscore. */
const ESCAPED = /_x([0-9A-Fa-f]{4})_/g;
const unescaped = (s: string) => (s.includes('_x') ? s.replace(ESCAPED, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))) : s);

interface Raw { address: string | undefined; t: string | undefined; s: number; v: string; inline: string; f: string; fAttrs: Readonly<Record<string, string>> | undefined }

/** The cell's value and type from what its XML said; nothing when it holds nothing. */
function valueOf(raw: Raw, ctx: SheetContext): Pick<SheetCell, 'type' | 'value' | 'serial' | 'truncated' | 'format'> | undefined {
  const text = (raw: string) => {
    const s = unescaped(raw);
    return s.length > ctx.limits.cellChars ? { type: 'text' as const, value: s.slice(0, ctx.limits.cellChars), truncated: true } : { type: 'text' as const, value: s };
  };
  if (raw.t === 'inlineStr') return raw.inline === '' ? undefined : text(raw.inline);
  if (raw.v === '') return undefined;
  if (raw.t === 's') {
    if (ctx.counting) return { type: 'text', value: '' };
    const shared = ctx.sharedStrings[Number(raw.v)];
    return shared === undefined ? refuse('malformed') : text(shared);
  }
  if (raw.t === 'str') return text(raw.v);
  if (raw.t === 'b') return { type: 'boolean', value: raw.v === '1' };
  if (raw.t === 'e') return { type: 'error', value: raw.v };
  const number = Number(raw.v);
  if (!Number.isFinite(number)) return text(raw.v); // JSON has no Infinity
  const style = ctx.styles[raw.s];
  const date = style?.date ? dateText(number, ctx.date1904) : undefined;
  if (date !== undefined) return { type: 'date', value: date, serial: number };
  return { type: 'number', value: number, ...(style?.format !== undefined && { format: style.format }) };
}

export interface SheetRead {
  cells: Generator<SheetCell>;
  /** Filled as `cells` runs: merged ranges come after the cells in a sheet's XML. */
  merged: string[];
}

/** The cells of `xml` in file order; empty ones are left out. An address that isn't one is refused. */
export function readSheet(xml: string, ctx: SheetContext): SheetRead {
  const merged: string[] = [];
  return { merged, cells: walk(xml, ctx, merged) };
}

const isTrue = (v: string | undefined) => v === '1' || v === 'true';

function* walk(xml: string, ctx: SheetContext, merged: string[]): Generator<SheetCell> {
  const shared = new Map<string, { formula: string; from: Cell }>();
  const cap = ctx.limits.cellChars + 1;
  let row = 0;
  let col = 0;
  let raw: Raw | undefined;
  let into: 'v' | 'f' | 'inline' | undefined;
  let phonetic = 0;
  let rowHidden = false;
  const hiddenColumns: { min: number; max: number }[] = [];
  // A stream keeps nothing, so a sheet's size costs only time, and the host's deadline has that.
  for (const e of xmlEvents(xml, { ...ctx.limits, xmlNodes: Infinity })) {
    if (e.type === 'text') {
      if (raw && into && phonetic === 0 && raw[into].length < cap) raw[into] += e.text.slice(0, cap - raw[into].length);
    } else if (e.type === 'open') {
      if (e.name === 'row') {
        row = e.attrs['r'] === undefined ? row + 1 : Number(e.attrs['r']);
        col = 0;
        rowHidden = isTrue(e.attrs['hidden']);
      } else if (e.name === 'col') {
        if (isTrue(e.attrs['hidden']) && hiddenColumns.length < ctx.limits.mergedRanges) hiddenColumns.push({ min: Number(e.attrs['min']), max: Number(e.attrs['max']) });
      } else if (e.name === 'c') {
        raw = { address: e.attrs['r'], t: e.attrs['t'], s: Number(e.attrs['s'] ?? 0), v: '', inline: '', f: '', fAttrs: undefined };
      } else if (raw && e.name === 'v') into = 'v';
      else if (raw && e.name === 'f') { into = 'f'; raw.fAttrs = e.attrs; }
      else if (raw && e.name === 't') into = 'inline';
      else if (e.name === 'rPh') phonetic++;
      else if (e.name === 'mergeCell' && merged.length < ctx.limits.mergedRanges && e.attrs['ref']) merged.push(e.attrs['ref']);
    } else if (e.name === 'rPh') phonetic--;
    else if (e.name === 'v' || e.name === 'f' || e.name === 't') into = undefined;
    else if (e.name === 'c' && raw) {
      const at = readAddress(raw.address ?? `${columnName(col + 1)}${Math.max(row, 1)}`);
      if (!at) refuse('malformed');
      col = at!.col;
      const cell = finished(raw, at!, ctx, shared);
      raw = undefined;
      if (cell) yield rowHidden || hiddenColumns.some((h) => col >= h.min && col <= h.max) ? { ...cell, hidden: true } : cell;
    }
  }
}

/** The whole cell: its value, and its formula, a shared one moved from where it was written out. */
function finished(raw: Raw, at: Cell, ctx: SheetContext, shared: Map<string, { formula: string; from: Cell }>): SheetCell | undefined {
  const value = valueOf(raw, ctx);
  const si = raw.fAttrs?.['t'] === 'shared' ? raw.fAttrs['si'] : undefined;
  let formula: string | undefined = raw.f || undefined;
  if (si !== undefined) {
    if (formula) shared.set(si, { formula, from: at });
    else {
      const first = shared.get(si);
      if (first) formula = movedFormula(first.formula, { col: at.col - first.from.col, row: at.row - first.from.row });
    }
  }
  if (!value && !formula) return undefined;
  return { ...at, ...(value ?? { type: 'empty' as const, value: null }), ...(formula && { formula: formula.slice(0, ctx.limits.cellChars) }) };
}
