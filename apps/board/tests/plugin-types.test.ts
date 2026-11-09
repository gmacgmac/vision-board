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
import { FLAGS } from '#format';
import type { AnswersAck } from '#actions';
import type { ChatLine } from '../src/board/host.ts';
import { CHANGE_BOUNDS, CHANGE_META, changeOf, createEngine } from '../server/engine/index.ts';
import { toolRows } from '../server/format-files.ts';
import * as contract from '../../../tests/plugin/contract/nclite/shared/plugin-host.ts';
import { checkRef, storedChangeOf } from '../../../tests/plugin/contract/nclite/shared/plugin-checks.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const dts = pluginTypes();

/** A host written from docs/specification/plugin.md alone, using every member the seam has. */
const HOST = `
import { createEngine, mount } from './plugin';
import type { Caller, Chip, PluginEngine, PluginHost, PluginView, Ref } from './plugin';

const held = new Map<string, Chip>();
const acks: Ref[] = [];
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
  events: (listener) => { listener({ plugin: 'vision-board', ref: { board: 'plans', head: 4, cards: [1, 2], seen: true } }); return () => undefined; },
  chat: {
    attach: (key, chip) => { if (chip) held.set(key, chip); else held.delete(key); },
    send: (record) => record(acks.length ? acks : null).then((problem) => problem ?? null),
    status: { now: 'working', agent: 'a1', held: false, staged: true, on: (listener) => { listener(); return () => undefined; } },
    reveal: (ref) => void [ref.board, ref.cards],
    hasLine: (ref) => ref.cards > 0,
  },
  settings: { get: (key) => (key === 'align' ? 'center' : undefined), on: (listener) => { listener(); return () => undefined; } },
  notify: (text, tone) => void [text, tone === 'error'],
  confirm: async (ask) => ask.list !== undefined && [ask.heading, ask.body, ask.confirm, ...ask.list.items.map((i) => i.ref + i.text), ...(ask.list.skipped ?? []).map((i) => i.ref + i.text)].length > 0,
  store: { get: (key) => (key ? null : ''), set: (key, value) => void [key, value] },
  imageRoute: '/board-images/',
  pageChanged: () => {},
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
  const engine: PluginEngine = createEngine({ dir: '/data', name: () => 'plans', warn: (message) => void message, flags: { svgImages: true }, readOnly: () => false });
  const reply = await engine.route({ method: 'GET', path: 'ledger', query: new URLSearchParams('after=0'), body: {} }, { caller: { by: 'person' }, signal });
  const picture = engine.image({ method: 'GET', path: 'flow.png', ifNoneMatch: '"v1"' });
  const answers = engine.resolve('answers', { board: 'plans', since: 0, agent: 'a1' });
  const card = engine.resolve('card', { board: 'plans', n: 1, ver: 1 });
  const text = 'refused' in answers ? answers.reason + answers.refused : answers.text + answers.where + answers.count + answers.ack.board.toLowerCase() + answers.ack.head.toFixed() + answers.notes.size;
  const other = 'refused' in card ? card.reason : card.text + card.where + JSON.stringify(card.ack);
  const listed = engine.tools.list().map((t) => [t.name, t.title, t.description, t.inputSchema, t.annotations]);
  const called = await engine.tools.call('list_boards', {}, { caller: { by: 'agent', agent: 'a1' }, signal });
  const stop = engine.watch((change) => void [change.board, change.head]);
  stop();
  return [reply?.status, reply?.body, reply?.headers, picture.status, picture.body, text, other, listed, called.isError, called.content[0]?.type, called.content[0]?.text, whoOf({ by: 'person' }), called.structuredContent, called._meta, engine.tools.instructions];
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

/** The contract's copy (tests/plugin/contract/nclite/, a test fixture: shipped code never imports it). */
const CONTRACT = fs.readFileSync(path.join(ROOT, 'tests/plugin/contract/nclite/shared/plugin-host.ts'), 'utf8');

/** What the compiler says of `check`, compiled against `plugin.d.ts` text and the contract's copy beside it. */
function contractProblems(types: string, check: string): string[] {
  fs.writeFileSync(path.join(DIR, 'plugin.d.ts'), types);
  fs.writeFileSync(path.join(DIR, 'plugin-host.ts'), CONTRACT);
  fs.writeFileSync(path.join(DIR, 'contract.ts'), check);
  const program = ts.createProgram([path.join(DIR, 'contract.ts')], OPTIONS, compilerHost);
  return ['contract.ts', 'plugin.d.ts', 'plugin-host.ts'].flatMap((f) => {
    const file = program.getSourceFile(path.join(DIR, f))!;
    return [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)].map((d) => `${f}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
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

test('an option a host may leave out is additive: a host written before readOnly compiles against the types as they are (D-085 7)', () => {
  const before = HOST.replace(', readOnly: () => false', '');
  assert.notEqual(before, HOST, 'the host above passes readOnly');
  assert.deepEqual(problems(dts, before), []);
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
  assert.match(seamProblem(widened) ?? '', /raises SEAM to 3/);
  assert.match(seamProblem(dts.replace('hasLine?(ref', 'hasLine(ref')) ?? '', /SEAM_TYPES/);
});

test('a new flag leaves the types alone: flag names are strings at the seam, so adding one is not a seam change (D-078)', () => {
  const code = dts.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // a comment may name a flag; the hash ignores comments
  const named = Object.keys(FLAGS).filter((name) => new RegExp(`\\b${name}\\b`).test(code));
  assert.deepEqual(named, [], 'no flag name is in plugin.d.ts');
  assert.doesNotMatch(code, /\bFlagName\b|\bFlagOverrides\b/);
  assert.match(dts, /flags\?: Record<string, boolean>/);
});

/** A host built to the contract takes the board as it is, with no adapter: the built entries are the contract's entries,
 * the seam's shared shapes the contract's own, and the manifest a contract manifest. Held by the compiler, so the day the
 * shapes drift this fails. */
const CHECK = (manifest: string) => `
import type * as Host from './plugin-host';
import type { ChangeMeta, ChipText, CreateEngine, Mount, PluginEvent, PluginManifest, Ref, SendRecord } from './plugin-host';
import { createEngine, mount } from './plugin';
import type * as Board from './plugin';

/** The same type, member for member (the compiler's identity, not assignability). */
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
export const entries: [Mount<HTMLElement>, CreateEngine] = [mount, createEngine];
export const shapes: [Same<Board.Ref, Ref>, Same<Board.SendRecord, SendRecord>, Same<Board.PluginEvent, PluginEvent>] = [true, true, true];
export const same: true[] = [
  {} as Same<Board.RefValue, Host.RefValue>, {} as Same<Board.ChatWork, Host.ChatWork>, {} as Same<Board.ChatStatus, Host.ChatStatus>,
  {} as Same<Board.ConfirmAsk, Host.ConfirmAsk>, {} as Same<Board.ConfirmList, Host.ConfirmList>, {} as Same<Board.ConfirmItem, Host.ConfirmItem>,
  {} as Same<Board.Caller, Host.Caller>, {} as Same<Board.Transport, Host.Transport>, {} as Same<Board.EngineReply, Host.EngineReply>,
  {} as Same<Board.ListedTool, Host.ListedTool>, {} as Same<Board.ToolResult, Host.ToolResult>,
];
export const refs = (ack: Board.AnswersAck, line: Board.ChatLine, change: Board.PluginChange): Ref[] => [ack, line, change];
export const said = (answers: Board.AnswersText, other: Board.ChipText): ChipText[] => [answers, other];
export const meta = (change: { words: string; count: number; subject: string; reveal: Board.Ref }): ChangeMeta => change;
export const manifest: PluginManifest = ${manifest};
`;

test('the types satisfy the host contract: the built `mount` is a `Mount<HTMLElement>`, `createEngine` a `CreateEngine`, the shared shapes the contract\'s, the manifest a `PluginManifest`, and a write\'s change line one the contract stores', async () => {
  const dir = makeTempDir('vb-plugin-contract-');
  try {
    const engine = createEngine({ dir, warn: () => {} });
    const writes = new Set((toolRows() as { name: string; writes: boolean }[]).filter((r) => r.writes).map((r) => r.name));
    const manifest = manifestOf('1.2.3', engine.tools.list(), writes);
    assert.deepEqual(contractProblems(dts, CHECK(JSON.stringify(manifest))), []);
    const drifts = [
      ['an event of seam 1', 'export interface PluginEvent { plugin: string; ref: Ref }', 'export interface PluginEvent { plugin: string; ref: { board?: string; head?: number } }'],
      ['a record of seam 1', 'export type SendRecord = (acks: readonly Ref[] | null)', 'export type SendRecord = (answers?: { head: number } | null)'],
      ['a watch of seam 1', 'export type PluginChange = { board?: string; head: number };', 'export interface PluginChange { board?: string; head: number }'],
    ] as const;
    for (const [cut, from, to] of drifts) {
      const drifted = dts.replace(from, to);
      assert.notEqual(drifted, dts, `the sample drift of ${cut} was made`);
      assert.notDeepEqual(contractProblems(drifted, CHECK(JSON.stringify(manifest))), [], `a ${cut} that drifts from the contract fails`);
    }

    // The bounds are the contract's, and the board's change line is one the host stores, by the host's own check.
    assert.equal(contract.CHANGE_META, CHANGE_META, 'the board writes its change line under the contract\'s key');
    assert.deepEqual(CHANGE_BOUNDS, { refChars: contract.REF_LIMITS.maxChars, refItems: contract.REF_LIMITS.maxItems, refString: contract.REF_LIMITS.maxString, maxCount: contract.CHANGE_LIMITS.maxCount, subjectChars: contract.CHANGE_LIMITS.subjectChars });
    const stored = (meta: Record<string, unknown> | undefined) => storedChangeOf(manifest.id, meta, manifest.changeWords);
    const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label: 'Contract test' } }))!.body as { agent: string };
    const items = [{ type: 'board', title: 'Plans' }, { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } }, { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' } }];
    const wrote = await engine.tools.call('write_board', { board: 'plans', items }, { caller: { by: 'agent', agent: joined.agent } });
    assert.equal(stored(wrote._meta), JSON.stringify({ v: 2, plugin: manifest.id, ...(wrote._meta?.[CHANGE_META] as object) }), JSON.stringify(wrote._meta));
    const most = changeOf('a'.repeat(64), Array.from({ length: 500 }, (_, i) => 100000 + i));
    assert.notEqual(stored({ [CHANGE_META]: most }), null, 'the longest board id and the most cards the host counts: stored, its reveal within REF_LIMITS (the reveal left out is engine.test.ts\'s)');
    // The answers ack and a chat line's ref, at the longest board id, are refs the host's own check takes.
    const ack: AnswersAck = { board: 'a'.repeat(64), head: Number.MAX_SAFE_INTEGER };
    const line: ChatLine = { board: 'a'.repeat(64), cards: Number.MAX_SAFE_INTEGER };
    for (const ref of [ack, line, {}]) assert.deepEqual(checkRef(ref), ref, JSON.stringify(ref));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
