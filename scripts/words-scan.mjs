// Finds the sentences a person or an agent reads in source text (TypeScript, and Svelte markup),
// for words.test.mjs and for moving text into the words files. A finding is one sentence:
// `parts` and `args` say what it reads (parts[0] + arg0 + parts[1] …), `start`..`end` where it
// stands in the file, and `form` how it stands there: a whole 'literal', a text 'in-template' (a
// markup string), a Svelte 'markup' text or an 'attr' (its value). Rules: scripts/words-text.mjs.
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { SUB, READ_PROPS, TEXT_ATTRS, cook, hasWords, htmlSegments, isCssish, isHtml, isSentence, readsAsWords } from './words-text.mjs';

/** Calls whose text is for a developer: log lines and thrown errors (words.md § What stays in code). */
const DEV_CALL = /^(?:console\.\w+|warn|log|debug|trace|new (?:Type|Range|Syntax)?Error)$/;
const READ_ASSIGN = new Set(['textContent', 'innerText', 'title', 'placeholder', 'ariaLabel', 'alt']);
const COMPARE = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);

/** A flat string of a literal: substitutions as SUB, and where each char and substitution stands. */
function flatten(sf, n, base) {
  const at = (p) => base + p;
  if (!ts.isTemplateExpression(n)) {
    const start = n.getStart(sf) + 1;
    const raw = sf.text.slice(start, n.end - 1);
    return { flat: raw, map: [...raw].map((_, i) => at(start + i)), end: [], args: [], at: [] };
  }
  let flat = '';
  const map = [];
  const end = [];
  const args = [];
  const spots = [];
  const chunk = (lit, tail) => {
    const start = lit.getStart(sf) + 1;
    const raw = sf.text.slice(start, lit.end - (tail ? 1 : 2));
    for (let i = 0; i < raw.length; i++) { flat += raw[i]; map.push(at(start + i)); end.push(0); }
  };
  chunk(n.head, false);
  n.templateSpans.forEach((s, i) => {
    flat += SUB;
    map.push(0);
    end.push(at(s.literal.getStart(sf) + 1));
    args.push(sf.text.slice(s.expression.getStart(sf), s.expression.end));
    spots.push([at(s.expression.getStart(sf)), at(s.expression.end)]);
    chunk(s.literal, i === n.templateSpans.length - 1);
  });
  // The substitution's own start is the `$` before its expression.
  let k = 0;
  n.templateSpans.forEach((s) => { while (flat[k] !== SUB) k++; map[k] = at(s.expression.getStart(sf) - 2); k++; });
  return { flat, map, end, args, at: spots };
}

/** The parts and args a flat range reads. */
function readRange(f, a, b) {
  const parts = [''];
  const args = [];
  const argAt = [];
  let sub = f.flat.slice(0, a).split(SUB).length - 1;
  for (let i = a; i < b; i++) {
    if (f.flat[i] === SUB) { args.push(f.args[sub]); argAt.push(f.at[sub++]); parts.push(''); } else parts[parts.length - 1] += f.flat[i];
  }
  return { parts: parts.map(cook), args, argAt };
}

const callName = (c) => `${ts.isNewExpression(c) ? 'new ' : ''}${c.expression.getText()}`;

/** Is this literal inside a developer-facing call (a log line, a thrown error)? */
function inDevCall(n) {
  for (let p = n.parent; p && !ts.isFunctionLike(p) && !ts.isBlock(p); p = p.parent) {
    if ((ts.isCallExpression(p) || ts.isNewExpression(p)) && DEV_CALL.test(callName(p))) return true;
  }
  return false;
}

/** The place a literal stands in: skipped (an id, a key, a comparison), read (always a sentence), or plain. */
function placeOf(n) {
  const p = n.parent;
  if (ts.isPropertyAssignment(p) && p.name === n) return 'skip';
  if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return 'skip';
  if (ts.isCaseClause(p) || ts.isComputedPropertyName(p) || ts.isEnumMember(p)) return 'skip';
  if (ts.isBinaryExpression(p) && COMPARE.has(p.operatorToken.kind)) return 'skip';
  if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && READ_PROPS.test(p.name.text)) return 'read';
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === n
    && ts.isPropertyAccessExpression(p.left) && READ_ASSIGN.has(p.left.name.text)) return 'read';
  if (ts.isCallExpression(p) && p.expression.getText().endsWith('.setAttribute') && p.arguments[1] === n
    && ts.isStringLiteral(p.arguments[0]) && TEXT_ATTRS.includes(p.arguments[0].text)) return 'read';
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken) return 'glue';
  return 'plain';
}

/** Sentences in TypeScript text; `base` is where the text starts in its file (a Svelte script). */
export function scanTs(code, base = 0) {
  const sf = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = [];
  const add = (f, a, b, form, start, end, quote) => found.push({ ...readRange(f, a, b), form, start, end, quote });
  const literal = (n) => {
    const place = placeOf(n);
    if (place === 'skip' || inDevCall(n)) return;
    const f = flatten(sf, n, base);
    const quote = code[n.getStart(sf)];
    const whole = [base + n.getStart(sf), base + n.end];
    if (isHtml(f.flat)) {
      for (const [a, b] of htmlSegments(f.flat)) {
        const last = f.flat[b - 1] === SUB;
        add(f, a, b, 'in-template', f.map[a], last ? f.end[b - 1] : f.map[b - 1] + 1, quote);
      }
      return;
    }
    const glue = place === 'glue' && /\s/.test(f.flat) && /\p{L}{3,}/u.test(f.flat) && !isCssish(f.flat);
    if (place === 'read' ? readsAsWords(f.flat) : isSentence(f.flat) || glue) add(f, 0, f.flat.length, 'literal', ...whole, quote);
  };
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isTypeNode(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) literal(n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

// ---- Svelte --------------------------------------------------------------------------------------

/** Svelte's own node types; any other typed object in its tree is a JavaScript expression. */
const SVELTE = /^(?:Root|Fragment|Text|Comment|ExpressionTag|HtmlTag|ConstTag|DebugTag|RenderTag|AttachTag|Attribute|SpreadAttribute|[A-Z]\w*Directive|IfBlock|EachBlock|AwaitBlock|KeyBlock|SnippetBlock|RegularElement|Component|SlotElement|TitleElement|Svelte\w+|Script|StyleSheet)$/;

function scanExpression(source, node) {
  const code = source.slice(node.start, node.end);
  const wrapped = `(${code})`;
  const bad = ts.createSourceFile('x.ts', wrapped, ts.ScriptTarget.Latest, true).parseDiagnostics.length;
  return bad ? scanTs(code, node.start) : scanTs(wrapped, node.start - 1);
}

/** Sentences in a Svelte file: its scripts, its expressions, its text and its text attributes. */
export function scanSvelte(source) {
  const ast = parse(source, { modern: true });
  const found = [];
  for (const script of [ast.instance, ast.module]) {
    if (script) found.push(...scanTs(source.slice(script.content.start, script.content.end), script.content.start));
  }
  const run = (nodes) => {
    const text = nodes.map((n) => (n.type === 'Text' ? n.data : SUB)).join('');
    if (!hasWords(text)) return;
    const parts = [''];
    const args = [];
    nodes.forEach((n, i) => {
      if (n.type === 'ExpressionTag') { args.push(source.slice(n.expression.start, n.expression.end)); parts.push(''); return; }
      let d = n.data.replace(/\s+/g, ' ');
      if (i === 0) d = d.trimStart();
      if (i === nodes.length - 1) d = d.trimEnd();
      parts[parts.length - 1] += d;
    });
    const first = nodes[0];
    const last = nodes.at(-1);
    const skipLead = first.type === 'Text' ? first.data.length - first.data.trimStart().length : 0;
    const skipTail = last.type === 'Text' ? last.data.length - last.data.trimEnd().length : 0;
    found.push({ parts, args, form: 'markup', start: first.start + skipLead, end: last.end - skipTail });
  };
  const attribute = (a) => {
    const values = Array.isArray(a.value) ? a.value : [];
    if (!TEXT_ATTRS.includes(a.name) || !values.length) return;
    const text = values.map((n) => (n.type === 'Text' ? n.data : SUB)).join('');
    if (!hasWords(text)) return;
    const parts = [''];
    const args = [];
    for (const n of values) {
      if (n.type === 'ExpressionTag') { args.push(source.slice(n.expression.start, n.expression.end)); parts.push(''); } else parts[parts.length - 1] += n.data;
    }
    found.push({ parts, args, form: 'attr', start: values[0].start - 1, end: values.at(-1).end + 1 });
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type && !SVELTE.test(node.type)) { found.push(...scanExpression(source, node)); return; }
    if (node.type === 'Fragment') {
      let group = [];
      const flush = () => { if (group.length) run(group); group = []; };
      for (const n of node.nodes) {
        if (n.type === 'Text' || n.type === 'ExpressionTag') group.push(n); else { flush(); walk(n); }
      }
      flush();
      node.nodes.filter((n) => n.type === 'ExpressionTag').forEach(walk);
      return;
    }
    if (node.type === 'Attribute') attribute(node);
    for (const [k, v] of Object.entries(node)) if (k !== 'type' && k !== 'metadata' && k !== 'parent' && v && typeof v === 'object') walk(v);
  };
  walk(ast.fragment);
  return found;
}

/** Sentences in one file, with their lines. */
export function scanFile(file, text) {
  const found = file.endsWith('.svelte') ? scanSvelte(text) : scanTs(text);
  return found.map((f) => ({ ...f, line: text.slice(0, f.start).split('\n').length, text: f.parts.reduce((s, p, i) => s + (i ? '${' + f.args[i - 1] + '}' : '') + p, '') }));
}
