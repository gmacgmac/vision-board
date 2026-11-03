// The page's side of the sandboxed frame (D-071): every answer from it is checked again, and only the answer waited for
// is taken; a frame that stalls is removed at a deadline, and the chip says how far it got. A fake frame stands in for the
// real one, which chat-attach-pages.spec.ts drives. Also the server's frame route and its policy.
// verify: data-folder-literal the attachment paths a page and an agent see (`.visionboard/attachments/…`, repo-wide in every layout)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import type { Awaiting, FrameAsk } from '../src/shell/pdf-pages-core.ts';
import { checkedAnswer, headerWithin, isPdf, isRaster, jpegSize, PAGES_MAX, pngSize, PICTURE_BYTES, PICTURE_EDGE } from '../src/shell/pdf-pages-core.ts';
import type { CopyProgress, MakeFrame } from '../src/shell/pdf-pages.ts';
import { createCopies } from '../src/shell/pdf-pages.ts';

const buffer = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** The smallest whole-looking PNG of a size, as bytes. */
function png(width: number, height: number): ArrayBuffer {
  const head = new Uint8Array(33);
  head.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(head.buffer).setUint32(16, width);
  new DataView(head.buffer).setUint32(20, height);
  const data = deflateSync(Buffer.alloc(1));
  const end = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
  return buffer(new Uint8Array([...head, ...data, ...end]));
}
/** A JPEG's start, then a frame header. */
function jpeg(width: number, height: number): ArrayBuffer {
  return buffer(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xdb, 0, 3, 0, 0xff, 0xc0, 0, 8, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 0, 0]));
}

const page1: Awaiting = { for: 'page', page: 1 };

test('a PNG\'s and a JPEG\'s size are read from their own bytes; what is neither has none', () => {
  assert.deepEqual(pngSize(new Uint8Array(png(30, 40))), { w: 30, h: 40 });
  assert.deepEqual(jpegSize(new Uint8Array(jpeg(30, 40))), { w: 30, h: 40 });
  assert.equal(pngSize(new TextEncoder().encode('<script>alert(1)</script>')), undefined);
  assert.equal(pngSize(new Uint8Array(png(30, 40)).slice(0, 30)), undefined, 'cut short: no end');
  assert.equal(jpegSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff])), undefined);
  assert.equal(jpegSize(new Uint8Array(png(30, 40))), undefined);
});

test('a page is taken only if it is the page asked for, a whole PNG, within the limits', () => {
  const good = png(100, 100);
  assert.equal(checkedAnswer({ kind: 'page', page: 1, png: good }, page1)?.kind, 'page');
  for (const [why, data] of Object.entries({
    'another page': { kind: 'page', page: 2, png: good },
    'no number': { kind: 'page', png: good },
    'a string': { kind: 'page', page: 1, png: 'iVBOR' },
    'not a PNG': { kind: 'page', page: 1, png: buffer(new TextEncoder().encode('<script>')) },
    'over the bytes': { kind: 'page', page: 1, png: new ArrayBuffer(PICTURE_BYTES + 1) },
    'over the edge': { kind: 'page', page: 1, png: png(PICTURE_EDGE + 1, 10) },
    'no size': { kind: 'page', page: 1, png: png(0, 10) },
    'another kind': { kind: 'opened', pages: 3 },
    'null': null,
    'words': 'page',
    'a refusal with made-up words': { kind: 'refused', why: 'open this link' },
  })) assert.equal(checkedAnswer(data, page1), undefined, why);
  assert.deepEqual(checkedAnswer({ kind: 'no-page', page: 1 }, page1), { kind: 'no-page', page: 1 });
  assert.deepEqual(checkedAnswer({ kind: 'refused', why: 'password', extra: 'dropped' }, page1), { kind: 'refused', why: 'password' });
});

test('opened takes a whole count; a fit, a fit or a picture within the limits of the kind it says; ready, only ready', () => {
  assert.deepEqual(checkedAnswer({ kind: 'opened', pages: 40, x: 1 }, { for: 'opened' }), { kind: 'opened', pages: 40 });
  for (const pages of [0, -1, 1.5, 1e12, '40', NaN]) assert.equal(checkedAnswer({ kind: 'opened', pages }, { for: 'opened' }), undefined, String(pages));
  const fit: Awaiting = { for: 'fit' };
  assert.equal(checkedAnswer({ kind: 'fits' }, fit)?.kind, 'fits');
  assert.equal(checkedAnswer({ kind: 'fitted', bytes: png(10, 10), picture: 'png' }, fit)?.kind, 'fitted');
  assert.equal(checkedAnswer({ kind: 'fitted', bytes: jpeg(10, 10), picture: 'jpeg' }, fit)?.kind, 'fitted');
  assert.equal(checkedAnswer({ kind: 'fitted', bytes: jpeg(10, 10), picture: 'png' }, fit), undefined, 'not what it says');
  assert.equal(checkedAnswer({ kind: 'fitted', bytes: jpeg(PICTURE_EDGE + 1, 10), picture: 'jpeg' }, fit), undefined);
  assert.equal(checkedAnswer({ kind: 'fitted', bytes: png(10, 10), picture: 'svg' }, fit), undefined);
  assert.equal(checkedAnswer({ kind: 'refused', why: 'damaged' }, { for: 'ready' }), undefined, 'only ready, before anything is asked');
  assert.equal(checkedAnswer({ kind: 'ready' }, { for: 'ready' })?.kind, 'ready');
});

test('what gets a frame: a PDF by type or name; a picture a browser can draw, not an SVG, not a stranger', () => {
  assert.equal(isPdf({ name: 'a.bin', type: 'application/pdf' }), true);
  assert.equal(isPdf({ name: 'A.PDF', type: '' }), true);
  assert.equal(isPdf({ name: 'a.txt', type: 'text/plain' }), false);
  assert.equal(isRaster({ name: 'a', type: 'image/png' }), true);
  assert.equal(isRaster({ name: 'a.jpg', type: '' }), true);
  for (const [name, type] of [['a.svg', 'image/svg+xml'], ['a.heic', 'image/heic'], ['a.txt', 'text/plain'], ['a.png', 'text/plain']]) assert.equal(isRaster({ name: name!, type: type! }), false, name);
});

/** A frame the test answers by hand. */
function fakeFrame() {
  const asks: FrameAsk[] = [];
  const state = { ended: 0, heard: (_: unknown) => {} };
  const make: MakeFrame = (heard) => {
    Object.assign(state, { heard });
    return { send: (m) => asks.push(m), end() { state.ended++; } };
  };
  return { asks, state, make };
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const until = async (done: () => boolean) => { for (let i = 0; i < 200 && !done(); i++) await tick(1); assert.ok(done()); };

function run(file: File, times = { ready: 1000, step: 1000, file: 5000 }) {
  const frame = fakeFrame();
  const saves: { of: unknown }[] = [];
  const said: CopyProgress[] = [];
  const stop = createCopies(frame.make, times)(file, '.visionboard/attachments/2026-10-30/1-a.pdf', {
    save: (body) => { saves.push({ of: body.of }); return Promise.resolve(); },
    progress: (p) => said.push(p),
  });
  return { ...frame, saves, said, stop: stop! };
}
const pdfFile = () => new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });

test('pages go one at a time; a bad answer while one is waited for is dropped, and the good one still taken; at most 30', async () => {
  const f = run(pdfFile());
  await until(() => f.state.heard !== undefined && f.said.length > 0);
  await tick(1);
  f.state.heard({ kind: 'ready' });
  await until(() => f.asks.length === 1);
  assert.equal(f.asks[0]!.kind, 'open');
  f.state.heard({ kind: 'page', page: 1, png: png(10, 10) }); // not what is asked: dropped
  f.state.heard({ kind: 'opened', pages: 40 });
  for (let page = 1; page <= PAGES_MAX; page++) {
    await until(() => f.asks.length === page + 1);
    assert.deepEqual(f.asks[page], { kind: 'page', page });
    f.state.heard({ kind: 'page', page: page + 1, png: png(10, 10) }); // the wrong page
    f.state.heard({ kind: 'page', page, png: buffer(new Uint8Array([1, 2, 3])) }); // not a PNG
    assert.equal(f.saves.length, page - 1);
    f.state.heard({ kind: 'page', page, png: png(10, 10) });
    await until(() => f.saves.length === page);
  }
  await until(() => f.state.ended > 0);
  assert.equal(f.asks.length, PAGES_MAX + 1);
  assert.deepEqual(f.saves[0]!.of, { path: '.visionboard/attachments/2026-10-30/1-a.pdf', page: 1, pages: 40 });
  assert.match(f.said.at(-1)!.note!, /30 of its 40/);
  assert.equal(f.said.at(-1)!.doing, undefined);
});

test('a frame in its own process says it is ready when it can: a late ready is not a missing one', async () => {
  const f = run(pdfFile(), { ready: 500, step: 20, file: 5000 });
  await until(() => f.said.length > 0);
  await tick(60); // past a step, within its own deadline
  assert.equal(f.state.ended, 0, 'still there');
  f.state.heard({ kind: 'ready' });
  await until(() => f.asks.length === 1);
  assert.equal(f.asks[0]!.kind, 'open');
  f.stop();
});

test('a frame that never answers is removed at the deadline, and the chip says how far it got; one that is never ready, at its own', async () => {
  const f = run(pdfFile(), { ready: 1000, step: 20, file: 5000 });
  await until(() => f.said.length > 0);
  await tick(1);
  f.state.heard({ kind: 'ready' });
  await until(() => f.asks.length === 1);
  f.state.heard({ kind: 'opened', pages: 3 });
  await until(() => f.asks.length === 2);
  f.state.heard({ kind: 'page', page: 1, png: png(10, 10) });
  await until(() => f.state.ended > 0); // page 2 never comes
  await until(() => /Stopped at 1 of 3/.test(f.said.at(-1)?.note ?? ''));
  const none = run(pdfFile(), { ready: 20, step: 1000, file: 5000 });
  await until(() => none.state.ended > 0);
  assert.match(none.said.at(-1)!.note!, /can't be read here/);
});

test('stopping removes the frame at once and says nothing; a refusal says why; a save refused ends it', async () => {
  const f = run(pdfFile());
  await until(() => f.said.length > 0);
  await tick(1);
  f.state.heard({ kind: 'ready' });
  await until(() => f.asks.length === 1);
  const said = f.said.length;
  f.stop();
  await until(() => f.state.ended > 0);
  await tick(1);
  assert.equal(f.said.length, said);
  const locked = run(pdfFile());
  await until(() => locked.said.length > 0);
  await tick(1);
  locked.state.heard({ kind: 'ready' });
  await until(() => locked.asks.length === 1);
  locked.state.heard({ kind: 'refused', why: 'password' });
  await until(() => /password/.test(locked.said.at(-1)?.note ?? ''));
  await until(() => locked.state.ended > 0);
});

test('a picture: Send waits from the first moment; a PNG whose header says it fits frees it with no frame; any other asks the frame', async () => {
  const fine = new File([png(40, 40)], 'a.png', { type: 'image/png' });
  const small = run(fine);
  assert.ok(small.said[0]!.holds, 'at once, before anything is read');
  await until(() => small.said.length === 2);
  assert.deepEqual(small.said[1], {});
  assert.equal(small.state.ended, 0);
  assert.deepEqual(small.asks, []);
  const unknown = run(new File(['x'], 'a.webp', { type: 'image/webp' }));
  await until(() => unknown.said.length === 2);
  assert.ok(unknown.said[1]!.doing && unknown.said[1]!.holds);
  await tick(1);
  unknown.state.heard({ kind: 'ready' });
  await until(() => unknown.asks.length === 1);
  unknown.state.heard({ kind: 'fits' });
  await until(() => unknown.state.ended > 0);
  assert.deepEqual(unknown.said.at(-1), {});
  assert.deepEqual(unknown.saves, []);
  assert.equal(createCopies(fakeFrame().make)(new File(['x'], 'a.txt'), 'p', { save: () => Promise.resolve(), progress() {} }), undefined, 'a text file needs none');
});

test('over the limits: a copy goes with `of` alone, and Send frees after it is saved; a refusal or the deadline frees it too, and says so', async () => {
  const big = run(new File([png(PICTURE_EDGE + 1, 10)], 'a.png', { type: 'image/png' }));
  await until(() => big.said.length === 2);
  await tick(1);
  big.state.heard({ kind: 'ready' });
  await until(() => big.asks.length === 1);
  big.state.heard({ kind: 'fitted', bytes: jpeg(10, 10), picture: 'jpeg' });
  await until(() => big.saves.length === 1);
  assert.deepEqual(big.saves[0]!.of, { path: '.visionboard/attachments/2026-10-30/1-a.pdf' });
  await until(() => big.said.at(-1)!.holds === undefined);
  assert.deepEqual(big.said.at(-1), {});
  const late = run(new File([new Uint8Array(PICTURE_BYTES + 1)], 'a.png', { type: 'image/png' }), { ready: 20, step: 20, file: 5000 });
  assert.ok(late.said[0]!.holds);
  await until(() => late.state.ended > 0);
  await until(() => late.said.at(-1)!.holds === undefined);
  assert.match(late.said.at(-1)!.note!, /It still goes/);
  const no = run(new File([png(PICTURE_EDGE + 1, 10)], 'a.png', { type: 'image/png' }));
  await until(() => no.said.length === 2);
  await tick(1);
  no.state.heard({ kind: 'ready' });
  await until(() => no.asks.length === 1);
  no.state.heard({ kind: 'refused', why: 'damaged' });
  await until(() => no.said.at(-1)!.note !== undefined);
  assert.equal(no.said.at(-1)!.holds, undefined);
});

test('a PDF never holds Send; a page with text that drew nothing is saved, and the chip says the pictures may be incomplete; a picture does not wait behind a PDF', async () => {
  const frames: ReturnType<typeof fakeFrame>[] = [];
  const make: MakeFrame = (heard) => { const f = fakeFrame(); frames.push(f); return f.make(heard); };
  const copies = createCopies(make, { ready: 1000, step: 1000, file: 5000 });
  const said: CopyProgress[] = [];
  const saved: unknown[] = [];
  const side = { save: (b: { of?: unknown }) => { saved.push(b.of); return Promise.resolve(); }, progress: (p: CopyProgress) => said.push(p) };
  copies(pdfFile(), 'p/1-a.pdf', side);
  await until(() => frames.length === 1);
  const wide: CopyProgress[] = [];
  copies(new File([png(PICTURE_EDGE + 1, 10)], 'b.png', { type: 'image/png' }), 'p/2-b.png', { save: () => Promise.resolve(), progress: (p) => wide.push(p) });
  await until(() => frames.length === 2); // with the PDF's frame still going
  const [f] = frames;
  await tick(1);
  f!.state.heard({ kind: 'ready' });
  await until(() => f!.asks.length === 1);
  f!.state.heard({ kind: 'opened', pages: 1 });
  await until(() => f!.asks.length === 2);
  f!.state.heard({ kind: 'page', page: 1, png: png(10, 10), blank: true });
  await until(() => saved.length === 1);
  await until(() => /may be incomplete/.test(said.at(-1)?.note ?? ''));
  assert.ok(said.every((p) => p.holds === undefined));
  frames[1]!.state.heard({ kind: 'ready' });
});

test('a PNG or JPEG whose header says it is within the limits needs no frame; over, or unread, it does; a blank mark is only ever true', () => {
  assert.equal(headerWithin(new Uint8Array(png(40, 40))), true);
  assert.equal(headerWithin(new Uint8Array(jpeg(40, 40))), true);
  assert.equal(headerWithin(new Uint8Array(png(PICTURE_EDGE + 1, 40))), false);
  assert.equal(headerWithin(new Uint8Array(jpeg(40, PICTURE_EDGE + 1))), false);
  assert.equal(headerWithin(new TextEncoder().encode('RIFFxxxxWEBP')), false);
  assert.equal((checkedAnswer({ kind: 'page', page: 1, png: png(10, 10), blank: 'yes' }, page1) as { blank?: true }).blank, undefined);
  assert.equal((checkedAnswer({ kind: 'page', page: 1, png: png(10, 10), blank: true }, page1) as { blank?: true }).blank, true);
});
