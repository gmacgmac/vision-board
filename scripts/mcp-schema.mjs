// Plain tool schemas for MCP (api.md 47): one schema with every `$ref` inlined, `allOf` folded
// into one object (properties and required added up, `unevaluatedProperties: false` becoming
// `additionalProperties: false`), and `$id`, `$schema`, `$defs`, `$comment`, `discriminator`,
// `example` and `x-*` stripped, so a client that resolves no refs and knows only plain 2020-12
// reads it. `$comment` is where the schemas keep their pointers to our own docs and design notes,
// which an agent must never see. `if`/`then`/`else` is dropped: the flattened schema is a little
// looser than the strict one, and the board server still checks every call with the strict
// schemas. Lossy only toward accepting.
import { lookup } from './openapi-refs.mjs';

const DROP = new Set(['$id', '$schema', '$defs', '$comment', 'discriminator', 'example', 'if', 'then', 'else']);
const MAP_OF_SCHEMAS = new Set(['properties', 'patternProperties', 'dependentSchemas']);
const ONE_SCHEMA = new Set(['items', 'additionalProperties', 'unevaluatedProperties', 'propertyNames', 'contains', 'not', 'unevaluatedItems', 'contentSchema']);
const LIST_OF_SCHEMAS = new Set(['anyOf', 'oneOf', 'prefixItems']);
const ANNOTATIONS = new Set(['title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly']);
const UPPER = new Set(['maximum', 'exclusiveMaximum', 'maxLength', 'maxItems', 'maxProperties']);
const LOWER = new Set(['minimum', 'exclusiveMinimum', 'minLength', 'minItems', 'minProperties']);
const MAX_DEPTH = 40;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `const` already says what an `enum` beside it says. */
function tidy(s) {
  if ('const' in s && Array.isArray(s.enum) && s.enum.some((x) => same(x, s.const))) delete s.enum;
  return s;
}

/** Two schemas that must both hold, folded into one. Bounds take the tighter value, `required`
 * and `properties` add up, a later annotation wins; anything else that differs is an error, so a
 * schema the folding cannot express fails the generator instead of shipping wrong. */
export function merge(a, b, where = '') {
  if (b === true || same(a, b)) return a;
  if (a === true) return b;
  if (a === false || b === false) return false;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!(k in out) || same(out[k], v) || ANNOTATIONS.has(k)) out[k] = v;
    else if (k === 'properties') {
      const props = { ...out.properties };
      for (const [n, s] of Object.entries(v)) props[n] = n in props ? merge(props[n], s, `${where}/${n}`) : s;
      out.properties = props;
    } else if (k === 'required') out.required = [...new Set([...out.required, ...v])];
    else if (UPPER.has(k)) out[k] = Math.min(out[k], v);
    else if (LOWER.has(k)) out[k] = Math.max(out[k], v);
    else if (k === 'enum') out.enum = out.enum.filter((x) => v.some((y) => same(x, y)));
    // Two patterns on one string (non-blank text that is also an agent id): both must match, and
    // one `pattern` cannot say that, so the second rides in a leaf `allOf` (no object is composed).
    else if (k === 'pattern') out.allOf = [...(out.allOf ?? []), { pattern: v }];
    else if (k === 'additionalProperties' && (out[k] === false || v === false)) out[k] = false;
    else if (ONE_SCHEMA.has(k) && isObj(out[k]) && isObj(v)) out[k] = merge(out[k], v, `${where}/${k}`);
    else throw new Error(`cannot fold "${k}" at ${where || '/'}: ${JSON.stringify(out[k])} and ${JSON.stringify(v)}`);
  }
  return tidy(out);
}

/** The keywords of one schema with every subschema flattened and the stripped keys gone. */
function local(own, doc, schemas, depth) {
  const sub = (s) => flatten(s, doc, schemas, depth + 1);
  const out = {};
  for (const [k, v] of Object.entries(own)) {
    if (DROP.has(k) || k.startsWith('x-')) continue;
    if (MAP_OF_SCHEMAS.has(k)) out[k] = Object.fromEntries(Object.entries(v).map(([n, s]) => [n, sub(s)]));
    else if (ONE_SCHEMA.has(k)) out[k] = sub(v);
    else if (LIST_OF_SCHEMAS.has(k)) out[k] = v.map(sub);
    else out[k] = v;
  }
  return out;
}

/** `unevaluatedProperties` becomes `additionalProperties` once nothing is composed any more. A
 * union (`oneOf`/`anyOf`) keeps its branches closed instead, so the closure is left to them. */
function close(s) {
  if (!isObj(s) || !('unevaluatedProperties' in s)) return s;
  const { unevaluatedProperties: closure, ...rest } = s;
  if (rest.oneOf || rest.anyOf || 'additionalProperties' in rest) return rest;
  return { ...rest, additionalProperties: closure };
}

/** A schema as one plain 2020-12 schema: refs inlined, `allOf` folded, the stripped keys gone. */
export function flatten(schema, doc, schemas, depth = 0) {
  if (typeof schema === 'boolean') return schema;
  if (depth > MAX_DEPTH) throw new Error('schema $ref loop');
  const { $ref, allOf = [], ...own } = schema;
  const parts = [];
  if ($ref) {
    const target = lookup($ref, doc, schemas);
    parts.push(flatten(target.schema, target.doc, schemas, depth + 1));
  }
  for (const part of allOf) parts.push(flatten(part, doc, schemas, depth + 1));
  parts.push(local(own, doc, schemas, depth));
  // A field that only an `if`/`then` names is still a known field once the closure moves.
  const conditional = ['then', 'else'].flatMap((k) => (isObj(own[k]?.properties) ? Object.keys(own[k].properties) : []));
  if (conditional.length) parts.push({ properties: Object.fromEntries(conditional.map((n) => [n, {}])) });
  return close(parts.reduce((a, b) => merge(a, b), true));
}
