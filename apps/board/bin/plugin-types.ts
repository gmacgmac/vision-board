// `plugin.d.ts`: the seam's types for a TypeScript host (docs/specification/plugin.md § The types and the seam
// version). One source: the declarations are the ones in `apps/board/plugin/view.ts` and `engine.ts` and every
// type they reach, read with the repo's own TypeScript and copied as written (comments included), so there is no
// second copy to keep. A `Pick` or `Omit` is opened to its members, so what the folder leaves out
// (`MountedBoard.board`, `Engine.ledger`) is not in the file. Anything else the generator can't copy as it stands
// (a `typeof`, a class, an enum) stops the build, so a type that needs it is a decision, not a surprise.
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { SEAM, SEAM_TYPES } from '../plugin/seam.ts';
import * as binWords from '../server/words/bin.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');
/** The two files a host's entries are in: every exported declaration of each is in the seam. */
export const SEAM_ENTRIES = ['apps/board/plugin/view.ts', 'apps/board/plugin/engine.ts'] as const;

function loadProgram(): ts.Program {
  const file = path.join(ROOT, 'tsconfig.json');
  const config = ts.parseJsonConfigFileContent(ts.readConfigFile(file, ts.sys.readFile).config, ts.sys, ROOT);
  return ts.createProgram(SEAM_ENTRIES.map((f) => path.join(ROOT, f)), { ...config.options, noEmit: true });
}

/** The seam's declarations as one declaration file, sorted by name so a reordering in the source moves nothing. */
export function pluginTypes(): string {
  const program = loadProgram();
  const checker = program.getTypeChecker();
  const found = new Map<string, string>();
  const queue: ts.Declaration[] = [];
  const seen = new Set<ts.Node>();

  const inside = (outer: ts.Node, inner: ts.Node): boolean => inner.pos >= outer.pos && inner.end <= outer.end && inner.getSourceFile() === outer.getSourceFile();
  const isExternal = (sf: ts.SourceFile) => program.isSourceFileDefaultLibrary(sf) || program.isSourceFileFromExternalLibrary(sf) || sf.fileName.includes('/node_modules/');
  const symbolOf = (name: ts.Node): ts.Symbol | undefined => {
    const s = checker.getSymbolAtLocation(name);
    return s && s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
  };
  /** Queue what `name` points at: a declaration of ours, copied; a lib's or a type parameter's, left to be. */
  const reach = (name: ts.Node, within: ts.Node) => {
    for (const d of symbolOf(name)?.declarations ?? []) {
      if (ts.isTypeParameterDeclaration(d) || inside(within, d) || isExternal(d.getSourceFile())) continue;
      if (!ts.isInterfaceDeclaration(d) && !ts.isTypeAliasDeclaration(d)) throw new Error(`plugin.d.ts: ${(d as { name?: ts.Node }).name?.getText() ?? '?'} (${ts.SyntaxKind[d.kind]}) is reached by the seam, and the generator copies only interfaces and type aliases`);
      if (!seen.has(d)) { seen.add(d); queue.push(d); }
    }
  };
  /** `Pick<T, 'a' | 'b'>` or `Omit<T, 'a'>` as the literal type of those members, the way they are declared in `T`. */
  const opened = (n: ts.TypeReferenceNode, within: ts.Node): string | undefined => {
    if (!ts.isIdentifier(n.typeName) || !/^(?:Pick|Omit)$/.test(n.typeName.text) || n.typeArguments?.length !== 2) return undefined;
    const [from, keys] = n.typeArguments;
    if (!from || !keys) return undefined;
    const names = (ts.isUnionTypeNode(keys) ? keys.types : [keys]).map((k) => {
      if (!ts.isLiteralTypeNode(k) || !ts.isStringLiteral(k.literal)) throw new Error(`plugin.d.ts: ${n.getText()} must name its keys as string literals`);
      return k.literal.text;
    });
    const type = checker.getTypeFromTypeNode(from);
    const props = /^Pick$/.test(n.typeName.text) ? names.map((k) => checker.getPropertyOfType(type, k)) : checker.getPropertiesOfType(type).filter((p) => !names.includes(p.name));
    const members = props.flatMap((p, i) => {
      if (!p?.declarations?.length) throw new Error(`plugin.d.ts: ${names[i]} is not a member of ${from.getText()}`);
      return p.declarations.map((d) => `  ${textOf(d, within)}`);
    });
    return `{\n${members.join('\n')}\n}`;
  };
  /** The source text of `node` with its leading doc comment, and every reached type queued. */
  const textOf = (node: ts.Node, within: ts.Node): string => {
    const sf = node.getSourceFile();
    const edits: { start: number; end: number; text: string }[] = [];
    const walk = (n: ts.Node) => {
      if (ts.isTypeQueryNode(n) || (ts.isTypeOperatorNode(n) && ts.isTypeQueryNode(n.type))) {
        // A type made from a value (`typeof CHIP_PLUGIN`, `keyof typeof FLAGS`) is copied as what it is: its literal types, written out.
        const resolved = checker.typeToString(checker.getTypeFromTypeNode(n), undefined, ts.TypeFormatFlags.NoTruncation);
        if (/[{(<]/.test(resolved) || resolved.includes('import(')) throw new Error(`plugin.d.ts: \`${n.getText()}\` in ${sf.fileName} is not a plain literal or union of literals (${resolved.slice(0, 60)}): the generator copies types as written`);
        return void edits.push({ start: n.getStart(sf), end: n.end, text: resolved });
      }
      if (ts.isTypeReferenceNode(n)) {
        const text = opened(n, within);
        if (text !== undefined) return void edits.push({ start: n.getStart(sf), end: n.end, text });
        reach(n.typeName, within);
      } else if (ts.isExpressionWithTypeArguments(n)) reach(n.expression, within);
      else if (ts.isImportTypeNode(n)) throw new Error(`plugin.d.ts: \`${n.getText()}\` in ${sf.fileName}: the generator copies types as written`);
      n.forEachChild(walk);
    };
    walk(node);
    const start = node.getStart(sf, true);
    let text = sf.text.slice(start, node.end);
    for (const e of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, e.start - start) + e.text + text.slice(e.end - start);
    return text;
  };

  /** A name the host imports: its signature only, as `export declare function`. */
  const entryText = (d: ts.FunctionDeclaration): string => {
    const sf = d.getSourceFile();
    if (!d.body || !d.type) throw new Error(`plugin.d.ts: ${d.name?.text} needs a return type and a body`);
    const doc = sf.text.slice(d.getStart(sf, true), d.getStart(sf));
    const signature = sf.text.slice(d.getStart(sf), d.body.getStart(sf)).trim().replace(/^export\s+/, '');
    for (const p of d.parameters) textOf(p, d);
    textOf(d.type, d);
    return binWords.declaredFunction(doc, signature);
  };

  for (const entry of SEAM_ENTRIES) {
    const sf = program.getSourceFile(path.join(ROOT, entry));
    if (!sf) throw new Error(`plugin.d.ts: ${entry} is not in the program`);
    for (const s of sf.statements) {
      if (!ts.canHaveModifiers(s) || !ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      if (ts.isFunctionDeclaration(s) && s.name) found.set(s.name.text, entryText(s));
      else if (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) { seen.add(s); queue.push(s); }
      else throw new Error(`plugin.d.ts: ${entry} exports something the generator does not copy (${ts.SyntaxKind[s.kind]})`);
    }
  }
  for (let d = queue.shift(); d; d = queue.shift()) {
    const name = (d as ts.InterfaceDeclaration).name.text;
    const text = textOf(d, d).replace(/^((?:\/\*\*[\s\S]*?\*\/\s*)?)(?:export\s+)?/, '$1export ');
    if (found.has(name)) throw new Error(`plugin.d.ts: two declarations are named ${name}`);
    found.set(name, text);
  }
  return `${binWords.typesHeader}\n${[...found.keys()].sort().map((k) => found.get(k)).join('\n\n')}\n`;
}

/** The types' hash: the tokens of the declarations, so a comment or a line break moves nothing and a member does. */
export function typesHash(dts: string): string {
  const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, dts);
  const tokens: string[] = [];
  for (let t = scan.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = scan.scan()) tokens.push(scan.getTokenText());
  return createHash('sha256').update(tokens.join(' ')).digest('hex');
}

/** Why the types and the seam version disagree, or null when they do not: the types moved and `seam.ts` was not told. */
export function seamProblem(dts: string): string | null {
  const now = typesHash(dts);
  return now === SEAM_TYPES ? null : binWords.seamBehind(now, SEAM_TYPES, SEAM);
}
