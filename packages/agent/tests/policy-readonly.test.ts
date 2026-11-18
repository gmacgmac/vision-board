// The skill's references (maintainer point 547): a folder outside the board's, which the agent is told about, read
// without asking and never written, by every path that decides (the policy, the gate's environment, Kiro's verdict,
// Claude Code's own deny rules, Kiro's agent file), and the note naming the skill's folder after its instructions.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Facts } from '../src/index.ts';
import { GATE_READONLY_ENV, claudeDenyRules, gateEnv, instructionsText, kiroAgentText, policy, verdictFor } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';

const base = mkdtempSync(path.join(os.tmpdir(), 'vb-readonly-'));
after(() => rmSync(base, { recursive: true, force: true }));
const board = path.join(base, 'project');
const skill = path.join(base, 'repo', 'skills', 'vision-board');
const refs = path.join(skill, 'references');
for (const d of [board, refs]) mkdirSync(d, { recursive: true });
writeFileSync(path.join(refs, 'layouts.md'), '# Layouts\n');
writeFileSync(path.join(refs, '.env'), 'X=1\n');
writeFileSync(path.join(skill, 'SKILL.md'), '# Vision Board\n');
const read = (p: string, recursive = false): Facts => ({ kind: 'read', path: p, ...(recursive && { recursive }) } as Facts);
const write = (p: string): Facts => ({ kind: 'write', op: 'create', path: p });
const opts = { readOnly: refs };

test('a reference is read without asking, a search of the folder too; without the option it is outside, so asked', () => {
  assert.deepEqual(policy(read(path.join(refs, 'layouts.md')), board, opts), { allow: true });
  assert.deepEqual(policy(read(refs, true), board, opts), { allow: true });
  assert.deepEqual(policy(read(path.join(refs, 'layouts.md')), board), { ask: true, scopes: ['once', 'session'] });
  assert.deepEqual(policy(read(path.join(skill, 'SKILL.md')), board, opts), { ask: true, scopes: ['once', 'session'] }, 'only the folder named');
});

test('never written: a change, a new file, a path that climbs into it; a name the rules refuse anywhere stays refused', () => {
  for (const p of [path.join(refs, 'layouts.md'), path.join(refs, 'new.md'), path.join(board, '..', 'repo', 'skills', 'vision-board', 'references', 'x.md')]) {
    assert.deepEqual(policy(write(p), board, opts), { refuse: words.skillReferences }, p);
  }
  assert.deepEqual(policy(read(path.join(refs, '.env')), board, opts), { refuse: words.secretsFiles });
});

test('strict (agentAccessRules off) still asks; a second name of a file there is asked, once', () => {
  assert.deepEqual(policy(read(path.join(refs, 'layouts.md')), board, { ...opts, strict: true }), { ask: true, scopes: ['once'] });
  writeFileSync(path.join(refs, 'handover.md'), '# Handover\n');
  linkSync(path.join(refs, 'handover.md'), path.join(refs, 'twin.md'));
  assert.deepEqual(policy(read(path.join(refs, 'twin.md')), board, opts), { ask: true, scopes: ['once'] });
});

test('inside the board\'s folder too (the board open on the skill\'s own repo), the folder is never written', () => {
  const inside = path.join(board, 'skills', 'references');
  mkdirSync(inside, { recursive: true });
  assert.deepEqual(policy(write(path.join(inside, 'a.md')), board, { readOnly: inside }), { refuse: words.skillReferences });
  assert.deepEqual(policy(write(path.join(inside, 'a.md')), board), { ask: true, scopes: ['once', 'session', 'folder'] }, 'without it, as any file in the folder');
});

test('every path that decides knows it: the gate\'s environment, Kiro\'s verdict, Claude Code\'s deny rules, Kiro\'s agent file', () => {
  const env = gateEnv({ cwd: board, gate: { url: 'http://127.0.0.1:1/', token: 't' }, readOnlyFolder: refs });
  assert.equal(env[GATE_READONLY_ENV], refs);
  assert.deepEqual(verdictFor({ kind: 'read', locations: [{ path: path.join(refs, 'layouts.md') }] }, false, board, () => true, false, undefined, refs), { allow: true });
  assert.ok('refuse' in verdictFor({ kind: 'edit', locations: [{ path: path.join(refs, 'layouts.md') }], content: [{ type: 'diff', path: path.join(refs, 'layouts.md'), oldText: 'a', newText: 'b' }] }, false, board, () => true, false, undefined, refs));
  assert.ok(claudeDenyRules(board, refs).includes(`Edit(/${refs}/**)`) && !claudeDenyRules(board).some((r) => r.includes(refs)));
  const made = JSON.parse(kiroAgentText(path.join(skill, 'SKILL.md'), { readOnly: refs, noteFile: path.join(base, 'note.md') }));
  assert.ok(made.resources.includes(`file://${path.join(base, 'note.md')}`));
  assert.ok(made.permissions.rules.some((r: { capability: string; match: string[]; effect: string }) => r.capability === 'fs_write' && r.match[0] === `${refs}/**` && r.effect === 'deny'));
  assert.ok(made.toolsSettings.write.deniedPaths.includes(`${refs}/**`));
  const plain = JSON.parse(kiroAgentText(path.join(skill, 'SKILL.md')));
  assert.ok(!JSON.stringify(plain).includes(refs), 'without extras, as before');
});

test('the note follows the instructions in one text, the file read fresh; no note, no text (the file is given as it is)', () => {
  const file = path.join(skill, 'SKILL.md');
  assert.equal(instructionsText({ instructionsFile: file, instructionsNote: 'Base directory: /x' }, () => '# Skill\n\n'), '# Skill\n\nBase directory: /x\n');
  assert.equal(instructionsText({ instructionsFile: file }, () => 'never read'), undefined);
});
