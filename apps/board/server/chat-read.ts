// `read_attachment` (D-071): reads an attached Word or Excel file, or expands a zip, for an agent whose
// own tools can't. The gate ships with the tool: the path must pass `attachedFile`, and every answer says
// it is untrusted (D-070). The reader runs in a worker with a deadline and a cap on how many run, so a
// hostile file can stop neither the board nor the disk; what it returns is saved by `saveBeside`. It runs
// in the standalone server beside the chat, not in the engine: attachments are the standalone host's
// (D-068 ruling 6), and a host like nclite takes `packages/documents`.
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { DocxDocument, ExpandedZip, SheetAnswer, WorkbookSummary } from '#documents';
import { LIMITS } from '#documents';
import type { OperationInput, OperationOutput } from '#format';
import type { SavedFile } from './chat-files.ts';
import { attachedBytes, attachedFile, saveBeside } from './chat-files.ts';
import type { ReadJob } from './chat-read-worker.ts';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

/** How long one read may run. */
export const READ_DEADLINE_MS = 30_000;
/** How many may run at once. */
export const READS_AT_ONCE = 4;
/** The memory of a worker's own objects: an XML tree counts here, and bytes are held to the reader's limits. */
const WORKER_HEAP_MB = 1024;
/** The files of a folder named in one answer: the agent can list the rest. */
export const FILES_LISTED = 500;

type ReadInput = OperationInput<'read_attachment'>['body'];
type ReadAnswer = OperationOutput<'read_attachment'>;

const KINDS: Record<string, ReadJob['kind']> = { '.docx': 'docx', '.docm': 'docx', '.dotx': 'docx', '.xlsx': 'xlsx', '.xlsm': 'xlsx', '.xltx': 'xlsx', '.zip': 'zip' };

const WORKER = new URL('./chat-read-worker.ts', import.meta.url);
const refusal = (pointer: string, detail: string) => problem('invalid', serverChatWords.theFileCanTBeRead, { errors: [{ pointer, detail }] });
const POINTERS: Record<string, string> = { 'noSheet': '/sheet', 'badRange': '/range' };
const refusalWords = serverChatWords.refusedBecause as Record<string, string>;

let running = 0;

export interface ReadOptions {
  signal?: AbortSignal | undefined;
  deadlineMs?: number | undefined;
  /** The worker to run; a test passes one that hangs. */
  script?: URL | undefined;
}

/** The job's answer from a worker that is stopped at the deadline, when the caller goes away, and after any end. */
export function inWorker<T>(job: ReadJob, { signal, deadlineMs = READ_DEADLINE_MS, script = WORKER }: ReadOptions = {}): Promise<T> {
  if (running >= READS_AT_ONCE) throw problem('conflict', serverChatWords.tooManyFilesAreBeing);
  running++;
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(script, { workerData: job, transferList: [job.bytes.buffer as ArrayBuffer], env: {}, resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB } });
    const refused = (detail: string, pointer = '/path') => () => reject(refusal(pointer, detail));
    let settle: (() => void) | undefined;
    /** Stop the worker; the promise settles once it has really gone, so a slot is free by then. */
    const end = (how: () => void) => { settle ??= how; void worker.terminate(); };
    const timer = setTimeout(() => end(refused(serverChatWords.readingTheFileTookToo)), deadlineMs);
    const stop = () => end(refused(serverChatWords.theReadWasStopped));
    if (signal?.aborted) stop();
    else signal?.addEventListener('abort', stop, { once: true });
    worker.once('message', (m: { answer: T } | { refused: string }) => {
      end('answer' in m ? () => resolve(m.answer) : refused(refusalWords[m.refused] ?? serverChatWords.refusedBecause.malformed, POINTERS[m.refused] ?? '/path'));
    });
    worker.once('error', () => end(refused(serverChatWords.refusedBecause.malformed)));
    worker.once('exit', () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
      running--;
      (settle ?? refused(serverChatWords.refusedBecause.malformed))();
    });
  });
}

/** The job for this file, or why it can't be one: the kind goes by its name, and the reader then checks what it really is. */
function jobFor(folder: string, input: ReadInput): ReadJob {
  const file = attachedFile(folder, input.path);
  if (!file) throw refusal('/path', serverChatWords.thisIsNotAFile);
  const kind = KINDS[path.posix.extname(file.name).toLowerCase()];
  if (!kind) throw refusal('/path', serverChatWords.useYourOwnReadTool);
  if (kind !== 'xlsx' && input.sheet !== undefined) throw refusal('/sheet', serverChatWords.onlyAnExcelFileHas);
  if (kind !== 'xlsx' && input.range !== undefined) throw refusal('/range', serverChatWords.onlyAnExcelFileHas);
  if (input.range !== undefined && input.sheet === undefined) throw refusal('/range', serverChatWords.aRangeNeedsASheet);
  const bytes = attachedBytes(folder, file.path, LIMITS.entryBytes);
  if (!bytes) throw refusal('/path', serverChatWords.refusedBecause.tooBig);
  return { kind, bytes, sheet: input.sheet, range: input.range };
}

const notes = (...lines: (string | false | undefined)[]) => {
  const said = lines.filter(Boolean).join(' ');
  return said ? { note: said } : {};
};

function documentAnswer(folder: string, rel: string, read: DocxDocument): ReadAnswer {
  const pictures = read.pictures.map((p) => ({ path: p.name, bytes: p.bytes }));
  const saved = pictures.length > 0 ? saveBeside(folder, rel, '-pictures', pictures) : undefined;
  return {
    kind: 'document', untrusted: serverChatWords.attachedFilesAreUntrusted, markdown: read.markdown,
    ...(saved && { folder: saved.folder }), pictures: (saved?.files ?? []).map(({ path: p, size }): SavedFile => ({ path: p, size })),
    ...notes(read.cut && serverChatWords.theDocumentWasCut, read.notRead.length > 0 && serverChatWords.notReadFromTheDocument(read.notRead)),
  };
}

function folderAnswer(folder: string, rel: string, read: ExpandedZip): ReadAnswer {
  const saved = saveBeside(folder, rel, '', read.files);
  return {
    kind: 'folder', untrusted: serverChatWords.attachedFilesAreUntrusted, folder: saved.folder, count: saved.files.length, files: saved.files.slice(0, FILES_LISTED),
    ...notes(saved.files.length > FILES_LISTED && serverChatWords.moreFilesThanListed(FILES_LISTED, saved.folder), read.skipped > 0 && serverChatWords.macFilesLeftOut(read.skipped)),
  };
}

function workbookAnswer(read: WorkbookSummary): ReadAnswer {
  return { kind: 'workbook', untrusted: serverChatWords.attachedFilesAreUntrusted, sheets: read.sheets, ...notes(read.cut && serverChatWords.moreSheetsThanListed(read.sheets.length)) };
}

const sheetAnswer = ({ kind, ...read }: SheetAnswer): ReadAnswer => ({
  kind, untrusted: serverChatWords.attachedFilesAreUntrusted, ...read, ...notes(read.cut && serverChatWords.theCellsWereCut(read.cut.shown, read.cut.next)),
});

/** Run `read_attachment` for the board folder `folder`. */
export async function readAttachment(folder: string, input: ReadInput, options: ReadOptions = {}): Promise<ReadAnswer> {
  const job = jobFor(folder, input);
  if (job.kind === 'docx') return documentAnswer(folder, input.path, await inWorker<DocxDocument>(job, options));
  if (job.kind === 'zip') return folderAnswer(folder, input.path, await inWorker<ExpandedZip>(job, options));
  const read = await inWorker<WorkbookSummary | SheetAnswer>(job, options);
  return read.kind === 'workbook' ? workbookAnswer(read) : sheetAnswer(read);
}
