// The standalone page's file and print hooks (board/host.ts `saveFile`, `openFile`, `print`; D-107, docs/specification/
// plugin.md § What the host gives): the browser's own. A save is a download of the bytes under their name; an open is the
// browser's file picker for one file of the types asked for, read whole; a print is `window.print()`, which returns once
// the print dialog has closed. Nothing is sent anywhere: the bytes stay in the page. Browser only, no sentence.

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

/** Print the page as the board has set it: the browser's print dialog, which also saves a PDF. */
export async function print(): Promise<void> {
  // `window.print()` blocks until its dialog closes; awaited, so a page that answers it later (a test's) is waited for too.
  await (window.print() as unknown);
}
