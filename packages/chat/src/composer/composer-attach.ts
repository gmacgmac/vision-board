// Composer pattern, layer 3 (element), its attaching part (D-068): the paperclip and its file input, a
// file dragged over the composer (only files: text or a card goes on as ever) and dropped, and a paste.
// All three raise `chat-files`, and a host may widen where a drop lands to its panel (`dropArea`); the host's words (`ComposerView.files`) turn the part on, and without them
// the composer is as it ever was. It never reads a file and never calls the server. Browser only.
import { CHAT_FILES_EVENT } from '../events.ts';
import type { ComposerFile, ComposerFileWords, ComposerView } from './composer-core.ts';
import { dragsFiles, filesSaid, pastedFiles } from './composer-core.ts';
import { attachTemplate, dropTemplate, saidTemplate } from './composer-template.ts';

const ATTACH = 'button.chat-cmp-attach';
const INPUT = 'input.chat-cmp-input';
const SAY_MS = 100;

/** The `chat-files` event's detail (bubbles): the files attached; `pasted`, by a paste (a picture on the clipboard may have no name of its own). */
export interface ChatFilesDetail { files: File[]; pasted: boolean }
/** The `chat-file-remove` event's detail (bubbles): the file whose chip the person took off, by the host's id. */
export interface ChatFileRemoveDetail { id: string }

/** Tell a screen reader: what comes within a moment goes as one line, as a live region may read only the last of several changes.
 *  What the files did since the last line is worked out then, so a batch settling is one short line, not one line a file. */
export function announcer(el: HTMLElement, fileWords: () => ComposerFileWords | undefined, files: () => readonly ComposerFile[]): (words?: string) => void {
  const waiting: string[] = [];
  let spoken: readonly ComposerFile[] = [];
  let timer = 0;
  return (words) => {
    if (words) waiting.push(words);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const status = el.querySelector('.chat-cmp-said');
      const told = fileWords();
      const said = [...waiting.splice(0), told ? filesSaid(spoken, files(), told) : ''].filter(Boolean).join(' ');
      spoken = files();
      if (status && said) status.textContent = said;
    }, SAY_MS);
  };
}

/** The selector that finds a chip's remove button again once the chips row is drawn again (a file's state can move while focus is on another). */
export function removeButton(el: HTMLElement): string | undefined {
  if (!el.matches('button.chat-chip-x')) return undefined;
  return el.dataset.file ? `button[data-file="${CSS.escape(el.dataset.file)}"]` : `button[data-chip="${CSS.escape(el.dataset.chip ?? '')}"]`;
}

const raise = (el: HTMLElement, files: File[], pasted: boolean) => {
  el.dispatchEvent(new CustomEvent<ChatFilesDetail>(CHAT_FILES_EVENT, { bubbles: true, detail: { files, pasted } }));
};

/** The drop on `area`, the composer `el` by default or a host's panel around it: the drop target shows on `el`, which
 *  raises the event. Shut, it takes none, though a dropped file still doesn't open in the page. Removed by what it returns. */
function wireDrop(area: HTMLElement, el: HTMLElement, view: () => ComposerView): () => void {
  const off = new AbortController();
  const { signal } = off;
  const mark = (on: boolean) => el.toggleAttribute('data-drop', on);
  const on = () => view().files !== undefined;
  const shut = () => view().shut !== undefined;
  const over = (e: DragEvent) => {
    if (!on() || !dragsFiles(e)) return;
    e.preventDefault(); // else the browser opens the file in place of the board
    e.dataTransfer!.dropEffect = shut() ? 'none' : 'copy';
    mark(!shut());
  };
  area.addEventListener('dragenter', over, { signal });
  area.addEventListener('dragover', over, { signal });
  area.addEventListener('dragleave', (e) => { if (!area.contains(e.relatedTarget as Node | null)) mark(false); }, { signal });
  area.addEventListener('drop', (e) => {
    if (!on() || !dragsFiles(e)) return;
    e.preventDefault();
    mark(false);
    const files = [...e.dataTransfer!.files];
    if (!shut() && files.length) raise(el, files, false);
  }, { signal });
  return () => { off.abort(); mark(false); };
}

/** Where `el` takes a dropped file: on while it is on the page, and `move` hands it a host's panel. */
export function dropArea(el: HTMLElement, view: () => ComposerView) {
  let area = el;
  let undo: (() => void) | null = null;
  const on = () => { undo?.(); undo = wireDrop(area, el, view); };
  return {
    on,
    off() { undo?.(); undo = null; },
    move(to: HTMLElement) { area = to; if (undo) on(); },
  };
}

/** Listen on `el` for a paste and the paperclip, the other two ways a file comes. */
export function wireAttaching(el: HTMLElement, view: () => ComposerView): void {
  const on = () => view().files !== undefined;
  const shut = () => view().shut !== undefined;
  const take = (files: File[], pasted: boolean) => raise(el, files, pasted);
  el.addEventListener('paste', (e) => {
    const data = e.clipboardData;
    if (!on() || shut() || !data) return;
    const files = pastedFiles([...data.files], data.getData('text/plain'));
    if (!files.length) return;
    e.preventDefault();
    take(files, true);
  });
  el.addEventListener('click', (e) => {
    if ((e.target as Element).closest(ATTACH)) el.querySelector<HTMLInputElement>(INPUT)?.click();
  });
  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.matches(INPUT)) return;
    take([...(input.files ?? [])], false);
    input.value = ''; // the same file can be picked again
  });
}

/** The paperclip and what comes with it, in the box with the host's words and gone without them. */
export function drawAttaching(el: HTMLElement, v: ComposerView): void {
  const clip = el.querySelector<HTMLButtonElement>(ATTACH);
  if (!v.files) {
    if (clip) el.querySelectorAll(`${ATTACH}, ${INPUT}, .chat-cmp-drop, .chat-cmp-said`).forEach((x) => x.remove());
    return;
  }
  if (!clip) {
    el.querySelector('button.chat-cmp-send')!.insertAdjacentHTML('beforebegin', attachTemplate(v.files) + dropTemplate(v.files));
    el.insertAdjacentHTML('beforeend', saidTemplate());
  }
  el.querySelector<HTMLButtonElement>(ATTACH)!.disabled = v.shut !== undefined;
}
