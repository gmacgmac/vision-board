// The tool table (gen-tools.mjs, packages/format/src/tools.generated.json): one row for every
// operation an agent may call and no row without one, each with what a declared tool needs; the MCP
// tool list is made from it, row for row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPEC, TOOL_TABLE_OUT, TOOLS_OUT, loadSchemas, operationsOf, toolTableWithHosts } from './gen-api.mjs';

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
    const keys = ['name', 'title', 'description', 'input', 'writes', 'secret', 'route', ...('inputHosts' in row ? ['inputHosts'] : []), 'hosts'];
    assert.deepEqual(Object.keys(row), keys, row.name);
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
  assert.deepEqual(table.tools, toolTableWithHosts(doc, loadSchemas()).tools);
  const mcp = JSON.parse(readFileSync(TOOLS_OUT, 'utf8'));
  assert.deepEqual(mcp.tools.map((t) => t.name), table.tools.map((r) => r.name));
  for (const row of table.tools) {
    const tool = mcp.tools.find((t) => t.name === row.name);
    assert.equal(tool.annotations.readOnlyHint, !row.writes, row.name);
    assert.equal('secret' in tool.inputSchema.properties, row.secret, row.name);
    assert.ok(tool.description.startsWith(row.description), row.name);
  }
});

test('x-hosts says what a plugin bot gets: never the agent\'s own identity, the app host or the chat\'s reader; a tool with no say, or a say on anything else, stops the build', () => {
  const plugin = table.tools.filter((t) => t.hosts.includes('plugin')).map((t) => t.name);
  assert.deepEqual(plugin, ['list_boards', 'get_board', 'show_node', 'show_container', 'show_layout', 'list_open', 'check_responses', 'request_grant', 'write_board']);
  assert.ok(table.tools.every((t) => t.hosts.includes('standalone')), 'the standalone app gives every tool');
  const withOp = (fields) => ({ paths: { '/x': { get: { operationId: 'x', responses: {}, ...fields } } } });
  assert.throws(() => toolTableWithHosts(withOp({ 'x-agent': true }), loadSchemas()), /x: x-hosts must list/);
  assert.throws(() => toolTableWithHosts(withOp({ 'x-agent': true, 'x-hosts': ['nowhere'] }), loadSchemas()), /x: x-hosts must list/);
  assert.throws(() => toolTableWithHosts(withOp({ 'x-agent': false, 'x-hosts': ['plugin'] }), loadSchemas()), /only for an x-agent/);
});

test('x-hosts on an input says who gives it: check_responses\'s `wait` is standalone\'s alone, so a host\'s bot cannot hold its turn; a say on an unknown host stops the build', () => {
  const limited = Object.fromEntries(table.tools.filter((t) => t.inputHosts).map((t) => [t.name, t.inputHosts]));
  assert.deepEqual(limited, { check_responses: { wait: ['standalone'] } });
  for (const row of table.tools.filter((t) => t.inputHosts)) {
    for (const name of Object.keys(row.inputHosts)) assert.ok(name in row.input.properties, `${row.name}: ${name} is an input`);
  }
  const op = (hosts) => ({ paths: { '/x': { get: { operationId: 'x', 'x-agent': true, 'x-hosts': ['standalone', 'plugin'], responses: {},
    parameters: [{ name: 'wait', in: 'query', schema: { type: 'integer' }, 'x-hosts': hosts }] } } } });
  assert.deepEqual(toolTableWithHosts(op(['standalone']), loadSchemas()).tools[0].inputHosts, { wait: ['standalone'] });
  assert.throws(() => toolTableWithHosts(op(['nowhere']), loadSchemas()), /x: input "wait": x-hosts must list/);
  assert.throws(() => toolTableWithHosts(op([]), loadSchemas()), /x: input "wait": x-hosts must list/);
});
