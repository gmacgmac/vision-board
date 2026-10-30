// The page's guard against a dragged file (COMPOSE_01 Run 2, point 357): only files, what a panel took stays
// taken, frames let a drag through only while it lasts, and nothing is left once it is removed. The browser's
// side is tests/pages/chat-attach-drop.spec.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardFileDrops } from '../src/shell/file-drops.ts';

/** A plain page, one frame on it, and a drag event of `types`. */
function page() {
  const target = new EventTarget();
  const frame = { style: { pointerEvents: '' } };
  const doc = Object.assign(target, { querySelectorAll: () => [frame] }) as unknown as Document;
  return { doc, frame };
}
function drag(type: string, types: string[], o: { taken?: boolean; relatedTarget?: object } = {}) {
  const e = new Event(type, { cancelable: true }) as Event & { dataTransfer: { types: string[]; dropEffect: string }; relatedTarget: object | null };
  e.dataTransfer = { types, dropEffect: 'copy' };
  e.relatedTarget = o.relatedTarget ?? null;
  if (o.taken) e.preventDefault();
  return e;
}

test('a file over or dropped on the page is stopped, with the no-drop cursor; nothing else is', () => {
  const { doc } = page();
  guardFileDrops(doc);
  for (const type of ['dragenter', 'dragover', 'drop']) {
    const file = drag(type, ['Files']);
    doc.dispatchEvent(file);
    assert.equal(file.defaultPrevented, true, type);
    assert.equal(file.dataTransfer.dropEffect, 'none', type);
    const words = drag(type, ['text/plain']);
    doc.dispatchEvent(words);
    assert.equal(words.defaultPrevented, false, type);
    assert.equal(words.dataTransfer.dropEffect, 'copy', type);
  }
});

test('what the chat panel took keeps its cursor', () => {
  const { doc } = page();
  guardFileDrops(doc);
  const taken = drag('dragover', ['Files'], { taken: true });
  doc.dispatchEvent(taken);
  assert.equal(taken.dataTransfer.dropEffect, 'copy');
});

test('frames let a file through while it is dragged: until the drop, or it leaves the window; not for a text drag or a move within', () => {
  const { doc, frame } = page();
  guardFileDrops(doc);
  doc.dispatchEvent(drag('dragenter', ['text/plain']));
  assert.equal(frame.style.pointerEvents, '');
  doc.dispatchEvent(drag('dragenter', ['Files']));
  assert.equal(frame.style.pointerEvents, 'none');
  doc.dispatchEvent(drag('dragleave', ['Files'], { relatedTarget: {} }));
  assert.equal(frame.style.pointerEvents, 'none');
  doc.dispatchEvent(drag('dragleave', ['Files']));
  assert.equal(frame.style.pointerEvents, '');
  doc.dispatchEvent(drag('dragover', ['Files']));
  assert.equal(frame.style.pointerEvents, 'none');
  doc.dispatchEvent(drag('drop', ['Files']));
  assert.equal(frame.style.pointerEvents, '');
});

test('removed, it leaves nothing: no listener, and no frame held mid-drag', () => {
  const { doc, frame } = page();
  const remove = guardFileDrops(doc);
  doc.dispatchEvent(drag('dragover', ['Files']));
  remove();
  assert.equal(frame.style.pointerEvents, '');
  for (const type of ['dragenter', 'dragover', 'drop']) {
    const after = drag(type, ['Files']);
    doc.dispatchEvent(after);
    assert.equal(after.defaultPrevented, false, type);
  }
  doc.dispatchEvent(drag('dragover', ['Files']));
  assert.equal(frame.style.pointerEvents, '');
});
