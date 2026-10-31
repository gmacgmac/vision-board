// A sheet's real size, for the list of sheets (VERIFY_01 F8): counted from its cells, so no `dimension` record is asked,
// and a sheet too big or too damaged to count says so, so it can't hide the list.
import { rangeText } from './a1.ts';
import type { Limits } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import { DocumentRefused } from './refused.ts';
import { readSheet } from './xlsx-cells.ts';

export interface SheetSizes { rows: number; columns: number; cells: number; formulas: number; used?: string }

/** One sheet's real size, counted from its cells: a `dimension` record is not asked, and no string is looked up. */
function sizes(xml: string, limits: Limits): SheetSizes {
  const out = { rows: 0, columns: 0, cells: 0, formulas: 0 };
  const rows = new Set<number>();
  const box = { minCol: Infinity, maxCol: 0, minRow: Infinity, maxRow: 0 };
  for (const c of readSheet(xml, { sharedStrings: [], styles: [], date1904: false, limits, counting: true }).cells) {
    out.cells++;
    if (c.formula) out.formulas++;
    rows.add(c.row);
    box.minCol = Math.min(box.minCol, c.col); box.maxCol = Math.max(box.maxCol, c.col);
    box.minRow = Math.min(box.minRow, c.row); box.maxRow = Math.max(box.maxRow, c.row);
  }
  if (out.cells === 0) return out;
  out.rows = rows.size;
  out.columns = box.maxCol - box.minCol + 1;
  return { ...out, used: rangeText({ from: { col: box.minCol, row: box.minRow }, to: { col: box.maxCol, row: box.maxRow } }) };
}

/** Sizes of as many sheets as fit in the budget, smallest first, so one big sheet can't hide the others; the rest say they weren't counted. */
export function countedSizes<S extends { part: string | undefined }>(file: OoxmlPackage, shown: S[], limits: Limits): Map<S, SheetSizes | { counted: false }> {
  const out = new Map<S, SheetSizes | { counted: false }>();
  let left = limits.scanBytes;
  const size = (s: S) => (s.part === undefined ? 0 : file.sizeOf(s.part));
  for (const s of [...shown].sort((a, b) => size(a) - size(b))) {
    left -= size(s);
    if (left < 0) { out.set(s, { counted: false }); continue; }
    try {
      const xml = s.part === undefined ? undefined : file.text(s.part);
      out.set(s, xml === undefined ? sizes('<worksheet/>', limits) : sizes(xml, limits));
    } catch (err) {
      if (!(err instanceof DocumentRefused)) throw err;
      out.set(s, { counted: false });
    }
  }
  return out;
}
