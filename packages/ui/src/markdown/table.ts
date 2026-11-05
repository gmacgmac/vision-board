// Markdown, GFM tables (D-023 extended by markdownMore, PLAN decision 8): splitting a row into cells,
// reading the delimiter row, and the table's markup. A table has at most MAX_COLUMNS columns; one
// with more is not recognised, so it stays paragraph text. blocks.ts decides where a table starts
// and ends (GFM: the paragraph's last line is the header row, a blank line or another block ends it).

export type Align = '' | 'left' | 'center' | 'right';

/** Columns a table may have (PLAN decision 8): more, and the lines stay text. */
export const MAX_COLUMNS = 4;

const DELIMITER_CELL = /^:?-+:?$/;

/** A row's cells, trimmed: an outer pipe on either side is dropped, `\|` is a pipe inside a cell
 * (GFM: escape it to put a pipe in a cell, inside code too). Any other backslash is left for inline.ts. */
export function splitRow(line: string): string[] {
  const s = line.trim();
  const cells: string[] = [];
  let cell = '';
  let i = s[0] === '|' ? 1 : 0;
  for (; i < s.length; i += 1) {
    const c = s[i]!;
    // A backslash takes the next character with it (so `\\|` is a backslash, then a cell boundary).
    if (c === '\\' && i + 1 < s.length) { cell += s[i + 1] === '|' ? '|' : c + s[i + 1]; i += 1; } else if (c === '|') { cells.push(cell.trim()); cell = ''; } else cell += c;
  }
  // A last pipe closes the row rather than opening an empty cell.
  if (cell.trim() !== '' || s.at(-1) !== '|' || s.length === 1) cells.push(cell.trim());
  return cells;
}

/** The delimiter row's alignments, or null when the line is not one: it holds a pipe and every cell
 * is dashes with an optional colon on either side, and it has at most MAX_COLUMNS cells. */
export function delimiterRow(line: string): Align[] | null {
  if (!line.includes('|')) return null;
  const cells = splitRow(line);
  if (cells.length > MAX_COLUMNS || !cells.every((c) => DELIMITER_CELL.test(c))) return null;
  return cells.map((c) => {
    const l = c[0] === ':', r = c.at(-1) === ':';
    return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
  });
}

/** The header line opens a table under this delimiter row only with the same number of cells. */
export const headerFits = (header: string, aligns: Align[]): boolean => splitRow(header).length === aligns.length;

/** The table's markup: lines[0] is the header row, the rest are body rows. A short row is padded with
 * empty cells and a long one cut (GFM); `inline` renders a cell's text. */
export function tableHtml(lines: string[], aligns: Align[], inline: (s: string) => string): string {
  const row = (line: string, tag: 'th' | 'td') => {
    const cells = splitRow(line);
    return `<tr>${aligns.map((a, i) => {
      const cls = a ? ` class="vb-md-${a}"` : '';
      const scope = tag === 'th' ? ' scope="col"' : '';
      return `<${tag}${scope}${cls}>${inline(cells[i] ?? '')}</${tag}>`;
    }).join('')}</tr>`;
  };
  const [head = '', ...body] = lines;
  const tbody = body.length ? `<tbody>${body.map((l) => row(l, 'td')).join('')}</tbody>` : '';
  return `<table class="vb-md-table"><thead>${row(head, 'th')}</thead>${tbody}</table>`;
}
