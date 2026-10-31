// The files chat-attach-pages.spec.ts attaches, built here with no tool and no file from outside: PDFs, and
// PNGs of a size. A PDF is plain text with an offset table, so what each one holds can be read below.
import { deflateSync } from 'node:zlib';

/** `hex` shown in a font no file holds, as a word processor writes CJK to save space: it is read only through a predefined CMap. */
type NotEmbedded = { encoding: string; baseFont: string; ordering: string; subtype: 'CIDFontType0' | 'CIDFontType2'; hex: string };
type Page = { text?: string; image?: { width: number; height: number; filter?: string; bytes: Buffer }; font?: NotEmbedded; box?: [number, number] };

const notEmbedded = ({ encoding, baseFont, ordering, subtype }: NotEmbedded) => `<< /Type /Font /Subtype /Type0 /BaseFont /${baseFont} /Encoding /${encoding} /DescendantFonts [<< /Type /Font /Subtype /${subtype} /BaseFont /${baseFont} /CIDSystemInfo << /Registry (Adobe) /Ordering (${ordering}) /Supplement 2 >> /FontDescriptor << /Type /FontDescriptor /FontName /${baseFont} /Flags 6 /FontBBox [-25 -254 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 80 >> >>] >>`;
/** Chinese in a font not in the file, by its Unicode encoding. */
export const CHINESE: NotEmbedded = { encoding: 'UniGB-UTF16-H', baseFont: 'STSong-Light', ordering: 'GB1', subtype: 'CIDFontType0', hex: '4E2D65876D4B8BD5' };
/** Korean, the same way. */
export const KOREAN: NotEmbedded = { encoding: 'UniKS-UTF16-H', baseFont: 'HYGoThic-Medium', ordering: 'Korea1', subtype: 'CIDFontType0', hex: 'D55CAE00D14CC2A4D2B8' };
/** A CMap that exists nowhere, so the font can't be read at all: nothing can draw these. */
export const UNREADABLE: NotEmbedded = { encoding: 'NoSuchCMap-H', baseFont: 'NoSuchFont', ordering: 'Identity', subtype: 'CIDFontType0', hex: '0102030405060708' };
export interface PdfOptions { script?: string; encrypted?: boolean }

const stream = (dict: string, bytes: Buffer) => Buffer.concat([Buffer.from(`<< ${dict} /Length ${bytes.length} >>\nstream\n`), bytes, Buffer.from('\nendstream')]);

/** A PDF of `pages`, A5-ish, each with text or a picture filling most of it. */
export function pdf(pages: Page[], options: PdfOptions = {}): Buffer {
  const objects: Buffer[] = [];
  const add = (body: Buffer | string) => objects.push(typeof body === 'string' ? Buffer.from(body) : body);
  const first = 4; // 1 the catalog, 2 the pages, 3 the font; then each page's three
  const kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(' ');
  const action = options.script ? ` /OpenAction << /S /JavaScript /JS (${options.script}) >> /Names << /JavaScript << /Names [(a) << /S /JavaScript /JS (${options.script}) >>] >> >>` : '';
  add(`<< /Type /Catalog /Pages 2 0 R${action} >>`);
  add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((p, i) => {
    const n = first + i * 3;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.box?.[0] ?? 420} ${p.box?.[1] ?? 595}] /Resources << /Font << /F1 3 0 R${p.font ? ` /F2 ${notEmbedded(p.font)}` : ''} >> /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    const drawn = p.font ? `BT /F2 48 Tf 40 400 Td <${p.font.hex}> Tj ET` : p.image ? `q ${(p.box?.[0] ?? 420) - 60} 0 0 ${(p.box?.[1] ?? 595) - 95} 30 50 cm /Im0 Do Q` : `BT /F1 28 Tf 40 500 Td (${p.text ?? `Page ${i + 1}`}) Tj ET`;
    add(stream('', Buffer.from(drawn)));
    const image = p.image ?? { width: 1, height: 1, bytes: Buffer.from([255, 255, 255]) };
    add(stream(`/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height}${image.filter ? ` /Filter /${image.filter}` : ' /ColorSpace /DeviceRGB /BitsPerComponent 8'}`, image.bytes));
  });
  // A password no one here knows: the numbers check nothing an empty password can pass.
  if (options.encrypted) add(`<< /Filter /Standard /V 1 /R 2 /O <${'ab'.repeat(32)}> /U <${'cd'.repeat(32)}> /P -4 >>`);
  return assemble(objects, options.encrypted ? ` /Encrypt ${objects.length} 0 R /ID [<00> <00>]` : '');
}

function assemble(objects: Buffer[], trailer: string): Buffer {
  const parts: Buffer[] = [Buffer.from('%PDF-1.5\n')];
  let at = parts[0]!.length;
  const offsets = objects.map((body, i) => {
    const whole = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]);
    parts.push(whole);
    const offset = at;
    at += whole.length;
    return offset;
  });
  const table = offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${table}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${trailer} >>\nstartxref\n${at}\n%%EOF\n`));
  return Buffer.concat(parts);
}

/** `width` x `height` of noise that won't compress, as a PDF's raw picture: a page of it draws to a heavy PNG. */
export const noisePicture = (width: number, height: number) => {
  const bytes = Buffer.alloc(width * height * 3);
  let x = 2463534242;
  for (let i = 0; i < bytes.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; bytes[i] = x & 255; }
  return { width, height, bytes };
};

/** `width` x `height` of one red, as a PDF's raw picture. */
export const redPicture = (width: number, height: number) => ({ width, height, bytes: Buffer.alloc(width * height * 3, Buffer.from([220, 20, 20])) });

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = ~0; for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8); return ~c >>> 0; };
function chunk(type: string, data: Buffer): Buffer {
  const typed = Buffer.concat([Buffer.from(type), data]);
  const [length, sum] = [Buffer.alloc(4), Buffer.alloc(4)];
  length.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(typed));
  return Buffer.concat([length, typed, sum]);
}

/** A real PNG, RGB: `flat`, one colour, which is small whatever its size; `noise`, which won't compress, so about 3 bytes a pixel. */
export function png(width: number, height: number, fill: 'flat' | 'noise' = 'flat'): Buffer {
  const row = width * 3 + 1;
  const raw = Buffer.alloc(row * height, 0x40);
  let x = 2463534242;
  if (fill === 'noise') for (let i = 0; i < raw.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; raw[i] = x & 255; }
  for (let y = 0; y < height; y++) raw[y * row] = 0;
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head.set([8, 2], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}

/** A 16 x 16 red JPEG 2000, as a scanner might put in a PDF (made once with macOS `sips`): it decodes only by the wasm inside the frame's script. */
export const RED_JP2 = Buffer.from('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', 'base64');
