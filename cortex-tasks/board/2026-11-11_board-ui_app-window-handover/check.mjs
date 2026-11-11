// Spike check: the stage, the note out, the reply in, the disclosure. Run: node temp/stage-check/check.mjs
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const out = 'temp/stage-check';
const browser = await chromium.launch();
const log = (...a) => console.log(...a);
for (const scheme of ['dark', 'light']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  page.on('pageerror', (e) => log('pageerror', e.message));
  await page.goto('http://localhost:4520/?board=stage-demo');
  const frame = page.frameLocator('vb-app-frame iframe');
  await frame.locator('.feed').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/card-${scheme}.png` });
  // Disclosure
  const sum = page.locator('summary.vb-md-summary').nth(1);
  await sum.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/detail-${scheme}.png` });
  log(scheme, 'details open:', await page.locator('details.vb-md-details[open]').count());
  await sum.click();
  // Stage
  await page.locator('button[data-app-act="stage"]').click();
  await page.waitForTimeout(800);
  log(scheme, 'staged:', await page.locator('vb-app-frame[data-stage]').count(), 'wide:', await frame.locator('body.wide').count());
  if (scheme === 'dark') {
    await frame.locator('.feed').nth(2).click();
    await frame.locator('#raise').click();
    await page.waitForTimeout(1200);
    log('said:', await frame.locator('#said').textContent());
  }
  await page.screenshot({ path: `${out}/stage-${scheme}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  log(scheme, 'staged after Esc:', await page.locator('vb-app-frame[data-stage]').count(), 'feeds still there:', await frame.locator('.feed').count());
  await page.screenshot({ path: `${out}/back-${scheme}.png` });
  await page.close();
}
await browser.close();
