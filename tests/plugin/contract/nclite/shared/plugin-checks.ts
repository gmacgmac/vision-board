import { CHANGE_LIMITS, CHANGE_META, REF_LIMITS, type Ref, type RefValue, type StoredChange } from './plugin-host.ts';

/**
 * THE CONTRACT'S CHECKS, ONE COPY FOR BOTH TREES (`docs/plugins.md` § The contract, "Validation lives beside it"). The
 * contract (`./plugin-host.ts`) holds the shapes and their bounds; this file holds the code that holds a value to them,
 * where it enters: the engine at the run door and the child's watch line, the app as it reads a stored change line or
 * a sent chip's ref.
 *
 * EVERY CHECK ANSWERS A FRESH COPY OR NULL. A value outside a bound is dropped, never trimmed, and nothing a plugin added
 * beside the named fields rides along. This file imports only the contract and names no plugin.
 */

const KEY = new RegExp(REF_LIMITS.keyPattern);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isShort = (value: unknown): value is string => typeof value === 'string' && value.length <= REF_LIMITS.maxString;
const isWhole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

/** One value of a ref, copied, or undefined when it is outside the bounds. */
function refValue(value: unknown): RefValue | undefined {
	if (isShort(value) || isWhole(value) || typeof value === 'boolean') return value;
	if (!Array.isArray(value) || value.length > REF_LIMITS.maxItems) return undefined;
	return value.every((item) => isShort(item) || isWhole(item)) ? [...(value as (string | number)[])] : undefined;
}

/** `value` as a {@link Ref} within {@link REF_LIMITS}, its keys in their order, or null. `{}` is a ref (a catch-up). */
export function checkRef(value: unknown): Ref | null {
	if (!isRecord(value)) return null;
	const keys = Object.keys(value);
	if (keys.length > REF_LIMITS.maxKeys) return null;
	const ref: Record<string, RefValue> = {};
	for (const key of keys) {
		const copied = KEY.test(key) ? refValue(value[key]) : undefined;
		if (copied === undefined) return null;
		ref[key] = copied;
	}
	return JSON.stringify(ref).length <= REF_LIMITS.maxChars ? ref : null;
}

/**
 * A plugin id: a lowercase letter, then 1 to 30 lowercase letters, digits and hyphens; never an underscore, so a wire name
 * `<id>_<tool>` splits at its first one. The one home of the rule: the manifest check (`checkManifest`,
 * `engine/plugins/manifest.ts`) and a stored change's reader ({@link readStoredChange}) both hold it.
 */
export const PLUGIN_ID = /^[a-z][a-z0-9-]{1,30}$/;

/**
 * An agent id, the contract's `Caller` id: 1 to 64 letters, digits, `_` and `-`. The one home of the rule: the bot's derived
 * id is one (`pluginAgent`), a registration's answer is kept only when it is one (`ensurePluginAgent`,
 * `engine/store/plugin-agents.ts`), and `PluginEngineHost.callTool` (`engine/plugins/host.ts`) refuses any other.
 */
export const AGENT_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Any control (`Cc`: C0, DEL, C1) or format (`Cf`: bidi overrides and isolates, zero-width marks, a soft hyphen) character. */
const CONTROL = /[\p{Cc}\p{Cf}]/u;

const isCount = (value: unknown): value is number => isWhole(value) && value >= 0 && value <= CHANGE_LIMITS.maxCount;
const isSubject = (value: unknown): value is string => typeof value === 'string' && value.length <= CHANGE_LIMITS.subjectChars && !CONTROL.test(value);

/** The fields of a change, checked: `words` a key of `plugin`'s, a count, a subject, and a reveal that is a ref. */
function changeFields(plugin: string, raw: Record<string, unknown>): Omit<StoredChange, 'v' | 'plugin'> | null {
	const { words, count, subject, reveal } = raw;
	if (typeof words !== 'string' || !words.startsWith(`${plugin}.`) || !isCount(count) || !isSubject(subject)) return null;
	if (reveal === undefined) return { words, count, subject };
	const ref = checkRef(reveal);
	return ref === null ? null : { words, count, subject, reveal: ref };
}

/**
 * The `plugin_change` body the run door stores for a tool result's `_meta`, or null when it names no change or one outside
 * the bounds: {@link CHANGE_META} holding a `ChangeMeta` whose `words` is one of `changeWords` (the manifest's) and starts
 * `<plugin>.`. `plugin` is the route's, never the meta's. The body is the `StoredChange` JSON, `v` first, then `plugin`,
 * then the meta's own fields in the contract's order (`CHANGE_EXAMPLES`, `./plugin-host.ts`).
 */
export function storedChangeOf(plugin: string, meta: Readonly<Record<string, unknown>> | undefined, changeWords: readonly string[]): string | null {
	const raw = meta?.[CHANGE_META];
	if (!isRecord(raw) || !changeWords.includes(raw.words as string)) return null;
	const fields = changeFields(plugin, raw);
	return fields === null ? null : JSON.stringify({ v: 2, plugin, ...fields } satisfies StoredChange);
}

/**
 * A stored `plugin_change` body (the text, or the value parsed from it) read back as the contract's {@link StoredChange},
 * or null for one of another shape: a body in a plugin's own older shape is its stored-shape reader's
 * (`LEGACY_CHANGES`, `./plugin-legacy.ts`). The engine checked it when it stored it; a reader of stored data checks again.
 */
export function readStoredChange(body: unknown): StoredChange | null {
	let raw = body;
	if (typeof body === 'string') {
		try {
			raw = JSON.parse(body) as unknown;
		} catch {
			return null;
		}
	}
	if (!isRecord(raw) || raw.v !== 2 || typeof raw.plugin !== 'string' || !PLUGIN_ID.test(raw.plugin)) return null;
	const fields = changeFields(raw.plugin, raw);
	return fields === null ? null : { v: 2, plugin: raw.plugin, ...fields };
}

/** A change's words with `{count}` and `{subject}` filled, in one pass, so a subject that holds `{count}` stays as written. */
export function changeText(text: string, change: Pick<StoredChange, 'count' | 'subject'>): string {
	return text.replace(/\{(count|subject)\}/g, (_, name: string) => (name === 'count' ? String(change.count) : change.subject));
}
