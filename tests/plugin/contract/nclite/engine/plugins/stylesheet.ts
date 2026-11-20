import { HOST_PROPERTIES } from '../../shared/plugin-host.ts';
import { PLUGIN_WORDS } from '../words/plugins.ts';

/**
 * A PLUGIN'S STYLESHEET STAYS UNDER ITS OWN SCOPE (`docs/plugins.md` § A guest in the app's page).
 *  Run by the registry over every stylesheet a manifest names, and by the vendoring script before it writes, so
 * a sheet that could restyle the app is refused before a byte of it loads.
 *
 * IT READS TEXT, WITH NO SELECTOR PARSER: one pass (`scan`) blanks comments, keeps strings whole and matches brackets, refusing
 * bytes a browser could read another way; a selector list is split at its top-level commas, and a selector's first compound
 * runs to its first top-level space or combinator. The rules:
 * - between rules there are only rules and at-rules;
 * - each selector of a top-level style rule (or of one inside `@media`, `@supports` or `@container`) holds the scope in its
 *   first compound, as a class `.<scope>` or `.<scope>-…` or an element `<scope>-…`, and no `:is`/`:where`/`:not`/`:has`
 *   there; a rule nested in a style rule is under its parent and is not checked again;
 * - `:root` declares only `--<scope>-*`;
 * - `@property` and `@keyframes` are named `--<scope>-…` and `<scope>-…`; no other at-rule but the three groups above;
 * - no `@import`, and `url()`, `image-set()`, `image()` or `src()` only (and no `var()` or `attr()` inside the last three) of a `data:` address;
 * - no backslash outside a string, which could spell `url(` unseen (the content security policy is what stops a fetch; this
 *   refuses the spellings that would hide one from a reader);
 * - every `var()` reads a host property (`HOST_PROPERTIES`), a `--<scope>-*` one, or one the sheet declares.
 *
 * No rule is waived for any plugin: a sheet passes as written, or the plugin is left out.
 */

export interface StylesheetRules {
	/** The plugin's scope: its manifest's `scope`, else its id (`scopeOf`, `shared/plugin-checks.ts`). */
	scope: string;
}

const S = PLUGIN_WORDS.stylesheet;

/** The most problems one sheet reports; the rest are counted in one more line. */
const MAX_PROBLEMS = 10;

/** The at-rules a sheet may hold: three groups whose rules are checked as the top level's, and two named ones. */
const GROUPS = new Set(['media', 'supports', 'container']);

type Node = { kind: 'statement'; text: string } | { kind: 'block'; prelude: string; body: Node[] };

/** Bytes a reader could take two ways: refused whole, its message the one problem. */
class Refused extends Error {}

/** A `url(` whose address is unquoted. Whitespace here and below is CSS's (space, tab, line feed; the rest are made one at the top), never JS `\s`. */
const URL_OPEN = /url\([ \t\n]*(?![ \t\n"'])/iy;

const CLOSER: Record<string, string> = { '{': '}', '(': ')', '[': ']' };

/**
 * ONE READING of where comments, strings and brackets are, which everything after consumes: `text` with every comment blanked,
 * the same with each string's inside blanked (`code`, where a function name is a function), and where each `{` closes. Bytes a browser could read another way are refused whole, never given a reading of ours:
 * - an unquoted `url(` address, whatever comes before `url(` (an identifier, `#`, `@`), holds no `/*`, quote, `(`, backslash or
 *   line feed, so read as a url or as a function it ends at the same `)` with no comment or string inside;
 * - a string ends at its own quote on its own line: a line feed in it (after a backslash or an escape too) or the sheet's end is refused;
 * - `{`, `(` and `[` close in order with `}`, `)` and `]`;
 * - a backslash outside a string, which could spell `url(` unseen, is refused.
 */
function scan(text: string): { css: string; code: string; closes: Map<number, number> } {
	let css = '';
	let code = '';
	const closers: string[] = [];
	const opens: number[] = [];
	const closes = new Map<number, number>();
	for (let i = 0; i < text.length; i++) {
		const c = text[i]!;
		if ((c === 'u' || c === 'U') && ((URL_OPEN.lastIndex = i), URL_OPEN.test(text))) {
			const close = text.indexOf(')', i);
			const address = text.slice(URL_OPEN.lastIndex, close === -1 ? text.length : close);
			if (/\/\*|["'(\\\n]/.test(address)) throw new Refused(S.url(address.replace(/[ \t\n]+$/, '')));
		}
		if (c === '"' || c === "'") {
			const end = stringEnd(text, i);
			css += text.slice(i, end);
			code += c + ' '.repeat(end - i - 2) + c;
			i = end - 1;
		} else if (c === '/' && text[i + 1] === '*') {
			const close = text.indexOf('*/', i + 2);
			i = close === -1 ? text.length : close + 1;
			css += ' ';
			code += ' ';
		} else if (c === '\\') throw new Refused(S.escape);
		else {
			if (CLOSER[c] !== undefined) {
				closers.push(CLOSER[c]);
				opens.push(css.length);
			} else if (c === '}' || c === ')' || c === ']') {
				if (closers.pop() !== c) throw new Refused(S.unbalanced);
				if (c === '}') closes.set(opens.pop()!, css.length);
				else opens.pop();
			}
			css += c;
			code += c;
		}
	}
	if (closers.length > 0) throw new Refused(S.unbalanced);
	return { css, code, closes };
}

/** The index just past the string that opens at `start`; a line feed or the sheet's end before its quote is refused. */
function stringEnd(text: string, start: number): number {
	for (let i = start + 1; i < text.length && text[i] !== '\n'; i++) {
		if (text[i] === text[start]) return i + 1;
		if (text[i] === '\\' && text[i + 1] !== '\n') i++;
	}
	throw new Refused(S.unbalanced);
}

/** The rules and statements between `start` and `end` of a scanned sheet: a block's prelude and its own nodes, a statement's text. */
function parse(text: string, closes: Map<number, number>, start = 0, end = text.length): Node[] {
	const nodes: Node[] = [];
	let from = start;
	let parens = 0;
	for (let i = start; i < end; i++) {
		const c = text[i]!;
		if (c === '"' || c === "'") i = stringEnd(text, i) - 1;
		else if (c === '(' || c === '[') parens++;
		else if (c === ')' || c === ']') parens--;
		else if (parens > 0) continue;
		else if (c === ';') {
			if (text.slice(from, i).trim() !== '') nodes.push({ kind: 'statement', text: text.slice(from, i).trim() });
			from = i + 1;
		} else if (c === '{') {
			const close = closes.get(i)!;
			nodes.push({ kind: 'block', prelude: text.slice(from, i).trim(), body: parse(text, closes, i + 1, close) });
			i = close;
			from = close + 1;
		}
	}
	if (text.slice(from, end).trim() !== '') nodes.push({ kind: 'statement', text: text.slice(from, end).trim() });
	return nodes;
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
	const whole = splitTop(selector, (c) => /[ \t\n>+~]/.test(c))[0] ?? '';
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

/** What a browser skips before a top-level rule: the `<!--` and `-->` tokens and whitespace. */
const SKIPPED = /^(?:<!--|-->|[ \t\n])+/;

function checkNodes(nodes: Node[], rules: StylesheetRules, nested: boolean, problems: string[]): void {
	const { scope } = rules;
	for (let node of nodes) {
		node = node.kind === 'statement' ? { ...node, text: node.text.replace(SKIPPED, '') } : { ...node, prelude: node.prelude.replace(SKIPPED, '') };
		if (node.kind === 'statement') {
			const at = /^@([\w-]+)/.exec(node.text)?.[1]?.toLowerCase();
			if (at === 'import') problems.push(S.importRule);
			else if (at !== undefined) problems.push(S.atRule(at));
			else if (!nested && node.text !== '') problems.push(S.selector(node.text, scope));
			continue;
		}
		const at = /^@([\w-]+)/.exec(node.prelude)?.[1]?.toLowerCase();
		if (at !== undefined) {
			const name = node.prelude.slice(at.length + 1).trim().split(/[ \t\n]+/)[0] ?? '';
			if (at === 'import') problems.push(S.importRule);
			else if (GROUPS.has(at)) checkNodes(node.body, rules, nested, problems);
			else if (at === 'property') {
				if (!name.startsWith(`--${scope}-`)) problems.push(S.named(at, name, scope));
			} else if (at === 'keyframes') {
				if (!name.startsWith(`${scope}-`)) problems.push(S.named(at, name, scope));
			} else problems.push(S.atRule(at));
			continue;
		}
		const selectors = splitTop(node.prelude, (c) => c === ',').map((s) => s.trim().replace(/[ \t\n]+/g, ' '));
		for (const selector of selectors) if (!nested && !scoped(selector, scope)) problems.push(S.selector(selector, scope));
		if (selectors.includes(':root')) {
			for (const [property] of declarations(node.body)) if (!property.startsWith(`--${scope}-`)) problems.push(S.root(property, scope));
			for (const inner of node.body) if (inner.kind === 'block') problems.push(S.root(inner.prelude, scope));
		}
		checkNodes(node.body.filter((n) => n.kind === 'block'), rules, true, problems);
	}
}

const isData = (address: string): boolean => /^data:/i.test(address);

/**
 * Every `url(…)` address that is not a `data:` one, found in the scan's `code` (so never in a string) whatever precedes `url(`,
 * and read from its `css`.
 */
function urls(css: string, code: string): string[] {
	const found: string[] = [];
	for (const m of code.matchAll(/url\([ \t\n]*/gi)) {
		const i = m.index + m[0].length;
		const close = css.indexOf(')', i);
		const address = css[i] === '"' || css[i] === "'" ? css.slice(i + 1, stringEnd(css, i) - 1) : css.slice(i, close === -1 ? css.length : close).replace(/[ \t\n]+$/, '');
		if (!isData(address)) found.push(address);
	}
	return found;
}

/** Every quoted string inside an `image-set(…)`, `image(…)` or `src(…)`, which take a bare string where `url()` would be; found as `urls` finds. */
function imageSetStrings(css: string, code: string): string[] {
	const found: string[] = [];
	for (const m of code.matchAll(/(?:image-set|image|src)\(/gi)) {
		const start = m.index + m[0].length;
		let i = start;
		for (let depth = 1; i < css.length && depth > 0; i++) {
			if (css[i] === '"' || css[i] === "'") {
				const end = stringEnd(css, i);
				found.push(css.slice(i + 1, end - 1));
				i = end - 1;
			} else depth += css[i] === '(' ? 1 : css[i] === ')' ? -1 : 0;
		}
		const variable = /(?:var|attr)\([^)]*\)?/i.exec(code.slice(start, i));
		if (variable) found.push(variable[0]);
	}
	return found;
}

/** The problems of one stylesheet under `rules`, each naming its rule and what broke it; none is a sheet that passes. */
export function checkStylesheet(text: string, rules: StylesheetRules): string[] {
	const problems: string[] = [];
	try {
		const { css, code, closes } = scan(text.replace(/\r\n?|\f/g, '\n').replace(/\0/g, '�'));
		checkNodes(parse(css, closes), rules, false, problems);
		for (const address of [...urls(css, code), ...imageSetStrings(css, code).filter((a) => !isData(a))]) problems.push(S.url(address));
		const declared = new Set([...css.matchAll(/(?:^|[;{ \t\n(])(--[\w-]+)[ \t\n]*:/g), ...css.matchAll(/@property[ \t\n]+(--[\w-]+)/g)].map((m) => m[1]!));
		const readable = new Set<string>([...HOST_PROPERTIES, ...declared]);
		const unread = new Set<string>();
		for (const m of css.matchAll(/var\([ \t\n]*(--[\w-]+)/gi)) {
			const property = m[1]!;
			if (!readable.has(property) && !property.startsWith(`--${rules.scope}-`) && !unread.has(property)) {
				unread.add(property);
				problems.push(S.variable(property, rules.scope));
			}
		}
	} catch (err) {
		// bytes read two ways, a sheet nested past the stack, or any other fault is no sheet to read: refused, never thrown
		return [err instanceof Refused ? err.message : S.unbalanced];
	}
	return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), S.more(problems.length - MAX_PROBLEMS)] : problems;
}

/** The problems of a plugin's stylesheet `bytes` under its `scope` (`scopeOf`, `shared/plugin-checks.ts`). */
export function checkPluginStylesheet(scope: string, bytes: Uint8Array): string[] {
	return checkStylesheet(Buffer.from(bytes).toString('utf8'), { scope });
}
