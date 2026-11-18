// What the bots are told (BUILD_01, node-overhaul T_05; skills/vision-board/source/, server/words/plugin-tools.ts): both
// skills are built from one source, a core and references (build.mjs), and differ only where differences.md says. A
// bot that a host names has no `join`, no `list_apps`, no `read_attachment`, no icon tools and no secret to send, so
// nothing of its build (skill.md and the references it ships) nor its tool descriptions may tell it to use one. Prompts
// are code: this holds them, and holds that the standalone bot reads what it needs as it did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ICON_NAMES, IMAGE_LIMITS, OPERATIONS } from '#format';
import { TOOLS } from '#mcp';
import { makeTempDir } from '#format/testing';
import { createEngine } from '../server/engine/index.ts';
import { toolRows } from '../server/format-files.ts';
import { SKILL_BYTES } from '../../../tests/plugin/contract/nclite/shared/plugin-host.ts';
import { SOURCE, buildSkill } from '../../../skills/vision-board/source/build.mjs';
import { descriptionEdits, singleAgentEdits } from '../server/words/plugin-tools.ts';

const SKILL_FILE = path.resolve(import.meta.dirname, '../../../skills/vision-board/SKILL.md');
const built = { standalone: buildSkill('standalone'), plugin: buildSkill('plugin') };
/** The standalone skill as its client loads it, and the plugin's skill.md. */
const source = fs.readFileSync(SKILL_FILE, 'utf8');
const plugin = built.plugin['skill.md']!;
/** Each build whole: its skill and every reference it ships. */
const all = { standalone: Object.values(built.standalone).join('\n'), plugin: Object.values(built.plugin).join('\n') };
/** Text read with its line breaks as spaces, so a phrase holds however the Markdown wraps. */
const flat = (t: string) => t.replace(/\s+/g, ' ');
const says = (t: string, phrase: string) => flat(t).includes(flat(phrase));
const dir = makeTempDir('vb-plugin-skill-');
const listed = createEngine({ dir }).tools.list();
const given = new Set(listed.map((t) => t.name));
/** Every word that names a tool: the table's names, whether or not a plugin bot has it. */
const TOOL_NAMES = [...TOOLS.keys()];
const GONE = ['join', 'list_apps', 'read_attachment', 'list_icons', 'add_icon'];
const hostInstructions = createEngine({ dir, flags: { singleAgent: true } }).tools.instructions ?? '';

test('the standalone skill on disk is its build, and the plugin build is the same core with its own differences', () => {
  assert.equal(source, built.standalone['SKILL.md'], 'npm run build:skill');
  const core = fs.readFileSync(path.join(SOURCE, 'core.md'), 'utf8');
  const shared = core.split('\n').filter((l) => l.trim() && !l.includes('{{'));
  for (const line of shared) assert.ok(source.includes(line) && plugin.includes(line), `a core line in both builds: ${line}`);
  for (const ref of Object.keys(built.plugin).filter((f) => f.startsWith('references/'))) {
    assert.equal(built.plugin[ref], built.standalone[ref], `${ref} is the same file in both builds`);
  }
});

test('the plugin build names no tool the plugin bot does not have, and no secret, join, app, attachment or panel', () => {
  assert.deepEqual(GONE.filter((g) => !given.has(g)), GONE, 'the five are the standalone host\'s');
  const named = [...all.plugin.matchAll(/`([a-z]+(?:_[a-z]+)*)`/g)].map((m) => m[1]!).filter((w) => TOOL_NAMES.includes(w));
  assert.deepEqual([...new Set(named)].filter((n) => !given.has(n)), [], 'only tools the engine gives');
  assert.doesNotMatch(all.plugin, /\bjoin\b/i, 'the plugin build says "join" ("rejoins", a branch, is fine)');
  for (const word of ['secret', 'list_apps', 'read_attachment', 'list_icons', 'add_icon', 'visionboard', 'chat panel', 'Board: <id>', 'attached', 'app card']) {
    assert.ok(!all.plugin.toLowerCase().includes(word.toLowerCase()), `the plugin build says "${word}"`);
  }
  assert.match(plugin, /^## A message with their answers$/m);
  assert.ok(!/^## Where you are running$/m.test(plugin) && !/^#+ Apps on the board$/m.test(all.plugin));
});

test('the plugin skill has an Images section: the board folder\'s images/, the engine\'s formats and limits, how a card names a picture, and no host', () => {
  const section = plugin.match(/^### Images in cards\n([\s\S]*?)^## /m)?.[1] ?? '';
  assert.ok(section, 'the section is there');
  for (const want of ['`images/` folder of the board folder your host names', 'png, jpeg, webp or gif, at most 8 MB', 'svg, at most 1 MB', '`![What it shows](ui/settings.png)`', 'Alt text is required']) {
    assert.ok(says(section, want), want);
  }
  assert.deepEqual([IMAGE_LIMITS.maxBytes, IMAGE_LIMITS.svgMaxBytes, IMAGE_LIMITS.depth, Object.keys(IMAGE_LIMITS.types)], [8 * 1024 * 1024, 1024 * 1024, 8, ['png', 'jpeg', 'webp', 'gif', 'svg']], 'the numbers the section names are the engine\'s');
  assert.ok(!/nclite|\.visionboard|\bapp\b|upload|put_image/i.test(section), 'it names no host, no standalone path, no app, no upload tool');
  assert.equal(source.match(/^### Images in cards$/gm)?.length, 1, 'the standalone skill has its own, once');
  assert.ok(source.includes('Keep it in the open ledger\'s `images/`: `.visionboard/<ledger>/images/`'), 'the standalone words');
  assert.ok(plugin.includes('or a picture should show in a card.') && !plugin.includes('app you build'), 'the description keeps pictures, not apps');
});

test('every tool a plugin bot has (but request_grant) is in its build, and its sentences about the person\'s message are the standalone\'s own', () => {
  // `request_grant` is left to its description and the instructions: under `singleAgent` (a host's) it answers `held`.
  for (const name of given) assert.equal(all.plugin.includes(`\`${name}\``), name !== 'request_grant', `${name}: in the plugin build unless it is request_grant`);
  for (const kept of ['"Waiting for your reply" is yours.', "**Don't fetch it again**"]) assert.ok(source.includes(kept) && plugin.includes(kept), kept);
  assert.ok(says(source, 'never hold your turn open: no `check_responses` with `wait`.'), 'the panel\'s rule, standalone');
  assert.match(hostInstructions, /never hold your turn/, 'a host\'s bot reads it in its instructions');
});

test('ledgers and read-only (D-084, D-085): standalone reads another ledger and switches to Editing; a host\'s bot is offered neither', () => {
  assert.match(source, /^## Another ledger$/m);
  assert.ok(source.includes('take `ledger: "<name>"`') && says(source, 'they can switch it to Editing'), 'true with the toggle (Read-only / Editing) and the menu (Edit)');
  assert.ok(!/press Edit/.test(source.split('\n---\n')[1]!), 'no "press Edit" past the front matter: the toggle shows Read-only / Editing (FE_02-R2)');
  assert.ok(!/^## Another ledger$/m.test(all.plugin) && !all.plugin.includes('ledger: "'), 'no other ledger under a host: its `ledger` input is not offered');
  assert.ok(!/\bEdit(ing)?\b/.test(all.plugin), 'a host may draw no Edit');
  assert.match(hostInstructions, /until the person makes it editable/, 'read-only and locked are in a host\'s instructions, not its skill');
});

test('v3.30 (insert-markdown-signals BOT_01): both builds point to list_open, draw before naming, insert, and the Markdown; standalone saves its secret', () => {
  for (const kept of [
    'never read every card with `get_board` to find what you owe.', 'its `n` comes in the answer to the call that draws it, so a reply that names it',
    '`insert: { after, before }` beside `node`', '`#` and `##` headings (large, medium), a table of 4 columns at most', '**A summary card** reads at a glance',
  ]) assert.ok(says(all.standalone, kept) && says(all.plugin, kept), kept);
  assert.ok(source.includes('in the session\'s scratchpad or notes file') && !all.plugin.includes('scratchpad'), 'the secret is the standalone bot\'s');
});

test('the standalone build and the standalone bot\'s tool words: it still joins, holds a secret and has the app host', () => {
  assert.ok(source.includes('Call `join` once') && all.standalone.includes('`list_apps`') && /^# Apps on the board$/m.test(built.standalone['references/apps.md']!));
  assert.match(TOOLS.get('list_open')!.description, /With your secret, only the containers you hold/);
  assert.match(TOOLS.get('check_responses')!.description, /With your secret, only the containers you hold\./);
  assert.match(TOOLS.get('write_board')!.description, /from `list_apps`/);
  assert.ok(TOOLS.has('join') && TOOLS.has('list_apps') && TOOLS.has('read_attachment'));
});


test('singleAgent (T_02-R4): nothing a host\'s one bot reads tells it to join, keep a secret or ask for a grant; request_grant, still listed, says it is not needed; off, as before', () => {
  const GRANTS = /\bjoin|secret|grant|another agent|did not create|creator|containers you hold/i;
  for (const flags of [{ singleAgent: true }, { singleAgent: true, botToolRules: false }]) {
    const tools = createEngine({ dir, flags }).tools;
    const said = tools.list();
    assert.deepEqual(said.map((t) => t.name), listed.map((t) => t.name), 'the same tools as the manifest\'s (built with no flags)');
    for (const t of said.filter((x) => x.name !== 'request_grant')) {
      assert.doesNotMatch(t.description, GRANTS, `${t.name}'s words`);
      assert.doesNotMatch(JSON.stringify(t.inputSchema), GRANTS, `${t.name}'s input`);
    }
    const grant = said.find((t) => t.name === 'request_grant')!.description;
    assert.ok(grant.includes('Not needed here') && grant.includes('never call it') && !/needs-grant|reason/.test(grant), grant);
    for (const e of singleAgentEdits) {
      const off = listed.find((t) => t.name === e.tool)!.description;
      assert.ok(off.includes(e.from) && !said.find((t) => t.name === e.tool)!.description.includes(e.from), `${e.tool}: ${e.from}`);
    }
    if (flags.botToolRules === false) assert.equal(tools.instructions, undefined, 'rules off: no instructions of its own, as before');
    else assert.doesNotMatch(tools.instructions!, /\bjoin|secret|grant|held/i, 'the instructions');
  }
  const off = createEngine({ dir, flags: { singleAgent: false } }).tools;
  assert.deepEqual(off.list(), listed, 'off: every word as before');
  assert.equal(off.instructions, createEngine({ dir }).tools.instructions);
  assert.match(off.instructions!, /call `request_grant`.*`needs-grant`/s, 'off: the grant steps stay');
});

test('the plugin bot\'s tool descriptions are the tool table\'s (the MCP server adds its secret words) less what is not true for it, and say none of that', () => {
  assert.deepEqual(descriptionEdits.map((e) => e.tool).filter((n) => !given.has(n)), [], 'an edit names a tool the plugin bot does not have');
  for (const t of listed) {
    const original = (toolRows() as { name: string; description: string }[]).find((r) => r.name === t.name)!.description;
    assert.equal(t.description === original, !descriptionEdits.some((e) => e.tool === t.name), `${t.name}: edited exactly where an edit says`);
    for (const { from } of descriptionEdits.filter((e) => e.tool === t.name)) assert.ok(original.includes(from) && !t.description.includes(from), `${t.name}: ${from}`);
    assert.doesNotMatch(t.description, /your secret|\bjoin\b|list_apps|read_attachment|Authorization/i, `${t.name}'s words`);
    assert.doesNotMatch(JSON.stringify(t.inputSchema), /your secret|list_apps|read_attachment/i, `${t.name}'s input`);
  }
  // No word it reads names a tool it lacks (FIX_01, VERIFY_01 finding 13: `node.icon` named list_icons and add_icon).
  const lacks = (toolRows() as { name: string }[]).map((r) => r.name).filter((n) => !given.has(n));
  assert.ok(lacks.includes('list_icons') && lacks.includes('add_icon'));
  for (const t of listed) for (const name of lacks) {
    const says = new RegExp(`\\b${name}\\b`);
    assert.doesNotMatch(JSON.stringify(t.inputSchema), says, `${t.name}'s input names ${name}`);
    if (name !== 'join') assert.doesNotMatch(t.description, says, `${t.name}'s words name ${name}`);
  }
  assert.ok(Object.keys(OPERATIONS).length > listed.length);
});

test('v3.31 (host-styling FE_03): both skills say a container with no `mode` is a `row`, used unless the bot has a reason for another', () => {
  const kept = 'unless you have a reason for another layout: leave `mode` out and a new container is a `row`';
  assert.ok(says(source, kept) && says(plugin, kept), kept);
  assert.ok(!all.standalone.includes('`column`s side by side') && !all.plugin.includes('`column`s side by side'), 'a column is no default for a few cards');
});

// A host lists a plugin's skill by its front matter and opens the rest when the bot needs it (nclite, 2026-11-09): `name`
// the plugin's id, `label` the few plain words its Skills page names it by, `description` one line saying when to read it.
// Simple `key: value` lines, as nclite reads them, and no standalone history (`status`).
test('the plugin skill opens with front matter naming the plugin, labelling it, and saying when to read it', () => {
  const m = /^---\nname: (.+)\nlabel: (.+)\ndescription: (.+)\n---\n\n# /.exec(plugin);
  assert.ok(m, 'front matter with name, label and description, then the title');
  assert.equal(m[1], 'vision-board');
  assert.ok(m[2]!.split(' ').length <= 5, `a few words: ${m[2]}`);
  assert.ok(m[3]!.length <= 1000, `${m[3]!.length} characters`);
  assert.match(m[3]!, /^The Vision Board.*Read this before/);
  assert.match(source, /^---\nname: vision-board\nlabel: (.+)\ndescription: .*Read this before.*\nstatus: /, 'the standalone skill has the same, and its history');
});

test('the plugin skill fits the host\'s budget: at most SKILL_BYTES (the contract\'s), so a host needs no extra allowance', () => {
  const bytes = Buffer.byteLength(plugin, 'utf8');
  assert.ok(bytes <= SKILL_BYTES, `skill.md is ${bytes} bytes, over the host's ${SKILL_BYTES}: cut skills/vision-board/source/core.md or the plugin's blocks in differences.md`);
});

test('v3.34 (node-overhaul T_03): the standalone build teaches one flow per container, icons by list_icons then add_icon, tone, skin and direction; a host\'s bot reads no icon tool', () => {
  for (const kept of [
    '**A flow lives in one container**', 'link between containers rarely, one tidy link card to card',
    '**Call `list_icons` first**, before you name any icon, and reuse one that fits', 'Never write a file into `.visionboard/icons/`',
    '`x-`, a singular noun, a qualifier after it if needed (`x-encoder`, `x-encoder-audio`)',
    'leave it off when the kind says it', 'never one tone on every card', 'Neither replaces the kind', '`command-lens` for an operational board',
    'set it on a `flow` (`across` or `down`) only when the person asks for one', 'An asked note is about its card only',
  ]) assert.ok(says(all.standalone, kept), kept);
  assert.ok(!/\bflag\b/i.test(all.standalone.split('\n---\n').slice(1).join('\n')), 'the private mark is a bookmark everywhere past the front matter');
  // `key` (an item's key) and `alert` (an app panel's) are words of their own that an icon happens to share.
  const copied = ICON_NAMES.filter((n) => !['key', 'alert'].includes(n) && (all.standalone.includes(`\`${n}\``) || all.plugin.includes(`\`${n}\``)));
  assert.deepEqual(copied, [], 'the built-in names are list_icons\' and the schema\'s, never copied into the skill');
  assert.ok(!all.plugin.includes('list_icons') && !all.plugin.includes('add_icon'), 'standalone tools (x-hosts): the plugin build names neither');
});

test('v3.35 (node-overhaul T_05): each reference is named where it is needed (run 2), with when to read it; the icon library, colour, the two skins, Ask now and the layout headlines are in both cores', () => {
  // Where to read each one, at the point of use (run 1, live: Haiku read handover and apps, which the core leaves to
  // them, but not layouts or architecture from an index alone).
  const reads = (t: string) => [...t.matchAll(/read `references\/([a-z-]+)\.md`|`references\/([a-z-]+)\.md` first/g)].map((m) => m[1] ?? m[2]);
  assert.deepEqual(reads(source), ['layouts', 'architecture', 'apps', 'handover']);
  assert.deepEqual(reads(plugin), ['layouts', 'architecture', 'handover'], 'apps are the standalone host\'s');
  assert.ok(says(source, 'read one where this page says, before you write; never just in case'));
  for (const both of [
    '**Before you write linked cards** (a process: `flow`; work between owners: `lanes`; a card put between two linked cards) **or a `radial`, read `references/layouts.md`**',
    'for a system\'s architecture, `references/architecture.md` first', '**Leave `direction` out** unless the person asks',
    '**A flow lives in one container**', 'Both offer the same actions', '**Ask now** sends one card\'s note at once', 'A `tone` sets apart a flow\'s parts',
    '**Icons** mark a card that stands for a component', 'read `references/handover.md` before you write it',
  ]) assert.ok(says(source, both) && says(plugin, both), both);
  assert.ok(says(source, 'read `references/apps.md` before you build or fix one') && says(source, 'reading them needs no Allow'));
  assert.ok(says(source, 'the project\'s icon library, which every board shares') && says(plugin, '(`icon` says which names)'), 'the library for standalone; the field\'s names under a host');
  assert.ok(Buffer.byteLength(source) < 20_000, `the standalone core stays small: ${Buffer.byteLength(source)} bytes (v3.34 was 44,614)`);
  for (const [ref, says_] of [['layouts', '## Branches'], ['architecture', '## The skin'], ['handover', '**Handover** section']] as const) {
    assert.ok(built.plugin[`references/${ref}.md`]!.includes(says_), `${ref}: ${says_}`);
  }
});
