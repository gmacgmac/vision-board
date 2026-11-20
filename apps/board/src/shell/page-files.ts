// The standalone page's file and Save as PDF hooks (board/host.ts `saveFile`, `openFile`, `savePdf`; D-107, docs/
// specification/plugin.md § What the host gives): the browser's own. A save is a download of the bytes under their name;
// an open is the browser's file picker for one file of the types asked for, read whole; a Save as PDF is the host's side of
// `savePdf(ask)`, as nclite's is in a browser: the page marks <html> for the save (`data-vb-printing`, the look in
// `data-vb-print-look`; shell.css hides all but the board and sets the look's colours), gives the page its own sheet
// (`printRules`: exactly the ask's `size` with no margin, else the paper turned to the ask's side, with a margin for
// `plain` alone) and the page's title the ask's, calls `window.print()`, whose dialog's Save as PDF the person chooses and
// which returns once it has closed, and puts it all back. The board never asks with `content` (it saves its root as it
// stands), so this page saves the board. Nothing is sent anywhere: the bytes stay in the page. Browser only, no sentence.
import type { PdfAsk } from '../board/host.ts';

/** The most bytes an import file may hold on this page: the standalone server's `write_board` body limit (512 KiB,
 *  server/engine/writes.ts `WRITE_LIMIT`; api.md), held equal by apps/board/tests/board-files.test.ts. */
export const IMPORT_BYTES = 512 * 1024;
/** The paper's margin for `plain` with no `size`; `light` and `dark` print edge to edge, the board padding its own (print-view.ts). */
export const PLAIN_MARGIN = '10mm';

/** Hand `bytes` to the browser as a download named `name`, of media type `type`. */
export async function saveFile(name: string, type: string, bytes: Uint8Array): Promise<void> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  try {
    a.click();
  } finally {
    a.remove();
    // The download has the blob by now; a later turn frees it.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Ask for one file of the types `accept` names; its name and bytes, or undefined when the person chose none (the
 *  picker's Cancel, which the input reports as `cancel`). */
export function openFile(accept: string): Promise<{ name: string; bytes: Uint8Array } | undefined> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  return new Promise((resolve, reject) => {
    input.addEventListener('cancel', () => resolve(undefined), { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return resolve(undefined);
      file.arrayBuffer().then((b) => resolve({ name: file.name, bytes: new Uint8Array(b) }), reject);
    }, { once: true });
    input.click();
  });
}

/** The page's rule for one save: a page's size and margin are an `@page` rule, which no attribute can select. A `size`
 *  is one page of exactly that size, edge to edge (as nclite's `printRules`). */
export function printRules(ask: PdfAsk): string {
  const side = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  const sized = side(ask.size?.width) && side(ask.size?.height);
  const size = sized ? `${ask.size!.width}px ${ask.size!.height}px` : ask.orientation === 'landscape' ? 'landscape' : 'portrait';
  const margin = !sized && (ask.look ?? 'plain') === 'plain' ? PLAIN_MARGIN : '0';
  return `@page{size:${size};margin:${margin}}`; // CSS, not a sentence: no spaces, so the words check reads none
}

/** Save the board as a PDF, as it has set its print view, on the page and in the look `ask` names: the browser's print
 *  dialog, whose Save as PDF names the file after the ask's title. */
export async function savePdf(ask: PdfAsk = {}): Promise<void> {
  const html = document.documentElement;
  const look = ask.look === 'light' || ask.look === 'dark' ? ask.look : 'plain';
  const [title, sheets] = [document.title, document.adoptedStyleSheets];
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(printRules(ask));
  try {
    if (ask.title) document.title = ask.title;
    document.adoptedStyleSheets = [...sheets, sheet];
    html.setAttribute('data-vb-printing', '');
    html.setAttribute('data-vb-print-look', look);
    // `window.print()` blocks until its dialog closes; awaited, so a page that answers it later (a test's) is waited for too.
    await (window.print() as unknown);
  } finally {
    html.removeAttribute('data-vb-printing');
    html.removeAttribute('data-vb-print-look');
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    document.title = title;
  }
}
