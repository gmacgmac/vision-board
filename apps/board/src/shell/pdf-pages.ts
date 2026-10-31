// The page's side of the sandboxed frame (D-071 rulings 5, 6): when a PDF is attached its pages become pictures, and
// when a picture over the limits is attached it gets a fitted copy, each saved beside the original through
// `attach_chat_file`'s `of`. Every file gets a new frame of its own, removed when it is done or at a deadline, so one
// hostile file touches no other; one at a time, so ten PDFs don't stall the page. The frame is asked for one thing at a time, and
// `checkedAnswer` drops anything but that answer, whole. The chip says how far it got. A message may go while a PDF is read, with
// what is saved, and the work then stops: a long PDF holds no one up. Send waits for a fitted copy, as it does for an upload, since the
// original may never reach the model; pictures have their own queue, so a PDF ahead doesn't hold them, and a failure or deadline frees it.
// The frame's code is never in the page's bundle (`pdf-pages-frame.ts`).
import { fileData } from './attached-file.ts';
import type { AttachFileBody } from './chat-bridge.ts';
import type { Awaiting, FrameAnswer, FrameAsk, FrameLimits, FrameRefusal } from './pdf-pages-core.ts';
import { checkedAnswer, headerWithin, isPdf, isRaster, PAGES_MAX, PDF_FRAME_PATH, PICTURE_BYTES, PICTURE_EDGE } from './pdf-pages-core.ts';
import * as chatWords from './words/chat.ts';

const LIMITS: FrameLimits = { bytes: PICTURE_BYTES, edge: PICTURE_EDGE };

/** How long a frame may take to say it is ready: a process of its own may start slowly, and its `ready` comes when it comes, before or after its `load`.
 *  How long one step may take (opening, one page, a fit), and all of one file. */
export const READY_MS = 15_000;
export const STEP_MS = 30_000;
export const FILE_MS = 180_000;

/** One frame: what to ask it, and removing it. */
export interface FrameLink { send(m: FrameAsk, transfer?: Transferable[]): void; end(): void }
/** Makes a frame: `heard` gets what its window posts and no other's. */
export type MakeFrame = (heard: (data: unknown) => void) => FrameLink;

/** A hidden frame with no origin: only its own window's messages are heard, whose sandbox gives them the origin "null". */
export const browserFrame: MakeFrame = (heard) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.referrerPolicy = 'no-referrer';
  frame.title = chatWords.readingAnAttachedFile;
  frame.hidden = true;
  frame.dataset.vbPdfFrame = '';
  const onMessage = (e: MessageEvent) => { if (e.source === frame.contentWindow && e.origin === 'null') heard(e.data); };
  window.addEventListener('message', onMessage);
  frame.src = PDF_FRAME_PATH;
  document.body.append(frame);
  return {
    send: (m, transfer = []) => frame.contentWindow?.postMessage(m, '*', transfer),
    end() { window.removeEventListener('message', onMessage); frame.remove(); },
  };
};

/** What a file's work says: `doing`, short, while it goes; `note`, in full, when it ended short; `holds`, why Send waits for it. */
export interface CopyProgress { doing?: string | undefined; note?: string | undefined; holds?: string | undefined }
export interface CopySide { save(body: AttachFileBody): Promise<unknown>; progress(p: CopyProgress): void }
/** Start the work on the file saved at `path`; what it returns stops it. None for a file that needs no copy. */
export type MakeCopies = (file: File, path: string, side: CopySide) => (() => void) | undefined;

interface Times { ready: number; step: number; file: number }

class Stopped extends Error {}
class Late extends Error {}

/** One frame's conversation: one ask, one checked answer. A deadline or a stop removes the frame at once, and whatever is waiting, or asks next, gets `Late` or `Stopped`. */
function talkTo(make: MakeFrame, times: Times) {
  let waiting: Awaiting = { for: 'ready' };
  let settle: { take(a: FrameAnswer): void; fail(e: Error): void } | undefined;
  let step: ReturnType<typeof setTimeout> | undefined;
  let over: Error | undefined;
  const heard = (data: unknown) => {
    const answer = checkedAnswer(data, waiting, LIMITS);
    if (!answer || !settle) return; // anything else from the frame is dropped
    clearTimeout(step);
    const s = settle;
    settle = undefined;
    s.take(answer);
  };
  const expect = (next: Awaiting, ms = times.step) => new Promise<FrameAnswer>((take, reject) => {
    if (over) return reject(over);
    waiting = next;
    settle = { take, fail: reject };
    step = setTimeout(() => finish(new Late()), ms);
  });
  const ready = expect({ for: 'ready' }, times.ready);
  const link = make(heard);
  const whole = setTimeout(() => finish(new Late()), times.file);
  function finish(why: Error) {
    over ??= why;
    clearTimeout(step);
    clearTimeout(whole);
    link.end();
    settle?.fail(over);
    settle = undefined;
  }
  return {
    ready,
    ask(m: FrameAsk, next: Awaiting, transfer: Transferable[] = []) { const got = expect(next); if (!over) link.send(m, transfer); return got; },
    stop() { finish(new Stopped()); },
    end() { finish(new Stopped()); },
  };
}
type Talk = ReturnType<typeof talkTo>;

const REFUSED: Record<FrameRefusal, string> = { password: chatWords.pdfHasAPassword, damaged: chatWords.pdfIsDamaged };
const saveBody = async (name: string, type: string, bytes: ArrayBuffer, of: NonNullable<AttachFileBody['of']>): Promise<AttachFileBody> =>
  ({ name, type, data: await fileData(new Blob([bytes])), of });

/** A PDF's pages, one at a time: nothing is asked until the last is saved, so a slow disk holds the frame back. */
async function readPages(talk: Talk, file: File, path: string, side: CopySide): Promise<void> {
  let [saved, want, blank] = [0, 0, 0];
  const incomplete = () => (blank > 0 ? chatWords.pagesMayBeIncomplete(blank) : undefined);
  const said = (...lines: (string | undefined)[]) => lines.filter(Boolean).join(' ') || undefined;
  side.progress({ doing: chatWords.readingPages() });
  try {
    await talk.ready;
    const bytes = await file.arrayBuffer();
    const opened = await talk.ask({ kind: 'open', bytes, limits: LIMITS }, { for: 'opened' }, [bytes]);
    if (opened.kind !== 'opened') return side.progress({ note: REFUSED[opened.kind === 'refused' ? opened.why : 'damaged'] });
    want = Math.min(opened.pages, PAGES_MAX);
    for (let page = 1; page <= want; page++) {
      side.progress({ doing: chatWords.readingPages(page, want) });
      const got = await talk.ask({ kind: 'page', page }, { for: 'page', page });
      if (got.kind !== 'page') continue;
      await side.save(await saveBody(`page-${page}.png`, 'image/png', got.png, { path, page, pages: opened.pages, ...(got.blank && { blank: true }) }));
      saved++;
      if (got.blank) blank++;
    }
    side.progress({ note: said(saved === want && want === opened.pages ? undefined : chatWords.onlySomePages(saved, opened.pages), incomplete()) });
  } catch (err) {
    if (err instanceof Stopped) return;
    side.progress({ note: said(!(err instanceof Late) ? chatWords.copiesNotSaved : want > 0 ? chatWords.pagesTookTooLong(saved, want) : chatWords.pagesNotOpened, incomplete()) });
  }
}

/** Whether a picture needs the frame at all: one whose own header says it is within the limits does not. */
async function headerSaysFine(file: File): Promise<boolean> {
  if (file.size > PICTURE_BYTES) return false;
  try { return headerWithin(new Uint8Array(await file.arrayBuffer())); } catch { return false; }
}

/** A picture's fitted copy, when it needs one; `fits` from the frame, for a kind whose header isn't read here, and nothing is made. Whatever ends it frees Send. */
async function fitPicture(talk: Talk, file: File, path: string, side: CopySide): Promise<void> {
  side.progress({ doing: chatWords.fittingPicture, holds: chatWords.sendWaitsForCopy });
  const failed = { note: chatWords.pictureNotFitted };
  try {
    await talk.ready;
    const bytes = await file.arrayBuffer();
    const got = await talk.ask({ kind: 'fit', bytes, type: file.type, limits: LIMITS }, { for: 'fit' }, [bytes]);
    if (got.kind === 'fitted') await side.save(await saveBody('fitted', `image/${got.picture}`, got.bytes, { path }));
    side.progress(got.kind === 'refused' ? failed : {});
  } catch (err) {
    if (!(err instanceof Stopped)) side.progress(failed);
  }
}

/** The work for the files a person attaches, one file at a time in each queue, in the order they came: a PDF's, and a picture's, which Send may be waiting for. */
export function createCopies(make: MakeFrame = browserFrame, times: Times = { ready: READY_MS, step: STEP_MS, file: FILE_MS }): MakeCopies {
  const queues = { pdf: Promise.resolve(), picture: Promise.resolve() };
  return (file, path, side) => {
    const kind = isPdf(file) ? 'pdf' : isRaster(file) ? 'picture' : undefined;
    if (!kind) return undefined;
    let talk: Talk | undefined;
    let stopped = false;
    const inQueue = () => {
      queues[kind] = queues[kind].then(async () => {
        if (stopped) return;
        talk = talkTo(make, times);
        await (kind === 'pdf' ? readPages : fitPicture)(talk, file, path, side);
        talk.end();
      });
    };
    if (kind === 'pdf') inQueue();
    else {
      side.progress({ holds: chatWords.sendWaitsForCopy }); // from now, in the same moment the file is ready: its header takes a moment to read
      void headerSaysFine(file).then((fine) => { if (fine) side.progress({}); else inQueue(); });
    }
    return () => { stopped = true; talk?.stop(); };
  };
}
