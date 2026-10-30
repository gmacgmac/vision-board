// The guard every archive passes before anything is inflated: it reads the archive's own table and
// believes none of it until checked. Ported from KiroCrew (`src/kiro_crew/zip_vet.py`, Apache-2.0, see
// this package's NOTICE): cap the central directory's bytes, not only its count; refuse ZIP64 rather than
// parse it; fail closed. Changed: rewritten in TypeScript, over bytes in memory; it goes on to read every
// record, because we use no library's inventory (fflate's `unzipSync` is never called, so no hang in it
// can be reached). It refuses encryption, other methods, links, duplicate names, a local header that
// disagrees with the central one, and entries that overlap (one compressed stream counted many times).
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import { refuse } from './refused.ts';
import { isLinkEntry } from './zip-names.ts';

export interface ZipEntry {
  /** The name as the archive writes it: hostile until `entryPath` has read it. */
  name: string;
  folder: boolean;
  method: 0 | 8;
  compressedBytes: number;
  /** The real size the archive declares: a claim until `readEntry` has counted it. */
  declaredBytes: number;
  dataStart: number;
}

const END_SIGNATURE = 0x06054b50;
const END_BYTES = 22;
const MAX_COMMENT = 65535;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_LOCATOR_BYTES = 20;
const CENTRAL_SIGNATURE = 0x02014b50;
const CENTRAL_BYTES = 46;
const LOCAL_SIGNATURE = 0x04034b50;
const LOCAL_BYTES = 30;
const SATURATED_16 = 0xffff;
const SATURATED_32 = 0xffffffff;
const ZIP64_EXTRA = 0x0001;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_STRONG_ENCRYPTION = 0x0040;
const FLAG_MASKED_HEADERS = 0x2000;
const ENCRYPTED = FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION | FLAG_MASKED_HEADERS;
const FLAG_UTF8 = 0x0800;
const METHOD_AES = 99;

const utf8 = new TextDecoder('utf-8', { fatal: true });
const latin1 = new TextDecoder('latin1');

/** The end record: the last one whose comment ends exactly at the end of the file. */
function findEnd(view: DataView): number {
  const last = view.byteLength - END_BYTES;
  for (let at = last; at >= 0 && at >= last - MAX_COMMENT; at--) {
    if (view.getUint32(at, true) === END_SIGNATURE && at + END_BYTES + view.getUint16(at + 20, true) === view.byteLength) return at;
  }
  return refuse('notZip');
}

/** Where the table is: its count, size and offset, checked against each other and the file. */
function directory(view: DataView, end: number, limits: Limits): { count: number; start: number; bytes: number } {
  const count = view.getUint16(end + 10, true);
  const bytes = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  const locator = end >= ZIP64_LOCATOR_BYTES && view.getUint32(end - ZIP64_LOCATOR_BYTES, true) === ZIP64_LOCATOR;
  if (locator || count === SATURATED_16 || bytes === SATURATED_32 || start === SATURATED_32) refuse('zip64');
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 || view.getUint16(end + 8, true) !== count) refuse('malformed');
  if (count > limits.entries || bytes > limits.entries * limits.centralEntryBytes) refuse('tooMany');
  if (start + bytes > end) refuse('malformed');
  return { count, start, bytes };
}

function hasZip64Extra(view: DataView, start: number, bytes: number): boolean {
  let at = start;
  while (at + 4 <= start + bytes) {
    if (view.getUint16(at, true) === ZIP64_EXTRA) return true;
    at += 4 + view.getUint16(at + 2, true);
  }
  return false;
}

/** The name in `raw`: UTF-8 when the record says so (and it must be), else one byte a character. */
function nameOf(raw: Uint8Array, flags: number): string {
  if (!(flags & FLAG_UTF8)) return latin1.decode(raw);
  try { return utf8.decode(raw); } catch { return refuse('badName'); }
}

/** Where the data starts, from the local header, which must agree with the central record. */
function dataStartOf(bytes: Uint8Array, view: DataView, offset: number, rawName: Uint8Array, method: number, limit: number): number {
  if (offset + LOCAL_BYTES > limit || view.getUint32(offset, true) !== LOCAL_SIGNATURE) return refuse('malformed');
  if (view.getUint16(offset + 8, true) !== method) return refuse('malformed');
  if (view.getUint16(offset + 6, true) & ENCRYPTED) return refuse('encrypted');
  const nameBytes = view.getUint16(offset + 26, true);
  const start = offset + LOCAL_BYTES + nameBytes + view.getUint16(offset + 28, true);
  const local = bytes.subarray(offset + LOCAL_BYTES, offset + LOCAL_BYTES + nameBytes);
  if (start > limit || nameBytes !== rawName.length || !local.every((b, i) => b === rawName[i])) return refuse('malformed');
  return start;
}

/** One central record at `at`: the entry, and where the next record starts. */
function record(bytes: Uint8Array, view: DataView, at: number, end: number, directoryStart: number): { entry: ZipEntry; next: number } {
  if (at + CENTRAL_BYTES > end || view.getUint32(at, true) !== CENTRAL_SIGNATURE) refuse('malformed');
  const flags = view.getUint16(at + 8, true);
  const method = view.getUint16(at + 10, true);
  const compressedBytes = view.getUint32(at + 20, true);
  const declaredBytes = view.getUint32(at + 24, true);
  const nameBytes = view.getUint16(at + 28, true);
  const extraBytes = view.getUint16(at + 30, true);
  const offset = view.getUint32(at + 42, true);
  const nameStart = at + CENTRAL_BYTES;
  const next = nameStart + nameBytes + extraBytes + view.getUint16(at + 32, true);
  if (next > end) refuse('malformed');
  if (flags & ENCRYPTED || method === METHOD_AES) refuse('encrypted');
  if (compressedBytes === SATURATED_32 || declaredBytes === SATURATED_32 || offset === SATURATED_32 || hasZip64Extra(view, nameStart + nameBytes, extraBytes)) refuse('zip64');
  if (method !== 0 && method !== 8) refuse('method');
  if (isLinkEntry(view.getUint16(at + 4, true), view.getUint32(at + 38, true))) refuse('link');
  const rawName = bytes.subarray(nameStart, nameStart + nameBytes);
  const name = nameOf(rawName, flags);
  const folder = name.endsWith('/');
  if ((folder && declaredBytes !== 0) || (method === 0 && compressedBytes !== declaredBytes)) refuse('malformed');
  const dataStart = dataStartOf(bytes, view, offset, rawName, method, directoryStart);
  if (dataStart + compressedBytes > directoryStart) refuse('malformed');
  return { entry: { name, folder, method: method as 0 | 8, compressedBytes, declaredBytes, dataStart }, next };
}

/** Every entry of the archive, after its declared sizes and shape have passed; refuses otherwise. Nothing is inflated. */
export function zipGuard(bytes: Uint8Array, limits: Limits = LIMITS): ZipEntry[] {
  if (bytes.length < END_BYTES) refuse('notZip');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEnd(view);
  const dir = directory(view, end, limits);
  const entries: ZipEntry[] = [];
  let at = dir.start;
  for (let i = 0; i < dir.count; i++) {
    const { entry, next } = record(bytes, view, at, dir.start + dir.bytes, dir.start);
    entries.push(entry);
    at = next;
  }
  if (at !== dir.start + dir.bytes) refuse('malformed');
  checkInventory(entries, limits);
  return entries;
}

/** Declared sizes within the limits, no name twice, and no two entries over the same bytes. */
function checkInventory(entries: ZipEntry[], limits: Limits): void {
  const names = new Set<string>();
  let total = 0;
  for (const e of entries) {
    if (names.has(e.name)) refuse('malformed');
    names.add(e.name);
    total += e.declaredBytes;
    if (e.declaredBytes > limits.entryBytes || total > limits.totalBytes) refuse('tooBig');
  }
  const inOrder = entries.filter((e) => e.compressedBytes > 0).sort((a, b) => a.dataStart - b.dataStart);
  inOrder.forEach((e, i) => { if (i > 0 && e.dataStart < inOrder[i - 1]!.dataStart + inOrder[i - 1]!.compressedBytes) refuse('malformed'); });
}
