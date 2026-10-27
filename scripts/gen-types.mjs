// TypeScript types from the one source (api.md 1, 4; cortex-architecture rule 4): every operation's
// input (path and query parameters, and `body`) and output (its success answer), written from
// openapi.json and the schemas it references to packages/format/src/api-types.generated.ts. The
// client's `call` is typed by these, so no caller writes a response type by hand. Pure; run by
// scripts/gen-api.mjs.
//
// The types are a little looser than the schemas, never tighter: `if`/`then`/`else`, `not`,
// patterns and bounds are not types, so the server's ajv check stays the control. A `$ref` to an
// object, a union or a long enum becomes a named type (module-local, so no name can clash with a
// hand-written one beside it); a short leaf is written in place.
import { METHODS, lookup, resolveParam } from './openapi-refs.mjs';

/** What a schema that says nothing about its value accepts: any JSON value (declared in the output). */
const JSON_VALUE = 'JsonValue';
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const SUCCESS = /^2\d\d$/;
const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (k) => (IDENT.test(k) ? k : JSON.stringify(k));
const pascal = (s) => s.replace(/\.schema\.json$/, '').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
/** Object members, one to a line; `indent` lays the lines out by depth once the text is whole. */
const block = (members) => `{\n${members.map((m) => `${m};`).join('\n')}\n}`;
const union = (parts) => [...new Set(parts)].join(' | ') || 'never';
const STRUCTURE = ['properties', 'allOf', 'oneOf', 'anyOf', 'items', 'additionalProperties', '$ref'];

const ANNOTATION = new Set(['$ref', 'title', 'description', '$comment', 'examples', 'example', 'default', 'deprecated']);
/** A schema that only points elsewhere (an OpenAPI component wrapping a file), so the target is named once. */
const isAlias = (s) => isObj(s) && typeof s.$ref === 'string' && Object.keys(s).every((k) => ANNOTATION.has(k));

/** True when a `$ref`'s target is worth a name: structure, an object or array, or a long enum. */
function named(target) {
  if (!isObj(target)) return false;
  if (STRUCTURE.some((k) => k in target)) return true;
  if (target.type === 'object' || target.type === 'array') return true;
  return Array.isArray(target.enum) && target.enum.length > 3;
}

/** A writer for one document's worth of types: `ts(schema, home)` gives a type expression and
 * collects the named types it needs; `declarations()` lists them, in the order first met. */
export function typeWriter(doc, schemas) {
  const names = new Map(); // absolute ref -> name
  const taken = new Set();
  const decls = [];

  /** The absolute form of `ref` read in `home`, so one target has one name. */
  const absolute = (ref, home) => (ref.startsWith('#') && home !== doc && home.$id ? `${home.$id}${ref}` : ref);

  function nameFor(ref) {
    const [base, pointer = ''] = ref.split('#');
    const parts = pointer.split('/').filter(Boolean);
    const last = parts.at(-1);
    const file = base.split('/').filter(Boolean);
    const stem = parts[0] === 'components' ? '' : pascal(file.at(-1) ?? '');
    let name = parts[0] === 'components' ? pascal(last) : `${stem}${last ? pascal(last) : ''}`;
    for (let i = file.length - 2; taken.has(name) && i >= 0; i -= 1) name = `${pascal(file[i])}${name}`;
    for (let n = 2; taken.has(name); n += 1) name = `${name.replace(/\d+$/, '')}${n}`;
    taken.add(name);
    return name;
  }

  function refType(ref, home) {
    const abs = absolute(ref, home);
    const { schema: target, doc: there } = lookup(abs, doc, schemas);
    if (isAlias(target)) return refType(target.$ref, there);
    if (!named(target)) return ts(target, there);
    if (!names.has(abs)) {
      const name = nameFor(abs);
      names.set(abs, name);
      const decl = { name, text: '' };
      decls.push(decl);
      decl.text = ts(target, there);
      // Only rules (if/then) or annotations: no type of its own, so no name either.
      if (decl.text === 'unknown') {
        decls.splice(decls.indexOf(decl), 1);
        names.set(abs, 'unknown');
      }
    }
    return names.get(abs);
  }

  /** An object's own members: its properties, and a map's value type. Undefined when it has none
   * and its shape comes from `allOf`, `oneOf` or a `$ref` beside it. */
  function objectType(s, home) {
    const required = new Set(s.required ?? []);
    const members = Object.entries(s.properties ?? {}).map(([k, v]) => `${key(k)}${required.has(k) ? '' : '?'}: ${ts(v, home)}`);
    const extra = isObj(s.additionalProperties) ? ts(s.additionalProperties, home) : undefined;
    if (extra && !members.length) return `Record<string, ${extra}>`;
    if (extra) return `${block(members)} & { [key: string]: ${extra} }`;
    if (members.length) return block(members);
    // A free object says so; one that only constrains (if/then, required, not) adds no members.
    const free = Object.keys(s).every((k) => k === 'type' || ANNOTATION.has(k));
    return free ? 'Record<string, unknown>' : undefined;
  }

  /** What `const`, `enum`, `type`, `properties` and `items` say, or undefined when they say nothing. */
  function ownType(s, home) {
    if ('const' in s) return JSON.stringify(s.const);
    if (Array.isArray(s.enum)) return union(s.enum.map((v) => JSON.stringify(v)));
    const types = [s.type].flat().filter(Boolean);
    if (!types.length && (isObj(s.properties) || isObj(s.additionalProperties))) types.push('object');
    if (!types.length && s.items !== undefined) types.push('array');
    const parts = types.map((t) => {
      if (t === 'object') return objectType(s, home);
      if (t === 'array') return s.items === undefined ? 'unknown[]' : `${wrap(ts(s.items, home))}[]`;
      return t === 'integer' ? 'number' : t;
    }).filter(Boolean);
    return parts.length ? union(parts) : undefined;
  }

  /** The type of `schema`, read in `home` (the document its relative `$ref`s are in). */
  function ts(schema, home) {
    if (schema === false) return 'never';
    if (schema === true) return JSON_VALUE;
    if (!isObj(schema)) return 'unknown';
    const parts = [];
    if (typeof schema.$ref === 'string') parts.push(refType(schema.$ref, home));
    const own = ownType(schema, home);
    if (own) parts.push(own);
    for (const p of schema.allOf ?? []) parts.push(ts(p, home));
    const alternatives = schema.oneOf ?? schema.anyOf;
    if (alternatives) parts.push(union(alternatives.map((x) => ts(x, home))));
    const kept = [...new Set(parts)].filter((p) => p !== 'unknown' && p !== JSON_VALUE);
    // Nothing but words: any JSON value (everything on the wire is JSON). Only rules: no type at all.
    if (!kept.length) return parts.includes(JSON_VALUE) || Object.keys(schema).every((k) => ANNOTATION.has(k)) ? JSON_VALUE : 'unknown';
    return kept.length === 1 ? kept[0] : kept.map(wrap).join(' & ');
  }

  return { ts, declarations: () => decls };
}

/** `t` in parentheses when a `|` or `&` sits at its top level, so `[]` or `&` binds to all of it. */
export function wrap(t) {
  let depth = 0;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (c === '"') { i += 1; while (i < t.length && t[i] !== '"') i += t[i] === '\\' ? 2 : 1; continue; }
    if ('{([<'.includes(c)) depth += 1;
    else if ('})]>'.includes(c)) depth -= 1;
    else if (depth === 0 && (c === '|' || c === '&')) return `(${t})`;
  }
  return t;
}

/** A response, or the component response its `$ref` names. */
const responseOf = (doc, r) => (r.$ref ? doc.components?.responses?.[r.$ref.replace('#/components/responses/', '')] ?? {} : r);

/** Each operation's input and output type, in document order. */
export function operationTypes(doc, schemas) {
  const w = typeWriter(doc, schemas);
  const rows = [];
  for (const item of Object.values(doc.paths ?? {})) {
    for (const method of METHODS.filter((m) => item[m])) {
      const op = item[method];
      const params = (op.parameters ?? []).map((p) => resolveParam(doc, p)).filter((p) => p.in === 'path' || p.in === 'query');
      const fields = params.map((p) => `${key(p.name)}${p.in === 'path' || p.required ? '' : '?'}: ${w.ts(p.schema ?? {}, doc)}`);
      const body = op.requestBody?.content?.['application/json']?.schema;
      if (body) fields.push(`body${op.requestBody.required ? '' : '?'}: ${w.ts(body, doc)}`);
      const answers = Object.entries(op.responses ?? {}).filter(([status]) => SUCCESS.test(status))
        .map(([, r]) => responseOf(doc, r).content?.['application/json']?.schema).filter(Boolean).map((s) => w.ts(s, doc));
      rows.push({ operationId: op.operationId, input: fields.length ? block(fields) : 'Record<never, never>', output: answers.length ? union(answers) : 'unknown' });
    }
  }
  return { rows, writer: w };
}

/** Lines indented two spaces per open `{`, a line that starts with `}` one less. */
export function indent(text) {
  let depth = 0;
  return text.split('\n').map((line) => {
    const t = line.trim();
    if (t.startsWith('}')) depth -= 1;
    const out = t ? `${'  '.repeat(Math.max(depth, 0))}${t}` : '';
    depth += (t.match(/\{/g) ?? []).length - (t.match(/\}/g) ?? []).length + (t.startsWith('}') ? 1 : 0);
    return out;
  }).join('\n');
}

const PROBLEM = '#/components/schemas/problem';
const POINTER_ERROR = 'https://vision-board.invalid/schema/api/problem.schema.json#/$defs/pointerError';

/** The text of api-types.generated.ts for a document. */
export function renderTypes(doc, schemas) {
  const { rows, writer } = operationTypes(doc, schemas);
  const problem = writer.ts({ $ref: PROBLEM }, doc);
  const pointer = writer.ts({ $ref: POINTER_ERROR }, doc);
  const body = [
    '/** Each operation\'s input (path and query parameters by name, `body` for a JSON body) and its success answer. */',
    'export interface OperationTypes {',
    ...rows.map((r) => `${r.operationId}: {\ninput: ${r.input};\noutput: ${r.output};\n};`),
    '}',
    '',
    'export type OperationInput<Id extends keyof OperationTypes> = OperationTypes[Id][\'input\'];',
    'export type OperationOutput<Id extends keyof OperationTypes> = OperationTypes[Id][\'output\'];',
    '',
    '/** A problem document (RFC 9457) as the server sends it (problem.schema.json). */',
    `export type ProblemDocument = ${problem};`,
    '/** One pointer error of a problem: where in the request body, and what is wrong there. */',
    `export type PointerError = ${pointer};`,
  ];
  const decls = writer.declarations().map((d) => `type ${d.name} = ${d.text};`);
  return `${indent([
    '// GENERATED by scripts/gen-api.mjs (gen-types.mjs) from packages/format/schema/openapi.json. Do not edit; run `npm run gen`.',
    '// verify: long-file generated: one type per operation and per named schema, laid out by the generator',
    '// Every operation\'s input and output type, from the schemas: the client\'s `call` is typed by these,',
    '// so no caller writes a response type by hand. A little looser than the schemas (if/then, patterns and',
    '// bounds are not types); the server checks every call against the schemas themselves.',
    '',
    ...body,
    '',
    '// ---- the named schemas the types above use (module-local) ----',
    '',
    '/** Any JSON value: what a schema that says nothing of its value accepts. */',
    `type ${JSON_VALUE} = null | boolean | number | string | ${JSON_VALUE}[] | { [key: string]: ${JSON_VALUE} };`,
    ...decls,
  ].join('\n'))}\n`;
}
