// The API reference (api.md 1, 55): docs/specification/api-reference.md, rendered from
// openapi.json so the human-readable reference can never drift from the contract. One section per
// operation, in route-table order: its names, who may call it, what it does, its inputs, the
// fields of its success answer, every error, and the spec's own examples. Pure; gen-api.mjs
// writes the file and `--check` compares it.
import { lookup } from './openapi-refs.mjs';
import { inputSources, shape } from './schema-shape.mjs';

const WHO = { none: 'anyone (no credentials)', agent: 'an agent (Bearer secret from `join`)', person: 'the person (the board page cookie)', run: 'a chat session\'s gate hook (Bearer run token)' };
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
const code = (s) => `\`${s}\``;

/** A short, readable type for a table cell: the enum values, the constant, or the JSON type. */
function typeLabel(schema, doc, schemas) {
  const s = shape(schema, doc, schemas);
  if (Array.isArray(s.enum)) return s.enum.map((v) => code(JSON.stringify(v))).join(' or ');
  if ('const' in s) return code(JSON.stringify(s.const));
  if (Array.isArray(s.type)) return s.type.join(' or ');
  if (s.type === 'array') return s.items ? `list of ${typeLabel(s.items, doc, schemas)}` : 'list';
  if (s.type) return s.type;
  if (s.oneOf || s.anyOf) return (s.oneOf ?? s.anyOf).map((b) => typeLabel(b, doc, schemas)).join(' or ');
  return 'any';
}

/** The success schema's top-level fields: name, type, required and description. A union
 * (`oneOf`) lists every branch's fields, required only where every branch requires them. */
function fieldsOf(schema, doc, schemas) {
  const s = shape(schema, doc, schemas);
  const branches = s.oneOf ?? s.anyOf;
  if (branches) {
    const parts = branches.map((b) => fieldsOf(b, doc, schemas));
    const seen = new Map();
    for (const part of parts) for (const f of part) if (!seen.has(f.name)) seen.set(f.name, f);
    return [...seen.values()].map((f) => ({ ...f, required: parts.every((p) => p.find((x) => x.name === f.name)?.required) }));
  }
  return Object.entries(s.properties).map(([name, p]) => ({
    name, required: s.required.includes(name), type: typeLabel(p.schema, p.doc, schemas), description: shape(p.schema, p.doc, schemas).description ?? '',
  }));
}

const yes = (b) => (b ? 'yes' : 'no');
const table = (head, rows) => (rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`), ''] : []);

/** A JSON example as a fenced block. */
const json = (value) => ['```json', JSON.stringify(value, null, 2), '```', ''];

/** The examples a media type carries: one `example`, or each of `examples` by its summary. */
function examplesOf(media, title) {
  if (media.example !== undefined) return [`${title}:`, '', ...json(media.example)];
  return Object.values(media.examples ?? {}).flatMap((e) => [`${title}${e.summary ? ` (${e.summary})` : ''}:`, '', ...json(e.dataValue ?? e.value)]);
}

/** The JSON schema of a media type (`itemSchema` for a stream). */
const mediaSchema = (media) => media.schema ?? media.itemSchema;

/** A status's component response, if it is a `$ref`, else the response itself. */
function responseOf(doc, r) {
  if (!r.$ref) return r;
  return doc.components?.responses?.[r.$ref.replace('#/components/responses/', '')] ?? lookup(r.$ref, doc, new Map()).schema;
}

/** The problem `code` a response's example names: the last segment of its `type`. */
const problemCode = (r) => r.content?.['application/problem+json']?.example?.type?.split('/').pop() ?? '';

function errorRows(doc, op) {
  return Object.entries(op.responses ?? {}).filter(([status]) => !status.startsWith('2'))
    .map(([status, r]) => { const res = responseOf(doc, r); return [status, code(problemCode(res)), res.description ?? '']; });
}

function successParts(doc, schemas, op) {
  const out = [];
  for (const [status, r] of Object.entries(op.responses ?? {}).filter(([s]) => s.startsWith('2'))) {
    const res = responseOf(doc, r);
    out.push(`**${status}**: ${res.description ?? ''}`, '');
    for (const [type, media] of Object.entries(res.content ?? {})) {
      const schema = mediaSchema(media);
      out.push(`Media type ${code(type)}.`, '');
      if (schema && (schema.$ref || schema.type === 'object')) out.push(...table(['Field', 'Type', 'Always there', 'Description'], fieldsOf(schema, doc, schemas).map((f) => [code(f.name), f.type, yes(f.required), f.description])));
      else if (schema) out.push(`A ${typeLabel(schema, doc, schemas)}.`, '');
      out.push(...examplesOf(media, 'Example'));
    }
  }
  return out;
}

/** One operation's section. */
function section(doc, schemas, o) {
  const op = doc.paths[o.path][o.method.toLowerCase()];
  const doors = o.xAgent ? `MCP tool ${code(o.operationId)}, \`vb\` command ${code(`vb ${o.operationId.replaceAll('_', '-')}`)}` : 'not offered to agents (`x-agent: false`)';
  const inputs = inputSources(o.operationId, op, doc, schemas, true);
  const body = op.requestBody?.content?.['application/json'];
  return [
    `## ${code(o.operationId)}`, '',
    `${code(`${o.method} ${o.path}`)} · who: ${WHO[o.auth]} · ${doors}`, '',
    op.description ?? op.summary ?? '', '',
    '### Inputs', '',
    ...(inputs.length ? table(['Name', 'Where', 'Type', 'Required', 'Description'], inputs.map((i) => [code(i.name), i.in, typeLabel(i.schema, i.home, schemas), yes(i.required), i.description])) : ['None.', '']),
    ...(body ? examplesOf(body, 'Example request') : []),
    '### Answer', '', ...successParts(doc, schemas, op),
    '### Errors', '', ...table(['Status', 'Code', 'When'], errorRows(doc, op)),
  ];
}

/** The text of api-reference.md for a document, given its operations in route-table order. */
export function renderReference(doc, schemas, operations) {
  return [
    '# Board API reference', '',
    '> Generated by `npm run gen` from `packages/format/schema/openapi.json`. Do not edit by hand:',
    '> `npm test` fails when this file is out of date.', '',
    `API version ${doc.info?.version ?? ''}. ${doc.info?.description ?? ''}`, '',
    '| Operation | Method and path | Who | Agents get it |', '|---|---|---|---|',
    ...operations.map((o) => `| [${code(o.operationId)}](#${o.operationId}) | ${code(`${o.method} ${o.path}`)} | ${o.auth === 'none' ? 'anyone' : o.auth} | ${o.xAgent ? 'yes' : 'no'} |`), '',
    ...operations.flatMap((o) => section(doc, schemas, o)),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
