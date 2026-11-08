// `words.json`: every fixed sentence the view shows, by its key (docs/specification/words.md § Keys,
// `vision-board.<area>.<name>`, the plugin's id first), and each tool's description as a bot reads it (`vision-board.tool.<name>`). A host merges
// it into its own words. Made from the words files of the parts the view is built of; a sentence with a
// value in it is a function there and has no fixed text, so it is not in the file.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHIP_PLUGIN } from '#actions';
import type { ListedTool } from '#mcp';
import { toolKey } from '../plugin/manifest.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
/** The words folders of the view's parts: the board, the patterns, and the plugin's own. */
export const VIEW_WORDS = ['apps/board/src/board/words', 'packages/ui/src/words', 'apps/board/plugin/words'] as const;
/** Words files that are not the view's text: the edits that make the bot's skill. */
const NOT_VIEW_TEXT = new Set(['skill-edits.ts']);

/** A file's fixed text: `<id>.<area>.<name>` for each string, an object's members dotted on. */
async function stringsOf(file: string): Promise<[string, string][]> {
  const area = path.basename(file, '.ts');
  const out: [string, string][] = [];
  const walk = (key: string, value: unknown) => {
    if (typeof value === 'string') out.push([key, value]);
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(`${key}.${k}`, v);
  };
  for (const [name, value] of Object.entries(await import(pathToFileURL(file).href))) walk(`${CHIP_PLUGIN}.${area}.${name}`, value);
  return out;
}

/** The file's text, keys in order. */
export async function wordsFile(tools: readonly ListedTool[]): Promise<Record<string, string>> {
  const words: Record<string, string> = {};
  const put = (key: string, text: string) => {
    if (key in words) throw new Error(`words.json: the key ${key} is used twice`);
    words[key] = text;
  };
  for (const dir of VIEW_WORDS) {
    for (const file of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.ts') && !NOT_VIEW_TEXT.has(f)).sort()) {
      for (const [key, text] of await stringsOf(path.join(ROOT, dir, file))) put(key, text);
    }
  }
  for (const t of tools) put(toolKey(t.name), t.description);
  return Object.fromEntries(Object.entries(words).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
