// The timeline's layers on the board (D-105; the timeline set's FIX_04): the line and the stems draw beneath the
// links, the dots (and their rings) above every link and label, so a link crossing a timeline never covers a dot; and
// every group is placed in SVG units, never by a CSS transform (2026-11-22). The wires layer ignores the pointer, so
// both are read from the layer's own children, in the page.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { joinAgent, open, write } from './agent-board.ts';

const ON = '?vbwork&flags=timeline';

/** Three dated cards in a row and two links across them, opened. */
async function drawLayers(page: Page, request: APIRequestContext): Promise<void> {
  const d = { agent: await joinAgent(request, 'Plan chat'), board: `layers-${Date.now()}` };
  const dated = (title: string, timeline: string) => ({ type: 'node', node: { region: 'plan', kind: 'topic', title, timeline } });
  const r = await write(request, d, [
    { type: 'board', title: 'Layers' },
    { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'row' } },
    dated('First', '2026-01'), dated('Second', '2026-02'), dated('Third', '2026-03'),
  ]);
  const n = r.slice(2).map((x) => x.n!);
  await write(request, d, [{ type: 'link', from: n[0], to: n[2], label: 'across' }, { type: 'link', from: n[1], to: n[2] }]);
  await open(page, { ...d, n }, ON);
}

test('the dots draw above every link and label; the line and the stems stay beneath the links', async ({ page, request }) => {
  await drawLayers(page, request);
  const order = await page.evaluate(() => {
    const svg = document.querySelector('svg.vb-wires:not(.vb-wires-top)')!;
    const all = [...svg.querySelectorAll('*')];
    const at = (sel: string) => all.flatMap((e, i) => (e.matches(sel) ? [i] : []));
    return { dots: at('.vb-timeline-dot'), wires: at('.vb-wire'), labels: at('.vb-wire-label, text:not(.vb-timeline-year, .vb-timeline-year-halo)'), stems: at('.vb-timeline-stem'), line: at('.vb-timeline-line') };
  });
  expect(order.dots, 'a dot per dated card').toHaveLength(3);
  expect(order.wires.length, 'links are drawn').toBeGreaterThan(0);
  const [firstDot, lastWire, firstWire] = [Math.min(...order.dots), Math.max(...order.wires), Math.min(...order.wires)];
  expect(firstDot, 'every dot after every link').toBeGreaterThan(lastWire);
  if (order.labels.length) expect(firstDot, 'and after every label').toBeGreaterThan(Math.max(...order.labels));
  expect(Math.max(...order.stems, ...order.line), 'the line and the stems before the links').toBeLessThan(firstWire);
});

test('the line, its stems and its dots are placed in SVG units (the transform attribute), never a CSS transform', async ({ page, request }) => {
  // A CSS length on an SVG child is scaled again by WebKit's page zoom (Safari zoomed in, nclite at 110%), which moved
  // the line off its cards; the attribute is in the SVG's own units, as the links' path data is.
  await drawLayers(page, request);
  const groups = await page.locator('svg.vb-wires :is(.vb-timelines, .vb-timeline-dots) > g').evaluateAll((els) =>
    els.map((g) => ({ attr: g.getAttribute('transform'), css: (g as SVGGElement).style.transform })));
  expect(groups, 'the line, three stems and three dots').toHaveLength(7);
  for (const g of groups) {
    expect(g.attr, 'placed by the attribute').toMatch(/^translate\(-?[\d.]+ -?[\d.]+\)$/);
    expect(g.css, 'no CSS transform').toBe('');
  }
});
