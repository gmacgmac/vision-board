// The board in any host (ARCH_03; principles § The board is a plugin; nclite's plugin contract,
// docs/plugins.md § The view and its host): `mount(root, host)` with a fake host, no Svelte and no
// server. The board draws a fixture board from the host's `api`; Send hands the selected card to
// `addToChat`; a removal asks the host's `confirm` first; a change event redraws; two boards on one
// page work apart; and after `unmount` each root is empty and given back as it was, with no listener
// left on the document or the window and none on the host. A host's Close asks the board first
// (`leave`, M11): only a note with changed words makes the host's confirm ask. The fixture (board-host-fixture.ts) is
// bundled here in memory with Vite and run in a blank page.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { build } from 'vite';
import { FIXTURES_DIR } from '#format/files';
import { expect, test } from './helpers.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const LINES = readFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as { seq: number; type: string });
/** Board A starts with the ledger up to the line before the last card; the rest comes as one event. */
const LAST_NODE = LINES.findLast((l) => l.type === 'node')!.seq;
const SHOWN = LAST_NODE - 1;
const nodesUpTo = (seq: number) => LINES.filter((l) => l.type === 'node' && l.seq <= seq).length;

let bundle: { js: string; css: string } | null = null;

/** The fixture as one script and one sheet. */
async function fixture(): Promise<{ js: string; css: string }> {
  if (bundle) return bundle;
  const out = await build({
    configFile: false, logLevel: 'silent', root: ROOT,
    build: { write: false, target: 'es2022', cssCodeSplit: false, minify: false,
      lib: { entry: path.join(ROOT, 'tests/pages/board-host-fixture.ts'), formats: ['es'], fileName: 'fixture' } },
  });
  const files = (Array.isArray(out) ? out : [out]).flatMap((o) => ('output' in o ? o.output : []));
  const js = files.find((f) => f.type === 'chunk');
  const css = files.find((f) => f.type === 'asset' && f.fileName.endsWith('.css'));
  if (js?.type !== 'chunk' || css?.type !== 'asset') throw new Error('the fixture did not bundle');
  bundle = { js: js.code, css: String(css.source) };
  return bundle;
}

/** A blank page holding two empty roots, in a host's own layout, with the fixture loaded. */
async function open(page: Page): Promise<void> {
  const { js, css } = await fixture();
  await page.setContent('<!doctype html><html lang="en"><head><title>Host</title></head><body><main class="host"><div id="host-bar"></div><div id="a"></div><div id="b"></div></main></body></html>');
  await page.addStyleTag({ content: `${css}\n.host { display: flex; gap: 8px; } #a, #b { width: 620px; height: 560px; }` });
  await page.addScriptTag({ content: js, type: 'module' });
  await page.waitForFunction(() => 'vbHost' in window);
}

type Host = {
  listeners(): number; mount(id: string, lines: object[], shown: number): void; idle(id: string): Promise<void>;
  send(id: string): Promise<string | null>; status(id: string): { selection: string; hide: boolean; boardId: string };
  record(id: string): { chips: { kind: string; ref: { board: string; n: number } }[]; confirms: { heading: string; list?: unknown }[];
    notices: { text: string; tone?: string }[]; calls: string[]; subscribers: number };
  pageChip(id: string): { plugin: string; kind: string; ref: { board: string; head: number }; label: string; detail: string } | null;
  addHostControls(parentId: string): void; addClose(parentId: string, id: string): void; unsaved(id: string): boolean;
  answer(id: string, ok: boolean): void; appendRest(id: string): void; unmount(id: string): void;
};
const call = <T>(page: Page, fn: (h: Host, ...args: never[]) => T, ...args: unknown[]) =>
  page.evaluate(({ src, args }) => (new Function('h', 'args', `return (${src})(h, ...args)`) as (h: unknown, a: unknown[]) => T)((window as unknown as { vbHost: unknown }).vbHost, args), { src: fn.toString(), args });

test('the board mounts in a fake host: it draws, Send reaches addToChat, a removal asks confirm, an event redraws, two boards work apart, and unmount leaves nothing', async ({ page }) => {
  await open(page);
  const baseline = await call(page, (h) => h.listeners());
  const bodyKids = await page.evaluate(() => document.body.querySelectorAll('*').length);
  await call(page, (h, lines: object[], shown: number) => { h.mount('a', lines, shown); h.mount('b', lines, lines.length); }, LINES, SHOWN);
  const a = page.locator('#a vb-node');
  const b = page.locator('#b vb-node');
  await expect(a).toHaveCount(nodesUpTo(SHOWN));
  await expect(b).toHaveCount(nodesUpTo(Infinity));

  // The board's elements are inside its root, with no ids of their own; the root is its stage.
  await expect(page.locator('#a')).toHaveClass(/\bvb-board\b.*\bvb-stage\b/);
  expect(await page.evaluate(() => document.querySelectorAll('#a > [id], #a .vb-world > [id]').length)).toBe(0);
  expect(await page.evaluate(() => document.querySelectorAll('body > :not(main)').length)).toBe(0);

  // Two boards, one document: no id twice, and every aria-controls / aria-describedby points inside its own board.
  const ids = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[id]')].map((e) => e.id);
    const own = (root: string) => [...document.querySelectorAll(`#${root} [aria-controls], #${root} [aria-describedby]`)].flatMap((e) =>
      [e.getAttribute('aria-controls'), e.getAttribute('aria-describedby')].filter((r): r is string => !!r).map((r) => (document.getElementById(r)?.closest(`#${root}`) ?? null) !== null));
    return { duplicates: all.filter((id, i) => all.indexOf(id) !== i), a: own('a'), b: own('b'), second: [...document.querySelectorAll('#b [id]')].map((e) => e.id) };
  });
  expect(ids.duplicates).toEqual([]);
  expect(ids.a.length).toBeGreaterThan(0);
  expect([...ids.a, ...ids.b]).not.toContain(false);
  expect(ids.second.length).toBeGreaterThan(0);
  expect(ids.second.every((id) => id.startsWith('vb2-'))).toBe(true);

  // The board on show is the page's chip: the board, and the head it was added at.
  const pageChip = await call(page, (h) => h.pageChip('a'));
  expect(pageChip).toEqual({ plugin: 'board', kind: 'board', ref: { board: 'roadmap', head: SHOWN }, label: expect.any(String), detail: 'Board "roadmap"' });

  // Send: the selected card goes to the host's chat as a chip, then the send act goes through `api`.
  await a.first().click();
  await expect.poll(() => call(page, (h) => h.status('a').selection)).toMatch(/1 card selected/);
  expect(await call(page, (h) => h.status('b').selection), 'the other board keeps its own selection').toBe('');
  const problem = await call(page, (h) => h.send('a'));
  const rec = await call(page, (h) => h.record('a'));
  expect(rec.chips).toEqual([expect.objectContaining({ plugin: 'board', kind: 'card', ref: expect.objectContaining({ board: 'roadmap' }) })]);
  expect(rec.calls).toContain('POST boards/roadmap/act');
  expect(problem).toBe('The fake host refuses it.');
  expect(rec.notices).toContainEqual({ text: 'The fake host refuses it.', tone: 'error' });
  expect((await call(page, (h) => h.record('b'))).chips, 'nothing went from the other board').toEqual([]);

  // A removal asks the host first; cancelled, nothing is sent.
  await a.first().focus();
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await call(page, (h) => h.record('a'))).confirms.length).toBe(1);
  expect((await call(page, (h) => h.record('a'))).calls.some((c) => c.includes('/retire'))).toBe(false);

  // Keys belong to the board they are pressed in.
  await page.keyboard.press('h');
  await expect.poll(() => call(page, (h) => h.status('a').hide)).toBe(true);
  expect(await call(page, (h) => h.status('b').hide)).toBe(false);

  // A change event redraws: the rest of the ledger, said once.
  await call(page, (h) => h.appendRest('a'));
  await expect(a).toHaveCount(nodesUpTo(Infinity));

  // Unmount: each root empty and given back; no listener on the document or window, none on the host.
  await call(page, (h) => { h.unmount('a'); h.unmount('b'); });
  for (const id of ['a', 'b']) {
    expect(await page.evaluate((r) => { const el = document.getElementById(r)!; return [el.childElementCount, el.className, el.getAttribute('tabindex')]; }, id)).toEqual([0, '', null]);
    expect((await call(page, (h, r: string) => h.record(r), id)).subscribers).toBe(0);
  }
  expect(await call(page, (h) => h.listeners())).toBe(baseline);
  expect(await page.evaluate(() => document.body.querySelectorAll('*').length)).toBe(bodyKids);
});

test('keys stay inside the board: a host control hears its own keys, and a click inside the board gives the board its keys', async ({ page }) => {
  await open(page);
  await call(page, (h, lines: object[]) => { h.addHostControls('host-bar'); h.mount('a', lines, lines.length); h.mount('b', lines, lines.length); }, LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(nodesUpTo(Infinity));
  const hidden = (id: string) => call(page, (h, r: string) => h.status(r).hide, id);

  // Focus on a host button: H reaches no board.
  await page.locator('#host-button').focus();
  await page.keyboard.press('h');
  await page.keyboard.press('Escape');
  expect(await hidden('a')).toBe(false);
  expect(await hidden('b')).toBe(false);
  // Typing in a host field: no shortcut fires, and the field gets its letters.
  await page.locator('#host-input').focus();
  await page.keyboard.type('hjk');
  expect(await hidden('a')).toBe(false);
  expect(await hidden('b')).toBe(false);
  await expect(page.locator('#host-input')).toHaveValue('hjk');
  await expect(page.locator('#a vb-node:focus, #b vb-node:focus')).toHaveCount(0);

  // A click on the empty canvas leaves focus in the root: the next key is the board's, and only that board's.
  for (const gesture of ['click', 'shift-drag', 'cmd-drag'] as const) {
    await page.locator('#host-button').focus();
    const box = (await page.locator('#a').boundingBox())!;
    const at = { x: box.x + box.width - 12, y: box.y + box.height - 12 };
    const mods = gesture === 'shift-drag' ? 'Shift' : 'Control';
    if (gesture === 'click') await page.mouse.click(at.x, at.y);
    else {
      await page.keyboard.down(mods);
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x - 20, at.y - 20, { steps: 4 });
      await page.mouse.up();
      await page.keyboard.up(mods);
    }
    await page.keyboard.press('h');
    await expect.poll(() => hidden('a'), { message: gesture }).toBe(true);
    expect(await hidden('b'), 'the other board is deaf').toBe(false);
    await page.keyboard.press('h');
    await expect.poll(() => hidden('a')).toBe(false);
  }

  // A click on a card: J steps focus to a card; on a container's title line: its keys work too.
  await page.locator('#host-button').focus();
  await page.locator('#a vb-node').first().click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('j');
  await expect(page.locator('#a vb-node:focus')).toHaveCount(1);
  expect(await page.evaluate(() => document.activeElement?.closest('.vb-board')?.id)).toBe('a');
  await page.locator('#host-button').focus();
  const title = (await page.locator('#a .vb-region-head h2').first().boundingBox())!;
  await page.mouse.click(title.x + title.width / 2, title.y + title.height / 2);
  await page.keyboard.press('h');
  await expect.poll(() => hidden('a')).toBe(true);
  expect(await hidden('b')).toBe(false);
});

test('the host asks before words are lost: Close asks only while a note holds changed words; Cancel keeps them, OK unmounts', async ({ page }) => {
  await open(page);
  const baseline = await call(page, (h) => h.listeners());
  await call(page, (h, lines: object[]) => {
    h.mount('a', lines, lines.length); h.mount('b', lines, lines.length); h.addClose('host-bar', 'a'); h.addClose('host-bar', 'b');
  }, LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(nodesUpTo(Infinity));
  const text = (id: string) => page.locator(`#${id} vb-note-bubble textarea`);
  const confirms = (id: string) => call(page, (h, r: string) => h.record(r).confirms, id);
  const unsaved = (id: string) => call(page, (h, r: string) => h.unsaved(r), id);

  // A note being written on A, one opened and left unchanged on B.
  await page.locator('#a vb-node').first().focus();
  await page.keyboard.press('c');
  await expect(text('a')).toBeFocused();
  expect(await unsaved('a'), 'an open note with no words typed is not unsaved').toBe(false);
  await page.keyboard.type('Half a thought');
  expect(await unsaved('a')).toBe(true);
  await page.locator('#b vb-node').first().focus();
  await page.keyboard.press('c');
  await expect(text('b')).toBeFocused();
  expect(await unsaved('b')).toBe(false);

  // Close A, Cancel: the host's confirm asked the discard question once; the board, the words and
  // focus in the text stay, and the next key goes into the note.
  await page.locator('#close-a').click();
  await expect.poll(async () => (await confirms('a')).length).toBe(1);
  expect((await confirms('a'))[0]).toEqual({ heading: 'Discard your changes?', body: 'Changes will be lost.', confirm: 'Discard' });
  await expect(text('a')).toBeFocused();
  await expect(text('a')).toHaveValue('Half a thought');
  await page.keyboard.type('!');
  await expect(text('a')).toHaveValue('Half a thought!');
  await expect(page.locator('#a vb-node')).toHaveCount(nodesUpTo(Infinity));

  // Close B, its note unchanged: it unmounts at once, with no question, and A is untouched.
  await page.locator('#close-b').click();
  await expect.poll(() => page.evaluate(() => document.getElementById('b')!.childElementCount)).toBe(0);
  expect(await confirms('b')).toEqual([]);
  expect((await confirms('a')).length).toBe(1);
  await expect(text('a')).toHaveValue('Half a thought!');

  // Close A again, OK: the board unmounts and leaves nothing.
  await call(page, (h) => h.answer('a', true));
  await page.locator('#close-a').click();
  await expect.poll(() => page.evaluate(() => document.getElementById('a')!.childElementCount)).toBe(0);
  expect((await confirms('a')).length).toBe(2);
  expect(await page.evaluate(() => document.getElementById('a')!.className)).toBe('');
  expect(await call(page, (h) => h.listeners())).toBe(baseline);
});
