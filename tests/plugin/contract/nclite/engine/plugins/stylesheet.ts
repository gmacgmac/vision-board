import { adapterOf } from '../../shared/plugin-adapters.ts';
import { HOST_PROPERTIES } from '../../shared/plugin-host.ts';
import { PLUGIN_WORDS } from '../words/plugins.ts';
import { sha256Of } from './provenance.ts';

/**
 * A PLUGIN'S STYLESHEET STAYS UNDER ITS OWN SCOPE (`docs/plugins.md` § A guest in the app's page; journal-plugin DESIGN_01
 * D13, BE_03). Run by the registry over every stylesheet a manifest names, and by the vendoring script before it writes, so
 * a sheet that could restyle the app is refused before a byte of it loads.
 *
 * IT READS TEXT, WITH NO SELECTOR PARSER: comments go, strings are kept whole, braces are matched, a selector list is split
 * at its top-level commas, and a selector's first compound runs to its first top-level space or combinator. The rules:
 * - each selector of a top-level style rule (or of one inside `@media`, `@supports` or `@container`) holds the scope in its
 *   first compound, as a class `.<scope>` or `.<scope>-…` or an element `<scope>-…`, and no `:is`/`:where`/`:not`/`:has`
 *   there; a rule nested in a style rule is under its parent and is not checked again;
 * - `:root` declares only `--<scope>-*`;
 * - `@property` and `@keyframes` are named `--<scope>-…` and `<scope>-…`; no other at-rule but the three groups above;
 * - no `@import`, and `url()` only of a `data:` address;
 * - every `var()` reads a host property (`HOST_PROPERTIES`), a `--<scope>-*` one, one the sheet declares, or one of `reads`.
 *
 * `waiveSelectors` lifts the first rule alone, for a sheet reviewed against its own guest rules: the board's, by the sha256
 * its adapter names (`css.reviewedSha256`, `shared/plugin-adapters/board.ts`; {@link checkPluginStylesheet}).
 */

export interface StylesheetRules {
	/** The plugin's id, or its adapter's `css.scope`. */
	scope: string;
	/** Properties its own script sets, which the sheet may read. */
	reads?: readonly string[];
	/** True only for a sheet whose bytes were reviewed: the selector rule is not applied. */
	waiveSelectors?: boolean;
}

const S = PLUGIN_WORDS.stylesheet;

/** The most problems one sheet reports; the rest are counted in one more line. */
const MAX_PROBLEMS = 10;

/** The at-rules a sheet may hold: three groups whose rules are checked as the top level's, and two named ones. */
const GROUPS = new Set(['media', 'supports', 'container']);

type Node = { kind: 'statement'; text: string } | { kind: 'block'; prelude: string; body: Node[] };

class Unbalanced extends Error {}

/** `text` with every comment blanked; a comment opener inside a string is the string's. */
function stripComments(text: string): string {
	let out = '';
	for (let i = 0; i < text.length; i++) {
		const c = text[i]!;
		if (c === '"' || c === "'") {
			const end = stringEnd(text, i);
			out += text.slice(i, end);
			i = end - 1;
		} else if (c === '/' && text[i + 1] === '*') {
			const close = text.indexOf('*/', i + 2);
			i = close === -1 ? text.length : close + 1;
			out += ' ';
		} else out += c;
	}
	return out;
}

/** The index just past the string that opens at `start`. */
function stringEnd(text: string, start: number): number {
	const quote = text[start];
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === '\\') i++;
		else if (text[i] === quote || text[i] === '\n') return i + 1;
	}
	return text.length;
}

/** The rules and statements between `start` and `end`: a block's prelude and its own nodes, a statement's text. */
function parse(text: string, start = 0, end = text.length): Node[] {
	const nodes: Node[] = [];
	let from = start;
	let parens = 0;
	for (let i = start; i < end; i++) {
		const c = text[i]!;
		if (c === '"' || c === "'") i = stringEnd(text, i) - 1;
		else if (c === '(' || c === '[') parens++;
		else if (c === ')' || c === ']') parens = Math.max(0, parens - 1);
		else if (parens > 0) continue;
		else if (c === ';') {
			if (text.slice(from, i).trim() !== '') nodes.push({ kind: 'statement', text: text.slice(from, i).trim() });
			from = i + 1;
		} else if (c === '{') {
			const close = matching(text, i, end);
			nodes.push({ kind: 'block', prelude: text.slice(from, i).trim(), body: parse(text, i + 1, close) });
			i = close;
			from = close + 1;
		} else if (c === '}') throw new Unbalanced();
	}
	if (text.slice(from, end).trim() !== '') nodes.push({ kind: 'statement', text: text.slice(from, end).trim() });
	return nodes;
}

/** The `}` that closes the `{` at `open`. */
function matching(text: string, open: number, end: number): number {
	let depth = 0;
	for (let i = open; i < end; i++) {
		const c = text[i]!;
		if (c === '"' || c === "'") i = stringEnd(text, i) - 1;
		else if (c === '{') depth++;
		else if (c === '}' && --depth === 0) return i;
	}
	throw new Unbalanced();
}

/** Splits at top-level `sep` characters (outside parentheses, brackets and strings). */
function splitTop(text: string, at: (c: string) => boolean): string[] {
	const parts: string[] = [];
	let depth = 0;
	let from = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text[i]!;
		if (c === '"' || c === "'") i = stringEnd(text, i) - 1;
		else if (c === '(' || c === '[') depth++;
		else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
		else if (depth === 0 && at(c)) {
			parts.push(text.slice(from, i));
			from = i + 1;
		}
	}
	parts.push(text.slice(from));
	return parts;
}

/** What a selector's first compound holds outside its parentheses and brackets. */
function firstCompound(selector: string): { whole: string; outer: string } {
	const whole = splitTop(selector, (c) => /[\s>+~]/.test(c))[0] ?? '';
	let outer = '';
	let depth = 0;
	for (const c of whole) {
		if (c === '(' || c === '[') depth++;
		if (depth === 0) outer += c;
		if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
	}
	return { whole, outer };
}

function scoped(selector: string, scope: string): boolean {
	if (selector === ':root') return true;
	const { whole, outer } = firstCompound(selector);
	if (/:(?:is|where|not|has)\(/i.test(whole)) return false;
	const mine = (name: string): boolean => name === scope || name.startsWith(`${scope}-`);
	const element = /^([A-Za-z][\w-]*)/.exec(outer)?.[1];
	return (element !== undefined && element.startsWith(`${scope}-`)) || [...outer.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].some((m) => mine(m[1]!));
}

/** The declarations of a rule's own body: `[property, value]`. */
const declarations = (body: Node[]): [string, string][] =>
	body.flatMap((n) => (n.kind === 'statement' && !n.text.startsWith('@') ? [[n.text.split(':')[0]!.trim(), n.text]] as [string, string][] : []));

function checkNodes(nodes: Node[], rules: StylesheetRules, nested: boolean, problems: string[]): void {
	const { scope } = rules;
	for (const node of nodes) {
		if (node.kind === 'statement') {
			const at = /^@([\w-]+)/.exec(node.text)?.[1]?.toLowerCase();
			if (at === 'import') problems.push(S.importRule);
			else if (at !== undefined) problems.push(S.atRule(at));
			continue;
		}
		const at = /^@([\w-]+)/.exec(node.prelude)?.[1]?.toLowerCase();
		if (at !== undefined) {
			const name = node.prelude.slice(at.length + 1).trim().split(/\s+/)[0] ?? '';
			if (at === 'import') problems.push(S.importRule);
			else if (GROUPS.has(at)) checkNodes(node.body, rules, nested, problems);
			else if (at === 'property') {
				if (!name.startsWith(`--${scope}-`)) problems.push(S.named(at, name, scope));
			} else if (at === 'keyframes') {
				if (!name.startsWith(`${scope}-`)) problems.push(S.named(at, name, scope));
			} else problems.push(S.atRule(at));
			continue;
		}
		const selectors = splitTop(node.prelude, (c) => c === ',').map((s) => s.trim().replace(/\s+/g, ' '));
		if (!nested && !rules.waiveSelectors) for (const selector of selectors) if (!scoped(selector, scope)) problems.push(S.selector(selector, scope));
		if (selectors.includes(':root')) {
			for (const [property] of declarations(node.body)) if (!property.startsWith(`--${scope}-`)) problems.push(S.root(property, scope));
		}
		checkNodes(node.body.filter((n) => n.kind === 'block'), rules, true, problems);
	}
}

/** Every `url(…)` address in `text`, quoted or not. */
function urls(text: string): string[] {
	const found: string[] = [];
	for (const m of text.matchAll(/(?<![\w-])url\(\s*/gi)) {
		let i = m.index + m[0].length;
		if (text[i] === '"' || text[i] === "'") {
			const end = stringEnd(text, i);
			found.push(text.slice(i + 1, end - 1));
			i = end;
		} else {
			const close = text.indexOf(')', i);
			found.push(text.slice(i, close === -1 ? text.length : close).trim());
		}
	}
	return found;
}

/** The problems of one stylesheet under `rules`, each naming its rule and what broke it; none is a sheet that passes. */
export function checkStylesheet(text: string, rules: StylesheetRules): string[] {
	const css = stripComments(text);
	let nodes: Node[];
	try {
		nodes = parse(css);
	} catch (err) {
		if (err instanceof Unbalanced) return [S.unbalanced];
		throw err;
	}
	const problems: string[] = [];
	checkNodes(nodes, rules, false, problems);
	for (const address of urls(css.replace(/@import\b[^;]*;?/gi, ''))) if (!/^data:/i.test(address)) problems.push(S.url(address));
	const declared = new Set([...css.matchAll(/(?:^|[;{\s(])(--[\w-]+)\s*:/g), ...css.matchAll(/@property\s+(--[\w-]+)/g)].map((m) => m[1]!));
	const readable = new Set<string>([...HOST_PROPERTIES, ...(rules.reads ?? []), ...declared]);
	const unread = new Set<string>();
	for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
		const property = m[1]!;
		if (!readable.has(property) && !property.startsWith(`--${rules.scope}-`) && !unread.has(property)) {
			unread.add(property);
			problems.push(S.variable(property, rules.scope));
		}
	}
	return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), S.more(problems.length - MAX_PROBLEMS)] : problems;
}

/**
 * The problems of plugin `id`'s stylesheet `bytes`, under the rules its adapter gives (scope, reads, and the selector rule
 * waived when the bytes are the ones it reviewed), else its id with no reads and no waiver.
 */
export function checkPluginStylesheet(id: string, bytes: Uint8Array): string[] {
	const css = adapterOf(id)?.css;
	const waiveSelectors = css?.reviewedSha256 !== undefined && css.reviewedSha256 === sha256Of(bytes);
	return checkStylesheet(Buffer.from(bytes).toString('utf8'), { scope: css?.scope ?? id, reads: css?.reads ?? [], waiveSelectors });
}
