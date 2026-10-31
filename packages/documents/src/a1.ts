// A1 addresses and ranges: `B2`, `B2:F20`. Pure. A column or row past Excel's own limits is no address,
// so a hostile row number can't make anything count to it.
import { refuse } from './refused.ts';

const MAX_COLUMN = 16384; // XFD
const MAX_ROW = 1048576;
const ADDRESS = /^([A-Za-z]{1,3})([1-9]\d{0,6})$/;

export interface Cell { col: number; row: number }
export interface Range { from: Cell; to: Cell }

export function columnName(col: number): string {
  let out = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
  return out;
}

export const addressOf = ({ col, row }: Cell): string => `${columnName(col)}${row}`;

/** `text` as a cell, or undefined when it is no address on a sheet. */
export function readAddress(text: string): Cell | undefined {
  const m = ADDRESS.exec(text);
  if (!m) return undefined;
  let col = 0;
  for (const ch of m[1]!.toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64;
  const row = Number(m[2]);
  return col <= MAX_COLUMN && row <= MAX_ROW ? { col, row } : undefined;
}

/** `B2:F20` or `B2`, either way round; refused when it is neither. */
export function readRange(text: string): Range {
  const plain = text.replace(/\$/g, ''); // as formulas write it: `$F$20`
  const [a, b, ...rest] = plain.split(':').map(readAddress);
  if (!a || rest.length > 0 || (plain.includes(':') && !b)) return refuse('badRange');
  const other = b ?? a;
  return {
    from: { col: Math.min(a.col, other.col), row: Math.min(a.row, other.row) },
    to: { col: Math.max(a.col, other.col), row: Math.max(a.row, other.row) },
  };
}

export const rangeText = ({ from, to }: Range): string => `${addressOf(from)}:${addressOf(to)}`;
export const inRange = ({ from, to }: Range, { col, row }: Cell): boolean => col >= from.col && col <= to.col && row >= from.row && row <= to.row;
export const WHOLE_SHEET: Range = { from: { col: 1, row: 1 }, to: { col: MAX_COLUMN, row: MAX_ROW } };

// A reference in a formula. Strings and quoted sheet names go first so nothing inside them moves; a name
// followed by `(` is a function and one followed by `!` a sheet. `A:C` and `2:9` are whole columns and rows.
const REFERENCE = /"[^"]*"|'[^']*'|(?<![A-Za-z0-9_.$])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(!.])|(?<![A-Za-z0-9_.$])(\$?)([A-Z]{1,3}):(\$?)([A-Z]{1,3})(?![A-Za-z0-9_(!.])|(?<![A-Za-z0-9_.$:])(\$?)(\d{1,7}):(\$?)(\d{1,7})(?![A-Za-z0-9_(!.:])/g;
const BROKEN = '#REF!';

const letters = (name: string) => [...name].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

function movedColumn(fixed: string, name: string, by: number): string {
  if (fixed) return `$${name}`;
  const col = letters(name) + by;
  return col >= 1 && col <= MAX_COLUMN ? columnName(col) : BROKEN;
}

function movedRow(fixed: string, row: string, by: number): string {
  if (fixed) return `$${row}`;
  const moved = Number(row) + by;
  return moved >= 1 && moved <= MAX_ROW ? String(moved) : BROKEN;
}

/** A shared formula as the cell `by` away from its first cell has it: each relative reference moved. */
export function movedFormula(formula: string, by: Cell): string {
  return formula.replace(REFERENCE, (all: string, f1?: string, c1?: string, f2?: string, r1?: string, f3?: string, c2?: string, f4?: string, c3?: string, f5?: string, r2?: string, f6?: string, r3?: string) => {
    if (c1 !== undefined) {
      const [col, row] = [movedColumn(f1!, c1, by.col), movedRow(f2!, r1!, by.row)];
      return col === BROKEN || row === BROKEN ? BROKEN : `${col}${row}`;
    }
    if (c2 !== undefined) return `${movedColumn(f3!, c2, by.col)}:${movedColumn(f4!, c3!, by.col)}`;
    if (r2 !== undefined) return `${movedRow(f5!, r2, by.row)}:${movedRow(f6!, r3!, by.row)}`;
    return all;
  });
}
