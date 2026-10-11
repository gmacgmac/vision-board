// Same picture (N12_FE_01 ruling 1, rule 9): the board page applies each change in place, and after
// every step of a seeded random sequence it shows exactly what a page that opened afresh on the
// same ledger shows: every card's markup, place and size, every frame, every connector and lane,
// the counts. The sequence mixes the person's acts (sent by the page itself and by "another tab"),
// and an agent drawing: new cards, new versions, links and a container change.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { PERF_BASE } from './perf-server.ts';
import { seeded } from '../../apps/board/tests/random.ts';
import type { Random } from '../../apps/board/tests/random.ts';

const BOARD = 'mixed';
/** The mixed board copies the roadmap: 17 nodes, the ledger's 1001 to 1017 after the big board's
 * 1,000, which the board numbers 1 to 17 (D-041 proposed, api.md 125): every act names its number. */
const FIRST = 1;
const ITEMS = Array.from({ length: 17 }, (_, i) => FIRST + i).filter((n) => n !== FIRST + 6);
const REGIONS = ['review', 'prove', 'decide', 'build'];
const MODES = ['grid', 'column', 'row', 'flow', 'lanes', 'radial'];

async function open(page: Page): Promise<void> {
  await page.goto(`${PERF_BASE}/?vbwork#${BOARD}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

/** Everything the board shows, once it is idle, in world coordinates (the viewport is left out). */
const picture = (page: Page) => page.evaluate(async () => {
  await (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle();
  (document.activeElement as HTMLElement | null)?.blur();
  await (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle();
  // The markup, with attributes in name order (an update adds one where a render wrote it first)
  // and without what depends on the viewport or a running transition. Read, never written: the
  // page's CSP refuses a script that writes a style attribute.
  const SKIP = new Set(['data-offscreen']);
  const style = (e: Element) => (e as HTMLElement).style?.cssText.replace(/\s*contain-intrinsic-size:[^;]*;?/, '').trim() ?? '';
  const clean = (e: Element): string => {
    const attrs = [...e.attributes].filter((a) => !SKIP.has(a.name))
      .map((a) => `${a.name}="${a.name === 'style' ? style(e) : a.name === 'class' ? a.value.replace(/\s*settling/, '') : a.value}"`).sort();
    const kids = [...e.childNodes].map((c) => (c.nodeType === Node.ELEMENT_NODE ? clean(c as Element) : c.textContent ?? '')).join('');
    return `<${e.localName} ${attrs.join(' ')}>${kids}</${e.localName}>`;
  };
  return {
    cards: [...document.querySelectorAll<HTMLElement>('#cards vb-node')].map((e) => ({ html: clean(e), w: e.offsetWidth, h: e.offsetHeight })),
    regions: [...document.querySelectorAll('#regions vb-region')].map(clean),
    wires: clean(document.querySelector('#wires')!),
    counts: document.querySelector('#counts')!.textContent,
  };
});

interface Agent { secret: string; own: number[]; region: string }

async function write(request: APIRequestContext, a: Agent, items: unknown[]): Promise<{ n?: number }[]> {
  const r = await request.post(`${PERF_BASE}/api/boards/${BOARD}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json() as { results: { n?: number }[] }).results;
}

/** One act as the person, from "another tab" (straight to the API); refused acts are skipped. */
const act = (page: Page, body: Record<string, unknown>) =>
  page.request.post(`${PERF_BASE}/api/boards/${BOARD}/act`, { data: { type: 'act', ...body } });

async function versionOf(page: Page, n: number): Promise<number> {
  const b = await (await page.request.get(`${PERF_BASE}/api/boards/${BOARD}`)).json() as { versions: Record<string, number> };
  return b.versions[String(n)]!;
}

/** One random step; returns what it did, for the failure message. */
async function step(page: Page, request: APIRequestContext, a: Agent, r: Random, i: number): Promise<string> {
  const n = r.pick(ITEMS);
  const kind = r.int(9);
  if (kind === 0) {
    // The page's own path: a click on a card's button.
    const action = r.pick(['ack', 'drop', 'later']);
    await page.evaluate(({ n, action }) => document.querySelector<HTMLButtonElement>(`vb-node[data-id="${n}"] button[data-act="${action}"]`)?.click(), { n, action });
    return `click ${action} on ${n}`;
  }
  if (kind === 1) {
    const action = r.pick(['ack', 'drop', 'later', 'reopen']);
    await act(page, { action, n, ver: await versionOf(page, n) });
    return `${action} ${n}`;
  }
  if (kind === 2) {
    await act(page, { action: 'comment', n, ver: await versionOf(page, n), text: `Note ${i}: ${'more words '.repeat(r.int(6))}` });
    return `comment on ${n}`;
  }
  if (kind === 3) {
    await act(page, { action: 'pin', n, x: r.int(500) - 60, y: r.int(400) - 60 });
    return `pin ${n}`;
  }
  if (kind === 4) {
    if (r.int(2)) await act(page, { action: 'unpin', n });
    else await act(page, { action: 'size', n, size: r.pick(['s', 'm', 'l', 'auto']) });
    return `unpin or size ${n}`;
  }
  if (kind === 5) {
    await act(page, { action: 'mode', board: BOARD, region: r.pick([...REGIONS, a.region]), mode: r.pick(MODES) });
    return 'mode';
  }
  if (kind === 6 || a.own.length < 2) {
    const [res] = await write(request, a, [{ type: 'node', node: { region: a.region, kind: r.pick(['question', 'finding', 'risk']), title: `Agent card ${i}` } }]);
    a.own.push(res!.n!);
    return 'agent adds a card';
  }
  if (kind === 7) {
    const mine = r.pick(a.own);
    await write(request, a, [{ type: 'node', n: mine, node: { region: a.region, kind: 'finding', title: `Agent card ${mine}, v${i}`, body: 'Longer now. '.repeat(r.int(30)) } }]);
    return `agent redraws ${mine}`;
  }
  const [from, to] = [r.pick(a.own), r.pick([...a.own, ...ITEMS.slice(0, 3)])];
  if (from !== to) await write(request, a, [{ type: r.pick(['link', 'unlink']), from, to }]);
  return `agent links ${from} ${to}`;
}

for (const seed of [11, 77, 2026]) {
  test(`seed ${seed}: after each of 40 random changes the page shows what a fresh page shows`, async ({ page, context, request }) => {
    test.setTimeout(120_000);
    const j = await request.post(`${PERF_BASE}/api/agents`, { data: { label: `Picture ${seed}` } });
    const a: Agent = { ...(await j.json() as { secret: string }), own: [], region: `agent-${seed}` };
    await write(request, a, [{ type: 'region', region: { id: a.region, title: `Agent ${seed}`, mode: 'flow' } }]);
    await open(page);
    const fresh = await context.newPage();
    const r = seeded(seed);
    for (let i = 0; i < 40; i++) {
      const did = await step(page, request, a, r, i);
      const now = await picture(page);
      await open(fresh);
      expect(now, `step ${i}: ${did}`).toEqual(await picture(fresh));
    }
    const counted = await page.evaluate(() => (window as unknown as { __vbWork: { work: { fullFetches: number } } }).__vbWork.work.fullFetches);
    expect(counted).toBe(1);
  });
}
