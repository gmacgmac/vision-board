// A file dragged over the board's page never replaces the board (chat-attachments COMPOSE_01 Run 2, point 357,
// chatAttachments flag): where nothing took the drop (the chat panel does, chat-panel.ts), the page stops the
// browser opening the file, and says so with the no-drop cursor. Only files: text and anything else dragged go on
// as ever. A dragged file passes over an app's frame too, whose own page the guard can't reach, so the frames let
// it through while it is dragged. The page's own guard, because a host owns its page: `packages/chat` and the
// board leave this to it. What it returns takes it all off again.
import { dragsFiles } from '#chat';

const FRAMES = 'vb-app-frame, iframe';

type GuardedPage = Pick<Document, 'addEventListener' | 'removeEventListener' | 'querySelectorAll'>;

/** Guard `page` (the document); the function that removes the guard. */
export function guardFileDrops(page: GuardedPage): () => void {
  let dragging = false;
  const through = (on: boolean) => {
    if (on === dragging) return;
    dragging = on;
    page.querySelectorAll<HTMLElement>(FRAMES).forEach((f) => { f.style.pointerEvents = on ? 'none' : ''; });
  };
  const stop = (e: Event) => {
    const drag = e as DragEvent;
    if (!dragsFiles(drag)) return;
    through(e.type !== 'drop');
    if (e.defaultPrevented) return; // taken: the chat panel said what a drop does
    e.preventDefault();
    drag.dataTransfer!.dropEffect = 'none';
  };
  const left = (e: Event) => { if (!(e as DragEvent).relatedTarget) through(false); }; // out of the window, or Esc
  for (const type of ['dragenter', 'dragover', 'drop']) page.addEventListener(type, stop);
  page.addEventListener('dragleave', left);
  return () => {
    through(false);
    for (const type of ['dragenter', 'dragover', 'drop']) page.removeEventListener(type, stop);
    page.removeEventListener('dragleave', left);
  };
}
