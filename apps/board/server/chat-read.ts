// `read_attachment` (D-071): reads an attached Word or Excel file, or expands a zip, for an agent whose
// own tools can't. The gate ships with the tool: the path must pass `attachedFile`, and every answer says
// it is untrusted (D-070). The reader runs in a worker with a deadline and a cap on how many run, so a
// hostile file can stop neither the board nor the disk; what it returns is saved by `saveBeside`. It runs
// in the standalone server beside the chat, not in the engine: attachments are the standalone host's
// (D-068 ruling 6), and a host like nclite takes `packages/documents`.
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { DocxDocument, DocxFound, ExpandedZip, SheetAnswer, WorkbookSummary } from '#documents';
import { LIMITS, canBeSeen } from '#documents';
import type { OperationInput, OperationOutput } from '#format';
import type { SavedFile } from './chat-files.ts';
import { attachedBytes, attachedFile, PICTURE_BYTES, saveBeside } from './chat-files.ts';
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
/** The pictures over the limit named in one answer. */
const OVER_NAMED = 10;
/** Files named in one line of a note. */
const NOTE_NAMES = 10;
const WHOLE_TEXT_FILE = 'document.md';
const PDF = /\.pdf$/i;
/** How deep a saved file's path starts: `.visionboard/attachments/<day>/<n>-<name>`. Past that it came from an archive. */
const TOP_STEPS = 4;
const PICTURE = /\.(?:png|jpe?g|gif|webp|bmp|tiff?|avif|heic|emf|wmf|svg)$/i;

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
  if (!kind) throw refusal('/path', PDF.test(file.name) && file.path.split('/').length > TOP_STEPS ? serverChatWords.aPdfInAFolder : serverChatWords.useYourOwnReadTool);
  if (kind !== 'xlsx' && input.sheet !== undefined) throw refusal('/sheet', serverChatWords.onlyAnExcelFileHas);
  if (kind !== 'xlsx' && input.range !== undefined) throw refusal('/range', serverChatWords.onlyAnExcelFileHas);
  if (input.range !== undefined && input.sheet === undefined) throw refusal('/range', serverChatWords.aRangeNeedsASheet);
  const bytes = attachedBytes(folder, file.path, LIMITS.entryBytes);
  if (!bytes) throw refusal('/path', serverChatWords.refusedBecause.tooBig);
  return { kind, bytes, sheet: input.sheet, range: input.range };
}

const notes = (...lines: (string | false | 0 | undefined)[]) => {
  const said = lines.filter(Boolean).join(' ');
  return said ? { note: said } : {};
};

/** The pictures among `files` that are over the size the agent's provider took when measured (D-071): the page fits only what is attached directly, so these are only named. */
function overTheLimit(files: readonly SavedFile[]): string | false {
  const over = files.filter((f) => PICTURE.test(f.path) && f.size > PICTURE_BYTES).map((f) => f.path);
  return over.length > 0 && serverChatWords.picturesOverTheLimit(over.slice(0, OVER_NAMED), Math.max(0, over.length - OVER_NAMED));
}

/** What a note says of what the document holds beyond its plain words: nothing vanishes with no word (VERIFY_01 F2). */
function foundNotes(found: DocxFound): (string | false)[] {
  const drawn = found.smartArt + found.charts + found.shapes + found.connectors + found.otherDrawings;
  return [
    drawn > 0 && serverChatWords.drawingsInTheDocument(found),
    found.unseeable.length > 0 && serverChatWords.picturesAModelCantBeShown(found.unseeable.slice(0, NOTE_NAMES)),
    found.embedded.length > 0 && serverChatWords.embeddedNotRead(found.embedded.slice(0, NOTE_NAMES)),
    found.hiddenRuns > 0 && serverChatWords.hiddenTextInTheDocument(found.hiddenRuns),
    found.trackedChanges && serverChatWords.trackedChangesInTheDocument,
  ];
}

/** The start of `text` within the answer's cap, cut between blocks. */
function beginning(text: string): string {
  if (text.length <= LIMITS.answerChars) return text;
  const block = text.lastIndexOf('\n\n', LIMITS.answerChars);
  return text.slice(0, block > 0 ? block : LIMITS.answerChars);
}

function documentAnswer(folder: string, rel: string, read: DocxDocument): ReadAnswer {
  const markdown = beginning(read.markdown);
  const long = markdown.length < read.markdown.length;
  const files = [...read.pictures.map((p) => ({ path: p.name, bytes: p.bytes })), ...(long ? [{ path: WHOLE_TEXT_FILE, bytes: new TextEncoder().encode(read.markdown) }] : [])];
  const saved = files.length > 0 ? saveBeside(folder, rel, read.pictures.length > 0 ? '-pictures' : '-text', files) : undefined;
  const pictures = (saved?.files ?? []).filter((f) => !f.path.endsWith(`/${WHOLE_TEXT_FILE}`)).map(({ path: p, size }): SavedFile => ({ path: p, size }));
  const wholeText = long ? `${saved!.folder}/${WHOLE_TEXT_FILE}` : undefined;
  return {
    kind: 'document', untrusted: serverChatWords.attachedFilesAreUntrusted, markdown,
    ...(saved && { folder: saved.folder }), pictures, ...(wholeText !== undefined && { wholeText }),
    ...notes(
      wholeText !== undefined && serverChatWords.theDocumentIsLong(markdown.length, read.markdown.length, wholeText), read.cut && serverChatWords.theDocumentWasCut,
      read.notRead.length > 0 && serverChatWords.notReadFromTheDocument(read.notRead), ...foundNotes(read.found), overTheLimit(pictures),
    ),
  };
}

/** As many of `files` as the answer's cap has room for: the agent can list the rest. */
function listedFiles(files: SavedFile[]): SavedFile[] {
  let left = LIMITS.answerChars;
  const out: SavedFile[] = [];
  for (const f of files.slice(0, FILES_LISTED)) {
    left -= JSON.stringify(f).length + 1;
    if (left < 0) break;
    out.push(f);
  }
  return out;
}

/** What to do with the PDFs and pictures that came out of an archive (VERIFY_01 F5): the page made nothing for them. */
function archiveNotes(files: readonly SavedFile[]): (string | false)[] {
  const pdfs = files.filter((f) => PDF.test(f.path)).map((f) => f.path);
  const pictures = files.filter((f) => PICTURE.test(f.path));
  const unseeable = pictures.filter((f) => !canBeSeen(f.path)).map((f) => f.path);
  return [
    pdfs.length > 0 && serverChatWords.pdfsInTheFolder(pdfs.slice(0, NOTE_NAMES), Math.max(0, pdfs.length - NOTE_NAMES)),
    pictures.length > unseeable.length && serverChatWords.picturesInTheFolder(pictures.length - unseeable.length),
    unseeable.length > 0 && serverChatWords.picturesAModelCantBeShown(unseeable.slice(0, NOTE_NAMES)),
  ];
}

function folderAnswer(folder: string, rel: string, read: ExpandedZip): ReadAnswer {
  const saved = saveBeside(folder, rel, '', read.files);
  const files = listedFiles(saved.files);
  return {
    kind: 'folder', untrusted: serverChatWords.attachedFilesAreUntrusted, folder: saved.folder, count: saved.files.length, files,
    ...notes(saved.files.length > files.length && serverChatWords.moreFilesThanListed(files.length, saved.folder), read.skipped > 0 && serverChatWords.macFilesLeftOut(read.skipped), ...archiveNotes(saved.files), overTheLimit(saved.files)),
  };
}

function workbookAnswer(folder: string, rel: string, read: WorkbookSummary): ReadAnswer {
  const saved = read.pictures.length > 0 ? saveBeside(folder, rel, '-pictures', read.pictures.map((p) => ({ path: p.name, bytes: p.bytes }))) : undefined;
  const pictures = (saved?.files ?? []).map(({ path: p, size }): SavedFile => ({ path: p, size }));
  const uncounted = read.sheets.filter((s) => s.counted === false).map((s) => s.name);
  const unseeable = read.pictures.map((p) => p.name).filter((n) => !canBeSeen(n));
  return {
    kind: 'workbook', untrusted: serverChatWords.attachedFilesAreUntrusted, sheets: read.sheets,
    ...(saved && { folder: saved.folder, pictures }), ...(read.names.length > 0 && { names: read.names }), ...(read.links.length > 0 && { links: read.links }),
    ...notes(
      read.cut && serverChatWords.moreSheetsThanListed(read.sheets.length), uncounted.length > 0 && serverChatWords.sheetsNotCounted(uncounted.slice(0, NOTE_NAMES)),
      read.sheets.some((s) => s.pictures || s.charts || s.diagrams || s.shapes) && serverChatWords.sheetsHoldDrawings, saved && serverChatWords.sheetPicturesSavedIn(saved.folder),
      unseeable.length > 0 && serverChatWords.picturesAModelCantBeShown(unseeable.slice(0, NOTE_NAMES)), read.namesCut && serverChatWords.namesWereCut(read.names.length), overTheLimit(pictures),
    ),
  };
}

const sheetAnswer = ({ kind, uncalculated, comments, drawings, ...read }: SheetAnswer): ReadAnswer => {
  const hidden = read.cells.filter((c) => c.hidden).length;
  return {
    kind, untrusted: serverChatWords.attachedFilesAreUntrusted, ...read, ...(comments.length > 0 && { comments }), ...(drawings.length > 0 && { drawings }),
    ...notes(
      read.cut && serverChatWords.theCellsWereCut(read.cut.shown, read.cut.next, read.cut.then), drawings.length > 0 && serverChatWords.drawingsOnThisSheet,
      uncalculated > 0 && serverChatWords.uncalculatedCells(uncalculated), hidden > 0 && serverChatWords.hiddenCellsHere(hidden),
    ),
  };
};

/** Run `read_attachment` for the board folder `folder`. */
export async function readAttachment(folder: string, input: ReadInput, options: ReadOptions = {}): Promise<ReadAnswer> {
  const job = jobFor(folder, input);
  if (job.kind === 'docx') return documentAnswer(folder, input.path, await inWorker<DocxDocument>(job, options));
  if (job.kind === 'zip') return folderAnswer(folder, input.path, await inWorker<ExpandedZip>(job, options));
  const read = await inWorker<WorkbookSummary | SheetAnswer>(job, options);
  return read.kind === 'workbook' ? workbookAnswer(folder, input.path, read) : sheetAnswer(read);
}
