// What one document may cost. Every reader takes these as an argument (a pure function of bytes and
// limits), so a host can run tighter ones and a test can reach them cheaply. VERIFY_01 measures them.
const MIB = 1024 * 1024;

export const LIMITS = {
  /** Zip: entries in one archive, and what the central directory may hold for each (`zipGuard`). */
  entries: 2000,
  centralEntryBytes: 512,
  /** Zip: real bytes out of one entry, and out of the whole archive or one call. */
  entryBytes: 100 * MIB,
  totalBytes: 200 * MIB,
  /** Zip: folders deep, and the length of one entry's path. */
  depth: 16,
  pathChars: 512,
  /** XML: how deep, how many elements, how many attributes on one. */
  xmlDepth: 256,
  xmlNodes: 2_000_000,
  xmlAttributes: 256,
  /** Word: the Markdown that goes back, the columns of one table, the pictures of one document. */
  markdownChars: 200_000,
  tableColumns: 64,
  pictures: 200,
  /** Excel: sheets listed, cells and characters in one answer, one cell's text, merged ranges kept, shared strings. */
  sheets: 256,
  cells: 2000,
  sheetChars: 256 * 1024,
  cellChars: 8192,
  mergedRanges: 1000,
  sharedStrings: 2_000_000,
} as const;

export type Limits = { readonly [K in keyof typeof LIMITS]: number };
