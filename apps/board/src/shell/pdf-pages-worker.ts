// The worker inside the sandboxed frame (D-071 ruling 3): the one place a stranger's file is read. It opens a PDF with
// pdf.js and draws a page when asked, or fits a picture on a canvas, and hands back only bytes, which the page checks
// again. A worker because of what a worker lacks: `RTCPeerConnection`, which goes past `connect-src`; `location` to
// navigate with; a document, child frames. So script run here by a hostile file has no way out at all, and no way to
// stall the page. pdf.js parses in a worker of its own, made from text inside this script, as nothing here can load a file; it
// draws on OffscreenCanvas, with no fonts added to a page, and eval stays off, in pdf.js and by the policy.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions, VerbosityLevel } from 'pdfjs-dist';
import workerText from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import jbig2 from 'pdfjs-dist/wasm/jbig2.wasm?url&inline';
import openjpeg from 'pdfjs-dist/wasm/openjpeg.wasm?url&inline';
import type { FrameAnswer, FrameAsk, FrameLimits } from './pdf-pages-core.ts';

/** Pages draw at twice their size in points (a Letter page is 1224 x 1584) or the edge limit, whichever is less. */
const PAGE_SCALE = 2;
/** A picture over the byte limit is tried smaller, this many times. */
const SMALLER_TRIES = 4;
const SMALLER_BY = 0.75;
const JPEG_QUALITY = [0.85, 0.7];
const INPUT_MOST = 10 * 1024 * 1024;

const WASM: Record<string, string> = { 'jbig2.wasm': jbig2, 'openjpeg.wasm': openjpeg };
const fromDataUrl = (url: string) => Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), (c) => c.charCodeAt(0));

/** pdf.js's source of binary data, by the name it calls: the two image decoders, from inside this script. Nothing here reaches a network. */
class BinaryData {
  fetch = ({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> => {
    const url = kind === 'wasmUrl' ? WASM[filename] : undefined;
    return url ? Promise.resolve(fromDataUrl(url)) : Promise.reject(new Error(`no ${kind} here`));
  };
}

/** The worker's module as a classic script: a frame with no origin can't start a module worker from a blob. */
const classicScript = (module: string) => module.replace(/export\s*\{\s*WorkerMessageHandler\s*\};?/, '').replaceAll('import.meta.url', 'self.location.href');

const answer = (m: FrameAnswer, transfer: Transferable[] = []) => self.postMessage(m, { transfer });

/** pdf.js's canvases, with no document to ask. */
class Canvases {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
  }
  reset({ canvas }: { canvas: OffscreenCanvas }, width: number, height: number) { [canvas.width, canvas.height] = [width, height]; }
  destroy(it: { canvas: OffscreenCanvas | null; context: unknown }) { if (it.canvas) it.canvas.width = it.canvas.height = 0; it.canvas = it.context = null; }
}

/** pdf.js's SVG filters, which need a document: a few blending effects are drawn without them. */
const noFilter = () => 'none';
class NoFilters {
  addFilter = noFilter; addHCMFilter = noFilter; addAlphaFilter = noFilter; addLuminosityFilter = noFilter; addKnockoutFilter = noFilter;
  addHighlightHCMFilter = noFilter; addSelectionHCMFilter = noFilter; addSelectionFilter = noFilter;
  createSelectionStyle() { return null; }
  destroy() {}
}

let doc: PDFDocumentProxy | undefined;
let limits: FrameLimits = { bytes: 0, edge: 0 };

async function open(bytes: ArrayBuffer): Promise<void> {
  const worker = URL.createObjectURL(new Blob([classicScript(workerText)], { type: 'text/javascript' }));
  GlobalWorkerOptions.workerPort = new Worker(worker);
  try {
    doc = await getDocument({
      data: new Uint8Array(bytes), isEvalSupported: false, enableXfa: false, verbosity: VerbosityLevel.ERRORS,
      BinaryDataFactory: BinaryData, CanvasFactory: Canvases, FilterFactory: NoFilters, wasmUrl: 'https://inside.invalid/', useWorkerFetch: false,
      disableFontFace: true, useSystemFonts: false, disableAutoFetch: true, disableStream: true,
    } as Parameters<typeof getDocument>[0]).promise;
    answer({ kind: 'opened', pages: doc.numPages });
  } catch (err) {
    answer({ kind: 'refused', why: (err as Error).name === 'PasswordException' ? 'password' : 'damaged' });
  }
}

/** One page as a PNG within the limits, smaller if need be. */
async function page(n: number): Promise<void> {
  try {
    const it = await doc!.getPage(n);
    const { width, height } = it.getViewport({ scale: 1 });
    let scale = Math.min(PAGE_SCALE, limits.edge / Math.max(width, height));
    for (let tries = 0; tries < SMALLER_TRIES; tries++, scale *= SMALLER_BY) {
      const viewport = it.getViewport({ scale });
      const canvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      await it.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport, background: 'white' }).promise;
      const png = await canvas.convertToBlob({ type: 'image/png' });
      canvas.width = canvas.height = 0;
      if (png.size <= limits.bytes) {
        const bytes = await png.arrayBuffer();
        it.cleanup();
        return answer({ kind: 'page', page: n, png: bytes }, [bytes]);
      }
    }
  } catch { /* a page that can't be drawn: the rest still may */ }
  answer({ kind: 'no-page', page: n });
}

/** The bitmap drawn at `scale`, on white for a JPEG, which has no transparency. */
async function encode(from: ImageBitmap, scale: number, type: string, quality?: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(Math.max(1, Math.floor(from.width * scale)), Math.max(1, Math.floor(from.height * scale)));
  const draw = canvas.getContext('2d')!;
  if (type === 'image/jpeg') { draw.fillStyle = 'white'; draw.fillRect(0, 0, canvas.width, canvas.height); }
  draw.imageSmoothingQuality = 'high';
  draw.drawImage(from, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type, ...(quality !== undefined && { quality }) });
}

/** A picture over the limits as a copy within them: a PNG keeps a diagram's edges, so it is tried first (not for a
 *  photo that came as a JPEG), then a JPEG, and then smaller. A picture within them needs none. */
async function fit(bytes: ArrayBuffer, type: string): Promise<void> {
  try {
    const from = await createImageBitmap(new Blob([bytes], { type }));
    if (bytes.byteLength <= limits.bytes && Math.max(from.width, from.height) <= limits.edge) return answer({ kind: 'fits' });
    let scale = Math.min(1, limits.edge / Math.max(from.width, from.height));
    for (let tries = 0; tries < SMALLER_TRIES; tries++, scale *= SMALLER_BY) {
      const png = type === 'image/jpeg' ? undefined : await encode(from, scale, 'image/png');
      const jpegs = png && png.size <= limits.bytes ? [] : JPEG_QUALITY;
      for (const blob of [png, ...jpegs]) {
        const made = typeof blob === 'number' ? await encode(from, scale, 'image/jpeg', blob) : blob;
        if (!made || made.size > limits.bytes) continue;
        const out = await made.arrayBuffer();
        return answer({ kind: 'fitted', bytes: out, picture: made.type === 'image/png' ? 'png' : 'jpeg' }, [out]);
      }
    }
  } catch { /* the browser can't draw it, or it is damaged */ }
  answer({ kind: 'refused', why: 'damaged' });
}

const number = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const goodLimits = (l: unknown): l is FrameLimits => number((l as FrameLimits | null)?.bytes) && number((l as FrameLimits | null)?.edge);
const goodBytes = (b: unknown): b is ArrayBuffer => b instanceof ArrayBuffer && b.byteLength <= INPUT_MOST;

/** One ask, in the shape it should be: only the frame can reach a worker, and it passes on only what its page sent. */
self.onmessage = (e: MessageEvent) => {
  const m = e.data as FrameAsk | null;
  if (m?.kind === 'page') { if (doc && Number.isInteger(m.page) && m.page >= 1 && m.page <= doc.numPages) void page(m.page); return; }
  if ((m?.kind !== 'open' && m?.kind !== 'fit') || doc || !goodBytes(m.bytes) || !goodLimits(m.limits)) return;
  limits = m.limits;
  if (m.kind === 'open') void open(m.bytes);
  else void fit(m.bytes, typeof m.type === 'string' ? m.type : '');
};
