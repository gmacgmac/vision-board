// The server's own check of a tool call's arguments (api.md 47): a small validator over the
// flattened schemas in tools.generated.json (types, required, enum and const, bounds, patterns,
// closed objects, and unions by trying each branch). It catches the plain mistakes before any
// request, in words an agent can act on; the board server still checks every call strictly.
// Some models send an object or list argument as JSON text, so that is parsed when the schema
// wants an object or list. Lengths count code points, like the board server (api.md 10).
import type { JsonSchema } from './tools.ts';
import { isRecord } from './rpc.ts';
import * as checkArgsWords from './words/check-args.ts';

export interface Checked {
  /** The arguments, with any JSON text that stood for an object or list parsed. */
  readonly value: unknown;
  /** One line per problem, each naming where (a JSON Pointer into the arguments) and what. */
  readonly problems: readonly string[];
}

type Schema = Readonly<Record<string, unknown>>;

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v;

const fits = (v: unknown, type: string): boolean => {
  const t = typeOf(v);
  return t === type || (type === 'number' && t === 'integer');
};

const show = (v: unknown): string => JSON.stringify(v);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const place = (at: string): string => at || checkArgsWords.theArguments;

/** JSON text that stands for an object or a list, when the schema wants one. */
function coerce(s: Schema, v: unknown): unknown {
  if (typeof v !== 'string' || (s.type !== 'object' && s.type !== 'array')) return v;
  try {
    const parsed: unknown = JSON.parse(v);
    return fits(parsed, s.type) ? parsed : v;
  } catch { return v; }
}

function checkString(s: Schema, v: string, at: string, out: string[]): void {
  const length = [...v].length;
  if (typeof s.minLength === 'number' && length < s.minLength) out.push(checkArgsWords.mustBeAtLeastCharacters(place(at), s.minLength));
  if (typeof s.maxLength === 'number' && length > s.maxLength) out.push(checkArgsWords.mustBeAtMostCharacters(place(at), s.maxLength));
  if (typeof s.pattern === 'string' && !new RegExp(s.pattern, 'u').test(v)) {
    out.push(s.pattern === '\\S' ? checkArgsWords.mustNotBeBlank(place(at)) : checkArgsWords.mustMatch(place(at), s.pattern));
  }
}

function checkNumber(s: Schema, v: number, at: string, out: string[]): void {
  if (typeof s.minimum === 'number' && v < s.minimum) out.push(checkArgsWords.mustBeAtLeast(place(at), s.minimum));
  if (typeof s.maximum === 'number' && v > s.maximum) out.push(checkArgsWords.mustBeAtMost(place(at), s.maximum));
  if (typeof s.exclusiveMinimum === 'number' && v <= s.exclusiveMinimum) out.push(checkArgsWords.mustBeMoreThan(place(at), s.exclusiveMinimum));
  if (typeof s.exclusiveMaximum === 'number' && v >= s.exclusiveMaximum) out.push(checkArgsWords.mustBeLessThan(place(at), s.exclusiveMaximum));
}

function checkArray(s: Schema, v: readonly unknown[], at: string, out: string[]): unknown[] {
  if (typeof s.minItems === 'number' && v.length < s.minItems) out.push(checkArgsWords.needsAtLeastEntries(place(at), s.minItems));
  if (typeof s.maxItems === 'number' && v.length > s.maxItems) out.push(checkArgsWords.takesAtMostEntries(place(at), s.maxItems));
  const items = s.items as JsonSchema | undefined;
  return items === undefined ? [...v] : v.map((x, i) => check(items, x, `${at}/${i}`, out));
}

function checkObject(s: Schema, v: Readonly<Record<string, unknown>>, at: string, out: string[]): Record<string, unknown> {
  const properties = (isRecord(s.properties) ? s.properties : {}) as Record<string, JsonSchema>;
  for (const name of Array.isArray(s.required) ? s.required as string[] : []) {
    if (v[name] === undefined) out.push(checkArgsWords.isRequired(at, name));
  }
  const value: Record<string, unknown> = {};
  for (const [name, x] of Object.entries(v)) {
    const own = properties[name];
    if (own !== undefined) value[name] = check(own, x, `${at}/${name}`, out);
    else if (s.additionalProperties === false) { out.push(checkArgsWords.isNotAFieldHere(at, name)); value[name] = x; }
    else value[name] = s.additionalProperties === undefined ? x : check(s.additionalProperties as JsonSchema, x, `${at}/${name}`, out);
  }
  return value;
}

/** A union: the first branch that fits wins. When none does, an object whose `type` names a
 * branch gets that branch's problems; anything else gets one line. */
function checkUnion(branches: readonly JsonSchema[], v: unknown, at: string, out: string[]): unknown {
  const tries = branches.map((b) => { const problems: string[] = []; return { b, problems, value: check(b, v, at, problems) }; });
  const fit = tries.find((t) => t.problems.length === 0);
  if (fit) return fit.value;
  const typeConst = (b: JsonSchema) => (typeof b === 'object' && isRecord(b.properties) && isRecord(b.properties.type) ? b.properties.type.const : undefined);
  const named = isRecord(v) ? tries.find((t) => typeConst(t.b) !== undefined && same(typeConst(t.b), v.type)) : undefined;
  if (named) { out.push(...named.problems); return v; }
  const kinds = branches.map(typeConst).filter((k) => k !== undefined);
  out.push(kinds.length && isRecord(v) ? checkArgsWords.typeMustBeOneOf(at, kinds.map(show).join(', ')) : checkArgsWords.doesNotMatchAnyForm(place(at)));
  return v;
}

function check(schema: JsonSchema, v: unknown, at: string, out: string[]): unknown {
  if (schema === true) return v;
  if (schema === false) { out.push(checkArgsWords.isNotAllowed(place(at))); return v; }
  const s = schema as Schema;
  let value = coerce(s, v);
  if ('const' in s && !same(value, s.const)) { out.push(checkArgsWords.mustBe(place(at), show(s.const))); return value; }
  if (Array.isArray(s.enum) && !s.enum.some((e) => same(e, value))) { out.push(checkArgsWords.mustBeOneOf(place(at), s.enum.map(show).join(', '))); return value; }
  const types = s.type === undefined ? [] : (Array.isArray(s.type) ? s.type : [s.type]) as string[];
  if (types.length && !types.some((t) => fits(value, t))) { out.push(checkArgsWords.mustBeNot(place(at), types.join(' or '), typeOf(value))); return value; }
  if (typeof value === 'string') checkString(s, value, at, out);
  if (typeof value === 'number') checkNumber(s, value, at, out);
  if (Array.isArray(value)) value = checkArray(s, value, at, out);
  else if (isRecord(value)) value = checkObject(s, value, at, out);
  for (const part of Array.isArray(s.allOf) ? s.allOf as JsonSchema[] : []) value = check(part, value, at, out);
  for (const key of ['anyOf', 'oneOf']) if (Array.isArray(s[key])) value = checkUnion(s[key] as JsonSchema[], value, at, out);
  return value;
}

/** Check a tool call's arguments against the tool's input schema. */
export function checkArgs(schema: JsonSchema, args: unknown): Checked {
  const problems: string[] = [];
  const value = check(schema, args, '', problems);
  return { value, problems };
}
