// plugin.d.ts and the seam version (docs/specification/plugin.md § The types and the seam version). The types are
// generated from the code (bin/plugin-types.ts), so what is held here is what a host's compiler sees: a small host that
// uses every member compiles against them, and the file fails to compile when any one member is taken out. The seam
// number (plugin/seam.ts) cannot stay behind the types: a change to them fails here until the hash is set again.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { makeTempDir } from '#format/testing';
import { pluginTypes, seamProblem, typesHash } from '../bin/plugin-types.ts';
import { SEAM, SEAM_TYPES, TYPES_FILE } from '../plugin/seam.ts';
import { manifestOf } from '../plugin/manifest.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const dts = pluginTypes();

/** A host written from docs/specification/plugin.md alone, using every member the seam has. */
const HOST = `
import { createEngine, mount } from './plugin';
import type { AnswersRead, Caller, Chip, PluginEngine, PluginHost, PluginView } from './plugin';

const held = new Map<string, Chip>();
const headOf = (read: AnswersRead): number | undefined => read?.head;
const whoOf = (caller: Caller): string => (caller.by === 'agent' ? caller.agent : caller.by);
const refOf = (chip: Chip): unknown[] => {
  switch (chip.kind) {
    case 'card': return [chip.ref.board, chip.ref.n, chip.ref.ver];
    case 'note': return [chip.ref.board, chip.ref.seq, chip.ref.rev];
    case 'board': return [chip.ref.board, chip.ref.head];
    case 'selection': return [chip.ref.board, chip.ref.cards];
    case 'answers': return [chip.ref.board, chip.ref.since, chip.ref.agent];
  }
};
const host: PluginHost = {
  api: (path, init) => fetch(path, init),
  events: (listener) => { listener({ plugin: 'board', ref: { board: 'plans', head: 4 } }); return () => undefined; },
  chat: {
    attach: (key, chip) => { if (chip) held.set(key, chip); else held.delete(key); },
    send: (record) => record({ head: 3 }).then((problem) => problem ?? String(headOf({ head: 3 }))),
    status: { now: 'working', agent: 'a1', held: false, staged: true, on: (listener) => { listener(); return () => undefined; } },
    reveal: (ref) => void [ref.board, ref.n],
    hasLine: (ref) => ref.n > 0,
  },
  settings: { get: (key) => (key === 'align' ? 'center' : undefined), on: (listener) => { listener(); return () => undefined; } },
  notify: (text, tone) => void [text, tone === 'error'],
  confirm: async (ask) => ask.list !== undefined && [ask.heading, ask.body, ask.confirm, ...ask.list.items.map((i) => i.ref + i.text), ...(ask.list.skipped ?? []).map((i) => i.ref + i.text)].length > 0,
  store: { get: (key) => (key ? null : ''), set: (key, value) => void [key, value] },
  imageRoute: '/board-images/',
};

export async function useView(root: HTMLElement): Promise<unknown[]> {
  const view: PluginView = mount(root, host);
  const chip = view.pageChip();
  view.reveal({ board: 'plans', n: 2, seq: 3, cards: [1, 2] });
  const { boardId, title, counts, unsaved, chatWork } = view.status.now;
  view.status.on((patch) => void [patch.boardId, patch.title, patch.counts?.open, patch.unsaved, patch.chatWork]);
  const sent = await view.send();
  const left = await view.leave();
  view.unmount();
  return [chip?.plugin, chip?.kind, chip?.label, chip?.detail, chip?.preview, chip && refOf(chip), boardId, title, counts.open, counts.withAgent, counts.answered, counts.later, unsaved, chatWork, view.unsaved(), sent, left];
}

export async function useEngine(signal: AbortSignal): Promise<unknown[]> {
  const engine: PluginEngine = createEngine({ dir: '/data', name: () => 'plans', warn: (message) => void message, flags: { svgImages: true } });
  const reply = await engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams('after=0'), body: {} }, { caller: { by: 'person' }, signal });
  const picture = engine.image({ method: 'GET', path: 'flow.png', ifNoneMatch: '"v1"' });
  const answers = engine.resolve('answers', { board: 'plans', since: 0, agent: 'a1' });
  const card = engine.resolve('card', { board: 'plans', n: 1, ver: 1 });
  const text = 'refused' in answers ? answers.reason + answers.refused : answers.text + answers.where + answers.count + answers.head + answers.notes.size;
  const other = 'refused' in card ? card.reason : card.text + card.where;
  const listed = engine.tools.list().map((t) => [t.name, t.title, t.description, t.inputSchema, t.annotations]);
  const called = await engine.tools.call('list_boards', {}, { caller: { by: 'agent', agent: 'a1' }, signal });
  const stop = engine.watch((change) => void [change.board, change.head]);
  stop();
  return [reply?.status, reply?.body, reply?.headers, picture.status, picture.body, text, other, listed, called.isError, called.content[0]?.type, called.content[0]?.text, whoOf({ by: 'person' }), called.structuredContent, called._meta];
}
`;

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
  types: ['node'], typeRoots: [path.join(ROOT, 'node_modules/@types')], strict: true, noUncheckedIndexedAccess: true, noEmit: true,
};
const DIR = makeTempDir('vb-plugin-types-');
after(() => fs.rmSync(DIR, { recursive: true, force: true }));
const kept = new Map<string, ts.SourceFile>();
const compilerHost = ts.createCompilerHost(OPTIONS);
const read = compilerHost.getSourceFile.bind(compilerHost);
// Library files are parsed once for all the compiles here; the two files under test are read fresh each time.
compilerHost.getSourceFile = (name, version, ...rest) => {
  if (name.startsWith(DIR)) return ts.createSourceFile(name, fs.readFileSync(name, 'utf8'), version);
  if (!kept.has(name)) kept.set(name, read(name, version, ...rest)!);
  return kept.get(name);
};

/** What the compiler says of a host and `plugin.d.ts` text, the host's file and the types' own, nothing in the libraries. */
function problems(types: string, host = HOST): string[] {
  fs.writeFileSync(path.join(DIR, 'plugin.d.ts'), types);
  fs.writeFileSync(path.join(DIR, 'host.ts'), host);
  const program = ts.createProgram([path.join(DIR, 'host.ts')], OPTIONS, compilerHost);
  return [path.join(DIR, 'host.ts'), path.join(DIR, 'plugin.d.ts')].flatMap((f) => {
    const file = program.getSourceFile(f)!;
    return [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)].map((d) => `${path.basename(f)}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  });
}

/** Every member of every type in the file, at any depth, with the text that takes it out. */
function memberCuts(types: string): { name: string; cut: string }[] {
  const file = ts.createSourceFile('plugin.d.ts', types, ts.ScriptTarget.Latest, true);
  const out: { name: string; cut: string }[] = [];
  const walk = (node: ts.Node, owner: string) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) owner = node.name.text;
    if (ts.isPropertySignature(node) || ts.isMethodSignature(node)) {
      const text = types.slice(0, node.getFullStart()) + types.slice(node.end);
      out.push({ name: `${owner}.${node.name.getText()}${out.some((o) => o.name === `${owner}.${node.name.getText()}`) ? '(2)' : ''}`, cut: text });
    }
    node.forEachChild((c) => walk(c, owner));
  };
  walk(file, '');
  return out;
}

test('the types are the code\'s own, with only what the folder promises: the entries, the host and the engine, with nothing of the standalone page', () => {
  for (const name of ['mount', 'createEngine', 'PluginHost', 'PluginView', 'PluginEngine', 'PluginEngineOptions', 'BoardChat', 'BoardView']) assert.match(dts, new RegExp(`export (?:declare function|interface|type) ${name}\\b`), name);
  for (const name of ['BoardPage', 'BoardPageParts', 'MountedBoard', 'BoardControls', 'Engine', 'EngineOptions', 'Ledger', 'Agents']) assert.doesNotMatch(dts, new RegExp(`\\b${name}\\b`), `${name} is the standalone's`);
  assert.doesNotMatch(dts, /\bonSend\b|\bpage\??:/);
  assert.ok(!/nclite/i.test(dts) && !dts.includes(ROOT), 'it names no host and no machine');
  assert.equal(pluginTypes(), dts, 'the same input gives the same text');
});

test('a host that uses every member compiles against the types', () => {
  assert.deepEqual(problems(dts), []);
});

test('the file fails to compile against that host when any one member is taken out', () => {
  const cuts = memberCuts(dts);
  assert.ok(cuts.length > 80, `the seam has its members (${cuts.length})`);
  // `Round.text` is also `ChipText.text`, in the same intersection: taking one out changes nothing a host can see.
  const kept = cuts.filter((c) => problems(c.cut).length === 0).map((c) => c.name);
  assert.deepEqual(kept, ['Round.text'], 'a member the host above does not use: add its use to HOST');
});

test('the manifest holds the seam number', () => {
  const manifest = manifestOf('1.2.3', [], new Set());
  assert.equal(manifest.seam, SEAM);
  assert.ok(Number.isInteger(SEAM) && SEAM >= 1);
  assert.equal(TYPES_FILE, 'plugin.d.ts');
});

test('the seam number cannot stay behind the types: a change to them fails until seam.ts is set again, and a comment or a line break is not a change', () => {
  assert.equal(seamProblem(dts), null, `plugin.d.ts changed: ${seamProblem(dts)}`);
  assert.equal(typesHash(dts), SEAM_TYPES);
  assert.equal(typesHash(`// another comment\n${dts.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/;\n/g, ';\n\n')}`), SEAM_TYPES, 'comments and layout move nothing');
  const widened = dts.replace("export type ChatWork = 'idle' | 'working' | 'asking';", "export type ChatWork = 'idle' | 'working' | 'asking' | 'stopped';");
  assert.notEqual(widened, dts, 'the sample change was made');
  assert.match(seamProblem(widened) ?? '', /raises SEAM to 2/);
  assert.match(seamProblem(dts.replace('hasLine?(ref', 'hasLine(ref')) ?? '', /SEAM_TYPES/);
});
