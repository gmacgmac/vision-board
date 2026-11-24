// npm run skill:install (server/skill-install.ts `runSkillInstall`, server/skill-mcp.ts, D-118), against a temporary
// home and a fake `claude`: never the real home. Copies into each installed client, skips the rest, refuses a stale
// skill, replaces a folder whole, and reports or adds the board's MCP server without touching any other entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir } from '#format/testing';
import { STANDALONE_DIR } from '../../../skills/vision-board/source/build.mjs';
import { mainCheckout, needsInstall, runSkillInstall, skillFiles, skillTarget } from '../server/skill-install.ts';
import type { Runner } from '../server/skill-mcp.ts';
import { insertServer, mcpStatus } from '../server/skill-mcp.ts';
import * as binWords from '../server/words/bin.ts';

const ENTRY = { command: '/opt/node/bin/node', args: ['/Users/x/My Repo/packages/mcp/bin/vb-mcp.ts'] };
const FOLDERS = { claude: '.claude', kiro: '.kiro', crew: '.kiro/crew' } as const;

/** A temporary home holding the named clients' folders; removed after `fn`. */
function withHome(clients: (keyof typeof FOLDERS)[], fn: (home: string) => void): void {
  const home = makeTempDir('vb-skill-home-');
  try {
    for (const c of clients) fs.mkdirSync(path.join(home, FOLDERS[c]), { recursive: true });
    fn(home);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
}

/** A fake `claude` that records its calls and succeeds. */
function fakeClaude(): { run: Runner; calls: string[][] } {
  const calls: string[][] = [];
  return { calls, run: (command, args) => { calls.push([command, ...args]); return { status: 0, output: '' }; } };
}

const write = (file: string, text: string) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const listed = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath, e.name))).sort();

test('all clients installed: each gets exactly the shipped files, a next step, and an MCP line', () => withHome(['claude', 'kiro', 'crew'], (home) => {
  const { lines, code } = runSkillInstall({ home, entry: ENTRY, run: fakeClaude().run });
  assert.equal(code, 0);
  const files = skillFiles();
  assert.ok(files.includes('SKILL.md') && files.some((f) => f.startsWith('references/')) && files.some((f) => f.startsWith('examples/')));
  for (const folder of Object.values(FOLDERS)) {
    const target = skillTarget(home, folder);
    assert.deepEqual(listed(target), [...files].sort());
    for (const f of files) assert.ok(fs.readFileSync(path.join(target, f)).equals(fs.readFileSync(path.join(STANDALONE_DIR, f))));
    for (const never of ['NOTES.md', 'scenarios.md', 'source']) assert.ok(!fs.existsSync(path.join(target, never)), never);
  }
  for (const line of [binWords.skillCopied('Claude Code', '~/.claude/skills/vision-board'), binWords.nextClaude, binWords.nextKiro, binWords.nextCrew, binWords.askBeforeAddMcp]) {
    assert.ok(lines.includes(line), line);
  }
  assert.equal(lines.filter((l) => l.includes('MCP server is not set up')).length, 3);
}));

test('some clients missing: those are skipped, not an error', () => withHome(['claude'], (home) => {
  const { lines, code } = runSkillInstall({ home, entry: ENTRY });
  assert.equal(code, 0);
  assert.ok(lines.includes(binWords.skillSkipped('Kiro CLI and IDE', '~/.kiro')));
  assert.ok(lines.includes(binWords.skillSkipped('Kiro Crew', '~/.kiro/crew')));
  assert.ok(!fs.existsSync(path.join(home, '.kiro')), 'a missing client is not made');
  assert.ok(!lines.includes(binWords.nextKiro));
}));

test('no client installed: exit 1, nothing made', () => withHome([], (home) => {
  const { lines, code } = runSkillInstall({ home, entry: ENTRY });
  assert.equal(code, 1);
  assert.deepEqual(lines, [binWords.noClient(['~/.claude', '~/.kiro', '~/.kiro/crew'])]);
  assert.deepEqual(fs.readdirSync(home), []);
}));

test('a stale skill is refused and nothing is copied', () => withHome(['claude'], (home) => {
  const skillDir = makeTempDir('vb-skill-src-');
  try {
    fs.cpSync(STANDALONE_DIR, skillDir, { recursive: true });
    fs.appendFileSync(path.join(skillDir, 'SKILL.md'), '\nedited by hand\n');
    const { lines, code } = runSkillInstall({ home, skillDir, entry: ENTRY });
    assert.equal(code, 1);
    assert.deepEqual(lines, [binWords.skillStale(['SKILL.md'])]);
    assert.ok(!fs.existsSync(path.join(home, '.claude/skills')));
  } finally { fs.rmSync(skillDir, { recursive: true, force: true }); }
}));

test('an existing folder or old link is replaced whole, with no temporary sibling left', () => withHome(['claude', 'kiro'], (home) => {
  const claude = skillTarget(home, '.claude');
  write(path.join(claude, 'old-only.md'), 'from an older skill');
  write(path.join(claude, 'SKILL.md'), 'old');
  const linked = makeTempDir('vb-skill-link-');
  try {
    write(path.join(linked, 'SKILL.md'), 'what the old link pointed at');
    fs.mkdirSync(path.dirname(skillTarget(home, '.kiro')), { recursive: true });
    fs.symlinkSync(linked, skillTarget(home, '.kiro'));
    assert.equal(runSkillInstall({ home, entry: ENTRY }).code, 0);
    assert.ok(!fs.existsSync(path.join(claude, 'old-only.md')));
    assert.ok(fs.readFileSync(path.join(claude, 'SKILL.md')).equals(fs.readFileSync(path.join(STANDALONE_DIR, 'SKILL.md'))));
    assert.ok(!fs.lstatSync(skillTarget(home, '.kiro')).isSymbolicLink(), 'the link became a copy');
    assert.equal(fs.readFileSync(path.join(linked, 'SKILL.md'), 'utf8'), 'what the old link pointed at', 'what it linked to is untouched');
    for (const folder of ['.claude', '.kiro']) assert.deepEqual(fs.readdirSync(path.join(home, folder, 'skills')), ['vision-board']);
  } finally { fs.rmSync(linked, { recursive: true, force: true }); }
}));

test('needsInstall: true for a missing or edited copy, false once current, a .DS_Store aside', () => withHome(['crew'], (home) => {
  assert.equal(needsInstall(home), true);
  runSkillInstall({ home, entry: ENTRY });
  write(path.join(skillTarget(home, '.kiro/crew'), '.DS_Store'), 'x');
  assert.equal(needsInstall(home), false);
  fs.appendFileSync(path.join(skillTarget(home, '.kiro/crew'), 'SKILL.md'), 'x');
  assert.equal(needsInstall(home), true);
}));

test('needsInstall: false when no client is installed', () => withHome([], (home) => assert.equal(needsInstall(home), false)));

test('MCP: found by what it runs under any name; missing gets the setup line; a taken name is reported', () => withHome(['claude', 'kiro', 'crew'], (home) => {
  write(path.join(home, '.claude.json'), JSON.stringify({ mcpServers: { vb: { type: 'stdio', command: 'node', args: ['/r/packages/mcp/bin/vb-mcp.ts'] } } }));
  write(path.join(home, '.kiro/crew/mcp.json'), JSON.stringify({ mcpServers: { 'vision-board': { command: 'something-else' } } }));
  assert.deepEqual(mcpStatus(home, 'claude'), { state: 'present', name: 'vb' });
  const { lines } = runSkillInstall({ home, entry: ENTRY });
  assert.ok(lines.includes(binWords.mcpPresent('Claude Code', 'vb', '~/.claude.json')));
  assert.ok(lines.includes(binWords.mcpMissing('Kiro CLI and IDE', binWords.setupKiro('~/.kiro/settings/mcp.json', JSON.stringify(ENTRY)))));
  assert.ok(lines.includes(binWords.mcpNameTaken('Kiro Crew', '~/.kiro/crew/mcp.json')));
  assert.ok(lines.includes(binWords.askBeforeAddMcp));
}));

test('MCP: Claude Code\'s setup line is a pasteable claude mcp add, quoted where a path has a space', () => withHome(['claude'], (home) => {
  const { lines } = runSkillInstall({ home, entry: ENTRY });
  const line = lines.find((l) => l.startsWith('Claude Code: the board'));
  assert.ok(line?.endsWith("run claude mcp add --transport stdio --scope user vision-board -- /opt/node/bin/node '/Users/x/My Repo/packages/mcp/bin/vb-mcp.ts'"), line);
}));

/** `after` is `before` with one run of text inserted, and nothing else changed. */
function insertedOnly(before: string, after: string): void {
  let p = 0;
  while (p < before.length && before[p] === after[p]) p++;
  assert.ok(after.endsWith(before.slice(p)), 'the rest of the file is byte-for-byte');
}

test('--add-mcp adds only the missing entries, as vision-board, leaving every other entry and byte alone', () => withHome(['claude', 'kiro', 'crew'], (home) => {
  const kiroText = '{\n    "mcpServers": {\n        "fetch": { "command": "uvx", "args": ["mcp-server-fetch"], "disabled": true }\n    },\n    "other": [1, 2]\n}\n';
  const kiroFile = path.join(home, '.kiro/settings/mcp.json');
  write(kiroFile, kiroText);
  fs.chmodSync(kiroFile, 0o600);
  const claudeText = JSON.stringify({ mcpServers: { vb: { command: 'node', args: ['/r/packages/mcp/bin/vb-mcp.ts'] } }, numStartups: 3 });
  write(path.join(home, '.claude.json'), claudeText);
  const claude = fakeClaude();
  const { lines, code } = runSkillInstall({ home, entry: ENTRY, addMcp: true, run: claude.run });
  assert.equal(code, 0);
  assert.deepEqual(claude.calls, [], 'Claude Code already has it (as vb): claude mcp add is not run');
  assert.equal(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'), claudeText);
  const kiroAfter = fs.readFileSync(kiroFile, 'utf8');
  insertedOnly(kiroText, kiroAfter);
  assert.deepEqual(JSON.parse(kiroAfter), { mcpServers: { fetch: { command: 'uvx', args: ['mcp-server-fetch'], disabled: true }, 'vision-board': ENTRY }, other: [1, 2] });
  assert.equal(fs.statSync(kiroFile).mode & 0o777, 0o600, 'the file keeps its mode');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, '.kiro/crew/mcp.json'), 'utf8')), { mcpServers: { 'vision-board': ENTRY } }, 'a missing file is made');
  assert.ok(lines.includes(binWords.mcpAdded('Kiro CLI and IDE', '~/.kiro/settings/mcp.json')));
  assert.ok(!lines.includes(binWords.askBeforeAddMcp));
  assert.equal(runSkillInstall({ home, entry: ENTRY, addMcp: true, run: claude.run }).lines.filter((l) => l.includes('added')).length, 0, 'a second run adds nothing');
}));

test('--add-mcp runs claude mcp add for Claude Code when missing, and never over a name another server holds', () => withHome(['claude', 'kiro'], (home) => {
  const taken = '{ "mcpServers": { "vision-board": { "command": "other" } } }';
  write(path.join(home, '.kiro/settings/mcp.json'), taken);
  const claude = fakeClaude();
  const { lines } = runSkillInstall({ home, entry: ENTRY, addMcp: true, run: claude.run });
  assert.deepEqual(claude.calls, [['claude', 'mcp', 'add', '--transport', 'stdio', '--scope', 'user', 'vision-board', '--', ENTRY.command, ...ENTRY.args]]);
  assert.ok(lines.includes(binWords.mcpAdded('Claude Code', '~/.claude.json')));
  assert.ok(lines.includes(binWords.mcpNameTaken('Kiro CLI and IDE', '~/.kiro/settings/mcp.json')));
  assert.equal(fs.readFileSync(path.join(home, '.kiro/settings/mcp.json'), 'utf8'), taken);
}));

test('--add-mcp: a claude that is not on PATH is a failure, exit 1', () => withHome(['claude'], (home) => {
  const run: Runner = () => ({ status: null, error: Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }), output: '' });
  const { lines, code } = runSkillInstall({ home, entry: ENTRY, addMcp: true, run });
  assert.equal(code, 1);
  assert.ok(lines.includes(binWords.mcpAddFailed('Claude Code', binWords.claudeNotFound)));
}));

test('insertServer: an empty mcpServers, none at all, and compact JSON', () => {
  for (const text of ['{\n  "mcpServers": {}\n}\n', '{\n  "theme": "dark"\n}\n', '{"a":{"b":"}"},"mcpServers":{"x":{"command":"y"}}}', '{}']) {
    const after = insertServer(text, 'vision-board', ENTRY);
    insertedOnly(text, after);
    const json = JSON.parse(after) as { mcpServers: Record<string, unknown> };
    assert.deepEqual(json.mcpServers['vision-board'], ENTRY, text);
  }
});

test('mainCheckout: a linked worktree points at its main checkout', () => {
  const dir = makeTempDir('vb-skill-wt-');
  try {
    write(path.join(dir, '.git'), 'gitdir: /x/main/.git/worktrees/feature\n');
    assert.equal(mainCheckout(dir), '/x/main');
    fs.rmSync(path.join(dir, '.git'));
    fs.mkdirSync(path.join(dir, '.git'));
    assert.equal(mainCheckout(dir), dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
