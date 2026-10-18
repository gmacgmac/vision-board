// A well-behaved test app (app-cards BE_02): an answer checked by an output schema, what the tool
// can see of its environment, an answer as text, and an error in the tool's own words.
export default {
  tools: [
    {
      name: 'add',
      description: 'Add two numbers.',
      inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'], additionalProperties: false },
      outputSchema: { type: 'object', properties: { sum: { type: 'number' }, pid: { type: 'integer' } }, required: ['sum', 'pid'] },
      run: ({ a, b }) => ({ sum: a + b, pid: process.pid }),
    },
    {
      name: 'env',
      description: 'Say what the tool can see of its environment.',
      inputSchema: { type: 'object' },
      run: (_input, ctx) => ({ env: ctx.env, keys: Object.keys(process.env), cwd: process.cwd(), pid: process.pid }),
    },
    { name: 'hello', description: 'Say hello, as text.', inputSchema: { type: 'object' }, run: async () => 'Hello.' },
    { name: 'refuse', description: 'Refuse, in its own words.', inputSchema: { type: 'object' }, run: () => { throw new Error('That sum has no answer.'); } },
  ],
};
