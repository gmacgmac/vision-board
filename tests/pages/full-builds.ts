// The full desktop builds of Chromium on this machine, for the page suite's `full-*` projects. The suite's browser is the
// headless shell. A full build gives a sandboxed frame a process of its own, so timing that holds in the shell may not
// hold there (read-attachment VERIFY_01 F1). Nothing is installed here: a build
// that isn't on the machine is named as not run. `VB_FULL_CHROMIUM` names one more.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

export interface FullBuild { name: string; executable: string }

/** Playwright's own full build (Chrome for Testing), the newest in its folder: the one this version wants may not be the one there. */
function chromeForTesting(): string | undefined {
  const wanted = chromium.executablePath();
  const version = /[/\\](chromium-\d+)[/\\]/.exec(wanted)?.[1];
  if (!version) return undefined;
  const root = wanted.slice(0, wanted.indexOf(version));
  const number = (dir: string) => Number(dir.split('-')[1]);
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => number(b) - number(a)) : [];
  return dirs.map((d) => wanted.replace(version, d)).find((p) => fs.existsSync(p));
}

const CHROMIUM = ['/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

/** Each full build found, by a name for its project. */
export function fullBuilds(): FullBuild[] {
  const found = [
    { name: 'full-chrome-for-testing', executable: chromeForTesting() },
    { name: 'full-chromium', executable: CHROMIUM.find((p) => fs.existsSync(p)) },
    { name: 'full-named', executable: process.env.VB_FULL_CHROMIUM },
  ];
  return found.filter((b): b is FullBuild => b.executable !== undefined && fs.existsSync(b.executable));
}

/** What a run says about them, once: which ran, and plainly, which did not. */
export function fullBuildsSaid(builds: FullBuild[]): string {
  if (builds.length === 0) return 'Page suite: NO full Chromium build on this machine, so the frame\'s timing on one is NOT tested (the headless shell hides it). Run `npx playwright install chromium`, or set VB_FULL_CHROMIUM.';
  const said = builds.map((b) => `${b.name} (${path.basename(b.executable)})`).join(', ');
  const missing = builds.length < 2 ? ' Only one: `npx playwright install chromium`, or VB_FULL_CHROMIUM, adds another.' : '';
  return `Page suite: tests tagged @full-build also run on ${said}.${missing}`;
}
