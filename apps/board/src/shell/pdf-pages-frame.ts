// The code of the sandboxed frame's own page (D-071 ruling 3; server/pdf-frame.ts serves it, `pdf-pages.ts` makes the frame). It
// holds no stranger's file open: it starts the worker that reads one (`pdf-pages-worker.ts`) and passes messages, the
// asks from the page that made this frame and no other, the answers back as they are, for that page to check.
// A window that opens this on its own gets nothing. Its own build entry, and it imports only types from the page's code, so it stays one file (vite.config.ts).
import ReaderWorker from './pdf-pages-worker.ts?worker&inline';
import type { FrameAnswer } from './pdf-pages-core.ts';

const buffers = (m: unknown): ArrayBuffer[] => Object.values((m ?? {}) as object).filter((v): v is ArrayBuffer => v instanceof ArrayBuffer);

if (window.parent !== window) {
  const reader = new ReaderWorker();
  reader.onmessage = (e) => window.parent.postMessage(e.data, '*', buffers(e.data));
  const tell = (m: FrameAnswer) => window.parent.postMessage(m, '*');
  reader.onerror = () => tell({ kind: 'refused', why: 'damaged' }); // it never started, or something in it broke
  window.addEventListener('message', (e) => { if (e.source === window.parent) reader.postMessage(e.data, buffers(e.data)); });
  tell({ kind: 'ready' }); // an ask waits for the worker, whenever it starts
}
