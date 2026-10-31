// `npm run build:plugin [-- --watch] [-- --out <folder>]`: the board as one plugin folder, `dist/plugin/board/` (D-074;
// docs/specification/plugin.md): manifest.json, view/board.js and view/board.css, engine/engine.js, words.json and
// skill.md. A host links or copies the folder; nothing in it depends on how it was made. The same input gives the
// same bytes (a test builds twice and compares). With `--watch` the two bundles rebuild on a change, so a host linked
// to the folder picks it up; the manifest, the words and the skill are written once, at the start.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { build } from 'vite';
import { createEngine } from '../server/engine/index.ts';
import { openapiDoc, toolRows } from '../server/format-files.ts';
import { engineBuild, viewBuild } from '../vite.plugin.config.ts';
import { PARTS, manifestOf } from '../plugin/manifest.ts';
import { skillFor } from '../plugin/skill.ts';
import { wordsFile } from './plugin-words.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
export const DEFAULT_OUT = path.join(ROOT, 'dist/plugin/board');

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** The manifest, words and skill as text, by the file's name in the folder. The manifest is checked against its schema. */
export async function textFiles(): Promise<Record<string, string>> {
  // The engine only lists its tools here: it opens nothing in a folder that has no data.
  const tools = createEngine({ dir: path.join(os.tmpdir(), 'vb-plugin-build-has-no-data') }).tools.list();
  const writes = new Set((toolRows() as { name: string; writes: boolean }[]).filter((r) => r.writes).map((r) => r.name));
  const manifest = manifestOf(openapiDoc().info.version, tools, writes);
  const check = new Ajv2020({ strict: true, allErrors: true });
  const schema = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../plugin/manifest.schema.json'), 'utf8'));
  if (!check.validate(schema, manifest)) throw new Error(`manifest.json does not fit its schema: ${check.errorsText(check.errors)}`);
  const skill = skillFor(fs.readFileSync(path.join(ROOT, 'skills/vision-board/SKILL.md'), 'utf8'));
  return { 'manifest.json': json(manifest), [PARTS.words]: json(await wordsFile(tools)), [PARTS.skill]: skill };
}

/** Write the folder `out` anew. */
export async function buildPlugin({ out = DEFAULT_OUT, watch = false } = {}): Promise<string> {
  fs.rmSync(out, { recursive: true, force: true });
  await build(engineBuild(out, watch));
  await build(viewBuild(out, watch));
  for (const [name, text] of Object.entries(await textFiles())) {
    fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
    fs.writeFileSync(path.join(out, name), text);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--out');
  const out = await buildPlugin({ out: at >= 0 ? path.resolve(args[at + 1]!) : DEFAULT_OUT, watch: args.includes('--watch') });
  console.log(`plugin folder: ${path.relative(process.cwd(), out) || '.'}`);
}
