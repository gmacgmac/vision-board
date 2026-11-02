// The board's controls inside `mount`'s root (plugin-mode CHROME_01, M8, M27). A fake host
// with nothing of `shell/` gets the whole board: the header in its pane, search, help and the dialogs; what is the
// standalone page's (Theme, its folder, Chat) is absent and the header reflows. The standalone page has the
// same controls in its root, the chat beside them.
import { expect, test, bid } from './helpers.ts';
import { call, LINES, open } from './board-host-page.ts';
import { startRoadmapServer } from './roadmap-server.ts';
import { openBoard } from './board-page.ts';

test('a host gets the whole board inside its root, and nothing that is the page\'s', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await open(page);
  await page.addStyleTag({ content: '#a { width: 1320px; height: 800px; }' });
  await call(page, (h, lines: object[]) => { h.mount('a', lines, lines.length); h.addHostControls('host-bar'); }, LINES);
  const root = page.locator('#a');
  await expect(root.locator('vb-node').first()).toBeVisible();

  // The header sits along the root's top and the stage under it, in the host's pane.
  const [box, bar, stage] = await Promise.all([root, root.locator('> header.vb-toolbar'), root.locator('> .vb-stage')].map((l) => l.boundingBox()));
  expect(bar).toMatchObject({ x: box!.x, y: box!.y, width: box!.width });
  expect(stage).toMatchObject({ x: box!.x, y: box!.y + bar!.height, width: box!.width, height: box!.height - bar!.height });
  await expect(root.locator('#vb1-board')).toBeAttached();
  await expect(root.locator('#vb1-send')).toBeVisible();
  // What is the page's is not there, and the bar has no hole for it.
  await expect(page.locator('#vb1-chat-toggle, .vb-folder-chip, .vb-part, .vb-path-sep:first-child')).toHaveCount(0);
  await root.locator('#vb1-toolbar-menu').click();
  await expect(root.locator('#vb1-hide')).toBeVisible();
  await expect(page.locator('#vb1-theme, #vb1-align, #vb1-open-folder')).toHaveCount(0);
  await expect(root.locator('#vb1-toolbar-menu')).not.toHaveAttribute('title', /Theme|Open folder/);
  await page.keyboard.press('Escape');

  // `/` opens the search inside the root, from the board, and is the host's in its own field (M27).
  await page.locator('#host-input').click();
  await page.keyboard.press('/');
  await expect(root.locator('.vb-go')).toHaveCount(0);
  await root.locator('vb-node').first().click();
  await page.keyboard.press('/');
  await expect(root.locator('.vb-go input')).toBeFocused();
  // A word typed marks the cards it finds, and Esc takes the marks away with the box.
  await page.keyboard.type('the');
  await expect(root.locator('.vb-world[data-search]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(root.locator('.vb-go')).toHaveCount(0);
  await expect(root.locator('.vb-world[data-search]')).toHaveCount(0);

  // `?` opens the help, and it is the host's outside the root.
  await page.locator('#host-button').focus();
  await page.keyboard.press('?');
  await expect(root.locator('.vb-keys')).not.toHaveAttribute('data-keys-open');
  await root.locator('vb-node').first().focus();
  await page.keyboard.press('?');
  await expect(root.locator('.vb-keys')).toHaveAttribute('data-keys-open');
  await page.keyboard.press('Escape');

  // New board opens its dialog inside the root; Cancel closes it.
  await root.locator('#vb1-board').selectOption(':new-board');
  await expect(root.locator('dialog#vb1-board-dialog')).toBeVisible();
  await root.locator('#vb1-board-cancel').click();
  await expect(root.locator('dialog#vb1-board-dialog')).toBeHidden();

  // Reply: its panel is inside the root, and Copy's word goes through the host's `notify`.
  await root.locator('#vb1-toolbar-menu').click();
  await root.locator('#vb1-reply-toggle').click();
  await expect(root.locator('#vb1-reply')).toBeVisible();
  await root.locator('#vb1-copy').click();
  await expect.poll(async () => (await call(page, (h) => h.record('a'))).notices.length).toBe(1);
  await root.locator('#vb1-reply-close').click();

  // Archive board… asks the host's `confirm`; the host's answer is no, so nothing happens.
  await root.locator('#vb1-toolbar-menu').click();
  await root.locator('#vb1-archive-board').click();
  await expect.poll(async () => (await call(page, (h) => h.record('a'))).confirms.length).toBe(1);

  await call(page, (h) => h.unmount('a'));
  await expect(root.locator('*')).toHaveCount(0);
});

test('the standalone page holds the controls in the board\'s root, and the chat beside them under the header\'s menus', async ({ page }) => {
  const roadmap = await startRoadmapServer();
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    await openBoard(page, { base: roadmap.base });
    await expect(page.locator('body > .vb-board > header.vb-toolbar')).toBeVisible();
    await expect(page.locator(`body > .vb-board > main${bid('stage')}`)).toBeVisible();
    await expect(page.locator('body > aside#chat')).toBeAttached();
    await expect(page.locator('body > .vb-board #chat-toggle')).toBeVisible();
    await page.locator('#chat-toggle').click();
    await expect(page.locator('#chat')).toBeVisible();
    // The chat starts level with the stage, and the stage ends where it begins.
    const [chat, stage] = await Promise.all([page.locator('#chat').boundingBox(), page.locator(bid('stage')).boundingBox()]);
    expect(chat!.y).toBe(stage!.y);
    expect(stage!.x + stage!.width).toBe(chat!.x);
    // "⋯" hangs over the chat, and is on top of it.
    await page.locator(bid('toolbar-menu')).click();
    const hide = page.locator(bid('hide'));
    await expect(hide).toBeVisible();
    const row = (await hide.boundingBox())!;
    expect(row.x + row.width).toBeGreaterThan(chat!.x);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('button')?.id, [row.x + row.width - 4, row.y + row.height / 2])).toBe(bid('hide').slice(1));
  } finally {
    await roadmap.close();
  }
});
