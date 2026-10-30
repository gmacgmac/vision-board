// One entry's bytes, counted as they come: a declared size is a claim. DEFLATE turns 1 KB into about
// 1 MB at most, so feeding small chunks means the count is checked before a bomb can get far, and the
// first byte past what was declared ends it. So real bytes never pass what `zipGuard` already summed.
import { Inflate } from 'fflate';
import { DocumentRefused, refuse } from './refused.ts';
import type { ZipEntry } from './zip-guard.ts';

const CHUNK_BYTES = 16 * 1024;

/** The pieces joined: `size` bytes, exactly. */
function joined(pieces: Uint8Array[], size: number): Uint8Array {
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of pieces) { out.set(p, at); at += p.length; }
  return out;
}

function inflated(data: Uint8Array, entry: ZipEntry): Uint8Array {
  const pieces: Uint8Array[] = [];
  let real = 0;
  const inflate = new Inflate((piece) => {
    real += piece.length;
    if (real > entry.declaredBytes) refuse('bomb');
    pieces.push(piece);
  });
  try {
    for (let at = 0; at < data.length; at += CHUNK_BYTES) inflate.push(data.subarray(at, at + CHUNK_BYTES), at + CHUNK_BYTES >= data.length);
  } catch (err) {
    if (err instanceof DocumentRefused) throw err;
    return refuse('malformed');
  }
  if (real !== entry.declaredBytes) refuse('malformed');
  return joined(pieces, real);
}

/** The entry's bytes, or a refusal; `data` is the whole archive. */
export function readEntry(bytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const data = bytes.subarray(entry.dataStart, entry.dataStart + entry.compressedBytes);
  if (entry.method === 8 && data.length > 0) return inflated(data, entry);
  if (data.length !== entry.declaredBytes) refuse('malformed');
  return data.slice();
}
