// The Kiro agent file (N34 ruling 1): written under a home folder (a temp one here, never the real
// one) as `.kiro/agents/vision-board.json`, from the package's draft with the prompt as an absolute
// `file://` path; rewritten only when its content differs; nothing else in `.kiro` touched; a
// relative prompt path refused; a failure to write thrown for the host to report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { KIRO_AGENT, KIRO_AGENT_DRAFT, kiroAgentFile, writeKiroAgent } from '../src/index.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'agent-kiro-file-'));
const skill = path.join(dir, 'skills', 'vision-board', 'SKILL.md');
let homes = 0;
const home = () => {
  const h = path.join(dir, `home-${++homes}`);
  mkdirSync(h);
  return h;
};
/** Every file under `root`, relative, sorted. */
const tree = (root: string): string[] => readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => path.relative(root, path.join(e.parentPath, e.name))).sort();
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('the agent file is the draft with the prompt as an absolute file:// path, under .kiro/agents', () => {
  const h = home();
  const { file, written } = writeKiroAgent(h, skill);
  assert.equal(KIRO_AGENT, 'vision-board');
  assert.equal(file, path.join(h, '.kiro', 'agents', 'vision-board.json'));
  assert.equal(file, kiroAgentFile(h));
  assert.equal(written, true);
  const draft = JSON.parse(readFileSync(KIRO_AGENT_DRAFT, 'utf8'));
  const made = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(made.prompt, `file://${skill}`);
  assert.ok(path.isAbsolute(made.prompt.slice('file://'.length)));
  const { permissions, toolsSettings, ...rest } = made;
  const { permissions: draftPermissions, ...draftRest } = draft;
  assert.deepEqual({ ...rest, prompt: draft.prompt }, draftRest, 'the prompt and the access rules differ from the draft');
  assert.deepEqual(permissions.rules.slice(0, draftPermissions.rules.length), draftPermissions.rules, 'the draft\'s rules first');
  assert.ok(toolsSettings.read.deniedPaths.length > 0, 'the access rules are added (kiro-turn.test.ts holds them)');
  assert.equal(made.name, 'vision-board');
  assert.deepEqual(tree(h), [path.join('.kiro', 'agents', 'vision-board.json')], 'nothing else is written');
});

test('kept current: the same content is left alone; a change (a moved repo, an edit) is rewritten', () => {
  const h = home();
  const { file } = writeKiroAgent(h, skill);
  const old = new Date('2026-01-01T00:00:00Z');
  utimesSync(file, old, old);
  assert.equal(writeKiroAgent(h, skill).written, false);
  assert.equal(statSync(file).mtime.getTime(), old.getTime(), 'not touched');
  const moved = path.join(dir, 'moved', 'skills', 'vision-board', 'SKILL.md');
  assert.equal(writeKiroAgent(h, moved).written, true);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).prompt, `file://${moved}`);
  writeFileSync(file, '{"name":"vision-board"}\n');
  assert.equal(writeKiroAgent(h, moved).written, true);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).prompt, `file://${moved}`);
});

test('other agents in .kiro/agents are left as they are', () => {
  const h = home();
  mkdirSync(path.join(h, '.kiro', 'agents'), { recursive: true });
  writeFileSync(path.join(h, '.kiro', 'agents', 'mine.json'), '{"name":"mine"}');
  writeKiroAgent(h, skill);
  assert.equal(readFileSync(path.join(h, '.kiro', 'agents', 'mine.json'), 'utf8'), '{"name":"mine"}');
});

test('a relative prompt path is refused; a folder that cannot be written throws', () => {
  assert.throws(() => writeKiroAgent(home(), 'skills/vision-board/SKILL.md'), /absolute/);
  const h = home();
  writeFileSync(path.join(h, '.kiro'), 'a file where the folder should be');
  assert.throws(() => writeKiroAgent(h, skill), /EEXIST|ENOTDIR/);
});


test('the open project\'s own steering is always loaded and its skills on demand, from the working folder (N37-context ruling 1)', () => {
  const h = home();
  const { file } = writeKiroAgent(h, skill);
  const draft = JSON.parse(readFileSync(KIRO_AGENT_DRAFT, 'utf8'));
  const expected = ['file://.kiro/steering/**/*.md', 'skill://.kiro/skills/**/SKILL.md'];
  assert.deepEqual(draft.resources, expected, 'the draft');
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).resources, expected, 'the written file, relative: Kiro resolves them from its working folder');
});
