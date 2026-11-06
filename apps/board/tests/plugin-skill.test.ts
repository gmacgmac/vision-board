// What the plugin tells a bot (BUILD_01; plugin/skill.ts, words/skill-edits.ts, server/words/plugin-tools.ts): a bot
// that a host names has no `join`, no `list_apps`, no `read_attachment` and no secret to send, so neither its skill nor
// its tool descriptions may tell it to use one. Prompts are code: this holds them, and holds that the standalone
// bot reads its skill and its tool descriptions as it always did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_LIMITS, OPERATIONS } from '#format';
import { TOOLS } from '#mcp';
import { makeTempDir } from '#format/testing';
import { createEngine } from '../server/engine/index.ts';
import { toolRows } from '../server/format-files.ts';
import { skillFor } from '../plugin/skill.ts';
import { skillEdits } from '../plugin/words/skill-edits.ts';
import { descriptionEdits } from '../server/words/plugin-tools.ts';

const SKILL_FILE = path.resolve(import.meta.dirname, '../../../skills/vision-board/SKILL.md');
const source = fs.readFileSync(SKILL_FILE, 'utf8');
const plugin = skillFor(source);
const dir = makeTempDir('vb-plugin-skill-');
const listed = createEngine({ dir }).tools.list();
const given = new Set(listed.map((t) => t.name));
/** Every word that names a tool: the table's names, whether or not a plugin bot has it. */
const TOOL_NAMES = [...TOOLS.keys()];
const GONE = ['join', 'list_apps', 'read_attachment'];

test('the plugin skill names no tool the plugin bot does not have, and no secret, join, app, attachment or panel', () => {
  assert.deepEqual(GONE.filter((g) => !given.has(g)), GONE, 'the three are the standalone host\'s');
  const named = [...plugin.matchAll(/`([a-z]+(?:_[a-z]+)*)`/g)].map((m) => m[1]!).filter((w) => TOOL_NAMES.includes(w));
  assert.deepEqual([...new Set(named)].filter((n) => !given.has(n)), [], 'only tools the engine gives');
  for (const word of ['join', 'secret', 'list_apps', 'read_attachment', 'visionboard', 'chat panel', 'Board: <id>', 'attached', 'app card']) {
    assert.ok(!plugin.toLowerCase().includes(word.toLowerCase()), `the plugin skill says "${word}"`);
  }
  assert.match(plugin, /^## Where you are running$/m);
  assert.ok(!/^## Apps on the board$/m.test(plugin));
});

test('the plugin skill has an Images section: the board folder\'s images/, the engine\'s formats and limits, how a card names a picture, and no host', () => {
  const section = plugin.match(/^### Images in cards\n([\s\S]*?)^## /m)?.[1] ?? '';
  assert.ok(section, 'the section is there');
  for (const want of ['`images/` folder of the board folder your host names', 'png, jpeg, webp or gif, at most 8 MB', 'svg, at most\n  1 MB', '`![What it shows](ui/settings.png)`', 'Alt text is required', 'Image not shown']) {
    assert.ok(section.includes(want), want);
  }
  assert.deepEqual([IMAGE_LIMITS.maxBytes, IMAGE_LIMITS.svgMaxBytes, IMAGE_LIMITS.depth, Object.keys(IMAGE_LIMITS.types)], [8 * 1024 * 1024, 1024 * 1024, 8, ['png', 'jpeg', 'webp', 'gif', 'svg']], 'the numbers the section names are the engine\'s');
  assert.ok(!/nclite|\.visionboard|\bapp\b|upload|put_image/i.test(section), 'it names no host, no standalone path, no app, no upload tool');
  assert.ok(!/^### Images in cards$/m.test(source.replace(/^### Images in cards$/m, '')) , 'the standalone skill has its own, once');
  assert.ok(source.includes('Keep it in the open ledger\'s `images/`: `.visionboard/<ledger>/images/`'), 'the standalone words are untouched');
  assert.ok(plugin.includes('It also shows pictures inside a card.') && !plugin.includes('small apps you build'));
});

test('every tool a plugin bot has is in the skill, and its sentences about the person\'s answers are the standalone skill\'s own', () => {
  for (const name of given) assert.ok(plugin.includes(`\`${name}\``), `${name} is in the plugin skill`);
  for (const kept of ['"Waiting for your reply" is yours.', "**Don't fetch it again**", 'Never hold your turn open: no `check_responses` with `wait`.']) {
    assert.ok(source.includes(kept) && plugin.includes(kept), kept);
  }
});

test('ledgers and read-only (D-084, D-085): standalone reads another ledger and switches to Editing; a host\'s bot is offered neither', () => {
  assert.match(source, /^## Another ledger$/m);
  assert.ok(source.includes('take `ledger: "<name>"`') && source.includes('they can\n  switch it to Editing'), 'true with the toggle (Read-only / Editing) and the menu (Edit)');
  assert.ok(!/press Edit/.test(source.split('\n---\n')[1]!), 'no "press Edit" past the history: the toggle shows Read-only / Editing (FE_02-R2)');
  assert.ok(!/^## Another ledger$/m.test(plugin) && !plugin.includes('ledger: "'), 'no other ledger under a host: its `ledger` input is not offered');
  assert.ok(!/\bEdit(ing)?\b/.test(plugin) && plugin.includes('read-only until they make it editable'), 'a host may draw no Edit');
});

test('v3.30 (insert-markdown-signals BOT_01): both skills point to list_open, draw before naming, insert, and the Markdown; standalone saves its secret', () => {
  for (const kept of [
    'never read every card with `get_board` to find what you owe.\n  Answer on the board, and the chat is still "Done."', 'its `n` comes in the answer to the call\n  that draws it, so a reply that names it',
    '`insert: { after, before }` beside `node`', '`#` and `##` headings (large, medium), a table of 4 columns at most', '**A summary card** reads at a glance',
  ]) assert.ok(source.includes(kept) && plugin.includes(kept), kept);
  assert.ok(source.includes('in the session\'s scratchpad or notes file') && !plugin.includes('scratchpad'), 'the secret is the standalone bot\'s');
});

test('each skill edit finds its place exactly once, and a change under one stops the build', () => {
  assert.ok(skillEdits.length > 0);
  for (const e of skillEdits) assert.ok(source.split(e.from).length === 2, `${JSON.stringify(e.from.slice(0, 50))} must occur once in SKILL.md`);
  assert.throws(() => skillFor(source.replace('## Apps on the board', '## Other apps')), /exactly once/);
  assert.throws(() => skillFor(`${source}\n${skillEdits[0]!.from}`), /exactly once/);
});

test('the standalone skill and the standalone bot\'s tool words are untouched: it still joins, holds a secret and has the app host', () => {
  assert.ok(source.includes('Call `join` once') && source.includes('`list_apps`') && source.includes('## Apps on the board'));
  assert.match(TOOLS.get('list_open')!.description, /With your secret, only the containers you hold/);
  assert.match(TOOLS.get('check_responses')!.description, /With your secret, only the containers you hold\./);
  assert.match(TOOLS.get('write_board')!.description, /from `list_apps`/);
  assert.ok(TOOLS.has('join') && TOOLS.has('list_apps') && TOOLS.has('read_attachment'));
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
  assert.ok(Object.keys(OPERATIONS).length > listed.length);
});

test('v3.31 (host-styling FE_03): both skills say a container with no `mode` is a `row`, used unless the bot has a reason for another', () => {
  const kept = 'unless you have a reason for another layout: leave `mode` out and a new container is a `row`';
  assert.ok(source.includes(kept) && plugin.includes(kept), kept);
  assert.ok(!source.includes('`column`s side by side') && !plugin.includes('`column`s side by side'), 'a column is no default for a few cards');
});
