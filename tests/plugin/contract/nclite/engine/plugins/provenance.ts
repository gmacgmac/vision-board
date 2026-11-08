import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * `plugins/<id>/provenance.json`: where a vendored folder came from, and the sha256 of EVERY regular file in it but the
 * record itself (`files`, keys sorted): the bundles, the stylesheets, the types, the skill, the words, the manifest
 * (`docs/plugins.md` § How a plugin reaches nclite; journal-plugin DESIGN_01 D11, BE_03). Written by
 * `scripts/plugin-vendor.ts`, checked by the registry (`checkFolder`, `./registry.ts`), which refuses a file the record
 * does not name, one it names that is missing, a hash that differs and anything that is not a regular file (`folderTree`,
 * `./registry.ts`, which walks the folder). A `.DS_Store` is the one name passed over.
 *
 * The older record named five files ({@link LEGACY_HASHES}). The registry refuses it and names the upgrade; only the
 * vendoring script reads those five, to upgrade a record in place while they still hold (`upgradeRecord`).
 */
export interface Provenance {
	id: string;
	repo: string;
	commit: string;
	seam: number;
	builtAt: string;
	/** Every file of the folder but the record, by its path in the folder (`/`-separated), to its sha256. */
	files: Readonly<Record<string, string>>;
}

/** The record's own name, at the folder's root. */
export const PROVENANCE_FILE = 'provenance.json';

/** The one name a folder walk passes over: the Finder's own file. */
export const PASSED_OVER = '.DS_Store';

/** The five hashes the older record held, by the manifest field each hashed; read only to upgrade one. */
export const LEGACY_HASHES = ['engineSha256', 'viewSha256', 'skillSha256', 'wordsSha256', 'manifestSha256'] as const;
export type LegacyHash = (typeof LEGACY_HASHES)[number];

const SHA_RE = /^[0-9a-f]{64}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function sha256Of(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

export function sha256File(path: string): string {
	return sha256Of(readFileSync(path));
}

/** A folder as the record sees it (`folderTree`, `./registry.ts`): every regular file's hash by its path, and every entry that is not a file or a folder. */
export interface FolderTree {
	files: Map<string, string>;
	notPlain: string[];
}

/** The `files` of a record, keys sorted, from a walk. */
export function recordedFiles(files: ReadonlyMap<string, string>): Record<string, string> {
	return Object.fromEntries([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The record's text, as the vendoring script writes it: its fields in one order, tabs, a final newline. */
export function provenanceText(p: Provenance): string {
	const { id, repo, commit, seam, builtAt, files } = p;
	return `${JSON.stringify({ id, repo, commit, seam, builtAt, files: recordedFiles(new Map(Object.entries(files))) }, null, '\t')}\n`;
}

/** A path in the folder as a record may name one: `/`-separated parts, none empty, `.` or `..`. */
const isFolderPath = (path: string): boolean => path.split('/').every((part) => part !== '' && part !== '.' && part !== '..' && !part.includes('\\'));

/** Why a record cannot be read: missing or not JSON, the wrong shape, or the older shape. The caller says it in words. */
export type ProvenanceProblem = 'missing' | 'shape' | 'older';

/** The record, or what is wrong with it. */
export function parseProvenance(text: string): { ok: true; provenance: Provenance } | { ok: false; problem: ProvenanceProblem } {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { ok: false, problem: 'missing' };
	}
	const r = isRecord(raw) ? raw : {};
	const isText = (k: string): boolean => typeof r[k] === 'string' && r[k] !== '';
	const base = isText('id') && isText('repo') && isText('commit') && isText('builtAt') && Number.isInteger(r.seam);
	if (base && r.files === undefined && LEGACY_HASHES.every((k) => SHA_RE.test(String(r[k])))) return { ok: false, problem: 'older' };
	const files = r.files;
	const good = base && isRecord(files) && Object.keys(files).length > 0
		&& Object.entries(files).every(([path, sha]) => isFolderPath(path) && path !== PROVENANCE_FILE && typeof sha === 'string' && SHA_RE.test(sha));
	return good ? { ok: true, provenance: r as unknown as Provenance } : { ok: false, problem: 'shape' };
}

/** What differs between a record's `files` and the folder's walk: one sentence-maker call per path, in path order. */
export function treeProblems(
	recorded: Readonly<Record<string, string>>,
	tree: FolderTree,
	words: { notRecorded(path: string): string; gone(path: string): string; differs(path: string): string; notPlain(path: string): string },
): string[] {
	const problems = tree.notPlain.map((path) => words.notPlain(path));
	const paths = [...new Set([...Object.keys(recorded), ...tree.files.keys()])].sort();
	for (const path of paths) {
		const want = Object.hasOwn(recorded, path) ? recorded[path] : undefined;
		const have = tree.files.get(path);
		if (want === undefined) problems.push(words.notRecorded(path));
		else if (have === undefined) problems.push(words.gone(path));
		else if (have !== want) problems.push(words.differs(path));
	}
	return problems;
}
