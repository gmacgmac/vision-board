// The page a fake host's specs run in: the fixture (board-host-fixture.ts) bundled in memory with Vite, in a blank
// page holding two empty roots, and the spec's way to drive it (`call`).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build } from 'vite';
import { FIXTURES_DIR } from '#format/files';

const ROOT = path.resolve(import.meta.dirname, '../..');
export const LINES = readFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as { seq: number; type: string });
let bundle: { js: string; css: string } | null = null;

/** The fixture as one script and one sheet. */
async function fixture(): Promise<{ js: string; css: string }> {
  if (bundle) return bundle;
  const out = await build({
    configFile: false, logLevel: 'silent', root: ROOT, plugins: [svelte()],
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
export async function open(page: Page): Promise<void> {
  const { js, css } = await fixture();
  await page.setContent('<!doctype html><html lang="en"><head><title>Host</title></head><body><main class="host"><div id="host-bar"></div><div id="a"></div><div id="b"></div></main></body></html>');
  await page.addStyleTag({ content: `${css}\n.host { display: flex; gap: 8px; } #a, #b { width: 620px; height: 560px; }` });
  await page.addScriptTag({ content: js, type: 'module' });
  await page.waitForFunction(() => 'vbHost' in window);
}

export type Host = {
  listeners(): number; mount(id: string, lines: object[], shown: number): void; idle(id: string): Promise<void>;
  send(id: string): Promise<string | null>; status(id: string): { selection: string; hide: boolean; boardId: string; zoom: number; chatWork: string; sendWaiting: boolean; chatAttached: boolean; go?: unknown };
  record(id: string): { chips: Record<string, { plugin: string; kind: string; ref: { board: string; cards: number[] }; label: string; preview?: string }>; attaches: { key: string; chip: { ref: { cards?: number[] } } | null }[]; sends: { kind: string }[][]; confirms: { heading: string; list?: unknown }[];
    notices: { text: string; tone?: string }[]; calls: string[]; subscribers: number };
  pageChip(id: string): { plugin: string; kind: string; ref: { board: string; head: number }; label: string; detail: string } | null;
  addHostControls(parentId: string): void; addClose(parentId: string, id: string): void; unsaved(id: string): boolean;
  reveal(id: string, ref: { board?: string; n?: number; seq?: number; cards?: number[] }): void; work(id: string, w: string): void;
  answer(id: string, ok: boolean): void; appendRest(id: string): void; unmount(id: string): void;
};
export const call = <T>(page: Page, fn: (h: Host, ...args: never[]) => T, ...args: unknown[]) =>
  page.evaluate(({ src, args }) => (new Function('h', 'args', `return (${src})(h, ...args)`) as (h: unknown, a: unknown[]) => T)((window as unknown as { vbHost: unknown }).vbHost, args), { src: fn.toString(), args });

