// The ledger's JSON Schemas through ajv (D-026, api.md 12): the only module that imports ajv. It
// loads every `*.schema.json` of the format and the chat package's own contract (api.md 98, format-files.ts)
// by its `$id`, compiles with Ajv2020
// (strict mode, all errors, the discriminator), and turns ajv's errors into plain-English
// problems with a JSON Pointer each (api.md 38, 40). Server and tests only: the page never
// imports it, so ajv never reaches the page bundle (rule 15).
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv/dist/2020.js';
import { LEDGER_FORMAT } from '#format';
import { allSchemaFiles } from './format-files.ts';
import * as schemaWords from './words/schema.ts';

/** Every schema `$id` starts here; `.invalid` is never fetched (api.md 5). */
export const SCHEMA_BASE = 'https://vision-board.invalid/';
/** The ledger's schemas, at the format's version (`LEDGER_FORMAT`): `…/schema/ledger/<version>/`. */
export const LEDGER_SCHEMA_BASE = `${SCHEMA_BASE}schema/ledger/${LEDGER_FORMAT}/`;
export const LEDGER_EVENT_ID = `${LEDGER_SCHEMA_BASE}ledger-event.schema.json`;
export const CHAT_EVENT_ID = `${SCHEMA_BASE}schema/chat/1/chat-event.schema.json`;

/** One problem: where (a JSON Pointer into the value) and what to do about it. */
export interface SchemaProblem { pointer: string; detail: string }

let shared: Ajv2020 | undefined;
/** Every schema by its `$id`, for the words a schema gives a field it refuses (`removedWords`). */
const byId = new Map<string, unknown>();

/** One ajv instance holding every schema, created on first use. */
function ajv(): Ajv2020 {
  if (shared) return shared;
  for (const { schema } of allSchemaFiles()) byId.set(schema.$id, schema);
  // Strict mode, every rule an error, except strictRequired: the three layers of api.md 6 name a
  // field in `required` beside the `allOf` branch that defines it (the stamp, the core), and
  // strictRequired only looks at the same schema object.
  const a = new Ajv2020({ strict: true, strictRequired: false, allErrors: true, discriminator: true });
  for (const { schema } of allSchemaFiles()) a.addSchema(schema);
  return (shared = a);
}

/** The compiled validator for the schema (or `$defs` path) with this `$id`. Throws if unknown. */
export function compileSchema(id: string): ValidateFunction {
  const validate = ajv().getSchema(id);
  if (!validate) throw new Error(`no schema with $id ${id}`);
  return validate;
}

/** Every problem with `value` against schema `id`. Empty means valid. */
export function schemaProblems(id: string, value: unknown): SchemaProblem[] {
  const validate = compileSchema(id);
  return validate(value) ? [] : plainProblems(validate.errors ?? []);
}

/** A check for the JSON Schemas an app's tools give (D-047 ruling 6, apps.md § The tools module):
 * one ajv instance per call, so no `$id` can clash with the board's schemas or another app's; not
 * strict, so a keyword or format the board doesn't know is ignored rather than refused; no `$ref`
 * outside the schema; a top-level `$schema` (often draft-07's) is not read. `compile` throws, in
 * ajv's words, when a schema can't be used; a check gives problems as plain as the board's own. */
export function foreignSchemas(): (schema: Record<string, unknown>) => (value: unknown) => SchemaProblem[] {
  const a = new Ajv2020({ strict: false, allErrors: true, logger: false, addUsedSchema: false });
  return ({ $schema: _ignored, ...schema }) => {
    const validate = a.compile(schema);
    return (value) => (validate(value) ? [] : plainProblems(validate.errors ?? [], schemaWords.doesNotFitAnyOf));
  };
}

/** Every problem with one ledger line (its text) against the stored-line schema. */
export function ledgerLineProblems(line: string): SchemaProblem[] {
  let value: unknown;
  try { value = JSON.parse(line); } catch { return [{ pointer: '', detail: schemaWords.theLineIsNotJSON }]; }
  return schemaProblems(LEDGER_EVENT_ID, value);
}

// ---- ajv errors as plain English (no ajv wording leaks) ----

/** RFC 6901: `~` and `/` inside a key are escaped. */
const escape = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');
const child = (pointer: string, key: string) => `${pointer}/${escape(key)}`;
/** The field a pointer ends at, for messages: `/node/title` -> `title`. */
const fieldOf = (pointer: string) => {
  const last = pointer.split('/').pop() ?? '';
  return last ? last.replace(/~1/g, '/').replace(/~0/g, '~') : schemaWords.theEvent;
};

const PATTERNS: Record<string, string> = {
  '^[a-z0-9][a-z0-9-]{0,63}$': schemaWords.isNotAValidId,
  // A ledger's name (project.schema.json `ledgerName`, data-folder.ts `ledgerNameProblem`).
  '^[a-z0-9][a-z0-9-]{0,39}$': schemaWords.isNotALedgerName,
  '^a-[a-z0-9]{8}$': schemaWords.isNotAnAgentId,
  '\\S': schemaWords.mustNotBeBlank,
  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?Z$': schemaWords.isNotAUTCTimestamp,
  // The app contract's patterns (schema/app/manifest.schema.json, common.schema.json `appHash`).
  '^[0-9a-f]{64}$': schemaWords.isNotAnAppS,
  '^(?!.*\\.\\.)[A-Za-z0-9_][A-Za-z0-9._-]{0,94}\\.html$': 'must be a file name ending in .html, directly in the app\'s folder: letters, digits, dots, hyphens and _, up to 100, not starting with a dot or hyphen, no two dots in a row',
  '^(?!.*\\.\\.)[A-Za-z0-9_][A-Za-z0-9._-]{0,94}\\.mjs$': 'must be a file name ending in .mjs, directly in the app\'s folder: letters, digits, dots, hyphens and _, up to 99, not starting with a dot or hyphen, no two dots in a row',
  '^[A-Z_][A-Z0-9_]{0,63}$': 'is not a .env key: upper-case letters, digits and _',
  '^https://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+(:[0-9]{1,5})?$': schemaWords.isNotAnHttpsOrigin,
  '^[a-z][a-z0-9_]{0,39}$': schemaWords.isNotAToolName,
  '^\\S{1,40}$': schemaWords.isNotAVersionUp,
};

const TYPES: Record<string, string> = {
  integer: schemaWords.aWholeNumber, number: 'a number', string: 'text', boolean: schemaWords.trueOrFalse,
  object: schemaWords.anObject, array: 'a list', null: 'null',
};

const quote = (v: unknown) => JSON.stringify(v);

/** The `description` beside a `not: {}`, a field a format took away (api.md 118): its schema path
 * names the `$id` and the pointer to the `not`; the words say what replaced the field. */
function removedWords(schemaPath: string): string | undefined {
  const [id, pointer = ''] = schemaPath.split('#');
  const keys = pointer.split('/').slice(1, -1).map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
  const at = keys.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), byId.get(id!));
  const words = at && typeof at === 'object' ? (at as Record<string, unknown>).description : undefined;
  return typeof words === 'string' ? words : undefined;
}

/** What a failed `anyOf` says: in the board's own schemas, the one `anyOf` names a card. */
const CARD_ANY_OF = schemaWords.mustBeANodeNumber;

/** One plain-English problem for one ajv error. */
function plain(e: ErrorObject, anyOf: string): SchemaProblem {
  const p = e.params as Record<string, unknown>;
  const at = e.instancePath;
  const f = `\`${fieldOf(at)}\``;
  switch (e.keyword) {
    case 'required': {
      const missing = String(p.missingProperty);
      return { pointer: child(at, missing), detail: schemaWords.isRequired(missing) };
    }
    case 'unevaluatedProperties': case 'additionalProperties': {
      const extra = String(p.unevaluatedProperty ?? p.additionalProperty);
      return { pointer: child(at, extra), detail: schemaWords.unknownField(extra) };
    }
    case 'discriminator': {
      // `type` for a ledger line; `kind` for a chat event or approval facts.
      const tag = String(p.tag ?? 'type');
      const what = tag === 'type' ? schemaWords.eventType : tag;
      return {
        pointer: child(at, tag),
        detail: p.error === 'mapping' ? schemaWords.unknown(what, quote(p.tagValue)) : schemaWords.mustBeTextNamingThe(tag, what),
      };
    }
    case 'type': return { pointer: at, detail: schemaWords.mustBe(f, String(p.type).split(',').map((t) => TYPES[t] ?? t).join(' or ')) };
    case 'pattern': return { pointer: at, detail: `${f} ${PATTERNS[String(p.pattern)] ?? schemaWords.isNotInTheExpected}` };
    case 'maxLength': return { pointer: at, detail: schemaWords.isLongerThanCharacters(f, String(p.limit)) };
    case 'minLength': return { pointer: at, detail: schemaWords.isShorterThanCharacters(f, String(p.limit)) };
    case 'maximum': return { pointer: at, detail: schemaWords.mustBeAtMost(f, String(p.limit)) };
    case 'minimum': return { pointer: at, detail: schemaWords.mustBeAtLeast(f, String(p.limit)) };
    case 'maxItems': return { pointer: at, detail: schemaWords.hasMoreThanEntries(f, String(p.limit)) };
    case 'minItems': return { pointer: at, detail: schemaWords.needsAtLeast(f, String(p.limit), p.limit === 1 ? 'entry' : 'entries') };
    case 'uniqueItems': return { pointer: at, detail: schemaWords.namesTheSameEntryTwice(f) };
    case 'enum': return { pointer: at, detail: schemaWords.mustBeOneOf(f, (p.allowedValues as unknown[]).map(String).join(', ')) };
    case 'const': return { pointer: at, detail: schemaWords.mustBeHere(f, quote(p.allowedValue)) };
    case 'false schema': return { pointer: at, detail: schemaWords.isNotAllowedHere(f) };
    case 'not': {
      const words = removedWords(e.schemaPath);
      return { pointer: at, detail: words ? schemaWords.isNotAllowedHere2(f, words) : schemaWords.isNotValid(f) };
    }
    case 'anyOf': return { pointer: at, detail: `${f} ${anyOf}` };
    default: return { pointer: at, detail: schemaWords.isNotValid(f) };
  }
}

/** ajv's errors as problems, one per error, minus ajv's bookkeeping: an `if` error only says its
 * `then` failed (that failure is reported itself), and the branches of a failed `anyOf` are
 * folded into its one message (`anyOfWords`). Exact repeats (a field checked by two rules that
 * both say "text") are reported once. */
export function plainProblems(errors: readonly ErrorObject[], anyOfWords = CARD_ANY_OF): SchemaProblem[] {
  const anyOf = errors.filter((e) => e.keyword === 'anyOf');
  const inAnyOf = (e: ErrorObject) => e.keyword !== 'anyOf' &&
    anyOf.some((a) => e.instancePath === a.instancePath || e.instancePath.startsWith(`${a.instancePath}/`));
  const seen = new Set<string>();
  const out: SchemaProblem[] = [];
  for (const e of errors) {
    if (e.keyword === 'if' || inAnyOf(e)) continue;
    const problem = plain(e, anyOfWords);
    const id = `${problem.pointer}\n${problem.detail}`;
    if (!seen.has(id)) { seen.add(id); out.push(problem); }
  }
  return out;
}
