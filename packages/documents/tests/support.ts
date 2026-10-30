// Archives built in the test, byte by byte where a test needs a field to lie. No binary fixture comes from outside.
import { deflateSync } from 'fflate';

export interface RawEntry {
  name: string;
  data?: Uint8Array | string;
  /** Default: deflated. */
  method?: number;
  /** The real size to declare, when the test wants it to lie. */
  declared?: number;
  flags?: number;
  madeBy?: number;
  attributes?: number;
  extra?: Uint8Array;
  compressedDeclared?: number;
  offsetDeclared?: number;
}

const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
const bytesOf = (data: Uint8Array | string = '') => (typeof data === 'string' ? new TextEncoder().encode(data) : data);

/** The archive's parts, so a test can change one: the entries, the table, the end record. */
export function rawZip(entries: RawEntry[], end: { comment?: string; countDeclared?: number } = {}): Uint8Array {
  const locals: number[] = [];
  const central: number[] = [];
  for (const e of entries) {
    const name = new TextEncoder().encode(e.name);
    const plain = bytesOf(e.data);
    const method = e.method ?? 8;
    const body = method === 8 ? deflateSync(plain) : plain;
    const flags = e.flags ?? 0x0800;
    const extra = [...(e.extra ?? [])];
    const offset = locals.length;
    const sizes = [...u32(0), ...u32(e.compressedDeclared ?? body.length), ...u32(e.declared ?? plain.length)];
    const shared = [...u16(20), ...u16(flags), ...u16(method), ...u16(0), ...u16(0), ...sizes, ...u16(name.length), ...u16(extra.length)];
    locals.push(...u32(0x04034b50), ...shared, ...name, ...extra, ...body);
    central.push(...u32(0x02014b50), ...u16(e.madeBy ?? 20), ...shared, ...u16(0), ...u16(0), ...u16(0), ...u32(e.attributes ?? 0), ...u32(e.offsetDeclared ?? offset), ...name, ...extra);
  }
  const comment = new TextEncoder().encode(end.comment ?? '');
  const count = end.countDeclared ?? entries.length;
  return new Uint8Array([...locals, ...central, ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(count), ...u16(count), ...u32(central.length), ...u32(locals.length), ...u16(comment.length), ...comment]);
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const encode = (s: string) => new TextEncoder().encode(s);

/** One run of text in a paragraph, as `w:p` carries it. Shapes after KiroCrew `test/ooxml_fixtures.py` (Apache-2.0, see NOTICE). */
export const para = (text: string, props = '') => `<w:p>${props && `<w:pPr>${props}</w:pPr>`}<w:r><w:t>${text}</w:t></w:r></w:p>`;

export const cell = (text: string, props = '') => `<w:tc>${props && `<w:tcPr>${props}</w:tcPr>`}${para(text)}</w:tc>`;

/** A `.docx`'s bytes: `body` in `w:body`, and the other parts given by name. */
export function docx(body: string, parts: Record<string, string | Uint8Array> = {}): Uint8Array {
  const entries: RawEntry[] = [{ name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${body}</w:body></w:document>` }];
  for (const [name, data] of Object.entries(parts)) entries.push({ name, data: typeof data === 'string' ? encode(data) : data });
  return rawZip(entries);
}

export const wordXml = (root: string, inner: string) => `<w:${root} ${W}>${inner}</w:${root}>`;

export const rels = (rows: { id: string; target: string; external?: boolean }[]) =>
  `<Relationships xmlns="r">${rows.map((r) => `<Relationship Id="${r.id}" Type="t" Target="${r.target}"${r.external ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`;

const S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** A `.xlsx`'s bytes: each sheet's XML inside `worksheet`, by name; `extra` for `hidden` sheets and other parts. */
export function xlsx(sheets: Record<string, string>, extra: { hidden?: string[]; parts?: Record<string, string>; pr?: string } = {}): Uint8Array {
  const names = Object.keys(sheets);
  const book = `<workbook ${S}>${extra.pr ?? ''}<sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}"${extra.hidden?.includes(n) ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  const entries: RawEntry[] = [
    { name: 'xl/workbook.xml', data: book },
    { name: 'xl/_rels/workbook.xml.rels', data: rels(names.map((_, i) => ({ id: `rId${i + 1}`, target: `worksheets/sheet${i + 1}.xml` }))) },
    ...names.map((n, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: `<worksheet ${S}>${sheets[n]}</worksheet>` })),
    ...Object.entries(extra.parts ?? {}).map(([name, data]) => ({ name, data })),
  ];
  return rawZip(entries);
}
