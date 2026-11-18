// The skill's one source, two builds (node-overhaul T_05, maintainer points 479-482). `core.md` is what every bot reads;
// `references/*.md` are read only when a request needs them; `differences.md` is the one place the builds differ: a
// block per `{{slot}}` for each build. The standalone build is `skills/vision-board/SKILL.md` and its `references/`
// (checked in, written by `npm run build:skill`, held current by build.test.mjs); the plugin build is the plugin folder's
// `skill.md` and `references/` (apps/board/bin/build-plugin.ts). A build ships exactly the references its text names.
// Plain Node, no imports but its own: a skill's client loads Markdown and cannot import, so the words stay in the .md files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE = path.dirname(fileURLToPath(import.meta.url));
export const BUILDS = ['standalone', 'plugin'];
/** The skill file's name in each build's folder. */
export const SKILL_FILE = { standalone: 'SKILL.md', plugin: 'skill.md' };
const BLOCK = /^<!-- slot ([a-z-]+): ([a-z]+) -->$/gm;
const SLOT = /\{\{([a-z-]+)\}\}/g;
const NAMED = /`references\/([a-z-]+)\.md`/g;

/** Every slot's text per build, from differences.md: `{ slot: { standalone, plugin } }`. */
export function differences(text) {
  const marks = [...text.matchAll(BLOCK)];
  const out = {};
  marks.forEach((m, i) => {
    const [, slot, build] = m;
    if (!BUILDS.includes(build)) throw new Error(`differences.md: ${slot} names an unknown build, ${build}`);
    const body = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length).replace(/^\n+|\s+$/g, '');
    out[slot] ??= {};
    if (build in out[slot]) throw new Error(`differences.md: ${slot} has two ${build} blocks`);
    out[slot][build] = body;
  });
  for (const [slot, by] of Object.entries(out)) for (const b of BUILDS) if (!(b in by)) throw new Error(`differences.md: ${slot} has no ${b} block`);
  return out;
}

/** `text` with each slot filled for `build`; a slot alone on its line that is empty there takes its line with it. */
export function fill(text, slots, build, file) {
  const seen = new Set();
  const filled = text.replace(/^\{\{([a-z-]+)\}\}\n/gm, (all, slot) => (slots[slot]?.[build] === '' ? (seen.add(slot), '') : all))
    .replace(SLOT, (_, slot) => {
      if (!slots[slot]) throw new Error(`${file}: {{${slot}}} has no blocks in differences.md`);
      seen.add(slot);
      return slots[slot][build];
    });
  return { text: `${filled.replace(/\n{3,}/g, '\n\n').trim()}\n`, seen };
}

/** One build: its files by path in the build's folder (the skill, then each reference its text names). */
export function buildSkill(build, source = SOURCE) {
  if (!BUILDS.includes(build)) throw new Error(`no build ${build}`);
  const read = (f) => fs.readFileSync(path.join(source, f), 'utf8');
  const slots = differences(read('differences.md'));
  const used = new Set();
  const make = (f) => { const { text, seen } = fill(read(f), slots, build, f); for (const s of seen) used.add(s); return text; };
  const files = { [SKILL_FILE[build]]: make('core.md') };
  const queue = [...files[SKILL_FILE[build]].matchAll(NAMED)].map((m) => m[1]);
  while (queue.length) {
    const name = queue.shift();
    const at = `references/${name}.md`;
    if (at in files) continue;
    files[at] = make(at);
    queue.push(...[...files[at].matchAll(NAMED)].map((m) => m[1]));
  }
  return files;
}

/** Every slot of differences.md is used by some file of some build, and every reference ships in some build. */
export function unused(source = SOURCE) {
  const slots = Object.keys(differences(fs.readFileSync(path.join(source, 'differences.md'), 'utf8')));
  const texts = ['core.md', ...fs.readdirSync(path.join(source, 'references')).map((f) => `references/${f}`)].map((f) => fs.readFileSync(path.join(source, f), 'utf8')).join('\n');
  const built = new Set(BUILDS.flatMap((b) => Object.keys(buildSkill(b, source))));
  return [
    ...slots.filter((s) => !texts.includes(`{{${s}}}`)).map((s) => `slot ${s}`),
    ...fs.readdirSync(path.join(source, 'references')).filter((f) => !built.has(`references/${f}`)).map((f) => `references/${f}`),
  ];
}

/** The standalone build's folder: the skill folder this source sits in. */
export const STANDALONE_DIR = path.dirname(SOURCE);

/** Files of the standalone build that differ from what is on disk (`--check`), or are on disk but no longer built. */
export function stale(dir = STANDALONE_DIR) {
  const files = buildSkill('standalone');
  const differ = Object.entries(files).filter(([f, text]) => !fs.existsSync(path.join(dir, f)) || fs.readFileSync(path.join(dir, f), 'utf8') !== text).map(([f]) => f);
  const refs = path.join(dir, 'references');
  const extra = fs.existsSync(refs) ? fs.readdirSync(refs).map((f) => `references/${f}`).filter((f) => !(f in files)) : [];
  return [...differ, ...extra];
}

/** Write the standalone build into its folder, removing references it no longer names. */
export function writeStandalone(dir = STANDALONE_DIR) {
  const files = buildSkill('standalone');
  const refs = path.join(dir, 'references');
  if (fs.existsSync(refs)) for (const f of fs.readdirSync(refs)) if (!(`references/${f}` in files)) fs.rmSync(path.join(refs, f));
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), text);
  }
  return Object.keys(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const out = stale();
    if (out.length) { console.error(`skill: out of date, run npm run build:skill: ${out.join(', ')}`); process.exit(1); }
    console.log('skill: current');
  } else console.log(`skill: wrote ${writeStandalone().join(', ')}`);
}
