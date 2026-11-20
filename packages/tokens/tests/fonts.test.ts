// The board's faces (D-102; packages/tokens/src/fonts.css, packages/tokens/fonts/): each @font-face names a file in
// fonts/ that opens as a WOFF2 font (its header, its Brotli stream, its table directory, the family in its name table
// and the weights it declares), sits beside its licence, and is the file the register records by SHA-256
// (docs/specification/dependencies.md § Vendored assets). Every type token names the board's faces before a host's (D-116),
// and falls back to the system's stacks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';

const at = (rel: string) => new URL(rel, import.meta.url);
const css = fs.readFileSync(at('../src/fonts.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const register = fs.readFileSync(at('../../../docs/specification/dependencies.md'), 'utf8');
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => ({
  family: /font-family:\s*'([^']+)'/.exec(m[1]!)?.[1],
  file: /url\('\.\.\/fonts\/([a-z-]+\.woff2)'\)/.exec(m[1]!)?.[1],
  weight: /font-weight:\s*([\d ]+);/.exec(m[1]!)?.[1]!.split(' ').map(Number),
  rest: m[1]!,
}));

/** The tags a WOFF2 directory names by index (the WOFF2 spec's known-table list, as far as these files need it). */
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** A WOFF2 file read as far as its tables: their tags, the typographic family, the wght axis or the one weight. */
function readWoff2(bytes: Buffer) {
  assert.equal(bytes.toString('latin1', 0, 4), 'wOF2', 'the WOFF2 signature');
  assert.equal(bytes.readUInt32BE(8), bytes.length, 'the length the header gives');
  const count = bytes.readUInt16BE(12);
  const pos = { i: 48 };
  const uint = () => { let v = 0; for (let k = 0; k < 5; k++) { const x = bytes[pos.i++]!; v = (v << 7) | (x & 0x7f); if (!(x & 0x80)) return v >>> 0; } throw new Error('a bad UIntBase128'); };
  const tables: { tag: string; length: number }[] = [];
  for (let t = 0; t < count; t++) {
    const flags = bytes[pos.i++]!;
    const tag = (flags & 0x3f) === 63 ? bytes.toString('latin1', pos.i, (pos.i += 4)) : KNOWN[flags & 0x3f]!;
    const length = uint();
    const version = flags >> 6;
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    tables.push({ tag, length: transformed ? uint() : length });
  }
  const stream = zlib.brotliDecompressSync(bytes.subarray(pos.i, pos.i + bytes.readUInt32BE(20)));
  let offset = 0;
  const data = new Map(tables.map((t) => { const d = stream.subarray(offset, offset + t.length); offset += t.length; return [t.tag, d]; }));
  assert.equal(offset, stream.length, 'the tables fill the stream');
  const name = data.get('name')!;
  const family = (id: number) => {
    for (let r = 0; r < name.readUInt16BE(2); r++) {
      const p = 6 + r * 12;
      if (name.readUInt16BE(p) !== 3 || name.readUInt16BE(p + 6) !== id) continue;
      const s = name.subarray(name.readUInt16BE(4) + name.readUInt16BE(p + 10), name.readUInt16BE(4) + name.readUInt16BE(p + 10) + name.readUInt16BE(p + 8));
      return String.fromCharCode(...Array.from({ length: s.length / 2 }, (_, k) => s.readUInt16BE(2 * k)));
    }
    return undefined;
  };
  const fvar = data.get('fvar');
  const wght = fvar && Array.from({ length: fvar.readUInt16BE(8) }, (_, a) => fvar.readUInt16BE(4) + a * fvar.readUInt16BE(10))
    .filter((p) => fvar.toString('latin1', p, p + 4) === 'wght').map((p) => [fvar.readInt32BE(p + 4) / 65536, fvar.readInt32BE(p + 12) / 65536])[0];
  return { tags: tables.map((t) => t.tag), family: family(16) ?? family(1), licence: family(13), weight: wght ?? [data.get('OS/2')!.readUInt16BE(4)] };
}

test('four faces, each a file in fonts/ that opens as a font of its family and weights, swapped in, beside its licence', () => {
  assert.deepEqual(faces.map((f) => f.family), ['vb-figtree', 'vb-bricolage-grotesque', 'vb-space-grotesk', 'vb-jetbrains-mono']);
  for (const face of faces) {
    assert.ok(face.file, `${face.family}: a file in ../fonts`);
    assert.match(face.rest, /format\('woff2'\)/);
    assert.match(face.rest, /font-display:\s*swap;/, `${face.family}: the fallback draws first, never blank text`);
    const font = readWoff2(fs.readFileSync(at(`../fonts/${face.file}`)));
    for (const tag of ['cmap', 'glyf', 'head', 'hmtx', 'name', 'OS/2']) assert.ok(font.tags.includes(tag), `${face.file} has ${tag}`);
    assert.equal(font.family!.replace(/ (Light|SemiBold)$/, '').toLowerCase().replaceAll(' ', '-'), face.family!.slice(3), `${face.file} is ${face.family}`);
    assert.deepEqual(font.weight, face.weight, `${face.file}: the weights the rule declares are the file's`);
    assert.match(font.licence!, /SIL Open Font License, Version 1\.1/);
    const licence = fs.readFileSync(at(`../fonts/${face.family!.slice(3)}-OFL.txt`), 'utf8');
    assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
  }
});

test('the register records each file and licence by its SHA-256', () => {
  for (const file of fs.readdirSync(at('../fonts/'))) {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(at(`../fonts/${file}`))).digest('hex');
    assert.ok(register.includes(`\`${file}\``) && register.includes(sha), `dependencies.md names ${file} with ${sha}`);
  }
});

test('every type token names the board\'s faces first, then a host\'s face, then the system stacks (D-116)', () => {
  const all = ['../src/tokens.css', '../src/skins.css'].map((f) => fs.readFileSync(at(f), 'utf8')).join('\n');
  const decls = [...all.matchAll(/(--vb-font-(?:text|display|label)):\s*([^;]+);/g)];
  assert.equal(decls.length, 6);
  for (const [, name, value] of decls) assert.match(value!, /^(?:'vb-[a-z-]+', )*var\(--vb-host-font(-mono)?, var\(--vb-font\1\)\)$/, `${name}: ${value}`);
});
