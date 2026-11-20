// The standalone page's file and print hooks (board/host.ts `saveFile`, `openFile`, `print`; D-107, docs/specification/
// plugin.md § What the host gives): the browser's own. A save is a download of the bytes under their name; an open is the
// browser's file picker for one file of the types asked for, read whole; a print is the host's side of `print(ask)`, as
// nclite's is: the page marks <html> for the print (`data-vb-printing`, the look in `data-vb-print-look`; shell.css hides
// all but the board and sets the look's colours), gives the paper its own sheet (`printRules`: the ask's side, a margin
// for `plain` alone) and the page's title the ask's, calls `window.print()`, which returns once the print dialog has
// closed, and puts it all back. The board never asks with `content` (it prints its root as it stands), so this page
// prints the board. Nothing is sent anywhere: the bytes stay in the page. Browser only, no sentence.
import type { PrintAsk } from '../board/host.ts';

/** The most bytes an import file may hold on this page: the standalone server's `write_board` body limit (512 KiB,
 *  server/engine/writes.ts `WRITE_LIMIT`; api.md), held equal by apps/board/tests/board-files.test.ts. */
export const IMPORT_BYTES = 512 * 1024;
/** The paper's margin for `plain`; `light` and `dark` print edge to edge, the board padding its own (print-view.ts). */
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

/** The paper's rule for one print: a page's side and margin are an `@page` rule, which no attribute can select. */
export function printRules(ask: PrintAsk): string {
  const size = ask.orientation === 'landscape' ? 'landscape' : 'portrait';
  const margin = (ask.look ?? 'plain') === 'plain' ? PLAIN_MARGIN : '0';
  return `@page{size:${size};margin:${margin}}`; // CSS, not a sentence: no spaces, so the words check reads none
}

/** Print the board as it has set its print view, on paper and in the look `ask` names: the browser's print dialog, which
 *  also saves a PDF under the ask's title. */
export async function print(ask: PrintAsk = {}): Promise<void> {
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
