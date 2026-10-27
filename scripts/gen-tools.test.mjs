// The tool table (gen-tools.mjs, packages/format/src/tools.generated.json): one row for every
// operation an agent may call and no row without one, each with what a declared tool needs; the MCP
// tool list is made from it, row for row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPEC, TOOL_TABLE_OUT, TOOLS_OUT, loadSchemas, operationsOf } from './gen-api.mjs';
import { toolTable } from './gen-tools.mjs';

const doc = JSON.parse(readFileSync(SPEC, 'utf8'));
const table = JSON.parse(readFileSync(TOOL_TABLE_OUT, 'utf8'));

test('every agent operation has one row, and no row lacks an operation', () => {
  const agentOps = operationsOf(doc).filter((o) => o.xAgent).map((o) => o.operationId);
  const names = table.tools.map((r) => r.name);
  assert.deepEqual(names, agentOps);
  assert.equal(new Set(names).size, names.length);
});

test('each row has a name, its words, a standalone input schema, whether it writes, and where inputs go', () => {
  for (const row of table.tools) {
    assert.deepEqual(Object.keys(row), ['name', 'title', 'description', 'input', 'writes', 'secret', 'route'], row.name);
    assert.ok(row.description.length > 0, row.name);
    assert.equal(row.input.type, 'object', row.name);
    assert.ok(!JSON.stringify(row.input).includes('$ref'), `${row.name}: the input stands alone`);
    assert.equal(row.writes, operationsOf(doc).find((o) => o.operationId === row.name).method !== 'GET', row.name);
    const routed = [...row.route.path, ...row.route.query, ...row.route.body].sort();
    assert.deepEqual(routed, Object.keys(row.input.properties).sort(), row.name);
  }
  const write = table.tools.find((r) => r.name === 'write_board');
  assert.equal(write.input.properties.items.type, 'array', 'write_board keeps its full items schema');
});

test('the table file is what gen-tools makes, and the MCP list is made from it, row for row', () => {
  assert.deepEqual(table.tools, toolTable(doc, loadSchemas()).tools);
  const mcp = JSON.parse(readFileSync(TOOLS_OUT, 'utf8'));
  assert.deepEqual(mcp.tools.map((t) => t.name), table.tools.map((r) => r.name));
  for (const row of table.tools) {
    const tool = mcp.tools.find((t) => t.name === row.name);
    assert.equal(tool.annotations.readOnlyHint, !row.writes, row.name);
    assert.equal('secret' in tool.inputSchema.properties, row.secret, row.name);
    assert.ok(tool.description.startsWith(row.description), row.name);
  }
});
