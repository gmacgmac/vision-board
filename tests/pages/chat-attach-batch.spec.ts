// Attaching, the fixes from VERIFY_01: a file deleted before Send marks its own chip refused with why, so the
// person knows which to remove (F4); a thousand files picked is ten chips, one more for the rest, and one
// short status line (F9). The server is chat-server.ts with the agent package's fake `claude`, never the real one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, test } from './helpers.ts';
import { card, side, text, toggle } from './chat-page.ts';
import { projectFiles } from '#format';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
test.beforeAll(async () => {
  srv = await startChatServer();
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'),
  ]);
});
test.afterAll(async () => { await srv.close(); });

const composer = (page: Page) => side(page).locator('chat-composer');
const chip = (page: Page, name: string) => composer(page).locator('.chat-chip[data-kind="file"]').filter({ hasText: name });
const status = (page: Page) => composer(page).getByRole('status');
const upload = (name: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from('hello') });

async function open(page: Page) {
  await page.goto(`${srv.base}/#scratch`);
  if (!(await side(page).isVisible())) await toggle(page).click();
  await expect(text(page)).toBeVisible();
}

async function pick(page: Page, files: ReturnType<typeof upload>[]) {
  const chooser = page.waitForEvent('filechooser');
  await side(page).getByRole('button', { name: 'Attach files' }).click();
  await (await chooser).setFiles(files);
}

/** The newest file saved of that name, on disk, in the folder the board says it has open. */
async function savedFile(name: string): Promise<string> {
  const { project } = await (await fetch(`${srv.base}/api/boards`)).json() as { project: string };
  const root = projectFiles(project.replace(/^~/, os.homedir())).attachments;
  for (const day of fs.readdirSync(root).sort().reverse()) {
    const found = fs.readdirSync(path.join(root, day)).find((f) => f.endsWith(`-${name}`));
    if (found) return path.join(root, day, found);
  }
  throw new Error(`no saved ${name}`);
}

test('F4: a file deleted before Send: its own chip says so and the words stay; removing it, the message goes', async ({ page, expected }) => {
  expected.problems.push(/response 422/, /status of 422/);
  await open(page);
  await pick(page, [upload('will-vanish.txt'), upload('stays.txt')]);
  await expect(chip(page, 'will-vanish.txt')).toHaveAttribute('data-state', 'ready');
  await expect(chip(page, 'stays.txt')).toHaveAttribute('data-state', 'ready');
  fs.rmSync(await savedFile('will-vanish.txt'));
  await text(page).fill('Compare these');
  await text(page).press('Enter');
  const gone = chip(page, 'will-vanish.txt');
  await expect(gone).toHaveAttribute('data-state', 'refused');
  await expect(gone).toContainText('it has since been deleted');
  await expect(chip(page, 'stays.txt')).toHaveAttribute('data-state', 'ready');
  await expect(text(page)).toHaveValue('Compare these');
  await expect(status(page)).toContainText('will-vanish.txt: Not attached');
  await expectNoAxeViolations(page);
  await text(page).press('Enter');
  const given = await srv.fake.run(1);
  expect(given.prompt).toContain('-stays.txt');
  expect(given.prompt).not.toContain('will-vanish');
  await expect(composer(page).locator('.chat-chip[data-kind="file"]')).toHaveCount(0);
});

test('F9: a thousand files picked: ten go, one chip counts the rest, and the status is one short line', async ({ page }) => {
  await open(page);
  await pick(page, Array.from({ length: 1000 }, (_, i) => upload(`f${i}.txt`)));
  await expect(composer(page).locator('.chat-chip[data-state="ready"]')).toHaveCount(10);
  const files = composer(page).locator('.chat-chip[data-kind="file"]');
  await expect(files).toHaveCount(11);
  const rest = chip(page, '990 more files');
  await expect(rest).toHaveAttribute('data-state', 'refused');
  await expect(rest).toContainText('a message carries at most 10 files');
  await expect(status(page)).not.toBeEmpty();
  expect((await status(page).textContent())!.length).toBeLessThan(200);
  await expectNoAxeViolations(page);
  await rest.getByRole('button').click();
  await expect(files).toHaveCount(10);
});
