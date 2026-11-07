// Board to chat and back (docs/specification/plugin.md § The chat), through a fake chat that uses only the seam, and an
// agent that is only tool calls: the person selects and answers, Send goes as a message of resolved chips; the bot
// reads and redraws through its tools; the change reaches the board by events and the chat as a line; the line zooms
// the board by `reveal`, and the card's stepper links back to the line.
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

test('a board-to-chat round trip through the seam alone', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await drive(page, 'status', { agent: (host.bot as { agent: string }).agent });

  // The person answers card 1 and selects card 2.
  await page.locator('.host-root vb-node[data-id="1"] button[data-act="ack"]').click();
  await page.locator('.host-root vb-node[data-id="2"]').click();
  await expect.poll(async () => (await drive(page, 'record')).chips.map((c: { kind: string }) => c.kind).sort()).toEqual(['answers', 'selection']);

  // Send: one message, each chip's text from the engine.
  await page.locator('.host-root #vb1-send').click();
  await expect.poll(() => host.messages.length).toBe(1);
  const texts = host.messages[0]!.blocks.map((b) => b.text).join('\n');
  expect(texts).toContain('1 (question): ✓');
  expect(texts).toContain('Who reviews?');
  await expect(page.locator('#host-chips li'), 'what went is spent').toHaveCount(0);

  // The bot reads what the person did, then redraws card 2.
  await drive(page, 'status', { now: 'working' });
  expect((await drive(page, 'boardStatus')).chatWork).toBe('working');
  const read = await host.tool('check_responses', { board: 'plans', after: 0 });
  expect(read.isError).toBe(false);
  expect(JSON.stringify(read.structuredContent)).toContain('check');
  await host.tool('write_board', { board: 'plans', items: [{ type: 'node', n: 2, node: { region: 'now', kind: 'question', title: 'Who reviews, and when?' } }] });
  await drive(page, 'status', { now: 'idle' });

  // The board drew it (events), and the chat has the line (the result's `_meta`).
  await expect(page.locator('.host-root vb-node[data-id="2"]')).toContainText('Who reviews, and when?');
  const line = page.locator('#host-lines .host-line');
  await expect(line, 'its words in words.json, filled').toHaveText('Changed a card on board “plans”');

  // The line zooms the board to the card, selecting nothing.
  const before = (await drive(page, 'boardStatus')).zoom;
  await line.click();
  await expect.poll(async () => (await drive(page, 'boardStatus')).zoom).not.toBe(before);
  expect((await drive(page, 'record')).chips).toEqual([]);

  // And the card links back to the line.
  const card = page.locator('.host-root vb-node[data-id="2"]');
  await card.locator('[data-tab="updates"]').click();
  await card.getByRole('button', { name: 'Show in the chat' }).click();
  await expect.poll(async () => (await drive(page, 'record')).reveals, 'a plain ref').toEqual([{ board: 'plans', cards: 2 }]);
});
