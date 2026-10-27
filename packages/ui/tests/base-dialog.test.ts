// The modal dialog (base/dialog-core.ts, base/dialog.ts): it follows its state, a click on the
// backdrop closes it, and a close event queued before it opened again closes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modalStep, onBackdrop } from '../src/base/dialog-core.ts';
import { backdropClick, syncModal, whenShut } from '../src/base/dialog.ts';

function fakeDialog() {
  const calls: string[] = [];
  const dlg = {
    open: false,
    showModal() { this.open = true; calls.push('show'); },
    close() { this.open = false; calls.push('close'); },
    getBoundingClientRect: () => ({ left: 100, top: 100, right: 300, bottom: 200 }),
  };
  return { dlg, calls };
}

test('a dialog shows when wanted and shut, closes when not wanted and open, else stays', () => {
  assert.equal(modalStep(false, true), 'show');
  assert.equal(modalStep(true, false), 'close');
  assert.equal(modalStep(true, true), null);
  assert.equal(modalStep(false, false), null);
});

test('syncModal shows it, then runs opened (fields reset, focus placed); and closes it', () => {
  const { dlg, calls } = fakeDialog();
  syncModal(dlg, true, () => calls.push('opened'));
  syncModal(dlg, true, () => calls.push('opened'));
  syncModal(dlg, false);
  syncModal(dlg, false);
  assert.deepEqual(calls, ['show', 'opened', 'close']);
});

test('a click outside the box is on the backdrop; inside or on its edge is not', () => {
  const box = { left: 100, top: 100, right: 300, bottom: 200 };
  assert.equal(onBackdrop(box, 50, 150), true);
  assert.equal(onBackdrop(box, 150, 250), true);
  assert.equal(onBackdrop(box, 150, 150), false);
  assert.equal(onBackdrop(box, 100, 100), false);
});

test('backdropClick closes on a backdrop click only, never on a click inside', () => {
  const { dlg } = fakeDialog();
  let closed = 0;
  const click = backdropClick(() => { closed++; });
  const at = (x: number, y: number, target: unknown = dlg) => ({ currentTarget: dlg, target, clientX: x, clientY: y }) as unknown as MouseEvent;
  click(at(150, 150));
  click(at(10, 10, {}));
  assert.equal(closed, 0);
  click(at(10, 10));
  assert.equal(closed, 1);
});

test('whenShut takes the close event only while the dialog is still shut', () => {
  const { dlg } = fakeDialog();
  let shut = 0;
  const onclose = whenShut(() => { shut++; });
  const evt = { currentTarget: dlg } as unknown as Event;
  dlg.open = true;
  onclose(evt);
  assert.equal(shut, 0);
  dlg.open = false;
  onclose(evt);
  assert.equal(shut, 1);
});
