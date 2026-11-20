// `npm run build:plugin [-- --watch] [-- --out <folder>]`: the board as one plugin folder, `dist/plugin/vision-board/` (D-074;
// docs/specification/plugin.md): manifest.json, view/board.js, view/board.css and its faces in view/fonts/, engine/engine.js, words.json,
// skill.md and its references/ (the skill's plugin build, skills/vision-board/source/build.mjs) and plugin.d.ts (the seam's
// types, with its version checked against them). A host links or copies the
// folder; nothing in it depends on how it was made. The same input gives the same bytes (a test builds twice and compares).
// With `--watch` the two bundles rebuild on a change, so a host linked to the folder picks it up; the manifest, the
// words, the skill, the types and the faces are written once, at the start.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { build } from 'vite';
import { CHIP_PLUGIN } from '#actions';
import { createEngine } from '../server/engine/index.ts';
import { openapiDoc, toolRows } from '../server/format-files.ts';
import { type Face, engineBuild, viewBuild } from '../vite.plugin.config.ts';
import { PARTS, manifestOf } from '../plugin/manifest.ts';
import { TYPES_FILE } from '../plugin/seam.ts';
import { buildSkill } from '../../../skills/vision-board/source/build.mjs';
import { pluginTypes, seamProblem } from './plugin-types.ts';
import { wordsFile } from './plugin-words.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
export const DEFAULT_OUT = path.join(ROOT, 'dist/plugin', CHIP_PLUGIN);

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** The board's faces as packages/tokens/src/fonts.css declares them, each with its file and its licence in
 *  packages/tokens/fonts/ (D-102); the folder carries both in `view/fonts/` (D-116). */
const FONTS = path.join(ROOT, 'packages/tokens/fonts');
export const FACES: readonly (Face & { licence: string })[] = [...fs.readFileSync(path.join(ROOT, 'packages/tokens/src/fonts.css'), 'utf8')
  .matchAll(/font-family: '(vb-([a-z0-9-]+))';\s*src: url\('\.\.\/fonts\/([a-z0-9-]+\.woff2)'\)/g)]
  .map(([, family, name, file]) => ({ family: family!, file: file!, licence: `${name}-OFL.txt` }));

/** The manifest, words, skill (with its references) and types as text, by the file's path in the folder. The manifest is checked against its schema. */
export async function textFiles(): Promise<Record<string, string>> {
  // The engine only lists its tools here: it opens nothing in a folder that has no data.
  const tools = createEngine({ dir: path.join(os.tmpdir(), 'vb-plugin-build-has-no-data') }).tools.list();
  const writes = new Set((toolRows() as { name: string; writes: boolean }[]).filter((r) => r.writes).map((r) => r.name));
  const manifest = manifestOf(openapiDoc().info.version, tools, writes, FACES.map((f) => `${PARTS.fonts}/${f.file}`));
  const check = new Ajv2020({ strict: true, allErrors: true });
  const schema = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../plugin/manifest.schema.json'), 'utf8'));
  if (!check.validate(schema, manifest)) throw new Error(`manifest.json does not fit its schema: ${check.errorsText(check.errors)}`);
  const skill = buildSkill('plugin');
  if (!(PARTS.skill in skill)) throw new Error(`the skill's plugin build has no ${PARTS.skill}`);
  const types = pluginTypes();
  const moved = seamProblem(types);
  if (moved) throw new Error(moved);
  return { 'manifest.json': json(manifest), [PARTS.words]: json(await wordsFile(tools)), ...skill, [TYPES_FILE]: types };
}

/** Write the folder `out` anew. */
export async function buildPlugin({ out = DEFAULT_OUT, watch = false } = {}): Promise<string> {
  fs.rmSync(out, { recursive: true, force: true });
  await build(engineBuild(out, watch));
  await build(viewBuild(out, FACES, watch));
  for (const [name, text] of Object.entries(await textFiles())) {
    fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
    fs.writeFileSync(path.join(out, name), text);
  }
  fs.mkdirSync(path.join(out, PARTS.fonts), { recursive: true });
  for (const f of FACES.flatMap((face) => [face.file, face.licence])) fs.copyFileSync(path.join(FONTS, f), path.join(out, PARTS.fonts, f));
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--out');
  const out = await buildPlugin({ out: at >= 0 ? path.resolve(args[at + 1]!) : DEFAULT_OUT, watch: args.includes('--watch') });
  console.log(`plugin folder: ${path.relative(process.cwd(), out) || '.'}`);
}
