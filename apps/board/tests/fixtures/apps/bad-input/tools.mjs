// A test app whose tools' input and output are checked by their schemas (app-cards BE_02).
const out = { type: 'object', properties: { value: { type: 'number' } }, required: ['value'] };
export default {
  tools: [
    {
      name: 'square', description: 'Square a number.',
      inputSchema: { type: 'object', properties: { n: { type: 'number', maximum: 1000 } }, required: ['n'], additionalProperties: false },
      outputSchema: out,
      run: ({ n }) => ({ value: n * n }),
    },
    { name: 'wrong', description: 'Answer what its outputSchema refuses.', inputSchema: { type: 'object' }, outputSchema: out, run: () => ({ value: 'not a number' }) },
    { name: 'number', description: 'Answer a bare number.', inputSchema: { type: 'object' }, run: () => 42 },
  ],
};
