// One read of one hostile file, in a thread of its own (chat-read.ts): if it hangs the board is still
// answering, and the thread is stopped at the deadline. It has no environment and writes nothing; what it
// sends back is data, saved by the caller under names of the caller's own. Any failure is a refusal code,
// never the error's own text, since a parser's message can quote the file.
import { parentPort, workerData } from 'node:worker_threads';
import { DocumentRefused, expandZip, readCells, readDocx, readWorkbook } from '#documents';

/** What the caller asks: the kind by the file's name, its bytes, and for Excel which cells. */
export interface ReadJob { kind: 'docx' | 'xlsx' | 'zip'; bytes: Uint8Array; sheet?: string | undefined; range?: string | undefined }

function run({ kind, bytes, sheet, range }: ReadJob) {
  if (kind === 'docx') return readDocx(bytes);
  if (kind === 'zip') return expandZip(bytes);
  return sheet === undefined ? readWorkbook(bytes) : readCells(bytes, sheet, range);
}

/** Each file's own buffer, sent, not copied. */
const buffers = (answer: object) => ((answer as { files?: { bytes: Uint8Array }[]; pictures?: { bytes: Uint8Array }[] }).files
  ?? (answer as { pictures?: { bytes: Uint8Array }[] }).pictures ?? []).map((f) => f.bytes.buffer as ArrayBuffer);

try {
  const answer = run(workerData as ReadJob);
  parentPort!.postMessage({ answer }, buffers(answer));
} catch (err) {
  parentPort!.postMessage({ refused: err instanceof DocumentRefused ? err.code : 'malformed' });
}
