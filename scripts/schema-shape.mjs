// Reading a JSON Schema the way the generators need (api.md 5): `$ref` and `allOf` folded into one
// shape, the type a `vb` flag is parsed as, and an operation's inputs. Pure; shared by gen-api.mjs
// and gen-reference.mjs.
import { lookup, resolveParam } from './openapi-refs.mjs';

/** A schema with its `$ref` and `allOf` folded in: own keywords win, properties and required add up.
 * `properties` maps each name to `{ schema, doc }` so a property can be read in its own document. */
export function shape(schema, doc, schemas, depth = 0) {
  if (depth > 20) throw new Error('schema $ref loop');
  const { $ref, allOf = [], ...own } = schema;
  const base = $ref ? (({ schema: s, doc: d }) => shape(s, d, schemas, depth + 1))(lookup($ref, doc, schemas)) : {};
  const properties = { ...base.properties };
  const required = [...(base.required ?? [])];
  for (const part of allOf) {
    const folded = shape(part, doc, schemas, depth + 1);
    Object.assign(properties, folded.properties);
    required.push(...(folded.required ?? []));
  }
  for (const [name, prop] of Object.entries(own.properties ?? {})) properties[name] = { schema: prop, doc };
  required.push(...(own.required ?? []));
  return { ...base, ...own, properties, required: [...new Set(required)] };
}

/** The type a flag is parsed as: `string`, `integer`, `number`, `boolean`, or `json` for anything else. */
export function inputType(schema, doc, schemas) {
  const s = shape(schema, doc, schemas);
  if (Array.isArray(s.enum)) return s.enum.every((v) => typeof v === 'string') ? 'string' : 'json';
  return ['string', 'integer', 'number', 'boolean'].includes(s.type) ? s.type : 'json';
}

/** The inputs of an operation with the schema each came from (`schema`, read in `home`): path, then
 * query, then the top-level properties of a JSON body. A flag name must be unique, so a repeat
 * throws, unless `allowRepeat` (the reference lists both). */
export function inputSources(id, op, doc, schemas, allowRepeat = false) {
  const params = (op.parameters ?? []).map((p) => resolveParam(doc, p));
  const input = (name, where, schema, home, required, description) => ({
    name, in: where, schema, home, required, description: description ?? shape(schema, home, schemas).description ?? '',
  });
  const out = ['path', 'query'].flatMap((where) => params.filter((p) => p.in === where)
    .map((p) => input(p.name, where, p.schema ?? {}, doc, where === 'path' || p.required === true, p.description)));
  const body = op.requestBody?.content?.['application/json']?.schema;
  if (body) {
    const folded = shape(body, doc, schemas);
    for (const [name, prop] of Object.entries(folded.properties)) {
      out.push(input(name, 'body', prop.schema, prop.doc, folded.required.includes(name), undefined));
    }
  }
  const names = out.map((i) => i.name);
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice && !allowRepeat) throw new Error(`${id}: input "${twice}" is named twice; a flag name must be unique`);
  return out;
}

/** The inputs of an operation as `vb` flags: name, where, flag type, required, description. */
export function inputsOf(id, op, doc, schemas) {
  return inputSources(id, op, doc, schemas).map((i) => ({
    name: i.name, in: i.in, type: inputType(i.schema, i.home, schemas), required: i.required, description: i.description,
  }));
}
